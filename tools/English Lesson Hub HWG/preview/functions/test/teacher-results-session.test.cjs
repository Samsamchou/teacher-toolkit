"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  MAX_RESULT_IDS_PER_EXPORT,
  createSessionToken,
  normalizeResultIds,
  normalizeSessionToken,
  sessionIdForToken
} = require("../src/teacher-results-session.cjs");

test("teacher Results session token is opaque, validated, and only its hash is used as a document ID", () => {
  const token = createSessionToken();
  const sessionId = sessionIdForToken(token);
  assert.equal(normalizeSessionToken(token), token);
  assert.match(sessionId, /^[a-f0-9]{64}$/);
  assert.notEqual(sessionId, token);
  assert.equal(sessionIdForToken(token), sessionId);
  assert.equal(normalizeSessionToken("invalid"), null);
});

test("export result IDs reject duplicates, invalid values, and over-limit requests", () => {
  assert.deepEqual(normalizeResultIds(["session-a", "session_b"]), ["session-a", "session_b"]);
  assert.equal(normalizeResultIds(["session-a", "session-a"]), null);
  assert.equal(normalizeResultIds(["not/allowed"]), null);
  assert.equal(normalizeResultIds(Array.from({ length: MAX_RESULT_IDS_PER_EXPORT + 1 }, (_, index) => `session-${index}`)), null);
});