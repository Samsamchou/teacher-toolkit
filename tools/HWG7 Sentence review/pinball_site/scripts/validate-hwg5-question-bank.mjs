#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import vm from "node:vm";
import {
  findPrivatePublicKeys,
  projectHwg5PublicBank,
} from "./lib/hwg5-bank-projection.mjs";
import { verifyHwg5Media } from "./verify-hwg5-media.mjs";

const errors = [];
const check = (condition, message) => {
  if (!condition) errors.push(message);
};

const bank = JSON.parse(await readFile(new URL("../data/hwg5-sentence-review.json", import.meta.url), "utf8"));
const registry = JSON.parse(await readFile(new URL("../data/unit-registry.json", import.meta.url), "utf8"));
const browserSource = await readFile(new URL("../data/hwg5-sentence-review.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(browserSource, sandbox, { filename: "hwg5-sentence-review.js" });
const publicQuestions = Array.from(sandbox.window.HWG5_SPEECH_QUESTIONS ?? []);
const expectedPublic = projectHwg5PublicBank(bank);
const mediaVerification = await verifyHwg5Media();

check(bank.schemaVersion === "1.0.0", "schemaVersion must be 1.0.0.");
check(bank.mode?.unitId === "hwg5-sr", "mode.unitId must be hwg5-sr.");
check(bank.mode?.questionBankVersion === "hwg5-sr-v1-answer-only", "HWG5 question bank version is incorrect.");
check(bank.mode?.rubricVersion === "a1-v3-clock-en-answer-only", "HWG5 rubric version is incorrect.");
check(bank.review?.status === "teacher_confirmed", "HWG5 content must be teacher_confirmed.");
check(bank.review?.productionAssetsStatus === "ready", "HWG5 production assets must be ready.");
check(bank.review?.studentPilotAllowedAfterTechnicalQa === true, "HWG5 student pilot must be allowed after technical QA.");
check(bank.review?.mediaVerification?.status === "passed", "HWG5 media verification evidence must be passed.");
check(Array.isArray(bank.questions) && bank.questions.length === 15, "HWG5 bank must contain exactly 15 questions.");

const ids = bank.questions.map(({ id }) => id);
check(new Set(ids).size === 15, "HWG5 question IDs must be unique.");
check(bank.questions.filter(({ type }) => type === "read_aloud").length === 8, "HWG5 must contain 8 read_aloud questions.");
check(bank.questions.filter(({ type }) => type === "question_answer").length === 7, "HWG5 must contain 7 question_answer questions.");
check(bank.game?.questionsPerGame === 12 && bank.game?.roundsPerPlayer === 6, "Game must contain 12 questions and 6 rounds per player.");
check(bank.game?.selection?.readAloudPerGame === 6 && bank.game?.selection?.questionAnswerPerGame === 6, "Each game must select 6 questions of each type.");
check(bank.game?.selection?.unusedQuestionsPerGame === 3, "A 15-question bank must leave 3 questions unused per game.");
check(JSON.stringify(bank.rubric?.totalWeights) === JSON.stringify({ accuracy: 0.5, completeness: 0.3, fluency: 0.2 }), "Total weights must be 50/30/20.");
check(bank.rubric?.questionAnswer?.scoringInput === "answer_transcript_only", "Question-answer scoring must use answer transcript only.");

const clockIds = new Set(["HWG5-SR-001", "HWG5-SR-002", "HWG5-SR-009", "HWG5-SR-010"]);
for (let index = 0; index < bank.questions.length; index += 1) {
  const question = bank.questions[index];
  const label = question.id ?? `question ${index + 1}`;
  check(question.displayOrder === index + 1, `${label}: displayOrder is incorrect.`);
  check(question.id === `HWG5-SR-${String(index + 1).padStart(3, "0")}`, `${label}: stable ID is incorrect.`);
  check(question.unitId === "hwg5-sr" && question.questionBankVersion === "hwg5-sr-v1-answer-only", `${label}: unit/version metadata is incomplete.`);
  check(question.rubricVersion === "a1-v3-clock-en-answer-only", `${label}: rubricVersion is incorrect.`);
  check(question.passScore === 80 && question.maxAttempts === 3, `${label}: pass/attempt policy is incorrect.`);
  check(question.image?.sourceUse === "reference_only_do_not_publish", `${label}: source image publication guard is missing.`);
  check(question.image?.generationStatus === "generated_teacher_confirmed", `${label}: production image must be teacher-confirmed.`);
  check(question.tts?.provider === "openai" && question.tts?.model === "gpt-4o-mini-tts" && question.tts?.voice === "marin" && question.tts?.speed === 0.8, `${label}: static TTS metadata is incorrect.`);
  check(question.tts?.generationStatus === "generated_verified", `${label}: static TTS must be generated and verified.`);
  check(question.tts?.assetVerification?.status === "passed", `${label}: TTS asset verification evidence is missing.`);
  check(question.tts?.text === (question.type === "read_aloud" ? question.standardReadSentence : question.questionText), `${label}: TTS text must be the read target or displayed question.`);

  if (question.type === "read_aloud") {
    check(question.questionText === "" && question.acceptableAnswers?.length === 0, `${label}: read_aloud shape is invalid.`);
  } else {
    check(question.scoringInput === "answer_transcript_only", `${label}: question_answer must explicitly score answer only.`);
    check(question.questionSentenceAnalysis === null, `${label}: question analysis must be excluded.`);
    check(Array.isArray(question.acceptableAnswers) && question.acceptableAnswers.length === 2, `${label}: both contracted and expanded answers are required.`);
    for (const answer of question.acceptableAnswers ?? []) {
      check(answer.fullCredit === true, `${label}: each listed answer must receive full credit.`);
      check(Array.isArray(answer.requiredContentSlots) && answer.requiredContentSlots.length === 1, `${label}: accepted answers must use one complete core phrase.`);
      check(Array.isArray(answer.answerStructureSlots) && answer.answerStructureSlots.length > 0, `${label}: answer structure slots are missing.`);
    }
  }

  if (clockIds.has(question.id)) {
    check(question.transcriptCanonicalizer === "clock-en-v1", `${label}: clock canonicalizer is missing.`);
    check(question.transcriptCanonicalization?.kind === "clock_time_en" && question.transcriptCanonicalization?.version === "clock-en-v1", `${label}: clock canonicalization metadata is incomplete.`);
    check(question.transcriptCanonicalization?.wrongOrMissingCoreScoreCap === 59, `${label}: clock core score cap must be 59.`);
    check(question.scoringPolicy?.wrongOrMissingCoreScoreCap === 59, `${label}: question score cap must be 59.`);
  } else {
    check(question.transcriptCanonicalizer === undefined, `${label}: clock canonicalizer must be question-scoped.`);
  }
}

const answerTexts = Object.fromEntries(bank.questions
  .filter(({ type }) => type === "question_answer")
  .map(({ id, acceptableAnswers }) => [id, acceptableAnswers.map(({ text }) => text)]));
const expectedAnswers = {
  "HWG5-SR-009": ["It's five forty-five.", "It is five forty-five."],
  "HWG5-SR-010": ["It's eleven o'clock.", "It is eleven o'clock."],
  "HWG5-SR-011": ["He's running.", "He is running."],
  "HWG5-SR-012": ["I'm drinking.", "I am drinking."],
  "HWG5-SR-013": ["I'm in the dining room.", "I am in the dining room."],
  "HWG5-SR-014": ["He's in the living room.", "He is in the living room."],
  "HWG5-SR-015": ["It's under the table.", "It is under the table."],
};
check(JSON.stringify(answerTexts) === JSON.stringify(expectedAnswers), "Teacher-confirmed answer set does not match.");

const publicLeaks = findPrivatePublicKeys(publicQuestions);
check(publicLeaks.length === 0, `Public HWG5 data leaks private fields: ${publicLeaks.join(", ")}`);
check(JSON.stringify(publicQuestions) === JSON.stringify(expectedPublic), "HWG5 JSON and public browser projection are not synchronized.");
check(sandbox.window.HWG5_SENTENCE_REVIEW_BANK === sandbox.window.HWG5_SPEECH_QUESTIONS, "Compatibility global must reference the same public array.");

const unit = registry.units?.find(({ id }) => id === "hwg5-sr");
check(unit?.status === "ready" && unit?.hint === "", "HWG5 unit must be ready.");
check(unit?.questionBankVersion === "hwg5-sr-v1-answer-only", "HWG5 registry bank version is incorrect.");
check(unit?.rubricVersion === "a1-v3-clock-en-answer-only", "HWG5 registry rubric version is incorrect.");
check(unit?.questionBankGlobal === "HWG5_SPEECH_QUESTIONS", "HWG5 registry public global is incorrect.");
check(unit?.questionBankFile === "data/hwg5-sentence-review.json", "HWG5 registry private bank file is incorrect.");
check(unit?.questionBankScript === "data/hwg5-sentence-review.js", "HWG5 registry public bank script is incorrect.");
check(!("readinessBlockers" in (unit ?? {})), "Ready HWG5 unit must not retain readiness blockers.");

const summary = {
  ok: errors.length === 0,
  unitId: bank.mode?.unitId,
  questionBankVersion: bank.mode?.questionBankVersion,
  rubricVersion: bank.mode?.rubricVersion,
  questionCount: bank.questions?.length,
  typeCounts: {
    read_aloud: bank.questions?.filter(({ type }) => type === "read_aloud").length,
    question_answer: bank.questions?.filter(({ type }) => type === "question_answer").length,
  },
  acceptedAnswerCount: Object.values(answerTexts).flat().length,
  clockQuestionCount: bank.questions?.filter(({ id }) => clockIds.has(id)).length,
  publicQuestionCount: publicQuestions.length,
  publicPrivateFieldLeakCount: publicLeaks.length,
  registryStatus: unit?.status,
  errors,
  mediaVerification: {
    imageCount: mediaVerification.imageCount,
    ttsCount: mediaVerification.ttsCount,
    ttsBytes: mediaVerification.ttsBytes,
    ttsDurationSeconds: mediaVerification.ttsDurationSeconds,
  },
};
console.log(JSON.stringify(summary, null, 2));
if (errors.length) process.exit(1);
