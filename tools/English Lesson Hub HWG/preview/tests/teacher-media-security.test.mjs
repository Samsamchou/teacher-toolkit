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

test("Storage keeps direct anonymous media upload and applies strict Image Slides limits", () => {
  assert.equal(firebaseJson.storage.rules, "storage.rules");
  assert.ok(storageRules.includes("anonymousTeacherMediaUploader"));
  assert.ok(storageRules.includes("/teacher-image-slides/"));
  assert.ok(storageRules.includes("allow create: if anonymousTeacherMediaUploader()"));
  assert.ok(storageRules.includes("resource == null"));
  assert.ok(storageRules.includes("allow update, delete: if false"));
  assert.ok(storageRules.includes("allow list: if false"));
  assert.equal(storageRules.includes("teacherImageUploader"), false);
  assert.equal(storageRules.includes("lessonHubTeacherMediaExpiresAt"), false);
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

test("one-time Image Slides unlock backend is removed while Results remains server-side", () => {
  for (const source of [functionSource, firebaseClient, main, resultRepository, imageUploader, firestoreRules]) {
    assert.equal(source.includes("teacherMediaUnlock"), false);
    assert.equal(source.includes("lessonHubTeacherMediaExpiresAt"), false);
  }
  assert.equal(functionSource.includes("MEDIA_UNLOCK_COLLECTION"), false);
  assert.equal(functionSource.includes("setCustomUserClaims"), false);
  assert.ok(functionSource.includes('defineSecret("TEACHER_RESULTS_PASSCODE")'));
  assert.ok(functionSource.includes("teacherResultSessions"));
  assert.ok(functionSource.includes("teacherLessonConfigLoad"));
  assert.ok(functionSource.includes("teacherLessonConfigSave"));
  assert.equal(mediaClient.includes("TEACHER_RESULTS_PASSCODE"), false);
  assert.ok(mediaClient.includes("TEACHER_MEDIA_MAX_BYTES = 500 * 1024 * 1024"));
  assert.ok(mediaClient.includes("TEACHER_IMAGE_MAX_BYTES = 20 * 1024 * 1024"));
});

test("Image Slides upload directly and delete replaced files only through protected cloud Save", () => {
  assert.ok(mediaClient.includes("ensureAnonymousSession"));
  assert.equal(mediaClient.includes("ensureTeacherMediaAccess"), false);
  assert.equal(mediaClient.includes("forceRefresh: true"), false);
  assert.ok(mediaClient.includes("teacher-image-slides"));
  assert.ok(mediaClient.includes("由伺服器刪除"));
  assert.ok(mediaClient.includes("resolveTeacherMediaUrl"));
  assert.equal(mediaClient.includes("downloadUrl:"), false);
  assert.ok(mediaUploader.includes('type="file"'));
  assert.equal(mediaUploader.includes("教師通行碼"), false);
  assert.ok(imageUploader.includes('type="file"'));
  assert.ok(imageUploader.includes('mediaType: "image"'));
  assert.ok(imageUploader.includes("選取後會直接上傳"));
  assert.ok(imageUploader.includes("雲端 Save Lesson 成功"));
  assert.ok(imageUploader.includes("由伺服器刪除"));
  assert.ok(imageUploader.includes("slideAssets"));
  assert.ok(imageUploader.includes("重新選取"));
  assert.equal(imageUploader.includes("解鎖"), false);
  assert.equal(imageUploader.includes("window.confirm"), false);
  assert.equal(imageUploader.includes("onTrackRemoval"), false);
  assert.ok(functionSource.includes("pendingImageDeletes"));
  assert.ok(functionSource.includes("deletePendingTeacherImages"));
  assert.ok(functionSource.includes("getStorage"));
  assert.equal(resultRepository.includes("createTeacherMediaUnlock"), false);
  assert.equal(main.includes("mediaUnlockRequested"), false);
  assert.equal(main.includes("redeemTeacherMediaUnlock"), false);
  assert.equal(uploadFlow.includes("teacher-media-unlock"), false);
  assert.ok(imageUploader.includes("teacherMediaUploadErrorMessage"));
  assert.equal(mediaUploader.includes("cause?.message ||"), false);
});
