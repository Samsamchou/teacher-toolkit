import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDir, "..");
const workspaceRoot = path.resolve(siteRoot, "..");
const bankPath = path.join(siteRoot, "data", "hwg5-sentence-review.json");
const registryPath = path.join(siteRoot, "data", "unit-registry.json");
const layoutReportPath = path.join(
  workspaceRoot,
  "qa",
  "question-image-layout-hwg5-sr-20260824",
  "report.json",
);

const [bank, registry, layoutReport] = await Promise.all([
  readFile(bankPath, "utf8").then(JSON.parse),
  readFile(registryPath, "utf8").then(JSON.parse),
  readFile(layoutReportPath, "utf8").then(JSON.parse),
]);

if (
  layoutReport.ok !== true ||
  layoutReport.questionCount !== 15 ||
  layoutReport.viewportCount !== 3 ||
  layoutReport.passedCount !== 45 ||
  layoutReport.failedCount !== 0 ||
  layoutReport.missingImageFallback?.passed !== true
) {
  throw new Error("HWG5 SR 版面 QA 尚未達到 15 題 × 3 尺寸全通過與 fallback 通過。");
}

const unit = registry.units?.find(item => item.id === "hwg5-sr");
if (!unit) throw new Error("unit registry 找不到 hwg5-sr。");
unit.status = "preparing";
unit.hint = "題庫準備中";
unit.readinessBlockers = [
  "teacher_image_review_pending",
  "static_tts_not_generated",
];

bank.review.localQaStatus = {
  status: "passed",
  completedOn: "2026-08-24",
  websiteTestsPassed: 51,
  functionsTestsPassed: 86,
  layoutCasesPassed: 45,
  layoutCasesFailed: 0,
  missingImageFallbackPassed: true,
  targetViewports: [
    "windows-chrome-1366x768",
    "windows-chrome-1920x1080",
    "ipad-safari-landscape-1024x768",
  ],
  limitation: "iPad Safari 使用 Chromium 搭配 Safari User-Agent、觸控與 1024×768 橫式尺寸模擬；實體 iPad 麥克風與 Safari 引擎仍待部署後實測。",
};

await Promise.all([
  writeFile(bankPath, `${JSON.stringify(bank, null, 2)}\n`, "utf8"),
  writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8"),
]);

console.log("HWG5 SR 本機 QA 已標記完成；單元仍因教師圖像複核與正式 TTS 維持 preparing。");
