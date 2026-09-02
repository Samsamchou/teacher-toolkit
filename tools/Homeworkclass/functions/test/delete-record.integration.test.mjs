import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import {
  deleteApp as deleteAdminApp,
  initializeApp as initializeAdminApp,
} from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import {
  deleteApp as deleteClientApp,
  initializeApp as initializeClientApp,
} from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from "firebase/functions";

const projectId = "demo-homeworkclass-delete-test";
const teacherUid = "homeworkclass-teacher";
const teacherEmail = "teacher-delete-test@example.invalid";
const teacherPassword = "local-emulator-only-password";
const retentionMs = 30 * 24 * 60 * 60 * 1000;

let adminApp;
let clientApp;
let unauthenticatedApp;
let database;
let deleteTeacherRecord;

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "Firestore emulator is required");
  assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST, "Auth emulator is required");

  adminApp = initializeAdminApp({ projectId }, "delete-record-admin-test");
  database = getAdminFirestore(adminApp);
  const adminAuth = getAdminAuth(adminApp);
  await adminAuth.createUser({
    uid: teacherUid,
    email: teacherEmail,
    password: teacherPassword,
  });
  await adminAuth.setCustomUserClaims(teacherUid, { role: "teacher" });

  clientApp = initializeClientApp(
    { projectId, apiKey: "demo-api-key", authDomain: `${projectId}.firebaseapp.com` },
    "delete-record-client-test",
  );
  const auth = getAuth(clientApp);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  await signInWithEmailAndPassword(auth, teacherEmail, teacherPassword);
  await auth.currentUser?.getIdToken(true);
  const functions = getFunctions(clientApp, "asia-east1");
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  deleteTeacherRecord = httpsCallable(functions, "deleteTeacherRecord");

  unauthenticatedApp = initializeClientApp(
    { projectId, apiKey: "demo-api-key", authDomain: `${projectId}.firebaseapp.com` },
    "delete-record-unauthenticated-test",
  );
});

after(async () => {
  await Promise.all([
    clientApp ? deleteClientApp(clientApp) : Promise.resolve(),
    unauthenticatedApp ? deleteClientApp(unauthenticatedApp) : Promise.resolve(),
    adminApp ? deleteAdminApp(adminApp) : Promise.resolve(),
  ]);
});

test("assignment deletion is atomic, cascading, and idempotent", async () => {
  const assignmentId = "integration-assignment";
  await database.collection("assignments").doc(assignmentId).set({
    id: assignmentId,
    classId: "四乙",
    subjectId: "english",
    assignedDate: "2026-09-01",
    period: 3,
    homeworkType: "textbook",
    content: "課本 p.4",
    createdAt: "2026-09-01T03:30:00.000Z",
  });
  for (const seatNumber of [1, 2]) {
    const id = `integration-submission-${seatNumber}`;
    await database.collection("submissionEvents").doc(id).set({
      id,
      assignmentId,
      classId: "四乙",
      seatNumber,
      outcome: "still-missing",
      reason: "unexcused",
      occurredOn: "2026-09-01",
      recordedAt: "2026-09-01T08:00:00.000Z",
    });
  }

  const first = await deleteTeacherRecord({
    recordType: "assignment",
    originalId: assignmentId,
  });
  assert.deepEqual(first.data, { status: "deleted", deletedCount: 2 });

  assert.equal(
    (await database.collection("assignments").doc(assignmentId).get()).exists,
    true,
  );
  assert.equal(
    (await database.collection("assignmentRevocations").doc(assignmentId).get()).data()
      ?.assignmentId,
    assignmentId,
  );
  assert.equal(
    (await database.collection("submissionEvents").where("assignmentId", "==", assignmentId).get()).size,
    0,
  );
  const deleted = await database
    .collection("deletedRecords")
    .where("parentAssignmentId", "==", assignmentId)
    .get();
  assert.equal(deleted.size, 2);
  for (const item of deleted.docs) {
    const value = item.data();
    assert.equal(value.purgeAt.toMillis() - value.deletedAt.toMillis(), retentionMs);
  }
  const audit = await database
    .collection("deletionAudits")
    .doc(`assignment_${assignmentId}`)
    .get();
  assert.deepEqual(
    {
      recordType: audit.data()?.recordType,
      originalId: audit.data()?.originalId,
      deletedCount: audit.data()?.deletedCount,
    },
    { recordType: "assignment", originalId: assignmentId, deletedCount: 2 },
  );
  assert.equal(audit.data()?.content, undefined);
  assert.equal(audit.data()?.reason, undefined);

  const second = await deleteTeacherRecord({
    recordType: "assignment",
    originalId: assignmentId,
  });
  assert.deepEqual(second.data, { status: "already-deleted", deletedCount: 2 });
  assert.equal(
    (await database.collection("deletedRecords").where("parentAssignmentId", "==", assignmentId).get()).size,
    2,
  );
});

test("classroom incident deletion moves the record into the recycle bin", async () => {
  const incidentId = "integration-incident";
  await database.collection("classroomIncidents").doc(incidentId).set({
    id: incidentId,
    classId: "四乙",
    subjectId: "english",
    date: "2026-09-01",
    period: 3,
    category: "late",
    seatNumber: 10,
    weight: 1,
    recordedAt: "2026-09-01T01:00:00.000Z",
  });

  const result = await deleteTeacherRecord({
    recordType: "classroom-incident",
    originalId: incidentId,
  });
  assert.deepEqual(result.data, { status: "deleted", deletedCount: 1 });
  assert.equal(
    (await database.collection("classroomIncidents").doc(incidentId).get()).exists,
    false,
  );
  const deleted = await database
    .collection("deletedRecords")
    .where("originalId", "==", incidentId)
    .get();
  assert.equal(deleted.size, 1);
  assert.equal(deleted.docs[0]?.data().payload.category, "late");
});

test("unauthenticated callers cannot delete", async () => {
  const functions = getFunctions(unauthenticatedApp, "asia-east1");
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  const unauthenticatedDelete = httpsCallable(functions, "deleteTeacherRecord");

  await assert.rejects(
    unauthenticatedDelete({
      recordType: "classroom-incident",
      originalId: "integration-incident",
    }),
    (error) => String(error?.code).includes("permission-denied"),
  );
});
