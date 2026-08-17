import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const mode = process.argv.includes("--formal") ? "formal" : "initial";
const [source, evidence] = await Promise.all([
  JSON.parse(await readFile(resolve(root, "config/site-source.json"), "utf8")),
  JSON.parse(await readFile(resolve(root, "config/firebase-preflight.json"), "utf8"))
]);
const errors = [];
const passcode = source.firebase?.teacherPasscode || {};
if (source.firebase?.projectId !== "hwg7teaching") errors.push("Unexpected Firebase project.");
if (passcode.secretName !== "TEACHER_RESULTS_PASSCODE") errors.push("Teacher Secret name is not configured.");
if (!evidence.secret?.enabledVersion || !evidence.secret?.verifiedAt) errors.push("Secret version metadata has not been verified without reading its value.");
if (mode === "formal") {
  if (!evidence.function?.runtimeServiceAccount) errors.push("Runtime service account has not been identified.");
  if (evidence.function?.tokenCreatorRoleConfigured !== true || evidence.function?.iamPropagationVerified !== true) errors.push("Token Creator IAM evidence is incomplete.");
  for (const key of ["anonymousEntryVerified", "wrongPasscodeBlocked", "teacherClaimVerified", "exportDeleteVerified"]) {
    if (evidence.liveVerification?.[key] !== true) errors.push(`Live verification missing: ${key}.`);
  }
}
const report = { status: errors.length ? "DEPLOYMENT_BLOCKED" : "DEPLOYMENT_GATE_PASSED", mode, secretName: passcode.secretName || null, errors };
console.log(JSON.stringify(report, null, 2));
process.exitCode = errors.length ? 1 : 0;