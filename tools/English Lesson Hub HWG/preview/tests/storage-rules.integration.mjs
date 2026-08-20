import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteObject, getBytes, listAll, ref, uploadBytes } from "firebase/storage";

const root = resolve(import.meta.dirname, "..");
const rules = await readFile(resolve(root, "storage.rules"), "utf8");
let env;

function anonymousStorage(uid) {
  return env.authenticatedContext(uid, { firebase: { sign_in_provider: "anonymous" } }).storage();
}

before(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-lesson-hub", storage: { rules } });
});
after(async () => { await env.cleanup(); });

test("Image Slides requires Anonymous Auth but no teacher unlock claim", async () => {
  const anonymous = anonymousStorage("anon-direct-image");
  const unauthenticated = env.unauthenticatedContext().storage();
  const path = "teacher-image-slides/hwg7-u01-l01/direct-write.png";
  await assertFails(uploadBytes(ref(unauthenticated, path), new Uint8Array([137, 80, 78, 71]), { contentType: "image/png" }));
  await assertSucceeds(uploadBytes(ref(anonymous, path), new Uint8Array([137, 80, 78, 71]), { contentType: "image/png" }));
});

test("known Image Slides are readable while listing, overwrite, and delete stay blocked", async () => {
  const uploader = anonymousStorage("anon-uploader");
  const reader = anonymousStorage("anon-reader");
  const path = "teacher-image-slides/hwg7-u01-l01/immutable-image.webp";
  await assertSucceeds(uploadBytes(ref(uploader, path), new Uint8Array([82, 73, 70, 70]), { contentType: "image/webp" }));
  const bytes = await assertSucceeds(getBytes(ref(reader, path)));
  assert.equal(bytes.byteLength, 4);
  await assertFails(listAll(ref(reader, "teacher-image-slides/hwg7-u01-l01")));
  await assertFails(uploadBytes(ref(uploader, path), new Uint8Array([1, 2, 3, 4]), { contentType: "image/webp" }));
  await assertFails(deleteObject(ref(uploader, path)));
});

test("Image Slides rejects unsupported MIME and files over 20 MB", async () => {
  const uploader = anonymousStorage("anon-invalid-image");
  await assertFails(uploadBytes(
    ref(uploader, "teacher-image-slides/hwg7-u01-l01/not-image.png"),
    new Uint8Array([1, 2, 3]),
    { contentType: "text/plain" }
  ));
  await assertFails(uploadBytes(
    ref(uploader, "teacher-image-slides/hwg7-u01-l01/too-large.png"),
    new Uint8Array(20 * 1024 * 1024 + 1),
    { contentType: "image/png" }
  ));
});

test("existing video and PDF flow remains direct anonymous upload", async () => {
  const uploader = anonymousStorage("anon-direct-media");
  const video = ref(uploader, "teacher-media/hwg7-u01-l01/video/direct-test.mp4");
  const pdf = ref(uploader, "teacher-media/hwg7-u01-l01/presentation/direct-test.pdf");
  await assertSucceeds(uploadBytes(video, new Uint8Array([0, 0, 0, 24]), { contentType: "video/mp4" }));
  await assertSucceeds(uploadBytes(pdf, new Uint8Array([37, 80, 68, 70]), { contentType: "application/pdf" }));
  await assertFails(listAll(ref(uploader, "teacher-media/hwg7-u01-l01/video")));
  await assertSucceeds(deleteObject(video));
  await assertSucceeds(deleteObject(pdf));
});
