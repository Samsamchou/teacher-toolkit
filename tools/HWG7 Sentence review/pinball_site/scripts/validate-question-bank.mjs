#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDir, "..");
const dataPath = path.join(siteRoot, "data", "hwg7-sentence-review.json");
const browserDataPath = path.join(siteRoot, "data", "hwg7-sentence-review.js");
const shouldSyncBrowserData = process.argv.includes("--sync-js");

const errors = [];
const warnings = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function countWords(text) {
  return text
    .replace(/[.,!?]/g, "")
    .trim()
    .split(/\s+/u)
    .filter(Boolean).length;
}

function checkAnalysis(analysis, label) {
  check(analysis && typeof analysis === "object", `${label}: 缺少 pronunciationAnalysis。`);
  if (!analysis || typeof analysis !== "object") return;
  check(analysis.reviewStatus === "pending", `${label}: 發音分析複核必須標為 pending。`);
  check(Array.isArray(analysis.pronunciationTargets) && analysis.pronunciationTargets.length > 0, `${label}: 缺少 pronunciationTargets。`);
  check(Array.isArray(analysis.difficultWords) && analysis.difficultWords.length > 0, `${label}: 缺少 difficultWords。`);
  check(Array.isArray(analysis.stressWords) && analysis.stressWords.length > 0, `${label}: 缺少 stressWords。`);
  check(analysis.tone?.pattern === "falling" && analysis.tone?.mark === "↘", `${label}: 陳述／答句應提供 falling ↘ 示範。`);
  check(Array.isArray(analysis.chunks) && analysis.chunks.length > 0, `${label}: 缺少 chunks。`);
  check(Array.isArray(analysis.linking), `${label}: linking 必須為陣列（可為空）。`);
  check(isNonEmptyString(analysis.studentReminder), `${label}: 缺少學生提醒。`);
}

const expected = [
  {
    id: "HWG7-SR-001",
    type: "read_aloud",
    sourcePath: "pics/08. cold chicken.png",
    imagePath: "images/hwg7-sentence-review/HWG7-SR-001.png",
    read: "She has a cold."
  },
  {
    id: "HWG7-SR-002",
    type: "question_answer",
    sourcePath: "pics/13. toothache bread.png",
    imagePath: "images/hwg7-sentence-review/HWG7-SR-002.png",
    question: "Does she have a toothache?",
    answers: ["Yes, she does.", "Yes, she has a toothache."]
  },
  {
    id: "HWG7-SR-003",
    type: "read_aloud",
    sourcePath: "pics/09.cough hamburger.png",
    imagePath: "images/hwg7-sentence-review/HWG7-SR-003.png",
    read: "She would like a hamburger."
  },
  {
    id: "HWG7-SR-004",
    type: "question_answer",
    sourcePath: "pics/08. cold chicken.png",
    imagePath: "images/hwg7-sentence-review/HWG7-SR-004.png",
    question: "What would you like for dinner?",
    answers: ["I would like some chicken.", "I’d like some chicken."]
  },
  {
    id: "HWG7-SR-005",
    type: "read_aloud",
    sourcePath: "pics/04. dream.jpeg",
    imagePath: "images/hwg7-sentence-review/HWG7-SR-005.jpeg",
    read: "They’re his caps."
  },
  {
    id: "HWG7-SR-006",
    type: "question_answer",
    sourcePath: "pics/05. ivy.jpeg",
    imagePath: "images/hwg7-sentence-review/HWG7-SR-006.jpeg",
    question: "Whose umbrella is this?",
    answers: ["It’s her umbrella.", "It is her umbrella."]
  },
  {
    id: "HWG7-SR-007",
    type: "read_aloud",
    sourcePath: "pics/02.png",
    imagePath: "images/hwg7-sentence-review/HWG7-SR-007.png",
    read: "Her eye hurts."
  },
  {
    id: "HWG7-SR-008",
    type: "question_answer",
    sourcePath: "pics/01.png",
    imagePath: "images/hwg7-sentence-review/HWG7-SR-008.png",
    question: "What’s wrong?",
    answers: ["His nose hurts."]
  },
  {
    id: "HWG7-SR-009",
    type: "read_aloud",
    sourcePath: "pics/11. headache soup.png",
    imagePath: "images/hwg7-sentence-review/HWG7-SR-009.png",
    read: "She has a headache."
  },
  {
    id: "HWG7-SR-010",
    type: "question_answer",
    sourcePath: "pics/03.png",
    imagePath: "images/hwg7-sentence-review/HWG7-SR-010.png",
    question: "What’s wrong?",
    answers: ["His hand hurts."]
  },
  {
    id: "HWG7-SR-011",
    type: "read_aloud",
    sourcePath: "pics/12. runny nose noodles.png",
    imagePath: "images/hwg7-sentence-review/HWG7-SR-011.png",
    read: "She would like some noodles."
  },
  {
    id: "HWG7-SR-012",
    type: "question_answer",
    sourcePath: "pics/08. cold chicken.png",
    imagePath: "images/hwg7-sentence-review/HWG7-SR-012.png",
    question: "Does she have a runny nose?",
    answers: ["No, she doesn’t.", "No, she has a cold."]
  },
  {
    id: "HWG7-SR-013",
    type: "read_aloud",
    sourcePath: "pics/10. fever salad.png",
    imagePath: "images/hwg7-sentence-review/HWG7-SR-013.png",
    read: "She would like some salad."
  }
];

