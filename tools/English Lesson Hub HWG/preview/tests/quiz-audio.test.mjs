import assert from "node:assert/strict";
import test from "node:test";
import {
  QUIZ_COMPLETION_DURATION_MS,
  QUIZ_CORRECT_CHIME_FREQUENCIES
} from "../src/lib/slot-audio.js";

test("Quiz completion celebration is fixed at ten seconds", () => {
  assert.equal(QUIZ_COMPLETION_DURATION_MS, 10000);
});

test("correct-answer chime uses three ascending notes", () => {
  assert.equal(QUIZ_CORRECT_CHIME_FREQUENCIES.length, 3);
  assert.deepEqual(
    [...QUIZ_CORRECT_CHIME_FREQUENCIES].sort((a, b) => a - b),
    QUIZ_CORRECT_CHIME_FREQUENCIES
  );
  assert.equal(new Set(QUIZ_CORRECT_CHIME_FREQUENCIES).size, 3);
});
