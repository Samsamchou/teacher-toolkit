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

test("anonymous students cannot read each other or list results; teacher claim can read and delete", async () => {
  await env.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), "practiceResults/session-a"), practiceRecord("anon-alice")));
  const alice = env.authenticatedContext("anon-alice", { firebase: { sign_in_provider: "anonymous" } }).firestore();
  const bob = env.authenticatedContext("anon-bob", { firebase: { sign_in_provider: "anonymous" } }).firestore();
  const teacher = env.authenticatedContext("teacher-1", { teacher: true, firebase: { sign_in_provider: "custom" } }).firestore();
  await assertSucceeds(getDoc(doc(alice, "practiceResults/session-a")));
  await assertFails(getDoc(doc(bob, "practiceResults/session-a")));
  await assertFails(getDocs(collection(alice, "practiceResults")));
  await assertSucceeds(getDoc(doc(teacher, "practiceResults/session-a")));
  await assertSucceeds(deleteDoc(doc(teacher, "practiceResults/session-a")));
});

test("only a teacher claim can record and read an export event", async () => {
  const teacher = env.authenticatedContext("teacher-1", { teacher: true, firebase: { sign_in_provider: "custom" } }).firestore();
  const student = env.authenticatedContext("anon-alice", { firebase: { sign_in_provider: "anonymous" } }).firestore();
  const event = { schemaVersion: "practice-export-v1", exportId: "export-1", teacherUid: "teacher-1", format: "csv", recordCount: 1, queryLabel: "all", exportedAt: "2026-08-17T01:00:00.000Z" };
  await assertSucceeds(setDoc(doc(teacher, "exportEvents/export-1"), event));
  await assertFails(getDoc(doc(student, "exportEvents/export-1")));
  await assertFails(setDoc(doc(student, "exportEvents/export-2"), { ...event, exportId: "export-2", teacherUid: "anon-alice" }));
  assert.ok(true);
});
test("all browser clients are denied access to function-owned teacher passcode rate-limit records", async () => {
  const student = env.authenticatedContext("anon-alice", { firebase: { sign_in_provider: "anonymous" } }).firestore();
  const teacher = env.authenticatedContext("teacher-1", { teacher: true, teacherAccess: "passcode", firebase: { sign_in_provider: "custom" } }).firestore();
  const record = { scope: "global", attemptCount: 1 };
  await assertFails(setDoc(doc(student, "teacherLoginAttempts/global"), record));
  await assertFails(getDoc(doc(student, "teacherLoginAttempts/global")));
  await assertFails(getDoc(doc(teacher, "teacherLoginAttempts/global")));
});