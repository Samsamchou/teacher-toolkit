import assert from "node:assert/strict";
import test from "node:test";
import {
  RequestValidationError,
  decideCors,
  parseAllowedOrigins,
  validateEvaluationBody,
} from "../lib/http-validation.mjs";

const questionIds = new Set(["HWG7-SR-001", "HWG5-SR-001"]);

function audioBase64(container = "webm", size = 1200) {
  const bytes = Buffer.alloc(size);
  if (container === "webm") Buffer.from([0x1a, 0x45, 0xdf, 0xa3]).copy(bytes);
  if (container === "ogg") Buffer.from("OggS").copy(bytes);
  return bytes.toString("base64");
}

test("accepts a known question and canonical WebM audio", () => {
  const result = validateEvaluationBody({
    questionId: "HWG7-SR-001",
    mimeType: "audio/webm;codecs=opus",
    audioBase64: audioBase64(),
    metrics: { speechWindowMs: 2400, mediumPauses: 1, longPauses: 0 },
  }, questionIds);
  assert.equal(result.questionId, "HWG7-SR-001");
  assert.equal(result.extension, "webm");
  assert.equal(result.bytes.length, 1200);
  assert.deepEqual(result.metrics, { speechWindowMs: 2400, mediumPauses: 1, longPauses: 0 });
});

test("accepts a known HWG5 question ID without weakening membership checks", () => {
  const result = validateEvaluationBody({
    questionId: "HWG5-SR-001",
    mimeType: "audio/webm",
    audioBase64: audioBase64(),
  }, questionIds);
  assert.equal(result.questionId, "HWG5-SR-001");
});

test("rejects student identifiers and every other unexpected field", () => {
  assert.throws(
    () => validateEvaluationBody({
      questionId: "HWG7-SR-001",
      mimeType: "audio/webm",
      audioBase64: audioBase64(),
      studentCode: "60101",
    }, questionIds),
    (error) => error instanceof RequestValidationError && error.code === "unexpected_field",
  );
});

test("accepts opaque game context but still never accepts a student identifier", () => {
  const result = validateEvaluationBody({
    questionId: "HWG7-SR-001",
    mimeType: "audio/webm",
    audioBase64: audioBase64(),
    gameSessionId: "session_abcdefghij",
    turnIndex: 0,
    attemptNumber: 1,
  }, questionIds);
  assert.deepEqual(result.gameContext, {
    gameSessionId: "session_abcdefghij",
    turnIndex: 0,
    attemptNumber: 1,
  });
});

test("partial or out-of-range game context is rejected", () => {
  assert.throws(() => validateEvaluationBody({
    questionId: "HWG7-SR-001",
    mimeType: "audio/webm",
    audioBase64: audioBase64(),
    gameSessionId: "session_abcdefghij",
  }, questionIds), (error) => error.code === "invalid_turn_index");
});
test("rejects malformed base64", () => {
  assert.throws(
    () => validateEvaluationBody({
      questionId: "HWG7-SR-001",
      mimeType: "audio/webm",
      audioBase64: "not+canonical===",
    }, questionIds),
    (error) => error.code === "invalid_audio_data",
  );
});

test("rejects MIME and file-signature mismatch", () => {
  assert.throws(
    () => validateEvaluationBody({
      questionId: "HWG7-SR-001",
      mimeType: "audio/ogg",
      audioBase64: audioBase64("webm"),
    }, questionIds),
    (error) => error.code === "audio_signature_mismatch",
  );
});

test("rejects unknown question IDs", () => {
  assert.throws(
    () => validateEvaluationBody({
      questionId: "HWG7-SR-999",
      mimeType: "audio/webm",
      audioBase64: audioBase64(),
    }, questionIds),
    (error) => error.code === "question_not_found",
  );
});

test("rejects unsafe numeric metrics", () => {
  assert.throws(
    () => validateEvaluationBody({
      questionId: "HWG7-SR-001",
      mimeType: "audio/webm",
      audioBase64: audioBase64(),
      metrics: { mediumPauses: 1.5 },
    }, questionIds),
    (error) => error.code === "invalid_metrics",
  );
});

test("CORS permits exact configured and same origins, not arbitrary origins", () => {
  const allowed = parseAllowedOrigins("https://speech.example.edu,http://localhost:5000");
  assert.deepEqual(
    decideCors({ origin: "https://speech.example.edu", host: "function.example" }, allowed),
    { allowed: true, origin: "https://speech.example.edu" },
  );
  assert.deepEqual(
    decideCors({ origin: "https://function.example", host: "function.example", "x-forwarded-proto": "https" }, allowed),
    { allowed: true, origin: "https://function.example" },
  );
  assert.deepEqual(
    decideCors({ origin: "https://evil.example", host: "function.example" }, allowed),
    { allowed: false, origin: null },
  );
});

test("CORS configuration rejects wildcard origins", () => {
  assert.throws(
    () => parseAllowedOrigins("*"),
    (error) => error.code === "unsafe_cors_config",
  );
});
