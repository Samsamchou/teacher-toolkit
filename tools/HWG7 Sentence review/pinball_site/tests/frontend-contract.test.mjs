import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(testDir, "..");
const indexPath = path.join(siteRoot, "index.html");
const bankPath = path.join(siteRoot, "data", "hwg7-sentence-review.json");

const [indexHtml, bank] = await Promise.all([
  readFile(indexPath, "utf8"),
  readFile(bankPath, "utf8").then(JSON.parse)
]);

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing source marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `Missing source marker: ${endMarker}`);
  return source.slice(start, end).trim();
}

function compileFrontEndBank(rawBank) {
  const mappingSource = sliceBetween(
    indexHtml,
    "const HWG7_SPEECH_QUESTIONS =",
    "const QUESTION_BANKS ="
  );
  const factory = new Function(
    "window",
    `"use strict";\n${mappingSource}\nreturn HWG7_SPEECH_QUESTIONS;`
  );
  return factory({ HWG7_SENTENCE_REVIEW_BANK: rawBank.questions });
}

function compilePrepareQuestionSet(questionBank, shuffle) {
  const functionSource = sliceBetween(
    indexHtml,
    "function prepareQuestionSet(mode, firstTurnType = \"read_aloud\")",
    "function todayString()"
  );
  const factory = new Function(
    "QUESTION_BANKS",
    "SPEECH_MODE",
    "shuffle",
    "getModeTotalTurns",
    `"use strict";\n${functionSource}\nreturn prepareQuestionSet;`
  );
  return factory(
    { hwg7SentenceReview: questionBank, grade4Phonics: [] },
    "hwg7SentenceReview",
    shuffle,
    () => 12
  );
}

function compileStudentCodeRules() {
  const sanitizerSource = sliceBetween(
    indexHtml,
    "function sanitizeStudentCode(value)",
    "function shuffle(items)"
  );
  const sanitizer = new Function(
    `"use strict";\n${sanitizerSource}\nreturn sanitizeStudentCode;`
  )();
  const predicateMatch = indexHtml.match(/const validCodes = ([^;]+);/);
  assert.ok(predicateMatch, "Missing HomePage validCodes expression");
  const isValidPair = new Function(
    "codeOne",
    "codeTwo",
    `"use strict"; return (${predicateMatch[1]});`
  );
  return { sanitizer, isValidPair };
}

function seededShuffle(seed) {
  let state = seed >>> 0;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  return items => {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const target = Math.floor(random() * (index + 1));
      [result[index], result[target]] = [result[target], result[index]];
    }
    return result;
  };
}

function compileSpeechTurnHarness() {
  const saveSource = sliceBetween(
    indexHtml,
    "const saveSpeechResult =",
    "const handleSpeechRecord ="
  );
  const factory = new Function(
    "currentQuestion",
    "speechHistoryRef",
    "modeMeta",
    "answersRef",
    "currentTeam",
    "config",
    "setCorrectLog",
    "setSpeechResult",
    "setFeedback",
    "setIsLaunchReady",
    "setShowSuccess",
    "playCorrectAnswerAudio",
    "setTimeout",
    "setShowTryAgain",
    `"use strict";\n${saveSource}\nreturn saveSpeechResult;`
  );

  const speechHistoryRef = { current: {} };
  const answersRef = { current: { pink: [], blue: [] } };
  const state = {
    speechResult: null,
    feedback: "",
    launchReady: false,
    successShown: false,
    tryAgainShown: false,
    correctAudioCount: 0
  };
  const currentQuestion = {
    id: "HWG7-SR-013",
    type: "read_aloud",
    stem: "She would like some salad.",
    correctAnswer: "She would like some salad.",
    imagePath: "images/hwg7-sentence-review/HWG7-SR-013.png",
    questionBankVersion: "hwg7-sr-v1-draft",
    rubricVersion: "a1-v1"
  };
  const saveSpeechResult = factory(
    currentQuestion,
    speechHistoryRef,
    { passScore: 80, maxAttempts: 3 },
    answersRef,
    "pink",
    { mode: "hwg7SentenceReview" },
    () => {},
    value => { state.speechResult = value; },
    value => { state.feedback = value; },
    value => { state.launchReady = value; },
    value => { state.successShown = value; },
    () => { state.correctAudioCount += 1; },
    () => 0,
    value => { state.tryAgainShown = value; }
  );

  return { saveSpeechResult, speechHistoryRef, answersRef, state };
}

function speechApiResult(total, passed = total >= 80) {
  return {
    attemptId: `attempt-id-${total}`,
    recordingStored: true,
    transcript: "She would like some salad.",
    scores: { accuracy: total, completeness: total, fluency: total, total },
    passed,
    feedback: `score ${total}`,
    primaryIssue: null,
    matchedAnswer: "She would like some salad.",
    rubricVersion: "a1-v1"
  };
}

