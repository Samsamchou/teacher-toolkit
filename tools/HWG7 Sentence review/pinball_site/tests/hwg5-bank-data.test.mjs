import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

import {
  findPrivatePublicKeys,
  projectHwg5PublicBank,
} from "../scripts/lib/hwg5-bank-projection.mjs";

const bank = JSON.parse(readFileSync(new URL("../data/hwg5-sentence-review.json", import.meta.url), "utf8"));
const registry = JSON.parse(readFileSync(new URL("../data/unit-registry.json", import.meta.url), "utf8"));
const browserSource = readFileSync(new URL("../data/hwg5-sentence-review.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(browserSource, sandbox);

test("HWG5 teacher-confirmed bank has stable 15-question shape", () => {
  assert.equal(bank.questions.length, 15);
  assert.equal(bank.questions.filter(({ type }) => type === "read_aloud").length, 8);
  assert.equal(bank.questions.filter(({ type }) => type === "question_answer").length, 7);
  assert.equal(new Set(bank.questions.map(({ id }) => id)).size, 15);
  assert.deepEqual(
    bank.questions.map(({ id }) => id),
    Array.from({ length: 15 }, (_, index) => `HWG5-SR-${String(index + 1).padStart(3, "0")}`),
  );
  assert.equal(bank.game.questionsPerGame, 12);
  assert.equal(bank.game.roundsPerPlayer, 6);
  assert.equal(bank.game.selection.readAloudPerGame, 6);
  assert.equal(bank.game.selection.questionAnswerPerGame, 6);
});

test("four clock questions carry deterministic English-word canonicalization and cap metadata", () => {
  const clockIds = ["HWG5-SR-001", "HWG5-SR-002", "HWG5-SR-009", "HWG5-SR-010"];
  for (const id of clockIds) {
    const question = bank.questions.find((item) => item.id === id);
    assert.equal(question.transcriptCanonicalizer, "clock-en-v1", id);
    assert.equal(question.transcriptCanonicalization.kind, "clock_time_en", id);
    assert.equal(question.transcriptCanonicalization.version, "clock-en-v1", id);
    assert.equal(question.transcriptCanonicalization.wrongOrMissingCoreScoreCap, 59, id);
    assert.equal(question.scoringPolicy.wrongOrMissingCoreScoreCap, 59, id);
    const targetText = question.type === "read_aloud"
      ? question.standardReadSentence
      : question.acceptableAnswers.map(({ text }) => text).join(" ");
    assert.doesNotMatch(targetText, /\d/u, id);
  }
  assert.equal(bank.questions.filter(({ transcriptCanonicalizer }) => transcriptCanonicalizer).length, 4);
});

test("question-answer variants are answer-only and use complete core phrases", () => {
  const qa = bank.questions.filter(({ type }) => type === "question_answer");
  for (const question of qa) {
    assert.equal(question.scoringInput, "answer_transcript_only", question.id);
    assert.equal(question.questionSentenceAnalysis, null, question.id);
    assert.equal(question.acceptableAnswers.length, 2, question.id);
    for (const answer of question.acceptableAnswers) {
      assert.equal(answer.fullCredit, true, question.id);
      assert.equal(answer.requiredContentSlots.length, 1, question.id);
    }
  }
  assert.deepEqual(
    qa.find(({ id }) => id === "HWG5-SR-011").acceptableAnswers.map(({ text }) => text),
    ["He's running.", "He is running."],
  );
  assert.deepEqual(
    qa.find(({ id }) => id === "HWG5-SR-010").acceptableAnswers.map(({ text }) => text),
    ["It's eleven o'clock.", "It is eleven o'clock."],
  );
  assert.equal(
    qa.find(({ id }) => id === "HWG5-SR-015").answerPromptStructure,
    "It's _____ the _____.",
  );
});

test("all 15 questions include verified static TTS and teacher-confirmed production images", () => {
  for (const question of bank.questions) {
    assert.equal(question.tts.provider, "openai", question.id);
    assert.equal(question.tts.model, "gpt-4o-mini-tts", question.id);
    assert.equal(question.tts.voice, "marin", question.id);
    assert.equal(question.tts.speed, 0.8, question.id);
    assert.equal(question.tts.generationStatus, "generated_verified", question.id);
    assert.equal(question.tts.assetVerification.status, "passed", question.id);
    assert.ok(question.tts.assetVerification.bytes > 1_000, question.id);
    assert.match(question.tts.assetVerification.sha256, /^[a-f0-9]{64}$/u, question.id);
    assert.ok(question.tts.assetVerification.durationSeconds >= 0.75, question.id);
    assert.equal(
      question.tts.text,
      question.type === "read_aloud" ? question.standardReadSentence : question.questionText,
      question.id,
    );
    assert.equal(question.image.sourceUse, "reference_only_do_not_publish", question.id);
    assert.equal(question.image.generationStatus, "generated_teacher_confirmed", question.id);
  }
  assert.equal(bank.review.productionAssetsStatus, "ready");
  assert.equal(bank.review.studentPilotAllowedAfterTechnicalQa, true);
  assert.equal(bank.review.mediaVerification.status, "passed");
});

test("browser projection exposes prompts but no answers or scoring internals", () => {
  const publicQuestions = Array.from(sandbox.window.HWG5_SPEECH_QUESTIONS);
  assert.equal(publicQuestions.length, 15);
  assert.deepEqual(JSON.parse(JSON.stringify(publicQuestions)), projectHwg5PublicBank(bank));
  assert.deepEqual(findPrivatePublicKeys(publicQuestions), []);
  assert.strictEqual(sandbox.window.HWG5_SENTENCE_REVIEW_BANK, sandbox.window.HWG5_SPEECH_QUESTIONS);
  assert.equal(publicQuestions.find(({ id }) => id === "HWG5-SR-009").questionText, "What time is it?");
  assert.equal(publicQuestions.find(({ id }) => id === "HWG5-SR-009").answerPromptStructure, "It's ___ _____.");
  assert.equal("acceptableAnswers" in publicQuestions.find(({ id }) => id === "HWG5-SR-009"), false);
});

test("HWG5 is ready with no remaining readiness blockers", () => {
  const unit = registry.units.find(({ id }) => id === "hwg5-sr");
  assert.equal(unit.status, "ready");
  assert.equal(unit.hint, "");
  assert.equal(unit.questionBankVersion, "hwg5-sr-v1-answer-only");
  assert.equal(unit.rubricVersion, "a1-v3-clock-en-answer-only");
  assert.equal(unit.questionBankGlobal, "HWG5_SPEECH_QUESTIONS");
  assert.equal(unit.questionBankFile, "data/hwg5-sentence-review.json");
  assert.equal(unit.questionBankScript, "data/hwg5-sentence-review.js");
  assert.equal("readinessBlockers" in unit, false);
});
