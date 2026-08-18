import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore";

const root = resolve(import.meta.dirname, "..");
const rules = await readFile(resolve(root, "firestore.rules"), "utf8");
let env;

function practiceRecord(ownerUid, overrides = {}) {
  return {
    schemaVersion: "practice-result-v1",
    sessionId: "session-a",
    ownerUid,
    studentId: "60101",
    quizId: "hwg7-u01-l1-vocabulary",
    lessonId: "hwg7-u01-l01",
    lessonTitle: "HWG7 Unit 1 · Lesson 1",
    bookId: "hwg7",
    unitId: "u01",
    lessonNumber: 1,
    startedAt: "2026-08-17T00:00:00.000Z",
    completedAt: "2026-08-17T00:05:00.000Z",
    durationSeconds: 300,
    status: "completed",
    practiceScore: 12,
    practiceMaxScore: 18,
    finalCorrectCount: 18,
    accuracy: 67,
    typeA: { totalQuestions: 10, firstAttemptCorrectCount: 7, finalCorrectCount: 10 },
    typeB: { totalQuestions: 8, firstAttemptCorrectCount: 5, finalCorrectCount: 8 },
    slotScore: 250,
    rewardSessions: [],
    answers: {},
    ...overrides
  };
}

before(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-lesson-hub", firestore: { rules } });
});
beforeEach(async () => { await env.clearFirestore(); });
after(async () => { await env.cleanup(); });

test("anonymous student can create only an owned valid record, read only that Session, and never update it", async () => {
  const alice = env.authenticatedContext("anon-alice", { firebase: { sign_in_provider: "anonymous" } }).firestore();
  const owned = practiceRecord("anon-alice");
  await assertSucceeds(setDoc(doc(alice, "practiceResults/session-a"), owned));
  await assertSucceeds(getDoc(doc(alice, "practiceResults/session-a")));
  await assertFails(setDoc(doc(alice, "practiceResults/session-a"), owned));
  await assertFails(setDoc(doc(alice, "practiceResults/session-a"), { ...owned, practiceScore: 18 }));
  await assertFails(setDoc(doc(alice, "practiceResults/session-b"), practiceRecord("anon-someone-else", { sessionId: "session-b" })));
});

test("no browser identity can list, delete, or read another student's Results", async () => {
  await env.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), "practiceResults/session-a"), practiceRecord("anon-alice")));
  const alice = env.authenticatedContext("anon-alice", { firebase: { sign_in_provider: "anonymous" } }).firestore();
  const bob = env.authenticatedContext("anon-bob", { firebase: { sign_in_provider: "anonymous" } }).firestore();
  const forged = env.authenticatedContext("forged-browser", { teacher: true, firebase: { sign_in_provider: "custom" } }).firestore();
  await assertSucceeds(getDoc(doc(alice, "practiceResults/session-a")));
  await assertFails(getDoc(doc(bob, "practiceResults/session-a")));
  await assertFails(getDocs(collection(alice, "practiceResults")));
  await assertFails(getDocs(collection(forged, "practiceResults")));
  await assertFails(getDoc(doc(forged, "practiceResults/session-a")));
  await assertFails(deleteDoc(doc(forged, "practiceResults/session-a")));
});

test("all Function-owned Results records are denied to every browser client", async () => {
  const student = env.authenticatedContext("anon-alice", { firebase: { sign_in_provider: "anonymous" } }).firestore();
  const forged = env.authenticatedContext("forged-browser", { teacher: true, firebase: { sign_in_provider: "custom" } }).firestore();
  for (const path of ["teacherLoginAttempts/global", "teacherResultSessions/session-1", "exportEvents/export-1"]) {
    const record = { scope: "test", attemptCount: 1 };
    await assertFails(setDoc(doc(student, path), record));
    await assertFails(getDoc(doc(student, path)));
    await assertFails(getDoc(doc(forged, path)));
  }
});