import assert from "node:assert/strict";
import test from "node:test";
import { isRemovedStarterLessonId, migrateLessonState, migrateResultsForStructure } from "../src/lib/lesson-migrations.js";

const unitIds = ["starter", "u01", "u02", "u03", "u04"];
const lessonCountForUnit = (unitId) => unitId === "starter" ? 3 : 5;
const seeds = ["hwg5", "hwg7"].flatMap((bookId) => unitIds.flatMap((unitId) => Array.from({ length: lessonCountForUnit(unitId) }, (_, index) => ({
  id: `${bookId}-${unitId}-l${String(index + 1).padStart(2, "0")}`,
  title: `${bookId} ${unitId} Lesson ${index + 1}`,
  bookId,
  unitId,
  unitKey: `${bookId}-${unitId}`,
  lessonNumber: index + 1,
  grade: bookId === "hwg7" ? "Grade 6" : "Grade 5",
  theme: { primary: "#123456" },
  steps: [{ type: "ebook", content: { url: "https://stable.example/catalog", displayName: "Stable" } }]
}))));

test("structure migration keeps 46 canonical lessons and maps the old U1 to Lesson 1", () => {
  const stored = [
    { id: "hwg7-u01", title: "Teacher adjusted U1", steps: [{ type: "ebook", content: { url: "https://h5.hle.com.tw/toolbar/release/index.html?key=old" } }] },
    { id: "custom-123", title: "My custom lesson", bookId: "custom", steps: [] }
  ];
  const migrated = migrateLessonState(stored, seeds);
  const canonical = migrated.filter((item) => item.id !== "custom-123");
  const u1l1 = migrated.find((item) => item.id === "hwg7-u01-l01");
  assert.equal(canonical.length, 46);
  assert.equal(migrated.length, 47);
  assert.equal(u1l1.title, "Teacher adjusted U1");
  assert.equal(u1l1.bookId, "hwg7");
  assert.equal(u1l1.unitId, "u01");
  assert.equal(u1l1.lessonNumber, 1);
  assert.equal(u1l1.steps[0].content.url, "https://stable.example/catalog");
  assert.equal(migrated.some((item) => item.id === "custom-123"), true);
});

test("result migration moves flat lesson IDs without changing anonymous student IDs", () => {
  const results = migrateResultsForStructure([{ id: "run-1", lessonId: "hwg7-u01", lessonTitle: "old", studentId: "60101" }], seeds);
  assert.equal(results[0].lessonId, "hwg7-u01-l01");
  assert.equal(results[0].lessonTitle, "hwg7 u01 Lesson 1");
  assert.equal(results[0].studentId, "60101");
});

test("structure migration deletes legacy Starter Lesson 4 and 5 settings without deleting custom lessons", () => {
  const migrated = migrateLessonState([
    { id: "hwg5-starter-l04", title: "Old Starter 4", steps: [] },
    { id: "hwg7-starter-l05", title: "Old Starter 5", steps: [] },
    { id: "custom-123", title: "My custom lesson", bookId: "custom", steps: [] }
  ], seeds);
  assert.equal(isRemovedStarterLessonId("hwg5-starter-l04"), true);
  assert.equal(isRemovedStarterLessonId("hwg7-starter-l05"), true);
  assert.equal(migrated.some((item) => item.id === "hwg5-starter-l04"), false);
  assert.equal(migrated.some((item) => item.id === "hwg7-starter-l05"), false);
  assert.equal(migrated.some((item) => item.id === "custom-123"), true);
});

test("result migration retains historical Starter Lesson 4 records after the local lesson is removed", () => {
  const results = migrateResultsForStructure([{ id: "run-starter-4", lessonId: "hwg5-starter-l04", lessonTitle: "Starter Lesson 4", studentId: "50101" }], seeds);
  assert.equal(results[0].lessonId, "hwg5-starter-l04");
  assert.equal(results[0].lessonTitle, "Starter Lesson 4");
  assert.equal(results[0].studentId, "50101");
});
