"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const OpenAI = require("openai");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const v3 = require("./recognition-v3");

initializeApp();
const db = getFirestore();
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

setGlobalOptions({
  region: "asia-east1",
  maxInstances: 20,
  timeoutSeconds: 90,
  memory: "512MiB",
});

const ATTEMPTS_COLLECTION = "letterPracticeAttempts";
const SESSIONS_COLLECTION = "letterPracticeSessions";
// SHA-256 of the teacher password, kept in Firebase Secret Manager (not in Git).
const TEACHER_PASSWORD_SHA256 = defineSecret("TEACHER_PASSWORD_SHA256");
const TEACHER = { secrets: [TEACHER_PASSWORD_SHA256] };

const LETTER_VALUES = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "?",
];

const BLIND_RECOGNITION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    left_letter: { type: "string", enum: LETTER_VALUES },
    right_letter: { type: "string", enum: LETTER_VALUES },
    left_case: {
      type: "string",
      enum: ["uppercase", "lowercase", "unclear", "blank"],
    },
    right_case: {
      type: "string",
      enum: ["uppercase", "lowercase", "unclear", "blank"],
    },
    left_identity_score: { type: "integer", minimum: 0, maximum: 100 },
    right_identity_score: { type: "integer", minimum: 0, maximum: 100 },
    position_score: { type: "integer", minimum: 0, maximum: 100 },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
    raw_reading: { type: "string" },
    feedback_zh: { type: "string" },
  },
  required: [
    "left_letter",
    "right_letter",
    "left_case",
    "right_case",
    "left_identity_score",
    "right_identity_score",
    "position_score",
    "confidence",
    "raw_reading",
    "feedback_zh",
  ],
};

const REFERENCE_COMPARISON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    upper_shape_score: { type: "integer", minimum: 0, maximum: 100 },
    lower_shape_score: { type: "integer", minimum: 0, maximum: 100 },
    upper_position_score: { type: "integer", minimum: 0, maximum: 100 },
    lower_position_score: { type: "integer", minimum: 0, maximum: 100 },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
    feedback_zh: { type: "string" },
  },
  required: [
    "upper_shape_score",
    "lower_shape_score",
    "upper_position_score",
    "lower_position_score",
    "confidence",
    "feedback_zh",
  ],
};

const referenceImageCache = new Map();

function openAIClient() {
  const apiKey = OPENAI_API_KEY.value();
  if (!apiKey) {
    throw new HttpsError(
      "failed-precondition",
      "OPENAI_API_KEY 尚未設定，請聯絡管理員。",
    );
  }
  return new OpenAI({ apiKey });
}

function text(value, maxLength = 80) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function numberInRange(value, minimum, maximum, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function taipeiDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function makeSessionKey(dateKey, studentId) {
  const studentHash = crypto
    .createHash("sha256")
    .update(studentId, "utf8")
    .digest("hex")
    .slice(0, 24);
  return `${dateKey}_${studentHash}`;
}

function verifyTeacherPassword(password) {
  const received = crypto
    .createHash("sha256")
    .update(String(password ?? ""), "utf8")
    .digest();
  const expected = Buffer.from(TEACHER_PASSWORD_SHA256.value().trim(), "hex");
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

function requireTeacher(password) {
  if (!verifyTeacherPassword(password)) {
    throw new HttpsError("permission-denied", "教師密碼錯誤。");
  }
}

function validateImageDataUrl(value, fieldName, maxBytes) {
  const dataUrl = String(value ?? "");
  if (!/^data:image\/(png|jpeg|webp);base64,/i.test(dataUrl)) {
    throw new HttpsError("invalid-argument", `${fieldName} 不是有效的圖片資料。`);
  }
  if (Buffer.byteLength(dataUrl, "utf8") > maxBytes) {
    throw new HttpsError("invalid-argument", `${fieldName} 圖片過大。`);
  }
  return dataUrl;
}

function sanitizeStrokes(rawStrokes) {
  if (!Array.isArray(rawStrokes)) return [];
  return rawStrokes.slice(0, 80).map((stroke) => {
    const rawPoints = Array.isArray(stroke?.points) ? stroke.points : [];
    return {
      points: rawPoints.slice(0, 2500).map((point) => ({
        x: numberInRange(point?.x, 0, 1, 0),
        y: numberInRange(point?.y, 0, 1, 0),
        t: Math.round(numberInRange(point?.t, 0, 120000, 0)),
      })),
    };
  });
}

function parseOpenAIJson(response) {
  const outputText = text(response?.output_text, 5000);
  if (!outputText) {
    throw new Error("OpenAI 未回傳可讀取的辨識結果。");
  }
  return JSON.parse(outputText);
}

async function createVisionResponse(client, {
  prompt,
  images,
  schema,
  schemaName,
  effort = "medium",
  maxOutputTokens = 900,
}) {
  const models = ["gpt-5.6-sol", "gpt-5.6-luna", "gpt-4o-mini"];
  const failedModels = [];
  let lastError;

  for (const model of models) {
    try {
      const request = {
        model,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              ...images.map((imageUrl) => ({
                type: "input_image",
                image_url: imageUrl,
                detail: "high",
              })),
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: schemaName,
            strict: true,
            schema,
          },
        },
        max_output_tokens: maxOutputTokens,
      };
      if (model.startsWith("gpt-5.6")) {
        request.reasoning = { effort };
      }
      const response = await client.responses.create(request);
      return { result: parseOpenAIJson(response), model, failedModels };
    } catch (error) {
      lastError = error;
      failedModels.push(`${model}:${error?.status || error?.code || "error"}`);
      console.warn(`Vision model ${model} failed`, {
        status: error?.status,
        code: error?.code,
        message: error?.message,
      });
    }
  }

  throw lastError || new Error("OpenAI handwriting recognition failed.");
}

