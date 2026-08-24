#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const siteRoot = path.resolve(scriptDir, "..");
const bankPath = path.join(siteRoot, "data", "hwg5-sentence-review.json");
const registryPath = path.join(siteRoot, "data", "unit-registry.json");
const imageManifestPath = path.join(siteRoot, "images", "hwg5-sentence-review", "manifest.json");
const audioManifestPath = path.join(siteRoot, "audio", "hwg5-sr", "manifest.json");

const EXPECTED_IDS = Array.from(
  { length: 15 },
  (_, index) => `HWG5-SR-${String(index + 1).padStart(3, "0")}`,
);
const EXPECTED_ID_SET = new Set(EXPECTED_IDS);

const sha256 = buffer => createHash("sha256").update(buffer).digest("hex");
const roundDuration = value => Number(value.toFixed(3));

function assertSafePublicPath(publicPath, prefix) {
  if (
    typeof publicPath !== "string" ||
    !publicPath.startsWith(prefix) ||
    publicPath.includes("\\") ||
    publicPath.split("/").includes("..")
  ) {
    throw new Error(`Unsafe or unexpected public asset path: ${publicPath}`);
  }
  const resolved = path.resolve(siteRoot, ...publicPath.split("/"));
  const relative = path.relative(siteRoot, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Asset path escapes the site root: ${publicPath}`);
  }
  return resolved;
}

function readPngDimensions(buffer) {
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error("PNG signature is invalid.");
  }
  if (buffer.subarray(12, 16).toString("ascii") !== "IHDR") {
    throw new Error("PNG IHDR chunk is missing.");
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function syncSafeInteger(buffer, offset) {
  const bytes = buffer.subarray(offset, offset + 4);
  if (bytes.length !== 4 || bytes.some(value => value > 0x7f)) {
    throw new Error("Invalid ID3 sync-safe size.");
  }
  return ((bytes[0] << 21) | (bytes[1] << 14) | (bytes[2] << 7) | bytes[3]) >>> 0;
}

export function inspectMp3(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
    throw new Error("MP3 file is empty or too small.");
  }

  let offset = 0;
  let id3v2Bytes = 0;
  if (buffer.subarray(0, 3).toString("ascii") === "ID3") {
    if (buffer.length < 10) throw new Error("Truncated ID3v2 header.");
    const footerBytes = (buffer[5] & 0x10) !== 0 ? 10 : 0;
    id3v2Bytes = 10 + syncSafeInteger(buffer, 6) + footerBytes;
    if (id3v2Bytes >= buffer.length) throw new Error("ID3v2 tag consumes the complete MP3 file.");
    offset = id3v2Bytes;
  }

  const firstFrameOffset = offset;
  let frameCount = 0;
  let audioFrameBytes = 0;
  let durationSeconds = 0;
  const bitratesKbps = new Set();
  const sampleRatesHz = new Set();
  const versions = new Set();

  const mpeg1Layer3Bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
  const mpeg2Layer3Bitrates = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
  const sampleRates = {
    3: [44_100, 48_000, 32_000],
    2: [22_050, 24_000, 16_000],
    0: [11_025, 12_000, 8_000],
  };

  while (offset + 4 <= buffer.length) {
    if (buffer.length - offset === 128 && buffer.subarray(offset, offset + 3).toString("ascii") === "TAG") {
      offset += 128;
      break;
    }

    const header = buffer.readUInt32BE(offset);
    if (((header & 0xffe00000) >>> 0) !== 0xffe00000) {
      throw new Error(`Invalid MPEG frame sync at byte ${offset}.`);
    }
    const versionBits = (header >>> 19) & 0x3;
    const layerBits = (header >>> 17) & 0x3;
    const bitrateIndex = (header >>> 12) & 0xf;
    const sampleRateIndex = (header >>> 10) & 0x3;
    const padding = (header >>> 9) & 0x1;
    if (versionBits === 1 || layerBits !== 1) {
      throw new Error(`Unsupported or invalid MPEG Layer III header at byte ${offset}.`);
    }
    if (bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3) {
      throw new Error(`Invalid MP3 bitrate or sample-rate index at byte ${offset}.`);
    }

    const bitrateTable = versionBits === 3 ? mpeg1Layer3Bitrates : mpeg2Layer3Bitrates;
    const bitrateKbps = bitrateTable[bitrateIndex];
    const sampleRateHz = sampleRates[versionBits]?.[sampleRateIndex];
    const samplesPerFrame = versionBits === 3 ? 1152 : 576;
    const frameLength = Math.floor(
      (versionBits === 3 ? 144 : 72) * bitrateKbps * 1000 / sampleRateHz,
    ) + padding;
    if (!Number.isInteger(frameLength) || frameLength < 24 || offset + frameLength > buffer.length) {
      throw new Error(`Truncated or invalid MP3 frame at byte ${offset}.`);
    }

    frameCount += 1;
    audioFrameBytes += frameLength;
    durationSeconds += samplesPerFrame / sampleRateHz;
    bitratesKbps.add(bitrateKbps);
    sampleRatesHz.add(sampleRateHz);
    versions.add(versionBits === 3 ? "MPEG-1" : versionBits === 2 ? "MPEG-2" : "MPEG-2.5");
    offset += frameLength;
  }

  if (offset !== buffer.length) throw new Error(`Unexpected trailing MP3 bytes at byte ${offset}.`);
  if (frameCount < 10) throw new Error(`MP3 contains too few complete audio frames: ${frameCount}.`);
  if (durationSeconds < 0.75 || durationSeconds > 12) {
    throw new Error(`MP3 duration is outside the expected prompt range: ${durationSeconds.toFixed(3)} seconds.`);
  }

  return {
    signature: id3v2Bytes > 0 ? "ID3+MPEG-Layer-III" : "MPEG-Layer-III",
    firstFrameOffset,
    id3v2Bytes,
    frameCount,
    audioFrameBytes,
    durationSeconds: roundDuration(durationSeconds),
    bitratesKbps: [...bitratesKbps].sort((left, right) => left - right),
    sampleRatesHz: [...sampleRatesHz].sort((left, right) => left - right),
    versions: [...versions].sort(),
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function expectedTtsText(question) {
  return question.type === "question_answer" ? question.questionText : question.standardReadSentence;
}

function requireExactQuestionIds(items, label, getId = item => item.questionId) {
  const ids = items.map(getId);
  if (ids.length !== EXPECTED_IDS.length || new Set(ids).size !== EXPECTED_IDS.length) {
    throw new Error(`${label} must contain 15 unique question IDs.`);
  }
  const unexpected = ids.filter(id => !EXPECTED_ID_SET.has(id));
  const missing = EXPECTED_IDS.filter(id => !ids.includes(id));
  if (unexpected.length || missing.length) {
    throw new Error(`${label} ID mismatch; missing=${missing.join(",") || "none"}; unexpected=${unexpected.join(",") || "none"}.`);
  }
}

export async function verifyHwg5Media({
  bank: suppliedBank,
  registry: suppliedRegistry,
  imageManifest: suppliedImageManifest,
  requireReadyState = true,
  requireTeacherConfirmation = true,
} = {}) {
  const [bank, registry, imageManifest, audioManifest] = await Promise.all([
    suppliedBank ?? readJson(bankPath),
    suppliedRegistry ?? readJson(registryPath),
    suppliedImageManifest ?? readJson(imageManifestPath),
    readJson(audioManifestPath),
  ]);

  if (bank.mode?.unitId !== "hwg5-sr" || bank.mode?.questionBankVersion !== "hwg5-sr-v1-answer-only") {
    throw new Error("HWG5 bank unit or version is incorrect.");
  }
  if (!Array.isArray(bank.questions) || bank.questions.length !== 15) {
    throw new Error(`HWG5 bank must contain exactly 15 questions; found ${bank.questions?.length ?? 0}.`);
  }
  requireExactQuestionIds(bank.questions, "HWG5 bank", item => item.id);
  if (bank.questions.filter(({ type }) => type === "read_aloud").length !== 8 ||
      bank.questions.filter(({ type }) => type === "question_answer").length !== 7) {
    throw new Error("HWG5 bank must contain 8 read_aloud and 7 question_answer items.");
  }

  if (imageManifest.unitId !== "hwg5-sr" || imageManifest.assetCount !== 15 || imageManifest.assets?.length !== 15) {
    throw new Error("HWG5 image manifest must contain exactly 15 assets for hwg5-sr.");
  }
  requireExactQuestionIds(imageManifest.assets, "HWG5 image manifest");
  if (requireTeacherConfirmation && imageManifest.teacherReviewStatus !== "confirmed") {
    throw new Error("HWG5 image manifest does not record complete teacher confirmation.");
  }

  const imagePaths = new Set();
  let imageBytes = 0;
  const imageItems = [];
  for (const question of bank.questions) {
    const asset = imageManifest.assets.find(item => item.questionId === question.id);
    if (!asset || asset.file !== question.image?.path || asset.alt !== question.image?.alt) {
      throw new Error(`${question.id} image bank/manifest mapping is inconsistent.`);
    }
    if (asset.mimeType !== "image/png" || asset.localVisualQaStatus !== "pass") {
      throw new Error(`${question.id} image MIME type or local visual QA status is invalid.`);
    }
    if (requireTeacherConfirmation && asset.teacherReviewStatus !== "confirmed") {
      throw new Error(`${question.id} image is not teacher-confirmed.`);
    }
    if (imagePaths.has(asset.file)) throw new Error(`${question.id} image path is duplicated.`);
    imagePaths.add(asset.file);

    const filePath = assertSafePublicPath(asset.file, "images/hwg5-sentence-review/");
    const [buffer, fileInfo] = await Promise.all([readFile(filePath), stat(filePath)]);
    const dimensions = readPngDimensions(buffer);
    if (fileInfo.size !== asset.bytes || sha256(buffer) !== asset.sha256) {
      throw new Error(`${question.id} image bytes or SHA-256 does not match the manifest.`);
    }
    if (dimensions.width !== asset.width || dimensions.height !== asset.height ||
        dimensions.width !== 1280 || dimensions.height !== 720) {
      throw new Error(`${question.id} image dimensions do not match the verified 1280x720 asset.`);
    }
    imageBytes += buffer.length;
    imageItems.push({ questionId: question.id, path: asset.file, bytes: buffer.length, sha256: asset.sha256 });
  }
  if (imageBytes !== imageManifest.totalBytes) {
    throw new Error(`Image manifest totalBytes mismatch: expected ${imageManifest.totalBytes}, found ${imageBytes}.`);
  }
  const imageDirectoryEntries = (await readdir(path.dirname(imageManifestPath), { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith(".png"))
    .map(entry => entry.name)
    .sort();
  const expectedImageFiles = [...imagePaths].map(item => path.basename(item)).sort();
  if (JSON.stringify(imageDirectoryEntries) !== JSON.stringify(expectedImageFiles)) {
    throw new Error("Image directory contains missing or untracked PNG assets.");
  }

  if (
    audioManifest.schemaVersion !== 1 ||
    audioManifest.provider !== "OpenAI" ||
    audioManifest.model !== "gpt-4o-mini-tts" ||
    audioManifest.voice !== "marin" ||
    Number(audioManifest.speed) !== 0.8 ||
    audioManifest.responseFormat !== "mp3" ||
    audioManifest.itemCount !== 15 ||
    audioManifest.items?.length !== 15
  ) {
    throw new Error("HWG5 audio manifest metadata or item count is invalid.");
  }
  requireExactQuestionIds(audioManifest.items, "HWG5 audio manifest");

  const audioPaths = new Set();
  const ttsItems = [];
  let audioBytes = 0;
  let durationSeconds = 0;
  let mp3FrameCount = 0;
  for (const question of bank.questions) {
    const item = audioManifest.items.find(candidate => candidate.questionId === question.id);
    const expectedText = expectedTtsText(question);
    if (!item || item.questionType !== question.type || item.input !== expectedText || item.input !== question.tts?.text) {
      throw new Error(`${question.id} TTS text or question-type mapping is inconsistent.`);
    }
    if (
      question.tts?.provider !== "openai" ||
      question.tts?.model !== audioManifest.model ||
      question.tts?.voice !== audioManifest.voice ||
      Number(question.tts?.speed) !== Number(audioManifest.speed) ||
      question.tts?.path !== item.path ||
      item.contentType !== "audio/mpeg"
    ) {
      throw new Error(`${question.id} bank/audio manifest TTS metadata is inconsistent.`);
    }
    if (audioPaths.has(item.path)) throw new Error(`${question.id} audio path is duplicated.`);
    audioPaths.add(item.path);

    const filePath = assertSafePublicPath(item.path, "audio/hwg5-sr/");
    const [buffer, fileInfo] = await Promise.all([readFile(filePath), stat(filePath)]);
    const actualHash = sha256(buffer);
    if (fileInfo.size !== item.bytes || buffer.length !== item.bytes || actualHash !== item.sha256) {
      throw new Error(`${question.id} MP3 bytes or SHA-256 does not match the manifest.`);
    }
    const mp3 = inspectMp3(buffer);
    audioBytes += buffer.length;
    durationSeconds += mp3.durationSeconds;
    mp3FrameCount += mp3.frameCount;
    ttsItems.push({
      questionId: question.id,
      path: item.path,
      input: item.input,
      bytes: item.bytes,
      sha256: item.sha256,
      durationSeconds: mp3.durationSeconds,
      frameCount: mp3.frameCount,
      signature: mp3.signature,
      sampleRatesHz: mp3.sampleRatesHz,
      bitratesKbps: mp3.bitratesKbps,
    });
  }

  const audioDirectoryEntries = (await readdir(path.dirname(audioManifestPath), { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith(".mp3"))
    .map(entry => entry.name)
    .sort();
  const expectedAudioFiles = [...audioPaths].map(item => path.basename(item)).sort();
  if (JSON.stringify(audioDirectoryEntries) !== JSON.stringify(expectedAudioFiles)) {
    throw new Error("Audio directory contains missing or untracked MP3 assets.");
  }

  const unit = registry.units?.find(item => item.id === "hwg5-sr");
  if (!unit) throw new Error("Unit registry does not contain hwg5-sr.");
  if (requireReadyState) {
    if (unit.status !== "ready" || unit.hint !== "" || "readinessBlockers" in unit) {
      throw new Error("HWG5 registry is not in the blocker-free ready state.");
    }
    if (
      bank.review?.status !== "teacher_confirmed" ||
      bank.review?.productionAssetsStatus !== "ready" ||
      bank.review?.studentPilotAllowedAfterTechnicalQa !== true ||
      bank.review?.localQaStatus?.status !== "passed" ||
      bank.review?.mediaVerification?.status !== "passed"
    ) {
      throw new Error("HWG5 bank review does not contain the complete ready evidence.");
    }
    for (const question of bank.questions) {
      const verifiedTts = ttsItems.find(item => item.questionId === question.id);
      if (question.image?.generationStatus !== "generated_teacher_confirmed") {
        throw new Error(`${question.id} image status is not generated_teacher_confirmed.`);
      }
      if (question.tts?.generationStatus !== "generated_verified") {
        throw new Error(`${question.id} TTS status is not generated_verified.`);
      }
      const evidence = question.tts?.assetVerification;
      if (
        evidence?.status !== "passed" ||
        evidence.bytes !== verifiedTts.bytes ||
        evidence.sha256 !== verifiedTts.sha256 ||
        Number(evidence.durationSeconds) !== verifiedTts.durationSeconds
      ) {
        throw new Error(`${question.id} TTS verification evidence is missing or stale.`);
      }
    }
  }

  const durations = ttsItems.map(item => item.durationSeconds);
  return {
    ok: true,
    unitId: "hwg5-sr",
    questionCount: bank.questions.length,
    imageCount: imageItems.length,
    imageBytes,
    teacherConfirmedImageCount: imageManifest.assets.filter(item => item.teacherReviewStatus === "confirmed").length,
    ttsCount: ttsItems.length,
    ttsBytes: audioBytes,
    ttsDurationSeconds: roundDuration(durationSeconds),
    ttsDurationRangeSeconds: {
      min: Math.min(...durations),
      max: Math.max(...durations),
    },
    mp3FrameCount,
    ttsItems,
    registryStatus: unit.status,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  const allowPreparing = process.argv.includes("--allow-preparing");
  const result = await verifyHwg5Media({
    requireReadyState: !allowPreparing,
    requireTeacherConfirmation: !allowPreparing,
  });
  console.log(JSON.stringify(result, null, 2));
}