function makeBrowserData(questions) {
  const compactSource = JSON.stringify(questions);
  const sourceHash = createHash("sha256").update(compactSource).digest("hex");
  return [
    "/* AUTO-GENERATED by scripts/validate-question-bank.mjs --sync-js.",
    " * Edit data/hwg7-sentence-review.json, then regenerate this file.",
    ` * questions-sha256: ${sourceHash}`,
    " */",
    `window.HWG7_SENTENCE_REVIEW_BANK = ${JSON.stringify(questions, null, 2)};`,
    ""
  ].join("\n");
}

function parseBrowserData(text) {
  const marker = "window.HWG7_SENTENCE_REVIEW_BANK = ";
  const start = text.indexOf(marker);
  check(start >= 0, "瀏覽器 JS 缺少 window.HWG7_SENTENCE_REVIEW_BANK 指派。");
  if (start < 0) return null;
  const payload = text.slice(start + marker.length).trim();
  check(payload.endsWith(";"), "瀏覽器 JS 指派結尾必須有分號。");
  if (!payload.endsWith(";")) return null;
  try {
    return JSON.parse(payload.slice(0, -1));
  } catch (error) {
    errors.push(`瀏覽器 JS 內的題庫陣列無法解析：${error.message}`);
    return null;
  }
}

function mulberry32(seed) {
  return function random() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleWithoutReplacement(items, count, random) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy.slice(0, count);
}

function sampleAlternatingGame(questionItems, random) {
  const readAloud = sampleWithoutReplacement(
    questionItems.filter((question) => question.type === "read_aloud"),
    6,
    random
  );
  const questionAnswer = sampleWithoutReplacement(
    questionItems.filter((question) => question.type === "question_answer"),
    6,
    random
  );
  return readAloud.flatMap((question, index) => [question, questionAnswer[index]]);
}

async function inspectImage(relativePath) {
  const absolutePath = path.join(siteRoot, ...relativePath.split("/"));
  try {
    await access(absolutePath);
    const fileStat = await stat(absolutePath);
    const bytes = await readFile(absolutePath);
    const extension = path.extname(absolutePath).toLowerCase();
    let decodableSignature = false;
    if (extension === ".png") {
      decodableSignature = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    } else if (extension === ".jpeg" || extension === ".jpg") {
      decodableSignature = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    }
    return { exists: true, bytes: fileStat.size, decodableSignature };
  } catch {
    return { exists: false, bytes: 0, decodableSignature: false };
  }
}

const raw = await readFile(dataPath, "utf8");
let bank;
try {
  bank = JSON.parse(raw);
} catch (error) {
  console.error(JSON.stringify({ ok: false, errors: [`JSON 無法解析：${error.message}`] }, null, 2));
  process.exit(1);
}

check(bank.schemaVersion === "1.0.0", "schemaVersion 必須是 1.0.0。");
check(bank.mode?.key === "hwg7SentenceReview", "mode.key 必須是 hwg7SentenceReview。");
check(bank.mode?.rubricVersion === "a1-v1", "mode.rubricVersion 必須是 a1-v1。");
check(bank.rubric?.version === "a1-v1", "rubric.version 必須是 a1-v1。");
check(Array.isArray(bank.questions), "questions 必須是陣列。");

const questions = Array.isArray(bank.questions) ? bank.questions : [];
const ids = questions.map((question) => question.id);
const uniqueIds = new Set(ids);
const readAloudCount = questions.filter((question) => question.type === "read_aloud").length;
const questionAnswerCount = questions.filter((question) => question.type === "question_answer").length;

