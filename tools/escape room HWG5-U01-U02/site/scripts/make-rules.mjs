// Write firestore.rules from firestore.rules.template with the teacher account's uid.
//   node scripts/make-rules.mjs               uses quest-teacher.json (written when the teacher account is created)
//   node scripts/make-rules.mjs --uid <uid>   explicit uid (tests use a fake one)
// The uid is not a secret; the passcode is never stored anywhere in this project.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = process.argv.indexOf("--uid");
let uid = arg > 0 ? process.argv[arg + 1] : null;
const out = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : path.join(site, "firestore.rules");
if (!uid) {
  const f = path.join(site, "quest-teacher.json");
  if (!existsSync(f)) throw new Error("quest-teacher.json not found — create the teacher account first, or pass --uid");
  uid = JSON.parse(readFileSync(f, "utf8")).uid;
}
if (!/^[A-Za-z0-9_-]{6,128}$/u.test(uid)) throw new Error("teacher uid looks wrong");
const template = readFileSync(path.join(site, "firestore.rules.template"), "utf8");
writeFileSync(out, template.replaceAll("__TEACHER_UID__", uid), "utf8");
console.log(`wrote ${path.relative(site, out)} for teacher uid ${uid.slice(0, 6)}…`);
