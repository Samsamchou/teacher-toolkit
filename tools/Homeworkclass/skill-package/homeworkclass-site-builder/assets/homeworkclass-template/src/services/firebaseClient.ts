import {
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
  getApps,
} from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  type Auth,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import {
  connectFunctionsEmulator,
  getFunctions,
  type Functions,
} from "firebase/functions";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  ReCaptchaV3Provider,
} from "firebase/app-check";

let firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasRequiredFirebaseConfig = (value: FirebaseOptions) =>
  Boolean(value.apiKey && value.authDomain && value.projectId && value.appId);

export let isFirebaseConfigured = hasRequiredFirebaseConfig(firebaseConfig);

export const loadFirebaseConfig = async () => {
  if (isFirebaseConfigured || import.meta.env.VITE_DATA_MODE !== "firebase") return;

  try {
    const response = await fetch("/__/firebase/init.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const hostingConfig = (await response.json()) as FirebaseOptions;
    if (!hasRequiredFirebaseConfig(hostingConfig)) {
      throw new Error("Firebase Hosting 初始化設定不完整");
    }
    firebaseConfig = hostingConfig;
    isFirebaseConfigured = true;
  } catch (error) {
    console.error("無法載入 Firebase Hosting 初始化設定。", error);
  }
};

let cached:
  | { app: FirebaseApp; auth: Auth; db: Firestore; functions: Functions }
  | undefined;

export const getFirebaseServices = () => {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase 尚未設定；請使用本機展示模式。／Firebase is not configured.");
  }
  if (cached) return cached;

  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(
    app,
    import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || "asia-east1",
  );

  if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true") {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  } else if (import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY) {
    const siteKey = import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY;
    const provider =
      import.meta.env.VITE_FIREBASE_APP_CHECK_PROVIDER === "recaptcha-v3"
        ? new ReCaptchaV3Provider(siteKey)
        : new ReCaptchaEnterpriseProvider(siteKey);
    initializeAppCheck(app, {
      provider,
      isTokenAutoRefreshEnabled: true,
    });
  }

  cached = { app, auth, db, functions };
  return cached;
};
