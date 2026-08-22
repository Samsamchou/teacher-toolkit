import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [indexSource, bank] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../data/hwg7-sentence-review.json", import.meta.url), "utf8").then(JSON.parse)
]);

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing source marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `Missing source marker: ${endMarker}`);
  return source.slice(start, end);
}

test("all 13 HWG7 questions keep a unique image mapping", () => {
  assert.equal(bank.questions.length, 13);
  assert.equal(new Set(bank.questions.map(question => question.id)).size, 13);
  assert.equal(new Set(bank.questions.map(question => question.image?.path)).size, 13);
  assert.ok(bank.questions.every(question => question.image?.path && question.image?.alt));
});

test("speech card source order is image, stem, record button, then collapsed guidance", () => {
  const speechCard = sliceBetween(
    indexSource,
    '<div className="speech-question-flow"',
    "{speechMessage &&"
  );
  const markers = [
    'data-testid="question-image-frame"',
    'data-testid="question-stem"',
    'data-testid="speech-record-button"',
    'data-testid="speech-guidance"'
  ];
  const positions = markers.map(marker => speechCard.indexOf(marker));
  assert.ok(positions.every(position => position >= 0), "every primary layout marker must exist");
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.doesNotMatch(speechCard, /<details[^>]*\sopen(?:=|\s|>)/);
});

test("question images are contained in a stable frame with an error fallback", () => {
  assert.match(indexSource, /\.speech-question-image-frame\s*\{[\s\S]*?max-height:\s*224px/);
  assert.match(indexSource, /\.speech-question-image\s*\{[\s\S]*?object-fit:\s*contain/);
  assert.match(indexSource, /height:\s*clamp\(140px,\s*22svh,\s*176px\)/);
  assert.match(indexSource, /onError=\{\(\) => setQuestionImageFailed\(true\)\}/);
  assert.match(indexSource, /data-testid="question-image-fallback" role="img"/);
  assert.match(indexSource, /題目圖片暫時無法載入/);
});

test("landscape compact rules preserve readable primary controls", () => {
  const compactCss = sliceBetween(
    indexSource,
    "@media (min-width: 900px) and (orientation: landscape) and (max-height: 850px)",
    "@media (min-width: 1100px) and (orientation: landscape)"
  );
  assert.match(compactCss, /\.speech-practice-panel/);
  assert.match(compactCss, /\.speech-record-button\s*\{[\s\S]*?min-height:\s*56px/);
  assert.match(compactCss, /\.team-icon\s*\{\s*display:\s*none/);
  assert.match(compactCss, /\.speech-guidance-details/);
});

test("per-question layout QA route is restricted to loopback hosts", () => {
  const qaSource = sliceBetween(indexSource, "function getLocalLayoutQaConfig()", "function App()");
  assert.match(qaSource, /127\.0\.0\.1/);
  assert.match(qaSource, /localhost/);
  assert.match(qaSource, /loopbackHosts\.has\(window\.location\.hostname\.toLowerCase\(\)\)/);
  assert.match(qaSource, /new URLSearchParams\(window\.location\.search\)\.get\("layoutQa"\)/);
  assert.doesNotMatch(qaSource, /firebaseapp\.com|web\.app/);
});
