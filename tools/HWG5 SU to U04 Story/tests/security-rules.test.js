import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, beforeEach, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from "@firebase/rules-unit-testing";
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import {
  deleteObject,
  getMetadata,
  ref,
  uploadBytes
} from "firebase/storage";

const emulatorReady = Boolean(
  process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_STORAGE_EMULATOR_HOST
);
const rulesTest = emulatorReady ? test : test.skip;
const projectId = "hwg5-su-to-u04-story-rules-test";
let testEnv;

function recordData(uid, overrides = {}) {
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 7);
  return {
    ownerUid: uid,
    studentId: "007",
    theme: "HWG7",
    unit: "U02",
    date: "2026/08/27",
    sentenceId: "hwg7_u02_1",
    targetText: "What are you doing?",
    transcript: "What are you doing?",
    score: 92,
    feedback: "doing 的尾音再清楚一點。",
    audioUrl: "https://firebasestorage.googleapis.com/v0/b/example/o/file.webm?alt=media",
    audioPath: `audio_records/${uid}/007/1234567890.webm`,
    expiresAt: Timestamp.fromDate(expiresAt),
    timestamp: serverTimestamp(),
    ...overrides
  };
}

function teacherContext() {
  return testEnv.authenticatedContext("teacher-uid", {
    email: "samchouou@gmail.com",
    email_verified: true,
    firebase: { sign_in_provider: "google.com" }
  });
}

if (emulatorReady) {
  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8")
      },
      storage: {
        rules: readFileSync(new URL("../storage.rules", import.meta.url), "utf8")
      }
    });
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await testEnv.clearStorage();
  });

  after(async () => {
    await testEnv.cleanup();
  });
}

rulesTest("學生只能建立並讀取自己的嚴格格式紀錄", async () => {
  const owner = testEnv.authenticatedContext("student-a");
  const other = testEnv.authenticatedContext("student-b");
  const recordRef = doc(owner.firestore(), "reading_records", "record-1");

  await assertSucceeds(setDoc(recordRef, recordData("student-a")));
  await assertSucceeds(getDoc(recordRef));
  await assertFails(getDoc(doc(other.firestore(), "reading_records", "record-1")));
  await assertFails(updateDoc(recordRef, { feedback: "改寫" }));
  await assertFails(deleteDoc(recordRef));
});

rulesTest("學生查詢必須帶 ownerUid，未登入與跨 UID 查詢均拒絕", async () => {
  const owner = testEnv.authenticatedContext("student-a");
  const ownerDb = owner.firestore();
  await assertSucceeds(setDoc(doc(ownerDb, "reading_records", "record-1"), recordData("student-a")));

  await assertSucceeds(getDocs(query(
    collection(ownerDb, "reading_records"),
    where("ownerUid", "==", "student-a"),
    where("studentId", "==", "007")
  )));
  await assertFails(getDocs(collection(ownerDb, "reading_records")));
  await assertFails(getDocs(query(
    collection(testEnv.unauthenticatedContext().firestore(), "reading_records"),
    where("ownerUid", "==", "student-a")
  )));
});

rulesTest("嚴格 schema 阻擋額外欄位、分數超界、跨 UID 路徑與偽造時間", async () => {
  const db = testEnv.authenticatedContext("student-a").firestore();
  await assertFails(setDoc(doc(db, "reading_records", "extra"), recordData("student-a", { extra: "pollution" })));
  await assertFails(setDoc(doc(db, "reading_records", "score"), recordData("student-a", { score: 101 })));
  await assertFails(setDoc(doc(db, "reading_records", "path"), recordData("student-a", {
    audioPath: "audio_records/student-b/007/1234567890.webm"
  })));
  await assertFails(setDoc(doc(db, "reading_records", "time"), recordData("student-a", {
    timestamp: Timestamp.fromDate(new Date("2020-01-01T00:00:00Z"))
  })));
});

rulesTest("只有已驗證的指定教師可全班查詢與刪除", async () => {
  const ownerDb = testEnv.authenticatedContext("student-a").firestore();
  await assertSucceeds(setDoc(doc(ownerDb, "reading_records", "record-1"), recordData("student-a")));

  const teacherDb = teacherContext().firestore();
  await assertSucceeds(getDocs(query(
    collection(teacherDb, "reading_records"),
    where("date", "==", "2026/08/27")
  )));
  await assertSucceeds(deleteDoc(doc(teacherDb, "reading_records", "record-1")));

  const unverified = testEnv.authenticatedContext("fake-teacher", {
    email: "samchouou@gmail.com",
    email_verified: false,
    firebase: { sign_in_provider: "google.com" }
  });
  await assertFails(getDocs(collection(unverified.firestore(), "reading_records")));
});

rulesTest("Storage 只接受自己的有期限音檔，並拒絕跨 UID 與錯誤類型", async () => {
  const ownerStorage = testEnv.authenticatedContext("student-a").storage();
  const audioRef = ref(ownerStorage, "audio_records/student-a/007/1234567890.webm");
  const metadata = {
    contentType: "audio/webm",
    customMetadata: { expiresAt: "2027-03-27T00:00:00.000Z" }
  };

  await assertSucceeds(uploadBytes(audioRef, new Uint8Array([1, 2, 3]), metadata));
  await assertSucceeds(getMetadata(audioRef));
  await assertFails(getMetadata(ref(
    testEnv.authenticatedContext("student-b").storage(),
    "audio_records/student-a/007/1234567890.webm"
  )));
  await assertFails(uploadBytes(
    ref(ownerStorage, "audio_records/student-b/007/222.webm"),
    new Uint8Array([1]),
    metadata
  ));
  await assertFails(uploadBytes(
    ref(ownerStorage, "audio_records/student-a/007/333.webm"),
    new Uint8Array([1]),
    { ...metadata, contentType: "text/plain" }
  ));

  await assertSucceeds(deleteObject(ref(
    teacherContext().storage(),
    "audio_records/student-a/007/1234567890.webm"
  )));
});

rulesTest("安全規則測試確實連線兩個 emulator", () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST);
  assert.ok(process.env.FIREBASE_STORAGE_EMULATOR_HOST);
});
