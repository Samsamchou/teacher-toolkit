import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(testDir, "..");
const [bank, manifest, indexSource, generatorSource] = await Promise.all([
  readFile(path.join(siteRoot, "data", "hwg7-sentence-review.json"), "utf8").then(JSON.parse),
  readFile(path.join(siteRoot, "audio", "hwg7-sr", "manifest.json"), "utf8").then(JSON.parse),
  readFile(path.join(siteRoot, "index.html"), "utf8"),
  readFile(path.join(siteRoot, "scripts", "generate-hwg7-tts.mjs"), "utf8"),
]);

const sha256 = buffer => createHash("sha256").update(buffer).digest("hex");
const isMp3 = buffer => buffer.subarray(0, 3).toString("ascii") === "ID3" || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0);

test("Comic Relief Regular and Bold are self-hosted with the OFL license", async () => {
  const fontDir = path.join(siteRoot, "fonts", "comic-relief");
  for (const name of ["ComicRelief-Regular.ttf", "ComicRelief-Bold.ttf"]) {
    const buffer = await readFile(path.join(fontDir, name));
    const magicHex = buffer.subarray(0, 4).toString("hex");
    const magicAscii = buffer.subarray(0, 4).toString("ascii");
    assert.ok(buffer.length > 50_000, name);
    assert.ok(magicHex === "00010000" || magicAscii === "OTTO", `${name} font header`);
  }
  const license = await readFile(path.join(fontDir, "OFL.txt"), "utf8");
  assert.match(license, /SIL OPEN FONT LICENSE/u);
  assert.match(indexSource, /fonts\/comic-relief\/ComicRelief-Regular\.ttf/u);
  assert.match(indexSource, /fonts\/comic-relief\/ComicRelief-Bold\.ttf/u);
  assert.match(indexSource, /font-family: "Comic Relief"/u);
  assert.doesNotMatch(indexSource, /fonts\.googleapis\.com|fonts\.gstatic\.com/u);
});

test("all seven read-aloud questions have verified static OpenAI MP3 files", async () => {
  const readQuestions = bank.questions.filter(question => question.type === "read_aloud");
  assert.equal(readQuestions.length, 7);
  assert.equal(manifest.itemCount, 7);
  assert.equal(manifest.provider, "OpenAI");
  assert.equal(manifest.model, "gpt-4o-mini-tts");
  assert.equal(manifest.voice, "marin");
  assert.equal(manifest.speed, 0.8);
  assert.equal(manifest.processing, "native_tts_speed_parameter");

  for (const question of readQuestions) {
    assert.deepEqual(
      { provider: question.tts.provider, model: question.tts.model, voice: question.tts.voice, speed: question.tts.speed },
      { provider: "openai", model: "gpt-4o-mini-tts", voice: "marin", speed: 0.8 },
    );
    const item = manifest.items.find(entry => entry.questionId === question.id);
    assert.equal(item?.path, question.tts.path);
    assert.equal(item?.input, question.standardReadSentence);
    const audioPath = path.join(siteRoot, ...question.tts.path.split("/"));
    const buffer = await readFile(audioPath);
    const info = await stat(audioPath);
    assert.ok(info.size > 1_000, question.id);
    assert.equal(isMp3(buffer), true, `${question.id} MP3 signature`);
    assert.equal(sha256(buffer), item.sha256, `${question.id} SHA-256`);
    assert.equal(buffer.length, item.bytes, `${question.id} byte count`);
  }
});

test("TTS generator uses native speed and validates the existing key without SSML", () => {
  assert.match(generatorSource, /model: tts\.model/u);
  assert.match(generatorSource, /voice: tts\.voice/u);
  assert.match(generatorSource, /speed: tts\.speed/u);
  assert.match(generatorSource, /response_format: "mp3"/u);
  assert.match(generatorSource, /usableApiKey/u);
  assert.doesNotMatch(generatorSource, /<speak|SSML|console\.log\([^\n]*apiKey/iu);
});