import assert from "node:assert/strict";
import test from "node:test";
import { createSeedLessons, lessonCountForBook, lessonCountForUnit, source, standardLessonCount } from "../src/data/lesson-data.js";

test("Starter creates three lessons while Unit 1–4 each create five", () => {
  const hwg5 = source.books.find((book) => book.id === "hwg5");
  const hwg7 = source.books.find((book) => book.id === "hwg7");
  assert.equal(lessonCountForUnit(hwg5.units.find((unit) => unit.id === "starter")), 3);
  assert.equal(lessonCountForUnit(hwg7.units.find((unit) => unit.id === "starter")), 3);
  assert.equal(hwg5.units.filter((unit) => unit.id !== "starter").every((unit) => lessonCountForUnit(unit) === 5), true);
  assert.equal(lessonCountForBook(hwg5), 23);
  assert.equal(lessonCountForBook(hwg7), 23);
  assert.equal(standardLessonCount(), 46);
  assert.equal(createSeedLessons().length, 46);
});
