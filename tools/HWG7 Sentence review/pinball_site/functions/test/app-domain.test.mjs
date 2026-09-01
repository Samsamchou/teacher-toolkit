import test from "node:test";
import assert from "node:assert/strict";
import {
  DomainValidationError,
  assignmentForCompletedCount,
  decideGameCompletion,
  decideProgressSave,
  decideGameStart,
  expectedPlayerForTurn,
  pairRotationId,
  questionTypeForTurn,
  taipeiDate,
  validateCompletionSummary,
  validateProgressSummary,
  validateStudentCodes,
  validateUnitId,
} from "../lib/app-domain.mjs";

const students = ["60101", "60102"];
const expectedTypes = [
  "read_aloud", "question_answer",
  "question_answer", "read_aloud",
  "read_aloud", "question_answer",
  "question_answer", "read_aloud",
  "read_aloud", "question_answer",
  "question_answer", "read_aloud",
];

test("A and B are fixed by the first and second homepage inputs in every game", () => {
  for (const completedGameCount of [0, 1, 8]) {
    const assignment = assignmentForCompletedCount(students, completedGameCount);
    assert.equal(assignment.phase, "round_alternating_fixed_start");
    assert.equal(assignment.players.A.studentCode, "60101");
    assert.equal(assignment.players.A.firstRoundQuestionType, "read_aloud");
    assert.equal(assignment.players.B.studentCode, "60102");
    assert.equal(assignment.players.B.firstRoundQuestionType, "question_answer");
    assert.equal(assignment.completedGameCountAtStart, completedGameCount);
  }
});

