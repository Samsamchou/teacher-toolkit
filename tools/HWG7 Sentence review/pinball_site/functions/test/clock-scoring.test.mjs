import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  CLOCK_TRANSCRIPT_CANONICALIZER,
  canonicalizeTranscriptForQuestion,
  scoreSpeechAttempt,
} from "../lib/scoring.mjs";
import { buildQuestionBankRegistry } from "../lib/question-bank.mjs";
const deployedBank = JSON.parse(
  await readFile(new URL("../data/question-bank.json", import.meta.url), "utf8"),
);
const deployedRegistry = buildQuestionBankRegistry(deployedBank);
const hwg5Questions = new Map(
  deployedRegistry.unitMap.get("hwg5-sr").questions.map((question) => [question.id, question]),
);


function readClock(id, sentence) {
  return {
    id,
    type: "read_aloud",
    standardReadSentence: sentence,
    transcriptCanonicalizer: CLOCK_TRANSCRIPT_CANONICALIZER,
    passScore: 80,
    rubricVersion: "a1-v3-clock-en-answer-only",
  };
}

function answerClock(id, answer) {
  const answerTokens = answer.toLowerCase().replace(/[.’']/gu, " ").split(/\s+/u).filter(Boolean);
  return {
    id,
    type: "question_answer",
    questionText: "What time is it?",
    transcriptCanonicalizer: CLOCK_TRANSCRIPT_CANONICALIZER,
    passScore: 80,
    rubricVersion: "a1-v3-clock-en-answer-only",
    acceptableAnswers: [
      {
        text: answer,
        fullCredit: true,
        answerKind: "contracted_full",
        requiredContentSlots: answer.includes("o'clock")
          ? ["eleven", "o'clock"]
          : ["five", "forty-five"],
        answerStructureSlots: ["It's"],
        answerWordCount: answerTokens.length,
      },
    ],
  };
}

const fiveFiftyFive = readClock("HWG5-SR-001", "It’s five fifty-five.");
const threeFifteen = readClock("HWG5-SR-002", "It’s three fifteen.");
const fiveFortyFive = answerClock("HWG5-SR-009", "It’s five forty-five.");
const elevenOClock = answerClock("HWG5-SR-010", "It’s eleven o'clock.");

test("clock-en-v1 converts numeric punctuation, answer-position spaces, and unhyphenated words", () => {
  for (const transcript of [
    "It's 5:55.",
    "It's 5.55.",
    "It's 5 55.",
    "It's five fifty five.",
    "It's five fifty-five.",
  ]) {
    const result = scoreSpeechAttempt({ question: fiveFiftyFive, transcript });
    assert.equal(result.valid, true, transcript);
    assert.equal(result.coreCorrect, true, transcript);
    assert.equal(result.scores.total, 100, transcript);
    assert.equal(result.canonicalTranscript, "it's five fifty-five", transcript);
    assert.equal(result.displayTranscript, "it's five fifty-five", transcript);
    assert.equal(result.rawTranscript, transcript, transcript);
  }

  const quarterPast = scoreSpeechAttempt({ question: threeFifteen, transcript: "It's 3:15." });
  assert.equal(quarterPast.scores.total, 100);
  assert.equal(quarterPast.displayTranscript, "it's three fifteen");
});

test("clock-en-v1 canonicalizes question-answer numeric time without scoring the question prompt", () => {
  for (const transcript of ["It's 5:45.", "It is 5.45.", "It's 5 45.", "It's five forty five."]) {
    const result = scoreSpeechAttempt({ question: fiveFortyFive, transcript });
    assert.equal(result.valid, true, transcript);
    assert.equal(result.coreCorrect, true, transcript);
    assert.equal(result.scores.total, 100, transcript);
    assert.equal(result.displayTranscript, transcript.startsWith("It is") ? "it is five forty-five" : "it's five forty-five");
    assert.deepEqual(Object.keys(result.segments), ["answer"]);
  }
});

test("o'clock spelling variants and 11:00 share one canonical form", () => {
  for (const transcript of [
    "It's eleven o’clock.",
    "It's eleven o'clock.",
    "It's eleven o clock.",
    "It's eleven oclock.",
    "It is eleven o'clock.",
    "It's 11:00.",
  ]) {
    const result = scoreSpeechAttempt({ question: elevenOClock, transcript });
    assert.equal(result.valid, true, transcript);
    assert.equal(result.coreCorrect, true, transcript);
    assert.equal(result.scores.total, 100, transcript);
    const expectedDisplay = transcript.startsWith("It is")
      ? "it is eleven o'clock"
      : "it's eleven o'clock";
    assert.equal(result.displayTranscript, expectedDisplay, transcript);
  }
});

test("bare eleven or 11 never invents o'clock and is capped at 59", () => {
  for (const transcript of ["It's eleven.", "It's 11."]) {
    const state = canonicalizeTranscriptForQuestion(elevenOClock, transcript);
    assert.equal(state.clockValue, null, transcript);
    assert.doesNotMatch(state.canonicalTranscript, /o'clock/u, transcript);

    const result = scoreSpeechAttempt({ question: elevenOClock, transcript });
    assert.equal(result.valid, true, transcript);
    assert.equal(result.coreCorrect, false, transcript);
    assert.ok(result.scores.total <= 59, transcript);
    assert.equal(result.passed, false, transcript);
  }
});

test("wrong clock time is canonicalized from the transcript itself and capped at 59", () => {
  const readResult = scoreSpeechAttempt({ question: fiveFiftyFive, transcript: "It's 5:45." });
  assert.equal(readResult.canonicalTranscript, "it's five forty-five");
  assert.equal(readResult.coreCorrect, false);
  assert.ok(readResult.scores.total <= 59);
  assert.equal(readResult.passed, false);

  const answerResult = scoreSpeechAttempt({ question: fiveFortyFive, transcript: "It's 5:55." });
  assert.equal(answerResult.canonicalTranscript, "it's five fifty-five");
  assert.equal(answerResult.coreCorrect, false);
  assert.ok(answerResult.scores.total <= 59);
  assert.equal(answerResult.passed, false);
});

test("all four deployed HWG5 clock questions cap a wrong time at 59", () => {
  const wrongTimes = new Map([
    ["HWG5-SR-001", "It's 5:45."],
    ["HWG5-SR-002", "It's 5:45."],
    ["HWG5-SR-009", "It's 5:55."],
    ["HWG5-SR-010", "It's ten o'clock."],
  ]);
  assert.equal(
    [...hwg5Questions.values()].filter(
      ({ transcriptCanonicalizer }) => transcriptCanonicalizer === CLOCK_TRANSCRIPT_CANONICALIZER,
    ).length,
    4,
  );
  for (const [questionId, transcript] of wrongTimes) {
    const result = scoreSpeechAttempt({ question: hwg5Questions.get(questionId), transcript });
    assert.equal(result.valid, true, questionId);
    assert.equal(result.coreCorrect, false, questionId);
    assert.ok(result.scores.total <= 59, questionId);
    assert.equal(result.passed, false, questionId);
  }
});

test("ambiguous compact digits are system-like invalid and do not produce a score", () => {
  for (const transcript of ["It's 545.", "1155"]) {
    const result = scoreSpeechAttempt({ question: fiveFiftyFive, transcript });
    assert.equal(result.valid, false, transcript);
    assert.equal(result.systemLike, true, transcript);
    assert.equal(result.invalidReason, "ambiguous_clock_digits", transcript);
    assert.equal(result.scores.total, null, transcript);
  }
});

test("non-clock questions never rewrite digits globally", () => {
  const question = {
    id: "OTHER-001",
    type: "read_aloud",
    standardReadSentence: "She is 11.",
    passScore: 80,
  };
  const state = canonicalizeTranscriptForQuestion(question, "She is 11.");
  assert.equal(state.profile, null);
  assert.equal(state.canonicalTranscript, "she is 11");
  assert.equal(state.displayTranscript, "She is 11.");
  assert.equal(state.rawTranscript, "She is 11.");
  assert.doesNotMatch(state.canonicalTranscript, /eleven/u);
});
