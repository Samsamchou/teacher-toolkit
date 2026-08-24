import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  inspectMp3,
  verifyHwg5Media,
} from "../scripts/verify-hwg5-media.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(testDir, "..");
const readJson = filePath => readFile(filePath, "utf8").then(JSON.parse);
const clone = value => JSON.parse(JSON.stringify(value));

const [bank, registry, imageManifest] = await Promise.all([
  readJson(path.join(siteRoot, "data", "hwg5-sentence-review.json")),
  readJson(path.join(siteRoot, "data", "unit-registry.json")),
  readJson(path.join(siteRoot, "images", "hwg5-sentence-review", "manifest.json")),
]);

test("strict HWG5 ready verifier covers all image and TTS assets", async () => {
  const result = await verifyHwg5Media();
  assert.equal(result.ok, true);
  assert.equal(result.registryStatus, "ready");
  assert.equal(result.imageCount, 15);
  assert.equal(result.teacherConfirmedImageCount, 15);
  assert.equal(result.imageBytes, 3_267_970);
  assert.equal(result.ttsCount, 15);
  assert.equal(result.ttsBytes, 561_792);
  assert.equal(result.ttsDurationSeconds, 35.112);
  assert.deepEqual(result.ttsDurationRangeSeconds, { min: 1.68, max: 3.168 });
  assert.equal(result.mp3FrameCount, 1_463);
  assert.equal(result.ttsItems.every(item => item.signature === "MPEG-Layer-III"), true);
});

test("HWG5 verifier rejects a stale image SHA before ready", async () => {
  const staleManifest = clone(imageManifest);
  staleManifest.assets[0].sha256 = "0".repeat(64);
  await assert.rejects(
    verifyHwg5Media({ bank, registry, imageManifest: staleManifest }),
    /image bytes or SHA-256 does not match/u,
  );
});

test("HWG5 verifier rejects TTS text that no longer maps to the prompt", async () => {
  const staleBank = clone(bank);
  staleBank.questions[8].tts.text = "It is five forty-five.";
  await assert.rejects(
    verifyHwg5Media({ bank: staleBank, registry, imageManifest }),
    /TTS text or question-type mapping is inconsistent/u,
  );
});

test("MP3 parser rejects truncated data instead of estimating duration", async () => {
  const full = await readFile(path.join(siteRoot, "audio", "hwg5-sr", "HWG5-SR-001.mp3"));
  assert.throws(() => inspectMp3(full.subarray(0, full.length - 1)), /Truncated or invalid MP3 frame/u);
});
