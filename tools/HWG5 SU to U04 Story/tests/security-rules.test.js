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
    audioUrl: "https://firebasestorage.googleapis.com/v0/b/hwg5-su-to-u04-story.firebasestorage.app/o/file.webm?alt=media",
    audioPath: `audio_records/${uid}/007/1234567890.webm`,
    expiresAt: Timestamp.fromDate(expiresAt),
    timestamp: serverTimestamp(),
    ...overrides
  };
}

function persistenceEventData(overrides = {}) {
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 7);
  return {
    stage: "storage",
    category: "permission",
    mimeType: "audio/wav",
    bytes: 4096,
    date: "2026/09/08",
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
  const missingRequired = recordData("student-a");
  delete missingRequired.targetText;
  await assertFails(setDoc(doc(db, "reading_records", "extra"), recordData("student-a", { extra: "pollution" })));
  await assertFails(setDoc(doc(db, "reading_records", "score"), recordData("student-a", { score: 101 })));
  await assertFails(setDoc(doc(db, "reading_records", "negative"), recordData("student-a", { score: -1 })));
  await assertFails(setDoc(doc(db, "reading_records", "type"), recordData("student-a", { score: "92" })));
  await assertFails(setDoc(doc(db, "reading_records", "large"), recordData("student-a", { feedback: "x".repeat(501) })));
  await assertFails(setDoc(doc(db, "reading_records", "missing"), missingRequired));
  await assertFails(setDoc(doc(db, "reading_records", "owner"), recordData("student-b")));
  await assertFails(setDoc(doc(db, "reading_records", "path"), recordData("student-a", {
    audioPath: "audio_records/student-b/007/1234567890.webm"
  })));
  await assertFails(setDoc(doc(db, "reading_records", "traversal"), recordData("student-a", {
    audioPath: "audio_records/student-a/007/../1234567890.webm"
  })));
  await assertFails(setDoc(doc(db, "reading_records", "bucket"), recordData("student-a", {
    audioUrl: "https://firebasestorage.googleapis.com/v0/b/another-project.firebasestorage.app/o/file.webm?alt=media"
  })));
  await assertFails(setDoc(doc(db, "reading_records", "time"), recordData("student-a", {
    timestamp: Timestamp.fromDate(new Date("2020-01-01T00:00:00Z"))
  })));
});

