"use strict";

const crypto = require("node:crypto");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { defineSecret } = require("firebase-functions/params");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { functionsRegion, teacherPasscode } = require("./site-config.generated.cjs");
const {
  ATTEMPT_WINDOW_MS,
  GLOBAL_MAX_ATTEMPTS,
  USER_MAX_ATTEMPTS,
  nextAttempt,
  normalizeAttemptState,
  normalizePasscode,
  passcodesMatch
} = require("./src/access-policy.cjs");
const {
  DEFAULT_SESSION_DURATION_MS,
  MAX_RESULT_IDS_PER_EXPORT,
  createSessionToken,
  normalizeResultIds,
  normalizeSessionToken,
  sessionIdForToken
} = require("./src/teacher-results-session.cjs");

initializeApp();

function firestore() {
  return getFirestore();
}
const teacherResultsPasscode = defineSecret("TEACHER_RESULTS_PASSCODE");
const ATTEMPT_COLLECTION = "teacherLoginAttempts";
const SESSION_COLLECTION = "teacherResultSessions";
const RESULT_COLLECTION = "practiceResults";
const EXPORT_COLLECTION = "exportEvents";
const GLOBAL_ATTEMPT_ID = "global";
const ATTEMPT_RECORD_RETENTION_MS = 24 * 60 * 60 * 1000;
const configuredSessionHours = Number(teacherPasscode.sessionHours);
const SESSION_DURATION_MS = Number.isInteger(configuredSessionHours) && configuredSessionHours >= 1 && configuredSessionHours <= 24
  ? configuredSessionHours * 60 * 60 * 1000
  : DEFAULT_SESSION_DURATION_MS;
const configuredResultLimit = Number(teacherPasscode.resultLimit);
const RESULT_LIMIT = Number.isInteger(configuredResultLimit) && configuredResultLimit >= 1 && configuredResultLimit <= MAX_RESULT_IDS_PER_EXPORT
  ? configuredResultLimit
  : MAX_RESULT_IDS_PER_EXPORT;

function timestampMillis(value) {
  return value && typeof value.toMillis === "function" ? value.toMillis() : 0;
}

function attemptState(data) {
  return normalizeAttemptState({
    windowStartedAtMs: timestampMillis(data?.windowStartedAt),
    attemptCount: data?.attemptCount,
    lockedUntilMs: timestampMillis(data?.lockedUntil)
  });
}

function attemptRecord(state, nowMs, scope) {
  const expiresAtMs = Math.max(state.lockedUntilMs || 0, state.windowStartedAtMs + ATTEMPT_WINDOW_MS) + ATTEMPT_RECORD_RETENTION_MS;
  return {
    scope,
    windowStartedAt: Timestamp.fromMillis(state.windowStartedAtMs),
    attemptCount: state.attemptCount,
    lockedUntil: state.lockedUntilMs ? Timestamp.fromMillis(state.lockedUntilMs) : null,
    updatedAt: Timestamp.fromMillis(nowMs),
    expiresAt: Timestamp.fromMillis(expiresAtMs)
  };
}

function requireAnonymousCaller(request) {
  const provider = request.auth?.token?.firebase?.sign_in_provider;
  if (!request.auth || provider !== "anonymous") {
    throw new HttpsError("unauthenticated", "請重新整理頁面後再試。");
  }
  return request.auth.uid;
}

async function reserveAttempt(anonymousUid) {
  const database = firestore();
  const userRef = database.collection(ATTEMPT_COLLECTION).doc(anonymousUid);
  const globalRef = database.collection(ATTEMPT_COLLECTION).doc(GLOBAL_ATTEMPT_ID);
  return database.runTransaction(async (transaction) => {
    const [userSnapshot, globalSnapshot] = await Promise.all([transaction.get(userRef), transaction.get(globalRef)]);
    const nowMs = Date.now();
    const userDecision = nextAttempt(attemptState(userSnapshot.data()), nowMs, { maxAttempts: USER_MAX_ATTEMPTS, windowMs: ATTEMPT_WINDOW_MS });
    if (!userDecision.allowed) {
      throw new HttpsError("resource-exhausted", "嘗試次數過多，請稍後再試。");
    }
    const globalDecision = nextAttempt(attemptState(globalSnapshot.data()), nowMs, { maxAttempts: GLOBAL_MAX_ATTEMPTS, windowMs: ATTEMPT_WINDOW_MS });
    if (!globalDecision.allowed) {
      throw new HttpsError("resource-exhausted", "教師通行碼服務暫時鎖定，請稍後再試。");
    }
    transaction.set(userRef, attemptRecord(userDecision.next, nowMs, "anonymous-user"));
    transaction.set(globalRef, attemptRecord(globalDecision.next, nowMs, "global"));
  });
}

async function clearUserAttempts(anonymousUid) {
  await firestore().collection(ATTEMPT_COLLECTION).doc(anonymousUid).delete();
}

