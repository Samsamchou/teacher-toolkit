// Precise word timings for the 6 narration MP3s (HWG7) via OpenAI speech-to-text (whisper-1, word timestamps).
//
//   node transcribe_word_timing.mjs             check only, no API call
//   node transcribe_word_timing.mjs --execute   call the paid API (asks nothing; run only with teacher approval)
//
// The transcript is only used for timing: each word of the approved narration text is matched to a
// transcribed word by sequence alignment, so the on-screen text never changes. Words the API missed
// get times interpolated from their neighbours (reported per segment).
// Output per segment: assets/audio/narration/SEG-xx.timing.json (+ SEG-xx.whisper.json raw response).
import { createHash } from "node:crypto";
import { access, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const audioDir = path.join(projectRoot, "assets", "audio", "narration");
const bank = JSON.parse(await readFile(path.join(here, "question-bank.v0.1.json"), "utf8"));
const execute = process.argv.includes("--execute");
const exists = p => access(p).then(() => true, e => { if (e?.code === "ENOENT") return false; throw e; });

const norm = w => w.toLowerCase().replace(/[^a-z0-9]/gu, "");
function sim(a, b) { // 0..1 character similarity
  if (a === b) return 1;
  const m = a.length, n = b.length;
  if (!m || !n) return 0;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - d[m][n] / Math.max(m, n);
}

// Needleman–Wunsch: narration words (A) vs transcript words (B)
function alignWords(A, B) {
  const GAP = 0.7;
  const m = A.length, n = B.length;
  const cost = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  const move = Array.from({ length: m + 1 }, () => Array(n + 1).fill(""));
  for (let i = 1; i <= m; i++) { cost[i][0] = i * GAP; move[i][0] = "up"; }
  for (let j = 1; j <= n; j++) { cost[0][j] = j * GAP; move[0][j] = "left"; }
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    const diag = cost[i - 1][j - 1] + (1 - sim(norm(A[i - 1]), norm(B[j - 1].word)));
    const up = cost[i - 1][j] + GAP, left = cost[i][j - 1] + GAP;
    cost[i][j] = Math.min(diag, up, left);
    move[i][j] = cost[i][j] === diag ? "diag" : cost[i][j] === up ? "up" : "left";
  }
  const map = Array(m).fill(null);
  let i = m, j = n;
  while (i > 0 || j > 0) {
    const mv = move[i][j];
    if (mv === "diag") { if (sim(norm(A[i - 1]), norm(B[j - 1].word)) >= 0.5) map[i - 1] = j - 1; i--; j--; }
    else if (mv === "up") i--;
    else j--;
  }
  return map;
}

async function readApiKey() {
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

async function transcribe(apiKey, mp3Path) {
  const form = new FormData();
  form.append("file", new Blob([await readFile(mp3Path)], { type: "audio/mpeg" }), path.basename(mp3Path));
  form.append("model", "whisper-1");
  form.append("language", "en");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form, signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`${path.basename(mp3Path)} 轉文字失敗（HTTP ${res.status}）：${(await res.text()).slice(0, 300)}`);
  return res.json();
}

const onlyArg = process.argv.indexOf("--only");
const only = onlyArg > 0 ? process.argv[onlyArg + 1].split(",") : [];
const segs = Object.values(bank.story).filter(s => !only.length || only.includes(s.id));
if (!execute) {
  console.log(JSON.stringify({ ok: true, mode: "check_only_no_api_call", segments: segs.map(s => s.id), model: "whisper-1" }, null, 2));
  process.exit(0);
}
const apiKey = await readApiKey();
const report = [];
for (const s of segs) {
  const mp3 = path.join(projectRoot, "assets", s.tts.path);
  const raw = await transcribe(apiKey, mp3);
  await writeFile(path.join(audioDir, `${s.id}.whisper.json`), JSON.stringify(raw, null, 1) + "\n", "utf8");
  const words = s.lines.flatMap((l, li) => l.split(/\s+/u).map(w => ({ w, line: li })));
  const map = alignWords(words.map(x => x.w), raw.words || []);
  // matched words take API times; gaps are interpolated between matched neighbours
  const times = map.map(j => (j == null ? null : [raw.words[j].start, raw.words[j].end]));
  const dur = raw.duration ?? 0;
  for (let i = 0; i < times.length; i++) {
    if (times[i]) continue;
    let a = i - 1; while (a >= 0 && !times[a]) a--;
    let b = i + 1; while (b < times.length && !times[b]) b++;
    const from = a >= 0 ? times[a][1] : 0, to = b < times.length ? times[b][0] : dur;
    const k = b - a - 1, pos = i - a;
    const st = from + ((to - from) * (pos - 1)) / k, en = from + ((to - from) * pos) / k;
    times[i] = [st, en];
  }
  const missed = map.filter(j => j == null).length;
  const mp3Sha = createHash("sha256").update(await readFile(mp3)).digest("hex");
  const out = path.join(audioDir, `${s.id}.timing.json`);
  if (await exists(out)) {
    const old = JSON.parse(await readFile(out, "utf8"));
    if (!String(old.method).startsWith("openai")) await rename(out, path.join(audioDir, `${s.id}.timing.approx.json`));
  }
  await writeFile(out, JSON.stringify({
    segment: s.id, duration: dur, method: "openai whisper-1 word timestamps + text alignment",
    mp3Sha256: mp3Sha, matched: words.length - missed, interpolated: missed,
    words: words.map((x, i) => ({ w: x.w, line: x.line, s: +times[i][0].toFixed(3), e: +times[i][1].toFixed(3) })),
  }, null, 1) + "\n", "utf8");
  report.push(`${s.id}: ${words.length} words, matched ${words.length - missed}, interpolated ${missed}; transcript: "${raw.text?.slice(0, 70)}…"`);
  console.log(report.at(-1));
}
