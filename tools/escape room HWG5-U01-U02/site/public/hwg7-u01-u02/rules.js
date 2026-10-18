// Pure game rules (no DOM): step order, tiles, grading, item quality, rewards, summary.

// Linear flow: a story segment opens the first time its items start; a battle follows every
// item whose battleAfter is set; the ending (bank.endingSegment, SEG-06 in HWG7) and the result page close the run.
export function buildSteps(bank) {
  const steps = [];
  const opened = new Set();
  for (const item of bank.items) {
    if (!opened.has(item.segment)) {
      opened.add(item.segment);
      steps.push({ kind: "story", seg: item.segment });
    }
    steps.push({ kind: "item", seq: item.seq });
    if (item.battleAfter) steps.push({ kind: "battle", id: item.battleAfter });
  }
  steps.push({ kind: "story", seg: bank.endingSegment });
  steps.push({ kind: "result" });
  return steps;
}

// Seeded shuffle so a resumed attempt shows the same tile order.
export function seededShuffle(list, seed) {
  const out = list.slice();
  let s = 0;
  for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Tiles carry opaque ids (index after shuffle) so the id never encodes the answer position.
export function buildTiles(item, seed) {
  const texts = item.type === "spell"
    ? [...item.spell.answer.replaceAll(" ", ""), ...item.spell.distractorLetters]
    : [...item.blanks.map(b => b.answer), ...item.distractors];
  return seededShuffle(texts, `${seed}:${item.id}`).map((text, i) => ({ id: `t${i}`, text }));
}

export function slotCount(item) {
  return item.type === "spell" ? item.spell.answer.replaceAll(" ", "").length : item.blanks.length;
}

// placed: array (slot index -> tile id or null)
export function isComplete(item, placed) {
  return placed.length === slotCount(item) && placed.every(Boolean);
}

export function grade(item, tiles, placed) {
  if (!isComplete(item, placed)) return false;
  const text = id => tiles.find(t => t.id === id)?.text;
  if (item.type === "spell") return placed.map(text).join("") === item.spell.answer.replaceAll(" ", "");
  return item.blanks.every((b, i) => text(placed[i]) === b.answer);
}

// Lesson Hub rule: the submission that first gets it fully right decides item quality 4/3/2/1.
export function qualityFor(attempts) {
  return Math.max(1, 5 - attempts);
}

// Hint ladder: none before the first wrong answer, hint 1 after one wrong, hint 2 after two or more.
export function hintFor(item, wrongCount) {
  if (wrongCount <= 0) return null;
  return wrongCount === 1 ? item.hint1En : item.hint2En;
}

// Battle reward quality = average quality of the items played since the previous battle.
export function battleQuality(bank, battleId, itemRecords) {
  const battle = bank.battles.find(b => b.id === battleId);
  const prev = bank.battles[bank.battles.indexOf(battle) - 1];
  const from = prev ? prev.after : 0;
  const qs = bank.items.filter(i => i.seq > from && i.seq <= battle.after)
    .map(i => itemRecords[i.seq]?.quality || 1);
  return Math.round(qs.reduce((a, b) => a + b, 0) / qs.length);
}

export function summary(bank, state) {
  const recs = bank.items.map(i => state.items[i.seq] || {});
  return {
    total: bank.items.length,
    finished: recs.filter(r => r.finalCorrect).length,
    firstTry: recs.filter(r => r.firstTryCorrect).length,
    attempts: recs.reduce((n, r) => n + (r.attempts || 0), 0),
    hintsUsed: recs.filter(r => r.hintUsed).length,
    battlesDone: Object.keys(state.battles || {}).length,
  };
}

// Clock hand angles in degrees, 0 = 12 o'clock, clockwise.
export function clockAngles(time) {
  const [h, m] = time.split(":").map(Number);
  return { hour: ((h % 12) + m / 60) * 30, minute: m * 6 };
}

export const STUDENT_ID = /^\d{5,8}$/;
