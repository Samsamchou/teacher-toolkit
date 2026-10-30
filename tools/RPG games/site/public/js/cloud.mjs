// 雲端紀錄：Firebase 專案 g6-english-online-learning（與其他教學網站共用資料庫）。
// 本網站只寫 `rpgAttempts` 集合，受 firestore.rules 保護：學生裝置匿名登入，
// 只能新增／更新自己這台裝置的紀錄，讀不回任何紀錄；只有老師帳號能讀。
// 下面是公開的網頁設定，不是金鑰。
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAo40lPKEX-E-l1laMwGbhFOWuct-q_98M",
  authDomain: "g6-english-online-learning.firebaseapp.com",
  projectId: "g6-english-online-learning",
  messagingSenderId: "738830028920",
  appId: "1:738830028920:web:01690c8e830c9bf471dd8d",
};
export const SDK = "https://www.gstatic.com/firebasejs/11.10.0";
export const COLLECTION = "rpgAttempts";
export const RETENTION_DAYS = 456;   // 最後活動後保留 1 年 3 個月（TTL 自動刪除）

// 本機測試：127.0.0.1/localhost 加 ?emu=1 改連模擬器（auth 9099、firestore 8087）
const local = ["127.0.0.1", "localhost"].includes(location.hostname);
try { if (local && new URLSearchParams(location.search).has("emu")) sessionStorage.setItem("rpg-emu", "1"); } catch { /* ignore */ }
export const EMULATOR = local && (() => { try { return sessionStorage.getItem("rpg-emu") === "1"; } catch { return false; } })();
export function useEmulators(auth, A, db, F) {
  if (!EMULATOR) return;
  A.connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  F.connectFirestoreEmulator(db, "127.0.0.1", 8087);
}
const cloudOff = () => new URLSearchParams(location.search).get("cloud") === "off";

let client = null;
async function connect() {
  client ||= (async () => {
    const [{ initializeApp }, A, F] = await Promise.all([
      import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-auth.js`), import(`${SDK}/firebase-firestore.js`)]);
    const app = initializeApp(FIREBASE_CONFIG, "rpg-student");
    const auth = A.getAuth(app), db = F.getFirestore(app);
    useEmulators(auth, A, db, F);
    await auth.authStateReady();
    if (!auth.currentUser) await A.signInAnonymously(auth);
    return { db, uid: auth.currentUser.uid, F };
  })().catch(err => { client = null; throw err; });
  return client;
}

// 上傳最新紀錄（防抖動；較新的紀錄會取代還沒送出的）。失敗不打擾學生，下次再試。
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
    const expiresAt = c.F.Timestamp.fromMillis(Date.now() + RETENTION_DAYS * 86400000);
    await c.F.setDoc(c.F.doc(c.db, COLLECTION, record.attemptId), { ...record, uid: c.uid, expiresAt });
    setStatus("synced");
  } catch (err) {
    console.warn("rpg cloud upload failed", err?.code || err?.message || err);
    pending ||= record;
    setStatus("offline");
  }
}
export function uploadAttempt(record, { immediate = false } = {}) {
  if (cloudOff()) { setStatus("off"); return; }
  pending = record;
  clearTimeout(timer);
  if (immediate) return flushNow();
  timer = setTimeout(flushNow, 1200);
}
export const retryUpload = () => flushNow();
window.addEventListener("online", () => { if (pending) flushNow(); });