check(questions.length === 13, `題庫必須精確13題，目前為 ${questions.length} 題。`);
check(uniqueIds.size === questions.length, `題目 ID 有重複：${questions.length - uniqueIds.size} 筆。`);
check(readAloudCount === 7, `read_aloud 必須7題，目前為 ${readAloudCount} 題。`);
check(questionAnswerCount === 6, `question_answer 必須6題，目前為 ${questionAnswerCount} 題。`);

check(bank.game?.bankSize === 13, "game.bankSize 必須是13。");
check(bank.game?.playerCount === 2, "game.playerCount 必須是2。");
check(bank.game?.questionsPerGame === 12, "game.questionsPerGame 必須是12。");
check(bank.game?.roundsPerPlayer === 6, "game.roundsPerPlayer 必須是6。");
check(bank.game?.questionsPerGame === bank.game?.roundsPerPlayer * bank.game?.playerCount, "每局題數必須等於每人回合 × 玩家數（T=2R）。");
check(bank.game?.questionsPerGame <= questions.length, "每局題數不得超過題庫數（T<=N）。");
check(bank.game?.selection?.withoutReplacement === true, "同局抽題必須不重複。");
check(bank.game?.selection?.unusedQuestionsPerGame === 1, "13題中每局抽12題，應保留1題未抽到。");
check(bank.game?.selection?.method === "balanced_by_type_then_alternate", "抽題方式必須先依題型各抽6題，再交替排列。");
check(bank.game?.selection?.readAloudPerGame === 6, "每局必須有6題 read_aloud。");
check(bank.game?.selection?.questionAnswerPerGame === 6, "每局必須有6題 question_answer。");
check(bank.game?.selection?.typePattern === "read_aloud_question_answer_alternating", "每局題型順序必須由 read_aloud 開始並嚴格交替。");
check(bank.game?.slotPlanPriority === "final_round_decision", "6回合設定必須保留最後一回合決勝優先。 ");
check(bank.game?.passScore === 80 && bank.game?.passOperator === ">=", "達標條件必須是 score >= 80。");
check(bank.game?.maxAttempts === 3, "每題最多有效嘗試必須是3次。");
check(bank.game?.systemFailureConsumesAttempt === false, "系統失敗不得消耗有效嘗試次數。");
check(bank.game?.afterMaxAttempts?.showConfirmedModelAnswer === true, "三次未達標後必須顯示確認示範答案。");
check(bank.game?.afterMaxAttempts?.resultStatus === "unmet", "三次未達標後必須記錄為 unmet。");
check(bank.game?.afterMaxAttempts?.allowPinballLaunch === true, "三次未達標後仍須允許發射彈珠。");
check(Array.isArray(bank.game?.speechInteraction?.states), "口說題型必須定義自有互動狀態。");
for (const requiredState of ["recording", "evaluating", "retry_ready", "passed", "attempts_exhausted_unmet", "launch_ready", "launched"]) {
  check(bank.game?.speechInteraction?.states?.includes(requiredState), `口說互動狀態缺少 ${requiredState}。`);
}

check(Math.abs(sum(Object.values(bank.rubric?.readAloud?.totalWeights ?? {})) - 1) < 1e-9, "read_aloud 總分權重必須合計1。");
check(Math.abs(sum(Object.values(bank.rubric?.readAloud?.fluency ?? {})) - 1) < 1e-9, "read_aloud 流暢度權重必須合計1。");
check(Math.abs(sum(Object.values(bank.rubric?.questionAnswer?.answerAccuracyWeights ?? {})) - 1) < 1e-9, "question_answer 答句準確度權重必須合計1。");
check(Math.abs(sum(Object.values(bank.rubric?.questionAnswer?.accuracyWeights ?? {})) - 1) < 1e-9, "question_answer 準確度權重必須合計1。");
check(Math.abs(sum(Object.values(bank.rubric?.questionAnswer?.completenessWeights ?? {})) - 1) < 1e-9, "question_answer 完整度權重必須合計1。");
check(Math.abs(sum(Object.values(bank.rubric?.questionAnswer?.totalWeights ?? {})) - 1) < 1e-9, "question_answer 總分權重必須合計1。");
check(bank.rubric?.questionAnswer?.wrongOrMissingCoreScoreCap === 59, "核心答案錯誤或未回答時的上限必須是59。");

