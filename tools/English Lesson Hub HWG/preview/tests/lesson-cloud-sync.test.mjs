import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const [mainSource, clientSource, functionSource, ruleSource] = await Promise.all([
  readFile(resolve(root, "src/main.jsx"), "utf8"),
  readFile(resolve(root, "src/lib/firebase-client.js"), "utf8"),
  readFile(resolve(root, "functions/index.cjs"), "utf8"),
  readFile(resolve(root, "firestore.rules"), "utf8")
]);

test("Teacher Studio sync requires the existing passcode session and stores a versioned cloud configuration", () => {
  for (const marker of ["unlockCloudLessons", "importCurrentLessons", "loadTeacherLessonConfig", "saveTeacherLessonConfig", "expectedVersion", "載入雲端最新版", "匯入目前 Lesson 至雲端"]) {
    assert.ok(mainSource.includes(marker), `missing ${marker}`);
  }
  assert.ok(clientSource.includes("teacherLessonConfigLoad"));
  assert.ok(clientSource.includes("teacherLessonConfigSave"));
  assert.ok(functionSource.includes("LESSON_CONFIG_COLLECTION"));
  assert.ok(functionSource.includes("teacherLessonConfigs"));
  assert.ok(functionSource.includes("requestedVersion !== currentVersion"));
  assert.ok(functionSource.includes("requireTeacherResultsSession(request)"));
  assert.match(ruleSource, /match \/teacherLessonConfigs\/\{configId\} \{\s*allow read, write: if false;/);
});

test("Image Slides keep native image size while fitting inside a non-clipping projector frame", () => {
  assert.match(mainSource, /function SlideDeck\(/);
  assert.ok(mainSource.includes("TeacherImageSlidesUpload"));
  assert.ok(mainSource.includes("slideAssets"));
  assert.ok(mainSource.includes("resolveTeacherMediaUrl"));
  assert.match(mainSource, /<img src=\{current\.src\}/);
  assert.equal(mainSource.includes("object-fit: cover"), false);
});
