import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const EXPECTED_PROJECT = "setencerevieworalpractice";
export const EXPECTED_CONFIRMATION = `確認部署 ${EXPECTED_PROJECT}`;
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function resolveProjectFile(root, relativePath, label) {
  requireCondition(typeof relativePath === "string" && relativePath.length > 0, `${label} 路徑缺失。`);
  const normalized = relativePath.replaceAll("\\", "/");
  requireCondition(!normalized.startsWith("/") && !normalized.split("/").includes(".."), `${label} 路徑超出專案範圍。`);
  const absolutePath = resolve(root, ...normalized.split("/"));
  const fromRoot = relative(root, absolutePath);
  requireCondition(fromRoot !== "" && fromRoot !== ".." && !fromRoot.startsWith(`..${sep}`), `${label} 路徑超出專案範圍。`);
  return absolutePath;
}

function readJson(root, relativePath, label) {
  const absolutePath = resolveProjectFile(root, relativePath, label);
  requireCondition(existsSync(absolutePath), `${label} 不存在：${relativePath}`);
  return JSON.parse(readFileSync(absolutePath, "utf8"));
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function validateAssetFile(root, item, pathKey, label) {
  const assetPath = item?.[pathKey];
  const absolutePath = resolveProjectFile(root, assetPath, label);
  requireCondition(existsSync(absolutePath), `${label} 不存在：${assetPath}`);
  const bytes = readFileSync(absolutePath);
  requireCondition(bytes.length > 1000, `${label} 檔案過小：${assetPath}`);
  if (Number.isFinite(Number(item.bytes))) {
    requireCondition(bytes.length === Number(item.bytes), `${label} bytes 與 manifest 不一致：${assetPath}`);
  }
  if (item.sha256) {
    requireCondition(sha256(bytes) === item.sha256, `${label} SHA-256 與 manifest 不一致：${assetPath}`);
  }
  return assetPath;
}

export function validateReadySpeechUnit(root, unit) {
  const label = unit?.label || unit?.id || "未知單元";
  requireCondition(unit?.status === "ready", `${label} 不是 ready 單元。`);
  requireCondition(unit?.interactionType === "speech_assessment", `${label} 不是口說評測單元。`);
  requireCondition(/^[a-z0-9-]+$/u.test(unit.id || ""), `${label} unit ID 不安全。`);
  requireCondition(Array.isArray(unit.readinessBlockers) ? unit.readinessBlockers.length === 0 : true, `${label} 仍有 readiness blocker。`);
  for (const key of ["questionBankFile", "questionBankScript", "questionBankVersion", "rubricVersion", "questionBankGlobal"]) {
    requireCondition(typeof unit[key] === "string" && unit[key].length > 0, `${label} 缺少 ${key}。`);
  }

  const bank = readJson(root, unit.questionBankFile, `${label} 私有題庫`);
  requireCondition(bank.mode?.unitId === unit.id, `${label} 題庫 unitId 不一致。`);
  requireCondition(bank.mode?.questionBankVersion === unit.questionBankVersion, `${label} 題庫版本不一致。`);
  requireCondition(bank.mode?.rubricVersion === unit.rubricVersion, `${label} 評分版本不一致。`);
  requireCondition(bank.review?.status === "teacher_confirmed", `${label} 尚未標記教師確認。`);
  for (const pendingKey of ["pending", "pendingContentDecisions"]) {
    if (bank.review?.[pendingKey] !== undefined) {
      requireCondition(Array.isArray(bank.review[pendingKey]) && bank.review[pendingKey].length === 0, `${label} 仍有待複核項目。`);
    }
  }
  if (bank.review?.productionReviewRequired !== undefined) {
    requireCondition(bank.review.productionReviewRequired === false, `${label} 仍要求正式複核。`);
  }
  if (bank.review?.studentPilotAllowedAfterTechnicalQa !== undefined) {
    requireCondition(bank.review.studentPilotAllowedAfterTechnicalQa === true, `${label} 尚未開放學生技術測試。`);
  }

  const questions = bank.questions;
  requireCondition(Array.isArray(questions) && questions.length >= 12, `${label} 題庫至少需要 12 題。`);
  requireCondition(bank.game?.bankSize === undefined || bank.game.bankSize === questions.length, `${label} bankSize 與題數不一致。`);
  requireCondition(unit.questionsPerGame === 12 && unit.roundsPerPlayer === 6, `${label} 必須維持每局 12 題、每位 6 回合。`);
  requireCondition(new Set(questions.map(question => question.id)).size === questions.length, `${label} 題目 ID 不唯一。`);
  requireCondition(questions.every(question => question.unitId === unit.id), `${label} 題目 unitId 不完整。`);
  requireCondition(questions.every(question => question.questionBankVersion === unit.questionBankVersion), `${label} 題目版本不一致。`);
  requireCondition(questions.every(question => question.passScore === unit.passScore && question.passScore === 80), `${label} 所有題目達標分數必須為 80。`);
  requireCondition(questions.every(question => question.maxAttempts === unit.maxAttempts && question.maxAttempts === 3), `${label} 所有題目最多有效作答次數必須為 3。`);

  const imagePaths = questions.map(question => question.image?.path);
  requireCondition(imagePaths.every(Boolean) && new Set(imagePaths).size === questions.length, `${label} 每題必須有唯一題圖。`);
  for (const [index, imagePath] of imagePaths.entries()) {
    const absolutePath = resolveProjectFile(root, imagePath, `${label} 第 ${index + 1} 題題圖`);
    requireCondition(existsSync(absolutePath) && statSync(absolutePath).size > 1000, `${label} 題圖不存在或過小：${imagePath}`);
  }

  const ttsQuestions = questions.filter(question => question.tts?.path);
  requireCondition(questions.filter(question => question.type === "read_aloud").every(question => question.tts?.path), `${label} 每個朗讀題都必須有靜態示範音檔。`);
  requireCondition(ttsQuestions.length > 0, `${label} 沒有任何靜態示範音檔。`);
  const ttsManifestPath = `audio/${unit.id}/manifest.json`;
  const ttsManifest = readJson(root, ttsManifestPath, `${label} TTS manifest`);
  requireCondition(ttsManifest.itemCount === ttsQuestions.length && ttsManifest.items?.length === ttsQuestions.length, `${label} TTS manifest 數量不一致。`);
  const ttsById = new Map(ttsManifest.items.map(item => [item.questionId, item]));
  requireCondition(ttsById.size === ttsQuestions.length, `${label} TTS manifest 題目 ID 不唯一。`);
  for (const question of ttsQuestions) {
    const item = ttsById.get(question.id);
    const expectedText = question.tts.text || (question.type === "read_aloud" ? question.standardReadSentence : question.questionText);
    requireCondition(item?.path === question.tts.path, `${label} ${question.id} TTS 路徑不一致。`);
    requireCondition(item.input === expectedText, `${label} ${question.id} TTS 文字不一致。`);
    validateAssetFile(root, item, "path", `${label} ${question.id} TTS`);
  }

  if (unit.id === "hwg5-sr") {
    requireCondition(questions.length === 15, "HWG5 SR 正式題庫必須正好 15 題。");
    requireCondition(imagePaths.length === 15, "HWG5 SR 必須正好有 15 張題圖。");
    requireCondition(ttsQuestions.length === 15, "HWG5 SR 題型 1 與題型 2 必須正好有 15 段靜態示範音檔。");
    requireCondition(ttsManifest.model === "gpt-4o-mini-tts" && ttsManifest.voice === "marin" && Number(ttsManifest.speed) === 0.8, "HWG5 SR TTS 必須使用 gpt-4o-mini-tts、marin、0.8 倍速。");
    const imageManifest = readJson(root, "images/hwg5-sentence-review/manifest.json", "HWG5 SR 圖片 manifest");
    requireCondition(imageManifest.unitId === unit.id && imageManifest.assetCount === 15 && imageManifest.assets?.length === 15, "HWG5 SR 圖片 manifest 必須正好有 15 張圖。");
    const imageById = new Map(imageManifest.assets.map(item => [item.questionId, item]));
    requireCondition(imageById.size === 15, "HWG5 SR 圖片 manifest 題目 ID 不唯一。");
    for (const question of questions) {
      const item = imageById.get(question.id);
      requireCondition(item?.file === question.image.path, `HWG5 SR ${question.id} 圖片路徑不一致。`);
      requireCondition(item.localVisualQaStatus === "pass", `HWG5 SR ${question.id} 尚未通過本機視覺 QA。`);
      requireCondition(item.teacherReviewStatus === "confirmed", `HWG5 SR ${question.id} 尚未經教師複核。`);
      validateAssetFile(root, item, "file", `HWG5 SR ${question.id} 題圖`);
    }
  }

  const publicBankPath = resolveProjectFile(root, unit.questionBankScript, `${label} 公開題庫`);
  requireCondition(existsSync(publicBankPath), `${label} 公開題庫不存在。`);
  return {
    unitId: unit.id,
    questionCount: questions.length,
    imageCount: imagePaths.length,
    ttsCount: ttsQuestions.length,
    questionBankVersion: unit.questionBankVersion,
    rubricVersion: unit.rubricVersion,
  };
}

export function validateDeployment({ root = projectRoot, env = process.env } = {}) {
  requireCondition(env.FIREBASE_DEPLOY_CONFIRMATION === EXPECTED_CONFIRMATION, `需要明確部署口令：${EXPECTED_CONFIRMATION}`);
  const deployProject = env.FIREBASE_DEPLOY_PROJECT || env.GCLOUD_PROJECT || "";
  requireCondition(deployProject === EXPECTED_PROJECT, `部署 project 必須明確指定為 ${EXPECTED_PROJECT}。`);

  const firebase = readJson(root, "firebase.json", "Firebase 設定");
  const mirror = readJson(root, "config/firebase.json", "Firebase 鏡像設定");
  requireCondition(firebase.functions?.runtime === "nodejs22", "Functions runtime 必須鎖定 nodejs22。");
  requireCondition(Array.isArray(firebase.functions?.predeploy) && firebase.functions.predeploy.includes("node scripts/deployment-gate.mjs"), "Firebase predeploy 未連接部署閘門。");
  requireCondition(JSON.stringify(firebase) === JSON.stringify(mirror), "根目錄與 config/firebase.json 不一致。");
  if (firebase.hosting?.site !== undefined) {
    requireCondition(firebase.hosting.site === EXPECTED_PROJECT, `Hosting site 必須是 ${EXPECTED_PROJECT}。`);
  }
  requireCondition(firebase.hosting?.public === ".", "Hosting public 根目錄必須維持目前專案根目錄。");
  requireCondition(firebase.hosting?.ignore?.includes("data/*.json"), "Hosting 必須排除私有 JSON 題庫。");
  const progressRewrite = firebase.hosting?.rewrites?.find(entry => entry.source === "/api/game/progress");
  requireCondition(progressRewrite?.function?.functionId === "saveGameProgress" && progressRewrite?.function?.region === "asia-east1", "逐題進度 API 必須指向 asia-east1 的 saveGameProgress。");
  const storageLifecycle = readJson(root, "storage-lifecycle.json", "Storage lifecycle");
  const recordingDeleteRule = storageLifecycle.rule?.find(rule => rule.action?.type === "Delete" && rule.condition?.matchesPrefix?.includes("recordings/"));
  requireCondition(recordingDeleteRule?.condition?.age === 365, "新錄音的 Storage lifecycle 必須設定為 365 天。");
  const publicHeaders = firebase.hosting?.headers
    ?.find((entry) => entry.source === "**")?.headers || [];
  const publicHeaderMap = new Map(
    publicHeaders.map(({ key, value }) => [String(key).toLowerCase(), String(value)]),
  );
  const csp = publicHeaderMap.get("content-security-policy") || "";
  const permissionsPolicy = publicHeaderMap.get("permissions-policy") || "";
  requireCondition(
    /frame-ancestors\s+'self'\s+https:\/\/\*\.web\.app\s+https:\/\/\*\.firebaseapp\.com(?:\s*;|$)/u.test(csp),
    "口說站必須允許 Firebase Hosting 父頁內嵌。",
  );
  requireCondition(!/frame-ancestors\s+'none'/u.test(csp), "口說站不可再拒絕所有父頁內嵌。");
  requireCondition(!publicHeaderMap.has("x-frame-options"), "口說站不可再送出 X-Frame-Options，以免覆蓋 CSP 白名單。");
  requireCondition(/camera=\(\)/u.test(permissionsPolicy), "Permissions-Policy 必須繼續封鎖 camera。");
  requireCondition(/geolocation=\(\)/u.test(permissionsPolicy), "Permissions-Policy 必須繼續封鎖 geolocation。");
  requireCondition(/microphone=\*/u.test(permissionsPolicy), "Permissions-Policy 必須允許父頁委派 microphone。");

  const indexHtml = readFileSync(resolveProjectFile(root, "index.html", "首頁"), "utf8");
  const appCheckMatch = indexHtml.match(/const\s+appCheckSiteKey\s*=\s*["']([^"']*)["']/u);
  const appCheckSiteKey = appCheckMatch?.[1]?.trim() ?? "";
  requireCondition(appCheckSiteKey.length >= 20, "尚未填入正式 Firebase App Check 網站金鑰。");
  requireCondition(!/placeholder|replace|todo|example/iu.test(appCheckSiteKey), "App Check 網站金鑰仍是預留值。");
  requireCondition(indexHtml.includes(`projectId: "${EXPECTED_PROJECT}"`), "前端 Firebase projectId 不正確。");

  const registry = readJson(root, "data/unit-registry.json", "單元 registry");
  const readySpeechUnits = registry.units?.filter(unit => unit.status === "ready" && unit.interactionType === "speech_assessment") || [];
  requireCondition(readySpeechUnits.length > 0, "至少需要一個 ready 的口說評測單元。");
  const units = readySpeechUnits.map(unit => validateReadySpeechUnit(root, unit));

  for (const rulesFile of ["firestore.rules", "storage.rules"]) {
    const rules = readFileSync(resolveProjectFile(root, rulesFile, rulesFile), "utf8");
    requireCondition(rules.includes("allow read, write: if false;"), `${rulesFile} 必須拒絕瀏覽器直接讀寫。`);
  }

  return {
    ok: true,
    targetProject: EXPECTED_PROJECT,
    targetSite: EXPECTED_PROJECT,
    runtime: firebase.functions.runtime,
    readySpeechUnitCount: units.length,
    units,
    appCheckConfigured: true,
  };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    console.log(JSON.stringify(validateDeployment(), null, 2));
  } catch (error) {
    console.error(`DEPLOYMENT_BLOCKED: ${error.message}`);
    process.exitCode = 1;
  }
}
