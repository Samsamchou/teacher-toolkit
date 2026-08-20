import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const readJson = async (name) => JSON.parse(await readFile(resolve(root, name), "utf8"));
const [source, firebaseJson, firebaserc, rules, storageRules, functionSource, webClient, publicConfigHelper, imageUploader] = await Promise.all([
  readJson("config/site-source.json"),
  readJson("firebase.json"),
  readJson(".firebaserc"),
  readFile(resolve(root, "firestore.rules"), "utf8"),
  readFile(resolve(root, "storage.rules"), "utf8"),
  readFile(resolve(root, "functions/index.cjs"), "utf8"),
  readFile(resolve(root, "src/lib/firebase-client.js"), "utf8"),
  readFile(resolve(root, "src/lib/firebase-public-config.js"), "utf8"),
  readFile(resolve(root, "src/components/teacher-image-slides-upload.jsx"), "utf8")
]);
const errors = [];
const warnings = [];
const publicConfigKeys = ["VITE_FIREBASE_API_KEY", "VITE_FIREBASE_AUTH_DOMAIN", "VITE_FIREBASE_PROJECT_ID", "VITE_FIREBASE_APP_ID"];
const envFile = {};
try {
  const contents = await readFile(resolve(root, ".env.production"), "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const separator = line.indexOf("=");
    if (separator > 0) envFile[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
const projectId = source.firebase?.projectId;
const hostingTarget = source.firebase?.hostingSiteId;
const hosting = Array.isArray(firebaseJson.hosting) ? firebaseJson.hosting : [];
const targets = firebaserc.targets?.[projectId]?.hosting || {};

if (projectId !== "hwg7teaching") errors.push("Firebase project must be hwg7teaching.");
if (firebaserc.projects?.default !== projectId) errors.push(".firebaserc default project does not match site source.");
if (hostingTarget !== "lesson-hub-v03") errors.push("Hosting site must be the dedicated lesson-hub-v03 target.");
if (hosting.length !== 1 || hosting[0]?.target !== hostingTarget) errors.push("firebase.json must contain exactly one dedicated Hosting target.");
if (JSON.stringify(targets?.[hostingTarget] || []) !== JSON.stringify([hostingTarget])) errors.push("Hosting target mapping must not point to the default site.");
if (firebaseJson.storage?.rules !== "storage.rules") errors.push("firebase.json must deploy the teacher media Storage rules.");
for (const required of ["anonymousTeacherMediaUploader", "/teacher-image-slides/", "allow create: if anonymousTeacherMediaUploader()", "resource == null", "allow update, delete: if false", "allow list: if false", "request.resource.size <= 524288000", "request.resource.size <= 20971520", "request.resource.contentType == 'video/mp4'", "request.resource.contentType == 'application/pdf'"]) {
  if (!storageRules.includes(required)) errors.push(`Storage rules missing required guard: ${required}`);
}
for (const forbidden of ["teacherImageUploader", "lessonHubTeacherMediaExpiresAt"]) {
  if (storageRules.includes(forbidden)) errors.push(`Storage rules retain obsolete unlock guard: ${forbidden}`);
}
for (const required of ["anonymousStudent", "allow create: if anonymousStudent()", "allow list, update, delete: if false", "match /teacherResultSessions/{sessionId}", "match /teacherLessonConfigs/{configId}"]) {
  if (!rules.includes(required)) errors.push(`Firestore rules missing required guard: ${required}`);
}
if (rules.includes("teacherMediaUnlocks") || rules.includes("teacherMediaAccess")) errors.push("Firestore rules retain obsolete media unlock collections.");
if (functionSource.includes("teacherMediaUnlock") || functionSource.includes("setCustomUserClaims")) errors.push("Functions retain obsolete Image Slides unlock endpoints or claims.");
if (webClient.includes("teacherMediaUnlock") || webClient.includes("ensureTeacherMediaAccess")) errors.push("Frontend Firebase client retains obsolete Image Slides unlock flow.");
if (imageUploader.includes("解鎖") || !imageUploader.includes("選取後會直接上傳")) errors.push("Image Slides uploader is not the confirmed direct-upload interface.");
if (imageUploader.includes("window.confirm") || !imageUploader.includes("雲端 Save Lesson 成功") || !imageUploader.includes("由伺服器刪除")) errors.push("Image Slides removal must use 4B server cleanup after a successful cloud save.");
if (!functionSource.includes("buildPendingImageDeletes") || !functionSource.includes("deletePendingTeacherImages") || !functionSource.includes("pendingImageDeletes") || !functionSource.includes("getStorage")) errors.push("Functions are missing protected Image Slides cleanup.");
if (rules.includes("request.auth.token.teacher")) errors.push("Firestore rules must not rely on a teacher claim.");
const provided = publicConfigKeys.filter((key) => Boolean(process.env[key] || envFile[key]));
const runtimeConfigSupported = webClient.includes("resolveFirebasePublicConfig") && publicConfigHelper.includes('FIREBASE_RUNTIME_CONFIG_URL = "/__/firebase/init.json"') && publicConfigHelper.includes("project-mismatch");
if (provided.length && provided.length !== publicConfigKeys.length) warnings.push("Only part of the environment Firebase public configuration is present; the formal Hosting build will use its reserved runtime configuration instead.");
if (provided.length !== publicConfigKeys.length && !runtimeConfigSupported) errors.push("Firebase public Web App configuration is unavailable from both the environment and the Hosting reserved runtime endpoint.");
const report = {
  status: errors.length ? "FAIL" : "PASS",
  projectId,
  hostingSite: hostingTarget,
  defaultHostingUntouched: hosting[0]?.target === "lesson-hub-v03",
  firestoreRuleGuards: {
    anonymousCreate: rules.includes("allow create: if anonymousStudent()"),
    browserResultListBlocked: rules.includes("allow list, update, delete: if false"),
    serverSessionRecordsBlocked: rules.includes("match /teacherResultSessions/{sessionId}") && rules.includes("allow read, write: if false"),
    obsoleteMediaUnlockRulesRemoved: !rules.includes("teacherMediaUnlocks") && !rules.includes("teacherMediaAccess"),
    teacherClaimRemoved: !rules.includes("request.auth.token.teacher")
  },
  storageRuleGuards: {
    anonymousDirectImageCreate: storageRules.includes("allow create: if anonymousTeacherMediaUploader()"),
    browserListBlocked: storageRules.includes("allow list: if false"),
    imageOverwriteAndDeleteBlocked: storageRules.includes("allow update, delete: if false"),
    protectedServerImageCleanup: functionSource.includes("pendingImageDeletes") && functionSource.includes("getStorage"),
    imageMaxUploadBytes: storageRules.includes("request.resource.size <= 20971520"),
    maxUploadBytes: storageRules.includes("request.resource.size <= 524288000")
  },
  obsoleteUnlockFunctionsRemoved: !functionSource.includes("teacherMediaUnlock") && !functionSource.includes("setCustomUserClaims"),
  publicWebConfig: provided.length === publicConfigKeys.length ? "environment" : runtimeConfigSupported ? "hosting-runtime" : "pending",
  warnings,
  errors
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = errors.length ? 1 : 0;
