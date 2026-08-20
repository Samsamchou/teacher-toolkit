import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
  signInAnonymously,
  signOut
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import siteSource from "../../config/site-source.json" with { type: "json" };
import { hasFirebasePublicConfig, resolveFirebasePublicConfig } from "./firebase-public-config.js";

const env = import.meta.env || {};
const environmentConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};
const browserFetch = typeof window !== "undefined" && typeof window.fetch === "function"
  ? window.fetch.bind(window)
  : null;
const resolvedPublicConfig = await resolveFirebasePublicConfig({
  environmentConfig,
  expectedProjectId: String(siteSource.firebase?.projectId || ""),
  fetchImplementation: browserFetch
});
const publicConfig = resolvedPublicConfig.config;
const functionsRegion = String(env.VITE_FIREBASE_FUNCTIONS_REGION || siteSource.firebase?.functionsRegion || "asia-east1");
const teacherFunctions = Object.freeze({
  login: "teacherPasscodeLogin",
  logout: "teacherPasscodeLogout",
  list: "teacherResultsList",
  recordExport: "teacherResultsRecordExport",
  delete: "teacherResultsDelete",
  lessonConfigLoad: "teacherLessonConfigLoad",
  lessonConfigSave: "teacherLessonConfigSave"
});

export const firebaseConfigSource = resolvedPublicConfig.source;
export const isFirebaseConfigured = hasFirebasePublicConfig(publicConfig);

const app = isFirebaseConfigured ? (getApps().length ? getApp() : initializeApp(publicConfig)) : null;
export const auth = app ? getAuth(app) : null;
export const firestore = app ? getFirestore(app) : null;
export const functions = app ? getFunctions(app, functionsRegion) : null;
let teacherResultsSession = null;

export function firebaseStatus() {
  if (isFirebaseConfigured) return { enabled: true, message: "Firebase connected", source: firebaseConfigSource };
  return {
    enabled: false,
    message: "Firebase public web configuration is not present. This browser is using the local preview data layer."
  };
}

function requireFirebase() {
  if (!auth || !firestore || !functions) throw new Error("Firebase 尚未設定公開 Web App 組態。");
}

function teacherLoginError(error) {
  const code = String(error?.code || "");
  let message = "教師服務暫時無法使用。";
  if (code === "functions/permission-denied") message = "教師通行碼錯誤，或工作階段已結束。";
  else if (code === "functions/resource-exhausted") message = "嘗試次數過多，請稍後再試。";
  else if (code === "functions/failed-precondition") message = String(error?.message || "資料已變更，請重新載入後再試。");
  else if (code === "functions/unauthenticated") message = "無法建立匿名工作階段，請重新整理後再試。";
  else if (code === "functions/unavailable") message = "教師服務暫時無法連線。";
  else if (error instanceof Error && error.message) message = error.message;
  const normalized = new Error(message);
  normalized.code = code;
  return normalized;
}


export async function ensureAnonymousSession() {
  requireFirebase();
  if (typeof auth.authStateReady === "function") await auth.authStateReady();
  if (auth.currentUser?.isAnonymous) return auth.currentUser;
  if (auth.currentUser) await signOut(auth);
  teacherResultsSession = null;
  await setPersistence(auth, browserLocalPersistence);
  try {
    return (await signInAnonymously(auth)).user;
  } catch (error) {
    if (error?.code === "auth/operation-not-allowed") {
      throw new Error("Firebase Authentication 尚未啟用 Anonymous 登入。");
    }
    throw error;
  }
}

export function teacherSession() {
  return teacherResultsSession;
}