rulesTest("新版 WAV 紀錄只接受固定 attemptId 文件與相符路徑", async () => {
  const db = testEnv.authenticatedContext("student-a").firestore();
  const attemptId = "123e4567-e89b-12d3-a456-426614174000";
  const audioPath = `audio_records/student-a/007/1788840000000-${attemptId}.wav`;
  const audioUrl = "https://firebasestorage.googleapis.com/v0/b/hwg5-su-to-u04-story.firebasestorage.app/o/current.wav?alt=media";

  await assertSucceeds(setDoc(doc(db, "reading_records", attemptId), recordData("student-a", {
    audioPath,
    audioUrl
  })));
  await assertFails(setDoc(doc(db, "reading_records", "another-attempt-id"), recordData("student-a", {
    audioPath,
    audioUrl
  })));
  await assertFails(setDoc(doc(db, "reading_records", "unsafe.attempt"), recordData("student-a", {
    audioPath: "audio_records/student-a/007/1788840000000-unsafe.attempt.wav",
    audioUrl
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
  const wrongEmail = testEnv.authenticatedContext("wrong-teacher", {
    email: "other@example.com",
    email_verified: true,
    firebase: { sign_in_provider: "google.com" }
  });
  await assertFails(getDocs(collection(wrongEmail.firestore(), "reading_records")));
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

rulesTest("Storage 精準接受新版 WAV 並拒絕 MIME、attemptId、大小及 metadata 不一致", async () => {
  const ownerStorage = testEnv.authenticatedContext("student-a").storage();
  const attemptId = "123e4567-e89b-12d3-a456-426614174000";
  const path = `audio_records/student-a/007/1788840000000-${attemptId}.wav`;
  const bytes = new Uint8Array(512);
  const metadata = {
    contentType: "audio/wav",
    customMetadata: {
      expiresAt: "2027-04-08T04:00:00.000Z",
      attemptId
    }
  };

  await assertSucceeds(uploadBytes(ref(ownerStorage, path), bytes, metadata));
  await assertFails(uploadBytes(
    ref(ownerStorage, `audio_records/student-a/007/1788840000001-${attemptId}.wav`),
    bytes,
    { ...metadata, contentType: "audio/webm" }
  ));
  await assertFails(uploadBytes(
    ref(ownerStorage, `audio_records/student-a/007/1788840000002-${attemptId}.wav`),
    bytes,
    { ...metadata, customMetadata: { ...metadata.customMetadata, attemptId: "different-attempt" } }
  ));
  await assertFails(uploadBytes(
    ref(ownerStorage, `audio_records/student-a/007/1788840000003-${attemptId}.wav`),
    new Uint8Array(511),
    metadata
  ));
  await assertFails(uploadBytes(
    ref(ownerStorage, `audio_records/student-a/007/1788840000004-${attemptId}.wav`),
    bytes,
    { ...metadata, customMetadata: { ...metadata.customMetadata, extra: "no" } }
  ));
  await assertFails(uploadBytes(
    ref(ownerStorage, `audio_records/student-a/007/1788840000005-${attemptId}.wav`),
    bytes,
    { contentType: "audio/wav", customMetadata: { attemptId } }
  ));
  await assertFails(uploadBytes(
    ref(ownerStorage, `audio_records/student-a/007/../1788840000006-${attemptId}.wav`),
    bytes,
    metadata
  ));
});

rulesTest("匿名失敗事件採嚴格 schema，學生不可讀改刪，教師可按日彙總", async () => {
  const ownerDb = testEnv.authenticatedContext("student-a").firestore();
  const eventId = "123e4567-e89b-12d3-a456-426614174000-storage";
  const eventRef = doc(ownerDb, "persistence_events", eventId);

  await assertSucceeds(setDoc(eventRef, persistenceEventData()));
  await assertFails(getDoc(eventRef));
  await assertFails(updateDoc(eventRef, { category: "network" }));
  await assertFails(deleteDoc(eventRef));
  await assertFails(setDoc(
    doc(ownerDb, "persistence_events", "123e4567-e89b-12d3-a456-426614174001-ai"),
    persistenceEventData({ stage: "storage" })
  ));
  await assertFails(setDoc(
    doc(ownerDb, "persistence_events", "123e4567-e89b-12d3-a456-426614174002-storage"),
    persistenceEventData({ studentId: "50108" })
  ));
  await assertFails(setDoc(
    doc(ownerDb, "persistence_events", "123e4567-e89b-12d3-a456-426614174003-storage"),
    persistenceEventData({ bytes: 10 * 1024 * 1024 + 1 })
  ));
  await assertFails(setDoc(
    doc(ownerDb, "persistence_events", "123e4567-e89b-12d3-a456-426614174005-storage"),
    persistenceEventData({ bytes: "4096" })
  ));
  await assertFails(setDoc(
    doc(ownerDb, "persistence_events", "123e4567-e89b-12d3-a456-426614174006-storage"),
    persistenceEventData({ category: "raw-secret-error" })
  ));
  await assertFails(setDoc(
    doc(ownerDb, "persistence_events", "123e4567-e89b-12d3-a456-426614174007-storage"),
    persistenceEventData({ rawError: "private details" })
  ));
  await assertFails(setDoc(
    doc(testEnv.unauthenticatedContext().firestore(), "persistence_events", "123e4567-e89b-12d3-a456-426614174004-storage"),
    persistenceEventData()
  ));

  const teacherDb = teacherContext().firestore();
  await assertSucceeds(getDocs(query(
    collection(teacherDb, "persistence_events"),
    where("date", "==", "2026/09/08")
  )));
  await assertSucceeds(deleteDoc(doc(teacherDb, "persistence_events", eventId)));
});

rulesTest("安全規則測試確實連線兩個 emulator", () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST);
  assert.ok(process.env.FIREBASE_STORAGE_EMULATOR_HOST);
});
