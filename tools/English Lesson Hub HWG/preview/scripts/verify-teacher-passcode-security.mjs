import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const readJson = async (name) => JSON.parse(await readFile(resolve(root, name), "utf8"));
const [source, firebaseJson, rules, functionSource, functionConfig, webClient, main] = await Promise.all([
  readJson("config/site-source.json"),
  readJson("firebase.json"),
  readFile(resolve(root, "firestore.rules"), "utf8"),
  readFile(resolve(root, "functions/index.cjs"), "utf8"),
  readFile(resolve(root, "functions/site-config.generated.cjs"), "utf8"),
  readFile(resolve(root, "src/lib/firebase-client.js"), "utf8"),
  readFile(resolve(root, "src/main.jsx"), "utf8")
]);
const errors = [];
const config = source.firebase?.teacherPasscode || {};
const functions = Array.isArray(firebaseJson.functions) ? firebaseJson.functions : [];
const functionTarget = functions.find((item) => item?.source === "functions" && item?.codebase === "teacher-access");
if (source.firebase?.functionsRegion !== "asia-east1") errors.push("Teacher Functions region must be asia-east1.");
if (config.secretName !== "TEACHER_RESULTS_PASSCODE") errors.push("Teacher passcode Secret name is missing or unexpected.");
if (config.loginFunction !== "teacherPasscodeLogin" || config.logoutFunction !== "teacherPasscodeLogout") errors.push("Teacher passcode Function names are inconsistent.");
if (!functionTarget) errors.push("firebase.json must declare the teacher-access Functions codebase.");
if (!functionSource.includes('defineSecret("TEACHER_RESULTS_PASSCODE")')) errors.push("Login Function must bind the teacher passcode Secret.");
if (!functionSource.includes("createCustomToken") || !functionSource.includes("teacherAccess: \"passcode\"")) errors.push("Login Function must mint a passcode-scoped custom token.");
if (!functionSource.includes("teacherLoginAttempts") || !functionSource.includes("GLOBAL_MAX_ATTEMPTS")) errors.push("Login Function must enforce server-side rate limits.");
if (!functionConfig.includes("functionsRegion") || !functionConfig.includes("teacherPasscodeLogin")) errors.push("Generated Functions configuration is missing.");
if (webClient.includes("GoogleAuthProvider") || webClient.includes("signInWithPopup")) errors.push("Frontend must not retain Google popup teacher login.");
if (!webClient.includes("signInWithCustomToken")) errors.push("Frontend must exchange the server-issued custom token.");
if (main.includes("Google 教師登入") || !main.includes('type="password"')) errors.push("Results page must show the passcode form instead of Google login.");
if (!rules.includes("match /teacherLoginAttempts/{attemptId}") || !rules.includes("allow read, write: if false")) errors.push("Function-owned rate-limit records must be denied to clients.");
const report = {
  status: errors.length ? "FAIL" : "PASS",
  serverSecretOnly: errors.every((error) => !error.includes("Secret")),
  customTokenFlow: functionSource.includes("createCustomToken") && webClient.includes("signInWithCustomToken"),
  rateLimit: functionSource.includes("teacherLoginAttempts"),
  googlePopupRemoved: !webClient.includes("GoogleAuthProvider") && !webClient.includes("signInWithPopup"),
  errors
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = errors.length ? 1 : 0;