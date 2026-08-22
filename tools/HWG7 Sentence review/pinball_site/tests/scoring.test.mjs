import test from "node:test";
import assert from "node:assert/strict";

import {
  SCORING_SCOPE,
  alignWords,
  normalizeText,
  scoreSpeechAttempt,
  tokenize,
} from "../functions/lib/scoring.mjs";

const healthyMetrics = (transcript) => ({
  speechWindowMs: tokenize(transcript).length * 1000,
  mediumPauses: 0,
  longPauses: 0,
  repetitions: 0,
});

const q13 = {
  questionId: "HWG7-SR-013",
  type: "read_aloud",
  standardReadSentence: "She would like some salad.",
  acceptableAnswers: [],
  passScore: 80,
  maxAttempts: 3,
  rubricVersion: "a1-v2-answer-only",
  pronunciationAnalysis: {
    pronunciationTargets: ["would", "salad"],
    difficultWords: ["would", "salad"],
    stressWords: ["salad"],
    tone: "falling",
    chunks: ["She would like", "some salad"],
    linking: [],
  },
};

const yesQuestion = {
  questionId: "HWG7-SR-002",
  type: "question_answer",
  questionText: "Does she have a toothache?",
  acceptableAnswers: [
    {
      id: "yes-short",
      text: "Yes, she does.",
      answerKind: "short",
      fullCredit: true,
      requiredContentSlots: ["yes"],
      answerStructureSlots: ["she", "does"],
      answerWordCount: 3,
    },
    {
      id: "yes-full",
      text: "Yes, she has a toothache.",
      answerKind: "full",
      fullCredit: true,
      requiredContentSlots: ["yes", "toothache"],
      answerStructureSlots: ["she", "has", "a"],
      answerWordCount: 5,
    },
  ],
  passScore: 80,
  maxAttempts: 3,
  rubricVersion: "a1-v2-answer-only",
};

const noQuestion = {
  questionId: "HWG7-SR-012",
  type: "question_answer",
  questionText: "Does she have a runny nose?",
  acceptableAnswers: [
    {
      id: "no-short",
      text: "No, she doesn't.",
      answerKind: "short",
      fullCredit: true,
      requiredContentSlots: ["no"],
      answerStructureSlots: ["she", "doesn't"],
      answerWordCount: 3,
    },
    {
      id: "no-full",
      text: "No, she has a cold.",
      answerKind: "full",
      fullCredit: true,
      requiredContentSlots: ["no", "cold"],
      answerStructureSlots: ["she", "has", "a"],
      answerWordCount: 5,
    },
  ],
  passScore: 80,
  maxAttempts: 3,
  rubricVersion: "a1-v2-answer-only",
};

test("normalization preserves contractions and removes non-content punctuation", () => {
  assert.equal(normalizeText("  NO, she doesn’t!  "), "no she doesn't");
  assert.deepEqual(tokenize("She—would like salad."), ["she", "would", "like", "salad"]);
});

test("word alignment separates deletion, insertion, substitution, and immediate repetition", () => {
  const result = alignWords("she has a cold", "she she had cold today");
  assert.deepEqual(
    { C: result.C, S: result.S, D: result.D, E: result.E, R: result.R },
    { C: 2, S: 1, D: 1, E: 1, R: 1 },
  );
});

test("Q13 exact read-aloud receives 100 and passes the 80-point threshold", () => {
  const transcript = "She would like some salad.";
  const result = scoreSpeechAttempt({ question: q13, transcript, metrics: healthyMetrics(transcript) });
  assert.deepEqual(result.scores, { accuracy: 100, completeness: 100, fluency: 100, total: 100 });
  assert.equal(result.passed, true);
  assert.equal(result.valid, true);
  assert.equal(result.rubricVersion, "a1-v2-answer-only");
  assert.equal(result.scoringScope.phonemeAssessment, false);
});

test("Q&A scores only the recorded short answer and gives it full credit", () => {
  const transcript = "Yes, she does.";
  const result = scoreSpeechAttempt({ question: yesQuestion, transcript, metrics: healthyMetrics(transcript) });
  assert.equal(result.matchedAnswer.id, "yes-short");
  assert.equal(result.matchedAnswer.answerWordCount, 3);
  assert.deepEqual(result.segments, { answer: "yes she does" });
  assert.equal(result.normalizedTranscript, "yes she does");
  assert.equal(result.scores.total, 100);
  assert.equal(result.coreCorrect, true);
  assert.equal(result.passed, true);
});

