import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_FAILED_LOGINS,
  checkTeacherSession,
  createPasscodeConfig,
  createTeacherSession,
  loginRateDecision,
  nextFailureRecord,
  parseBearerToken,
  rateLimitKey,
  tokenHash,
  validatePasscode,
  verifyPasscode,
} from "../lib/teacher-auth.mjs";

const samplePasscode = "246810";

test("six digits are required without embedding a frontend password", () => {
  assert.equal(validatePasscode(samplePasscode), samplePasscode);
  assert.throws(() => validatePasscode("12345"), /六碼/);
  assert.throws(() => validatePasscode("ABCDEF"), /六碼/);
});

test("scrypt configuration stores only salt and hash and verifies in constant-time comparison", async () => {
  const config = await createPasscodeConfig(samplePasscode, { salt: Buffer.alloc(24, 7) });
  const serialized = JSON.stringify(config);
  assert.doesNotMatch(serialized, new RegExp(samplePasscode));
  assert.equal(config.algorithm, "scrypt");
  assert.equal(await verifyPasscode(samplePasscode, config), true);
  assert.equal(await verifyPasscode("135790", config), false);
});

test("opaque teacher token is hashed for storage and uses a 30-minute idle deadline", () => {
  const session = createTeacherSession("2026-08-22T01:00:00.000Z");
  assert.equal(session.tokenHash, tokenHash(session.token));
  assert.equal(session.tokenHash.length, 64);
  assert.equal(new Date(session.idleExpiresAt) - new Date(session.createdAt), 30 * 60 * 1000);
  assert.equal(parseBearerToken(`Bearer ${session.token}`), session.token);
});

test("teacher session refreshes inactivity window but never passes absolute expiry", () => {
  const created = createTeacherSession("2026-08-22T01:00:00.000Z");
  const refreshed = checkTeacherSession(created, "2026-08-22T01:29:00.000Z");
  assert.equal(refreshed.idleExpiresAt, "2026-08-22T01:59:00.000Z");
  assert.throws(() => checkTeacherSession(created, "2026-08-22T01:30:00.000Z"), /逾時/);
});

test("five failed logins lock for 15 minutes", () => {
  let record = {};
  const now = "2026-08-22T01:00:00.000Z";
  for (let index = 0; index < MAX_FAILED_LOGINS; index += 1) record = nextFailureRecord(record, now);
  const decision = loginRateDecision(record, "2026-08-22T01:01:00.000Z");
  assert.equal(decision.allowed, false);
  assert.ok(decision.retryAfterSeconds > 0);
  assert.equal(loginRateDecision(record, "2026-08-22T01:16:00.000Z").allowed, true);
});

test("rate limit keys never store raw IP or user agent", () => {
  const key = rateLimitKey({ ip: "203.0.113.7", userAgent: "Browser Test" });
  assert.equal(key.length, 64);
  assert.doesNotMatch(key, /203\.0\.113\.7/);
});