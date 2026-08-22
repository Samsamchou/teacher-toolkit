import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const bankUrl = new URL("../data/hwg7-sentence-review.json", import.meta.url);
const browserUrl = new URL("../data/hwg7-sentence-review.js", import.meta.url);
const functionsUrl = new URL("../functions/data/question-bank.json", import.meta.url);

const UNIT_ID = "hwg7-sr";
const UNIT_LABEL = "HWG7 SR";
const BANK_VERSION = "hwg7-sr-v2-answer-only";
const RUBRIC_VERSION = "a1-v2-answer-only";
const CONFIRMED_ON = "2026-08-22";

const imageAlts = {
  "HWG7-SR-001": "一位女孩坐在桌前，旁邊有餐點與身體不適的情境插圖。",
  "HWG7-SR-002": "一位女孩一手靠近臉頰、桌上有食物的情境插圖。",
  "HWG7-SR-003": "一位女孩坐在桌前，桌上放著餐點的情境插圖。",
  "HWG7-SR-004": "一位女孩坐在桌前，旁邊有餐點與身體不適的情境插圖。",
  "HWG7-SR-005": "一位人物與幾頂帽子的情境插圖。",
  "HWG7-SR-006": "一位女孩拿著雨傘的情境插圖。",
  "HWG7-SR-007": "一位女孩一手靠近眼睛的情境插圖。",
  "HWG7-SR-008": "一位男孩一手靠近鼻子的情境插圖。",
  "HWG7-SR-009": "一位女孩一手扶著頭、桌上有餐點的情境插圖。",
  "HWG7-SR-010": "一位男孩伸出一隻手的情境插圖。",
  "HWG7-SR-011": "一位女孩坐在桌前，桌上放著一碗食物的情境插圖。",
  "HWG7-SR-012": "一位女孩坐在桌前，旁邊有餐點與身體不適的情境插圖。",
  "HWG7-SR-013": "一位女孩坐在桌前，桌上放著一盤食物的情境插圖。"
};

function addOnce(text, sentence) {
  const value = String(text || "").trim();
  return value.includes(sentence) ? value : `${value}${value ? " " : ""}${sentence}`;
}

function confirmAnalysis(analysis) {
  if (!analysis || typeof analysis !== "object") return;
  analysis.reviewStatus = "teacher_confirmed";
  if (analysis.tone && typeof analysis.tone === "object") {
    analysis.tone.note = addOnce(analysis.tone.note, "升降調只供模仿參考，不單獨決定是否達標。");
    analysis.tone.scoringUse = "model_only_not_pass_fail";
  }
  const targets = (analysis.pronunciationTargets || []).map(value => String(value).toLowerCase());
  if (targets.includes("would") || targets.includes("i’d")) {
    analysis.naturalSpeechTolerance = "would 或 I’d 的 /d/ 可以輕輕帶過；自然弱化或口音差異不會自動判定未達標。";
  }
  analysis.accentPolicy = "先依逐字稿判斷內容；自然弱化與可理解的口音差異不另行扣分。";
}

const bank = JSON.parse(await readFile(bankUrl, "utf8"));
bank.mode.unitId = UNIT_ID;
bank.mode.label = UNIT_LABEL;
bank.mode.questionBankVersion = BANK_VERSION;
bank.mode.rubricVersion = RUBRIC_VERSION;
bank.rubric.version = RUBRIC_VERSION;
bank.game.selection.typePattern = "round_pair_alternating";
bank.game.assignment = {
  playerIdentity: "A is first homepage code; B is second homepage code",
  everyGameStart: "Round 1 A=read_aloud; B=question_answer",
  roundPattern: "Odd rounds A=read_aloud and B=question_answer; even rounds reverse",
  nextGameRule: "Every new game restarts from the same round-1 pattern",
  persistenceKey: "unordered student pair + unit + Asia/Taipei date"
};
bank.rubric.readAloud.totalWeights = { textAccuracy: 0.5, completeness: 0.3, fluency: 0.2 };
bank.rubric.questionAnswer.scoringInput = "answer_transcript_only";
bank.rubric.questionAnswer.accuracyWeights = { answer: 1 };
bank.rubric.questionAnswer.completenessWeights = { answer: 1 };
bank.rubric.analysisUse.accentTolerance = "Natural reduction or an intelligible accent difference does not automatically fail a student.";
bank.rubric.analysisUse.toneGate = "Falling tone is a teaching model only and is never the sole pass/fail gate in a1-v2-answer-only.";
bank.review = {
  status: "teacher_confirmed",
  confirmedOn: CONFIRMED_ON,
  confirmedBy: "teacher",
  pending: [],
  confirmed: [
    "HWG7-SR-005 keeps the exact possessive his.",
    "Unit is HWG7 SR and the site reserves HWG5 SR, HWG8 SR, and HWG6 SR as preparing units.",
    "All 13 image alternative texts are neutral Traditional Chinese descriptions.",
    "Pronunciation and intonation guidance is confirmed with A1 accent and natural-reduction tolerance."
  ],
  productionReviewRequired: false,
  studentPilotAllowedAfterTechnicalQa: true
};
bank.source.reviewedOn = CONFIRMED_ON;
bank.source.authority = "teacher_confirmed_markdown_and_rdq";
bank.source.confirmedFacts = [
  ...new Set([
    ...(bank.source.confirmedFacts || []),
    "HWG7-SR-005 is exactly: They’re his caps.",
    "The unit is HWG7 SR.",
    "Within every game, round 1 is A read_aloud and B question_answer; round 2 reverses, alternating through round 6.",
    "Every new game restarts from the same round-1 pattern.",
    "Question-answer items record and score only the learner answer."
  ])
];

