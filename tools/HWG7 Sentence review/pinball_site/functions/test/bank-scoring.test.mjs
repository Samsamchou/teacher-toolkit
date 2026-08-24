import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { equivalentTokens, scoreSpeechAttempt } from "../lib/scoring.mjs";
import { buildQuestionBankRegistry } from "../lib/question-bank.mjs";

const bank = JSON.parse(
  await readFile(new URL("../data/question-bank.json", import.meta.url), "utf8"),
);
const registry = buildQuestionBankRegistry(bank);
const questions = registry.questions;

test("deployable bank has two versioned units, 28 unique questions, and pass threshold 80", () => {
  assert.equal(registry.units.length, 2);
  assert.equal(questions.length, 28);
  assert.equal(new Set(questions.map(({ id }) => id)).size, 28);
  assert.deepEqual(
    Object.fromEntries(registry.units.map((unit) => [unit.unitId, unit.questions.length])),
    { "hwg5-sr": 15, "hwg7-sr": 13 },
  );
  assert.ok(questions.every(({ passScore }) => passScore === 80));
  assert.ok(registry.units.every((unit) => unit.questions.every(({ rubricVersion }) => rubricVersion === unit.mode.rubricVersion)));
});

for (const question of questions) {
  if (question.type === "read_aloud") {
    test(`${question.id} exact read-aloud sentence reaches full credit`, () => {
      const result = scoreSpeechAttempt({ question, transcript: question.standardReadSentence });
      assert.equal(result.valid, true);
      assert.equal(result.passed, true);
      assert.equal(result.scores.total, 100);
    });
    continue;
  }

  for (const answer of question.acceptableAnswers) {
    test(`${question.id} accepted ${answer.answerKind} answer alone reaches full credit`, () => {
      const result = scoreSpeechAttempt({ question, transcript: answer.text });
      assert.equal(answer.fullCredit, true);
      assert.equal(result.valid, true);
      assert.equal(result.coreCorrect, true);
      assert.equal(result.passed, true);
      assert.equal(result.scores.total, 100);
      assert.deepEqual(equivalentTokens(result.matchedAnswer.text), equivalentTokens(answer.text));
      assert.deepEqual(Object.keys(result.segments), ["answer"]);
      assert.doesNotMatch(result.segments.answer, /\?$/u);
    });
  }
}

test("confirmed contraction and full-form equivalents receive full credit", () => {
  const cases = [
    ["HWG7-SR-005", "They are his caps."],
    ["HWG7-SR-004", "I'd like some chicken."],
    ["HWG7-SR-006", "It is her umbrella."],
    ["HWG7-SR-012", "No, she does not."],
  ];
  for (const [questionId, transcript] of cases) {
    const question = questions.find(item => item.id === questionId);
    const result = scoreSpeechAttempt({ question, transcript });
    assert.equal(result.scores.total, 100, `${questionId}: ${transcript}`);
    assert.equal(result.passed, true, `${questionId}: ${transcript}`);
  }
});

test("an empty transcript is invalid and therefore must not consume an attempt", () => {
  const question = questions[0];
  const result = scoreSpeechAttempt({ question, transcript: "" });
  assert.equal(result.valid, false);
  assert.equal(result.passed, false);
  assert.equal(result.scores.total, null);
});