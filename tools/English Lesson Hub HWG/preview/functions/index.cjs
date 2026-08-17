"use strict";

const crypto = require("node:crypto");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
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

initializeApp();

const firestore = getFirestore();
const teacherResultsPasscode = defineSecret("TEACHER_RESULTS_PASSCODE");
const ATTEMPT_COLLECTION = "teacherLoginAttempts";
const GLOBAL_ATTEMPT_ID = "global";
const SESSION_PREFIX = "teacher-passcode-";
const attemptExpiryMs = 24 * 60 * 60 * 1000;

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
  const expiresAtMs = Math.max(state.lockedUntilMs || 0, state.windowStartedAtMs + ATTEMPT_WINDOW_MS) + attemptExpiryMs;
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
    throw new HttpsError("unauthenticated", "請先建立匿名學生工作階段，再使用教師通行碼。");
  }
  return request.auth.uid;
}

function requireTeacherCaller(request) {
  if (!request.auth || request.auth.token?.teacher !== true || request.auth.token?.teacherAccess !== "passcode") {
    throw new HttpsError("permission-denied", "沒有有效的教師工作階段。");
  }
  return request.auth.uid;
}

async function reserveAttempt(anonymousUid) {
  const userRef = firestore.collection(ATTEMPT_COLLECTION).doc(anonymousUid);
  const globalRef = firestore.collection(ATTEMPT_COLLECTION).doc(GLOBAL_ATTEMPT_ID);
  return firestore.runTransaction(async (transaction) => {
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
  await firestore.collection(ATTEMPT_COLLECTION).doc(anonymousUid).delete();
}

function functionFailure(error, action) {
  if (error instanceof HttpsError) throw error;
  console.error(`Teacher passcode ${action} failed`, { code: String(error?.code || "unknown") });
  throw new HttpsError("internal", "教師通行碼服務暫時無法使用。");
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
      const expectedPasscode = teacherResultsPasscode.value();
      if (!passcodesMatch(passcode, expectedPasscode)) {
        throw new HttpsError("permission-denied", "通行碼錯誤。");
      }
      await clearUserAttempts(anonymousUid);
      const sessionUid = `${SESSION_PREFIX}${crypto.randomUUID()}`;
      const customToken = await getAuth().createCustomToken(sessionUid, {
        teacher: true,
        teacherAccess: "passcode"
      });
      return { customToken };
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
      const teacherUid = requireTeacherCaller(request);
      try {
        await getAuth().deleteUser(teacherUid);
      } catch (error) {
        if (error?.code !== "auth/user-not-found") throw error;
      }
      return { signedOut: true };
    } catch (error) {
      return functionFailure(error, "logout");
    }
  }
);

if (teacherPasscode.loginFunction !== "teacherPasscodeLogin" || teacherPasscode.logoutFunction !== "teacherPasscodeLogout") {
  throw new Error("Teacher passcode function configuration does not match the exported functions.");
}