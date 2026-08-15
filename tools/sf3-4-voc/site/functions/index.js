"use strict";

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getAppCheck } = require("firebase-admin/app-check");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const crypto = require("crypto");
const { adaptSsml } = require("./ssml");
const SITE_CONFIG = require("./site-config.generated.cjs");
const firebaseApp = initializeApp();
const firebaseAuth = getAuth(firebaseApp);
const firebaseAppCheck = getAppCheck(firebaseApp);
const firebaseStorage = getStorage(firebaseApp);
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const TEACHER_ACCESS_SECRET = defineSecret(SITE_CONFIG.security.teacherPasscodeSecret);
const APP_ID = SITE_CONFIG.appId;
const TEACHER_UID = `${APP_ID}-teacher`;
const REGION = SITE_CONFIG.speech.region;
const TRANSCRIBE_MODEL = SITE_CONFIG.speech.transcriptionModel;
const TTS_MODEL = SITE_CONFIG.speech.ttsModel;
const TTS_VOICE = SITE_CONFIG.speech.ttsVoice;
const WORD_TTS_SPEED = SITE_CONFIG.speech.wordSpeed;
const SENTENCE_TTS_SPEED = SITE_CONFIG.speech.sentenceSpeed;
const PROJECT_ID = SITE_CONFIG.firebase.projectId;
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const CORS_ORIGINS = [
  new RegExp(`^https://${escapeRegExp(PROJECT_ID)}\\.web\\.app$`, "i"),
  new RegExp(`^https://${escapeRegExp(PROJECT_ID)}\\.firebaseapp\\.com$`, "i"),
  /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/i,
];
const WORD_TTS_INSTRUCTIONS = "Speak as a friendly American elementary-school English teacher. Pronounce only the provided vocabulary word or phrase exactly once. Use a clear natural voice, steady volume, neutral falling intonation, and no breaths, whispers, sound effects, introductions, or extra words.";
const SENTENCE_TTS_INSTRUCTIONS = "Speak as a friendly American elementary-school English teacher. Read only the provided sentence exactly once. Use clear natural pronunciation, steady volume, gentle teaching warmth, and complete every final word. Do not add breaths, whispers, sound effects, introductions, or extra words.";
const WORD_TTS_HINTS = {
  "please.": "Begin please with a crisp P sound and finish it with the correct voiced Z sound.",
};
function ttsInstructions(speechType, text) {
  if (speechType === "sentence") return SENTENCE_TTS_INSTRUCTIONS;
  const hint = WORD_TTS_HINTS[String(text || "").trim().toLowerCase()];
  return hint ? `${WORD_TTS_INSTRUCTIONS} ${hint}` : WORD_TTS_INSTRUCTIONS;
}
const MAX_TTS_CHARS = 500;
// A single Firestore document is limited to 1 MiB. One 600 KiB binary recording
// becomes about 800 KiB after base64 encoding and still leaves room for fields.
const MAX_AUDIO_BYTES = 600 * 1024;
const firestore = getFirestore(firebaseApp);
const TOPICS = new Map(SITE_CONFIG.topics.map((topic) => [topic.id, topic]));
const ALLOWED_TTS = new Set(SITE_CONFIG.topics.flatMap((topic) => topic.words.flatMap((word) => [
  word.en,
  word.example,
  word.question,
  word.answer,
].filter(Boolean).map((value) => String(value).trim()))));
const RATE_WINDOW_MS = 10 * 60 * 1000;
const TEACHER_LOGIN_RATE_LIMIT = Number(SITE_CONFIG.security.teacherLoginRateLimit?.requests) || 5;
const rateBuckets = new Map();

