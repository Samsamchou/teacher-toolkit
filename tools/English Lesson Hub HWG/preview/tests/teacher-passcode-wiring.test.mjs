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

test("teacher passcode remains server-side and opens an in-memory Results session", () => {
  assert.ok(functionSource.includes('defineSecret("TEACHER_RESULTS_PASSCODE")'));
  assert.ok(functionSource.includes("teacherResultSessions"));
  assert.ok(functionSource.includes("teacherResultsList"));
  assert.ok(functionSource.includes("teacherResultsRecordExport"));
  assert.ok(functionSource.includes("teacherResultsDelete"));
  assert.equal(functionSource.includes("createCustomToken"), false);
  assert.equal(webClient.includes("signInWithCustomToken"), false);
  assert.ok(webClient.includes("let teacherResultsSession = null"));
  assert.equal(webClient.includes("GoogleAuthProvider"), false);
  assert.equal(webClient.includes("signInWithPopup"), false);
});

test("all Function-owned teacher records and browser-wide Results reads are inaccessible to clients", () => {
  assert.equal(rules.includes("request.auth.token.teacher"), false);
  assert.ok(rules.includes("allow list, update, delete: if false"));
  for (const collection of ["teacherLoginAttempts", "teacherResultSessions", "exportEvents"]) {
    assert.ok(rules.includes(`match /${collection}/`));
  }
  assert.ok(rules.includes("allow read, write: if false"));
});