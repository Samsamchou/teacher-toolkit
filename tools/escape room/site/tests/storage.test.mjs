import assert from "node:assert/strict";

class MemoryStorage {
  #data = new Map();
  getItem(key) { return this.#data.has(key) ? this.#data.get(key) : null; }
  setItem(key, value) { this.#data.set(key, String(value)); }
  removeItem(key) { this.#data.delete(key); }
  clear() { this.#data.clear(); }
}

globalThis.localStorage = new MemoryStorage();

const {
  attemptsToCsv,
  createAttempt,
  getActiveAttempt,
  listAttempts,
  saveAttempt,
  setActiveAttempt,
  summarizeAttempts,
} = await import("../public/storage.js");

let attempt = createAttempt("60101", "test-v1");
assert.equal(attempt.energy, 50);
assert.equal(attempt.status, "in_progress");
assert.equal(getActiveAttempt().attemptId, attempt.attemptId);

attempt.energy = 57;
attempt.currentNodeIndex = 2;
attempt.answers["U01-M1-Q1"] = {
  finalCorrect: true,
  firstTryCorrect: false,
  countsTowardMain18: true,
};
attempt = saveAttempt(attempt);
assert.equal(getActiveAttempt().energy, 57);
assert.equal(getActiveAttempt().currentNodeIndex, 2);

const summary = summarizeAttempts(listAttempts());
assert.equal(summary.attempts, 1);
assert.equal(summary.finalCorrectRate, 100);
assert.equal(summary.firstTryRate, 0);
assert.match(attemptsToCsv(listAttempts()), /60101/);

setActiveAttempt(null);
assert.equal(getActiveAttempt(), null);

console.log("storage-resume=PASS");
