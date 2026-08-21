import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { scoreSpeechAttempt } from "../lib/scoring.mjs";

const bank = JSON.parse(
  await readFile(new URL("../data/question-bank.json", import.meta.url), "utf8"),
);

test("deployable bank has 13 unique questions and all pass thresholds are 80", () => {
  assert.equal(bank.questions.length, 13);
  assert.equal(new Set(bank.questions.map(({ id }) => id)).size, 13);
  assert.ok(bank.questions.every(({ passScore }) => passScore === 80));
});

for (const question of bank.questions) {
  if (question.type === "read_aloud") {
    test(`${question.id} exact read-aloud sentence reaches full credit`, () => {
      const result = scoreSpeechAttempt({
        question,
        transcript: question.standardReadSentence,
      });
      assert.equal(result.valid, true);
      assert.equal(result.passed, true);
      assert.equal(result.scores.total, 100);
    });
    continue;
  }

  for (const answer of question.acceptableAnswers) {
    test(`${question.id} accepted ${answer.answerKind} answer reaches full credit`, () => {
      const result = scoreSpeechAttempt({
        question,
        transcript: `${question.questionText} ${answer.text}`,
      });
      assert.equal(answer.fullCredit, true);
      assert.equal(result.valid, true);
      assert.equal(result.coreCorrect, true);
      assert.equal(result.passed, true);
      assert.equal(result.scores.total, 100);
      assert.equal(result.matchedAnswer.text, answer.text);
    });
  }
}

test("an empty transcript is invalid and therefore must not consume an attempt", () => {
  const question = bank.questions[0];
  const result = scoreSpeechAttempt({ question, transcript: "" });
  assert.equal(result.valid, false);
  assert.equal(result.passed, false);
  assert.equal(result.scores.total, null);
});
