import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDir, "..");
const bankPath = path.join(siteRoot, "data", "hwg5-sentence-review.json");
const registryPath = path.join(siteRoot, "data", "unit-registry.json");
const manifestPath = path.join(siteRoot, "images", "hwg5-sentence-review", "manifest.json");

const [bank, registry, manifest] = await Promise.all([
  readFile(bankPath, "utf8").then(JSON.parse),
  readFile(registryPath, "utf8").then(JSON.parse),
  readFile(manifestPath, "utf8").then(JSON.parse),
]);

if (bank.mode?.unitId !== "hwg5-sr" || bank.questions?.length !== 15) {
  throw new Error("HWG5 SR 題庫單元或題數不正確。");
}
if (manifest.unitId !== "hwg5-sr" || manifest.assets?.length !== 15) {
  throw new Error("HWG5 SR 圖片 manifest 單元或數量不正確。");
}

for (const question of bank.questions) {
  const asset = manifest.assets.find(item => item.questionId === question.id);
  if (!asset || asset.file !== question.image?.path || asset.alt !== question.image?.alt) {
    throw new Error(`${question.id} 的題庫與圖片 manifest 不一致。`);
  }
  const filePath = path.join(siteRoot, ...asset.file.split("/"));
  await access(filePath);
  question.image.generationStatus = "generated_pending_teacher_review";
}

bank.review.productionAssetsStatus = "images_generated_tts_pending_teacher_review";

const unit = registry.units?.find(item => item.id === "hwg5-sr");
if (!unit) throw new Error("unit registry 找不到 hwg5-sr。");
unit.status = "preparing";
unit.hint = "題庫準備中";
unit.readinessBlockers = [
  "teacher_image_review_pending",
  "static_tts_not_generated",
  "local_qa_not_complete",
];

await Promise.all([
  writeFile(bankPath, `${JSON.stringify(bank, null, 2)}\n`, "utf8"),
  writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8"),
]);

console.log("HWG5 SR：15 張題圖已標記為 generated_pending_teacher_review；單元仍維持 preparing。");
