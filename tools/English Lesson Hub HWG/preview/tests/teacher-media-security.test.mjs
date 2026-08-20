import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const [firebaseJson, storageRules, firestoreRules, functionSource, mediaClient, mediaUploader, imageUploader, firebaseClient, main, resultRepository, uploadFlow] = await Promise.all([
  readFile(resolve(root, "firebase.json"), "utf8").then(JSON.parse),
  readFile(resolve(root, "storage.rules"), "utf8"),
  readFile(resolve(root, "firestore.rules"), "utf8"),
  readFile(resolve(root, "functions/index.cjs"), "utf8"),
  readFile(resolve(root, "src/lib/teacher-media-client.js"), "utf8"),
  readFile(resolve(root, "src/components/teacher-media-upload.jsx"), "utf8"),
  readFile(resolve(root, "src/components/teacher-image-slides-upload.jsx"), "utf8"),
  readFile(resolve(root, "src/lib/firebase-client.js"), "utf8"),
  readFile(resolve(root, "src/main.jsx"), "utf8"),
  readFile(resolve(root, "src/lib/result-repository.js"), "utf8"),
  readFile(resolve(root, "src/lib/teacher-media-upload-flow.js"), "utf8")
]);

test("teacher media Storage keeps direct anonymous video/PDF uploads and adds a strict Image Slides path", () => {
  assert.equal(firebaseJson.storage.rules, "storage.rules");
  assert.ok(storageRules.includes("anonymousTeacherMediaUploader"));
  assert.ok(storageRules.includes("teacherImageUploader"));
  assert.ok(storageRules.includes("/teacher-image-slides/"));
  assert.ok(storageRules.includes("lessonHubTeacherMediaExpiresAt"));
  assert.ok(storageRules.includes("allow list: if false"));
  assert.ok(storageRules.includes("request.resource.size <= 524288000"));
  assert.ok(storageRules.includes("request.resource.size <= 20971520"));
  assert.ok(storageRules.includes("request.resource.contentType == 'video/mp4'"));
  assert.ok(storageRules.includes("request.resource.contentType == 'application/pdf'"));
  assert.ok(storageRules.includes("request.resource.contentType == 'image/png'"));
  assert.ok(storageRules.includes("request.resource.contentType == 'image/jpeg'"));
  assert.ok(storageRules.includes("request.resource.contentType == 'image/webp'"));
  assert.ok(storageRules.includes("lessonId.matches('^[a-z0-9-]{3,96}$')"));
  assert.ok(storageRules.includes("fileName.matches('^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$')"));
});

test("Image Slides write access uses one-time tokens and a short-lived claim, while Results stays server-side", () => {
  assert.ok(functionSource.includes("teacherMediaUnlockCreate"));
  assert.ok(functionSource.includes("teacherMediaUnlockRedeem"));
  assert.ok(functionSource.includes("MEDIA_UNLOCK_COLLECTION"));
  assert.ok(functionSource.includes("crypto.randomBytes"));
  assert.ok(functionSource.includes('crypto.createHash("sha256")'));
  assert.ok(functionSource.includes("setCustomUserClaims"));
  assert.ok(functionSource.includes("lessonHubTeacherMediaExpiresAt"));
  assert.ok(functionSource.includes("updateTeacherMediaClaim(session.anonymousUid, 0)"));
  assert.equal(functionSource.includes("teacherMediaGrant"), false);
  assert.ok(functionSource.includes('defineSecret("TEACHER_RESULTS_PASSCODE")'));
  assert.ok(firestoreRules.includes("match /teacherMediaUnlocks/{unlockId}"));
  assert.ok(firestoreRules.includes("allow read, write: if false"));
  assert.equal(mediaClient.includes("TEACHER_RESULTS_PASSCODE"), false);
  assert.ok(mediaClient.includes("TEACHER_MEDIA_MAX_BYTES = 500 * 1024 * 1024"));
  assert.ok(mediaClient.includes("TEACHER_IMAGE_MAX_BYTES = 20 * 1024 * 1024"));
  assert.ok(mediaClient.includes("teacher-image-slides"));
});

test("video/PDF remain direct file selection and Image Slides use the one-time cloud unlock flow", () => {
  assert.ok(mediaClient.includes("ensureAnonymousSession"));
  assert.ok(mediaClient.includes("ensureTeacherMediaAccess"));
  assert.ok(mediaClient.includes("forceRefresh: true"));
  assert.ok(mediaClient.includes("teacher-media-storage-rules-denied"));
  assert.equal(mediaClient.includes("grantTeacherMediaAccess"), false);
  assert.equal(mediaClient.includes("teacherSession"), false);
  assert.ok(mediaClient.includes("resolveTeacherMediaUrl"));
  assert.equal(mediaClient.includes("downloadUrl:"), false);
  assert.ok(mediaUploader.includes('type="file"'));
  assert.equal(mediaUploader.includes("教師通行碼"), false);
  assert.equal(mediaUploader.includes("unlockTeacherSession"), false);
  assert.ok(imageUploader.includes('type="file"'));
  assert.ok(imageUploader.includes('mediaType: "image"'));
  assert.ok(imageUploader.includes("slideAssets"));
  assert.ok(imageUploader.includes("重新選取"));
  assert.ok(imageUploader.includes("teacherUnlockPageUrl"));
  assert.ok(imageUploader.includes("重新檢查授權"));
  assert.equal(imageUploader.includes('type="password"'), false);
  assert.ok(firebaseClient.includes("createTeacherMediaUnlockLink"));
  assert.ok(firebaseClient.includes("redeemTeacherMediaUnlock"));
  assert.ok(firebaseClient.includes("ensureTeacherMediaAccess"));
  assert.equal(firebaseClient.includes("mediaGrant"), false);
  assert.ok(resultRepository.includes("createTeacherMediaUnlock"));
  assert.ok(main.includes("mediaUnlockRequested"));
  assert.ok(main.includes("redeemTeacherMediaUnlock"));
  assert.ok(uploadFlow.includes("teacher-media-unlock-expired"));
  assert.ok(uploadFlow.includes("teacher-media-storage-rules-denied"));
  assert.ok(imageUploader.includes("teacherMediaUploadErrorMessage"));
  assert.equal(mediaUploader.includes("cause?.message ||"), false);
});
