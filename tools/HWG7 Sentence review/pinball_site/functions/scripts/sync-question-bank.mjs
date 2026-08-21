import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const sourceUrl = new URL("../../data/hwg7-sentence-review.json", import.meta.url);
const targetUrl = new URL("../data/question-bank.json", import.meta.url);
const source = JSON.parse(await readFile(sourceUrl, "utf8"));
const questions = Array.isArray(source.questions) ? source.questions : [];
const ids = new Set(questions.map(({ id }) => id));

if (questions.length !== 13 || ids.size !== 13) {
  throw new Error(`Expected 13 unique questions; found ${questions.length} questions and ${ids.size} IDs.`);
}
if (questions.some(({ passScore }) => passScore !== 80)) {
  throw new Error("Every deployable question must use passScore 80.");
}

const deploymentBank = {
  schemaVersion: source.schemaVersion,
  mode: source.mode,
  game: source.game,
  rubric: source.rubric,
  questions,
};
const output = `${JSON.stringify(deploymentBank, null, 2)}\n`;
await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(targetUrl, output, "utf8");

const hash = createHash("sha256").update(output).digest("hex");
console.log(`Synced ${questions.length} questions to functions/data/question-bank.json`);
console.log(`SHA-256 ${hash}`);
