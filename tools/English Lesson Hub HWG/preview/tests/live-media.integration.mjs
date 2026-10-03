import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createMediaService } from "../functions/src/live-media-service.mjs";
import { createLiveService } from "../functions/src/live-service.mjs";
import { createCloudImageService } from "../functions/src/live-image-service.mjs";
import { createVideoWorker } from "../worker/core.mjs";
import { newBlock } from "../src/live/domain.mjs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { ref, uploadBytes, getBytes } from "firebase/storage";
if (
  !process.env.FIRESTORE_EMULATOR_HOST ||
  !process.env.FIREBASE_STORAGE_EMULATOR_HOST
)
  throw new Error(
    "Local Firestore AND Storage emulators required; refusing live access.",
  );
const require = createRequire(
  new URL("../functions/index.cjs", import.meta.url),
);
const { initializeApp } = require("firebase-admin/app"),
  { getFirestore } = require("firebase-admin/firestore"),
  { getStorage } = require("firebase-admin/storage");
const app = initializeApp(
    {
      projectId: "demo-lesson-hub",
      storageBucket: "demo-lesson-hub.appspot.com",
    },
    "media-integration",
  ),
  db = getFirestore(app),
  bucket = getStorage(app).bucket();
const uid = "teacher-media-test",
  student = "student-media-test";
let env, video, image, webp;
const sha = (b) => createHash("sha256").update(b).digest("hex"),
  v = (b, mime) => ({ bytes: b.length, mime, sha256: sha(b) });
const auth = (who) => ({
  uid: who,
  token: { firebase: { sign_in_provider: "anonymous" } },
});
const teacher = async (r) => {
  if (r.auth?.uid !== uid || r.data.sessionToken !== "teacher-test-token")
    throw new Error("teacher denied");
};
const media = createMediaService({
  db,
  bucket,
  requireTeacher: teacher,
  videoEnabled: true,
});
const call = (action, extra = {}, who = uid) =>
  media({
    auth: auth(who),
    data: {
      action,
      ...extra,
      sessionToken: who === uid ? "teacher-test-token" : null,
    },
  });
