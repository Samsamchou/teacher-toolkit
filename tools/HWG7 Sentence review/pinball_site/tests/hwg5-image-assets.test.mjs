import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(testDir, "..");
const [bank, manifest] = await Promise.all([
  readFile(path.join(siteRoot, "data", "hwg5-sentence-review.json"), "utf8").then(JSON.parse),
  readFile(path.join(siteRoot, "images", "hwg5-sentence-review", "manifest.json"), "utf8").then(JSON.parse),
]);

const sha256 = buffer => createHash("sha256").update(buffer).digest("hex");

function readPngDimensions(buffer) {
  assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", "PNG signature");
  assert.equal(buffer.subarray(12, 16).toString("ascii"), "IHDR", "PNG IHDR");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

test("HWG5 SR has 15 verified public question images", async () => {
  assert.equal(bank.questions.length, 15);
  assert.equal(manifest.unitId, "hwg5-sr");
  assert.equal(manifest.assetCount, 15);
  assert.equal(manifest.assets.length, 15);
  assert.equal(manifest.teacherReviewStatus, "confirmed");
  assert.match(manifest.teacherConfirmedOn, /^\d{4}-\d{2}-\d{2}$/u);

  let totalBytes = 0;
  for (const question of bank.questions) {
    const asset = manifest.assets.find(item => item.questionId === question.id);
    assert.ok(asset, `${question.id} manifest entry`);
    assert.equal(asset.file, question.image.path);
    assert.equal(asset.alt, question.image.alt);
    assert.equal(asset.mimeType, "image/png");
    assert.equal(asset.localVisualQaStatus, "pass");
    assert.equal(asset.teacherReviewStatus, "confirmed");
    assert.equal(asset.teacherConfirmedOn, manifest.teacherConfirmedOn);
    assert.equal(question.image.generationStatus, "generated_teacher_confirmed");

    const filePath = path.join(siteRoot, ...asset.file.split("/"));
    const [buffer, info] = await Promise.all([readFile(filePath), stat(filePath)]);
    const dimensions = readPngDimensions(buffer);
    assert.deepEqual(dimensions, { width: 1280, height: 720 }, `${question.id} dimensions`);
    assert.equal(info.size, asset.bytes, `${question.id} byte count`);
    assert.equal(sha256(buffer), asset.sha256, `${question.id} SHA-256`);
    totalBytes += info.size;
  }

  assert.equal(totalBytes, manifest.totalBytes);
});

test("HWG5 image alternatives are reviewed and do not directly reveal location answers", () => {
  for (const question of bank.questions) {
    assert.equal(question.image.altReviewStatus, "teacher_confirmed", question.id);
    assert.ok(question.image.alt.length >= 10, `${question.id} alt length`);
  }
  for (const id of ["HWG5-SR-007", "HWG5-SR-008", "HWG5-SR-015"]) {
    const alt = bank.questions.find(question => question.id === id)?.image.alt || "";
    assert.doesNotMatch(alt, /裡面|旁邊|下方|桌下/u, `${id} must not reveal the target preposition`);
  }
});