async function recognizeBlind(client, imageDataUrl) {
  const prompt = [
    "You are the blind first examiner for a children's English handwriting test.",
    "CRITICAL: you are not given the expected answer. Never guess the student's intention and never invent a target letter.",
    "The image is a four-line writing board split vertically. Judge ONLY the blue handwriting; ignore all guide lines.",
    "Independently classify what is actually visible on the LEFT and RIGHT.",
    "Return the observed letter normalized to A-Z, and separately identify whether its drawn form is uppercase or lowercase.",
    "LEFT is supposed to contain an uppercase form and RIGHT a lowercase form, but report the actual observed case even when it is wrong.",
    "Use ? and unclear when the marks are not confidently a recognizable English letter.",
    "A vertical line without the required bars or dot is not automatically I or i. A loop is not automatically O, P, D, G, or Q.",
    "A lowercase h is not an uppercase H or N. A v-like mark is not R. Missing defining strokes must sharply lower identity scores.",
    "Position score reflects separation into the correct half and placement on the handwriting guide.",
    "Give one concise Traditional Chinese description of what you actually see, without mentioning any expected answer.",
  ].join(" ");

  return createVisionResponse(client, {
    prompt,
    images: [imageDataUrl],
    schema: BLIND_RECOGNITION_SCHEMA,
    schemaName: "blind_letter_recognition",
  });
}

function referenceImageDataUrl(letter, letterCase) {
  const lower = letter.toLowerCase();
  const fileName =
    letterCase === "uppercase"
      ? `${letter}-upper.jpg`
      : `${lower}-lower.jpg`;
  if (!referenceImageCache.has(fileName)) {
    const filePath = path.join(__dirname, "reference-cards", fileName);
    referenceImageCache.set(
      fileName,
      `data:image/jpeg;base64,${fs.readFileSync(filePath).toString("base64")}`,
    );
  }
  return referenceImageCache.get(fileName);
}

async function compareWithReference(client, targetLetter, imageDataUrl) {
  const prompt = [
    `Image 1 is the student's writing board. Image 2 is the official uppercase ${targetLetter} reference card.`,
    `Image 3 is the official lowercase ${targetLetter.toLowerCase()} reference card.`,
    "Compare the blue handwriting in Image 1 against ONLY the large black/red letter shapes and four-line placement in the reference cards.",
    "Ignore magenta stroke numbers/arrows, publisher text, and gray/cyan guide lines in Images 2 and 3.",
    "On the student board, the left half must match the uppercase reference and the right half must match the lowercase reference.",
    "Be strict about defining strokes, open/closed loops, stems, crossbars, dots, tails, case, proportions, and baseline/midline/topline placement.",
    "A different letter, wrong case, missing required stroke, or generic line/loop must score below 50 for shape.",
    "Minor child handwriting wobble may still pass only when the identity-defining structure is clearly correct.",
    "Return concise Traditional Chinese feedback and do not reveal the target letter.",
  ].join(" ");

  return createVisionResponse(client, {
    prompt,
    images: [
      imageDataUrl,
      referenceImageDataUrl(targetLetter, "uppercase"),
      referenceImageDataUrl(targetLetter, "lowercase"),
    ],
    schema: REFERENCE_COMPARISON_SCHEMA,
    schemaName: "reference_letter_comparison",
  });
}

function evaluateAssessment({
  targetLetter,
  blind,
  reference,
  localLeftCoverage,
  localRightCoverage,
  localLeftPoints,
  localRightPoints,
}) {
  const observedLeft = text(blind.left_letter, 1).toUpperCase();
  const observedRight = text(blind.right_letter, 1).toUpperCase();
  const blindIdentityMatch =
    observedLeft === targetLetter &&
    blind.left_case === "uppercase" &&
    observedRight === targetLetter &&
    blind.right_case === "lowercase";
  const blindQuality =
    numberInRange(blind.left_identity_score, 0, 100) >= 72 &&
    numberInRange(blind.right_identity_score, 0, 100) >= 72 &&
    numberInRange(blind.confidence, 0, 100) >= 72;
  const bothSidesWritten =
    localLeftCoverage >= 0.75 &&
    localRightCoverage >= 0.75 &&
    localLeftPoints >= 2 &&
    localRightPoints >= 2;
  const referenceQuality =
    Boolean(reference) &&
    numberInRange(reference.upper_shape_score, 0, 100) >= 74 &&
    numberInRange(reference.lower_shape_score, 0, 100) >= 74 &&
    numberInRange(reference.upper_position_score, 0, 100) >= 58 &&
    numberInRange(reference.lower_position_score, 0, 100) >= 58 &&
    numberInRange(reference.confidence, 0, 100) >= 72;

  return {
    passed:
      blindIdentityMatch &&
      blindQuality &&
      bothSidesWritten &&
      referenceQuality,
    blindIdentityMatch,
    blindQuality,
    bothSidesWritten,
    referenceQuality,
    observedLeft,
    observedRight,
  };
}