const live = createLiveService({ db, requireTeacher: teacher });
const roomCall = (action, code, payload = {}, who = uid) =>
  live({
    auth: auth(who),
    data: {
      action,
      code,
      payload,
      sessionToken: who === uid ? "teacher-test-token" : null,
    },
  });
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-lesson-hub",
    storage: {
      rules: await readFile(
        new URL("../storage.rules", import.meta.url),
        "utf8",
      ),
    },
  });
  const dir = await mkdtemp(join(tmpdir(), "live-media-fixture-")),
    path = join(dir, "fixture.mp4");
  const generated = spawnSync(
    "ffmpeg",
    [
      "-nostdin",
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=blue:s=1600x900:r=10",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=440:sample_rate=44100",
      "-t",
      "1",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      path,
    ],
    { windowsHide: true },
  );
  assert.equal(generated.status, 0);
  video = await readFile(path);
  for (const name of ["png", "webp"]) {
    const out = join(dir, `image.${name}`);
    const p = spawnSync(
      "ffmpeg",
      [
        "-nostdin",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        path,
        "-frames:v",
        "1",
        "-update",
        "1",
        out,
      ],
      { windowsHide: true },
    );
    assert.equal(p.status, 0);
    if (name === "png") image = await readFile(out);
    else webp = await readFile(out);
  }
});
after(async () => {
  await env.cleanup();
  await db.terminate();
});
test("v2 upload grants enforce owner, exact bytes, MIME, expiry, create-only; finalize checks hash", async () => {
  const input = {
    name: "synthetic.png",
    variants: {
      original: v(image, "image/png"),
      playback: v(webp, "image/webp"),
    },
  };
  await assert.rejects(call("begin", { input }, student), /teacher denied/);
  const grant = await call("begin", { input });
  const teacherStorage = env
    .authenticatedContext(uid, { firebase: { sign_in_provider: "anonymous" } })
    .storage("gs://demo-lesson-hub.appspot.com");
  const studentStorage = env
    .authenticatedContext(student, {
      firebase: { sign_in_provider: "anonymous" },
    })
    .storage("gs://demo-lesson-hub.appspot.com");
  await assertFails(
    uploadBytes(ref(studentStorage, grant.paths.original), image, {
      contentType: "image/png",
    }),
  );
  await assertFails(
    uploadBytes(ref(teacherStorage, grant.paths.original), image, {
      contentType: "image/jpeg",
    }),
  );
  await assertFails(
    uploadBytes(
      ref(teacherStorage, grant.paths.original),
      image.subarray(0, 10),
      { contentType: "image/png" },
    ),
  );
  await assertSucceeds(
    uploadBytes(ref(teacherStorage, grant.paths.original), image, {
      contentType: "image/png",
    }),
  );
  await assertSucceeds(
    uploadBytes(ref(teacherStorage, grant.paths.playback), webp, {
      contentType: "image/webp",
    }),
  );
  await assertFails(
    uploadBytes(ref(teacherStorage, grant.paths.original), image, {
      contentType: "image/png",
    }),
  );
  assert.equal(
    (await call("finalize", { id: grant.id })).asset.status,
    "ready",
  );
  assert.equal(
    (await db.collection("liveMediaUploadsV2").doc(grant.id).get()).data()
      .active,
    false,
  );
  await assertFails(getBytes(ref(studentStorage, grant.paths.playback)));
  const expired = await call("begin", { input });
  await db
    .collection("liveMediaUploadsV2")
    .doc(expired.id)
    .update({ expiresAt: new Date(0) });
  await assertFails(
    uploadBytes(ref(teacherStorage, expired.paths.original), image, {
      contentType: "image/png",
    }),
  );
  const bad = await call("begin", {
    input: {
      ...input,
      variants: {
        ...input.variants,
        original: { ...input.variants.original, sha256: "0".repeat(64) },
      },
    },
  });
  await bucket
    .file(bad.paths.original)
    .save(image, { metadata: { contentType: "image/png" } });
  await assert.rejects(call("finalize", { id: bad.id }), /雜湊/);
});
test("student playback requires same teacher, membership and current slide; URL signing is stubbed", async () => {
  const grant = await call("begin", {
    input: {
      name: "sample.mp3",
      variants: { original: v(Buffer.from("ID3test-audio"), "audio/mpeg") },
    },
  });
  await bucket
    .file(grant.paths.original)
    .save(Buffer.from("ID3test-audio"), {
      metadata: { contentType: "audio/mpeg" },
    });
  await call("finalize", { id: grant.id });
  const mediaStub = createMediaService({
    db,
    requireTeacher: teacher,
    bucket: {
      file: () => ({
        getSignedUrl: async () => [
          "https://example.invalid/synthetic-signed-url",
        ],
      }),
    },
  });
  const read = (id, code, who = student) =>
    mediaStub({
      auth: auth(who),
      data: {
        action: "read",
        id,
        code,
        sessionToken: who === uid ? "teacher-test-token" : null,
      },
    });
  const block = {
    ...newBlock("slide"),
    media: [{ id: grant.id, name: "sample", kind: "audio" }],
  };
  let room = await roomCall("create", null, {
    deck: { id: "media-deck", title: "QA", blocks: [block, newBlock("slide")] },
  });
  await assert.rejects(read(grant.id, room.code));
  await roomCall("join", room.code, { studentId: "50101" }, student);
  await assert.rejects(read(grant.id, room.code));
  room = await roomCall("control", room.code, {
    action: "start",
    revision: room.revision,
  });
  assert.equal((await read(grant.id, room.code)).status, "ready");
  room = await roomCall("control", room.code, {
    action: "move",
    index: 1,
    revision: room.revision,
  });
  await assert.rejects(read(grant.id, room.code));
  await assert.rejects(read(grant.id, room.code, "intruder"));
  await assert.rejects(
    roomCall("saveDeck", null, {
      deck: {
        id: "bad-media",
        title: "QA",
        blocks: [
          {
            ...block,
            media: [{ id: "cloud-00000000-0000-0000-0000-000000000000" }],
          },
        ],
      },
      expectedVersion: 0,
    }),
    /素材/,
  );
});
test("Firestore + Storage video job runs real FFmpeg once; original and generated outputs survive retry", async () => {
  const grant = await call("begin", {
    input: {
      name: "synthetic-video.mp4",
      variants: { original: v(video, "video/mp4") },
    },
  });
  await bucket
    .file(grant.paths.original)
    .save(video, { metadata: { contentType: "video/mp4" } });
  assert.equal(
    (await call("finalize", { id: grant.id })).asset.status,
    "queued",
  );
  const run = createVideoWorker({ db, bucket });
  const results = await Promise.all([run(grant.id), run(grant.id)]);
  assert.ok(results.some((r) => r.status === "ready"));
  assert.ok(results.some((r) => r.status === "busy" || r.status === "ready"));
  assert.equal((await run(grant.id)).status, "ready");
  const job = (
    await db.collection("liveVideoJobsV2").doc(grant.id).get()
  ).data();
  assert.equal(job.attempts, 1);
  const asset = (await db.collection("liveMediaV2").doc(grant.id).get()).data();
  assert.ok(asset.paths.poster);
  assert.ok(asset.paths.playback);
  assert.equal(
    sha((await bucket.file(grant.paths.original).download())[0]),
    sha(video),
  );
  assert.ok(
    (await bucket.file(asset.paths.playback).getMetadata())[0].size > 0,
  );
});
test('stable teacher video upload preserves Storage identity and real FFmpeg across browsers',async()=>{
  const {createTeacherScope}=await import('../functions/src/live-teacher-scope.mjs');
  await db.collection('liveTeacherWorkspacesV2').doc('primary').set({schemaVersion:1,enabled:true,ownerUid:'stable-video-owner'});
  const scoped=createTeacherScope({db,requireTeacher:async r=>{
    if(r.data.sessionToken!==`test-${r.auth.uid}`)throw Error('teacher denied');
  }});
  const scopedCall=async(who,action,extra={})=>{
    const s=await scoped({auth:auth(who),data:{action,...extra,sessionToken:`test-${who}`}},'media');
    return createMediaService({db,bucket,requireTeacher:s.requireTeacher,videoEnabled:true})(s.request);
  };
  const grant=await scopedCall('video-browser-a','begin',{input:{name:'scoped.mp4',variants:{original:v(video,'video/mp4')}}});
  const storageFor=who=>env.authenticatedContext(who,{firebase:{sign_in_provider:'anonymous'}}).storage('gs://demo-lesson-hub.appspot.com');
  await assertFails(uploadBytes(ref(storageFor('video-browser-b'),grant.paths.original),video,{contentType:'video/mp4'}));
  await assertSucceeds(uploadBytes(ref(storageFor('video-browser-a'),grant.paths.original),video,{contentType:'video/mp4'}));
  assert.equal((await scopedCall('video-browser-b','finalize',{id:grant.id})).asset.status,'queued');
  assert.equal((await createVideoWorker({db,bucket})(grant.id)).status,'ready');
  const asset=(await db.collection('liveMediaV2').doc(grant.id).get()).data();
  assert.equal(asset.ownerUid,'video-browser-a');
  assert.equal(asset.workspaceOwnerUid,'stable-video-owner');
  assert.ok(asset.paths.playback.startsWith('liveMediaV2/video-browser-a/'));
  assert.equal(sha((await bucket.file(grant.paths.original).download())[0]),sha(video));
  assert.equal((await scopedCall('video-browser-b','status',{id:grant.id})).asset.status,'ready');
});
test("failed worker preserves original and explicit retry stops at three jobs", async () => {
  const grant = await call("begin", {
    input: {
      name: "failure.mp4",
      variants: { original: v(video, "video/mp4") },
    },
  });
  await bucket
    .file(grant.paths.original)
    .save(video, { metadata: { contentType: "video/mp4" } });
  await call("finalize", { id: grant.id });
  const run = createVideoWorker({
    db,
    bucket,
    transcode: async () => {
      throw new Error("synthetic failure");
    },
  });
  for (let i = 0; i < 3; i++) {
    assert.equal((await run(grant.id)).status, "failed");
    if (i < 2) await call("retry", { id: grant.id });
  }
  await assert.rejects(call("retry", { id: grant.id }), /三次/);
  assert.equal(
    sha((await bucket.file(grant.paths.original).download())[0]),
    sha(video),
  );
});
test("Pixabay persistent cache survives service recreation; confirmation and teacher gates prevent external requests", async () => {
  let calls = 0;
  const fetcher = async (url) => {
    calls++;
    const u = new URL(url);
    assert.equal(u.hostname, "pixabay.com");
    assert.equal(u.searchParams.get("safesearch"), "true");
    return {
      ok: true,
      json: async () => ({
        hits: [
          {
            id: 1234,
            previewURL: "https://cdn.pixabay.com/preview.jpg",
            webformatURL: "https://cdn.pixabay.com/image.jpg",
            pageURL: "https://pixabay.com/photos/test-1234/",
            user: "QA author",
            tags: "test",
          },
        ],
      }),
    };
  };
  const service = () =>
    createCloudImageService({
      db,
      key: "synthetic-not-a-real-key",
      enabled: true,
      requireTeacher: teacher,
      fetcher,
    });
  const request = {
    auth: auth(uid),
    data: {
      sessionToken: "teacher-test-token",
      input: { query: "synthetic test " + Date.now() },
    },
  };
  assert.equal((await service()(request)).hits.length, 1);
  await service()(request);
  assert.equal(calls, 1);
  await assert.rejects(
    service()({ auth: auth(student), data: request.data }),
    /teacher denied/,
  );
  await assert.rejects(
    service()({
      ...request,
      data: { ...request.data, input: { action: "download", id: "1234" } },
    }),
    /授權/,
  );
  assert.equal(calls, 1);
});
