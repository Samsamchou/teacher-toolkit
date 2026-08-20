import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteObject, getBytes, listAll, ref, uploadBytes } from "firebase/storage";

const root = resolve(import.meta.dirname, "..");
const rules = await readFile(resolve(root, "storage.rules"), "utf8");
let env;

function anonymousStorage(uid, claims = {}) {
  return env.authenticatedContext(uid, { firebase: { sign_in_provider: "anonymous" }, ...claims }).storage();
}

before(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-lesson-hub", storage: { rules } });
});
after(async () => { await env.cleanup(); });

test("student anonymous Auth cannot upload Image Slides without the short-lived teacher claim", async () => {
  const student = anonymousStorage("anon-student");
  const target = ref(student, "teacher-image-slides/hwg7-u01-l01/student-write.png");
  await assertFails(uploadBytes(target, new Uint8Array([137, 80, 78, 71]), { contentType: "image/png" }));
});

test("active teacher claim can upload and delete; students can get a known image but cannot list or delete", async () => {
  const teacher = anonymousStorage("anon-teacher", { lessonHubTeacherMediaExpiresAt: Date.now() + 10 * 60 * 1000 });
  const student = anonymousStorage("anon-student-read");
  const path = "teacher-image-slides/hwg7-u01-l01/teacher-write.png";
  await assertSucceeds(uploadBytes(ref(teacher, path), new Uint8Array([137, 80, 78, 71]), { contentType: "image/png" }));
  const bytes = await assertSucceeds(getBytes(ref(student, path)));
  assert.equal(bytes.byteLength, 4);
  await assertFails(listAll(ref(student, "teacher-image-slides/hwg7-u01-l01")));
  await assertFails(deleteObject(ref(student, path)));
  await assertSucceeds(deleteObject(ref(teacher, path)));
});

test("expired teacher claim cannot upload Image Slides", async () => {
  const expired = anonymousStorage("anon-expired-teacher", { lessonHubTeacherMediaExpiresAt: Date.now() - 1000 });
  const target = ref(expired, "teacher-image-slides/hwg7-u01-l01/expired.png");
  await assertFails(uploadBytes(target, new Uint8Array([137, 80, 78, 71]), { contentType: "image/png" }));
});

test("existing video/PDF flow remains direct anonymous upload while listing stays blocked", async () => {
  const teacher = anonymousStorage("anon-direct-media");
  const target = ref(teacher, "teacher-media/hwg7-u01-l01/video/direct-test.mp4");
  await assertSucceeds(uploadBytes(target, new Uint8Array([0, 0, 0, 24]), { contentType: "video/mp4" }));
  await assertFails(listAll(ref(teacher, "teacher-media/hwg7-u01-l01/video")));
  await assertSucceeds(deleteObject(target));
});
