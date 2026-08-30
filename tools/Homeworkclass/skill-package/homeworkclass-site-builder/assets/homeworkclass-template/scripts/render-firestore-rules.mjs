import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const templateRoot = resolve(scriptDirectory, "..");

const ruleString = (value) =>
  `'${String(value).replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;

export function renderRulesTemplate(template, input) {
  if (input.contractVersion !== "homeworkclass-input-v1") {
    throw new Error("semester.json contractVersion 必須是 homeworkclass-input-v1");
  }
  if (!input.semester?.id || !input.classes?.length || !input.subjects?.length || !input.periods?.length) {
    throw new Error("semester.json 缺少學期、班級、科目或節次");
  }

  const validClassIds = `[${input.classes.map((item) => ruleString(item.id)).join(", ")}]`;
  const validSubjectIds = `[${input.subjects.map((item) => ruleString(item.id)).join(", ")}]`;
  const validPeriodIds = `[${input.periods.map((item) => ruleString(item.id)).join(", ")}]`;
  const validSeatExpression = input.classes
    .map(
      (item) =>
        `(classId == ${ruleString(item.id)} && seatNumber in [${item.seats.join(", ")}])`,
    )
    .join(" || ");

  const replacements = {
    __ACTIVE_SEMESTER_ID__: String(input.semester.id)
      .replaceAll("\\", "\\\\")
      .replaceAll("'", "\\'"),
    __VALID_CLASS_IDS__: validClassIds,
    __VALID_SUBJECT_IDS__: validSubjectIds,
    __VALID_PERIOD_IDS__: validPeriodIds,
    __VALID_SEAT_EXPRESSION__: validSeatExpression,
  };

  let rendered = template;
  for (const [marker, value] of Object.entries(replacements)) {
    if (!rendered.includes(marker)) throw new Error(`Rules template 缺少 ${marker}`);
    rendered = rendered.replaceAll(marker, value);
  }
  if (/__[A-Z0-9_]+__/.test(rendered)) throw new Error("Rules template 仍有未取代標記");
  return rendered;
}

export async function renderRulesFromFiles({
  inputPath = resolve(templateRoot, "src/data/semester.json"),
  templatePath = resolve(templateRoot, "firestore.rules.template"),
  outputPath = resolve(templateRoot, "firestore.rules.generated"),
} = {}) {
  const [inputText, template] = await Promise.all([
    readFile(inputPath, "utf8"),
    readFile(templatePath, "utf8"),
  ]);
  const rendered = renderRulesTemplate(template, JSON.parse(inputText));
  await writeFile(outputPath, rendered, "utf8");
  return outputPath;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const outputFlag = process.argv.indexOf("--output");
  const outputPath = outputFlag >= 0 ? resolve(process.argv[outputFlag + 1]) : undefined;
  const result = await renderRulesFromFiles(outputPath ? { outputPath } : undefined);
  process.stdout.write(`${result}\n`);
}
