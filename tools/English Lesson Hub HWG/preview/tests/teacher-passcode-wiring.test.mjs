import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const [functionSource, webClient, rules] = await Promise.all([
  readFile(resolve(root, "functions/index.cjs"), "utf8"),
  readFile(resolve(root, "src/lib/firebase-client.js"), "utf8"),
  readFile(resolve(root, "firestore.rules"), "utf8")
]);

test("teacher passcode remains server-side and exchanges a custom token", () => {
  assert.ok(functionSource.includes('defineSecret("TEACHER_RESULTS_PASSCODE")'));
  assert.ok(functionSource.includes("createCustomToken"));
  assert.ok(webClient.includes("signInWithCustomToken"));
  assert.equal(webClient.includes("GoogleAuthProvider"), false);
  assert.equal(webClient.includes("signInWithPopup"), false);
});

test("passcode rate-limit records are inaccessible to all browser clients", () => {
  assert.ok(rules.includes("match /teacherLoginAttempts/{attemptId}"));
  assert.ok(rules.includes("allow read, write: if false"));
});