function friendlyOpenAIError(error) {
  if (error instanceof HttpsError) return error;
  const status = Number(error?.status);
  if (status === 401) {
    return new HttpsError("failed-precondition", "OpenAI API 金鑰無效，請聯絡管理員。");
  }
  if (status === 429) {
    return new HttpsError("resource-exhausted", "AI 服務目前忙碌或額度不足，請稍後再試。");
  }
  if (status >= 500) {
    return new HttpsError("unavailable", "AI 服務暫時無法使用，請稍後再試。");
  }
  return new HttpsError("internal", "AI 辨識暫時失敗，請再試一次。");
}

exports.speakLetter = onCall(
  { secrets: [OPENAI_API_KEY], timeoutSeconds: 60, memory: "256MiB" },
  async (request) => {
    const letter = text(request.data?.letter, 1).toUpperCase();
    if (!/^[A-Z]$/.test(letter)) {
      throw new HttpsError("invalid-argument", "請提供一個英文字母。");
    }

    try {
      const client = openAIClient();
      const audio = await client.audio.speech.create({
        model: "tts-1",
        voice: "nova",
        input: letter,
        response_format: "mp3",
        speed: 0.72,
      });
      const buffer = Buffer.from(await audio.arrayBuffer());
      return {
        audioBase64: buffer.toString("base64"),
        mimeType: "audio/mpeg",
        model: "tts-1",
        repetitions: 3,
      };
    } catch (error) {
      console.error("speakLetter failed", {
        status: error?.status,
        code: error?.code,
        message: error?.message,
      });
      throw friendlyOpenAIError(error);
    }
  },
);

