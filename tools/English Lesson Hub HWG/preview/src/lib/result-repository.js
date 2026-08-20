import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  closeTeacherResultsSession,
  createTeacherMediaUnlockLink,
  deleteTeacherResultsAfterExport,
  ensureAnonymousSession,
  firestore,
  isFirebaseConfigured,
  loadTeacherResultsFromServer,
  loadTeacherLessonConfigFromServer,
  openTeacherResultsSession,
  recordTeacherResultsExport,
  saveTeacherLessonConfigToServer,
  teacherSession
} from "./firebase-client.js";

const RESULT_COLLECTION = "practiceResults";

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

export async function unlockTeacherSession(passcode, { replaceExisting = false } = {}) {
  if (!isFirebaseConfigured) return { local: true };
  return (!replaceExisting && teacherSession()) || openTeacherResultsSession(passcode, { replaceExisting });
}
export async function createTeacherMediaUnlock() {
  if (!isFirebaseConfigured) throw new Error("本機 Preview 不會建立教師解鎖連結；請使用 Firebase 正式站。");
  await ensureTeacherSession();
  return createTeacherMediaUnlockLink();
}


export async function ensureTeacherSession() {
  if (!isFirebaseConfigured) return { local: true };
  const current = teacherSession();
  if (!current) throw new Error("請先輸入教師通行碼。");
  return current;
}

export async function loadTeacherLessonConfig() {
  if (!isFirebaseConfigured) return { exists: false, version: 0, lessons: [] };
  await ensureTeacherSession();
  return loadTeacherLessonConfigFromServer();
}

export async function saveTeacherLessonConfig({ lessons, expectedVersion }) {
  if (!isFirebaseConfigured) return { local: true, version: expectedVersion || 0, lessonCount: Array.isArray(lessons) ? lessons.length : 0 };
  await ensureTeacherSession();
  return saveTeacherLessonConfigToServer({ lessons, expectedVersion });
}
export async function loadTeacherResults() {
  if (!isFirebaseConfigured) return [];
  await ensureTeacherSession();
  const response = await loadTeacherResultsFromServer();
  return response.results;
}

function reportFields(result) {
  return {
    studentId: result.studentId,
    bookId: result.bookId,
    unitId: result.unitId,
    lessonNumber: result.lessonNumber,
    quizId: result.quizId,
    practiceScore: result.practiceScore,
    practiceMaxScore: result.practiceMaxScore,
    accuracy: result.accuracy,
    finalCorrectCount: result.finalCorrectCount,
    slotScore: result.slotScore,
    completedAt: result.completedAt,
    sessionId: result.sessionId || result.id
  };
}

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function resultsToCsv(results) {
  const header = ["Student ID", "Book", "Unit", "Lesson", "Quiz", "Practice Score", "Max", "Accuracy", "Final Correct", "Slot Reward", "Completed At", "Session ID"];
  const rows = (Array.isArray(results) ? results : []).map((result) => {
    const report = reportFields(result);
    return [
      report.studentId,
      report.bookId,
      report.unitId,
      report.lessonNumber,
      report.quizId,
      report.practiceScore,
      report.practiceMaxScore,
      report.accuracy,
      report.finalCorrectCount,
      report.slotScore,
      report.completedAt,
      report.sessionId
    ].map(csvCell).join(",");
  });
  return [header.map(csvCell).join(","), ...rows].join("\r\n");
}

export function resultsToJson(results) {
  return JSON.stringify((Array.isArray(results) ? results : []).map(reportFields), null, 2);
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

export async function recordExportEvent({ format, resultIds, queryLabel = "all" }) {
  if (!isFirebaseConfigured) return { id: `local-export-${Date.now()}`, local: true, recordCount: Array.isArray(resultIds) ? resultIds.length : 0 };
  await ensureTeacherSession();
  const event = await recordTeacherResultsExport({ format, resultIds, queryLabel });
  return { id: event.exportId, recordCount: event.recordCount };
}

export async function deleteResultsAfterExport({ resultIds, exportId }) {
  if (!Array.isArray(resultIds) || !resultIds.length) return 0;
  if (!isFirebaseConfigured) return resultIds.length;
  await ensureTeacherSession();
  const outcome = await deleteTeacherResultsAfterExport(exportId);
  return outcome.deleted;
}

export async function teacherSignOut() {
  await closeTeacherResultsSession();
}