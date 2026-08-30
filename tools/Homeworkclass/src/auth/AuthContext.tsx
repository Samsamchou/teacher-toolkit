import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithCustomToken,
  signOut,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import {
  getFirebaseServices,
  isFirebaseConfigured,
} from "../services/firebaseClient";

const SESSION_KEY = "homeworkclass.teacher.session.v1";
const PRIVATE_SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const SHARED_IDLE_MS = 30 * 60 * 1000;

interface AuthContextValue {
  authenticated: boolean;
  loading: boolean;
  privateDevice: boolean;
  mode: "demo" | "firebase";
  signIn(pin: string, rememberPrivateDevice: boolean): Promise<void>;
  signOutTeacher(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface StoredSession {
  privateDevice: boolean;
  expiresAt: number;
  lastActiveAt: number;
}

const readSession = (): StoredSession | null => {
  const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: PropsWithChildren) {
  const mode =
    import.meta.env.VITE_DATA_MODE === "firebase" && isFirebaseConfigured
      ? "firebase"
      : "demo";
  const initialSession = useMemo(readSession, []);
  const [authenticated, setAuthenticated] = useState(
    Boolean(initialSession && initialSession.expiresAt > Date.now()),
  );
  const [privateDevice, setPrivateDevice] = useState(
    initialSession?.privateDevice ?? false,
  );
  const [loading, setLoading] = useState(mode === "firebase");
  const lastActiveRef = useRef(initialSession?.lastActiveAt ?? Date.now());

  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    setAuthenticated(false);
    setPrivateDevice(false);
  }, []);

  const endSession = useCallback(async () => {
    try {
      if (mode === "firebase") await signOut(getFirebaseServices().auth);
    } finally {
      clearSession();
    }
  }, [clearSession, mode]);

  useEffect(() => {
    if (mode !== "firebase") return;
    const { auth } = getFirebaseServices();
    return onAuthStateChanged(auth, (user) => {
      const session = readSession();
      const valid = Boolean(user && session && session.expiresAt > Date.now());
      setAuthenticated(valid);
      setPrivateDevice(session?.privateDevice ?? false);
      setLoading(false);
      if (!valid && user) void signOut(auth);
    });
  }, [mode]);

  useEffect(() => {
    if (!authenticated) return;
    const markActivity = () => {
      lastActiveRef.current = Date.now();
      const session = readSession();
      if (!session) return;
      session.lastActiveAt = lastActiveRef.current;
      if (!session.privateDevice) {
        session.expiresAt = lastActiveRef.current + SHARED_IDLE_MS;
      }
      const storage = session.privateDevice ? localStorage : sessionStorage;
      storage.setItem(SESSION_KEY, JSON.stringify(session));
    };
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown"];
    events.forEach((event) => window.addEventListener(event, markActivity));
    const timer = window.setInterval(() => {
      const session = readSession();
      if (!session || session.expiresAt <= Date.now()) {
        void endSession();
        return;
      }
      if (!session.privateDevice && Date.now() - lastActiveRef.current >= SHARED_IDLE_MS) {
        void endSession();
      }
    }, 30_000);
    return () => {
      events.forEach((event) => window.removeEventListener(event, markActivity));
      window.clearInterval(timer);
    };
  }, [authenticated, endSession]);

  const signInTeacher = async (pin: string, rememberPrivateDevice: boolean) => {
    if (!/^\d{6}$/.test(pin)) throw new Error("請輸入 6 位數通行碼");

    const now = Date.now();
    const session: StoredSession = {
      privateDevice: rememberPrivateDevice,
      expiresAt: rememberPrivateDevice ? now + PRIVATE_SESSION_MS : now + SHARED_IDLE_MS,
      lastActiveAt: now,
    };
    const persistSession = () => {
      const storage = rememberPrivateDevice ? localStorage : sessionStorage;
      storage.setItem(SESSION_KEY, JSON.stringify(session));
      if (rememberPrivateDevice) sessionStorage.removeItem(SESSION_KEY);
      else localStorage.removeItem(SESSION_KEY);
    };

    if (mode === "firebase") {
      const { auth, functions } = getFirebaseServices();
      await setPersistence(
        auth,
        rememberPrivateDevice ? browserLocalPersistence : browserSessionPersistence,
      );
      const verifyTeacherPin = httpsCallable<
        { pin: string },
        { customToken: string }
      >(functions, "verifyTeacherPin");
      const result = await verifyTeacherPin({ pin });
      // Firebase may notify onAuthStateChanged before signInWithCustomToken resolves.
      // Persist first so the listener does not treat the new user as an invalid session.
      persistSession();
      try {
        await signInWithCustomToken(auth, result.data.customToken);
      } catch (reason) {
        clearSession();
        throw reason;
      }
    } else {
      persistSession();
    }

    lastActiveRef.current = now;
    setPrivateDevice(rememberPrivateDevice);
    setAuthenticated(true);
  };

  const signOutTeacher = async () => {
    await endSession();
  };

  return (
    <AuthContext.Provider
      value={{
        authenticated,
        loading,
        privateDevice,
        mode,
        signIn: signInTeacher,
        signOutTeacher,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth 必須在 AuthProvider 內使用");
  return context;
};
