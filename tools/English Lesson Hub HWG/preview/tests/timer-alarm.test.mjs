import assert from "node:assert/strict";
import test from "node:test";
import { TIMER_ALARM_DURATION_MS } from "../src/lib/slot-audio.js";

test("teacher timer alarm is fixed at six seconds", () => {
  assert.equal(TIMER_ALARM_DURATION_MS, 6000);
});
