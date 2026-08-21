import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [indexSource, speechSource, serverSource] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../js/speech-practice.js", import.meta.url), "utf8"),
    readFile(new URL("../server.mjs", import.meta.url), "utf8")
]);

test("student home exposes only the dedicated HWG7 mode", () => {
    assert.match(indexSource, /\[\[SPEECH_MODE, MODE_META\[SPEECH_MODE\]\]\]\.map/);
    assert.doesNotMatch(indexSource, /\{Object\.entries\(MODE_META\)\.map/);
});

test("recorders and in-flight evaluations are cancelled on navigation", () => {
    assert.match(indexSource, /speechRecorderRef\.current\?\.cancel\?\.\(\)/);
    assert.match(indexSource, /speechEvaluationAbortRef\.current\?\.abort\?\.\(\)/);
    assert.match(indexSource, /const evaluationController = new AbortController\(\)/);
    assert.match(speechSource, /body: JSON\.stringify\([^\n]+\),\s*\n\s*signal/);
});

test("invalid evaluations cannot consume an attempt", () => {
    assert.match(indexSource, /apiResult\.valid !== true/);
    assert.match(serverSource, /result\.valid !== true/);
    assert.match(serverSource, /consumeAttempt: false/);
});

test("microphone permission and calibration cannot create duplicate recorders", () => {
    assert.match(indexSource, /speechStatus === "requesting"/);
    assert.match(speechSource, /const calibrationMs = 350/);
    assert.match(speechSource, /const threshold = Math\.max\(4, Math\.min\(12, baseline \+ 3\.5\)\)/);
    assert.match(speechSource, /let cancelled = false/);
});
