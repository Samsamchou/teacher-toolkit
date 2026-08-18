import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const mainSource = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const styleSource = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

test("Vocabulary Quiz gate uses the simplified school-ID entry and teacher QR route", () => {
  assert.match(mainSource, /<span>輸入學號<\/span>/);
  assert.match(mainSource, /請輸入五碼學號/);
  assert.match(mainSource, /掃碼開始 Quiz/);
  assert.match(mainSource, /buildStudentEntryUrl\(\{ baseUrl, bookId: lesson\.bookId/);
  assert.doesNotMatch(mainSource, /輸入匿名 Student ID 後開始/);
  assert.doesNotMatch(mainSource, /規則：第一次答案決定 Practice Score/);
});

test("Quiz mascot asset and portrait contain rules are present", () => {
  assert.equal(existsSync(new URL("../public/assets/mascots/word-master-monster-v1.png", import.meta.url)), true);
  assert.match(mainSource, /word-master-monster-v1\.png/);
  assert.match(styleSource, /\.slide-frame img \{[^}]*object-fit: contain;/);
  assert.match(styleSource, /\.projector-cockpit \.slide-frame \{[^}]*height: 0;/);
  assert.match(styleSource, /@keyframes quiz-mascot-bob/);
  assert.match(styleSource, /prefers-reduced-motion: reduce[\s\S]*\.quiz-corner-mascot \{ animation: none;/);
});
