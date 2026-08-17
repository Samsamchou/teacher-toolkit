"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  ATTEMPT_WINDOW_MS,
  USER_MAX_ATTEMPTS,
  nextAttempt,
  normalizePasscode,
  passcodesMatch
} = require("../src/access-policy.cjs");

test("teacher passcode policy accepts only exactly six digits", () => {
  assert.equal(normalizePasscode("246810"), "246810");
  assert.equal(normalizePasscode("24681"), null);
  assert.equal(normalizePasscode("2468100"), null);
  assert.equal(normalizePasscode("abcdef"), null);
  assert.equal(normalizePasscode(246810), null);
});

test("teacher passcode comparison requires an exact server-side match", () => {
  assert.equal(passcodesMatch("246810", "246810"), true);
  assert.equal(passcodesMatch("246810", "246811"), false);
  assert.equal(passcodesMatch("000000", "246810"), false);
});

test("per-user attempt policy locks only after the final allowed try fails", () => {
  let state = null;
  for (let index = 0; index < USER_MAX_ATTEMPTS; index += 1) {
    const decision = nextAttempt(state, 1_000, { maxAttempts: USER_MAX_ATTEMPTS, windowMs: ATTEMPT_WINDOW_MS });
    assert.equal(decision.allowed, true);
    state = decision.next;
  }
  const locked = nextAttempt(state, 1_001, { maxAttempts: USER_MAX_ATTEMPTS, windowMs: ATTEMPT_WINDOW_MS });
  assert.equal(locked.allowed, false);
  assert.ok(locked.retryAfterSeconds > 0);
});

test("attempt policy resets after its time window", () => {
  const first = nextAttempt(null, 1_000, { maxAttempts: USER_MAX_ATTEMPTS, windowMs: ATTEMPT_WINDOW_MS });
  const later = nextAttempt(first.next, 1_000 + ATTEMPT_WINDOW_MS, { maxAttempts: USER_MAX_ATTEMPTS, windowMs: ATTEMPT_WINDOW_MS });
  assert.equal(later.allowed, true);
  assert.equal(later.next.attemptCount, 1);
});