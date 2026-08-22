import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [
  indexSource,
  speechSource,
  apiSource,
  serverSource,
  functionsSource,
  scoringSource,
  domainSource,
  registry,
  bank,
  firebaseConfig,
  firestoreRules,
  storageRules,
] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../js/speech-practice.js", import.meta.url), "utf8"),
  readFile(new URL("../js/app-api.js", import.meta.url), "utf8"),
  readFile(new URL("../server.mjs", import.meta.url), "utf8"),
  readFile(new URL("../functions/index.mjs", import.meta.url), "utf8"),
  readFile(new URL("../functions/lib/scoring.mjs", import.meta.url), "utf8"),
  readFile(new URL("../functions/lib/app-domain.mjs", import.meta.url), "utf8"),
  readFile(new URL("../data/unit-registry.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../data/hwg7-sentence-review.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../firebase.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../firestore.rules", import.meta.url), "utf8"),
  readFile(new URL("../storage.rules", import.meta.url), "utf8"),
]);

test("homepage has the exact four-unit order and only HWG7 SR is ready", () => {
  assert.deepEqual(registry.units.map(unit => unit.label), ["HWG7 SR", "HWG5 SR", "HWG8 SR", "HWG6 SR"]);
  assert.deepEqual(registry.units.filter(unit => unit.status === "ready").map(unit => unit.id), ["hwg7-sr"]);
  assert.match(indexSource, /UNIT_REGISTRY\.map\(unit =>/u);
  assert.match(indexSource, /disabled=\{!ready\}/u);
  assert.match(indexSource, /題庫準備中/u);
});

test("student pages omit builder-known feature and rule explanations", () => {
  assert.doesNotMatch(indexSource, /請先讀問句|評分公式與本題提醒|看圖並按下錄音，完成後系統會依固定公式評分|只輸入五碼班級|每局\s*12\s*題|每人\s*6\s*回合|80\s*分達標/u);
  assert.doesNotMatch(indexSource, /data-testid="speech-guidance"|speech-guidance-details/u);
});

test("Q&A records the answer only and keeps the three confirmed scaffolds", () => {
  assert.match(indexSource, /currentQuestion\.type === "read_aloud" \? currentQuestion\.standardReadSentence : currentQuestion\.questionText/u);
  assert.match(indexSource, /Look and answer/u);
  assert.doesNotMatch(indexSource, /Read and answer|請先讀問句/u);
  assert.doesNotMatch(scoringSource, /questionAccuracy|questionCompleteness|questionWeight/u);
  assert.match(scoringSource, /segments: \{ answer:/u);
  const scaffolds = Object.fromEntries(bank.questions.filter(question => question.answerPromptStructure).map(question => [question.id, question.answerPromptStructure]));
  assert.deepEqual(scaffolds, {
    "HWG7-SR-006": "___ her _____.",
    "HWG7-SR-008": "His ______ _____.",
    "HWG7-SR-010": "His ______ _____.",
  });
});

test("recorders and in-flight evaluations are cancelled on navigation", () => {
  assert.match(indexSource, /speechRecorderRef\.current\?\.cancel\?\.\(\)/u);
  assert.match(indexSource, /speechEvaluationAbortRef\.current\?\.abort\?\.\(\)/u);
  assert.match(indexSource, /const evaluationController = new AbortController\(\)/u);
  assert.match(speechSource, /HWG7AppApi\.post\("\/api\/evaluate-speech"/u);
  assert.match(speechSource, /\}, \{ signal \}\)/u);
});

test("invalid evaluations cannot consume an attempt", () => {
  assert.match(indexSource, /apiResult\.valid !== true/u);
  assert.match(functionsSource, /result\.valid !== true/u);
  assert.match(serverSource, /score\.valid !== true/u);
  assert.match(functionsSource, /consumeAttempt: false/u);
});

test("student transcripts and scores are never stored in browser localStorage or direct Firebase clients", () => {
  assert.doesNotMatch(indexSource, /localStorage/u);
  assert.doesNotMatch(indexSource, /firebase\.firestore|signInAnonymously/u);
  assert.doesNotMatch(apiSource, /localStorage/u);
  assert.match(apiSource, /sessionStorage\.setItem\(TEACHER_SESSION_KEY, token\)/u);
  assert.match(firestoreRules, /allow read, write: if false/u);
  assert.match(storageRules, /allow read, write: if false/u);
});

test("teacher login is backend-verified and raw passcodes are not embedded in the frontend", () => {
  assert.match(indexSource, /type="password"/u);
  assert.match(apiSource, /\/api\/teacher\/login/u);
  assert.match(functionsSource, /verifyPasscode\(passcode, configured\)/u);
  assert.doesNotMatch(indexSource, /const\s+(?:teacher)?passcode\s*=\s*["']\d{6}["']/iu);
  assert.doesNotMatch(apiSource, /const\s+(?:teacher)?passcode\s*=\s*["']\d{6}["']/iu);
});

test("every game uses fixed round alternation instead of cross-game flipping", () => {
  assert.match(domainSource, /phase: "round_alternating_fixed_start"/u);
  assert.match(domainSource, /const roundIndex = Math\.floor\(turnIndex \/ 2\)/u);
  assert.match(domainSource, /resetForNextGame: true/u);
  assert.match(functionsSource, /nextGamePattern: "fixed_round_alternation"/u);
  assert.doesNotMatch(functionsSource, /flipped/u);
  assert.doesNotMatch(serverSource, /flipped/u);
});

test("teacher recording playback uses protected binary fetch and revocable Blob URLs", () => {
  const rewrite = firebaseConfig.hosting.rewrites.find(item => item.source === "/api/teacher/recording");
  assert.equal(rewrite?.function?.functionId, "teacherRecording");
  assert.match(functionsSource, /export const teacherRecording/u);
  assert.match(functionsSource, /requireTeacherSession\(request\)/u);
  assert.match(functionsSource, /response\.set\("Content-Disposition", "inline"\)/u);
  assert.match(functionsSource, /recording_storage_unavailable[\s\S]*503/u);
  assert.doesNotMatch(functionsSource, /getSignedUrl|recordingUrl/u);
  assert.match(apiSource, /async function teacherRecording/u);
  assert.match(apiSource, /return response\.blob\(\)/u);
  assert.match(apiSource, /teacherRecording,\s*teacherLogout/u);
  assert.match(indexSource, /URL\.createObjectURL\(blob\)/u);
  assert.match(indexSource, /URL\.revokeObjectURL/u);
  assert.match(indexSource, /controlsList="nodownload noplaybackrate noremoteplayback"/u);
  assert.match(indexSource, /請點一下播放器的播放鍵/u);
});