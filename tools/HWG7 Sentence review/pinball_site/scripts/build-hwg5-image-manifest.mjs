import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(scriptDir, "..");
const imageDir = path.join(siteDir, "images", "hwg5-sentence-review");
const manifestPath = path.join(imageDir, "manifest.json");

const altById = {
  "HWG5-SR-001": "一個顯示特定時間的指針時鐘。",
  "HWG5-SR-002": "一個顯示特定時間的指針時鐘。",
  "HWG5-SR-003": "一位學生坐在桌邊進行書寫活動。",
  "HWG5-SR-004": "一位男孩在泳池中運動。",
  "HWG5-SR-005": "一位女孩在有爐台與流理台的室內空間。",
  "HWG5-SR-006": "一位男孩站在有植物與戶外步道的庭院。",
  "HWG5-SR-007": "一個透明袋子裡放著一件文具。",
  "HWG5-SR-008": "畫面中有一頂小帽子與一張矮桌。",
  "HWG5-SR-009": "一個顯示特定時間的指針時鐘。",
  "HWG5-SR-010": "一個整點的指針時鐘。",
  "HWG5-SR-011": "一位男孩在戶外快速向前移動。",
  "HWG5-SR-012": "一個角色在廚房桌邊，手上拿著杯子。",
  "HWG5-SR-013": "一個角色站在有餐桌與餐椅的室內空間。",
  "HWG5-SR-014": "一位男孩在有沙發、茶几與燈具的室內空間。",
  "HWG5-SR-015": "一個房間裡有一張圓桌，桌子附近放著幾樣物品。",
};

const deterministicClockIds = new Set([
  "HWG5-SR-001",
  "HWG5-SR-002",
  "HWG5-SR-009",
  "HWG5-SR-010",
]);

function readPngDimensions(buffer) {
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a" || buffer.subarray(12, 16).toString("ascii") !== "IHDR") {
    throw new Error("檔案不是有效的 PNG。 ");
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

const assets = [];
for (const [questionId, alt] of Object.entries(altById)) {
  const filename = `${questionId}.png`;
  const filePath = path.join(imageDir, filename);
  const buffer = await readFile(filePath);
  const { width, height } = readPngDimensions(buffer);
  assets.push({
    questionId,
    file: `images/hwg5-sentence-review/${filename}`,
    mimeType: "image/png",
    width,
    height,
    bytes: buffer.byteLength,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    generationMethod: deterministicClockIds.has(questionId)
      ? "deterministic_clock_renderer"
      : "openai_builtin_imagegen_original_then_local_palette_optimization",
    alt,
    localVisualQaStatus: "pass",
    teacherReviewStatus: "pending",
  });
}

const manifest = {
  schemaVersion: 1,
  unitId: "hwg5-sr",
  generatedOn: "2026-08-24",
  assetCount: assets.length,
  totalBytes: assets.reduce((sum, asset) => sum + asset.bytes, 0),
  sourceImagesModified: false,
  assets,
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Wrote ${assets.length} assets to ${manifestPath}`);
