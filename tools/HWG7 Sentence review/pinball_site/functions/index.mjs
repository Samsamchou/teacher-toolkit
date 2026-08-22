import { readFileSync } from "node:fs";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAppCheck } from "firebase-admin/app-check";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { defineSecret, defineString } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { scoreSpeechAttempt } from "./lib/scoring.mjs";
import {
  DomainValidationError,
  decideGameCompletion,
  decideGameStart,
  expectedPlayerForTurn as expectedAssignedPlayerForTurn,
  pairRotationId,
  taipeiDate,
  validateCompletionSummary,
  validateStudentCodes,
  validateUnitId,
} from "./lib/app-domain.mjs";
import {
  TeacherAuthError,
  checkTeacherSession,
  createTeacherSession,
  loginRateDecision,
  nextFailureRecord,
  parseBearerToken,
  rateLimitKey,
  tokenHash,
  validatePasscode,
  verifyPasscode,
} from "./lib/teacher-auth.mjs";
import {
  RequestValidationError,
  decideCors,
  parseAllowedOrigins,
  validateEvaluationBody,
} from "./lib/http-validation.mjs";
import { AI_USAGE_LIMITS, decideUsageReservation, minuteBucket } from "./lib/usage-limits.mjs";

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const ALLOWED_ORIGINS = defineString("ALLOWED_ORIGINS", {
  default: "https://setencerevieworalpractice.web.app,https://setencerevieworalpractice.firebaseapp.com,http://localhost:5000,http://127.0.0.1:5000,http://localhost:4173,http://127.0.0.1:4173",
  description: "Comma-separated exact origins; wildcards are rejected.",
});
const REQUIRE_APP_CHECK = defineString("REQUIRE_APP_CHECK", {
  default: "true",
  description: "Keep true in production. Set false only for a controlled emulator test.",
});

const REGION = "asia-east1";
const RECORDING_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_QUERY_DAYS = 90;
const bankDocument = JSON.parse(readFileSync(new URL("./data/question-bank.json", import.meta.url), "utf8"));
const questions = Array.isArray(bankDocument.questions) ? bankDocument.questions : [];
const questionMap = new Map(questions.map((question) => [question.id, question]));
if (questions.length !== 13 || questionMap.size !== 13) throw new Error("Deployable question bank must contain 13 unique questions.");

function toBoolean(value) {
  return /^(1|true|yes|on)$/iu.test(String(value ?? "").trim());
}

function adminServices() {
  if (!getApps().length) initializeApp();
  return { db: getFirestore(), bucket: getStorage().bucket() };
}

function setResponseHeaders(response) {
  response.set("Cache-Control", "no-store");
  response.set("Content-Type", "application/json; charset=utf-8");
  response.set("X-Content-Type-Options", "nosniff");
  response.set("Referrer-Policy", "no-referrer");
}

function applyCorsHeaders(request, response) {
  const allowedOrigins = parseAllowedOrigins(ALLOWED_ORIGINS.value());
  const decision = decideCors(request.headers, allowedOrigins);
  response.set("Vary", "Origin");
  if (decision.allowed && decision.origin) {
    response.set("Access-Control-Allow-Origin", decision.origin);
    response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Firebase-AppCheck");
    response.set("Access-Control-Max-Age", "3600");
  }
  return decision;
}

function sendError(response, status, code, message, retryable = false, extra = {}) {
  setResponseHeaders(response);
  return response.status(status).json({
    ok: false,
    message,
    consumeAttempt: false,
    error: { code, retryable, consumeAttempt: false, ...extra },
  });
}

async function verifyAppCheck(request) {
  if (!toBoolean(REQUIRE_APP_CHECK.value())) return;
  const token = String(request.get("X-Firebase-AppCheck") ?? "").trim();
  if (!token) throw new RequestValidationError(401, "app_check_required", "無法驗證這次請求，請重新整理後再試。");
  adminServices();
  try {
    await getAppCheck().verifyToken(token);
  } catch {
    throw new RequestValidationError(401, "invalid_app_check", "無法驗證這次請求，請重新整理後再試。");
  }
}

