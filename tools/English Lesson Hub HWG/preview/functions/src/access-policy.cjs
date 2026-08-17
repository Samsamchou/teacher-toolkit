"use strict";

const crypto = require("node:crypto");

const PASSCODE_PATTERN = /^\d{6}$/;
const USER_MAX_ATTEMPTS = 5;
const GLOBAL_MAX_ATTEMPTS = 20;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

function normalizePasscode(value) {
  const candidate = typeof value === "string" ? value : "";
  return PASSCODE_PATTERN.test(candidate) ? candidate : null;
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest();
}

function passcodesMatch(input, expected) {
  if (!normalizePasscode(input) || typeof expected !== "string" || !expected.length) return false;
  return crypto.timingSafeEqual(sha256(input), sha256(expected));
}

function normalizeAttemptState(state) {
  return {
    windowStartedAtMs: Number.isFinite(Number(state?.windowStartedAtMs)) ? Number(state.windowStartedAtMs) : 0,
    attemptCount: Math.max(0, Number.isFinite(Number(state?.attemptCount)) ? Math.floor(Number(state.attemptCount)) : 0),
    lockedUntilMs: Math.max(0, Number.isFinite(Number(state?.lockedUntilMs)) ? Number(state.lockedUntilMs) : 0)
  };
}

function nextAttempt(previous, nowMs, { maxAttempts, windowMs }) {
  const state = normalizeAttemptState(previous);
  const now = Number(nowMs);
  if (!Number.isFinite(now) || maxAttempts < 1 || windowMs < 1) throw new Error("Invalid rate-limit configuration.");
  if (state.lockedUntilMs > now) {
    return { allowed: false, retryAfterSeconds: Math.ceil((state.lockedUntilMs - now) / 1000), next: state };
  }

  const resetWindow = !state.windowStartedAtMs || now - state.windowStartedAtMs >= windowMs;
  const windowStartedAtMs = resetWindow ? now : state.windowStartedAtMs;
  const priorCount = resetWindow ? 0 : state.attemptCount;
  if (priorCount >= maxAttempts) {
    const lockedUntilMs = windowStartedAtMs + windowMs;
    return { allowed: false, retryAfterSeconds: Math.ceil((lockedUntilMs - now) / 1000), next: { windowStartedAtMs, attemptCount: priorCount, lockedUntilMs } };
  }

  const attemptCount = priorCount + 1;
  const lockedUntilMs = attemptCount >= maxAttempts ? windowStartedAtMs + windowMs : 0;
  return { allowed: true, retryAfterSeconds: 0, next: { windowStartedAtMs, attemptCount, lockedUntilMs } };
}

module.exports = {
  ATTEMPT_WINDOW_MS,
  GLOBAL_MAX_ATTEMPTS,
  USER_MAX_ATTEMPTS,
  nextAttempt,
  normalizeAttemptState,
  normalizePasscode,
  passcodesMatch
};