exports.analyzeLetterAttempt = onCall(
  { secrets: [OPENAI_API_KEY], timeoutSeconds: 180, memory: "1GiB" },
  async (request) => {
    const studentId = text(request.data?.studentId, 40);
    const studentName = text(request.data?.studentName || "學生", 40);
    const targetLetter = text(request.data?.targetLetter, 1).toUpperCase();
    const imageDataUrl = validateImageDataUrl(
      request.data?.imageDataUrl,
      "辨識圖片",
      1_800_000,
    );
    const thumbnailDataUrl = validateImageDataUrl(
      request.data?.thumbnailDataUrl,
      "縮圖",
      500_000,
    );
    const strokes = sanitizeStrokes(request.data?.strokes);
    const localPositionScore = Math.round(
      numberInRange(request.data?.localMetrics?.positionScore, 0, 100, 0),
    );
    const localCoverage = numberInRange(
      request.data?.localMetrics?.coverage,
      0,
      100,
      0,
    );
    const localLeftCoverage = numberInRange(
      request.data?.localMetrics?.leftCoverage,
      0,
      100,
      0,
    );
    const localRightCoverage = numberInRange(
      request.data?.localMetrics?.rightCoverage,
      0,
      100,
      0,
    );
    const localLeftPoints = Math.round(
      numberInRange(request.data?.localMetrics?.leftPointCount, 0, 200000, 0),
    );
    const localRightPoints = Math.round(
      numberInRange(request.data?.localMetrics?.rightPointCount, 0, 200000, 0),
    );

    if (!studentId) {
      throw new HttpsError("invalid-argument", "缺少學生座號或學號。");
    }
    if (!/^[A-Z]$/.test(targetLetter)) {
      throw new HttpsError("invalid-argument", "目標字母不正確。");
    }
    if (!strokes.some((stroke) => stroke.points.length > 0)) {
      throw new HttpsError("invalid-argument", "沒有可儲存的筆跡。");
    }

    try {
      const client = openAIClient();
      const {
        result: blind,
        model: blindModel,
      } = await recognizeBlind(client, imageDataUrl);

      const preliminary = evaluateAssessment({
        targetLetter,
        blind,
        reference: null,
        localLeftCoverage,
        localRightCoverage,
        localLeftPoints,
        localRightPoints,
      });

      let reference = null;
      let referenceModel = "";
      if (
        preliminary.blindIdentityMatch &&
        preliminary.blindQuality &&
        preliminary.bothSidesWritten
      ) {
        const compared = await compareWithReference(
          client,
          targetLetter,
          imageDataUrl,
        );
        reference = compared.result;
        referenceModel = compared.model;
      }

      const decision = evaluateAssessment({
        targetLetter,
        blind,
        reference,
        localLeftCoverage,
        localRightCoverage,
        localLeftPoints,
        localRightPoints,
      });

      const leftMatchesTarget =
        decision.observedLeft === targetLetter &&
        blind.left_case === "uppercase";
      const rightMatchesTarget =
        decision.observedRight === targetLetter &&
        blind.right_case === "lowercase";
      const upperScore = leftMatchesTarget
        ? Math.round(
            numberInRange(
              reference?.upper_shape_score ?? blind.left_identity_score,
              0,
              100,
            ),
          )
        : 0;
      const lowerScore = rightMatchesTarget
        ? Math.round(
            numberInRange(
              reference?.lower_shape_score ?? blind.right_identity_score,
              0,
              100,
            ),
          )
        : 0;
      const aiPositionScore = Math.round(
        reference
          ? (numberInRange(reference.upper_position_score, 0, 100) +
              numberInRange(reference.lower_position_score, 0, 100)) /
              2
          : numberInRange(blind.position_score, 0, 100),
      );
      const positionScore = Math.round(
        aiPositionScore * 0.8 + localPositionScore * 0.2,
      );
      const confidence = Math.round(
        reference
          ? Math.min(
              numberInRange(blind.confidence, 0, 100),
              numberInRange(reference.confidence, 0, 100),
            )
          : numberInRange(blind.confidence, 0, 100),
      );
      const passed = decision.passed && positionScore >= 58;
      const overallScore = Math.round(
        upperScore * 0.36 +
          lowerScore * 0.36 +
          positionScore * 0.18 +
          confidence * 0.1,
      );
      const rawReading =
        text(blind.raw_reading, 120) ||
        `${blind.left_case}:${decision.observedLeft} | ${blind.right_case}:${decision.observedRight}`;
      const caseLabel = (letterCase) =>
        ({
          uppercase: "大寫",
          lowercase: "小寫",
          unclear: "不明",
          blank: "空白",
        })[letterCase] || "不明";
      const observedLabel = (letter, letterCase) =>
        letter === "?"
          ? `${caseLabel(letterCase)}字形`
          : `${caseLabel(letterCase)} ${letter}`;
      let feedback;
      if (passed) {
        feedback = `辨識成功！大小寫、字形與四線位置都符合標準字卡。${text(reference?.feedback_zh, 120)}`;
      } else if (!decision.blindIdentityMatch) {
        feedback = `AI 盲辨識實際看到左邊「${observedLabel(
          decision.observedLeft,
          blind.left_case,
        )}」、右邊「${observedLabel(
          decision.observedRight,
          blind.right_case,
        )}」，和語音內容不相同。請重新聽完音檔再寫。`;
      } else if (!decision.bothSidesWritten) {
        feedback = "左右兩邊都要完整書寫；目前有一側的筆跡太少或不完整。";
      } else {
        feedback =
          text(reference?.feedback_zh || blind.feedback_zh, 180) ||
          "字母身分接近，但形狀、必要筆畫或四線位置尚未符合標準字卡。";
      }
      const model = referenceModel
        ? `${blindModel} → ${referenceModel}`
        : blindModel;

      const now = new Date();
      const dateKey = taipeiDateKey(now);
      const sessionKey = makeSessionKey(dateKey, studentId);
      const attemptRef = db.collection(ATTEMPTS_COLLECTION).doc();
      const sessionRef = db.collection(SESSIONS_COLLECTION).doc(sessionKey);
      const timestampMillis = now.getTime();
      const attempt = {
        studentId,
        studentName,
        dateKey,
        sessionKey,
        letter: targetLetter,
        passed,
        overallScore,
        uppercaseScore: upperScore,
        lowercaseScore: lowerScore,
        positionScore,
        aiPositionScore,
        localPositionScore,
        localCoverage,
        confidence,
        aiRecognition: rawReading,
        aiFeedback: feedback,
        aiModel: model,
        aiProvider: "OpenAI",
        aiRawResult: {
          recognizedUpper: decision.observedLeft,
          recognizedLower: decision.observedRight,
          leftCase: blind.left_case,
          rightCase: blind.right_case,
          rawReading,
          upperMatchScore: upperScore,
          lowerMatchScore: lowerScore,
          positionScore: aiPositionScore,
          confidence,
          feedbackZh: feedback,
          blindModel,
          referenceModel,
          blind,
          reference,
          decision: {
            blindIdentityMatch: decision.blindIdentityMatch,
            blindQuality: decision.blindQuality,
            bothSidesWritten: decision.bothSidesWritten,
            referenceQuality: decision.referenceQuality,
          },
        },
        recognitionMethod: "blind-then-reference-v2",
        strokes,
        thumbnail: thumbnailDataUrl,
        timestampMillis,
        clientTimestamp: text(request.data?.clientTimestamp, 40),
        createdAt: FieldValue.serverTimestamp(),
      };

      await db.runTransaction(async (transaction) => {
        const sessionSnapshot = await transaction.get(sessionRef);
        transaction.set(attemptRef, attempt);

        if (sessionSnapshot.exists) {
          transaction.set(
            sessionRef,
            {
              studentName,
              totalAttempts: FieldValue.increment(1),
              completedCount: FieldValue.increment(passed ? 1 : 0),
              lastActivityAt: FieldValue.serverTimestamp(),
              lastActivityMillis: timestampMillis,
            },
            { merge: true },
          );
        } else {
          transaction.set(sessionRef, {
            sessionKey,
            dateKey,
            studentId,
            studentName,
            totalAttempts: 1,
            completedCount: passed ? 1 : 0,
            gameScore: 0,
            createdAt: FieldValue.serverTimestamp(),
            lastActivityAt: FieldValue.serverTimestamp(),
            lastActivityMillis: timestampMillis,
          });
        }
      });

      return {
        attemptId: attemptRef.id,
        dateKey,
        passed,
        overallScore,
        uppercaseScore: upperScore,
        lowercaseScore: lowerScore,
        positionScore,
        confidence,
        aiRecognition: rawReading,
        aiFeedback: feedback,
        aiModel: model,
        recognitionMethod: "blind-then-reference-v2",
      };
    } catch (error) {
      console.error("analyzeLetterAttempt failed", {
        status: error?.status,
        code: error?.code,
        message: error?.message,
      });
      throw friendlyOpenAIError(error);
    }
  },
);

