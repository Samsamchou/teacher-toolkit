// English Mission Quest — cloud records for the teacher dashboard.
// Firebase project g6-english-online-learning (shared with english-portal; our data lives only in
// the `questAttempts` collection, protected by firestore.rules). The web config below is the public
// client config, not a secret. Students sign in anonymously; nothing here can read records back.
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAo40lPKEX-E-l1laMwGbhFOWuct-q_98M",
  authDomain: "g6-english-online-learning.firebaseapp.com",
  projectId: "g6-english-online-learning",
  messagingSenderId: "738830028920",
  appId: "1:738830028920:web:01690c8e830c9bf471dd8d",
};
export const SDK = "https://www.gstatic.com/firebasejs/11.10.0";
export const COLLECTION = "questAttempts";
// Records are kept 1 year 3 months after the student's last activity: every upload sets expiresAt,
// and a Firestore TTL policy on questAttempts.expiresAt deletes expired documents automatically.
export const RETENTION_DAYS = 456;

// Local testing only: ?emu=1 on 127.0.0.1/localhost talks to the Firebase emulators (auth 9099,
// firestore 8087) instead of the real project. The flag is remembered for the browser tab.
const local = ["127.0.0.1", "localhost"].includes(location.hostname);
try { if (local && new URLSearchParams(location.search).has("emu")) sessionStorage.setItem("quest-emu", "1"); } catch { /* ignore */ }
export const EMULATOR = local && (() => { try { return sessionStorage.getItem("quest-emu") === "1"; } catch { return false; } })();
export function useEmulators(auth, A, db, F) {
  if (!EMULATOR) return;
  A.connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  F.connectFirestoreEmulator(db, "127.0.0.1", 8087);
}

let client = null;
async function connect() {
  client ||= (async () => {
    const [{ initializeApp }, { getAuth, signInAnonymously }, fs] = await Promise.all([
      import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-auth.js`), import(`${SDK}/firebase-firestore.js`)]);
    const app = initializeApp(FIREBASE_CONFIG, "quest-student");
    const authMod = await import(`${SDK}/firebase-auth.js`);
    const auth = getAuth(app), db = fs.getFirestore(app);
    useEmulators(auth, authMod, db, fs);
    await auth.authStateReady();
    if (!auth.currentUser) await signInAnonymously(auth);
    return { db, uid: auth.currentUser.uid, doc: fs.doc, setDoc: fs.setDoc, getDoc: fs.getDoc, Timestamp: fs.Timestamp };
  })().catch(err => { client = null; throw err; });
  return client;
}

// Debounced upload of the latest record; a newer record replaces a pending one. Failures are silent
// for students (the game keeps working offline) and retried on the next save.
let pending = null, timer = null, status = "idle";
const listeners = new Set();
const setStatus = s => { status = s; for (const f of listeners) f(s); };
export const cloudStatus = () => status;
export const onCloudStatus = f => (listeners.add(f), () => listeners.delete(f));

async function flushNow() {
  clearTimeout(timer); timer = null;
  const record = pending; pending = null;
  if (!record) return;
  try {
    setStatus("syncing");
    const c = await connect();
    const expiresAt = c.Timestamp.fromMillis(Date.now() + RETENTION_DAYS * 86400000);
    await c.setDoc(c.doc(c.db, COLLECTION, record.attemptId), { ...record, uid: c.uid, expiresAt });
    setStatus("synced");
  } catch (err) {
    console.warn("quest cloud upload failed", err?.code || err?.message || err);
    pending ||= record;
    setStatus("offline");
  }
}
export function uploadAttempt(record, { immediate = false } = {}) {
  if (new URLSearchParams(location.search).get("cloud") === "off") return;
  pending = record;
  clearTimeout(timer);
  if (immediate) return flushNow();
  timer = setTimeout(flushNow, 1500);
}
window.addEventListener("online", () => { if (pending) flushNow(); });

// ---- Cross-device progress (二水 3D 英語闖關 only). Document id = `${mission}_${studentId}`; any signed-in
// device can read/write one document by student id but nobody can list them (see firestore.rules).
export const PROGRESS_COLLECTION = "questProgress";
export async function loadProgress(mission, studentId) {
  if (new URLSearchParams(location.search).get("cloud") === "off") return null;
  try {
    const c = await connect();
    const snap = await c.getDoc(c.doc(c.db, PROGRESS_COLLECTION, `${mission}_${studentId}`));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.warn("quest progress load failed", err?.code || err?.message || err);
    return null;
  }
}
let progressPending = null, progressTimer = null;
async function flushProgress() {
  clearTimeout(progressTimer); progressTimer = null;
  const record = progressPending; progressPending = null;
  if (!record) return;
  try {
    const c = await connect();
    const expiresAt = c.Timestamp.fromMillis(Date.now() + RETENTION_DAYS * 86400000);
    await c.setDoc(c.doc(c.db, PROGRESS_COLLECTION, `${record.mission}_${record.studentId}`), { ...record, expiresAt });
  } catch (err) {
    console.warn("quest progress upload failed", err?.code || err?.message || err);
    progressPending ||= record;
  }
}
export function saveProgress(record, { immediate = false } = {}) {
  if (new URLSearchParams(location.search).get("cloud") === "off") return;
  progressPending = record;
  clearTimeout(progressTimer);
  if (immediate) return flushProgress();
  progressTimer = setTimeout(flushProgress, 1500);
}
window.addEventListener("online", () => { if (progressPending) flushProgress(); });