function apiEndpoint(handler, { secrets = [], timeoutSeconds = 60, memory = "256MiB" } = {}) {
  return onRequest(
    { region: REGION, timeoutSeconds, memory, concurrency: 20, maxInstances: 10, cors: false, secrets },
    async (request, response) => {
      setResponseHeaders(response);
      try {
        const cors = applyCorsHeaders(request, response);
        if (!cors.allowed) return sendError(response, 403, "origin_not_allowed", "這個網站來源未獲准使用服務。");
        if (request.method === "OPTIONS") return response.status(204).send("");
        if (request.method !== "POST") {
          response.set("Allow", "POST, OPTIONS");
          return sendError(response, 405, "method_not_allowed", "此端點只接受 POST 請求。");
        }
        if (!request.is("application/json")) return sendError(response, 415, "json_required", "請用 JSON 格式送出資料。");
        await verifyAppCheck(request);
        return await handler(request, response);
      } catch (error) {
        if (error instanceof RequestValidationError || error instanceof DomainValidationError || error instanceof TeacherAuthError) {
          const retryable = error.retryable === true || error.status === 429 || error.status >= 500;
          return sendError(response, error.status, error.code, error.message, retryable, error.retryAfterSeconds ? { retryAfterSeconds: error.retryAfterSeconds } : {});
        }
        const code = String(error?.code ?? "api_failed").replace(/[^a-z0-9_-]/giu, "_").slice(0, 80);
        console.error("API request failed", { code });
        return sendError(response, error?.retryable === true ? 503 : 500, code, "服務暫時無法完成，請稍後再試。", error?.retryable === true);
      }
    },
  );
}

function asIso(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function asTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError("Invalid timestamp value");
  return Timestamp.fromDate(date);
}

function usageCount(snapshot) {
  const value = Number(snapshot.exists ? snapshot.data()?.count : 0);
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

async function reserveSpeechEvaluation({ db, attemptRef, attemptId, session, gameSessionId, studentCode, questionId, now }) {
  const claimRef = db.collection("evaluationClaims").doc(attemptId);
  const studentRef = db.collection("aiUsage").doc("student_" + session.date + "_" + studentCode);
  const gameMinuteRef = db.collection("aiUsage").doc("game_" + gameSessionId + "_" + minuteBucket(now));
  const projectRef = db.collection("aiUsage").doc("project_" + session.date);
  let reservation;

  await db.runTransaction(async (transaction) => {
    const [attemptSnapshot, claimSnapshot, studentSnapshot, gameMinuteSnapshot, projectSnapshot] = await Promise.all([
      transaction.get(attemptRef),
      transaction.get(claimRef),
      transaction.get(studentRef),
      transaction.get(gameMinuteRef),
      transaction.get(projectRef),
    ]);
    if (attemptSnapshot.exists) {
      const existing = attemptSnapshot.data();
      if (existing.questionId !== questionId) throw new DomainValidationError("attempt_conflict", "這次作答與既有紀錄不一致。", 409);
      reservation = { existing, claimRef: null };
      return;
    }

    const decision = decideUsageReservation({
      counts: {
        studentDaily: usageCount(studentSnapshot),
        gameMinute: usageCount(gameMinuteSnapshot),
        projectDaily: usageCount(projectSnapshot),
      },
      claimLeaseUntil: claimSnapshot.exists ? asIso(claimSnapshot.data()?.leaseUntil) : null,
      now,
    });
    if (!decision.allowed) {
      const error = decision.status === 409
        ? new DomainValidationError(decision.code, decision.message, decision.status)
        : new RequestValidationError(decision.status, decision.code, decision.message);
      error.retryable = true;
      error.retryAfterSeconds = decision.retryAfterSeconds;
      throw error;
    }

    const nowTimestamp = Timestamp.fromDate(now);
    const leaseUntil = Timestamp.fromDate(new Date(now.getTime() + AI_USAGE_LIMITS.claimLeaseMs));
    const usageExpiresAt = Timestamp.fromDate(new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000));
    transaction.set(claimRef, { attemptId, gameSessionId, questionId, startedAt: nowTimestamp, leaseUntil });
    transaction.set(studentRef, { scope: "student_daily", studentCode, date: session.date, count: decision.nextCounts.studentDaily, updatedAt: nowTimestamp, expiresAt: usageExpiresAt }, { merge: true });
    transaction.set(gameMinuteRef, { scope: "game_minute", gameSessionId, minute: minuteBucket(now), count: decision.nextCounts.gameMinute, updatedAt: nowTimestamp, expiresAt: usageExpiresAt }, { merge: true });
    transaction.set(projectRef, { scope: "project_daily", date: session.date, count: decision.nextCounts.projectDaily, updatedAt: nowTimestamp, expiresAt: usageExpiresAt }, { merge: true });
    reservation = { existing: null, claimRef };
  });
  return reservation;
}