exports.finishGame = onCall(async (request) => {
  const studentId = text(request.data?.studentId, 40);
  const studentName = text(request.data?.studentName || "同學", 40);
  // addScore: score of one finished question set, added to today's total.
  const adding = request.data?.addScore !== undefined;
  const gameScore = Math.round(
    numberInRange(adding ? request.data?.addScore : request.data?.gameScore, 0, 100000, 0),
  );
  if (!studentId) {
    throw new HttpsError("invalid-argument", "缺少學生座號或學號。");
  }

  const now = new Date();
  const dateKey = taipeiDateKey(now);
  const sessionKey = makeSessionKey(dateKey, studentId);
  const sessionRef = db.collection(SESSIONS_COLLECTION).doc(sessionKey);
  const snapshot = await sessionRef.get();

  if (snapshot.exists) {
    await sessionRef.set(
      {
        studentName,
        gameScore: adding ? FieldValue.increment(gameScore) : gameScore,
        lastActivityAt: FieldValue.serverTimestamp(),
        lastActivityMillis: now.getTime(),
      },
      { merge: true },
    );
  } else {
    await sessionRef.set({
      sessionKey,
      dateKey,
      studentId,
      studentName,
      totalAttempts: 0,
      completedCount: 0,
      gameScore,
      createdAt: FieldValue.serverTimestamp(),
      lastActivityAt: FieldValue.serverTimestamp(),
      lastActivityMillis: now.getTime(),
    });
  }

  const total = (await sessionRef.get()).data()?.gameScore ?? gameScore;
  return { saved: true, dateKey, gameScore: total };
});

exports.verifyTeacher = onCall(TEACHER, async (request) => {
  requireTeacher(request.data?.password);
  return { authenticated: true };
});

exports.getTeacherDates = onCall(TEACHER, async (request) => {
  requireTeacher(request.data?.password);
  const snapshot = await db.collection(SESSIONS_COLLECTION).limit(5000).get();
  const dates = new Map();

  for (const doc of snapshot.docs) {
    const session = doc.data();
    const dateKey = text(session.dateKey, 10);
    if (!dateKey) continue;
    const summary = dates.get(dateKey) || {
      dateKey,
      studentCount: 0,
      completedCount: 0,
      totalAttempts: 0,
    };
    summary.studentCount += 1;
    summary.completedCount += Number(session.completedCount || 0);
    summary.totalAttempts += Number(session.totalAttempts || 0);
    dates.set(dateKey, summary);
  }

  return {
    dates: [...dates.values()].sort((a, b) => b.dateKey.localeCompare(a.dateKey)),
  };
});

exports.getTeacherStudents = onCall(TEACHER, async (request) => {
  requireTeacher(request.data?.password);
  const dateKey = text(request.data?.dateKey, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new HttpsError("invalid-argument", "日期格式不正確。");
  }

  const snapshot = await db
    .collection(SESSIONS_COLLECTION)
    .where("dateKey", "==", dateKey)
    .limit(500)
    .get();
  const students = snapshot.docs
    .map((doc) => {
      const session = doc.data();
      return {
        sessionKey: doc.id,
        studentId: text(session.studentId, 40),
        studentName: text(session.studentName, 40),
        completedCount: Number(session.completedCount || 0),
        totalAttempts: Number(session.totalAttempts || 0),
        gameScore: Number(session.gameScore || 0),
        lastActivityMillis: Number(session.lastActivityMillis || 0),
      };
    })
    .sort((a, b) =>
      a.studentId.localeCompare(b.studentId, "zh-Hant", {
        numeric: true,
        sensitivity: "base",
      }),
    );

  return { dateKey, students };
});

