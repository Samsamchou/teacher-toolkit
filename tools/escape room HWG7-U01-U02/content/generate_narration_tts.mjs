// Generate static narration MP3s for the 6 story segments (HWG7).
// Same spec as tools/HWG7 Sentence review/pinball_site/scripts/generate-hwg5-tts.mjs:
// OpenAI gpt-4o-mini-tts, voice marin, speed 0.8, MP3, SHA-256 manifest.
//
//   node generate_narration_tts.mjs             check only, no API call
//   node generate_narration_tts.mjs --execute   call the paid API, write MP3s + manifest
//   add --force to overwrite existing files (never by default)
//
// The key is read only from the OPENAI_API_KEY environment variable and is never written anywhere.
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const bankPath = path.join(here, "question-bank.v0.1.json");
const outputRoot = path.join(projectRoot, "assets");
const manifestPath = path.join(outputRoot, "audio", "narration", "manifest.json");
const execute = process.argv.includes("--execute");
const force = process.argv.includes("--force");
const onlyArg = process.argv.indexOf("--only");
const only = onlyArg > 0 ? process.argv[onlyArg + 1].split(",") : [];

const instructions =
  "Read this short story passage in natural American English for Taiwanese elementary-school learners. " +
  "Use a warm, friendly storyteller voice, clear pronunciation, natural sentence stress and a short pause between sentences. " +
  "Read quoted lines with a little character expression. Do not add or omit words.";

const sha256 = buffer => createHash("sha256").update(buffer).digest("hex");
const isMp3 = b => b.length > 3 && (b.subarray(0, 3).toString("ascii") === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0));
const exists = p => access(p).then(() => true, e => { if (e?.code === "ENOENT") return false; throw e; });

function validate(bank) {
  const t = bank.narrationTts;
  if (t?.provider !== "openai" || t.model !== "gpt-4o-mini-tts" || t.voice !== "marin" || Number(t.speed) !== 0.8)
    throw new Error("narrationTts 設定不符合已確認規格（openai／gpt-4o-mini-tts／marin／0.8）。");
  const segs = Object.values(bank.story);
  if (segs.length !== 6) throw new Error(`預期 6 段旁白，實際 ${segs.length} 段。`);
  for (const s of segs) {
    if (s.tts?.text !== s.lines.join(" ")) throw new Error(`${s.id} 的 TTS 文字與畫面旁白不一致。`);
    if (!/^audio\/narration\/SEG-\d{2}\.mp3$/u.test(s.tts.path)) throw new Error(`${s.id} 音檔路徑不正確。`);
  }
  return segs;
}

async function speak(apiKey, t, seg) {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ model: t.model, voice: t.voice, input: seg.tts.text, instructions, response_format: "mp3", speed: t.speed }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`${seg.id} 語音產生失敗（HTTP ${res.status}）：${(await res.text()).replace(/\s+/gu, " ").slice(0, 300)}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 1_000 || !isMp3(buffer)) throw new Error(`${seg.id} MP3 格式或大小不正確。`);
  return buffer;
}

const bank = JSON.parse(await readFile(bankPath, "utf8"));
const segs = validate(bank).filter(s => !only.length || only.includes(s.id));
const words = segs.reduce((n, s) => n + s.tts.text.split(/\s+/u).length, 0);
const chars = segs.reduce((n, s) => n + s.tts.text.length, 0);

if (!execute) {
  const existing = [];
  for (const s of segs) if (await exists(path.join(outputRoot, s.tts.path))) existing.push(s.tts.path);
  console.log(JSON.stringify({ ok: true, mode: "check_only_no_api_call", segments: segs.length, words, chars,
    voice: bank.narrationTts.voice, speed: bank.narrationTts.speed, existing, apiKeyInEnv: Boolean(process.env.OPENAI_API_KEY) }, null, 2));
  process.exit(0);
}

// Same lookup as generate-hwg5-tts.mjs: a valid sk- key from the environment, else an existing
// local .env.local (gitignored). The key is never printed or written.
const usable = v => typeof v === "string" && /^sk-[\x21-\x7e]+$/u.test(v.trim());
async function readApiKey() {
  if (usable(process.env.OPENAI_API_KEY)) return process.env.OPENAI_API_KEY.trim();
  const candidates = [
    path.join(projectRoot, ".env.local"),
    path.resolve(projectRoot, "..", "HWG7 Sentence review", "pinball_site", ".env.local"),
  ];
  for (const file of candidates) {
    if (!(await exists(file))) continue;
    const line = (await readFile(file, "utf8")).split(/\r?\n/u).find(l => /^\s*OPENAI_API_KEY\s*=/u.test(l));
    const value = line?.replace(/^\s*OPENAI_API_KEY\s*=\s*/u, "").trim().replace(/^(['"])(.*)\1$/u, "$2");
    if (usable(value)) { console.log(`使用金鑰來源：${path.relative(path.resolve(projectRoot, ".."), file)}`); return value; }
  }
  throw new Error("找不到可用的 OPENAI_API_KEY（環境變數不是 sk- 格式，本機 .env.local 也沒有）。");
}
const apiKey = await readApiKey();
if (!force) {
  for (const s of segs) if (await exists(path.join(outputRoot, s.tts.path))) throw new Error(`${s.tts.path} 已存在；確定重建才加 --force。`);
  if (!only.length && await exists(manifestPath)) throw new Error("manifest 已存在；確定重建才加 --force。");
}
await mkdir(path.dirname(manifestPath), { recursive: true });
const items = [];
for (const s of segs) {
  const buffer = await speak(apiKey, bank.narrationTts, s);
  const out = path.join(outputRoot, s.tts.path);
  await writeFile(out, buffer, force ? undefined : { flag: "wx" });
  items.push({ id: s.id, path: s.tts.path, text: s.tts.text, bytes: buffer.length, sha256: sha256(buffer) });
  console.log(`${s.id}: ${buffer.length} bytes`);
}
await writeFile(manifestPath, JSON.stringify({
  createdAt: new Date().toISOString(), ...bank.narrationTts, instructions, webPlaybackRate: 1.0,
  sourceBank: path.basename(bankPath), sourceBankSha256: sha256(await readFile(bankPath)),
  // --only keeps the other segments' entries and replaces just the regenerated ones
  items: [...(only.length && await exists(manifestPath) ? JSON.parse(await readFile(manifestPath, "utf8")).items : [])
    .filter(p => !items.some(i => i.id === p.id)), ...items].sort((a, b) => a.id.localeCompare(b.id)),
}, null, 2) + "\n", "utf8");
console.log(`完成：${items.length} 段旁白語音；manifest=assets/audio/narration/manifest.json`);
