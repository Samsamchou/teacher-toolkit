import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const readJson = async (name) => JSON.parse(await readFile(resolve(root, name), "utf8"));
const [source, firebaseJson, firebaserc, rules] = await Promise.all([
  readJson("config/site-source.json"),
  readJson("firebase.json"),
  readJson(".firebaserc"),
  readFile(resolve(root, "firestore.rules"), "utf8")
]);
const errors = [];
const warnings = [];
const publicConfigKeys = ["VITE_FIREBASE_API_KEY", "VITE_FIREBASE_AUTH_DOMAIN", "VITE_FIREBASE_PROJECT_ID", "VITE_FIREBASE_APP_ID"];
const envFile = {};
try {
  const contents = await readFile(resolve(root, ".env.production"), "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const separator = line.indexOf("=");
    if (separator > 0) envFile[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
const projectId = source.firebase?.projectId;
const hostingTarget = source.firebase?.hostingSiteId;
const hosting = Array.isArray(firebaseJson.hosting) ? firebaseJson.hosting : [];
const targets = firebaserc.targets?.[projectId]?.hosting || {};

if (projectId !== "hwg7teaching") errors.push("Firebase project must be hwg7teaching.");
if (firebaserc.projects?.default !== projectId) errors.push(".firebaserc default project does not match site source.");
if (hostingTarget !== "lesson-hub-v03") errors.push("Hosting site must be the dedicated lesson-hub-v03 target.");
if (hosting.length !== 1 || hosting[0]?.target !== hostingTarget) errors.push("firebase.json must contain exactly one dedicated Hosting target.");
if (JSON.stringify(targets?.[hostingTarget] || []) !== JSON.stringify([hostingTarget])) errors.push("Hosting target mapping must not point to the default site.");
for (const required of ["anonymousStudent", "request.auth.token.teacher", "allow list: if teacher", "allow delete: if teacher"]) {
  if (!rules.includes(required)) errors.push(`Firestore rules missing required guard: ${required}`);
}
const provided = publicConfigKeys.filter((key) => Boolean(process.env[key] || envFile[key]));
if (provided.length && provided.length !== publicConfigKeys.length) warnings.push("Only part of the Firebase public Web App configuration is present; production build will remain local-preview mode.");
if (!provided.length) warnings.push("Firebase public Web App configuration is not yet supplied; this preflight intentionally does not invent it.");
const report = {
  status: errors.length ? "FAIL" : "PASS",
  projectId,
  hostingSite: hostingTarget,
  defaultHostingUntouched: hosting[0]?.target === "lesson-hub-v03",
  firestoreRuleGuards: { anonymousCreate: rules.includes("allow create: if anonymousStudent()"), crossStudentListBlocked: rules.includes("allow list: if teacher()"), teacherClaim: rules.includes("request.auth.token.teacher") },
  publicWebConfig: provided.length === publicConfigKeys.length ? "present" : "pending",
  warnings,
  errors
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = errors.length ? 1 : 0;
