import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const baseUrl = "https://setencerevieworalpractice.web.app";
const registry = JSON.parse(
  fs.readFileSync(path.join(root, "data", "unit-registry.json"), "utf8"),
);
const readyUnits = registry.units.filter(
  (unit) => unit.status === "ready" && unit.interactionType === "speech_assessment",
);

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function fetchBytes(relativePath) {
  const url = new URL(relativePath, `${baseUrl}/`);
  url.searchParams.set("staticQa", Date.now().toString());
  const response = await fetch(url, {
    headers: { "Cache-Control": "no-cache" },
    redirect: "follow",
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  return { response, bytes };
}

async function comparePublicFile(relativePath) {
  const local = fs.readFileSync(path.join(root, relativePath));
  const { response, bytes } = await fetchBytes(relativePath);
  return {
    path: relativePath.replaceAll("\\", "/"),
    status: response.status,
    bytes: bytes.length,
    sha256: sha256(bytes),
    matchesLocal: response.ok && bytes.equals(local),
  };
}

const publicTextPaths = ["index.html", "data/unit-registry.js"];
const imagePaths = new Set();
const ttsPaths = new Set();
const privateBankStatuses = [];
const unitSummaries = [];

for (const unit of readyUnits) {
  publicTextPaths.push(unit.questionBankScript);
  const bank = JSON.parse(
    fs.readFileSync(path.join(root, unit.questionBankFile), "utf8"),
  );
  for (const question of bank.questions) {
    imagePaths.add(question.image.path);
    if (question.tts?.path && fs.existsSync(path.join(root, question.tts.path))) {
      ttsPaths.add(question.tts.path);
    }
  }
  const privateResponse = await fetch(
    new URL(`${unit.questionBankFile}?privateQa=${Date.now()}`, `${baseUrl}/`),
    { headers: { "Cache-Control": "no-cache" } },
  );
  privateBankStatuses.push({ unitId: unit.id, status: privateResponse.status });
  unitSummaries.push({
    unitId: unit.id,
    questionCount: bank.questions.length,
    imageCount: bank.questions.length,
    ttsCount: bank.questions.filter(
      (question) => question.tts?.path && fs.existsSync(path.join(root, question.tts.path)),
    ).length,
  });
}

const publicText = await Promise.all(publicTextPaths.map(comparePublicFile));
const images = await Promise.all([...imagePaths].map(comparePublicFile));
const tts = await Promise.all([...ttsPaths].map(comparePublicFile));

const homeResponse = await fetch(`${baseUrl}/index.html?headersQa=${Date.now()}`, {
  headers: { "Cache-Control": "no-cache" },
});
const csp = homeResponse.headers.get("content-security-policy") ?? "";
const permissionsPolicy = homeResponse.headers.get("permissions-policy") ?? "";
const homeText = await homeResponse.text();

const requestBody = {
  unitId: "hwg5-sr",
  students: ["99701", "99702"],
  requestId: crypto.randomUUID(),
};
const missingAppCheckResponse = await fetch(`${baseUrl}/api/game/start`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: baseUrl },
  body: JSON.stringify(requestBody),
});
const missingAppCheckBody = await missingAppCheckResponse.json().catch(() => ({}));
const wrongOriginResponse = await fetch(`${baseUrl}/api/game/start`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Origin: "https://example.invalid",
  },
  body: JSON.stringify({ ...requestBody, requestId: crypto.randomUUID() }),
});
const wrongOriginBody = await wrongOriginResponse.json().catch(() => ({}));

const checks = {
  exactReadyUnits:
    JSON.stringify(readyUnits.map((unit) => unit.id)) ===
    JSON.stringify(["hwg7-sr", "hwg5-sr"]),
  publicTextMatches: publicText.every((item) => item.matchesLocal),
  allImagesMatch: images.length === 28 && images.every((item) => item.matchesLocal),
  allTtsMatch: tts.length === 22 && tts.every((item) => item.matchesLocal),
  privateBanksNotHosted: privateBankStatuses.every((item) => item.status === 404),
  noKeyPatternInPublicText:
    !/sk-[A-Za-z0-9_-]{12,}/.test(homeText) &&
    publicText.every((item) => {
      const text = fs.readFileSync(path.join(root, item.path), "utf8");
      return !/sk-[A-Za-z0-9_-]{12,}/.test(text);
    }),
  appCheckRequired:
    missingAppCheckResponse.status === 401 &&
    missingAppCheckBody.error?.code === "app_check_required",
  wrongOriginRejected:
    wrongOriginResponse.status === 403 &&
    wrongOriginBody.error?.code === "origin_not_allowed",
  securityHeaders:
    /frame-ancestors 'self' https:\/\/\*\.web\.app https:\/\/\*\.firebaseapp\.com/u.test(csp) &&
    !/frame-ancestors 'none'/u.test(csp) &&
    homeResponse.headers.get("x-content-type-options") === "nosniff" &&
    homeResponse.headers.get("x-frame-options") === null &&
    /camera=\(\)/u.test(permissionsPolicy) &&
    /geolocation=\(\)/u.test(permissionsPolicy) &&
    /microphone=\*/u.test(permissionsPolicy),
};

const report = {
  ok: Object.values(checks).every(Boolean),
  checkedAt: new Date().toISOString(),
  baseUrl,
  checks,
  units: unitSummaries,
  publicText,
  imageCount: images.length,
  ttsCount: tts.length,
  privateBankStatuses,
  missingAppCheck: {
    status: missingAppCheckResponse.status,
    code: missingAppCheckBody.error?.code ?? null,
  },
  wrongOrigin: {
    status: wrongOriginResponse.status,
    code: wrongOriginBody.error?.code ?? null,
  },
};

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
