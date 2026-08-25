import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

const projectId = "hwg8-u01-listen-and-speak";
let testEnv;

function attemptData(uid, attemptId, studentId = "40100") {
  const now = new Date();
  const expires = new Date(now);
  expires.setFullYear(expires.getFullYear() + 1);
  return {
    attemptId,
    uid,
    studentId,
    unitId: "train-tickets",
    contentVersion: "tickets-v2",
    status: "in_progress",
    currentStep: 1,
    passedSteps: 0,
    score: 0,
    errorCount: 0,
    eventCount: 0,
    practiceStartedAt: Timestamp.fromDate(now),
    practiceDateTaipei: "2026-07-30",
    practiceDateStatus: "server",
    travelDate: null,
    timeStart: null,
    timeEnd: null,
    origin: "ershui",
    destination: null,
    trainNumber: null,
    trainType: null,
    depart: null,
    arrive: null,
    durationMinutes: null,
    pdfPath: null,
    recordingPath: null,
    recordingStatus: "unsupported",
    createdAtClient: now.toISOString(),
    completedAtClient: null,
    expiresAt: Timestamp.fromDate(expires),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

before(async () => {
  const [firestoreRules, storageRules] = await Promise.all([
    readFile(join(process.cwd(), "firestore.rules"), "utf8"),
    readFile(join(process.cwd(), "storage.rules"), "utf8"),
  ]);
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules: firestoreRules },
    storage: { rules: storageRules },
  });
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(context.firestore(), "tickets-v2", "attempt-student-a"),
      attemptData("student-a", "attempt-student-a"),
    );
  });
});

after(async () => {
  await testEnv?.cleanup();
});

test("anonymous student reads own server-created attempt but cannot create or list", async () => {
  const student = testEnv.authenticatedContext("student-a", {
    firebase: { sign_in_provider: "anonymous" },
  });
  const database = student.firestore();
  const attemptRef = doc(database, "tickets-v2", "attempt-student-a");
  await assertFails(
    setDoc(
      doc(database, "tickets-v2", "client-forged-attempt"),
      attemptData("student-a", "client-forged-attempt"),
    ),
  );
  await assertSucceeds(getDoc(attemptRef));
  await assertFails(getDocs(collection(database, "tickets-v2")));
});

test("other student cannot read or update an attempt", async () => {
  const other = testEnv.authenticatedContext("student-b", {
    firebase: { sign_in_provider: "anonymous" },
  });
  const attemptRef = doc(other.firestore(), "tickets-v2", "attempt-student-a");
  await assertFails(getDoc(attemptRef));
  await assertFails(updateDoc(attemptRef, { score: 100 }));
});

test("all direct student creates are rejected", async () => {
  const student = testEnv.authenticatedContext("student-c", {
    firebase: { sign_in_provider: "anonymous" },
  });
  const database = student.firestore();
  await assertFails(
    setDoc(
      doc(database, "tickets-v2", "bad-student-id"),
      attemptData("student-c", "bad-student-id", "小明"),
    ),
  );
  await assertFails(
    setDoc(
      doc(database, "tickets-v2", "wrong-owner"),
      attemptData("someone-else", "wrong-owner"),
    ),
  );
});

test("student can append immutable events to own attempt", async () => {
  const student = testEnv.authenticatedContext("student-a", {
    firebase: { sign_in_provider: "anonymous" },
  });
  const eventRef = doc(
    student.firestore(),
    "tickets-v2",
    "attempt-student-a",
    "events",
    "00001",
  );
  await assertSucceeds(
    setDoc(eventRef, {
      uid: "student-a",
      seq: 1,
      step: 1,
      action: "attempt_started",
      payload: {},
      before: {},
      after: { step: 1 },
      clientElapsedMs: 0,
      createdAtClient: new Date().toISOString(),
      createdAt: serverTimestamp(),
    }),
  );
  await assertFails(updateDoc(eventRef, { action: "changed" }));
});

test("teacher claim can list student records", async () => {
  const teacher = testEnv.authenticatedContext("teacher-a", {
    teacher: true,
    email: "teacher@example.test",
    firebase: { sign_in_provider: "password" },
  });
  const snapshot = await assertSucceeds(
    getDocs(collection(teacher.firestore(), "tickets-v2")),
  );
  assert.ok(snapshot.size >= 1);
});

test("storage accepts an owned PDF and rejects another student", async () => {
  const student = testEnv.authenticatedContext("student-a", {
    firebase: { sign_in_provider: "anonymous" },
  });
  const other = testEnv.authenticatedContext("student-b", {
    firebase: { sign_in_provider: "anonymous" },
  });
  const path = "tickets-v2/student-a/attempt-student-a/evidence.pdf";
  const content = new Blob(["%PDF-1.7 test"], { type: "application/pdf" });
  await assertSucceeds(uploadBytes(ref(student.storage(), path), content));
  await assertFails(
    uploadBytes(
      ref(other.storage(), path),
      new Blob(["%PDF-1.7 bad"], { type: "application/pdf" }),
    ),
  );
  const teacher = testEnv.authenticatedContext("teacher-a", {
    teacher: true,
    firebase: { sign_in_provider: "password" },
  });
  await assertSucceeds(getDownloadURL(ref(teacher.storage(), path)));
});