class PublicError extends Error {
  constructor(message, statusCode = 500, debugCode = "PUBLIC_ERROR") {
    super(message); this.statusCode = statusCode; this.debugCode = debugCode;
  }
}
async function verifyAppCheck(req) {
  if (!SITE_CONFIG.security.requireAppCheck) return null;
  const token = String(req.headers["x-firebase-appcheck"] || "").trim();
  if (!token) throw new PublicError("無法驗證網站來源，請重新整理後再試。", 401, "APP_CHECK_REQUIRED");
  let verified;
  try {
    verified = await firebaseAppCheck.verifyToken(token);
  } catch (error) {
    logger.warn("App Check verification failed", { message: error.message });
    throw new PublicError("無法驗證網站來源，請重新整理後再試。", 401, "APP_CHECK_INVALID");
  }
  if (verified.appId !== SITE_CONFIG.firebase.appId) {
    throw new PublicError("網站來源不符合此專案。", 403, "APP_CHECK_APP_MISMATCH");
  }
  return verified;
}
function secureTextEqual(left, right) {
  const leftDigest = crypto.createHash("sha256").update(String(left), "utf8").digest();
  const rightDigest = crypto.createHash("sha256").update(String(right), "utf8").digest();
  return crypto.timingSafeEqual(leftDigest, rightDigest);
}
function taipeiDateKey(timestamp = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: SITE_CONFIG.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(timestamp));
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function enforceRateLimit(req, action, limit) {
  const now = Date.now();
  const client = String(req.ip || req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim();
  const key = `${action}:${client}`;
  const recent = (rateBuckets.get(key) || []).filter((stamp) => now - stamp < RATE_WINDOW_MS);
  if (recent.length >= limit) throw new PublicError("請求次數過多，請稍候再試。", 429, "RATE_LIMITED");
  recent.push(now);
  rateBuckets.set(key, recent);
  if (rateBuckets.size > 2000) {
    for (const [bucketKey, stamps] of rateBuckets) {
      if (!stamps.some((stamp) => now - stamp < RATE_WINDOW_MS)) rateBuckets.delete(bucketKey);
    }
  }
}
function parseDataUrl(dataUrl) {
  const [header, base64] = String(dataUrl || "").split(",", 2);
  if (!header?.startsWith("data:") || !/;base64/i.test(header) || !base64) throw new PublicError("錄音資料格式不正確，請重新錄音。", 400, "INVALID_AUDIO_DATA_URL");
  const mimeType = header.slice(5).split(";")[0] || "audio/webm"; const buffer = Buffer.from(base64, "base64");
  if (!buffer.length) throw new PublicError("沒有收到錄音內容，請再錄一次。", 400, "EMPTY_AUDIO");
  if (buffer.length > MAX_AUDIO_BYTES) throw new PublicError("錄音檔太大，請縮短錄音時間再試一次。", 413, "AUDIO_TOO_LARGE");
  return { buffer, mimeType };
}
function safePart(value) { return String(value || "unknown").trim().replace(/[^\w.-]+/g, "_").slice(0, 80) || "unknown"; }
function extension(mime) { if (mime.includes("mp4")) return "mp4"; if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3"; if (mime.includes("wav")) return "wav"; return "webm"; }
function bestRecordIdFor({ studentId, dateKey, category, mode, word }) {
  const key = JSON.stringify([String(studentId).trim(), dateKey, String(category).trim(), Number(mode) || 3, String(word).trim().toLowerCase()]);
  return `audioBest_${crypto.createHash("sha256").update(key).digest("hex").slice(0, 32)}`;
}
function normalizeWords(value) { return String(value || "").toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean); }
function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) for (let j = 1; j <= b.length; j += 1) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}
function scoreSingleTarget(transcript, targetWord) {
  const words = normalizeWords(transcript); const target = String(targetWord || "").toLowerCase().replace(/[^a-z]/g, "");
  if (!target || !words.length) return { score: 0, passed: false, feedback: "沒有聽到清楚的英文，請再錄一次。" };
  const joined = words.join(""); const bestDistance = Math.min(...words.map((w) => levenshtein(w, target)), levenshtein(joined, target)); const similarity = Math.max(0, 1 - bestDistance / Math.max(target.length, 1));
  if (words.includes(target)) return { score: 100, passed: true, feedback: `發音很清楚，OpenAI 聽到 "${transcript}"。` };
  if (joined.includes(target)) return { score: 90, passed: true, feedback: `很接近，OpenAI 聽到 "${transcript}"。` };
  if (similarity >= 0.8) return { score: 80, passed: true, feedback: `接近正確，請把 "${targetWord}" 的每個音再說清楚一點。` };
  if (similarity >= 0.6) return { score: 60, passed: false, feedback: `OpenAI 聽到 "${transcript}"，再試一次會更好。` };
  return { score: 40, passed: false, feedback: `OpenAI 聽到 "${transcript}"，請看著單字再錄一次。` };
}
function scorePronunciation(transcript, targetWord, acceptedAnswers = []) {
  const candidates = [...new Set([targetWord, ...(Array.isArray(acceptedAnswers) ? acceptedAnswers : [])]
    .map((value) => String(value || "").trim())
    .filter(Boolean))].slice(0, 6);
  return candidates
    .map((candidate) => ({ ...scoreSingleTarget(transcript, candidate), matchedTarget: candidate }))
    .sort((left, right) => right.score - left.score)[0];
}
async function transcribeWithOpenAI({ apiKey, buffer, mimeType, word }) {
  const key = String(apiKey || "").trim(); if (!key) throw new PublicError("OpenAI API key 尚未設定，請重新設定 Firebase Secret。", 500, "OPENAI_KEY_MISSING");
  const form = new FormData(); form.append("file", new Blob([buffer], { type: mimeType }), `student-speech.${extension(mimeType)}`); form.append("model", TRANSCRIBE_MODEL); form.append("response_format", "json"); form.append("language", "en");
  form.append("prompt", SITE_CONFIG.gradePrompt.replace("{word}", word));
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form });
  if (!response.ok) {
    const errorText = await response.text(); logger.error("OpenAI transcription failed", { status: response.status, errorText });
    if (response.status === 400) throw new PublicError("OpenAI 無法讀取這段錄音，請重新錄一次。", 502, "OPENAI_BAD_AUDIO");
    if (response.status === 401) throw new PublicError("OpenAI API key 無效，請確認 Firebase Secret。", 502, "OPENAI_KEY_INVALID");
    if (response.status === 403) throw new PublicError("OpenAI API key 沒有語音辨識模型權限。", 502, "OPENAI_FORBIDDEN");
    if (response.status === 429) throw new PublicError("OpenAI API 額度不足或尚未開通付款。", 502, "OPENAI_QUOTA");
    throw new PublicError(`OpenAI 語音辨識服務回傳錯誤 (${response.status})。`, 502, `OPENAI_${response.status}`);
  }
  return String((await response.json()).text || "").trim();
}
async function synthesizeWithOpenAI({ apiKey, text, speed, speechType }) {
  const key = String(apiKey || "").trim();
  if (!key) throw new PublicError("OpenAI API key 尚未設定，請重新設定 Firebase Secret。", 500, "OPENAI_KEY_MISSING");
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: TTS_MODEL,
      voice: TTS_VOICE,
      input: text,
      instructions: ttsInstructions(speechType, text),
      response_format: "mp3",
      speed,
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    logger.error("OpenAI speech generation failed", { status: response.status, errorText });
    if (response.status === 401) throw new PublicError("OpenAI API key 無效，請確認 Firebase Secret。", 502, "OPENAI_KEY_INVALID");
    if (response.status === 403) throw new PublicError("OpenAI API key 沒有文字轉語音權限。", 502, "OPENAI_FORBIDDEN");
    if (response.status === 429) throw new PublicError("OpenAI API 額度不足或尚未開通付款。", 502, "OPENAI_QUOTA");
    throw new PublicError(`OpenAI 文字轉語音服務回傳錯誤 (${response.status})。`, 502, `OPENAI_TTS_${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

exports.teacherLogin = onRequest({
  region: REGION,
  cors: CORS_ORIGINS,
  invoker: "public",
  secrets: [TEACHER_ACCESS_SECRET],
  timeoutSeconds: 30,
  memory: "256MiB",
  minInstances: 0,
  maxInstances: 2,
}, async (req, res) => {
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST is supported." });
  res.set("Cache-Control", "no-store");
  try {
    await verifyAppCheck(req);
    enforceRateLimit(req, "teacher-login", TEACHER_LOGIN_RATE_LIMIT);
    const passcode = String(req.body?.passcode || "");
    if (!passcode || passcode.length > 32) {
      throw new PublicError("請輸入有效的教師通行碼。", 400, "INVALID_TEACHER_PASSCODE");
    }
    if (!secureTextEqual(passcode, TEACHER_ACCESS_SECRET.value())) {
      throw new PublicError("教師通行碼不正確。", 401, "TEACHER_LOGIN_DENIED");
    }
    const claim = SITE_CONFIG.security.teacherClaim;
    const token = await firebaseAuth.createCustomToken(TEACHER_UID, { [claim]: true });
    return res.status(200).json({ ok: true, token });
  } catch (error) {
    logger.warn("teacherLogin failed", { debugCode: error.debugCode || "UNKNOWN_TEACHER_LOGIN_ERROR", statusCode: error.statusCode || 500 });
    if (error instanceof PublicError) return res.status(error.statusCode).json({ error: error.message, debugCode: error.debugCode });
    return res.status(500).json({ error: "教師登入暫時無法使用，請稍後再試。", debugCode: "UNKNOWN_TEACHER_LOGIN_ERROR" });
  }
});

exports.synthesizeSpeech = onRequest({ region: REGION, cors: CORS_ORIGINS, invoker: "public", secrets: [OPENAI_API_KEY], timeoutSeconds: 60, memory: "256MiB", minInstances: 0, maxInstances: 3 }, async (req, res) => {
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ error: "Only GET and POST are supported." });
  try {
    await verifyAppCheck(req);
    enforceRateLimit(req, "tts", 120);
    const payload = req.method === "GET" ? req.query : req.body;
    const requestedText = String(payload?.text || "").trim();
    const speechType = payload?.speechType === "sentence" ? "sentence" : "word";
    if (!requestedText) return res.status(400).json({ error: "Missing text." });
    if (requestedText.length > MAX_TTS_CHARS) return res.status(400).json({ error: `Text must be ${MAX_TTS_CHARS} characters or fewer.` });
    if (!ALLOWED_TTS.has(requestedText)) return res.status(400).json({ error: "Text is not part of the configured vocabulary lessons.", debugCode: "UNKNOWN_LESSON_TEXT" });
    let marked;
    try {
      marked = adaptSsml({ ssml: payload?.ssml, text: requestedText, speechType, wordSpeed: WORD_TTS_SPEED, sentenceSpeed: SENTENCE_TTS_SPEED });
    } catch (error) {
      throw new PublicError(error.message, 400, error.code || "INVALID_SSML");
    }
    const text = marked.input;
    if (text.length > MAX_TTS_CHARS) return res.status(400).json({ error: `Adapted text must be ${MAX_TTS_CHARS} characters or fewer.` });
    if (!/^[A-Za-z0-9\s.,?!'\u2019\u2013-]+$/.test(text)) return res.status(400).json({ error: "Only English vocabulary and sentences are supported." });
    const audio = await synthesizeWithOpenAI({ apiKey: OPENAI_API_KEY.value(), text, speed: marked.speed, speechType });
    res.set("Content-Type", "audio/mpeg");
    res.set("X-TTS-SSML-Adapted", marked.used ? "true" : "false");
    res.set("X-TTS-Model", TTS_MODEL);
    res.set("X-TTS-Voice", TTS_VOICE);
    res.set("Cache-Control", req.method === "GET" ? "public, max-age=86400" : "private, max-age=86400");
    return res.status(200).send(audio);
  } catch (error) {
    logger.error("synthesizeSpeech failed", { message: error.message, stack: error.stack });
    if (error instanceof PublicError) return res.status(error.statusCode).json({ error: error.message, debugCode: error.debugCode });
    return res.status(500).json({ error: "文字轉語音暫時失敗，請稍後再試。", debugCode: "UNKNOWN_TTS_ERROR" });
  }
});
exports.transcribeSpeech = onRequest({ region: REGION, cors: CORS_ORIGINS, invoker: "public", secrets: [OPENAI_API_KEY], timeoutSeconds: 60, memory: "512MiB", minInstances: 0, maxInstances: 3 }, async (req, res) => {
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST is supported." });
  try {
    await verifyAppCheck(req);
    enforceRateLimit(req, "transcribe", 30);
    const { studentId, word, category, audioDataUrl, mode = 3 } = req.body || {};
    if (!studentId || !word || !category || !audioDataUrl) return res.status(400).json({ error: "Missing studentId, word, category, or audioDataUrl." });
    const cleanStudentId = String(studentId).trim();
    if (!/^[\p{L}\p{N}._-]{1,32}$/u.test(cleanStudentId)) return res.status(400).json({ error: "Student ID must be 1-32 letters, numbers, dots, underscores, or hyphens." });
    const lesson = TOPICS.get(String(category).trim());
    const configuredWord = lesson?.words.find((item) => item.en === String(word).trim());
    if (!configuredWord) return res.status(400).json({ error: "Word and category are not part of the configured vocabulary lessons.", debugCode: "UNKNOWN_LESSON_WORD" });
    const acceptedAnswers = configuredWord.speechAliases || [];
    const { buffer, mimeType } = parseDataUrl(audioDataUrl); const timestamp = Date.now(); const dateKey = taipeiDateKey(timestamp);
    const transcript = await transcribeWithOpenAI({ apiKey: OPENAI_API_KEY.value(), buffer, mimeType, word: configuredWord.en }); const scoring = scorePronunciation(transcript, configuredWord.en, acceptedAnswers);
    const normalized = { studentId: cleanStudentId, word: configuredWord.en, category: lesson.id, mode: Number(mode) || 3 };
    const id = bestRecordIdFor({ ...normalized, dateKey }); const base = firestore.collection("artifacts").doc(APP_ID).collection("public").doc("data"); const submissionRef = base.collection("submissions").doc(id); const resultRef = base.collection("practiceResults").doc(id);
    const oldSnap = await submissionRef.get(); const old = oldSnap.exists ? oldSnap.data() : null; const oldScore = Number(old?.score ?? -1);
    if (old && oldScore >= scoring.score) return res.json({ ok: true, recorded: false, reason: "EXISTING_HIGHER_OR_EQUAL_SCORE", submissionId: id, transcript, score: scoring.score, feedback: `${scoring.feedback} 已保留目前最高分 ${oldScore} 分的錄音紀錄。`, passed: scoring.passed, dateKey, bestScore: oldScore, bestTranscript: old.transcript || "", audioStoragePath: old.audioStoragePath || null });
    const submission = { ...normalized, type: "audio", zh: configuredWord.zh, sentence: configuredWord.example, data: audioDataUrl, audioMimeType: mimeType, transcript, score: scoring.score, feedback: scoring.feedback, passed: scoring.passed, sttProvider: "openai", sttModel: TRANSCRIBE_MODEL, timestamp, dateKey, bestRecord: true, replacedScore: old ? oldScore : null, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() };
    try {
      const bucket = firebaseStorage.bucket(); const path = ["artifacts", APP_ID, "audio", dateKey, safePart(normalized.studentId), `${id}_${safePart(normalized.word)}.${extension(mimeType)}`].join("/");
      await bucket.file(path).save(buffer, { metadata: { contentType: mimeType, metadata: { studentId: normalized.studentId, word: normalized.word, category: normalized.category, dateKey } } });
      submission.audioStoragePath = path; submission.audioGsUrl = `gs://${bucket.name}/${path}`; if (old?.audioStoragePath && old.audioStoragePath !== path) await bucket.file(old.audioStoragePath).delete({ ignoreNotFound: true }).catch(() => {});
    } catch (e) { logger.warn("Audio Storage save failed; Firestore copy remains.", { message: e.message }); submission.storageWarning = e.message; }
    await submissionRef.set(submission);
    await resultRef.set({ studentId: normalized.studentId, dateKey, category: normalized.category, mode: normalized.mode, modeName: "聽音錄音", word: normalized.word, latestWord: normalized.word, modeScore: scoring.score, speechScore: scoring.score, transcript, feedback: scoring.feedback, passed: scoring.passed, submissionId: id, timestamp, bestRecord: true, replacedScore: old ? oldScore : null, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return res.json({ ok: true, recorded: true, submissionId: id, transcript, score: scoring.score, feedback: scoring.feedback, passed: scoring.passed, dateKey, bestScore: scoring.score, audioStoragePath: submission.audioStoragePath || null });
  } catch (error) {
    logger.error("transcribeSpeech failed", { message: error.message, stack: error.stack });
    if (error instanceof PublicError) return res.status(error.statusCode).json({ error: error.message, debugCode: error.debugCode });
    return res.status(500).json({ error: "語音辨識暫時失敗，請稍後再試。", debugCode: "UNKNOWN_TRANSCRIBE_ERROR" });
  }
});
