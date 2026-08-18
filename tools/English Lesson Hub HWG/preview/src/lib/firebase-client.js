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
  delete: "teacherResultsDelete"
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
  if (code === "functions/permission-denied") return new Error("教師通行碼錯誤，或工作階段已結束。");
  if (code === "functions/resource-exhausted") return new Error("嘗試次數過多，請稍後再試。");
  if (code === "functions/failed-precondition") return new Error("結果資料已變更，請重新整理後再試。");
  if (code === "functions/unauthenticated") return new Error("無法建立匿名工作階段，請重新整理後再試。");
  if (code === "functions/unavailable") return new Error("教師成績服務暫時無法連線。");
  return error instanceof Error ? error : new Error("教師成績服務暫時無法使用。");
}

export async function ensureAnonymousSession() {
  requireFirebase();
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

export async function openTeacherResultsSession(passcode) {
  requireFirebase();
  const entered = typeof passcode === "string" ? passcode : "";
  if (!/^\d{6}$/.test(entered)) throw new Error("請輸入六位數教師通行碼。");
  const anonymousUser = await ensureAnonymousSession();
  try {
    const response = await httpsCallable(functions, teacherFunctions.login)({ passcode: entered });
    const sessionToken = String(response?.data?.sessionToken || "");
    if (!sessionToken) throw new Error("教師成績服務沒有建立工作階段。");
    teacherResultsSession = { sessionToken, anonymousUid: anonymousUser.uid };
    return teacherResultsSession;
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