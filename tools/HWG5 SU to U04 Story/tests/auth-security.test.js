import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const indexHtml = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const firebaseConfig = JSON.parse(readFileSync(new URL("../firebase.json", import.meta.url), "utf8"));
const firestoreRules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
const storageRules = readFileSync(new URL("../storage.rules", import.meta.url), "utf8");

test("教師後臺不再使用前端固定密碼", () => {
  assert.doesNotMatch(indexHtml, /prompt\(["']請輸入教師密碼/);
  assert.doesNotMatch(indexHtml, /pwd\s*===\s*["'][^"']+["']/);
  assert.match(indexHtml, /new firebase\.auth\.GoogleAuthProvider\(\)/);
  assert.match(indexHtml, /emailVerified === true/);
  assert.match(indexHtml, /AUTHORIZED_TEACHER_EMAIL/);
});

test("學生使用匿名驗證並以 ownerUid 限制查詢與音檔路徑", () => {
  assert.match(indexHtml, /firebase-auth-compat\.js/);
  assert.match(indexHtml, /signInAnonymously\(\)/);
  assert.match(indexHtml, /\.where\("ownerUid", "==", currentOwnerUid\)/);
  assert.match(indexHtml, /ownerUid: currentOwnerUid/);
  assert.match(indexHtml, /audio_records\/\$\{currentOwnerUid\}\/\$\{currentStudentId\}/);
});

test("預設 Firebase App 也使用 reCAPTCHA Enterprise App Check", () => {
  assert.match(indexHtml, /firebase-app-check-compat\.js/);
  assert.match(indexHtml, /firebase\.appCheck\(\)\.activate/);
  assert.match(indexHtml, /firebase\.appCheck\.ReCaptchaEnterpriseProvider/);
  assert.doesNotMatch(indexHtml, /FIREBASE_APPCHECK_DEBUG_TOKEN\s*=\s*["'][^"']+["']/);
});

test("Firebase 設定納入 Firestore 與 Storage Rules", () => {
  assert.equal(firebaseConfig.firestore.rules, "firestore.rules");
  assert.equal(firebaseConfig.storage.rules, "storage.rules");
});

test("Rules 採預設拒絕、教師驗證與嚴格資料模型", () => {
  assert.match(firestoreRules, /email_verified == true/);
  assert.match(firestoreRules, /data\.keys\(\)\.hasOnly/);
  assert.match(firestoreRules, /allow create: if isOwner/);
  assert.match(firestoreRules, /allow delete: if isTeacher\(\)/);
  assert.match(firestoreRules, /match \/\{document=\*\*\}[\s\S]*allow read, write: if false/);

  assert.match(storageRules, /request\.resource\.size <= 10 \* 1024 \* 1024/);
  assert.match(storageRules, /request\.resource\.contentType\.matches\('\^audio\/\.\*'\)/);
  assert.match(storageRules, /match \/\{allPaths=\*\*\}[\s\S]*allow read, write: if false/);
});
