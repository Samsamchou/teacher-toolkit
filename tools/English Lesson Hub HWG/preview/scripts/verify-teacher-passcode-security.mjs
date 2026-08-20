import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const readJson = async (name) => JSON.parse(await readFile(resolve(root, name), "utf8"));
const [source, firebaseJson, rules, storageRules, functionSource, functionConfig, webClient, publicConfigHelper, imageUploader, main] = await Promise.all([
  readJson("config/site-source.json"),
  readJson("firebase.json"),
  readFile(resolve(root, "firestore.rules"), "utf8"),
  readFile(resolve(root, "storage.rules"), "utf8"),
  readFile(resolve(root, "functions/index.cjs"), "utf8"),
  readFile(resolve(root, "functions/site-config.generated.cjs"), "utf8"),
  readFile(resolve(root, "src/lib/firebase-client.js"), "utf8"),
  readFile(resolve(root, "src/lib/firebase-public-config.js"), "utf8"),
  readFile(resolve(root, "src/components/teacher-image-slides-upload.jsx"), "utf8"),
  readFile(resolve(root, "src/main.jsx"), "utf8")
]);
const errors = [];
const config = source.firebase?.teacherPasscode || {};
const functions = Array.isArray(firebaseJson.functions) ? firebaseJson.functions : [];
const functionTarget = functions.find((item) => item?.source === "functions" && item?.codebase === "teacher-access");
if (source.firebase?.functionsRegion !== "asia-east1") errors.push("Teacher Results Functions region must be asia-east1.");
if (config.secretName !== "TEACHER_RESULTS_PASSCODE") errors.push("Teacher passcode Secret name is missing or unexpected.");
if (config.loginFunction !== "teacherPasscodeLogin" || config.logoutFunction !== "teacherPasscodeLogout" || config.listFunction !== "teacherResultsList" || config.recordExportFunction !== "teacherResultsRecordExport" || config.deleteFunction !== "teacherResultsDelete") errors.push("Teacher Results Function names are inconsistent.");
if (config.sessionHours !== 8 || config.resultLimit !== 5000) errors.push("Teacher Results session configuration is inconsistent.");
if (!functionTarget) errors.push("firebase.json must declare the teacher-access Functions codebase.");
if (!functionSource.includes('defineSecret("TEACHER_RESULTS_PASSCODE")')) errors.push("Login Function must bind the teacher passcode Secret.");
if (!functionSource.includes("teacherResultSessions") || !functionSource.includes("teacherResultsList") || !functionSource.includes("teacherResultsRecordExport") || !functionSource.includes("teacherResultsDelete")) errors.push("Server Results session functions are incomplete.");
if (!functionSource.includes("teacherMediaUnlockCreate") || !functionSource.includes("teacherMediaUnlockRedeem") || !functionSource.includes("MEDIA_UNLOCK_COLLECTION") || !functionSource.includes("crypto.randomBytes") || !functionSource.includes("MEDIA_UNLOCK_DURATION_MS = 10 * 60 * 1000")) errors.push("One-time teacher media unlock Functions are incomplete.");
if (functionSource.includes("teacherMediaGrant") || webClient.includes("mediaGrant") || webClient.includes("grantTeacherMediaAccess")) errors.push("Legacy long-lived media grant must be removed.");
if (!webClient.includes("createTeacherMediaUnlockLink") || !webClient.includes("redeemTeacherMediaUnlock") || !webClient.includes("ensureTeacherMediaAccess")) errors.push("Frontend one-time media unlock client is incomplete.");
if (!main.includes("mediaUnlockRequested") || !main.includes("teacherMediaUnlock") || !main.includes("createTeacherMediaUnlock")) errors.push("Results page must create and redeem the one-time media unlock link.");
if (imageUploader.includes('type="password"') || !imageUploader.includes("開啟教師解鎖頁") || !imageUploader.includes("重新檢查授權")) errors.push("Image Slides must show an actionable unlock link without a passcode field.");
if (!storageRules.includes("teacherImageUploader") || !storageRules.includes("lessonHubTeacherMediaExpiresAt") || !storageRules.includes("allow list: if false")) errors.push("Storage rules must require the short-lived image claim and block listing.");
if (functionSource.includes("createCustomToken")) errors.push("Results Functions must not mint custom tokens.");
if (!functionSource.includes("teacherLoginAttempts") || !functionSource.includes("GLOBAL_MAX_ATTEMPTS")) errors.push("Login Function must enforce server-side rate limits.");
if (!functionConfig.includes("functionsRegion") || !functionConfig.includes("teacherResultsDelete")) errors.push("Generated Functions configuration is missing.");
if (webClient.includes("GoogleAuthProvider") || webClient.includes("signInWithPopup") || webClient.includes("signInWithCustomToken")) errors.push("Frontend must not retain Google or custom-token teacher login.");
if (!webClient.includes("resolveFirebasePublicConfig") || !publicConfigHelper.includes('FIREBASE_RUNTIME_CONFIG_URL = "/__/firebase/init.json"') || !publicConfigHelper.includes("project-mismatch")) errors.push("Frontend must load Firebase Hosting runtime configuration and reject an unexpected project.");
if (!webClient.includes("let teacherResultsSession = null") || !webClient.includes("teacherResultsRecordExport")) errors.push("Frontend must use the in-memory Results session flow.");
if (main.includes("Google 教師登入") || !main.includes('type="password"') || !main.includes("teacher-login-start")) errors.push("Results page must show the two-step passcode form instead of Google login.");
if (rules.includes("request.auth.token.teacher")) errors.push("Firestore rules must not grant browser access from a teacher claim.");
for (const collection of ["teacherLoginAttempts", "teacherResultSessions", "teacherLessonConfigs", "teacherMediaUnlocks", "teacherMediaAccess", "exportEvents"]) {
  if (!rules.includes(`match /${collection}/`) || !rules.includes("allow read, write: if false")) errors.push(`Function-owned ${collection} records must be denied to clients.`);
}
if (!rules.includes("allow list, update, delete: if false")) errors.push("Browser clients must not list or delete practice Results directly.");
const report = {
  status: errors.length ? "FAIL" : "PASS",
  serverSecretOnly: !webClient.includes("TEACHER_RESULTS_PASSCODE"),
  browserMemorySessionFlow: functionSource.includes("teacherResultSessions") && webClient.includes("let teacherResultsSession = null"),
  rateLimit: functionSource.includes("teacherLoginAttempts"),
  googlePopupRemoved: !webClient.includes("GoogleAuthProvider") && !webClient.includes("signInWithPopup"),
  oneTimeMediaUnlock: functionSource.includes("teacherMediaUnlockCreate") && functionSource.includes("teacherMediaUnlockRedeem") && !functionSource.includes("teacherMediaGrant"),
  imageSlidesNoPasscode: !imageUploader.includes('type="password"') && imageUploader.includes("開啟教師解鎖頁"),
  errors
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = errors.length ? 1 : 0;
