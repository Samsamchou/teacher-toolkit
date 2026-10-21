// 產生 HWG5 R1 聽力第 11–17 題的音檔（原始資料夾沒有這幾題的 MP3）。
// 沿用 HWG5 任務的 OpenAI 語音設定：gpt-4o-mini-tts、marin、0.8 倍速、美式英語。
// 金鑰由 HWG5 專案的 openai-audio.mjs 讀取（環境變數或 .env.local），不會印出或寫入任何檔案。
// 每段產生後用 whisper-1 轉文字，確認文稿的字都有念到。
// 用法：node tools/generate_listening_tts.mjs
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const helper = path.resolve(here, "..", "..", "..", "escape room HWG5-U01-U02", "content", "openai-audio.mjs");
const { readApiKey, tts, transcribe, coverage } = await import(pathToFileURL(helper).href);

const VOICE = { model: "gpt-4o-mini-tts", voice: "marin", speed: 0.8 };
const INSTRUCTIONS = "American English. Speak clearly and slowly for young English learners in Taiwan. Friendly teacher voice.";
const SCRIPTS = {
  L11: "I have ninety dollars.",
  L12: "I have one hundred dollars.",
  L13: "Does he have math class on Friday?",
  L14: "Does she have Chinese class on Friday?",
  L15: "Is it Sunday today?",
  L16: "Is it Saturday today?",
  L17: "What day is today?",
};

const outDir = path.resolve(here, "..", "assets", "audio", "listening");
await mkdir(outDir, { recursive: true });
const key = await readApiKey();
for (const [id, text] of Object.entries(SCRIPTS)) {
  const mp3 = await tts(key, VOICE, text, INSTRUCTIONS);
  const heard = await transcribe(key, mp3, `${id}.mp3`);
  const cov = coverage(text, heard.text || "");
  await writeFile(path.join(outDir, `${id}.mp3`), mp3);
  console.log(`${id}  ${mp3.length} bytes  heard="${heard.text}"  coverage=${cov.hit}/${cov.want}`);
}