exports.getTeacherStudentDetail = onCall(TEACHER, async (request) => {
  requireTeacher(request.data?.password);
  const sessionKey = text(request.data?.sessionKey, 80);
  if (!sessionKey) {
    throw new HttpsError("invalid-argument", "缺少學生學習紀錄識別碼。");
  }

  const sessionSnapshot = await db
    .collection(SESSIONS_COLLECTION)
    .doc(sessionKey)
    .get();
  if (!sessionSnapshot.exists) {
    throw new HttpsError("not-found", "找不到這筆學生資料。");
  }
  const session = sessionSnapshot.data();
  const attemptsSnapshot = await db
    .collection(ATTEMPTS_COLLECTION)
    .where("sessionKey", "==", sessionKey)
    .limit(500)
    .get();

  const attempts = attemptsSnapshot.docs
    .map((doc) => {
      const attempt = doc.data();
      return {
        id: doc.id,
        letter: text(attempt.letter, 1),
        passed: Boolean(attempt.passed),
        overallScore: Number(attempt.overallScore || 0),
        uppercaseScore: Number(attempt.uppercaseScore || 0),
        lowercaseScore: Number(attempt.lowercaseScore || 0),
        positionScore: Number(attempt.positionScore || 0),
        confidence: Number(attempt.confidence || 0),
        aiRecognition: text(attempt.aiRecognition, 160),
        aiFeedback: text(attempt.aiFeedback, 240),
        aiModel: text(attempt.aiModel, 80),
        aiRawResult: attempt.aiRawResult || null,
        recognitionMethod: text(attempt.recognitionMethod, 40),
        questionSetId: text(attempt.questionSetId, 60),
        questionSetName: text(attempt.questionSetName, 40),
        teacherOverride: attempt.teacherOverride === true,
        originalPassed:
          typeof attempt.originalPassed === "boolean"
            ? attempt.originalPassed
            : Boolean(attempt.passed),
        strokes: Array.isArray(attempt.strokes) ? attempt.strokes : [],
        thumbnail: String(attempt.thumbnail || ""),
        timestampMillis: Number(attempt.timestampMillis || 0),
        clientTimestamp: text(attempt.clientTimestamp, 40),
      };
    })
    .sort((a, b) => a.timestampMillis - b.timestampMillis);

  return {
    session: {
      sessionKey,
      dateKey: text(session.dateKey, 10),
      studentId: text(session.studentId, 40),
      studentName: text(session.studentName, 40),
      completedCount: Number(session.completedCount || 0),
      totalAttempts: Number(session.totalAttempts || 0),
      gameScore: Number(session.gameScore || 0),
    },
    attempts,
  };
});

exports.deleteStudentDateData = onCall(TEACHER, async (request) => {
  requireTeacher(request.data?.password);
  const sessionKey = text(request.data?.sessionKey, 80);
  if (!sessionKey) {
    throw new HttpsError("invalid-argument", "缺少要刪除的資料識別碼。");
  }

  const attemptsSnapshot = await db
    .collection(ATTEMPTS_COLLECTION)
    .where("sessionKey", "==", sessionKey)
    .limit(500)
    .get();
  const references = attemptsSnapshot.docs.map((doc) => doc.ref);
  references.push(db.collection(SESSIONS_COLLECTION).doc(sessionKey));

  for (let index = 0; index < references.length; index += 400) {
    const batch = db.batch();
    for (const reference of references.slice(index, index + 400)) {
      batch.delete(reference);
    }
    await batch.commit();
  }

  return { deleted: true, deletedAttempts: attemptsSnapshot.size };
});

// ---------------------------------------------------------------------------
// v3: program checks size/position on the four lines, AI only reads the letter.
// ---------------------------------------------------------------------------

const V3_METHOD = "geometry-plus-ai-v3";

// Production settings, chosen by comparing variants with scripts/verify-v3.cjs.
const V3_DEFAULT_VARIANT = { split: true, colors: true, effort: "medium" };

function pickVariant(raw) {
  // Only dryRun test calls may try other variants.
  return {
    split: typeof raw?.split === "boolean" ? raw.split : V3_DEFAULT_VARIANT.split,
    colors: typeof raw?.colors === "boolean" ? raw.colors : V3_DEFAULT_VARIANT.colors,
    effort: ["low", "medium", "high"].includes(raw?.effort) ? raw.effort : V3_DEFAULT_VARIANT.effort,
  };
}

