import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDir, "..");
const bankPath = path.join(siteRoot, "data", "hwg7-sentence-review.json");
const outputDir = path.join(siteRoot, "audio", "hwg7-sr");
const manifestPath = path.join(outputDir, "manifest.json");
const instructions = "Speak in natural American English for a Taiwanese elementary-school learner. Use a warm, clear voice, accurate sentence stress, natural phrasing, and falling statement intonation. Do not add or omit words.";

function unquote(value) {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function usableApiKey(value) {
  return typeof value === "string" && /^sk-[\x21-\x7e]+$/u.test(value.trim());
}

async function readExistingApiKey() {
  const processKey = process.env.OPENAI_API_KEY?.trim();
  if (usableApiKey(processKey)) return processKey;
  const candidates = [
    path.join(siteRoot, ".env.local"),
    path.join(siteRoot, "..", ".env.local"),
    path.join(siteRoot, "functions", ".env.local"),
  ];
  for (const candidate of candidates) {
    try {
      const source = await readFile(candidate, "utf8");
      const line = source.split(/\r?\n/u).find((item) => /^\s*OPENAI_API_KEY\s*=/u.test(item));
      if (!line) continue;
      const value = unquote(line.replace(/^\s*OPENAI_API_KEY\s*=\s*/u, ""));
      if (usableApiKey(value)) return value;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  throw new Error("找不到既有 OPENAI_API_KEY；請先完成本機秘密設定。");
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function isMp3(buffer) {
  if (buffer.length < 3) return false;
  if (buffer.subarray(0, 3).toString("ascii") === "ID3") return true;
  return buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;
}

async function generateSpeech(apiKey, question) {
  const tts = question.tts;
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      model: tts.model,
      voice: tts.voice,
      input: question.standardReadSentence,
      instructions,
      response_format: "mp3",
      speed: tts.speed,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    const detail = (await response.text()).replace(/\s+/gu, " ").slice(0, 400);
    throw new Error(`${question.id} 語音產生失敗（HTTP ${response.status}）：${detail}`);
  }
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("audio")) {
    throw new Error(`${question.id} 回傳格式不是音訊：${contentType || "missing"}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 1_000 || !isMp3(buffer)) {
    throw new Error(`${question.id} MP3 檔案格式或大小不正確。`);
  }
  return { buffer, contentType };
}

async function main() {
  const apiKey = await readExistingApiKey();
  const bank = JSON.parse(await readFile(bankPath, "utf8"));
  const questions = bank.questions.filter((question) => question.type === "read_aloud");
  if (questions.length !== 7) throw new Error(`預期 7 題朗讀題，實際為 ${questions.length} 題。`);
  await mkdir(outputDir, { recursive: true });

  const items = [];
  for (const question of questions) {
    const tts = question.tts || {};
    if (
      tts.provider !== "openai" ||
      tts.model !== "gpt-4o-mini-tts" ||
      tts.voice !== "marin" ||
      Number(tts.speed) !== 0.8 ||
      !/^audio\/hwg7-sr\/HWG7-SR-\d{3}\.mp3$/u.test(tts.path || "")
    ) {
      throw new Error(`${question.id} 的 TTS 設定不符合已確認規格。`);
    }
    const outputPath = path.join(siteRoot, ...tts.path.split("/"));
    const { buffer, contentType } = await generateSpeech(apiKey, question);
    await writeFile(outputPath, buffer);
    const item = {
      questionId: question.id,
      input: question.standardReadSentence,
      path: tts.path,
      bytes: buffer.length,
      sha256: sha256(buffer),
      contentType,
    };
    items.push(item);
    console.log(`${question.id}: ${buffer.length} bytes, SHA-256 ${item.sha256}`);
  }

  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    disclosure: "AI-generated voice",
    provider: "OpenAI",
    model: "gpt-4o-mini-tts",
    voice: "marin",
    speed: 0.8,
    responseFormat: "mp3",
    processing: "native_tts_speed_parameter",
    instructions,
    itemCount: items.length,
    items,
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`完成：${items.length} 段示範語音；manifest=${path.relative(siteRoot, manifestPath)}`);
}

await main();