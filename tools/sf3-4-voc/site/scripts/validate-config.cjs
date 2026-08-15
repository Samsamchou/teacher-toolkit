"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const source = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "site-source.json"), "utf8"));
const config = require(path.join(PUBLIC, "site-config.js"));

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function publicPath(asset) {
  invariant(typeof asset === "string" && asset.startsWith("/"), `Invalid public asset path: ${asset}`);
  return path.join(PUBLIC, ...asset.slice(1).split("/"));
}

function jpegSize(filePath) {
  const data = fs.readFileSync(filePath);
  invariant(data[0] === 0xff && data[1] === 0xd8, `${filePath} is not a JPEG`);
  let offset = 2;
  while (offset + 9 < data.length) {
    if (data[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = data[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = data.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return {
        height: data.readUInt16BE(offset + 5),
        width: data.readUInt16BE(offset + 7),
        progressive: marker === 0xc2,
      };
    }
    invariant(length >= 2, `Invalid JPEG marker length in ${filePath}`);
    offset += 2 + length;
  }
  throw new Error(`Could not read JPEG dimensions: ${filePath}`);
}

const expectedTopics = source.books.flatMap((book) => book.units.map((unit) => unit.topicId));
const expectedRows = {
  top: source.books[0].units.map((unit) => unit.topicId),
  bottom: source.books[1].units.map((unit) => unit.topicId),
};
invariant(config.siteTitle === source.site.siteTitle, "Site title differs from site-source.json");
invariant(config.appId === source.site.appId, "Application namespace differs from site-source.json");
invariant(config.firebase.projectId === source.firebase.projectId, "Firebase project differs from site-source.json");
invariant(config.firebase.appId === source.firebase.appId, "Firebase Web App ID differs from site-source.json");
invariant(config.teacherAccess.mode === source.teacherAccess.mode, "Teacher login mode differs from site-source.json");
invariant(config.teacherAccess.claim === source.teacherAccess.claim, "Teacher claim differs from site-source.json");
invariant(config.teacherAccess.passcodePrompt === source.teacherAccess.passcodePrompt, "Teacher prompt differs from site-source.json");
invariant(!Object.hasOwn(config.teacherAccess, "password"), "Frontend teacher password is forbidden");
invariant(config.security.appCheckProvider === "recaptcha-enterprise", "App Check must use reCAPTCHA Enterprise");
invariant(config.security.appCheckSiteKey === source.security.appCheckSiteKey, "App Check site key differs from site-source.json");
invariant(config.security.teacherLoginMode === source.security.teacherLoginMode, "Teacher security mode differs from site-source.json");
invariant(config.functionUrls.teacherLogin.endsWith("/teacherLogin"), "Teacher login Function URL is missing");
invariant(JSON.stringify(config.topicRows) === JSON.stringify(expectedRows), "Topic rows differ from the two books");
invariant(JSON.stringify(config.topics.map((topic) => topic.id)) === JSON.stringify(expectedTopics), "Topic order differs from source");

const words = config.topics.flatMap((topic) => topic.words.map((word) => ({ topic: topic.id, ...word })));
const expectedWordCount = source.books.flatMap((book) => book.units).reduce((sum, unit) => sum + unit.words.length, 0);
invariant(words.length === expectedWordCount, `Expected ${expectedWordCount} words, found ${words.length}`);

for (const word of words) {
  invariant(word.en && word.zh && word.emoji, `${word.topic}: missing core text`);
  invariant(word.question && word.answer, `${word.topic}/${word.en}: missing question or answer`);
  invariant(word.example === `${word.question} ${word.answer}`, `${word.topic}/${word.en}: invalid example pair`);
}

const images = [...new Set(words.map((word) => word.image).filter(Boolean))];
const audio = [...new Set(words.flatMap((word) => [word.audio, ...(word.audioAlternates || [])]).filter(Boolean))];
invariant(images.length === words.length, "Every word must have one unique image");
const imageAssets = images.map((image) => {
  const filePath = publicPath(image);
  invariant(fs.existsSync(filePath), `Missing image: ${image}`);
  const dimensions = jpegSize(filePath);
  invariant(dimensions.width === 640 && dimensions.height === 640, `${image} must be 640x640`);
  invariant(dimensions.progressive, `${image} must be progressive JPEG`);
  const bytes = fs.statSync(filePath).size;
  invariant(bytes <= source.security.imageMaxBytes, `${image} exceeds ${source.security.imageMaxBytes} bytes`);
  return { path: image, ...dimensions, bytes };
});
for (const file of audio) {
  const filePath = publicPath(file);
  invariant(fs.existsSync(filePath) && fs.statSync(filePath).size > 500, `Missing or invalid MP3: ${file}`);
}

const generatedConfig = path.join(ROOT, "functions", "site-config.generated.cjs");
invariant(fs.existsSync(generatedConfig), "Run npm run sync:functions-config before validation");
invariant(
  fs.readFileSync(generatedConfig).equals(fs.readFileSync(path.join(PUBLIC, "site-config.js"))),
  "Frontend and Functions config copies differ",
);

const sourceText = [
  path.join(PUBLIC, "index.html"),
  path.join(ROOT, "functions", "index.js"),
  path.join(ROOT, "firebase.json"),
  path.join(ROOT, "firestore.rules"),
  path.join(ROOT, "storage.rules"),
].map((file) => fs.readFileSync(file, "utf8")).join("\n");
for (const stale of source.forbiddenStaleValues || []) {
  invariant(!sourceText.includes(stale), `Generated project still contains stale value: ${stale}`);
}
invariant(!/teacherAccess\.password(?!Prompt)/.test(sourceText), "Plaintext teacher password logic remains");
invariant(!/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/.test(sourceText), "Potential OpenAI secret in generated files");

const report = {
  generatedAt: new Date().toISOString(),
  status: "passed",
  title: config.siteTitle,
  projectId: config.firebase.projectId,
  topics: config.topics.map((topic) => ({ id: topic.id, words: topic.words.length })),
  totals: {
    words: words.length,
    images: images.length,
    audioFiles: audio.length,
    fallbackEntries: words.filter((word) => !word.audio).length,
  },
  imageOptimization: {
    dimensions: "640x640",
    sizeLimitBytes: source.security.imageMaxBytes,
    totalBytes: imageAssets.reduce((sum, image) => sum + image.bytes, 0),
    maximumBytes: Math.max(...imageAssets.map((image) => image.bytes)),
  },
  imageAssets,
};
fs.mkdirSync(path.join(ROOT, "audit"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "audit", "config-validation.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(
  `Configuration validated: ${words.length} words, ${images.length} images, ${audio.length} MP3 files.`,
);
