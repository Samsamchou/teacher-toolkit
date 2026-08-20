import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const readJson = async (name) => JSON.parse(await readFile(resolve(root, name), "utf8"));
const [source, firebaseJson, rules, storageRules, functionSource, functionConfig, webClient, publicConfigHelper, imageUploader, mediaClient, main, resultRepository] = await Promise.all([
  readJson("config/site-source.json"),
  readJson("firebase.json"),
  readFile(resolve(root, "firestore.rules"), "utf8"),
  readFile(resolve(root, "storage.rules"), "utf8"),
  readFile(resolve(root, "functions/index.cjs"), "utf8"),
  readFile(resolve(root, "functions/site-config.generated.cjs"), "utf8"),
  readFile(resolve(root, "src/lib/firebase-client.js"), "utf8"),
  readFile(resolve(root, "src/lib/firebase-public-config.js"), "utf8"),
  readFile(resolve(root, "src/components/teacher-image-slides-upload.jsx"), "utf8"),
  readFile(resolve(root, "src/lib/teacher-media-client.js"), "utf8"),
  readFile(resolve(root, "src/main.jsx"), "utf8"),
  readFile(resolve(root, "src/lib/result-repository.js"), "utf8")
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
if (!functionSource.includes("teacherLessonConfigLoad") || !functionSource.includes("teacherLessonConfigSave")) errors.push("Teacher Lesson cloud Functions are incomplete.");
const unlockSources = [functionSource, webClient, imageUploader, mediaClient, main, resultRepository, rules, storageRules];
for (const marker of ["teacherMediaUnlock", "lessonHubTeacherMediaExpiresAt", "MEDIA_UNLOCK_COLLECTION", "ensureTeacherMediaAccess"]) {
  if (unlockSources.some((value) => value.includes(marker))) errors.push(`Obsolete Image Slides unlock marker remains: ${marker}`);
}
if (functionSource.includes("setCustomUserClaims")) errors.push("Image Slides must not use custom claims.");
if (functionSource.includes("teacherMediaGrant") || webClient.includes("mediaGrant") || webClient.includes("grantTeacherMediaAccess")) errors.push("Legacy long-lived media grant must be removed.");
if (imageUploader.includes('type="password"') || imageUploader.includes("解鎖") || !imageUploader.includes('type="file"') || !imageUploader.includes("選取後會直接上傳")) errors.push("Image Slides must select files directly without an unlock UI.");
if (!storageRules.includes("anonymousTeacherMediaUploader") || !storageRules.includes("allow create: if anonymousTeacherMediaUploader()") || !storageRules.includes("resource == null") || !storageRules.includes("allow update, delete: if false") || !storageRules.includes("allow list: if false")) errors.push("Storage rules must allow constrained anonymous image creation and block list, overwrite, and delete.");
if (functionSource.includes("createCustomToken")) errors.push("Results Functions must not mint custom tokens.");
if (!functionSource.includes("teacherLoginAttempts") || !functionSource.includes("GLOBAL_MAX_ATTEMPTS")) errors.push("Login Function must enforce server-side rate limits.");
if (!functionConfig.includes("functionsRegion") || !functionConfig.includes("teacherResultsDelete")) errors.push("Generated Functions configuration is missing.");
if (webClient.includes("GoogleAuthProvider") || webClient.includes("signInWithPopup") || webClient.includes("signInWithCustomToken")) errors.push("Frontend must not retain Google or custom-token teacher login.");
if (!webClient.includes("resolveFirebasePublicConfig") || !publicConfigHelper.includes('FIREBASE_RUNTIME_CONFIG_URL = "/__/firebase/init.json"') || !publicConfigHelper.includes("project-mismatch")) errors.push("Frontend must load Firebase Hosting runtime configuration and reject an unexpected project.");
if (!webClient.includes("let teacherResultsSession = null") || !webClient.includes("teacherResultsRecordExport")) errors.push("Frontend must use the in-memory Results session flow.");
if (main.includes("Google 教師登入") || !main.includes('type="password"') || !main.includes("teacher-login-start")) errors.push("Results page must show the two-step passcode form instead of Google login.");
if (rules.includes("request.auth.token.teacher")) errors.push("Firestore rules must not grant browser access from a teacher claim.");
if (rules.includes("teacherMediaUnlocks") || rules.includes("teacherMediaAccess")) errors.push("Obsolete media unlock collections must be removed from Firestore rules.");
for (const collection of ["teacherLoginAttempts", "teacherResultSessions", "teacherLessonConfigs", "exportEvents"]) {
  if (!rules.includes(`match /${collection}/`) || !rules.includes("allow read, write: if false")) errors.push(`Function-owned ${collection} records must be denied to clients.`);
}
if (!rules.includes("allow list, update, delete: if false")) errors.push("Browser clients must not list or delete practice Results directly.");
const report = {
  status: errors.length ? "FAIL" : "PASS",
  serverSecretOnly: !webClient.includes("TEACHER_RESULTS_PASSCODE"),
  browserMemorySessionFlow: functionSource.includes("teacherResultSessions") && webClient.includes("let teacherResultsSession = null"),
  rateLimit: functionSource.includes("teacherLoginAttempts"),
  googlePopupRemoved: !webClient.includes("GoogleAuthProvider") && !webClient.includes("signInWithPopup"),
  directImageUpload: storageRules.includes("allow create: if anonymousTeacherMediaUploader()") && imageUploader.includes("選取後會直接上傳"),
  obsoleteMediaUnlockRemoved: !unlockSources.some((value) => value.includes("teacherMediaUnlock")) && !functionSource.includes("setCustomUserClaims"),
  imageCloudDeleteServerOnly: storageRules.includes("allow update, delete: if false") && functionSource.includes("pendingImageDeletes") && functionSource.includes("getStorage") && imageUploader.includes("雲端 Save Lesson 成功") && !imageUploader.includes("window.confirm"),
  errors
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = errors.length ? 1 : 0;