const pendingKeys = (bank.review?.pending ?? []).map((item) => item.key);
const requiredPendingKeys = [
  "q005_possessive_person",
  "unit_or_category",
  "image_alt_text",
  "pronunciation_teaching_alignment"
];
check(bank.review?.status === "draft_pending_teacher_review", "題庫狀態必須保留 draft_pending_teacher_review。");
for (const key of requiredPendingKeys) {
  check(pendingKeys.includes(key), `待確認清單缺少 ${key}。`);
  const item = bank.review?.pending?.find((candidate) => candidate.key === key);
  check(item?.status === "pending", `${key} 必須標為 pending。`);
}

for (let index = 0; index < questions.length; index += 1) {
  const question = questions[index];
  const authority = expected[index];
  const label = question?.id || `第${index + 1}題`;
  check(question?.displayOrder === index + 1, `${label}: displayOrder 必須是 ${index + 1}。`);
  check(question?.id === authority?.id, `${label}: ID 與權威順序不符。`);
  check(question?.type === authority?.type, `${label}: 題型與權威來源不符。`);
  check(question?.type === (index % 2 === 0 ? "read_aloud" : "question_answer"), `${label}: 題型1/2沒有依序交替。`);
  check(question?.unit === null && question?.unitReviewStatus === "pending", `${label}: unit 必須保持 null/pending，不可猜測。`);
  check(question?.image?.sourcePath === authority?.sourcePath, `${label}: 圖片來源路徑不符。`);
  check(question?.image?.path === authority?.imagePath, `${label}: 部署圖片路徑不符。`);
  check(question?.image?.alt === null && question?.image?.altReviewStatus === "pending", `${label}: image.alt 必須保持 null/pending，不可猜測。`);
  check(question?.questionSentenceAnalysis === null, `${label}: 問句不得含發音或語調分析。`);
  check(question?.passScore === 80, `${label}: passScore 必須是80。`);
  check(question?.maxAttempts === 3, `${label}: maxAttempts 必須是3。`);
  check(question?.rubricVersion === "a1-v1", `${label}: rubricVersion 必須是 a1-v1。`);

  if (question?.type === "read_aloud") {
    check(question.questionText === "", `${label}: read_aloud 的 questionText 應為空字串。`);
    check(question.standardReadSentence === authority.read, `${label}: 朗讀句與權威來源不符。`);
    check(Array.isArray(question.acceptableAnswers) && question.acceptableAnswers.length === 0, `${label}: read_aloud 不應另填 acceptableAnswers。`);
    checkAnalysis(question.pronunciationAnalysis, label);
  } else if (question?.type === "question_answer") {
    check(question.questionText === authority.question, `${label}: 問句與權威來源不符。`);
    check(question.questionSentenceAnalysisScope === "excluded_by_teacher_instruction", `${label}: 必須明記問句排除發音分析。`);
    check(question.standardReadSentence === "", `${label}: question_answer 的 standardReadSentence 應為空字串。`);
    check(Array.isArray(question.acceptableAnswers), `${label}: acceptableAnswers 必須是陣列。`);
    const actualAnswerTexts = (question.acceptableAnswers ?? []).map((answer) => answer.text);
    check(JSON.stringify(actualAnswerTexts) === JSON.stringify(authority.answers), `${label}: 滿分答案版本與權威來源不符。`);
    check(new Set(actualAnswerTexts).size === actualAnswerTexts.length, `${label}: 滿分答案文字有重複。`);
    for (const answer of question.acceptableAnswers ?? []) {
      const answerLabel = `${label} / ${answer.text}`;
      check(answer.fullCredit === true, `${answerLabel}: 所列答案必須都是滿分。`);
      check(Array.isArray(answer.requiredContentSlots) && answer.requiredContentSlots.length > 0, `${answerLabel}: 缺少 requiredContentSlots。`);
      check(Array.isArray(answer.answerStructureSlots) && answer.answerStructureSlots.length > 0, `${answerLabel}: 缺少 answerStructureSlots。`);
      check(Number.isInteger(answer.answerWordCount) && answer.answerWordCount > 0, `${answerLabel}: answerWordCount 必須是正整數。`);
      check(answer.answerWordCount === countWords(answer.text), `${answerLabel}: answerWordCount 應為 ${countWords(answer.text)}。`);
      checkAnalysis(answer.pronunciationAnalysis, answerLabel);
    }
  }
}

