import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const envPath = path.join(root, ".env.local");
const envText = fs.readFileSync(envPath, "utf8");
const keyMatch = envText.match(
  /^\s*OPENAI_API_KEY\s*=\s*["']?(sk-[^\s"']+)["']?\s*$/m,
);

if (!keyMatch) {
  throw new Error("usable_key_not_found");
}

const key = keyMatch[1];
const skippedDirectories = new Set([
  "functions",
  "scripts",
  "tests",
  "config",
  "qa",
  "tmp",
  "node_modules",
]);
const skippedFiles = new Set([
  "firebase.json",
  "firestore.rules",
  "storage.rules",
  "storage-lifecycle.json",
  "server.mjs",
  "package.json",
  "package-lock.json",
  "skills-lock.json",
]);

const leakedPaths = [];
const suspiciousPatternPaths = [];
let scannedFiles = 0;

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;

    const absolutePath = path.join(directory, entry.name);
    const relativePath = path.relative(root, absolutePath).replaceAll("\\", "/");

    if (entry.isDirectory()) {
      if (!skippedDirectories.has(entry.name)) walk(absolutePath);
      continue;
    }

    if (
      skippedFiles.has(entry.name) ||
      relativePath.endsWith(".md") ||
      relativePath.endsWith(".log") ||
      (relativePath.startsWith("data/") && relativePath.endsWith(".json"))
    ) {
      continue;
    }

    scannedFiles += 1;
    const text = fs.readFileSync(absolutePath).toString("utf8");
    if (text.includes(key)) leakedPaths.push(relativePath);
    if (/sk-[A-Za-z0-9_-]{12,}/.test(text)) {
      suspiciousPatternPaths.push(relativePath);
    }
  }
}

walk(root);

const result = {
  ok: leakedPaths.length === 0 && suspiciousPatternPaths.length === 0,
  scannedFiles,
  keyLeakPaths: leakedPaths,
  suspiciousKeyPatternPaths: suspiciousPatternPaths,
};

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
