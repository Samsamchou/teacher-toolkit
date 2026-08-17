import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  setPersistence,
  signInAnonymously,
  signInWithCustomToken,
  signOut
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

const env = import.meta.env || {};
const publicConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};
const functionsRegion = String(env.VITE_FIREBASE_FUNCTIONS_REGION || "asia-east1");

const requiredFields = ["apiKey", "authDomain", "projectId", "appId"];
export const isFirebaseConfigured = requiredFields.every((field) => Boolean(String(publicConfig[field] || "").trim()));

const app = isFirebaseConfigured ? (getApps().length ? getApp() : initializeApp(publicConfig)) : null;
export const auth = app ? getAuth(app) : null;
export const firestore = app ? getFirestore(app) : null;
export const functions = app ? getFunctions(app, functionsRegion) : null;

export function firebaseStatus() {
  if (isFirebaseConfigured) return { enabled: true, message: "Firebase connected" };
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
  if (code === "functions/permission-denied") return new Error("教師通行碼錯誤。");
  if (code === "functions/resource-exhausted") return new Error("嘗試次數過多，請稍後再試。");
  if (code === "functions/failed-precondition") return new Error("教師通行碼服務尚未完成設定。");
  if (code === "functions/unauthenticated") return new Error("無法建立匿名驗證工作階段，請重新整理後再試。");
  if (code === "functions/unavailable") return new Error("教師通行碼服務暫時無法連線。");
  return error instanceof Error ? error : new Error("教師通行碼服務暫時無法使用。");
}

export async function ensureAnonymousSession() {
  requireFirebase();
  if (auth.currentUser?.isAnonymous) return auth.currentUser;
  if (auth.currentUser) await signOut(auth);
  try {
    return (await signInAnonymously(auth)).user;
  } catch (error) {
    if (error?.code === "auth/operation-not-allowed") {
      throw new Error("Firebase Authentication 尚未啟用 Anonymous 登入。");
    }
    throw error;
  }
}

export async function teacherSession() {
  requireFirebase();
  const user = auth.currentUser;
  if (!user || user.isAnonymous) return null;
  const token = await user.getIdTokenResult(true);
  return token.claims.teacher === true && token.claims.teacherAccess === "passcode" ? { user, claims: token.claims } : null;
}

export async function signInTeacherWithPasscode(passcode) {
  requireFirebase();
  const entered = typeof passcode === "string" ? passcode : "";
  if (!/^\d{6}$/.test(entered)) throw new Error("請輸入六位數教師通行碼。");
  await ensureAnonymousSession();
  try {
    const response = await httpsCallable(functions, "teacherPasscodeLogin")({ passcode: entered });
    const customToken = String(response?.data?.customToken || "");
    if (!customToken) throw new Error("教師通行碼服務沒有回傳安全工作階段。");
    await setPersistence(auth, browserSessionPersistence);
    const signedIn = await signInWithCustomToken(auth, customToken);
    const token = await signedIn.user.getIdTokenResult(true);
    if (token.claims.teacher !== true || token.claims.teacherAccess !== "passcode") {
      await signOut(auth);
      throw new Error("教師安全工作階段驗證失敗。");
    }
    return { user: signedIn.user, claims: token.claims };
  } catch (error) {
    if (auth.currentUser?.isAnonymous) await setPersistence(auth, browserLocalPersistence).catch(() => undefined);
    throw teacherLoginError(error);
  }
}

export async function signOutTeacher() {
  if (!auth?.currentUser) return;
  const current = await teacherSession().catch(() => null);
  if (current && functions) {
    try {
      await httpsCallable(functions, "teacherPasscodeLogout")({});
    } catch {
      // Local sign-out still removes browser access if the server cleanup is temporarily unavailable.
    }
  }
  await signOut(auth);
  await setPersistence(auth, browserLocalPersistence);
}