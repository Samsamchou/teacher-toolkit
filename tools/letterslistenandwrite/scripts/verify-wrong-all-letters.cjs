"use strict";

const fs = require("node:fs");
const path = require("node:path");

const inputPath = process.argv[2];
if (!inputPath || !fs.existsSync(inputPath)) {
  console.error(
    "Usage: node scripts/verify-wrong-all-letters.cjs <wrong-answer.png|negative-boards-directory>",
  );
  process.exit(2);
}

const endpoint =
  "https://asia-east1-g5-remedial-action-verbs.cloudfunctions.net/analyzeLetterAttempt";
const studentId = "CODEX-STRICT-VERIFY";

const toImageDataUrl = (filePath) => {
  const imageBase64 = fs.readFileSync(filePath).toString("base64");
  return `data:image/png;base64,${imageBase64}`;
};

const loadTestCases = () => {
  if (fs.statSync(inputPath).isDirectory()) {
    const manifestPath = path.join(inputPath, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Missing manifest: ${manifestPath}`);
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (!Array.isArray(manifest) || manifest.length !== 26) {
      throw new Error("Negative-board manifest must contain exactly 26 cases.");
    }
    return manifest.map(({ target, wrongGlyph, file }) => {
      const filePath = path.join(inputPath, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Missing negative board: ${filePath}`);
      }
      return {
        targetLetter: target,
        wrongGlyph,
        imageDataUrl: toImageDataUrl(filePath),
      };
    });
  }

  const imageDataUrl = toImageDataUrl(inputPath);
  return Array.from({ length: 26 }, (_, index) => ({
    targetLetter: String.fromCharCode(65 + index),
    wrongGlyph: "uploaded-sample",
    imageDataUrl,
  }));
};

const stroke = (points, startsAt) => ({
  points: points.map(([x, y], index) => ({
    x,
    y,
    t: startsAt + index * 80,
  })),
});

const strokes = [
  stroke(
    [
      [0.16, 0.1],
      [0.16, 0.25],
      [0.18, 0.43],
      [0.15, 0.66],
    ],
    0,
  ),
  stroke(
    [
      [0.16, 0.5],
      [0.21, 0.38],
      [0.29, 0.36],
      [0.33, 0.45],
      [0.33, 0.65],
    ],
    400,
  ),
  stroke(
    [
      [0.64, 0.1],
      [0.64, 0.28],
      [0.63, 0.48],
      [0.61, 0.69],
    ],
    900,
  ),
  stroke(
    [
      [0.62, 0.52],
      [0.68, 0.39],
      [0.77, 0.36],
      [0.8, 0.45],
      [0.8, 0.66],
    ],
    1300,
  ),
];

async function verifyTarget({ targetLetter, wrongGlyph, imageDataUrl }) {
  const data = {
    studentId,
    studentName: "AI嚴格驗收",
    targetLetter,
    imageDataUrl,
    thumbnailDataUrl: imageDataUrl,
    strokes,
    localMetrics: {
      positionScore: 96,
      coverage: 22,
      leftCoverage: 11,
      rightCoverage: 11,
      leftPointCount: 9,
      rightPointCount: 9,
    },
    clientTimestamp: new Date().toISOString(),
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ data }),
    signal: AbortSignal.timeout(240000),
  });
  const json = await response.json();
  const result = json.result || json.data;
  if (!response.ok || !result) {
    throw new Error(
      `${targetLetter}: ${json?.error?.message || `HTTP ${response.status}`}`,
    );
  }
  return {
    target: `${targetLetter}${targetLetter.toLowerCase()}`,
    wrongGlyph,
    passed: result.passed,
    observed: result.aiRecognition,
    uppercaseScore: result.uppercaseScore,
    lowercaseScore: result.lowercaseScore,
    overallScore: result.overallScore,
    model: result.aiModel,
  };
}

async function main() {
  const testCases = loadTestCases();
  const results = [];
  for (let index = 0; index < testCases.length; index += 3) {
    const batch = await Promise.all(
      testCases.slice(index, index + 3).map(verifyTarget),
    );
    results.push(...batch);
    for (const result of batch) {
      console.log(JSON.stringify(result));
    }
  }

  const failures = results.filter((result) => result.passed);
  const summary = {
    tested: results.length,
    rejected: results.length - failures.length,
    incorrectlyPassed: failures.length,
    allRejected: failures.length === 0,
  };
  console.log(`SUMMARY ${JSON.stringify(summary)}`);
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
