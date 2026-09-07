import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = JSON.parse(await readFile(resolve(root, "config/site-source.json"), "utf8"));
const errors = [];
const hash = (value) => createHash("sha256").update(value).digest("hex");
const quizSourceConfigs = Array.isArray(source.quizSources) ? source.quizSources : [];
const bankEntries = [];

for (const quizConfig of quizSourceConfigs) {
  try {
    const bankPath = resolve(root, "config", quizConfig.file);
    const bankText = await readFile(bankPath, "utf8");
    bankEntries.push({ quizConfig, bankPath, bankText, bank: JSON.parse(bankText) });
  } catch (error) {
    errors.push(`${quizConfig?.quizId || "unknown quiz"}: cannot load question bank (${error.message}).`);
  }
}
const books = source.books || [];
const units = books.flatMap((book) => book.units || []);
const lessonCountForUnit = (unit) => Number(unit?.lessonCount || source.lessonTemplate?.lessonsPerUnit || 0);
const totalLessonCount = units.reduce((total, unit) => total + lessonCountForUnit(unit), 0);

if (source.mode !== "firebase-ready") errors.push("Site must be Firebase-ready.");
const teacherPasscode = source.firebase?.teacherPasscode || {};
if (source.firebase?.functionsRegion !== "asia-east1") errors.push("Teacher Results Functions must use asia-east1.");
if (teacherPasscode.secretName !== "TEACHER_RESULTS_PASSCODE") errors.push("Teacher passcode Secret name must be configured without a value.");
if (teacherPasscode.loginFunction !== "teacherPasscodeLogin" || teacherPasscode.logoutFunction !== "teacherPasscodeLogout" || teacherPasscode.listFunction !== "teacherResultsList" || teacherPasscode.recordExportFunction !== "teacherResultsRecordExport" || teacherPasscode.deleteFunction !== "teacherResultsDelete") errors.push("Teacher Results Function names must be canonical.");
if (teacherPasscode.sessionHours !== 8 || teacherPasscode.resultLimit !== 5000) errors.push("Teacher Results session and record limits must remain approved values.");
if (teacherPasscode.rateLimit?.userMaxAttempts !== 5 || teacherPasscode.rateLimit?.globalMaxAttempts !== 20 || teacherPasscode.rateLimit?.windowMinutes !== 15) errors.push("Teacher passcode rate-limit configuration must remain approved values.");
if (books.length !== 2 || units.length !== 10 || totalLessonCount !== 46) {
  errors.push(`Expected 2 books, 10 units, and 46 lessons; found ${books.length}, ${units.length}, ${totalLessonCount}.`);
}
for (const book of books) {
  const starter = (book.units || []).find((unit) => unit.id === "starter");
  const nonStarterUnits = (book.units || []).filter((unit) => unit.id !== "starter");
  const bookLessonCount = (book.units || []).reduce((total, unit) => total + lessonCountForUnit(unit), 0);
  if (lessonCountForUnit(starter) !== 3) errors.push(`${book.id}: Starter must contain exactly 3 lessons.`);
  if (nonStarterUnits.length !== 4 || nonStarterUnits.some((unit) => lessonCountForUnit(unit) !== 5)) errors.push(`${book.id}: Unit 1–4 must each contain 5 lessons.`);
  if (bookLessonCount !== 23) errors.push(`${book.id}: expected 23 lessons, found ${bookLessonCount}.`);
}
const hwg7 = books.find((book) => book.id === "hwg7");
if (hwg7?.grade !== "Grade 6") errors.push("HWG7 must be Grade 6.");
if ((source.studentEntry?.queryFields || []).join(",") !== "book,unit,lesson") errors.push("Student QR must carry book, unit, and lesson only.");
if (Object.keys(source.unitThemes || {}).length !== 10) errors.push("Each of the 10 units requires a theme.");
const defaultFlowTypes = (source.defaultFlow || []).map((step) => step.type);
if (defaultFlowTypes.join(",") !== "warmup,ebook,video,presentation,imageSlides,webPractice,vocabularyQuiz") errors.push("Default Lesson Flow must place presentation after video and before image slides.");
const presentationTemplate = (source.defaultFlow || []).find((step) => step.type === "presentation");
if (!presentationTemplate || presentationTemplate.title !== "簡報" || presentationTemplate.content?.uploadedMedia !== null) errors.push("Presentation template must be an optional PDF upload step.");
const ebookUrl = source.contentProfiles["hwg7-u01-l01-live"]?.ebook?.url || "";
if (!ebookUrl.startsWith("https://edisc3.hle.com.tw/edisc_v3/ebook_v2023.html#")) errors.push("HWG7 U1 L1 E-book must use the stable Hanlin catalog URL.");
if (/^https:\/\/h5\.hle\.com\.tw\/toolbar\/release\/index\.html\?key=/i.test(ebookUrl)) errors.push("HWG7 U1 L1 E-book must not store a one-time toolbar key URL.");
const override = (source.contentOverrides || []).find((item) => item.bookId === "hwg7" && item.unitId === "u01" && item.lessonNumber === 1);
if (override?.contentProfile !== "hwg7-u01-l01-live") errors.push("HWG7 Unit 1 Lesson 1 must point to the live content profile.");
const hwg5Override = (source.contentOverrides || []).find((item) => item.bookId === "hwg5" && item.unitId === "u01" && item.lessonNumber === 1);
if (hwg5Override?.contentProfile !== "hwg5-u01-l01-vocabulary") errors.push("HWG5 Unit 1 Lesson 1 must point to its vocabulary profile.");
if (source.contentProfiles["hwg5-u01-l01-vocabulary"]?.vocabularyQuiz?.quizId !== "hwg5-u01-l1-vocabulary") errors.push("HWG5 Unit 1 Lesson 1 must use the HWG5 vocabulary question bank.");
if (quizSourceConfigs.length !== 2) errors.push(`Expected two registered quiz sources, found ${quizSourceConfigs.length}.`);
if (new Set(quizSourceConfigs.map((item) => item.quizId)).size !== quizSourceConfigs.length) errors.push("Quiz source IDs must be unique.");