function requiredSessionId(value) {
  const sessionId = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9_-]{10,120}$/u.test(sessionId)) throw new DomainValidationError("invalid_game_session", "遊戲工作階段格式不正確。");
  return sessionId;
}

function expectedPlayerForTurn(session, turnIndex) {
  return expectedAssignedPlayerForTurn(session.assignment, turnIndex);
}

export const startGame = apiEndpoint(async (request, response) => {
  const unitId = validateUnitId(request.body?.unitId);
  const students = validateStudentCodes(request.body?.students);
  const requestId = typeof request.body?.requestId === "string" ? request.body.requestId.trim() : "";
  const date = taipeiDate();
  const rotationId = pairRotationId({ unitId, date, students });
  const { db } = adminServices();
  let result;

  await db.runTransaction(async (transaction) => {
    const rotationRef = db.collection("gameRotations").doc(rotationId);
    const rotationSnapshot = await transaction.get(rotationRef);
    const rawRotation = rotationSnapshot.exists ? rotationSnapshot.data() : null;
    const rotation = rawRotation ? { ...rawRotation, activeUntil: asIso(rawRotation.activeUntil) } : null;
    const decision = decideGameStart({ rotation, students, unitId, now: new Date(), requestId });
    if (decision.action === "resume") {
      result = { gameSessionId: decision.gameSessionId, assignment: decision.assignment, activeUntil: decision.activeUntil, resumed: true, date };
      return;
    }

    const sessionRef = db.collection("gameSessions").doc();
    const activeUntil = asTimestamp(decision.activeUntil);
    transaction.set(sessionRef, {
      id: sessionRef.id,
      unitId,
      date,
      rotationId,
      students,
      assignment: decision.assignment,
      questionBankVersion: bankDocument.mode?.questionBankVersion,
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      activeUntil,
      completedAt: null,
      abandonedAt: null,
    });
    transaction.set(rotationRef, {
      unitId,
      date,
      pairHash: rotationId,
      completedGameCount: decision.completedGameCount,
      activeGameId: sessionRef.id,
      activeRequestId: decision.requestId,
      activeStudents: students,
      activeAssignment: decision.assignment,
      activeUntil,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    result = { gameSessionId: sessionRef.id, assignment: decision.assignment, activeUntil: decision.activeUntil, resumed: false, date };
  });

  return response.status(200).json({ ok: true, ...result });
});

export const abandonGame = apiEndpoint(async (request, response) => {
  const sessionId = requiredSessionId(request.body?.gameSessionId);
  const { db } = adminServices();
  let status = "unchanged";
  await db.runTransaction(async (transaction) => {
    const sessionRef = db.collection("gameSessions").doc(sessionId);
    const sessionSnapshot = await transaction.get(sessionRef);
    if (!sessionSnapshot.exists) throw new DomainValidationError("game_not_found", "找不到這一局遊戲。", 404);
    const session = sessionSnapshot.data();
    if (session.status !== "active") {
      status = session.status;
      return;
    }
    const rotationRef = db.collection("gameRotations").doc(session.rotationId);
    const rotationSnapshot = await transaction.get(rotationRef);
    transaction.update(sessionRef, { status: "abandoned", abandonedAt: FieldValue.serverTimestamp() });
    if (rotationSnapshot.exists && rotationSnapshot.data().activeGameId === sessionId) {
      transaction.set(rotationRef, {
        activeGameId: null,
        activeRequestId: null,
        activeStudents: null,
        activeAssignment: null,
        activeUntil: null,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    status = "abandoned";
  });
  return response.status(200).json({ ok: true, status, nextGamePattern: "fixed_round_alternation" });
});

async function transcribeAudio(audio) {
  const apiKey = OPENAI_API_KEY.value();
  if (!apiKey) {
    const error = new Error("OPENAI_API_KEY is unavailable.");
    error.code = "speech_service_unconfigured";
    throw error;
  }
  const form = new FormData();
  form.append("file", new Blob([audio.bytes], { type: audio.openAiMime }), `speech.${audio.extension}`);
  form.append("model", "gpt-4o-mini-transcribe");
  form.append("language", "en");
  form.append("response_format", "json");
  form.append("temperature", "0");
  let upstream;
  try {
    upstream = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    const error = new Error("Transcription network request failed.");
    error.code = "transcription_unavailable";
    error.retryable = true;
    throw error;
  }
  const payload = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const error = new Error(`Transcription upstream returned ${upstream.status}.`);
    error.code = upstream.status === 429 ? "transcription_rate_limited" : "transcription_unavailable";
    error.retryable = upstream.status === 408 || upstream.status === 409 || upstream.status === 429 || upstream.status >= 500;
    throw error;
  }
  const transcript = typeof payload.text === "string" ? payload.text.trim() : "";
  if (!transcript || transcript.length > 2000) {
    const error = new RequestValidationError(422, "speech_not_detected", "我沒有聽清楚。請靠近麥克風，再說一次吧！");
    error.retryable = true;
    throw error;
  }
  return transcript;
}

function attemptResponse(data) {
  return {
    ok: true,
    consumeAttempt: true,
    attemptId: data.id,
    questionId: data.questionId,
    transcript: data.transcript,
    ...data.result,
    recordingStored: Boolean(data.recordingPath),
    provider: { transcriptionModel: "gpt-4o-mini-transcribe" },
  };
}

export const evaluateSpeech = apiEndpoint(async (request, response) => {
  const audio = validateEvaluationBody(request.body, new Set(questionMap.keys()));
  if (!audio.gameContext) throw new RequestValidationError(400, "game_context_required", "請先由首頁開始一局遊戲。");
  const { db, bucket } = adminServices();
  const { gameSessionId, turnIndex, attemptNumber } = audio.gameContext;
  const sessionSnapshot = await db.collection("gameSessions").doc(gameSessionId).get();
  if (!sessionSnapshot.exists) throw new DomainValidationError("game_not_found", "找不到這一局遊戲。", 404);
  const session = sessionSnapshot.data();
  if (session.status !== "active" || new Date(asIso(session.activeUntil)).getTime() <= Date.now()) {
    throw new DomainValidationError("game_not_active", "這一局已結束或逾時，請回首頁重新開始。", 409);
  }
  const expectedPlayer = expectedPlayerForTurn(session, turnIndex);
  const question = questionMap.get(audio.questionId);
  if (question.type !== expectedPlayer.questionType) {
    throw new DomainValidationError("wrong_question_type", "這個回合的題型與玩家分配不一致。", 409);
  }

  const attemptId = gameSessionId + "_" + String(turnIndex).padStart(2, "0") + "_" + attemptNumber;
  const attemptRef = db.collection("practiceAttempts").doc(attemptId);
  const now = new Date();
  const reservation = await reserveSpeechEvaluation({
    db,
    attemptRef,
    attemptId,
    session,
    gameSessionId,
    studentCode: expectedPlayer.studentCode,
    questionId: audio.questionId,
    now,
  });
  if (reservation.existing) return response.status(200).json(attemptResponse(reservation.existing));

  try {
    const transcript = await transcribeAudio(audio);
    const result = scoreSpeechAttempt({ question, transcript, metrics: audio.metrics });
    if (result.valid !== true) return sendError(response, 422, "speech_not_valid", "這次沒有形成可評分的英文內容，請再說一次。", true);

    const expiresAt = new Date(now.getTime() + RECORDING_RETENTION_MS);
    const recordingPath = "recordings/" + taipeiDate(now) + "/" + gameSessionId + "/" + turnIndex + "/" + attemptId + "." + audio.extension;
    await bucket.file(recordingPath).save(audio.bytes, {
      resumable: false,
      validation: "crc32c",
      metadata: {
        contentType: audio.openAiMime,
        cacheControl: "private, no-store, max-age=0",
        metadata: { expiresAt: expiresAt.toISOString(), retentionDays: "30" },
      },
    });

    const attempt = {
      id: attemptId,
      gameSessionId,
      unitId: session.unitId,
      date: session.date,
      turnIndex,
      attemptNumber,
      studentCode: expectedPlayer.studentCode,
      classCode: expectedPlayer.studentCode.slice(0, 3),
      questionId: question.id,
      questionType: question.type,
      transcript,
      result,
      recordingPath,
      recordingDeletedAt: null,
      createdAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(expiresAt),
    };
    await attemptRef.create(attempt);
    return response.status(200).json(attemptResponse(attempt));
  } finally {
    await reservation.claimRef.delete().catch((error) => {
      console.error("Failed to release evaluation claim", { code: String(error?.code ?? "unknown") });
    });
  }
}, { secrets: [OPENAI_API_KEY] });

function compactAttempt(data) {
  return {
    attemptId: data.id,
    turnIndex: data.turnIndex,
    attemptNumber: data.attemptNumber,
    questionId: data.questionId,
    questionType: data.questionType,
    studentCode: data.studentCode,
    transcript: data.transcript,
    scores: data.result?.scores ?? null,
    passed: data.result?.passed === true,
    feedback: data.result?.feedback ?? "",
    primaryIssue: data.result?.primaryIssue ?? null,
    matchedAnswer: data.result?.matchedAnswer ?? null,
    recordingPath: data.recordingPath ?? null,
    recordingExpiresAt: asIso(data.expiresAt),
  };
}

export const completeGame = apiEndpoint(async (request, response) => {
  const sessionId = requiredSessionId(request.body?.gameSessionId);
  const summary = validateCompletionSummary(request.body?.result);
  const questionIds = summary.turnSummaries.map(({ questionId }) => questionId);
  if (new Set(questionIds).size !== 12 || questionIds.some((id) => !questionMap.has(id))) {
    throw new DomainValidationError("invalid_question_set", "完整遊戲必須包含 12 道不重複的正式題目。", 409);
  }
  const { db } = adminServices();
  const attemptIds = [...new Set(summary.turnSummaries.flatMap(({ attemptIds: ids }) => ids))];
  if (!attemptIds.length) throw new DomainValidationError("attempts_required", "缺少口說評測紀錄。", 409);
  const attemptSnapshots = await db.getAll(...attemptIds.map((id) => db.collection("practiceAttempts").doc(id)));
  if (attemptSnapshots.some((snapshot) => !snapshot.exists)) throw new DomainValidationError("attempt_not_found", "部分口說評測紀錄尚未完成，請稍後再試。", 409);
  const attempts = attemptSnapshots.map((snapshot) => snapshot.data());
  if (attempts.some((attempt) => attempt.gameSessionId !== sessionId)) throw new DomainValidationError("attempt_session_mismatch", "口說評測紀錄與本局不一致。", 409);

  let outcome;
  await db.runTransaction(async (transaction) => {
    const sessionRef = db.collection("gameSessions").doc(sessionId);
    const sessionSnapshot = await transaction.get(sessionRef);
    if (!sessionSnapshot.exists) throw new DomainValidationError("game_not_found", "找不到這一局遊戲。", 404);
    const session = { id: sessionId, ...sessionSnapshot.data() };
    const rotationRef = db.collection("gameRotations").doc(session.rotationId);
    const rotationSnapshot = await transaction.get(rotationRef);
    const rotation = rotationSnapshot.exists ? rotationSnapshot.data() : null;
    const decision = decideGameCompletion({ session, rotation });
    if (decision.action === "already_completed") {
      outcome = { resultId: sessionId, completedGameCount: rotation?.completedGameCount ?? null, nextGamePattern: "fixed_round_alternation", idempotent: true };
      return;
    }

    for (const turn of summary.turnSummaries) {
      const expected = expectedPlayerForTurn(session, turn.turnIndex);
      if (turn.studentCode !== expected.studentCode || turn.questionType !== expected.questionType || questionMap.get(turn.questionId)?.type !== expected.questionType) {
        throw new DomainValidationError("turn_assignment_mismatch", "回合學生或題型與開局分配不一致。", 409);
      }
      if (!turn.attemptIds.length || turn.attemptIds.some((id) => !attemptIds.includes(id))) {
        throw new DomainValidationError("turn_attempt_missing", "每個回合都必須有口說評測紀錄。", 409);
      }
    }

    const completedAt = Timestamp.now();
    const resultRef = db.collection("practiceResults").doc(sessionId);
    transaction.update(sessionRef, { status: "completed", completedAt });
    transaction.set(rotationRef, {
      completedGameCount: decision.completedGameCount,
      activeGameId: null,
      activeRequestId: null,
      activeStudents: null,
      activeAssignment: null,
      activeUntil: null,
      lastCompletedGameId: sessionId,
      lastCompletedAt: completedAt,
      updatedAt: completedAt,
    }, { merge: true });
    transaction.create(resultRef, {
      id: sessionId,
      unitId: session.unitId,
      date: session.date,
      students: session.students,
      classCodes: [...new Set(session.students.map((code) => code.slice(0, 3)))],
      assignment: session.assignment,
      questionBankVersion: session.questionBankVersion,
      scores: summary.scores,
      turnSummaries: summary.turnSummaries,
      attempts: attempts.map(compactAttempt),
      createdAt: completedAt,
      playedAt: completedAt,
      deletedAt: null,
      deletedBySession: null,
    });
    outcome = { resultId: sessionId, completedGameCount: decision.completedGameCount, nextGamePattern: "fixed_round_alternation", idempotent: false };
  });
  return response.status(200).json({ ok: true, ...outcome });
});

async function requireTeacherSession(request) {
  const token = parseBearerToken(request.get("Authorization"));
  const hash = tokenHash(token);
  const { db } = adminServices();
  let refreshed;
  await db.runTransaction(async (transaction) => {
    const ref = db.collection("teacherSessions").doc(hash);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new TeacherAuthError("teacher_session_expired", "教師登入已失效，請重新登入。", 401);
    const raw = snapshot.data();
    refreshed = checkTeacherSession({
      ...raw,
      idleExpiresAt: asIso(raw.idleExpiresAt),
      absoluteExpiresAt: asIso(raw.absoluteExpiresAt),
    });
    transaction.update(ref, {
      lastSeenAt: asTimestamp(refreshed.lastSeenAt),
      idleExpiresAt: asTimestamp(refreshed.idleExpiresAt),
    });
  });
  return { tokenHash: hash, session: refreshed };
}

export const teacherLogin = apiEndpoint(async (request, response) => {
  const passcode = validatePasscode(request.body?.passcode);
  const { db } = adminServices();
  const key = rateLimitKey({ ip: request.ip, userAgent: request.get("User-Agent") });
  const rateRef = db.collection("authRateLimits").doc(key);
  const rateSnapshot = await rateRef.get();
  const decision = loginRateDecision(rateSnapshot.exists ? {
    ...rateSnapshot.data(),
    lockedUntil: asIso(rateSnapshot.data().lockedUntil),
  } : {});
  if (!decision.allowed) {
    const error = new TeacherAuthError("teacher_login_locked", "錯誤次數過多，請稍後再試。", 429);
    error.retryAfterSeconds = decision.retryAfterSeconds;
    throw error;
  }

  const configSnapshot = await db.collection("privateConfig").doc("teacherAuth").get();
  const configured = configSnapshot.exists ? configSnapshot.data() : null;
  const valid = await verifyPasscode(passcode, configured);
  if (!valid) {
    await db.runTransaction(async (transaction) => {
      const currentSnapshot = await transaction.get(rateRef);
      const raw = currentSnapshot.exists ? currentSnapshot.data() : {};
      const next = nextFailureRecord({ ...raw, lockedUntil: asIso(raw.lockedUntil) });
      transaction.set(rateRef, {
        failures: next.failures,
        lastFailedAt: asTimestamp(next.lastFailedAt),
        lockedUntil: next.lockedUntil ? asTimestamp(next.lockedUntil) : null,
      }, { merge: true });
    });
    throw new TeacherAuthError("invalid_teacher_passcode", "教師通行碼不正確。", 401);
  }

  const session = createTeacherSession();
  await db.collection("teacherSessions").doc(session.tokenHash).set({
    createdAt: asTimestamp(session.createdAt),
    lastSeenAt: asTimestamp(session.lastSeenAt),
    idleExpiresAt: asTimestamp(session.idleExpiresAt),
    absoluteExpiresAt: asTimestamp(session.absoluteExpiresAt),
    revokedAt: null,
  });
  await rateRef.set({ failures: 0, lastSucceededAt: FieldValue.serverTimestamp(), lockedUntil: null }, { merge: true });
  return response.status(200).json({ ok: true, teacherSessionToken: session.token, idleExpiresAt: session.idleExpiresAt });
});

function validateDateRange(filters = {}) {
  const dateFrom = /^\d{4}-\d{2}-\d{2}$/u.test(filters.dateFrom || "") ? filters.dateFrom : taipeiDate();
  const dateTo = /^\d{4}-\d{2}-\d{2}$/u.test(filters.dateTo || "") ? filters.dateTo : dateFrom;
  const fromMs = new Date(`${dateFrom}T00:00:00+08:00`).getTime();
  const toMs = new Date(`${dateTo}T23:59:59+08:00`).getTime();
  if (fromMs > toMs || toMs - fromMs > MAX_QUERY_DAYS * 24 * 60 * 60 * 1000) throw new DomainValidationError("invalid_date_range", `查詢日期範圍最多 ${MAX_QUERY_DAYS} 天。`);
  return { dateFrom, dateTo };
}

function teacherRecord(data) {
  const nowMs = Date.now();
  return {
    ...data,
    createdAt: asIso(data.createdAt),
    playedAt: asIso(data.playedAt),
    deletedAt: asIso(data.deletedAt),
    attempts: (data.attempts || []).map((attempt) => ({
      ...attempt,
      recordingAvailable: Boolean(attempt.recordingPath && new Date(attempt.recordingExpiresAt).getTime() > nowMs),
      recordingPath: undefined,
    })),
  };
}

function requiredAttemptId(value) {
  const attemptId = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9_-]{10,180}$/u.test(attemptId)) {
    throw new DomainValidationError("invalid_attempt_id", "錄音紀錄格式不正確。");
  }
  return attemptId;
}

function isStorageNotFound(error) {
  return [404, "404"].includes(error?.code) || Number(error?.statusCode) === 404;
}

export const teacherRecording = apiEndpoint(async (request, response) => {
  await requireTeacherSession(request);
  const attemptId = requiredAttemptId(request.body?.attemptId);
  const { db, bucket } = adminServices();
  const snapshot = await db.collection("practiceAttempts").doc(attemptId).get();
  if (!snapshot.exists) {
    throw new DomainValidationError("recording_not_found", "找不到這段錄音。", 404);
  }
  const attempt = snapshot.data();
  const expiresAtMs = new Date(asIso(attempt.expiresAt)).getTime();
  if (attempt.recordingDeletedAt || (Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now())) {
    throw new DomainValidationError("recording_expired", "這段錄音已超過 30 天保存期限。", 410);
  }
  if (!attempt.recordingPath) {
    throw new DomainValidationError("recording_not_found", "找不到這段錄音。", 404);
  }

  const file = bucket.file(attempt.recordingPath);
  let metadata;
  let bytes;
  try {
    [metadata] = await file.getMetadata();
    [bytes] = await file.download();
  } catch (error) {
    if (isStorageNotFound(error)) {
      throw new DomainValidationError("recording_not_found", "找不到這段錄音。", 404);
    }
    throw new DomainValidationError("recording_storage_unavailable", "錄音服務暫時無法提供，請稍後再試。", 503);
  }

  const contentType = /^audio\/[a-z0-9.+-]+$/iu.test(String(metadata?.contentType || ""))
    ? metadata.contentType
    : "application/octet-stream";
  response.set("Content-Type", contentType);
  response.set("Content-Length", String(bytes.length));
  response.set("Content-Disposition", "inline");
  response.set("Cache-Control", "private, no-store, max-age=0");
  response.set("Pragma", "no-cache");
  response.set("Accept-Ranges", "none");
  return response.status(200).send(bytes);
});

export const teacherApi = apiEndpoint(async (request, response) => {
  const auth = await requireTeacherSession(request);
  const action = typeof request.body?.action === "string" ? request.body.action : "";
  const { db, bucket } = adminServices();

  if (action === "listResults") {
    const filters = request.body?.filters && typeof request.body.filters === "object" ? request.body.filters : {};
    const { dateFrom, dateTo } = validateDateRange(filters);
    const snapshot = await db.collection("practiceResults")
      .where("date", ">=", dateFrom)
      .where("date", "<=", dateTo)
      .orderBy("date", "desc")
      .limit(500)
      .get();
    let records = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((record) => !record.deletedAt);
    if (filters.unitId) records = records.filter((record) => record.unitId === filters.unitId);
    if (/^\d{3}$/u.test(filters.classCode || "")) records = records.filter((record) => record.classCodes?.includes(filters.classCode));
    if (/^\d{5}$/u.test(filters.studentCode || "")) records = records.filter((record) => record.students?.includes(filters.studentCode));
    if (/^HWG7-SR-\d{3}$/u.test(filters.questionId || "")) records = records.filter((record) => record.turnSummaries?.some((turn) => turn.questionId === filters.questionId));
    return response.status(200).json({ ok: true, records: records.map(teacherRecord), count: records.length, truncated: snapshot.size >= 500 });
  }


  if (action === "softDeleteResult") {
    const resultId = requiredSessionId(request.body?.resultId);
    const resultRef = db.collection("practiceResults").doc(resultId);
    const auditRef = db.collection("deletionAudit").doc();
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(resultRef);
      if (!snapshot.exists) throw new DomainValidationError("result_not_found", "找不到這份遊戲紀錄。", 404);
      if (snapshot.data().deletedAt) return;
      transaction.update(resultRef, { deletedAt: FieldValue.serverTimestamp(), deletedBySession: auth.tokenHash });
      transaction.set(auditRef, {
        resultId,
        action: "soft_delete",
        teacherSessionHash: auth.tokenHash,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    return response.status(200).json({ ok: true, resultId, status: "soft_deleted" });
  }

  if (action === "logout") {
    await db.collection("teacherSessions").doc(auth.tokenHash).delete();
    return response.status(200).json({ ok: true });
  }

  throw new DomainValidationError("unknown_teacher_action", "教師後台動作不支援。", 400);
});

export const cleanupExpiredRecordings = onSchedule(
  { region: REGION, schedule: "every day 03:15", timeZone: "Asia/Taipei", timeoutSeconds: 300, memory: "256MiB" },
  async () => {
    const { db, bucket } = adminServices();
    const snapshot = await db.collection("practiceAttempts").where("expiresAt", "<=", Timestamp.now()).limit(200).get();
    if (snapshot.empty) return;
    const batch = db.batch();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (!data.recordingPath || data.recordingDeletedAt) continue;
      await bucket.file(data.recordingPath).delete({ ignoreNotFound: true });
      batch.update(doc.ref, { recordingDeletedAt: FieldValue.serverTimestamp(), recordingPath: null });
    }
    await batch.commit();
  },
);