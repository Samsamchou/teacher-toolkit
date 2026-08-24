#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyHwg5Media } from "./verify-hwg5-media.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDir, "..");
const bankPath = path.join(siteRoot, "data", "hwg5-sentence-review.json");
const registryPath = path.join(siteRoot, "data", "unit-registry.json");
const imageManifestPath = path.join(siteRoot, "images", "hwg5-sentence-review", "manifest.json");
const confirmationFlag = "--teacher-images-confirmed";

if (!process.argv.includes(confirmationFlag)) {
  throw new Error(`Refusing to finalize HWG5 without the explicit ${confirmationFlag} flag.`);
}

const readJson = filePath => readFile(filePath, "utf8").then(JSON.parse);
const clone = value => JSON.parse(JSON.stringify(value));
const today = new Date().toISOString().slice(0, 10);
const verifiedAt = new Date().toISOString();

const [sourceBank, sourceRegistry, sourceImageManifest] = await Promise.all([
  readJson(bankPath),
  readJson(registryPath),
  readJson(imageManifestPath),
]);

if (sourceBank.review?.status !== "teacher_confirmed") {
  throw new Error("HWG5 question-bank content is not teacher-confirmed.");
}
if (sourceBank.review?.localQaStatus?.status !== "passed") {
  throw new Error("HWG5 local QA has not passed.");
}

// First verify immutable file facts while the unit is still safely preparing.
const physicalMedia = await verifyHwg5Media({
  bank: sourceBank,
  registry: sourceRegistry,
  imageManifest: sourceImageManifest,
  requireReadyState: false,
  requireTeacherConfirmation: false,
});

const bank = clone(sourceBank);
const registry = clone(sourceRegistry);
const imageManifest = clone(sourceImageManifest);

imageManifest.teacherReviewStatus = "confirmed";
imageManifest.teacherConfirmedOn = today;
for (const asset of imageManifest.assets) {
  asset.teacherReviewStatus = "confirmed";
  asset.teacherConfirmedOn = today;
}

const ttsByQuestionId = new Map(physicalMedia.ttsItems.map(item => [item.questionId, item]));
for (const question of bank.questions) {
  const verifiedTts = ttsByQuestionId.get(question.id);
  if (!verifiedTts) throw new Error(`${question.id} has no verified static TTS asset.`);
  question.image.generationStatus = "generated_teacher_confirmed";
  question.image.teacherConfirmedOn = today;
  question.tts.generationStatus = "generated_verified";
  question.tts.assetVerification = {
    status: "passed",
    bytes: verifiedTts.bytes,
    sha256: verifiedTts.sha256,
    durationSeconds: verifiedTts.durationSeconds,
    frameCount: verifiedTts.frameCount,
    signature: verifiedTts.signature,
    verifiedAt,
  };
}

bank.review.productionAssetsStatus = "ready";
bank.review.studentPilotAllowedAfterTechnicalQa = true;
bank.review.mediaVerification = {
  status: "passed",
  verifiedAt,
  teacherConfirmedOn: today,
  imageCount: physicalMedia.imageCount,
  imageBytes: physicalMedia.imageBytes,
  teacherConfirmedImageCount: 15,
  ttsCount: physicalMedia.ttsCount,
  ttsBytes: physicalMedia.ttsBytes,
  ttsDurationSeconds: physicalMedia.ttsDurationSeconds,
  ttsDurationRangeSeconds: physicalMedia.ttsDurationRangeSeconds,
  mp3FrameCount: physicalMedia.mp3FrameCount,
  verificationScope: "manifest_bytes_sha256_signature_full_frame_duration_and_prompt_mapping",
};

const unit = registry.units?.find(item => item.id === "hwg5-sr");
if (!unit) throw new Error("Unit registry does not contain hwg5-sr.");
unit.status = "ready";
unit.hint = "";
delete unit.readinessBlockers;

// Validate the exact candidate documents before making any unit visible.
const candidateVerification = await verifyHwg5Media({
  bank,
  registry,
  imageManifest,
  requireReadyState: true,
  requireTeacherConfirmation: true,
});

// Registry is intentionally written last. A partial write therefore cannot expose
// a ready unit before its bank and teacher-confirmed image manifest exist.
await writeFile(imageManifestPath, `${JSON.stringify(imageManifest, null, 2)}\n`, "utf8");
await writeFile(bankPath, `${JSON.stringify(bank, null, 2)}\n`, "utf8");
await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");

const persistedVerification = await verifyHwg5Media();
console.log(JSON.stringify({
  ok: true,
  action: "hwg5_ready_finalized",
  candidateVerification: {
    imageCount: candidateVerification.imageCount,
    ttsCount: candidateVerification.ttsCount,
    ttsBytes: candidateVerification.ttsBytes,
    ttsDurationSeconds: candidateVerification.ttsDurationSeconds,
  },
  persistedVerification: {
    imageCount: persistedVerification.imageCount,
    teacherConfirmedImageCount: persistedVerification.teacherConfirmedImageCount,
    ttsCount: persistedVerification.ttsCount,
    registryStatus: persistedVerification.registryStatus,
  },
}, null, 2));