const questionCounts = {};
const previewQuestionBankSha256 = {};
for (const { quizConfig, bankText, bank } of bankEntries) {
  const quizId = bank.lesson?.quizId || quizConfig.quizId;
  if (quizId !== quizConfig.quizId) errors.push(`${quizConfig.quizId}: bank quizId differs.`);
  if (bank.revision !== quizConfig.revision) errors.push(`${quizId}: expected revision ${quizConfig.revision}, found ${bank.revision}.`);
  if (!String(bank.reviewStatus || "").startsWith("approved_teacher_")) errors.push(`${quizId}: question bank is not teacher-approved.`);
  const counts = Object.fromEntries((bank.questionSets || []).map((set) => [set.id, set.questions.length]));
  questionCounts[quizId] = counts;
  previewQuestionBankSha256[quizId] = hash(bankText);
  for (const [setId, expectedCount] of Object.entries(quizConfig.questionCounts || {})) {
    if (counts[setId] !== expectedCount) errors.push(`${quizId}: expected ${setId}=${expectedCount}, found ${counts[setId]}.`);
  }

  let sourceText = "";
  try {
    sourceText = await readFile(resolve(root, "config", quizConfig.sourceOfTruth), "utf8");
    if (hash(sourceText) !== hash(bankText)) errors.push(`${quizId}: preview snapshot differs from its approved source of truth.`);
  } catch (error) {
    errors.push(`${quizId}: cannot read source of truth (${error.message}).`);
  }

  for (const questionSet of bank.questionSets || []) {
    const assetGroup = questionSet.id === "type-a" ? bank.assets?.images : bank.assets?.audio;
    for (const question of questionSet.questions || []) {
      if (question.options.length !== 4) errors.push(`${question.id}: requires four options.`);
      if (new Set(question.options).size !== 4) errors.push(`${question.id}: duplicate options.`);
      if (question.options[question.correctOptionNumberInReview - 1] !== question.correctAnswer) errors.push(`${question.id}: correct answer position differs.`);
      if (question.runtimeShuffleOptions !== true) errors.push(`${question.id}: runtime options must shuffle.`);
      const asset = assetGroup?.items?.[question.assetFilename];
      if (!asset?.plannedWebsitePath) {
        errors.push(`${question.id}: missing planned website asset.`);
        continue;
      }
      try {
        const publicAsset = await readFile(resolve(root, "public", asset.plannedWebsitePath.replace(/^\//, "")));
        const expectedHash = questionSet.id === "type-a"
          ? asset.processedSha256
          : asset.sourceSha256;
        if (expectedHash && hash(publicAsset) !== expectedHash) errors.push(`${question.id}: staged website asset hash differs.`);
      } catch (error) {
        errors.push(`${question.id}: staged website asset is missing (${error.message}).`);
      }
    }
  }
}
const expectedSource = process.env.SOURCE_QUESTION_BANK;
if (expectedSource) {
  const sourceText = await readFile(expectedSource, "utf8");
  if (!bankEntries.some(({ bankText }) => hash(sourceText) === hash(bankText))) errors.push("Provided question-bank source differs from every registered preview snapshot.");
}
const report = { status: errors.length ? "FAIL" : "PASS", books: books.length, units: units.length, lessons: totalLessonCount, quizSources: bankEntries.length, questionCounts, previewQuestionBankSha256, errors };
console.log(JSON.stringify(report, null, 2));
process.exitCode = errors.length ? 1 : 0;
