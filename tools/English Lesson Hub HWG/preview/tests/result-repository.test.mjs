import assert from "node:assert/strict";
import test from "node:test";
import { resultsToCsv, serializePracticeResult } from "../src/lib/result-repository.js";

test("Firestore serializer stores anonymous Student ID but never a supplied name", () => {
  const record = serializePracticeResult({
    id: "session-1", studentId: "60101", name: "Should not persist", quizId: "quiz", lessonId: "hwg7-u01-l01", lessonTitle: "Lesson 1", bookId: "hwg7", unitId: "u01", lessonNumber: 1,
    startedAt: "2026-08-17T00:00:00.000Z", completedAt: "2026-08-17T00:05:00.000Z", practiceScore: 12, practiceMaxScore: 18, finalCorrectCount: 18, accuracy: 67, slotScore: 200,
    typeA: {}, typeB: {}, rewardSessions: [], answers: {}
  }, "anonymous-uid");
  assert.equal(record.studentId, "60101");
  assert.equal(Object.hasOwn(record, "name"), false);
  assert.equal(record.ownerUid, "anonymous-uid");
  assert.equal(record.sessionId, "session-1");
});

test("CSV export includes only the defined teacher report fields", () => {
  const csv = resultsToCsv([{ studentId: "60101", bookId: "hwg7", unitId: "u01", lessonNumber: 1, quizId: "quiz", practiceScore: 12, practiceMaxScore: 18, accuracy: 67, finalCorrectCount: 18, slotScore: 200, completedAt: "2026-08-17", sessionId: "s1", name: "No name" }]);
  assert.match(csv, /Student ID/);
  assert.match(csv, /60101/);
  assert.doesNotMatch(csv, /No name/);
});
