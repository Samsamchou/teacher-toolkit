import assert from "node:assert/strict";
import { applyEnergy, INITIAL_ENERGY, scoreDelta } from "../public/game-rules.js";

assert.equal(INITIAL_ENERGY, 50);
assert.equal(scoreDelta(1, true), 10);
assert.equal(scoreDelta(2, true), 5);
assert.equal(scoreDelta(3, true), 2);
assert.equal(scoreDelta(8, true), 2);
assert.equal(scoreDelta(1, false), -3);
assert.equal(scoreDelta(1, true, false), 0);
assert.equal(scoreDelta(2, false, false), 0);
assert.equal(applyEnergy(2, -3), 0);
assert.equal(applyEnergy(50, 10), 60);

console.log("game-rules=PASS");
