"use strict";

// Runs synthetic handwriting samples through the deployed v3 recognizer in
// dryRun mode (nothing is saved to Firestore) and prints a pass/fail table.
//
//   node scripts/verify-v3.cjs [outDir] [--only=neat,messy] [--limit=5]
//   node scripts/verify-v3.cjs [outDir] --cases=cases.json --variant=split:false
//   TEACHER_PASSWORD=... node scripts/verify-v3.cjs [outDir] --teacher-labeled
//
// --teacher-labeled re-runs every attempt the teacher marked as correct.

const fs = require("node:fs");
const path = require("node:path");
const { buildCases } = require("./synthetic-letters.cjs");

const BASE = "https://asia-east1-g5-remedial-action-verbs.cloudfunctions.net";
const args = process.argv.slice(2);
const outDir = args.find((a) => !a.startsWith("--")) || path.join(process.cwd(), "verification", "v3-run");
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const only = flag("only")?.split(",");
const limit = Number(flag("limit") || 0);
// --variant=split:true,colors:false,effort:low (dryRun only)
const variant = flag("variant")
  ? Object.fromEntries(flag("variant").split(",").map((pair) => {
      const [key, value] = pair.split(":");
      return [key, value === "true" ? true : value === "false" ? false : value];
    }))
  : undefined;

async function call(name, data) {
  const response = await fetch(`${BASE}/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  const body = await response.json();
  if (!response.ok || body.error) {
    throw new Error(`${name} ${response.status}: ${JSON.stringify(body.error || body)}`);
  }
  return body.result;
}

async function loadCases() {
  if (args.includes("--teacher-labeled")) {
    const password = process.env.TEACHER_PASSWORD;
    if (!password) throw new Error("Set TEACHER_PASSWORD to read teacher-labeled attempts.");
    const { attempts } = await call("getTeacherOverrides", { password });
    return attempts.map((a) => ({ group: "teacher-labeled", id: a.id, target: a.letter, expect: true, strokes: a.strokes }));
  }
  // --cases=file.json : pre-built cases [{group,id,target,expect,strokes}]
  let cases = flag("cases") ? JSON.parse(fs.readFileSync(flag("cases"), "utf8")) : buildCases();
  if (only) cases = cases.filter((c) => only.includes(c.group));
  if (limit) cases = cases.slice(0, limit);
  return cases;
}

async function main() {
  const cases = await loadCases();
  fs.mkdirSync(outDir, { recursive: true });
  const results = [];
  let next = 0;
  const worker = async () => {
    while (next < cases.length) {
      const c = cases[next++];
      try {
        const r = await call("analyzeLetterAttemptV3", {
          dryRun: true,
          variant,
          studentId: "V3-VERIFY",
          targetLetter: c.target,
          strokes: c.strokes,
        });
        const label = `${c.group}-${c.target}${c.id ? `-${c.id}` : ""}`;
        for (const side of ["left", "right"]) {
          const data = r[`${side}Image`]?.split(",")[1];
          if (data) fs.writeFileSync(path.join(outDir, `${label}-${side}.png`), Buffer.from(data, "base64"));
        }
        results.push({
          group: c.group, target: c.target, note: c.note, id: c.id, expect: c.expect,
          passed: r.passed, correct: r.passed === c.expect, variant: r.variant,
          model: r.aiModel, failedModels: r.failedModels, elapsedMs: r.elapsedMs,
          reading: r.aiRecognition, feedback: r.aiFeedback,
          leftGeometry: r.detail.left.geometry.ok, rightGeometry: r.detail.right.geometry.ok,
          leftRule: r.detail.left.identity.rule, rightRule: r.detail.right.identity.rule,
        });
        process.stdout.write(r.passed === c.expect ? "." : "x");
      } catch (error) {
        results.push({ group: c.group, target: c.target, expect: c.expect, error: error.message, correct: false });
        process.stdout.write("E");
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  process.stdout.write("\n");

  results.sort((a, b) => a.group.localeCompare(b.group) || a.target.localeCompare(b.target));
  fs.writeFileSync(path.join(outDir, "results.json"), JSON.stringify(results, null, 2));

  console.log("variant:", JSON.stringify(results.find((r) => r.variant)?.variant || variant || "default"));
  const groups = [...new Set(results.map((r) => r.group))];
  for (const group of groups) {
    const rows = results.filter((r) => r.group === group);
    const ok = rows.filter((r) => r.correct).length;
    console.log(`${group}: ${ok}/${rows.length} correct (${Math.round((ok / rows.length) * 100)}%)`);
    for (const r of rows.filter((x) => !x.correct)) {
      console.log(`   ✗ ${r.target}${r.note ? ` (${r.note})` : ""} expect=${r.expect} got=${r.passed} ${r.error || ""} ${r.reading || ""} geo=${r.leftGeometry}/${r.rightGeometry} ${r.feedback || ""}`);
    }
  }
  const times = results.filter((r) => r.elapsedMs).map((r) => r.elapsedMs).sort((a, b) => a - b);
  if (times.length) {
    console.log(`AI time: median ${times[Math.floor(times.length / 2)]} ms, max ${times.at(-1)} ms`);
    const models = {};
    for (const r of results) if (r.model) models[r.model] = (models[r.model] || 0) + 1;
    console.log("models used:", models, "failed before success:", [...new Set(results.flatMap((r) => r.failedModels || []))]);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
