import assert from "node:assert/strict";
import test from "node:test";
import {
  RAFFLE_DURATION_MS,
  createRafflePool,
  pickRaffleNumber,
  removeRaffleNumber
} from "../src/lib/classroom-tools.js";

test("classroom raffle uses only two-digit 01 through 30", () => {
  const pool = createRafflePool();
  assert.equal(pool.length, 30);
  assert.equal(pool[0], "01");
  assert.equal(pool.at(-1), "30");
  assert.equal(pool.every((value) => /^\d{2}$/.test(value)), true);
  assert.equal(RAFFLE_DURATION_MS, 4000);
});

test("classroom raffle selects and removes a number without repeats", () => {
  const pool = ["01", "02", "03"];
  const selected = pickRaffleNumber(pool, () => 0.7);
  assert.equal(selected, "03");
  assert.deepEqual(removeRaffleNumber(pool, selected), ["01", "02"]);
  assert.equal(pickRaffleNumber([], () => 0), "");
});
