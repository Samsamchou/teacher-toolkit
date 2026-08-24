import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { buildQuestionBankRegistry } from "../lib/question-bank.mjs";

const sourceDirectoryUrl = new URL("../../data/", import.meta.url);
const targetUrl = new URL("../data/question-bank.json", import.meta.url);
const entries = await readdir(sourceDirectoryUrl, { withFileTypes: true });
const sourceNames = entries
  .filter((entry) => entry.isFile() && /^[a-z0-9-]+-sentence-review\.json$/u.test(entry.name))
  .map((entry) => entry.name)
  .sort();

if (!sourceNames.length) {
  throw new Error("No sentence-review question bank sources were found.");
}

const sourceDocuments = await Promise.all(
  sourceNames.map(async (name) => ({
    name,
    document: JSON.parse(await readFile(new URL(name, sourceDirectoryUrl), "utf8")),
  })),
);

const units = sourceDocuments.map(({ name, document }) => {
  const unitId = document.mode?.unitId;
  const questionBankVersion = document.mode?.questionBankVersion;
  if (typeof unitId !== "string" || typeof questionBankVersion !== "string") {
    throw new Error(`${name} is missing mode.unitId or mode.questionBankVersion.`);
  }
  return {
    schemaVersion: document.schemaVersion,
    unitId,
    questionBankVersion,
    mode: document.mode,
    game: document.game,
    rubric: document.rubric,
    questions: document.questions,
  };
});

const deploymentBank = {
  schemaVersion: "multi-unit-1.0.0",
  units,
};
const registry = buildQuestionBankRegistry(deploymentBank);
const output = `${JSON.stringify(deploymentBank, null, 2)}\n`;
await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(targetUrl, output, "utf8");

const hash = createHash("sha256").update(output).digest("hex");
console.log(
  `Synced ${registry.questions.length} questions across ${registry.units.length} units to functions/data/question-bank.json`,
);
for (const unit of registry.units) {
  console.log(
    `${unit.unitId} ${unit.questionBankVersion}: ${unit.questions.length} questions (${unit.typeCounts.read_aloud} read_aloud, ${unit.typeCounts.question_answer} question_answer)`,
  );
}
console.log(`SHA-256 ${hash}`);
