import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { normalizeText, scoreSpeechAttempt, tokenize } from "../functions/lib/scoring.mjs";

const bank = JSON.parse(
  readFileSync(new URL("../data/hwg7-sentence-review.json", import.meta.url), "utf8"),
);

const healthyMetrics = (transcript) => ({
  speechWindowMs: tokenize(transcript).length * 1000,
  mediumPauses: 0,
  longPauses: 0,
  repetitions: 0,
});

test("all 13 official questions and all 10 accepted answer variants score deterministically", () => {
  let scoredCases = 0;

  for (const question of bank.questions) {
    if (question.type === "read_aloud") {
      const transcript = question.standardReadSentence;
      const result = scoreSpeechAttempt({
        question,
        transcript,
        metrics: healthyMetrics(transcript),
      });
      assert.equal(result.scores.total, 100, question.id);
      assert.equal(result.passed, true, question.id);
      scoredCases += 1;
      continue;
    }

    for (const answer of question.acceptableAnswers) {
      const transcript = `${question.questionText} ${answer.text}`;
      const first = scoreSpeechAttempt({
        question,
        transcript,
        metrics: healthyMetrics(transcript),
      });
      const second = scoreSpeechAttempt({
        question,
        transcript,
        metrics: healthyMetrics(transcript),
      });

      assert.equal(first.scores.total, 100, `${question.id}: ${answer.text}`);
      assert.equal(first.passed, true, `${question.id}: ${answer.text}`);
      assert.equal(first.coreCorrect, true, `${question.id}: ${answer.text}`);
      assert.equal(first.matchedAnswer.normalizedText, normalizeText(answer.text));
      assert.equal(first.matchedAnswer.answerWordCount, answer.answerWordCount);
      assert.deepEqual(first, second, `${question.id}: deterministic result`);
      scoredCases += 1;
    }
  }

  assert.equal(bank.questions.length, 13);
  assert.equal(scoredCases, 17);
});