test("front-end bank adapter resolves all 13 unique, non-empty image paths", async () => {
  const adapted = compileFrontEndBank(bank);

  assert.equal(adapted.length, 13);
  assert.equal(new Set(adapted.map(question => question.id)).size, 13);
  assert.equal(new Set(adapted.map(question => question.imagePath)).size, 13);

  for (const question of adapted) {
    assert.match(question.imagePath, /^images\/hwg7-sentence-review\/HWG7-SR-\d{3}\.(?:png|jpe?g)$/i);
    const image = await stat(path.join(siteRoot, ...question.imagePath.split("/")));
    assert.ok(image.isFile(), `${question.id} image must be a file`);
    assert.ok(image.size > 0, `${question.id} image must not be empty`);
  }
});

test("actual prepareQuestionSet makes 12 unique questions and supports both A/B assignment phases", () => {
  const adapted = compileFrontEndBank(bank);

  for (let seed = 1; seed <= 250; seed += 1) {
    for (const firstType of ["read_aloud", "question_answer"]) {
      const prepareQuestionSet = compilePrepareQuestionSet(adapted, seededShuffle(seed));
      const game = prepareQuestionSet("hwg7SentenceReview", firstType);
      const ids = game.map(question => question.id);

      assert.equal(game.length, 12, `seed ${seed} ${firstType}: game length`);
      assert.equal(new Set(ids).size, 12, `seed ${seed} ${firstType}: duplicate question`);
      assert.equal(game.filter(question => question.type === "read_aloud").length, 6, `seed ${seed} ${firstType}: type 1 count`);
      assert.equal(game.filter(question => question.type === "question_answer").length, 6, `seed ${seed} ${firstType}: type 2 count`);
      game.forEach((question, index) => {
        const expected = index % 2 === 0 ? firstType : (firstType === "read_aloud" ? "question_answer" : "read_aloud");
        assert.equal(question.type, expected, `seed ${seed} ${firstType}: turn ${index + 1}`);
      });
    }
  }
});

test("HomePage accepts only two distinct five-digit student codes", () => {
  const { sanitizer, isValidPair } = compileStudentCodeRules();

  assert.equal(sanitizer("60A1-01"), "60101");
  assert.equal(sanitizer("１２３４５"), "");
  assert.equal(sanitizer("6010199"), "60101");
  assert.equal(sanitizer(null), "");

  assert.equal(isValidPair("60101", "60102"), true);
  assert.equal(isValidPair("6010", "60102"), false);
  assert.equal(isValidPair("601010", "60102"), false);
  assert.equal(isValidPair("60A01", "60102"), false);
  assert.equal(isValidPair("60101", "60101"), false);
});

test("80 is inclusive: 80 passes and 79 remains retryable", () => {
  const atThreshold = compileSpeechTurnHarness();
  atThreshold.saveSpeechResult(speechApiResult(80, true), 1);
  assert.equal(atThreshold.state.speechResult.status, "passed");
  assert.equal(atThreshold.state.launchReady, true);
  assert.equal(atThreshold.answersRef.current.pink[0].forcedLaunch, false);

  const belowThreshold = compileSpeechTurnHarness();
  belowThreshold.saveSpeechResult(speechApiResult(79, false), 1);
  assert.equal(belowThreshold.state.speechResult.status, "retry");
  assert.equal(belowThreshold.state.launchReady, false);
  assert.equal(belowThreshold.answersRef.current.pink[0].forcedLaunch, false);
});

test("three valid sub-80 attempts become not_met and still unlock launch", () => {
  const harness = compileSpeechTurnHarness();

  harness.saveSpeechResult(speechApiResult(61, false), 1);
  assert.equal(harness.state.speechResult.status, "retry");
  assert.equal(harness.state.launchReady, false);

  harness.saveSpeechResult(speechApiResult(73, false), 2);
  assert.equal(harness.state.speechResult.status, "retry");
  assert.equal(harness.state.launchReady, false);

  harness.saveSpeechResult(speechApiResult(79, false), 3);
  const recorded = harness.answersRef.current.pink[0];
  assert.equal(harness.state.speechResult.status, "not_met");
  assert.equal(harness.state.speechResult.exhausted, true);
  assert.equal(harness.state.launchReady, true);
  assert.equal(recorded.status, "not_met");
  assert.equal(recorded.forcedLaunch, true);
  assert.equal(recorded.attempts.length, 3);
  assert.equal(recorded.bestScore, 79);
  assert.match(harness.state.feedback, /三次.*未達80分.*發射/);
});
