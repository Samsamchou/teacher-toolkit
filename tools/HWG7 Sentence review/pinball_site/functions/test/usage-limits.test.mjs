import test from "node:test";
import assert from "node:assert/strict";
import { AI_USAGE_LIMITS, decideUsageReservation, minuteBucket } from "../lib/usage-limits.mjs";

test("usage reservation increments all three counters", () => {
  assert.deepEqual(decideUsageReservation({ counts: { studentDaily: 2, gameMinute: 3, projectDaily: 4 }, now: "2026-08-22T06:00:00Z" }), {
    allowed: true,
    nextCounts: { studentDaily: 3, gameMinute: 4, projectDaily: 5 },
  });
  assert.equal(minuteBucket("2026-08-22T06:07:59Z"), "202608220607");
});

test("active claim blocks duplicate OpenAI calls", () => {
  const decision = decideUsageReservation({ claimLeaseUntil: "2026-08-22T06:02:00Z", now: "2026-08-22T06:00:00Z" });
  assert.equal(decision.allowed, false);
  assert.equal(decision.status, 409);
  assert.equal(decision.code, "attempt_in_progress");
});

for (const [field, limit, code] of [
  ["studentDaily", AI_USAGE_LIMITS.perStudentPerDay, "student_daily_limit"],
  ["gameMinute", AI_USAGE_LIMITS.perGamePerMinute, "game_minute_limit"],
  ["projectDaily", AI_USAGE_LIMITS.projectPerDay, "project_daily_limit"],
]) {
  test(field + " hard limit returns 429", () => {
    const decision = decideUsageReservation({ counts: { [field]: limit }, now: "2026-08-22T06:00:00Z" });
    assert.equal(decision.allowed, false);
    assert.equal(decision.status, 429);
    assert.equal(decision.code, code);
  });
}