test("Q&A scores only the recorded full answer and gives it full credit", () => {
  const transcript = "Yes, she has a toothache.";
  const result = scoreSpeechAttempt({ question: yesQuestion, transcript, metrics: healthyMetrics(transcript) });
  assert.equal(result.matchedAnswer.id, "yes-full");
  assert.equal(result.matchedAnswer.answerWordCount, 5);
  assert.equal(result.scores.total, 100);
  assert.equal(result.passed, true);
});

test("No short and full answers are independently full-credit without the question", () => {
  for (const [transcript, answerId, wordCount] of [
    ["No, she doesn't.", "no-short", 3],
    ["No, she has a cold.", "no-full", 5],
  ]) {
    const result = scoreSpeechAttempt({ question: noQuestion, transcript, metrics: healthyMetrics(transcript) });
    assert.equal(result.matchedAnswer.id, answerId);
    assert.equal(result.matchedAnswer.answerWordCount, wordCount);
    assert.equal(result.scores.total, 100);
    assert.equal(result.passed, true);
  }
});

test("target-aware contractions and full forms are equivalent", () => {
  const cases = [
    {
      question: { ...q13, standardReadSentence: "They’re his caps." },
      transcript: "They are his caps.",
    },
    {
      question: {
        ...yesQuestion,
        questionId: "HWG7-SR-004",
        questionText: "What would you like for dinner?",
        acceptableAnswers: [{ id: "would", text: "I’d like some chicken.", fullCredit: true, requiredContentSlots: ["chicken"], answerStructureSlots: ["I’d", "like", "some"], answerWordCount: 5 }],
      },
      transcript: "I would like some chicken.",
    },
    {
      question: {
        ...yesQuestion,
        questionId: "HWG7-SR-006",
        questionText: "Whose umbrella is this?",
        acceptableAnswers: [{ id: "it-is", text: "It’s her umbrella.", fullCredit: true, requiredContentSlots: ["her", "umbrella"], answerStructureSlots: ["It’s"], answerWordCount: 4 }],
      },
      transcript: "It is her umbrella.",
    },
    { question: noQuestion, transcript: "NO, SHE DOES NOT!" },
  ];
  for (const { question, transcript } of cases) {
    const result = scoreSpeechAttempt({ question, transcript, metrics: healthyMetrics(transcript) });
    assert.equal(result.scores.accuracy, 100, transcript);
    assert.equal(result.scores.completeness, 100, transcript);
    assert.equal(result.scores.total, 100, transcript);
    assert.equal(result.passed, true, transcript);
  }
});

test("wrong required core answer is capped at 59 and cannot pass", () => {
  const transcript = "No, she doesn't.";
  const result = scoreSpeechAttempt({ question: yesQuestion, transcript, metrics: healthyMetrics(transcript) });
  assert.equal(result.coreCorrect, false);
  assert.equal(result.scores.total <= 59, true);
  assert.equal(result.passed, false);
  assert.equal(result.primaryIssue, "wrong_core");
});

test("80 is inclusive while 79 is not", () => {
  const question = { ...q13, standardReadSentence: "She has a cold." };
  const transcript = "He has a cold.";
  const baseMetrics = { speechWindowMs: 100_000, mediumPauses: 0, longPauses: 20, repetitions: 0 };
  const exactly80 = scoreSpeechAttempt({ question, transcript, metrics: baseMetrics });
  assert.equal(exactly80.scores.total, 80);
  assert.equal(exactly80.passed, true);
  const below80 = scoreSpeechAttempt({ question, transcript, metrics: { ...baseMetrics, repetitions: 2 } });
  assert.equal(below80.scores.total, 79);
  assert.equal(below80.passed, false);
});

test("identical inputs produce deeply identical answer-only results", () => {
  const transcript = "No, she doesn't.";
  const input = { question: noQuestion, transcript, metrics: healthyMetrics(transcript) };
  assert.deepEqual(scoreSpeechAttempt(input), scoreSpeechAttempt(input));
  assert.deepEqual(SCORING_SCOPE, {
    phonemeAssessment: false,
    standardizedAssessment: false,
    stressAndIntonation: "feedback_only",
  });
});

test("blank transcript is invalid instead of receiving a zero score", () => {
  const result = scoreSpeechAttempt({ question: q13, transcript: "   " });
  assert.equal(result.valid, false);
  assert.equal(result.passed, false);
  assert.deepEqual(result.scores, { accuracy: null, completeness: null, fluency: null, total: null });
});