async function createTeacherResultsSession(anonymousUid) {
  const sessionToken = createSessionToken();
  const sessionId = sessionIdForToken(sessionToken);
  const nowMs = Date.now();
  await firestore().collection(SESSION_COLLECTION).doc(sessionId).set({
    schemaVersion: "teacher-results-session-v1",
    anonymousUid,
    createdAt: Timestamp.fromMillis(nowMs),
    lastUsedAt: Timestamp.fromMillis(nowMs),
    expiresAt: Timestamp.fromMillis(nowMs + SESSION_DURATION_MS)
  });
  return sessionToken;
}

async function requireTeacherResultsSession(request) {
  const anonymousUid = requireAnonymousCaller(request);
  const sessionToken = normalizeSessionToken(request.data?.sessionToken);
  const sessionId = sessionIdForToken(sessionToken);
  if (!sessionId) {
    throw new HttpsError("permission-denied", "請先輸入教師通行碼。");
  }
  const sessionRef = firestore().collection(SESSION_COLLECTION).doc(sessionId);
  const snapshot = await sessionRef.get();
  const nowMs = Date.now();
  const expired = timestampMillis(snapshot.data()?.expiresAt) <= nowMs;
  if (!snapshot.exists || snapshot.data()?.anonymousUid !== anonymousUid || expired) {
    if (snapshot.exists && expired) await sessionRef.delete().catch(() => undefined);
    throw new HttpsError("permission-denied", "教師工作階段已結束，請重新輸入通行碼。");
  }
  await sessionRef.set({ lastUsedAt: Timestamp.fromMillis(nowMs) }, { merge: true });
  return { anonymousUid, sessionId, sessionRef };
}

function reportString(value) {
  return typeof value === "string" ? value : "";
}

function reportNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function reportType(value) {
  return {
    totalQuestions: reportNumber(value?.totalQuestions),
    firstAttemptCorrectCount: reportNumber(value?.firstAttemptCorrectCount),
    finalCorrectCount: reportNumber(value?.finalCorrectCount)
  };
}

function reportResult(snapshot) {
  const data = snapshot.data() || {};
  return {
    id: snapshot.id,
    sessionId: reportString(data.sessionId || snapshot.id),
    studentId: reportString(data.studentId),
    quizId: reportString(data.quizId),
    lessonId: reportString(data.lessonId),
    lessonTitle: reportString(data.lessonTitle),
    bookId: reportString(data.bookId),
    unitId: reportString(data.unitId),
    lessonNumber: reportNumber(data.lessonNumber),
    completedAt: reportString(data.completedAt),
    practiceScore: reportNumber(data.practiceScore),
    practiceMaxScore: reportNumber(data.practiceMaxScore),
    finalCorrectCount: reportNumber(data.finalCorrectCount),
    accuracy: reportNumber(data.accuracy),
    slotScore: reportNumber(data.slotScore),
    typeA: reportType(data.typeA),
    typeB: reportType(data.typeB)
  };
}

async function loadResultsForReport() {
  const snapshot = await firestore().collection(RESULT_COLLECTION).orderBy("completedAt", "desc").limit(RESULT_LIMIT).get();
  return { results: snapshot.docs.map(reportResult), truncated: snapshot.size === RESULT_LIMIT };
}

function normalizeExportFormat(value) {
  return value === "json" ? "json" : value === "csv" ? "csv" : null;
}

function normalizeQueryLabel(value) {
  const candidate = typeof value === "string" ? value.trim() : "all";
  return candidate && candidate.length <= 120 ? candidate : "all";
}

function normalizeExportId(value) {
  const candidate = typeof value === "string" ? value : "";
  return /^[A-Za-z0-9_-]{8,128}$/.test(candidate) ? candidate : null;
}

async function assertResultsExist(resultIds) {
  for (let index = 0; index < resultIds.length; index += 400) {
    const database = firestore();
    const references = resultIds.slice(index, index + 400).map((resultId) => database.collection(RESULT_COLLECTION).doc(resultId));
    const snapshots = await database.getAll(...references);
    if (snapshots.some((snapshot) => !snapshot.exists)) {
      throw new HttpsError("failed-precondition", "部分結果已變更，請重新整理後再匯出。");
    }
  }
}

function functionFailure(error, action) {
  if (error instanceof HttpsError) throw error;
  console.error(`Teacher Results ${action} failed`, { code: String(error?.code || "unknown") });
  throw new HttpsError("internal", "教師成績服務暫時無法使用。");
}

