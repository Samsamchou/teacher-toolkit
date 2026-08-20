const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildPendingImageDeletes,
  collectTeacherImagePaths,
  deletePendingTeacherImages,
  validTeacherImagePath
} = require("../src/lesson-image-cleanup.cjs");

function lessonWithAssets(...assets) {
  return [{
    id: "hwg7-u01-l01",
    steps: [{
      id: "slides",
      type: "imageSlides",
      content: { slideAssets: assets }
    }]
  }];
}

test("collects only managed Image Slides paths", () => {
  const valid = "teacher-image-slides/hwg7-u01-l01/1000-old.png";
  const lessons = lessonWithAssets(
    { kind: "image", path: valid },
    { kind: "image", path: valid },
    { kind: "image", path: "teacher-media/hwg7-u01-l01/video/clip.mp4" },
    { kind: "legacy", source: "https://example.test/picture.png" },
    { kind: "image", path: "../../outside.png" }
  );
  assert.deepEqual([...collectTeacherImagePaths(lessons)], [valid]);
  assert.equal(validTeacherImagePath(valid), valid);
  assert.equal(validTeacherImagePath("teacher-media/hwg7-u01-l01/video/clip.mp4"), "");
});

test("remove and replace queue only unreferenced old cloud images", () => {
  const retained = "teacher-image-slides/hwg7-u01-l01/1000-retained.png";
  const removed = "teacher-image-slides/hwg7-u01-l01/1001-removed.png";
  const replacement = "teacher-image-slides/hwg7-u01-l01/1002-replacement.png";
  const previous = lessonWithAssets(
    { kind: "image", path: retained },
    { kind: "image", path: removed }
  );
  const next = lessonWithAssets(
    { kind: "image", path: retained },
    { kind: "image", path: replacement }
  );
  assert.deepEqual(buildPendingImageDeletes({ previousLessons: previous, nextLessons: next }), [removed]);
});

test("existing failed deletions retry but a reintroduced image leaves the queue", () => {
  const retry = "teacher-image-slides/hwg7-u01-l01/1003-retry.png";
  const restored = "teacher-image-slides/hwg7-u01-l01/1004-restored.png";
  const pending = buildPendingImageDeletes({
    previousLessons: [],
    nextLessons: lessonWithAssets({ kind: "image", path: restored }),
    existingPending: [retry, restored, "../../invalid.png"]
  });
  assert.deepEqual(pending, [retry]);
});

test("cloud deletion treats missing files as complete and retains transient failures", async () => {
  const deleted = "teacher-image-slides/hwg7-u01-l01/1005-deleted.png";
  const missing = "teacher-image-slides/hwg7-u01-l01/1006-missing.png";
  const failed = "teacher-image-slides/hwg7-u01-l01/1007-failed.png";
  const outcome = await deletePendingTeacherImages([deleted, missing, failed], async (path) => {
    if (path === missing) throw { code: 404 };
    if (path === failed) throw { code: 503 };
  });
  assert.deepEqual(outcome.deletedPaths, [deleted, missing]);
  assert.deepEqual(outcome.failedPaths, [failed]);
});
