import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  writeBatch
} from "firebase/firestore";
import {
  ensureAnonymousSession,
  firestore,
  isFirebaseConfigured,
  signInTeacherWithPasscode,
  signOutTeacher,
  teacherSession
} from "./firebase-client.js";

const RESULT_COLLECTION = "practiceResults";
const EXPORT_COLLECTION = "exportEvents";

function cleanAnswers(value) {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value).map(([questionId, answer]) => [questionId, {
    attemptCount: Number(answer?.attemptCount || 0),
    firstAnswer: answer?.firstAnswer || null,
    firstAttemptCorrect: Boolean(answer?.firstAttemptCorrect),
    finalAnswer: answer?.finalAnswer || null
  }]));
}

function cleanRewardSessions(value) {
  return (Array.isArray(value) ? value : []).map((session) => ({
    rewardSessionId: String(session.rewardSessionId || ""),
    mode: String(session.mode || ""),
    checkpoint: Number(session.checkpoint || 0),
    totalSlotScore: Number(session.totalSlotScore || 0),
    completed: Boolean(session.completed),
    completedAt: String(session.completedAt || "")
  }));
}

export function serializePracticeResult(result, ownerUid) {
  return {
    schemaVersion: "practice-result-v1",
    sessionId: String(result.sessionId || result.id || ""),
    ownerUid: String(ownerUid || ""),
    studentId: String(result.studentId || ""),
    quizId: String(result.quizId || ""),
    lessonId: String(result.lessonId || ""),
    lessonTitle: String(result.lessonTitle || ""),
    bookId: String(result.bookId || ""),
    unitId: String(result.unitId || ""),
    lessonNumber: Number(result.lessonNumber || 0),
    startedAt: String(result.startedAt || ""),
    completedAt: String(result.completedAt || ""),
    durationSeconds: Number(result.durationSeconds || 0),
    status: "completed",
    practiceScore: Number(result.practiceScore || 0),
    practiceMaxScore: Number(result.practiceMaxScore || 0),
    finalCorrectCount: Number(result.finalCorrectCount || 0),
    accuracy: Number(result.accuracy || 0),
    typeA: result.typeA || {},
    typeB: result.typeB || {},
    slotScore: Number(result.slotScore || 0),
    rewardSessions: cleanRewardSessions(result.rewardSessions),
    answers: cleanAnswers(result.answers)
  };
}

export async function savePracticeResult(result) {
  if (!isFirebaseConfigured) return { storage: "local", result };
  const user = await ensureAnonymousSession();
  const record = serializePracticeResult(result, user.uid);
  if (!record.sessionId) throw new Error("本次作答沒有有效的 Session ID，請重新開始。");
  try {
    await setDoc(doc(firestore, RESULT_COLLECTION, record.sessionId), record);
    return { storage: "firestore", result: record };
  } catch (error) {
    if (error?.code === "permission-denied") {
      // Rules intentionally reject updates. A retry may therefore only read back the
      // caller's own opaque Session document and treat an exact existing session as saved.
      try {
        const existing = await getDoc(doc(firestore, RESULT_COLLECTION, record.sessionId));
        if (existing.exists() && existing.data().ownerUid === user.uid && existing.data().sessionId === record.sessionId) {
          return { storage: "firestore", result: existing.data(), idempotent: true };
        }
      } catch {
        // A first invalid write has no readable document. Fall through to the safe message.
      }
      throw new Error("作答資料未通過 Firestore 安全規則，沒有寫入雲端。");
    }
    throw error;
  }
}

export async function unlockTeacherSession(passcode) {
  if (!isFirebaseConfigured) return { local: true, user: null };
  const current = await teacherSession();
  return current || signInTeacherWithPasscode(passcode);
}

export async function ensureTeacherSession() {
  if (!isFirebaseConfigured) return { local: true, user: null };
  const current = await teacherSession();
  if (!current) throw new Error("請先輸入教師通行碼。\n");
  return current;
}

export async function loadTeacherResults() {
  if (!isFirebaseConfigured) return [];
  await ensureTeacherSession();
  const snapshot = await getDocs(query(collection(firestore, RESULT_COLLECTION), orderBy("completedAt", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function resultsToCsv(results) {
  const header = ["Student ID", "Book", "Unit", "Lesson", "Quiz", "Practice Score", "Max", "Accuracy", "Final Correct", "Slot Reward", "Completed At", "Session ID"];
  const rows = (Array.isArray(results) ? results : []).map((result) => [
    result.studentId,
    result.bookId,
    result.unitId,
    result.lessonNumber,
    result.quizId,
    result.practiceScore,
    result.practiceMaxScore,
    result.accuracy,
    result.finalCorrectCount,
    result.slotScore,
    result.completedAt,
    result.sessionId || result.id
  ].map(csvCell).join(","));
  return [header.map(csvCell).join(","), ...rows].join("\r\n");
}

export function resultsToJson(results) {
  return JSON.stringify(Array.isArray(results) ? results : [], null, 2);
}

export function downloadExport({ filename, text, mimeType }) {
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function recordExportEvent({ format, count, queryLabel = "all" }) {
  if (!isFirebaseConfigured) return { id: `local-export-${Date.now()}`, local: true };
  const teacher = await ensureTeacherSession();
  const exportId = `export-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payload = {
    schemaVersion: "practice-export-v1",
    exportId,
    teacherUid: teacher.user.uid,
    format: format === "json" ? "json" : "csv",
    recordCount: Number(count || 0),
    queryLabel: String(queryLabel || "all"),
    exportedAt: new Date().toISOString()
  };
  await setDoc(doc(firestore, EXPORT_COLLECTION, exportId), payload);
  return { id: exportId, ...payload };
}

export async function deleteResultsAfterExport({ resultIds, exportId }) {
  if (!Array.isArray(resultIds) || !resultIds.length) return 0;
  if (!isFirebaseConfigured) return resultIds.length;
  await ensureTeacherSession();
  const exportSnapshot = await getDoc(doc(firestore, EXPORT_COLLECTION, exportId));
  if (!exportSnapshot.exists()) throw new Error("找不到成功匯出的紀錄，已停止刪除。\n");
  let deleted = 0;
  for (let index = 0; index < resultIds.length; index += 400) {
    const batch = writeBatch(firestore);
    resultIds.slice(index, index + 400).forEach((id) => batch.delete(doc(firestore, RESULT_COLLECTION, id)));
    await batch.commit();
    deleted += Math.min(400, resultIds.length - index);
  }
  return deleted;
}

export async function teacherSignOut() {
  await signOutTeacher();
}
