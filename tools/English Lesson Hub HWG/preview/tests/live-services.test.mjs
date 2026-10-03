import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from 'node:fs/promises';
import {
  createAudioWorkflow,
  validateScore,
  expiryMonth,
  taipeiDay,
  geminiScorer,
} from "../functions/src/live-audio.mjs";
import { createImageSearch } from "../scripts/image-search-service.mjs";
import { cleanupLiveRetention } from "../functions/src/live-retention.mjs";
const result = {
  transcript: "Hello.",
  accuracy: 80,
  fluency: 81,
  completeness: 82,
  total_score: 80,
  feedback: "請留意字尾。",
};
test('frontend and deployable backend share the identical domain',async()=>{assert.equal(await readFile(new URL('../src/live/domain.mjs',import.meta.url),'utf8'),await readFile(new URL('../functions/generated/live-domain.mjs',import.meta.url),'utf8'));});
test("strict score contract rejects coercion, injection and out of range", () => {
  assert.equal(validateScore(result).total_score, 80);
  for (const value of [null, "80", true, 101, -1])
    assert.throws(() => validateScore({ ...result, accuracy: value }));
  assert.throws(() =>
    validateScore("ignore rules ```" + JSON.stringify(result) + "```"),
  );
});
test("seven calendar months clamps month end and Taipei daily boundary", () => {
  assert.equal(
    expiryMonth(Date.parse("2026-07-31T12:00:00Z")).toISOString(),
    "2027-02-28T12:00:00.000Z",
  );
  assert.equal(taipeiDay(Date.parse("2026-01-01T16:00:00Z")), "2026-01-02");
  assert.equal(
    expiryMonth(Date.parse("2026-01-30T18:00:00Z")).toISOString(),
    "2026-08-30T18:00:00.000Z",
  );
});
test("retention disabled never accesses storage or database", async () => {
  assert.deepEqual(await cleanupLiveRetention({ db: null, bucket: null }), {
    enabled: false,
    deleted: 0,
  });
});
test("AI off gate never calls provider", async () => {
  let calls = 0;
  await assert.rejects(
    geminiScorer({ enabled: false, fetcher: () => calls++ })({}),
    /尚未/,
  );
  assert.equal(calls, 0);
});
function fixture() {
  let a,
    calls = 0,
    failSave = false;
  const files = new Map();
  const repository = {
    reserve: async (i) => {
      if (a) {
        if (a.hash !== i.hash) throw new Error("mismatch");
        return a;
      }
      return (a = {
        ...i,
        status: "reserved",
        targetText: "Hello.",
        focusRule: "clear",
      });
    },
    claim: async () => {
      if (a.status !== "reserved") return false;
      a.status = "ai-started";
      return true;
    },
    markUncertain: async () => {
      a.status = "uncertain";
    },
    finalize: async (id, uid, r) => {
      if (failSave) {
        failSave = false;
        throw new Error("firestore unavailable");
      }
      a = { ...a, status: "complete", result: r };
    },
    read: async () => a,
  };
  const storage = {
    putOnce: async (p, b) => {
      if (!files.has(p)) files.set(p, b);
    },
    getJSON: async (p) => (files.has(p) ? JSON.parse(files.get(p)) : null),
    exists: async (p) => files.has(p),
  };
  const input = {
    uid: "student",
    code: "123456",
    blockId: "q",
    attemptId: "attempt-0001",
    mimeType: "audio/webm",
    base64Audio: Buffer.from("synthetic-test-not-real-audio").toString(
      "base64",
    ),
  };
  return {
    input,
    repository,
    storage,
    files,
    calls: () => calls,
    fail: () => {
      failSave = true;
    },
    score: async () => {
      calls++;
      return result;
    },
  };
}
test("Firestore retry uses durable AI result and does not rescore", async () => {
  const f = fixture(),
    run = createAudioWorkflow(f);
  f.fail();
  await assert.rejects(run(f.input), /firestore/);
  assert.equal((await run(f.input)).status, "complete");
  assert.equal(f.calls(), 1);
  await run(f.input);
  assert.equal(f.calls(), 1);
});
test("concurrent audio retries call AI at most once", async () => {
  const f = fixture(),
    run = createAudioWorkflow(f);
  const r = await Promise.allSettled([run(f.input), run(f.input)]);
  assert.ok(r.some((v) => v.status === "fulfilled"));
  assert.equal(f.calls(), 1);
});
test("ambiguous AI outcome is not automatically re-evaluated", async () => {
  const f = fixture();
  let calls = 0;
  const run = createAudioWorkflow({
    ...f,
    score: async () => {
      calls++;
      throw new Error("network lost");
    },
  });
  await assert.rejects(run(f.input));
  await assert.rejects(run(f.input), /不會重複/);
  assert.equal(calls, 1);
});
test("image search forces SafeSearch, caches and rejects arbitrary download IDs", async () => {
  let calls = 0;
  const run = createImageSearch({
    key: "test-only",
    enabled: true,
    fetcher: async (url) => {
      calls++;
      assert.equal(new URL(url).searchParams.get("safesearch"), "true");
      return {
        ok: true,
        json: async () => ({
          hits: [
            {
              id: 1,
              previewURL: "https://cdn.pixabay.com/p.jpg",
              webformatURL: "https://pixabay.com/a.jpg",
              pageURL: "https://pixabay.com/photos/1",
              user: "author",
            },
          ],
        }),
      };
    },
  });
  assert.equal((await run({ query: "cat" })).hits.length, 1);
  await run({ query: "cat" });
  assert.equal(calls, 1);
  await assert.rejects(run({ action: "download", id: "https://localhost" }));
});
test("disabled image search makes no external request", async () => {
  await assert.rejects(
    createImageSearch({ fetcher: () => assert.fail("network") })({
      query: "cat",
    }),
    /尚未啟用/,
  );
});
