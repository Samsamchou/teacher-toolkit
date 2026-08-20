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
  assert.ok(functionSource.includes("requestedVersion !== current.version"));
  assert.ok(functionSource.includes("requireTeacherResultsSession(request)"));
  assert.match(ruleSource, /match \/teacherLessonConfigs\/\{configId\} \{\s*allow read, write: if false;/);
});

test("Image Slides keep every edge visible in normal and fullscreen projector layouts", () => {
  assert.match(mainSource, /function SlideDeck\(/);
  assert.ok(mainSource.includes("TeacherImageSlidesUpload"));
  assert.ok(mainSource.includes("slideAssets"));
  assert.ok(mainSource.includes("resolveTeacherMediaUrl"));
  assert.ok(mainSource.includes("fitImageInsideFrame"));
  assert.ok(mainSource.includes("ResizeObserver"));
  assert.ok(mainSource.includes('document.addEventListener("fullscreenchange", updateFit)'));
  assert.match(mainSource, /<img[\s\S]*src=\{current\.src\}[\s\S]*style=\{imageStyle\}/);
  assert.equal(mainSource.includes("object-fit: cover"), false);
});

test("cloud Save Lesson schedules protected deletion of removed or replaced Image Slides", () => {
  assert.ok(functionSource.includes("buildPendingImageDeletes"));
  assert.ok(functionSource.includes("deletePendingTeacherImages"));
  assert.ok(functionSource.includes("pendingImageDeletes"));
  assert.ok(functionSource.includes("getStorage"));
  assert.ok(functionSource.includes("imageCleanup"));
});