test("six rounds alternate question types by round and give each player three of each", () => {
  const assignment = assignmentForCompletedCount(students, 0);
  const turns = Array.from({ length: 12 }, (_, turnIndex) => expectedPlayerForTurn(assignment, turnIndex));
  assert.deepEqual(turns.map(turn => turn.questionType), expectedTypes);
  assert.deepEqual(turns.map(turn => turn.playerKey), ["A", "B", "A", "B", "A", "B", "A", "B", "A", "B", "A", "B"]);
  for (const playerKey of ["A", "B"]) {
    const playerTurns = turns.filter(turn => turn.playerKey === playerKey);
    assert.equal(playerTurns.filter(turn => turn.questionType === "read_aloud").length, 3);
    assert.equal(playerTurns.filter(turn => turn.questionType === "question_answer").length, 3);
  }
  expectedTypes.forEach((type, turnIndex) => assert.equal(questionTypeForTurn(turnIndex), type));
  assert.throws(() => questionTypeForTurn(-1), /回合編號/);
  assert.throws(() => questionTypeForTurn(12), /回合編號/);
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

test("completion increments accounting but keeps the same fixed pattern for the next game", () => {
  const rotation = { activeGameId: "game-1", completedGameCount: 0 };
  const completed = decideGameCompletion({ session: { id: "game-1", status: "active" }, rotation });
  assert.deepEqual(completed, { action: "complete", resetForNextGame: true, completedGameCount: 1 });
  const repeated = decideGameCompletion({ session: { id: "game-1", status: "completed" }, rotation: { completedGameCount: 1 } });
  assert.deepEqual(repeated, { action: "already_completed", resetForNextGame: true, completedGameCount: 1 });
  assert.equal(assignmentForCompletedCount(students, completed.completedGameCount).phase, "round_alternating_fixed_start");
});

test("completion requires exactly 12 unique turn summaries", () => {
  const good = validateCompletionSummary({
    scores: { pink: 10, blue: 12 },
    turnSummaries: Array.from({ length: 12 }, (_, turnIndex) => ({
      turnIndex,
      questionId: `HWG7-SR-${String(turnIndex + 1).padStart(3, "0")}`,
      studentCode: students[turnIndex % 2],
      questionType: questionTypeForTurn(turnIndex),
      status: "passed",
      bestScore: 80,
      attemptIds: [`attempt-id-${turnIndex}`],
    })),
  });
  assert.equal(good.turnSummaries.length, 12);
  assert.throws(() => validateCompletionSummary({ turnSummaries: good.turnSummaries.slice(0, 11) }), /完整完成 12 次作答/);
});

test("progress accepts a contiguous one-to-eleven question prefix with bounded marble scores", () => {
  const makeTurns = count => Array.from({ length: count }, (_, turnIndex) => ({
    turnIndex,
    questionId: `HWG7-SR-${String(turnIndex + 1).padStart(3, "0")}`,
    studentCode: students[turnIndex % 2],
    questionType: questionTypeForTurn(turnIndex),
    status: "passed",
    bestScore: 80,
    attemptIds: [`progress-attempt-${turnIndex}`],
  }));
  const first = validateProgressSummary({ scores: { pink: 5, blue: 0 }, turnSummaries: makeTurns(1) });
  assert.equal(first.turnSummaries.length, 1);
  const eleven = validateProgressSummary({ scores: { pink: 30, blue: 25 }, turnSummaries: makeTurns(11) });
  assert.equal(eleven.turnSummaries.length, 11);
  assert.throws(() => validateProgressSummary({ scores: { pink: 0, blue: 0 }, turnSummaries: [] }), /至少完成第 1 題/);
  assert.throws(() => validateProgressSummary({ scores: { pink: 0, blue: 0 }, turnSummaries: makeTurns(12) }), /第 12 題必須使用完整遊戲結算/);
  const gap = makeTurns(2);
  gap[1].turnIndex = 2;
  assert.throws(() => validateProgressSummary({ scores: { pink: 5, blue: 5 }, turnSummaries: gap }), /必須從第 1 題起連續/);
  assert.throws(() => validateProgressSummary({ scores: { pink: 6, blue: 0 }, turnSummaries: makeTurns(1) }), /粉紅隊彈珠總分/);
});

test("progress is monotonic, idempotent and never completes or flips a game", () => {
  const active = { id: "game-1", status: "active" };
  assert.deepEqual(decideProgressSave({ session: active, completedTurns: 1 }), {
    action: "save",
    completedTurns: 1,
    completedRounds: 0,
    recordStatus: "partial_in_progress",
  });
  assert.deepEqual(decideProgressSave({ session: active, existingResult: { completedTurns: 4 }, completedTurns: 3 }), {
    action: "already_saved",
    completedTurns: 4,
    completedRounds: 2,
    recordStatus: "partial_in_progress",
  });
  assert.deepEqual(decideProgressSave({ session: { ...active, status: "abandoned" }, existingResult: { completedTurns: 4 }, completedTurns: 5 }), {
    action: "save",
    completedTurns: 5,
    completedRounds: 2,
    recordStatus: "partial_ended",
  });
  assert.equal(decideProgressSave({ session: { ...active, status: "completed" }, existingResult: { completedTurns: 12 }, completedTurns: 11 }).action, "already_completed");
});

test("both ready units are accepted while unfinished units remain blocked", () => {
  assert.equal(validateUnitId("hwg7-sr"), "hwg7-sr");
  assert.equal(validateUnitId("hwg5-sr"), "hwg5-sr");
  assert.throws(
    () => validateUnitId("hwg8-sr"),
    (error) => error instanceof DomainValidationError && error.code === "unit_not_ready",
  );
});

test("completion summary accepts a known-format HWG5 question set", () => {
  const result = validateCompletionSummary({
    scores: { pink: 0, blue: 0 },
    turnSummaries: Array.from({ length: 12 }, (_, turnIndex) => ({
      turnIndex,
      questionId: `HWG5-SR-${String(turnIndex + 1).padStart(3, "0")}`,
      studentCode: students[turnIndex % 2],
      questionType: questionTypeForTurn(turnIndex),
      status: "passed",
      bestScore: 80,
      attemptIds: [`hwg5-attempt-${turnIndex}`],
    })),
  });
  assert.equal(result.turnSummaries.length, 12);
});

test("student codes are two distinct five-digit values", () => {
  assert.deepEqual(validateStudentCodes(students), students);
  assert.throws(() => validateStudentCodes(["60101", "60101"]), /不可使用相同代碼/);
  assert.throws(() => validateStudentCodes(["6010", "60102"]), /五碼/);
});
