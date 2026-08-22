import test from "node:test";
import assert from "node:assert/strict";
import {
  DomainValidationError,
  assignmentForCompletedCount,
  decideGameCompletion,
  decideGameStart,
  pairRotationId,
  taipeiDate,
  validateCompletionSummary,
  validateStudentCodes,
} from "../lib/app-domain.mjs";

const students = ["60101", "60102"];

test("A and B are fixed by first and second homepage input", () => {
  const first = assignmentForCompletedCount(students, 0);
  assert.equal(first.players.A.studentCode, "60101");
  assert.equal(first.players.A.questionType, "read_aloud");
  assert.equal(first.players.B.studentCode, "60102");
  assert.equal(first.players.B.questionType, "question_answer");
  const next = assignmentForCompletedCount(students, 1);
  assert.equal(next.players.A.questionType, "question_answer");
  assert.equal(next.players.B.questionType, "read_aloud");
});

test("rotation id is unordered by pair but scoped to unit and Taipei date", () => {
  const left = pairRotationId({ unitId: "hwg7-sr", date: "2026-08-22", students });
  const right = pairRotationId({ unitId: "hwg7-sr", date: "2026-08-22", students: [...students].reverse() });
  assert.equal(left, right);
  assert.equal(left.length, 64);
});

test("Taipei date does not drift at UTC day boundary", () => {
  assert.equal(taipeiDate("2026-08-21T16:30:00.000Z"), "2026-08-22");
});

test("simultaneous active game is rejected while identical request resumes", () => {
  const create = decideGameStart({ unitId: "hwg7-sr", students, requestId: "request-1", now: "2026-08-22T01:00:00Z" });
  assert.equal(create.action, "create");
  const rotation = {
    activeGameId: "game-1",
    activeRequestId: "request-1",
    activeStudents: students,
    activeAssignment: create.assignment,
    activeUntil: create.activeUntil,
    completedGameCount: 0,
  };
  const resume = decideGameStart({ rotation, unitId: "hwg7-sr", students, requestId: "request-1", now: "2026-08-22T01:01:00Z" });
  assert.equal(resume.action, "resume");
  assert.throws(
    () => decideGameStart({ rotation, unitId: "hwg7-sr", students, requestId: "request-2", now: "2026-08-22T01:01:00Z" }),
    (error) => error instanceof DomainValidationError && error.code === "game_already_active",
  );
});

test("only first completed transition flips the next-game phase", () => {
  const rotation = { activeGameId: "game-1", completedGameCount: 0 };
  const completed = decideGameCompletion({ session: { id: "game-1", status: "active" }, rotation });
  assert.deepEqual(completed, { action: "complete", flip: true, completedGameCount: 1 });
  const repeated = decideGameCompletion({ session: { id: "game-1", status: "completed" }, rotation: { completedGameCount: 1 } });
  assert.equal(repeated.flip, false);
});

test("completion requires exactly 12 unique turn summaries", () => {
  const good = validateCompletionSummary({
    scores: { pink: 10, blue: 12 },
    turnSummaries: Array.from({ length: 12 }, (_, turnIndex) => ({
      turnIndex,
      questionId: `HWG7-SR-${String(turnIndex + 1).padStart(3, "0")}`,
      studentCode: students[turnIndex % 2],
      questionType: turnIndex % 2 ? "question_answer" : "read_aloud",
      status: "passed",
      bestScore: 80,
      attemptIds: [`attempt-id-${turnIndex}`],
    })),
  });
  assert.equal(good.turnSummaries.length, 12);
  assert.throws(() => validateCompletionSummary({ turnSummaries: good.turnSummaries.slice(0, 11) }), /完整完成 12 回合/);
});

test("student codes are two distinct five-digit values", () => {
  assert.deepEqual(validateStudentCodes(students), students);
  assert.throws(() => validateStudentCodes(["60101", "60101"]), /不可使用相同代碼/);
  assert.throws(() => validateStudentCodes(["6010", "60102"]), /五碼/);
});