import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const [firebaseJson, storageRules, functionSource, mediaClient, mediaUploader, firebaseClient] = await Promise.all([
  readFile(resolve(root, "firebase.json"), "utf8").then(JSON.parse),
  readFile(resolve(root, "storage.rules"), "utf8"),
  readFile(resolve(root, "functions/index.cjs"), "utf8"),
  readFile(resolve(root, "src/lib/teacher-media-client.js"), "utf8"),
  readFile(resolve(root, "src/components/teacher-media-upload.jsx"), "utf8"),
  readFile(resolve(root, "src/lib/firebase-client.js"), "utf8")
]);

test("teacher media Storage accepts direct anonymous uploads but retains strict paths and file limits", () => {
  assert.equal(firebaseJson.storage.rules, "storage.rules");
  assert.ok(storageRules.includes("anonymousTeacherMediaUploader"));
  assert.equal(storageRules.includes("teacherMediaAccess"), false);
  assert.ok(storageRules.includes("allow list: if false"));
  assert.ok(storageRules.includes("request.resource.size <= 524288000"));
  assert.ok(storageRules.includes("request.resource.contentType == 'video/mp4'"));
  assert.ok(storageRules.includes("request.resource.contentType == 'application/pdf'"));
  assert.ok(storageRules.includes("lessonId.matches('^[a-z0-9-]{3,96}$')"));
  assert.ok(storageRules.includes("fileName.matches('^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$')"));
});

test("the Results passcode stays server-side and no longer creates media grants", () => {
  assert.equal(functionSource.includes("teacherMediaAccess"), false);
  assert.equal(functionSource.includes("MEDIA_ACCESS_COLLECTION"), false);
  assert.ok(functionSource.includes('return { sessionToken: await createTeacherResultsSession(anonymousUid) }'));
  assert.ok(functionSource.includes('defineSecret("TEACHER_RESULTS_PASSCODE")'));
  assert.equal(mediaClient.includes("TEACHER_RESULTS_PASSCODE"), false);
  assert.ok(mediaClient.includes("TEACHER_MEDIA_MAX_BYTES = 500 * 1024 * 1024"));
});

test("media file selection is direct, while Results remains its own passcode session", () => {
  assert.ok(mediaClient.includes("ensureAnonymousSession"));
  assert.equal(mediaClient.includes("teacherSession"), false);
  assert.ok(mediaClient.includes("resolveTeacherMediaUrl"));
  assert.equal(mediaClient.includes("downloadUrl:"), false);
  assert.ok(mediaUploader.includes('type="file"'));
  assert.equal(mediaUploader.includes("教師通行碼"), false);
  assert.equal(mediaUploader.includes("teacher-media-grant-error"), false);
  assert.equal(mediaUploader.includes("unlockTeacherSession"), false);
  assert.equal(firebaseClient.includes("requireMediaAccess"), false);
  assert.ok(firebaseClient.includes("openTeacherResultsSession(passcode, { replaceExisting = false } = {})"));
  assert.ok(mediaUploader.includes("teacherMediaUploadErrorMessage"));
  assert.equal(mediaUploader.includes("cause?.message ||"), false);
});
