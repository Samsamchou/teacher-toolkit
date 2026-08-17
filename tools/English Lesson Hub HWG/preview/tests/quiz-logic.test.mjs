import assert from "node:assert/strict";
import test from "node:test";
import {
  checkpointForProgress,
  halfCheckpoint,
  scoreSpin,
  shuffleOptions,
  summarizeResponses,
  validateStudentId
} from "../src/lib/quiz-logic.js";

test("Student ID follows grade-class-seat policy", () => {
  assert.equal(validateStudentId("50101"), true);
  assert.equal(validateStudentId("69930"), true);
  assert.equal(validateStudentId("50100"), false);
  assert.equal(validateStudentId("50131"), false);
  assert.equal(validateStudentId("20101"), false);
});

test("shuffle makes a new option list without losing choices", () => {
  const original = ["A", "B", "C", "D"];
  const shuffled = shuffleOptions(original, () => 0);
  assert.deepEqual(original, ["A", "B", "C", "D"]);
  assert.deepEqual([...shuffled].sort(), [...original].sort());
});

test("reward checkpoints use ceiling at 50 percent", () => {
  assert.equal(halfCheckpoint(10), 5);
  assert.equal(halfCheckpoint(9), 5);
  assert.equal(checkpointForProgress(5, 10), 0.5);
  assert.equal(checkpointForProgress(10, 10), 1);
  assert.equal(checkpointForProgress(4, 10), null);
});

test("slot scoring separates three-of-a-kind, pair, and all-different", () => {
  assert.equal(scoreSpin(["🍎", "🍎", "🍎"]), 100);
  assert.equal(scoreSpin(["🍎", "🍎", "🌟"]), 50);
  assert.equal(scoreSpin(["🍎", "🌟", "💎"]), 10);
});

test("practice score uses first answer while final correctness remains visible", () => {
  const sets = [
    {
      id: "type-a",
      questions: [
        { id: "q1", correctAnswer: "A" },
        { id: "q2", correctAnswer: "B" }
      ]
    }
  ];
  const summary = summarizeResponses(sets, {
    q1: { firstAttemptCorrect: true, finalAnswer: "A" },
    q2: { firstAttemptCorrect: false, finalAnswer: "B" }
  });
  assert.equal(summary.practiceScore, 1);
  assert.equal(summary.finalCorrectCount, 2);
  assert.equal(summary.perType["type-a"].firstAttemptCorrectCount, 1);
});