async function renderSidePng(strokes, colors) {
  // Loaded lazily so the older functions start without sharp.
  const sharp = require("sharp");
  const svg = Buffer.from(v3.sideSvg(strokes, 384, { colors }));
  const png = await sharp(svg).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

async function readLettersV3(client, strokes, variant) {
  const sides = v3.splitSides(strokes);
  const [leftImage, rightImage] = await Promise.all([
    renderSidePng(sides.left, variant.colors),
    renderSidePng(sides.right, variant.colors),
  ]);
  const options = { effort: variant.effort, maxOutputTokens: 4000 };

  if (!variant.split) {
    const { result, model, failedModels } = await createVisionResponse(client, {
      prompt: v3.identityPrompt(sides.left.length, sides.right.length, variant),
      images: [leftImage, rightImage],
      schema: v3.IDENTITY_SCHEMA,
      schemaName: "letter_identity_v3",
      ...options,
    });
    return { ai: result, model, failedModels, leftImage, rightImage };
  }

  const readOne = (image, count) =>
    createVisionResponse(client, {
      prompt: v3.singlePrompt(count, variant),
      images: [image],
      schema: v3.SINGLE_SCHEMA,
      schemaName: "letter_identity_v3_single",
      ...options,
    });
  const [left, right] = await Promise.all([
    readOne(leftImage, sides.left.length),
    readOne(rightImage, sides.right.length),
  ]);
  const comment = [left.result.comment_zh, right.result.comment_zh]
    .map((value) => text(value, 100))
    .filter(Boolean);
  return {
    ai: {
      left: { candidates: left.result.candidates },
      right: { candidates: right.result.candidates },
      comment_zh: comment.length === 2 ? `左：${comment[0]}｜右：${comment[1]}` : comment.join(""),
    },
    model: left.model === right.model ? left.model : `${left.model}+${right.model}`,
    failedModels: [...left.failedModels, ...right.failedModels],
    leftImage,
    rightImage,
  };
}

exports.analyzeLetterAttemptV3 = onCall(
  { secrets: [OPENAI_API_KEY], timeoutSeconds: 120, memory: "1GiB" },
  async (request) => {
    const dryRun = request.data?.dryRun === true;
    const studentId = text(request.data?.studentId, 40);
    const studentName = text(request.data?.studentName || "學生", 40);
    const targetLetter = text(request.data?.targetLetter, 1).toUpperCase();
    const strokes = sanitizeStrokes(request.data?.strokes);
    const questionSetId = text(request.data?.questionSetId, 60);
    const questionSetName = text(request.data?.questionSetName, 40);
    const thumbnailDataUrl = dryRun
      ? ""
      : validateImageDataUrl(request.data?.thumbnailDataUrl, "縮圖", 500_000);

    if (!studentId) {
      throw new HttpsError("invalid-argument", "缺少學生座號或學號。");
    }
    if (!/^[A-Z]$/.test(targetLetter)) {
      throw new HttpsError("invalid-argument", "目標字母不正確。");
    }
    if (!strokes.some((stroke) => stroke.points.length > 0)) {
      throw new HttpsError("invalid-argument", "沒有可儲存的筆跡。");
    }

    try {
      const client = openAIClient();
      const started = Date.now();
      const variant = pickVariant(dryRun ? request.data?.variant : null);
      const { ai, model, failedModels, leftImage, rightImage } =
        await readLettersV3(client, strokes, variant);
      const result = v3.evaluateV3({ targetLetter, strokes, ai });
      const elapsedMs = Date.now() - started;

      const response = {
        passed: result.passed,
        overallScore: result.overallScore,
        uppercaseScore: result.uppercaseScore,
        lowercaseScore: result.lowercaseScore,
        positionScore: result.positionScore,
        confidence: result.confidence,
        aiRecognition: result.aiRecognition,
        aiFeedback: result.feedback,
        aiModel: model,
        recognitionMethod: V3_METHOD,
      };

      if (dryRun) {
        return {
          ...response,
          dryRun: true,
          variant,
          elapsedMs,
          failedModels,
          detail: result.detail,
          comment: text(ai?.comment_zh, 200),
          leftImage,
          rightImage,
        };
      }

      const now = new Date();
      const dateKey = taipeiDateKey(now);
      const sessionKey = makeSessionKey(dateKey, studentId);
      const attemptRef = db.collection(ATTEMPTS_COLLECTION).doc();
      const sessionRef = db.collection(SESSIONS_COLLECTION).doc(sessionKey);
      const timestampMillis = now.getTime();
      const attempt = {
        studentId,
        studentName,
        dateKey,
        sessionKey,
        letter: targetLetter,
        passed: result.passed,
        overallScore: result.overallScore,
        uppercaseScore: result.uppercaseScore,
        lowercaseScore: result.lowercaseScore,
        positionScore: result.positionScore,
        aiPositionScore: result.positionScore,
        localPositionScore: result.positionScore,
        localCoverage: 0,
        confidence: result.confidence,
        aiRecognition: result.aiRecognition,
        aiFeedback: result.feedback,
        aiModel: model,
        aiProvider: "OpenAI",
        aiRawResult: {
          method: V3_METHOD,
          variant,
          elapsedMs,
          failedModels,
          comment: text(ai?.comment_zh, 200),
          detail: result.detail,
        },
        recognitionMethod: V3_METHOD,
        questionSetId,
        questionSetName,
        strokes,
        thumbnail: thumbnailDataUrl,
        timestampMillis,
        clientTimestamp: text(request.data?.clientTimestamp, 40),
        createdAt: FieldValue.serverTimestamp(),
      };

      await db.runTransaction(async (transaction) => {
        const sessionSnapshot = await transaction.get(sessionRef);
        transaction.set(attemptRef, attempt);
        if (sessionSnapshot.exists) {
          transaction.set(
            sessionRef,
            {
              studentName,
              totalAttempts: FieldValue.increment(1),
              completedCount: FieldValue.increment(result.passed ? 1 : 0),
              lastActivityAt: FieldValue.serverTimestamp(),
              lastActivityMillis: timestampMillis,
            },
            { merge: true },
          );
        } else {
          transaction.set(sessionRef, {
            sessionKey,
            dateKey,
            studentId,
            studentName,
            totalAttempts: 1,
            completedCount: result.passed ? 1 : 0,
            gameScore: 0,
            createdAt: FieldValue.serverTimestamp(),
            lastActivityAt: FieldValue.serverTimestamp(),
            lastActivityMillis: timestampMillis,
          });
        }
      });

      return { ...response, attemptId: attemptRef.id, dateKey };
    } catch (error) {
      console.error("analyzeLetterAttemptV3 failed", {
        status: error?.status,
        code: error?.code,
        message: error?.message,
      });
      throw friendlyOpenAIError(error);
    }
  },
);

// Teacher marks a failed attempt as correct (or undoes that).
exports.setTeacherOverride = onCall(TEACHER, async (request) => {
  requireTeacher(request.data?.password);
  const attemptId = text(request.data?.attemptId, 80);
  const approve = request.data?.approve === true;
  if (!attemptId) {
    throw new HttpsError("invalid-argument", "缺少練習紀錄識別碼。");
  }
  const attemptRef = db.collection(ATTEMPTS_COLLECTION).doc(attemptId);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(attemptRef);
    if (!snapshot.exists) {
      throw new HttpsError("not-found", "找不到這筆練習紀錄。");
    }
    const attempt = snapshot.data();
    const originalPassed =
      typeof attempt.originalPassed === "boolean"
        ? attempt.originalPassed
        : Boolean(attempt.passed);
    if (originalPassed) {
      throw new HttpsError("failed-precondition", "這筆原本就通過，不需要改判。");
    }
    const wasApproved = attempt.teacherOverride === true;
    if (wasApproved === approve) {
      return { attemptId, passed: approve, teacherOverride: approve, changed: false };
    }
    const sessionRef = db.collection(SESSIONS_COLLECTION).doc(attempt.sessionKey);
    transaction.update(attemptRef, {
      passed: approve,
      originalPassed,
      teacherOverride: approve,
      teacherOverrideMillis: Date.now(),
    });
    transaction.set(
      sessionRef,
      { completedCount: FieldValue.increment(approve ? 1 : -1) },
      { merge: true },
    );
    return { attemptId, passed: approve, teacherOverride: approve, changed: true };
  });
});