exports.teacherPasscodeLogin = onCall(
  {
    region: functionsRegion,
    timeoutSeconds: 30,
    memory: "256MiB",
    maxInstances: 2,
    secrets: [teacherResultsPasscode]
  },
  async (request) => {
    try {
      const anonymousUid = requireAnonymousCaller(request);
      const passcode = normalizePasscode(request.data?.passcode);
      if (!passcode) throw new HttpsError("invalid-argument", "請輸入六位數教師通行碼。");
      await reserveAttempt(anonymousUid);
      if (!passcodesMatch(passcode, teacherResultsPasscode.value())) {
        throw new HttpsError("permission-denied", "通行碼錯誤。");
      }
      await clearUserAttempts(anonymousUid);
      return { sessionToken: await createTeacherResultsSession(anonymousUid) };
    } catch (error) {
      return functionFailure(error, "login");
    }
  }
);

exports.teacherPasscodeLogout = onCall(
  {
    region: functionsRegion,
    timeoutSeconds: 30,
    memory: "256MiB",
    maxInstances: 2
  },
  async (request) => {
    try {
      const session = await requireTeacherResultsSession(request);
      await session.sessionRef.delete();
      return { signedOut: true };
    } catch (error) {
      return functionFailure(error, "logout");
    }
  }
);

exports.teacherResultsList = onCall(
  {
    region: functionsRegion,
    timeoutSeconds: 30,
    memory: "256MiB",
    maxInstances: 2
  },
  async (request) => {
    try {
      await requireTeacherResultsSession(request);
      return await loadResultsForReport();
    } catch (error) {
      return functionFailure(error, "list");
    }
  }
);

exports.teacherResultsRecordExport = onCall(
  {
    region: functionsRegion,
    timeoutSeconds: 60,
    memory: "256MiB",
    maxInstances: 2
  },
  async (request) => {
    try {
      const session = await requireTeacherResultsSession(request);
      const format = normalizeExportFormat(request.data?.format);
      const resultIds = normalizeResultIds(request.data?.resultIds, RESULT_LIMIT);
      if (!format || !resultIds) {
        throw new HttpsError("invalid-argument", "匯出資料格式無效，請重新整理後再試。");
      }
      await assertResultsExist(resultIds);
      const exportId = `export-${crypto.randomUUID()}`;
      await firestore().collection(EXPORT_COLLECTION).doc(exportId).set({
        schemaVersion: "teacher-results-export-v1",
        exportId,
        sessionId: session.sessionId,
        anonymousUid: session.anonymousUid,
        format,
        resultIds,
        recordCount: resultIds.length,
        queryLabel: normalizeQueryLabel(request.data?.queryLabel),
        exportedAt: Timestamp.fromMillis(Date.now())
      });
      return { exportId, recordCount: resultIds.length };
    } catch (error) {
      return functionFailure(error, "record-export");
    }
  }
);

exports.teacherResultsDelete = onCall(
  {
    region: functionsRegion,
    timeoutSeconds: 120,
    memory: "512MiB",
    maxInstances: 2
  },
  async (request) => {
    try {
      const session = await requireTeacherResultsSession(request);
      const exportId = normalizeExportId(request.data?.exportId);
      if (!exportId || request.data?.confirmed !== true) {
        throw new HttpsError("invalid-argument", "請先完成匯出並確認刪除。");
      }
      const database = firestore();
      const exportRef = database.collection(EXPORT_COLLECTION).doc(exportId);
      const exportSnapshot = await exportRef.get();
      const exportRecord = exportSnapshot.data();
      if (!exportSnapshot.exists || exportRecord?.sessionId !== session.sessionId || exportRecord?.anonymousUid !== session.anonymousUid) {
        throw new HttpsError("permission-denied", "找不到本次工作階段的匯出紀錄。");
      }
      if (exportRecord.deletedAt) return { deleted: 0, alreadyDeleted: true };
      const resultIds = normalizeResultIds(exportRecord.resultIds, RESULT_LIMIT);
      if (!resultIds) throw new HttpsError("failed-precondition", "匯出紀錄無法用於刪除，請重新匯出。");
      for (let index = 0; index < resultIds.length; index += 400) {
        const batch = database.batch();
        resultIds.slice(index, index + 400).forEach((resultId) => batch.delete(database.collection(RESULT_COLLECTION).doc(resultId)));
        await batch.commit();
      }
      await exportRef.set({ deletedAt: Timestamp.fromMillis(Date.now()) }, { merge: true });
      return { deleted: resultIds.length };
    } catch (error) {
      return functionFailure(error, "delete");
    }
  }
);

const configuredFunctionsMatch = teacherPasscode.secretName === "TEACHER_RESULTS_PASSCODE"
  && teacherPasscode.loginFunction === "teacherPasscodeLogin"
  && teacherPasscode.logoutFunction === "teacherPasscodeLogout"
  && teacherPasscode.listFunction === "teacherResultsList"
  && teacherPasscode.recordExportFunction === "teacherResultsRecordExport"
  && teacherPasscode.deleteFunction === "teacherResultsDelete";
if (!configuredFunctionsMatch) {
  throw new Error("Teacher Results function configuration does not match the exported functions.");
}