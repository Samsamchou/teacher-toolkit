import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(testDir, "..");
const [bank, generatorSource] = await Promise.all([
  readFile(path.join(siteRoot, "data", "hwg5-sentence-review.json"), "utf8").then(JSON.parse),
  readFile(path.join(siteRoot, "scripts", "generate-hwg5-tts.mjs"), "utf8"),
]);

test("all 15 HWG5 prompts have verified static American TTS metadata", () => {
  assert.equal(bank.questions.filter(question => question.type === "read_aloud").length, 8);
  assert.equal(bank.questions.filter(question => question.type === "question_answer").length, 7);

  for (const question of bank.questions) {
    const expectedText = question.type === "question_answer"
      ? question.questionText
      : question.standardReadSentence;
    assert.deepEqual(
      {
        provider: question.tts.provider,
        model: question.tts.model,
        voice: question.tts.voice,
        speed: question.tts.speed,
        text: question.tts.text,
        generationStatus: question.tts.generationStatus,
      },
      {
        provider: "openai",
        model: "gpt-4o-mini-tts",
        voice: "marin",
        speed: 0.8,
        text: expectedText,
        generationStatus: "generated_verified",
      },
      question.id,
    );
    assert.match(question.tts.path, /^audio\/hwg5-sr\/HWG5-SR-\d{3}\.mp3$/u);
    assert.equal(question.tts.assetVerification.status, "passed", question.id);
    assert.ok(question.tts.assetVerification.bytes > 1_000, question.id);
    assert.match(question.tts.assetVerification.sha256, /^[a-f0-9]{64}$/u, question.id);
    assert.ok(question.tts.assetVerification.durationSeconds >= 0.75, question.id);
  }
});

test("HWG5 TTS generator defaults to check-only and requires --execute for API calls", () => {
  assert.match(generatorSource, /const execute = process\.argv\.includes\("--execute"\)/u);
  assert.match(generatorSource, /if \(!execute\)/u);
  assert.match(generatorSource, /check_only_no_api_call/u);
  assert.match(generatorSource, /input: tts\.text/u);
  assert.match(generatorSource, /speed: tts\.speed/u);
  assert.match(generatorSource, /usableApiKey/u);
  assert.doesNotMatch(generatorSource, /<speak|SSML|console\.log\([^\n]*apiKey/iu);
});
