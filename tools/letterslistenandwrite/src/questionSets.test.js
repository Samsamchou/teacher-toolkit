import test from "node:test";
import assert from "node:assert/strict";
import {
  FIXED_SETS,
  buildQuestions,
  defaultSlotEvery,
  slotRoundPoints,
  scorePull,
  randomPull,
  describeSet,
} from "./questionSets.js";

test("five fixed sets with the right sizes and slot rules", () => {
  assert.deepEqual(
    FIXED_SETS.map((s) => [s.id, s.letters.length, s.order, s.slotEvery]),
    [
      ["all", 26, "random", 5],
      ["am-seq", 13, "sequential", 3],
      ["am-rand", 13, "random", 3],
      ["nz-seq", 13, "sequential", 3],
      ["nz-rand", 13, "random", 3],
    ],
  );
  assert.equal(describeSet(FIXED_SETS[1]), "13 題・依序・每對 3 題拉霸");
});

test("sequential keeps A→Z order; random keeps the same letters", () => {
  assert.equal(buildQuestions(FIXED_SETS[1]).join(""), "ABCDEFGHIJKLM");
  assert.equal(buildQuestions({ letters: ["Q", "B", "D", "B"], order: "sequential" }).join(""), "BDQ");
  const random = buildQuestions(FIXED_SETS[4]);
  assert.equal([...random].sort().join(""), "NOPQRSTUVWXYZ");
});

test("slot rounds: every N plus one after the last question", () => {
  assert.deepEqual(slotRoundPoints(26, 5), [5, 10, 15, 20, 25, 26]);
  assert.deepEqual(slotRoundPoints(13, 3), [3, 6, 9, 12, 13]);
  assert.deepEqual(slotRoundPoints(12, 3), [3, 6, 9, 12]);
  assert.deepEqual(slotRoundPoints(2, 3), [2]);
  assert.equal(defaultSlotEvery(13), 3);
  assert.equal(defaultSlotEvery(14), 5);
});

test("scoring follows the symbols", () => {
  assert.equal(scorePull(["seven", "seven", "seven"]), 500);
  assert.equal(scorePull(["crown", "crown", "crown"]), 200);
  assert.equal(scorePull(["bell", "star", "bell"]), 50);
  assert.equal(scorePull(["bell", "star", "cherry"]), 10);
});

test("random pulls only use known symbols", () => {
  for (let i = 0; i < 200; i += 1) {
    const pull = randomPull();
    assert.equal(pull.length, 3);
    assert.ok(pull.every((id) => ["seven", "diamond", "crown", "star", "cherry", "bell"].includes(id)));
  }
});