const q005 = questions.find((question) => question.id === "HWG7-SR-005");
check(q005?.standardReadSentence === "They’re his caps.", "HWG7-SR-005 只能保留來源句 They’re his caps.，不得改猜其他人物。");
check(q005?.contentReviewStatus === "pending", "HWG7-SR-005 的 his 必須標記待確認。");
const q013 = questions.find((question) => question.id === "HWG7-SR-013");
check(q013?.standardReadSentence === "She would like some salad.", "HWG7-SR-013 必須精確為 She would like some salad.");

const imageResults = await Promise.all(questions.map((question) => inspectImage(question.image.path)));
let totalImageBytes = 0;
for (let index = 0; index < imageResults.length; index += 1) {
  const result = imageResults[index];
  const label = questions[index]?.id ?? `第${index + 1}題`;
  check(result.exists, `${label}: 部署圖片不存在。`);
  check(result.bytes > 0, `${label}: 部署圖片是0 bytes。`);
  check(result.decodableSignature, `${label}: 圖片檔頭與副檔名不符或無法辨識。`);
  totalImageBytes += result.bytes;
}

for (let seed = 1; seed <= 250; seed += 1) {
  const sampled = sampleAlternatingGame(questions, mulberry32(seed));
  const sampledIds = sampled.map((question) => question.id);
  check(sampled.length === 12, `抽題模擬 seed=${seed}: 題數不是12。`);
  check(new Set(sampledIds).size === sampled.length, `抽題模擬 seed=${seed}: 同局出現重複題目。`);
  check(sampled.filter((question) => question.type === "read_aloud").length === 6, `抽題模擬 seed=${seed}: read_aloud 不是6題。`);
  check(sampled.filter((question) => question.type === "question_answer").length === 6, `抽題模擬 seed=${seed}: question_answer 不是6題。`);
  check(sampled.every((question, index) => question.type === (index % 2 === 0 ? "read_aloud" : "question_answer")), `抽題模擬 seed=${seed}: 題型沒有嚴格交替。`);
}

if (shouldSyncBrowserData) {
  await mkdir(path.dirname(browserDataPath), { recursive: true });
  await writeFile(browserDataPath, makeBrowserData(questions), "utf8");
}

let browserQuestions = null;
try {
  const browserText = await readFile(browserDataPath, "utf8");
  browserQuestions = parseBrowserData(browserText);
  if (browserQuestions) {
    check(JSON.stringify(browserQuestions) === JSON.stringify(questions), "JSON 與瀏覽器 JS 題庫內容不同步。請執行 --sync-js。 ");
  }
} catch {
  errors.push("缺少 data/hwg7-sentence-review.js；請執行 --sync-js 產生。 ");
}

if (requiredPendingKeys.every((key) => pendingKeys.includes(key))) {
  warnings.push("仍有4類教師複核項目：his、單元／分類、圖片替代文字、發音教法對齊。 ");
}

const answerVariantCount = questions.reduce((total, question) => total + (question.acceptableAnswers?.length ?? 0), 0);
const summary = {
  ok: errors.length === 0,
  schemaVersion: bank.schemaVersion,
  mode: bank.mode?.key,
  questionBankVersion: bank.mode?.questionBankVersion,
  rubricVersion: bank.rubric?.version,
  questionCount: questions.length,
  validQuestionCount: errors.length === 0 ? questions.length : null,
  questionTypeCounts: {
    read_aloud: readAloudCount,
    question_answer: questionAnswerCount
  },
  answerVariantCount,
  questionsPerGame: bank.game?.questionsPerGame,
  roundsPerPlayer: bank.game?.roundsPerPlayer,
  passScore: bank.game?.passScore,
  maxAttempts: bank.game?.maxAttempts,
  duplicateIdCount: questions.length - uniqueIds.size,
  imageCount: imageResults.filter((result) => result.exists).length,
  missingImageCount: imageResults.filter((result) => !result.exists).length,
  invalidImageSignatureCount: imageResults.filter((result) => result.exists && !result.decodableSignature).length,
  totalImageBytes,
  sampledGamesChecked: 250,
  sampledGamesAlternating: errors.every((message) => !message.startsWith("抽題模擬")),
  browserJsSynced: browserQuestions ? JSON.stringify(browserQuestions) === JSON.stringify(questions) : false,
  pendingReviewKeys: requiredPendingKeys,
  warnings,
  errors
};

console.log(JSON.stringify(summary, null, 2));
if (errors.length > 0) process.exit(1);
