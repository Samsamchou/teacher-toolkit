import test from "node:test";
import assert from "node:assert/strict";
import {
  validateUpload,
  mediaSignature,
  verifyStoredVariant,
} from "../functions/src/live-media-service.mjs";
import { dispatchVideoJob, failQueuedVideoDispatch } from "../functions/src/live-video-dispatch.mjs";
import { authenticateWorker } from "../worker/auth.mjs";
import { createHash } from "node:crypto";
import { createImageSearch } from "../functions/src/pixabay-core.mjs";
test("media manifest enforces variants, MIME, size, hash and image playback", () => {
  const original = { bytes: 100, mime: "video/mp4", sha256: "a".repeat(64) };
  assert.equal(
    validateUpload({ name: "sample.mp4", variants: { original } }).kind,
    "video",
  );
  for (const value of [
    { ...original, bytes: 101 * 1024 * 1024 },
    { ...original, mime: "text/html" },
    { ...original, sha256: "../file" },
    { ...original, mime: null },
  ])
    assert.throws(() =>
      validateUpload({ name: "bad", variants: { original: value } }),
    );
  assert.throws(() =>
    validateUpload({
      name: "png",
      variants: { original: { ...original, mime: "image/png" } },
    }),
  );
  assert.equal(mediaSignature(Buffer.from("<html>"), "image/png"), false);
});
test("stored hash verification rejects forged content and removes long-lived tokens", async () => {
  const data = Buffer.from("ID3synthetic audio"),
    expected = {
      bytes: data.length,
      mime: "audio/mpeg",
      sha256: createHash("sha256").update(data).digest("hex"),
    };
  let metadata;
  const file = {
    getMetadata: async () => [
      { size: data.length, contentType: "audio/mpeg", generation: "1" },
    ],
    createReadStream: async function* () {
      yield data;
    },
    setMetadata: async (m) => {
      metadata = m;
    },
  };
  assert.equal((await verifyStoredVariant(file, expected)).generation, "1");
  assert.equal(metadata.metadata.firebaseStorageDownloadTokens, null);
  await assert.rejects(
    verifyStoredVariant(file, { ...expected, sha256: "0".repeat(64) }),
    /雜湊/,
  );
});
test("worker dispatch is off by default and rejects arbitrary destinations", async () => {
  assert.deepEqual(
    await dispatchVideoJob({
      enabled: false,
      getClient: () => assert.fail("network"),
    }),
    { disabled: true },
  );
  for (const workerUrl of [
    "http://worker.run.app",
    "https://worker.run.app.evil.test",
    "https://worker.run.app/path",
    "https://user:pass@worker.run.app",
    "https://worker.run.app?x=1",
  ])
    await assert.rejects(
      dispatchVideoJob({
        enabled: true,
        workerUrl,
        getClient: () => assert.fail("network"),
      }),
    );
});
test("worker dispatch uses configured audience and sends only opaque asset ID", async () => {
  const id = "cloud-12345678-1234-1234-1234-123456789012";
  let called = false;
  const response = await dispatchVideoJob({
    id,
    enabled: true,
    workerUrl: "https://worker-test.run.app",
    getClient: async (audience) => {
      assert.equal(audience, "https://worker-test.run.app");
      return {
        request: async (req) => {
          called = true;
          assert.deepEqual(req.data, { assetId: id });
          assert.equal(req.retry, false);
          return { data: { status: "ready" } };
        },
      };
    },
  });
  assert.equal(response.status, "ready");
  assert.equal(called, true);
});

test("failed worker dispatch is bounded and preserves teacher retry", async () => {
  const id = "cloud-12345678-1234-1234-1234-123456789012";
  const job = { status: "queued", attempts: 1 };
  const asset = { status: "queued" };
  const changes = [];
  const db = {
    collection: (name) => ({ doc: () => ({ name }) }),
    runTransaction: async (run) => run({
      get: async (ref) => ({
        exists: true,
        data: () => ref.name === "liveVideoJobsV2" ? job : asset,
      }),
      update: (ref, value) => changes.push({ name: ref.name, value }),
    }),
  };
  assert.equal(await failQueuedVideoDispatch({ db, id }), true);
  assert.deepEqual(changes.map((item) => item.name), [
    "liveVideoJobsV2", "liveMediaV2",
  ]);
  assert.equal(changes[0].value.attempts, 2);
  assert.equal(changes[0].value.status, "failed");
  assert.match(changes[1].value.error, /原檔已保留/);
  changes.length = 0;
  job.status = "processing";
  assert.equal(await failQueuedVideoDispatch({ db, id }), false);
  assert.equal(changes.length, 0);
});
test("worker identity refuses missing, unverified and wrong caller tokens", async () => {
  const base = {
    audience: "https://worker.run.app",
    caller: "worker-caller@example.test",
    authorization: "Bearer synthetic-token",
  };
  await assert.rejects(
    authenticateWorker({
      ...base,
      authorization: "",
      verifyIdToken: () => assert.fail("verify"),
    }),
  );
  for (const claims of [
    { email: "other@example.test", email_verified: true },
    { email: base.caller, email_verified: false },
  ])
    await assert.rejects(
      authenticateWorker({
        ...base,
        verifyIdToken: async () => ({ getPayload: () => claims }),
      }),
      /denied/,
    );
  assert.equal(
    await authenticateWorker({
      ...base,
      verifyIdToken: async (input) => {
        assert.equal(input.audience, base.audience);
        return {
          getPayload: () => ({ email: base.caller, email_verified: true }),
        };
      },
    }),
    true,
  );
});
test("image import forbids forged destinations, expired hits and non-image responses", async () => {
  const store = {
    getHit: async () => ({
      until: Date.now() + 10000,
      image: "https://example.invalid/attack",
    }),
  };
  await assert.rejects(
    createImageSearch({
      key: "synthetic",
      enabled: true,
      cacheStore: store,
      fetcher: () => assert.fail("network"),
    })({ action: "download", id: "1" }),
    /白名單/,
  );
  store.getHit = async () => ({
    until: 0,
    image: "https://pixabay.com/image.jpg",
  });
  await assert.rejects(
    createImageSearch({ key: "synthetic", enabled: true, cacheStore: store })({
      action: "download",
      id: "1",
    }),
    /到期/,
  );
  store.getHit = async () => ({
    until: Date.now() + 10000,
    image: "https://pixabay.com/image.jpg",
  });
  await assert.rejects(
    createImageSearch({
      key: "synthetic",
      enabled: true,
      cacheStore: store,
      fetcher: async (url, options) => {
        assert.equal(options.redirect, "error");
        return {
          ok: true,
          headers: new Headers({ "content-type": "text/html" }),
        };
      },
    })({ action: "download", id: "1" }),
    /圖片/,
  );
});