export async function openTeacherResultsSession(passcode, { replaceExisting = false } = {}) {
  requireFirebase();
  const entered = typeof passcode === "string" ? passcode : "";
  if (!/^\d{6}$/.test(entered)) throw new Error("請輸入六位數教師通行碼。");
  const previousSession = teacherResultsSession;
  const anonymousUser = await ensureAnonymousSession();
  try {
    const response = await httpsCallable(functions, teacherFunctions.login)({ passcode: entered });
    const sessionToken = String(response?.data?.sessionToken || "");
    if (!sessionToken) throw new Error("教師成績服務沒有建立工作階段。");
    const nextSession = { sessionToken, anonymousUid: anonymousUser.uid };
    teacherResultsSession = nextSession;
    if (replaceExisting && previousSession?.anonymousUid === anonymousUser.uid) {
      httpsCallable(functions, teacherFunctions.logout)({ sessionToken: previousSession.sessionToken })
        .catch(() => undefined);
    }
    return nextSession;
  } catch (error) {
    throw teacherLoginError(error);
  }
}

async function requireTeacherResultsSession() {
  const current = teacherResultsSession;
  if (!current) throw new Error("請先輸入教師通行碼。");
  const anonymousUser = await ensureAnonymousSession();
  if (teacherResultsSession !== current || anonymousUser.uid !== current.anonymousUid) {
    throw new Error("教師工作階段已結束，請重新輸入通行碼。");
  }
  return current;
}

async function callTeacherResults(functionName, payload = {}) {
  requireFirebase();
  const session = await requireTeacherResultsSession();
  try {
    const response = await httpsCallable(functions, functionName)({ ...payload, sessionToken: session.sessionToken });
    return response?.data || {};
  } catch (error) {
    throw teacherLoginError(error);
  }
}

export async function loadTeacherResultsFromServer() {
  const response = await callTeacherResults(teacherFunctions.list);
  return {
    results: Array.isArray(response.results) ? response.results : [],
    truncated: response.truncated === true
  };
}

export async function loadTeacherLessonConfigFromServer() {
  const response = await callTeacherResults(teacherFunctions.lessonConfigLoad);
  return {
    exists: response.exists === true,
    version: Number.isSafeInteger(Number(response.version)) ? Number(response.version) : 0,
    lessons: Array.isArray(response.lessons) ? response.lessons : []
  };
}

export async function saveTeacherLessonConfigToServer({ lessons, expectedVersion }) {
  const response = await callTeacherResults(teacherFunctions.lessonConfigSave, { lessons, expectedVersion });
  const version = Number(response.version);
  if (!Number.isSafeInteger(version) || version < 1) throw new Error("雲端教材沒有回傳有效版本，已停止保存。");
  const cleanup = response?.imageCleanup || {};
  return {
    version,
    lessonCount: Number(response.lessonCount || 0),
    imageCleanup: {
      deletedCount: Math.max(0, Number(cleanup.deletedCount || 0)),
      pendingCount: Math.max(0, Number(cleanup.pendingCount || 0))
    }
  };
}


export async function recordTeacherResultsExport({ format, resultIds, queryLabel }) {
  const response = await callTeacherResults(teacherFunctions.recordExport, { format, resultIds, queryLabel });
  const exportId = String(response.exportId || "");
  if (!exportId) throw new Error("匯出紀錄沒有建立，已停止刪除流程。");
  return { exportId, recordCount: Number(response.recordCount || 0) };
}

export async function deleteTeacherResultsAfterExport(exportId) {
  const response = await callTeacherResults(teacherFunctions.delete, { exportId, confirmed: true });
  return { deleted: Number(response.deleted || 0), alreadyDeleted: response.alreadyDeleted === true };
}

export async function closeTeacherResultsSession() {
  const current = teacherResultsSession;
  teacherResultsSession = null;
  if (!current || !functions) return;
  try {
    const anonymousUser = await ensureAnonymousSession();
    if (anonymousUser.uid !== current.anonymousUid) return;
    await httpsCallable(functions, teacherFunctions.logout)({ sessionToken: current.sessionToken });
  } catch {
    // Clearing in-memory access is sufficient when the server is temporarily unavailable.
  }
}