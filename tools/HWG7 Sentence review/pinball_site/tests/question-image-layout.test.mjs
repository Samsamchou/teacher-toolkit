import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [indexSource, bank] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../data/hwg7-sentence-review.json", import.meta.url), "utf8").then(JSON.parse),
]);

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing source marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `Missing source marker: ${endMarker}`);
  return source.slice(start, end);
}

test("all 13 HWG7 questions keep a unique image mapping and useful alt text", () => {
  assert.equal(bank.questions.length, 13);
  assert.equal(new Set(bank.questions.map(question => question.id)).size, 13);
  assert.equal(new Set(bank.questions.map(question => question.image?.path)).size, 13);
  assert.ok(bank.questions.every(question => question.image?.path && question.image?.alt));
});

test("speech card source order is image, prompt and stem, then record button", () => {
  const speechCard = sliceBetween(indexSource, '<div className="speech-question-flow"', "{speechMessage &&");
  const markers = [
    'data-testid="question-image-frame"',
    'data-testid="question-prompt"',
    'data-testid="question-stem"',
    'data-testid="speech-record-button"',
  ];
  const positions = markers.map(marker => speechCard.indexOf(marker));
  assert.ok(positions.every(position => position >= 0), "every primary layout marker must exist");
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.doesNotMatch(speechCard, /<details|speech-guidance/u);
});

test("read-aloud has an adjacent AI voice button while Q&A has answer scaffolding", () => {
  const speechCard = sliceBetween(indexSource, '<div className="speech-question-flow"', "{speechMessage &&");
  assert.match(speechCard, /currentQuestion\.type === "read_aloud"[\s\S]*speech-model-audio-button[\s\S]*AI 語音/u);
  assert.match(speechCard, /currentQuestion\.type === "question_answer"[\s\S]*data-testid="answer-scaffold"/u);
  assert.deepEqual(
    bank.questions.filter(question => question.answerPromptStructure).map(question => [question.id, question.answerPromptStructure]),
    [
      ["HWG7-SR-006", "___ her _____."],
      ["HWG7-SR-008", "His ______ _____."],
      ["HWG7-SR-010", "His ______ _____."],
    ],
  );
});

test("question images are contained in a stable frame with an error fallback", () => {
  assert.match(indexSource, /\.speech-question-image-frame\s*\{[\s\S]*?max-height:\s*224px/u);
  assert.match(indexSource, /\.speech-question-image\s*\{[\s\S]*?object-fit:\s*contain/u);
  assert.match(indexSource, /height:\s*clamp\(140px,\s*22svh,\s*176px\)/u);
  assert.match(indexSource, /onError=\{\(\) => setQuestionImageFailed\(true\)\}/u);
  assert.match(indexSource, /data-testid="question-image-fallback" role="img"/u);
  assert.match(indexSource, /題目圖片暫時無法載入/u);
  assert.doesNotMatch(indexSource, /替代文字待教師確認/u);
});

test("landscape compact rules preserve readable primary controls", () => {
  const compactCss = sliceBetween(
    indexSource,
    "@media (min-width: 900px) and (orientation: landscape) and (max-height: 850px)",
    "@media (min-width: 1100px) and (orientation: landscape)",
  );
  assert.match(compactCss, /\.speech-practice-panel/u);
  assert.match(compactCss, /\.speech-record-button\s*\{[\s\S]*?min-height:\s*56px/u);
  assert.match(compactCss, /\.team-icon\s*\{\s*display:\s*none/u);
  assert.match(compactCss, /\.speech-question-image-frame/u);
  assert.doesNotMatch(compactCss, /speech-guidance/u);
});

test("per-question layout QA route is restricted to loopback hosts", () => {
  const qaSource = sliceBetween(indexSource, "function getLocalLayoutQaConfig()", "function App()");
  assert.match(qaSource, /127\.0\.0\.1/u);
  assert.match(qaSource, /localhost/u);
  assert.match(qaSource, /loopbackHosts\.has\(window\.location\.hostname\.toLowerCase\(\)\)/u);
  assert.match(qaSource, /new URLSearchParams\(window\.location\.search\)\.get\("layoutQa"\)/u);
  assert.doesNotMatch(qaSource, /firebaseapp\.com|web\.app/u);
});
test("speech landscape uses equal half-width regions and projection-sized English", () => {
  const wideCss = sliceBetween(
    indexSource,
    ".game-screen.speech-game-screen {",
    "</style>",
  );
  assert.match(wideCss, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)/u);
  assert.match(wideCss, /gap:\s*10px/u);
  assert.match(wideCss, /padding:\s*10px/u);
  assert.match(wideCss, /\.speech-game-screen \.control-panel\s*\{[\s\S]*?max-width:\s*none !important/u);
  assert.match(wideCss, /\.speech-game-screen \.pinball-panel\s*\{[\s\S]*?display:\s*flex/u);
  assert.match(wideCss, /\.speech-game-screen \.speech-question-stem\s*\{[\s\S]*?font-size:\s*clamp\(34px,\s*3vw,\s*42px\)/u);
  assert.match(wideCss, /\.speech-game-screen \.answer-scaffold\s*\{[\s\S]*?font-size:\s*clamp\(28px,\s*2\.3vw,\s*32px\)/u);
  assert.match(indexSource, /data-testid="pinball-panel"/u);
  assert.match(indexSource, /data-testid="pinball-shell"/u);
  assert.match(indexSource, /preserveAspectRatio="xMidYMid meet"/u);
});
