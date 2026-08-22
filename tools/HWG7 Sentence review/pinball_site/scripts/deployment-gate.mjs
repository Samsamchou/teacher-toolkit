import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const EXPECTED_CONFIRMATION = "確認部署 setencerevieworalpractice";
const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

function fail(message) {
  console.error(`DEPLOYMENT_BLOCKED: ${message}`);
  process.exit(1);
}

function requireCondition(condition, message) {
  if (!condition) fail(message);
}

requireCondition(
  process.env.FIREBASE_DEPLOY_CONFIRMATION === EXPECTED_CONFIRMATION,
  `需要明確部署口令：${EXPECTED_CONFIRMATION}`,
);

const firebase = JSON.parse(readFileSync(resolve(projectRoot, "firebase.json"), "utf8"));
const mirror = JSON.parse(readFileSync(resolve(projectRoot, "config", "firebase.json"), "utf8"));
requireCondition(firebase.functions?.runtime === "nodejs22", "Functions runtime 必須鎖定 nodejs22。");
requireCondition(
  Array.isArray(firebase.functions?.predeploy) && firebase.functions.predeploy.includes("node scripts/deployment-gate.mjs"),
  "Firebase predeploy 未連接部署閘門。",
);
requireCondition(JSON.stringify(firebase) === JSON.stringify(mirror), "根目錄與 config/firebase.json 不一致。");

const indexHtml = readFileSync(resolve(projectRoot, "index.html"), "utf8");
const appCheckMatch = indexHtml.match(/const\s+appCheckSiteKey\s*=\s*["']([^"']*)["']/u);
const appCheckSiteKey = appCheckMatch?.[1]?.trim() ?? "";
requireCondition(appCheckSiteKey.length >= 20, "尚未填入正式 Firebase App Check 網站金鑰。");
requireCondition(!/placeholder|replace|todo|example/iu.test(appCheckSiteKey), "App Check 網站金鑰仍是預留值。");
requireCondition(indexHtml.includes('projectId: "setencerevieworalpractice"'), "前端 Firebase projectId 不正確。");

const bank = JSON.parse(readFileSync(resolve(projectRoot, "data", "hwg7-sentence-review.json"), "utf8"));
requireCondition(bank.review?.status === "teacher_confirmed", "題庫尚未標記教師確認。");
requireCondition(Array.isArray(bank.review?.pending) && bank.review.pending.length === 0, "題庫仍有待複核項目。");
requireCondition(bank.review?.productionReviewRequired === false, "題庫仍要求正式複核。");
requireCondition(Array.isArray(bank.questions) && bank.questions.length === 13, "正式題庫必須正好 13 題。");
requireCondition(bank.questions.every((question) => question.passScore === 80), "所有題目達標分數必須為 80。");

for (const rulesFile of ["firestore.rules", "storage.rules"]) {
  const rules = readFileSync(resolve(projectRoot, rulesFile), "utf8");
  requireCondition(rules.includes("allow read, write: if false;"), `${rulesFile} 必須拒絕瀏覽器直接讀寫。`);
}

console.log(JSON.stringify({
  ok: true,
  targetProject: "setencerevieworalpractice",
  runtime: firebase.functions.runtime,
  questionCount: bank.questions.length,
  appCheckConfigured: true,
}));