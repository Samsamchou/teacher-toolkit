// Shared OpenAI audio helpers: key lookup, TTS, word-level transcription, word-coverage check.
// The key is never printed or written anywhere.
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exists = p => access(p).then(() => true, e => { if (e?.code === "ENOENT") return false; throw e; });

export async function readApiKey() {
  const usable = v => typeof v === "string" && /^sk-[\x21-\x7e]+$/u.test(v.trim());
  if (usable(process.env.OPENAI_API_KEY)) return process.env.OPENAI_API_KEY.trim();
  for (const file of [path.join(projectRoot, ".env.local"),
    path.resolve(projectRoot, "..", "HWG7 Sentence review", "pinball_site", ".env.local")]) {
    if (!(await exists(file))) continue;
    const line = (await readFile(file, "utf8")).split(/\r?\n/u).find(l => /^\s*OPENAI_API_KEY\s*=/u.test(l));
    const value = line?.replace(/^\s*OPENAI_API_KEY\s*=\s*/u, "").trim().replace(/^(['"])(.*)\1$/u, "$2");
    if (usable(value)) return value;
  }
  throw new Error("找不到可用的 OPENAI_API_KEY。");
}

const isMp3 = b => b.length > 3 && (b.subarray(0, 3).toString("ascii") === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0));

export async function tts(apiKey, { model, voice, speed }, input, instructions) {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ model, voice, input, instructions, response_format: "mp3", speed }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`TTS 失敗（HTTP ${res.status}）：${(await res.text()).replace(/\s+/gu, " ").slice(0, 300)}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 1_000 || !isMp3(buffer)) throw new Error("TTS 回傳的 MP3 格式或大小不正確。");
  return buffer;
}

export async function transcribe(apiKey, buffer, name = "audio.mp3") {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: "audio/mpeg" }), name);
  form.append("model", "whisper-1");
  form.append("language", "en");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form, signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`轉文字失敗（HTTP ${res.status}）：${(await res.text()).slice(0, 300)}`);
  return res.json();
}

// Fraction of the script's words heard in the transcript (order-independent, hyphen spellings merged).
export function coverage(script, transcript) {
  const NUM = { nine: "9", fifty: "50" };
  const toks = t => {
    const raw = t.toLowerCase().split(/[^a-z0-9']+/u).filter(Boolean).map(w => NUM[w] || w);
    const out = []; // merge runs of single letters ("t u e s d a y" / "t-u-e-s-d-a-y") into one word
    for (const w of raw) {
      const letter = w.length === 1 && /[a-z]/u.test(w) && w !== "a";
      if (letter && out.at(-1)?.spell) out.at(-1).w += w;
      else out.push({ w, spell: letter });
    }
    return out.map(x => x.w);
  };
  const heard = toks(transcript);
  const want = toks(script);
  const pool = heard.slice();
  let hit = 0;
  for (const w of want) { const i = pool.indexOf(w); if (i >= 0) { hit++; pool.splice(i, 1); } }
  return { ratio: want.length ? hit / want.length : 1, want: want.length, hit };
}
