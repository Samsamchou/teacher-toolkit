import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import source from "../config/site-source.json" with { type: "json" };
import { migrateLessonState } from "../src/lib/lesson-migrations.js";

const root = resolve(import.meta.dirname, "..");
const [mainSource, mediaCss, presentationSource] = await Promise.all([
  readFile(resolve(root, "src/main.jsx"), "utf8"),
  readFile(resolve(root, "src/media-presentation.css"), "utf8"),
  readFile(resolve(root, "src/components/presentation-step.jsx"), "utf8")
]);

test("default Lesson Flow places the optional PDF presentation after video", () => {
  assert.deepEqual(source.defaultFlow.map((step) => step.type), ["warmup", "ebook", "video", "presentation", "imageSlides", "webPractice", "vocabularyQuiz"]);
  const presentation = source.defaultFlow.find((step) => step.type === "presentation");
  assert.equal(presentation.title, "簡報");
  assert.equal(presentation.content.uploadedMedia, null);
});

test("stored Lessons gain the presentation Step after video without losing existing edits", () => {
  const seed = {
    id: "hwg7-u01-l01",
    bookId: "hwg7",
    unitId: "u01",
    unitKey: "hwg7-u01",
    lessonNumber: 1,
    theme: { primary: "#123456" },
    steps: [
      { id: "warmup", type: "warmup", content: {} },
      { id: "video", type: "video", content: {} },
      { id: "presentation", type: "presentation", content: { uploadedMedia: null } },
      { id: "slides", type: "imageSlides", content: {} }
    ]
  };
  const stored = { ...seed, title: "Teacher adjusted", steps: [seed.steps[0], { ...seed.steps[1], content: { url: "https://example.test/video.mp4" } }, seed.steps[3]] };
  const migrated = migrateLessonState([stored], [seed]);
  assert.equal(migrated[0].title, "Teacher adjusted");
  assert.deepEqual(migrated[0].steps.map((step) => step.type), ["warmup", "video", "presentation", "imageSlides"]);
  assert.equal(migrated[0].steps[1].content.url, "https://example.test/video.mp4");
});

test("stored Lessons adopt an official uploaded video only when the teacher has not chosen another source", () => {
  const officialMedia = { kind: "video", path: "teacher-media/hwg7-u01-l01/video/official.mp4", name: "official.mp4", size: 20405839 };
  const seed = {
    id: "hwg7-u01-l01",
    bookId: "hwg7",
    unitId: "u01",
    unitKey: "hwg7-u01",
    lessonNumber: 1,
    theme: { primary: "#123456" },
    steps: [
      { id: "video", type: "video", content: { url: "", uploadedMedia: officialMedia } },
      { id: "presentation", type: "presentation", content: { uploadedMedia: null } }
    ]
  };
  const stored = { ...seed, steps: [{ id: "video", type: "video", content: { url: "", abRepeat: true } }, seed.steps[1]] };
  const withOfficialMedia = migrateLessonState([stored], [seed]);
  assert.deepEqual(withOfficialMedia[0].steps[0].content.uploadedMedia, officialMedia);

  const custom = { ...stored, steps: [{ id: "video", type: "video", content: { url: "https://example.test/custom.mp4" } }, seed.steps[1]] };
  const withCustomSource = migrateLessonState([custom], [seed]);
  assert.equal(withCustomSource[0].steps[0].content.uploadedMedia, undefined);

  const legacy = { ...stored, steps: [{ id: "video", type: "video", content: { uploadedMedia: { ...officialMedia, downloadUrl: "https://example.test/token" } } }, seed.steps[1]] };
  const withoutToken = migrateLessonState([legacy], [seed]);
  assert.equal(withoutToken[0].steps[0].content.uploadedMedia.downloadUrl, undefined);
});

test("Studio and Lesson Flow wire uploaded MP4/PDF media, first-page PDF display, and the requested labels", () => {
  for (const marker of ["TeacherMediaUpload", "mediaType=\"video\"", "mediaType=\"presentation\"", "PresentationStep", "Look and choose", "Listen and choose"]) {
    assert.ok(mainSource.includes(marker), `missing ${marker}`);
  }
  assert.equal(mainSource.includes("按下 SPIN 後，拉霸音效會從加速轉動"), false);
  assert.match(mediaCss, /\.slide-frame img \{ width: auto; height: auto; max-width: 100%; max-height: 100%; object-fit: contain;/);
  assert.match(mediaCss, /\.teacher-quiz-gate \.quiz-corner-mascot \{ top: 210px; width: clamp\(103px, 10.8vw, 151px\); \}/);
  assert.ok(presentationSource.includes("直接選擇檔案上傳"));
  assert.equal(presentationSource.includes("輸入教師通行碼後上傳"), false);
  assert.ok(mainSource.includes("resolveTeacherMediaUrl"));
  assert.ok(presentationSource.includes("resolveTeacherMediaUrl"));
});
