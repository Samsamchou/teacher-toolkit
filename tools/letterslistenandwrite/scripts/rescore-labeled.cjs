"use strict";

// Offline regression check (no AI cost): re-scores saved attempts with the
// current functions/recognition-v3.js, using the AI candidates stored with
// each attempt, and compares against hand labels.
//
//   node scripts/rescore-labeled.cjs outputs/handwriting-20261102
//
// The folder needs attempts.json (scripts/export-attempts.mjs) and
// labels.json ([{ id, truth: "correct" | "wrong" | "ask", cause }]).
// Student data stays in outputs/ (ignored by git).

const path = require("node:path");
const v3 = require("../functions/recognition-v3.js");

const dir = path.resolve(process.argv[2] || "outputs/handwriting-20261102");
const attempts = require(path.join(dir, "attempts.json"));
const labels = require(path.join(dir, "labels.json"));
const byId = new Map(attempts.map((t) => [t.id, t]));

const rescore = (t) => {
  const d = t.aiRawResult?.detail;
  if (!d) return null;
  return v3.evaluateV3({
    targetLetter: t.letter,
    strokes: t.strokes,
    ai: { left: { candidates: d.left.candidates }, right: { candidates: d.right.candidates } },
  });
};

const stats = { correctPass: 0, correctTotal: 0, wrongFail: 0, wrongTotal: 0, ask: 0 };
const problems = [];
for (const label of labels) {
  const t = byId.get(label.id);
  const result = t && rescore(t);
  if (!result) continue;
  if (label.truth === "ask") {
    stats.ask += 1;
    continue;
  }
  if (label.truth === "correct") {
    stats.correctTotal += 1;
    if (result.passed) stats.correctPass += 1;
    else problems.push(`#${label.idx} ${t.letter} should pass (${label.cause}): ${result.feedback}`);
  } else {
    stats.wrongTotal += 1;
    if (!result.passed) stats.wrongFail += 1;
    else problems.push(`#${label.idx} ${t.letter} should FAIL (${label.cause})`);
  }
}

console.log(stats);
console.log(problems.join("\n") || "all labeled attempts match");
process.exitCode = problems.some((p) => p.includes("should FAIL")) ? 1 : 0;
