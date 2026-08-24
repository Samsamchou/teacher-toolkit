import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDir, "..");
const bankPath = path.join(siteRoot, "data", "hwg5-sentence-review.json");
const outputDir = path.join(siteRoot, "audio", "hwg5-sr");
const manifestPath = path.join(outputDir, "manifest.json");
const execute = process.argv.includes("--execute");
const force = process.argv.includes("--force");

const statementInstructions = "Speak in natural American English for a Taiwanese elementary-school learner. Use a warm, clear voice, accurate sentence stress, natural phrasing, and falling statement intonation. Do not add or omit words.";
const questionInstructions = "Ask this question in natural American English for a Taiwanese elementary-school learner. Use a warm, clear voice, accurate question stress, natural phrasing, and natural American question intonation. Do not answer the question and do not add or omit words.";

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
      const line = source.split(/\r?\n/u).find(item => /^\s*OPENAI_API_KEY\s*=/u.test(item));
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

function expectedText(question) {
  return question.type === "question_answer" ? question.questionText : question.standardReadSentence;
}

function validateQuestions(bank) {
  if (bank.mode?.unitId !== "hwg5-sr") throw new Error("題庫 unitId 不是 hwg5-sr。");
  if (!Array.isArray(bank.questions) || bank.questions.length !== 15) {
    throw new Error(`預期 15 題，實際為 ${bank.questions?.length ?? 0} 題。`);
  }
  const ids = new Set();
  const paths = new Set();
  for (const question of bank.questions) {
    const tts = question.tts || {};
    const text = expectedText(question);
    if (!text || tts.text !== text) throw new Error(`${question.id} 的 TTS 文字與題型顯示文字不一致。`);
    if (
      tts.provider !== "openai" ||
      tts.model !== "gpt-4o-mini-tts" ||
      tts.voice !== "marin" ||
      Number(tts.speed) !== 0.8 ||
      !/^audio\/hwg5-sr\/HWG5-SR-\d{3}\.mp3$/u.test(tts.path || "")
    ) {
      throw new Error(`${question.id} 的 TTS 設定不符合已確認規格。`);
    }
    if (ids.has(question.id) || paths.has(tts.path)) throw new Error(`${question.id} 的 ID 或音檔路徑重複。`);
    ids.add(question.id);
    paths.add(tts.path);
  }
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
      input: tts.text,
      instructions: question.type === "question_answer" ? questionInstructions : statementInstructions,
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

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function main() {
  const bank = JSON.parse(await readFile(bankPath, "utf8"));
  validateQuestions(bank);

  const counts = bank.questions.reduce((result, question) => {
    result[question.type] = (result[question.type] || 0) + 1;
    return result;
  }, {});
  if (!execute) {
    console.log(JSON.stringify({
      ok: true,
      mode: "check_only_no_api_call",
      unitId: bank.mode.unitId,
      itemCount: bank.questions.length,
      counts,
      model: "gpt-4o-mini-tts",
      voice: "marin",
      speed: 0.8,
    }, null, 2));
    console.log("尚未呼叫 OpenAI API；取得正式 TTS 授權後才可加上 --execute。");
    return;
  }

  const apiKey = await readExistingApiKey();
  await mkdir(outputDir, { recursive: true });
  if (!force) {
    const existing = [];
    for (const question of bank.questions) {
      const outputPath = path.join(siteRoot, ...question.tts.path.split("/"));
      if (await pathExists(outputPath)) existing.push(question.tts.path);
    }
    if (existing.length > 0 || await pathExists(manifestPath)) {
      throw new Error("目標音檔或 manifest 已存在；為避免覆寫，請先檢查現有資產。確定要重建時才使用 --force。");
    }
  }

  const items = [];
  for (const question of bank.questions) {
    const { buffer, contentType } = await generateSpeech(apiKey, question);
    const outputPath = path.join(siteRoot, ...question.tts.path.split("/"));
    await writeFile(outputPath, buffer, force ? undefined : { flag: "wx" });
    const item = {
      questionId: question.id,
      questionType: question.type,
      input: question.tts.text,
      path: question.tts.path,
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
    instructions: {
      readAloud: statementInstructions,
      questionAnswerPrompt: questionInstructions,
    },
    itemCount: items.length,
    items,
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`完成：${items.length} 段示範語音；manifest=${path.relative(siteRoot, manifestPath)}`);
}

await main();
