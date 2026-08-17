import assert from "node:assert/strict";
import test from "node:test";
import {
  isLegacyEbookUrl,
  migrateLegacyEbookUrls,
  normalizeLegacyLessonId
} from "../src/lib/lesson-migrations.js";

const stableUrl = "https://edisc3.hle.com.tw/edisc_v3/ebook_v2023.html#grade=7";

function lesson(id, url, displayName = "Saved e-book") {
  return {
    id,
    steps: [{ id: "ebook-2", type: "ebook", title: "Saved title", content: { displayName, url, teacherOnly: true, allowFullscreen: true } }]
  };
}

const seedLessons = [lesson("hwg7-u01-l01", stableUrl, "Stable catalog")];

test("recognizes only the legacy one-time Hanlin toolbar URL", () => {
  assert.equal(isLegacyEbookUrl("https://h5.hle.com.tw/toolbar/release/index.html?key=old-key"), true);
  assert.equal(isLegacyEbookUrl(stableUrl), false);
  assert.equal(isLegacyEbookUrl("https://example.com/?key=old-key"), false);
});

test("maps the previous flat Unit lesson to Lesson 1", () => {
  assert.equal(normalizeLegacyLessonId("hwg7-u01"), "hwg7-u01-l01");
  assert.equal(normalizeLegacyLessonId("hwg5-u04"), "hwg5-u04-l01");
  assert.equal(normalizeLegacyLessonId("custom-lesson"), "custom-lesson");
});

test("migrates the saved HWG7 U1 one-time URL to the canonical catalog", () => {
  const storedLessons = [lesson("hwg7-u01", "https://h5.hle.com.tw/toolbar/release/index.html?key=old-key")];
  const migrated = migrateLegacyEbookUrls(storedLessons, seedLessons);
  assert.equal(migrated[0].steps[0].content.url, stableUrl);
  assert.equal(migrated[0].steps[0].content.displayName, "Stable catalog");
  assert.equal(migrated[0].steps[0].title, "Saved title");
  assert.equal(storedLessons[0].steps[0].content.url.includes("old-key"), true);
});

test("preserves custom and unrelated lesson URLs", () => {
  const customLesson = lesson("hwg7-u01", "https://teacher.example/ebook");
  const otherLesson = lesson("hwg7-u02", "https://h5.hle.com.tw/toolbar/release/index.html?key=other-unit");
  const migrated = migrateLegacyEbookUrls([customLesson, otherLesson], seedLessons);
  assert.equal(migrated[0].steps[0].content.url, "https://teacher.example/ebook");
  assert.equal(migrated[1].steps[0].content.url.includes("other-unit"), true);
});