// Attempts the teacher marked as correct, used to re-test the recognizer.
exports.getTeacherOverrides = onCall(TEACHER, async (request) => {
  requireTeacher(request.data?.password);
  const snapshot = await db
    .collection(ATTEMPTS_COLLECTION)
    .where("teacherOverride", "==", true)
    .limit(300)
    .get();
  return {
    attempts: snapshot.docs.map((doc) => {
      const attempt = doc.data();
      return {
        id: doc.id,
        letter: text(attempt.letter, 1),
        recognitionMethod: text(attempt.recognitionMethod, 40),
        strokes: Array.isArray(attempt.strokes) ? attempt.strokes : [],
      };
    }),
  };
});

// ---------------------------------------------------------------------------
// Teacher-made question sets (the five fixed sets live in src/questionSets.js).
// ---------------------------------------------------------------------------

const QUESTION_SETS_COLLECTION = "letterQuestionSets";

function normalizeQuestionSet(raw) {
  const name = text(raw?.name, 30);
  const letters = [
    ...new Set(
      (Array.isArray(raw?.letters) ? raw.letters : [])
        .map((letter) => String(letter ?? "").trim().toUpperCase())
        .filter((letter) => /^[A-Z]$/.test(letter)),
    ),
  ].sort();
  const order = raw?.order === "random" ? "random" : "sequential";
  const fallbackEvery = letters.length <= 13 ? 3 : 5;
  const slotEvery = Math.round(
    numberInRange(raw?.slotEvery, 1, Math.max(1, letters.length), fallbackEvery),
  );
  if (!name) throw new HttpsError("invalid-argument", "請輸入題組名稱。");
  if (!letters.length) throw new HttpsError("invalid-argument", "請至少選一個字母。");
  return { name, letters, order, slotEvery, active: raw?.active !== false };
}

function questionSetFromDoc(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    name: text(data.name, 30),
    letters: Array.isArray(data.letters) ? data.letters : [],
    order: data.order === "random" ? "random" : "sequential",
    slotEvery: Number(data.slotEvery) || 3,
    active: data.active !== false,
    createdMillis: Number(data.createdMillis || 0),
  };
}

async function listQuestionSets() {
  const snapshot = await db.collection(QUESTION_SETS_COLLECTION).limit(200).get();
  return snapshot.docs
    .map(questionSetFromDoc)
    .sort((a, b) => a.createdMillis - b.createdMillis);
}

// Students: active teacher-made sets for the home page.
exports.getQuestionSets = onCall(async () => {
  const sets = await listQuestionSets();
  return { sets: sets.filter((set) => set.active) };
});

// Teacher: every set, including hidden ones.
exports.getTeacherQuestionSets = onCall(TEACHER, async (request) => {
  requireTeacher(request.data?.password);
  return { sets: await listQuestionSets() };
});

// Teacher: create (no id) or update a set; active=false hides it from students.
exports.saveQuestionSet = onCall(TEACHER, async (request) => {
  requireTeacher(request.data?.password);
  const set = normalizeQuestionSet(request.data?.set);
  const id = text(request.data?.set?.id, 60);
  const collection = db.collection(QUESTION_SETS_COLLECTION);
  if (id) {
    const ref = collection.doc(id);
    if (!(await ref.get()).exists) {
      throw new HttpsError("not-found", "找不到這個題組。");
    }
    await ref.set({ ...set, updatedMillis: Date.now() }, { merge: true });
    return { set: { id, ...set } };
  }
  const ref = await collection.add({ ...set, createdMillis: Date.now() });
  return { set: { id: ref.id, ...set } };
});

if (process.env.NODE_ENV === "test") {
  module.exports.__test = { evaluateAssessment, normalizeQuestionSet };
}