for (const question of bank.questions) {
  question.unitId = UNIT_ID;
  question.unit = UNIT_LABEL;
  question.unitReviewStatus = "teacher_confirmed";
  question.questionBankVersion = BANK_VERSION;
  question.rubricVersion = RUBRIC_VERSION;
  if (question.type === "question_answer") {
    question.typeLabel = "題型 2：Look and answer";
  } else {
    question.tts = { provider: "openai", model: "gpt-4o-mini-tts", voice: "marin", speed: 0.8, path: "audio/hwg7-sr/" + question.id + ".mp3", disclosure: "AI 語音" };
  }
  question.image.alt = imageAlts[question.id];
  question.image.altReviewStatus = "teacher_confirmed";
  if (!question.image.alt) throw new Error(`Missing confirmed alt for ${question.id}`);
  confirmAnalysis(question.pronunciationAnalysis);
  for (const answer of question.acceptableAnswers || []) confirmAnalysis(answer.pronunciationAnalysis);
}

const q5 = bank.questions.find(({ id }) => id === "HWG7-SR-005");
q5.contentReviewStatus = "teacher_confirmed";
delete q5.contentReviewIssue;
const caps = q5.pronunciationAnalysis.difficultWords.find(({ word }) => String(word).toLowerCase() === "caps");
caps.note = "字尾 /ps/ 要保留：先收住 /p/，再輕輕帶出複數 /s/；自然口音差異不單獨判失敗。";

const byId = new Map(bank.questions.map(question => [question.id, question]));
byId.get("HWG7-SR-005").acceptedEquivalentForms = [{ target: "They\u2019re", equivalent: "They are" }];
byId.get("HWG7-SR-006").answerPromptStructure = "___ her _____.";
byId.get("HWG7-SR-008").answerPromptStructure = "His ______ _____.";
byId.get("HWG7-SR-010").answerPromptStructure = "His ______ _____.";

const q11 = bank.questions.find(({ id }) => id === "HWG7-SR-011");
const noodles = q11.pronunciationAnalysis.difficultWords.find(({ word }) => String(word).toLowerCase() === "noodles");
noodles.note = "兩個音節，主要重音在第一音節；複數字尾是 /z/，要輕輕保留。";

const output = `${JSON.stringify(bank, null, 2)}\n`;
await writeFile(bankUrl, output, "utf8");
const questionsSource = JSON.stringify(bank.questions);
const questionsHash = createHash("sha256").update(questionsSource).digest("hex");
await writeFile(browserUrl, [
  "/* AUTO-GENERATED from the teacher-confirmed JSON bank.",
  " * Edit data/hwg7-sentence-review.json, then run the validator with --sync-js.",
  ` * questions-sha256: ${questionsHash}`,
  " */",
  `window.HWG7_SENTENCE_REVIEW_BANK = ${JSON.stringify(bank.questions, null, 2)};`,
  ""
].join("\n"), "utf8");
const deploymentBank = {
  schemaVersion: bank.schemaVersion,
  mode: bank.mode,
  game: bank.game,
  rubric: bank.rubric,
  questions: bank.questions
};
await writeFile(functionsUrl, `${JSON.stringify(deploymentBank, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  questionCount: bank.questions.length,
  questionBankVersion: BANK_VERSION,
  reviewStatus: bank.review.status,
  questionsHash,
  confirmedAltCount: bank.questions.filter(question => question.image?.altReviewStatus === "teacher_confirmed").length,
  confirmedAnalysisCount: bank.questions.reduce((count, question) => count + (question.pronunciationAnalysis ? 1 : 0) + (question.acceptableAnswers || []).length, 0)
}, null, 2));