// Tick's answer-explanation audio: one MP3 per question (28, HWG7), same voice spec as the narration.
//
//   node generate_feedback_tts.mjs                    check only, no API call
//   node generate_feedback_tts.mjs --execute          paid API: TTS + transcription check per clip
//   add --only Q05,Q12 to limit, --force to overwrite existing clips
//
// Every clip is transcribed back; if any script word is missing (coverage < 100%) it is regenerated once,
// and a clip that still misses words is reported as FAIL (kept on disk for listening, not hidden).
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { coverage, readApiKey, transcribe, tts } from "./openai-audio.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const bank = JSON.parse(await readFile(path.join(here, "question-bank.v0.1.json"), "utf8"));
const args = process.argv.slice(2);
const execute = args.includes("--execute"), force = args.includes("--force");
const only = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",").filter(Boolean) : [];
const exists = p => access(p).then(() => true, e => { if (e?.code === "ENOENT") return false; throw e; });
const sha256 = b => createHash("sha256").update(b).digest("hex");

const instructions =
  "You are Tick, a small cheerful clock spirit, praising an elementary-school English learner in Taiwan. " +
  "Speak natural American English, warm and encouraging, with clear pronunciation. " +
  "When a word is spelled with hyphens, say each letter separately. Do not add or omit words.";

const items = bank.items.filter(i => !only.length || only.includes(i.id));
if (!execute) {
  console.log(JSON.stringify({ ok: true, mode: "check_only_no_api_call", clips: items.length,
    words: items.reduce((n, i) => n + i.feedbackTts.text.split(/\s+/u).length, 0), voice: bank.narrationTts.voice,
    speed: bank.narrationTts.speed, sample: items.slice(0, 3).map(i => `${i.id}: ${i.feedbackTts.text}`) }, null, 2));
  process.exit(0);
}

const apiKey = await readApiKey();
const outDir = path.join(projectRoot, "assets", "audio", "feedback");
await mkdir(outDir, { recursive: true });
const manifestPath = path.join(outDir, "manifest.json");
const manifest = (await exists(manifestPath)) ? JSON.parse(await readFile(manifestPath, "utf8")) : { items: {} };
let fails = 0;
for (const item of items) {
  const out = path.join(projectRoot, "assets", item.feedbackTts.path);
  if ((await exists(out)) && !force) { console.log(`${item.id}: exists, skipped`); continue; }
  let buffer, check, raw, tries = 0;
  do {
    tries++;
    buffer = await tts(apiKey, bank.narrationTts, item.feedbackTts.text, instructions);
    raw = await transcribe(apiKey, buffer, `${item.id}.mp3`);
    check = coverage(item.feedbackTts.text, raw.text || "");
  } while (check.ratio < 1 && tries < 2);
  await writeFile(out, buffer);
  const ok = check.ratio === 1;
  if (!ok) fails++;
  manifest.items[item.id] = { path: item.feedbackTts.path, text: item.feedbackTts.text, bytes: buffer.length,
    sha256: sha256(buffer), transcript: raw.text, duration: raw.duration, coverage: check, tries, ok };
  console.log(`${item.id}: ${ok ? "OK" : "FAIL"} ${check.hit}/${check.want} words, ${raw.duration?.toFixed(1)}s, tries ${tries} | heard: ${raw.text}`);
}
Object.assign(manifest, { updatedAt: new Date().toISOString(), ...bank.narrationTts, instructions, webPlaybackRate: 1.0 });
await writeFile(manifestPath, JSON.stringify(manifest, null, 1) + "\n", "utf8");
console.log(fails ? `完成，但有 ${fails} 段沒有通過字詞檢查，請試聽。` : "完成：全部通過字詞檢查。");
