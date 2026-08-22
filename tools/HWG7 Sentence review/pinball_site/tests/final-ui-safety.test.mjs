import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [indexSource, speechSource, apiSource, serverSource, functionsSource, registry, firestoreRules, storageRules] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../js/speech-practice.js", import.meta.url), "utf8"),
    readFile(new URL("../js/app-api.js", import.meta.url), "utf8"),
    readFile(new URL("../server.mjs", import.meta.url), "utf8"),
    readFile(new URL("../functions/index.mjs", import.meta.url), "utf8"),
    readFile(new URL("../data/unit-registry.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../firestore.rules", import.meta.url), "utf8"),
    readFile(new URL("../storage.rules", import.meta.url), "utf8")
]);

test("homepage registry has the exact four-unit order and only HWG7 SR is ready", () => {
    assert.deepEqual(registry.units.map(unit => unit.label), ["HWG7 SR", "HWG5 SR", "HWG8 SR", "HWG6 SR"]);
    assert.deepEqual(registry.units.filter(unit => unit.status === "ready").map(unit => unit.id), ["hwg7-sr"]);
    assert.match(indexSource, /UNIT_REGISTRY\.map\(unit =>/);
    assert.match(indexSource, /disabled=\{!ready\}/);
    assert.match(indexSource, /題庫準備中/);
});

test("recorders and in-flight evaluations are cancelled on navigation", () => {
    assert.match(indexSource, /speechRecorderRef\.current\?\.cancel\?\.\(\)/);
    assert.match(indexSource, /speechEvaluationAbortRef\.current\?\.abort\?\.\(\)/);
    assert.match(indexSource, /const evaluationController = new AbortController\(\)/);
    assert.match(speechSource, /HWG7AppApi\.post\("\/api\/evaluate-speech"/);
    assert.match(speechSource, /\}, \{ signal \}\)/);
});

test("invalid evaluations cannot consume an attempt", () => {
    assert.match(indexSource, /apiResult\.valid !== true/);
    assert.match(functionsSource, /result\.valid !== true/);
    assert.match(serverSource, /score\.valid !== true/);
    assert.match(functionsSource, /consumeAttempt: false/);
});

test("microphone permission and calibration cannot create duplicate recorders", () => {
    assert.match(indexSource, /speechStatus === "requesting"/);
    assert.match(speechSource, /const calibrationMs = 350/);
    assert.match(speechSource, /const threshold = Math\.max\(4, Math\.min\(12, baseline \+ 3\.5\)\)/);
    assert.match(speechSource, /let cancelled = false/);
});

test("student transcripts and scores are never stored in browser localStorage or direct Firestore", () => {
    assert.doesNotMatch(indexSource, /localStorage/);
    assert.doesNotMatch(indexSource, /firebase\.firestore|signInAnonymously/);
    assert.doesNotMatch(apiSource, /localStorage/);
    assert.match(apiSource, /sessionStorage\.setItem\(TEACHER_SESSION_KEY, token\)/);
    assert.match(firestoreRules, /allow read, write: if false/);
    assert.match(storageRules, /allow read, write: if false/);
});

test("teacher login is backend-verified and raw passcodes are not embedded in the frontend", () => {
    assert.match(indexSource, /type="password"/);
    assert.match(apiSource, /\/api\/teacher\/login/);
    assert.match(functionsSource, /verifyPasscode\(passcode, configured\)/);
    assert.doesNotMatch(indexSource, /const\s+(?:teacher)?passcode\s*=\s*["']\d{6}["']/i);
    assert.doesNotMatch(apiSource, /const\s+(?:teacher)?passcode\s*=\s*["']\d{6}["']/i);
});

test("only a complete game flips rotation and teacher tools use trusted endpoints", () => {
    assert.match(indexSource, /turnSummaries/);
    assert.match(indexSource, /下一局題型尚未翻轉/);
    assert.match(functionsSource, /decideGameCompletion/);
    assert.match(functionsSource, /softDeleteResult/);
    assert.match(functionsSource, /recordingUrl/);
    assert.match(indexSource, /匯出 CSV/);
});