// Read-only export of letter attempts from Firestore (uses `gcloud auth print-access-token`,
// account u9431818). Student data goes to outputs/ only (not committed).
//   node scripts/export-attempts.mjs 2026-11-02 outputs/handwriting-20261102
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [dateKey, outDir] = process.argv.slice(2);
const token = execSync("gcloud auth print-access-token", { encoding: "utf8", shell: true }).trim();
const BASE = "https://firestore.googleapis.com/v1/projects/g5-remedial-action-verbs/databases/(default)/documents";

const decode = (v) => {
  if (v == null) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(decode);
  if ("mapValue" in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, decode(x)]));
  return v;
};

async function query(collection) {
  const res = await fetch(`${BASE}:runQuery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: { fieldFilter: { field: { fieldPath: "dateKey" }, op: "EQUAL", value: { stringValue: dateKey } } },
      },
    }),
  });
  if (!res.ok) throw new Error(`${collection} ${res.status} ${await res.text()}`);
  const rows = await res.json();
  return rows.filter((r) => r.document).map((r) => ({
    id: r.document.name.split("/").pop(),
    ...decode({ mapValue: { fields: r.document.fields } }),
  }));
}

fs.mkdirSync(outDir, { recursive: true });
const attempts = await query("letterPracticeAttempts");
const sessions = await query("letterPracticeSessions");
fs.writeFileSync(path.join(outDir, "attempts.json"), JSON.stringify(attempts));
fs.writeFileSync(path.join(outDir, "sessions.json"), JSON.stringify(sessions, null, 1));
console.log(`attempts ${attempts.length}, sessions ${sessions.length}`);
