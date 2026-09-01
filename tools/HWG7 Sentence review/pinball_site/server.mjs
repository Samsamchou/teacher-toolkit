import http from "node:http";
import { randomBytes } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scoreSpeechAttempt } from "./functions/lib/scoring.mjs";
import {
    DomainValidationError,
    decideGameCompletion,
    decideProgressSave,
    decideGameStart,
    expectedPlayerForTurn as expectedAssignedPlayerForTurn,
    pairRotationId,
    taipeiDate,
    validateCompletionSummary,
    validateProgressSummary,
    validateStudentCodes,
    validateUnitId
} from "./functions/lib/app-domain.mjs";
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
    verifyPasscode
} from "./functions/lib/teacher-auth.mjs";

const SITE_ROOT = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.dirname(SITE_ROOT);
const UNIT_REGISTRY_PATH = path.join(SITE_ROOT, "data", "unit-registry.json");
const ENV_PATH = path.join(WORKSPACE_ROOT, ".env.local");
const LOCAL_TEACHER_CONFIG_PATH = path.join(SITE_ROOT, ".local", "teacher-auth.json");
const PORT = Number(process.env.PORT || 4173);
const MAX_BODY_BYTES = 12 * 1024 * 1024;
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

function loadLocalEnv(filePath) {
    if (!existsSync(filePath)) return;
    const source = readFileSync(filePath, "utf8");
    for (const line of source.split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!match) continue;
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
        process.env[match[1]] = value;
    }
}
loadLocalEnv(ENV_PATH);

const unitRegistryDocument = JSON.parse(await readFile(UNIT_REGISTRY_PATH, "utf8"));
const unitDefinitions = new Map((unitRegistryDocument.units || []).map(unit => [unit.id, unit]));
const bankDocuments = new Map();
const questionMaps = new Map();
for (const unit of unitDefinitions.values()) {
    const defaultFile = `data/${unit.id.replace(/-sr$/u, "-sentence-review")}.json`;
    const bankFile = unit.questionBankFile || defaultFile;
    if (!/^data\/[a-z0-9-]+\.json$/u.test(bankFile)) continue;
    const bankPath = path.resolve(SITE_ROOT, ...bankFile.split("/"));
    if (!bankPath.startsWith(`${SITE_ROOT}${path.sep}`)) continue;
    if (!existsSync(bankPath)) continue;
    const document = JSON.parse(await readFile(bankPath, "utf8"));
    const questions = Array.isArray(document.questions) ? document.questions : [];
    bankDocuments.set(unit.id, document);
    questionMaps.set(unit.id, new Map(questions.map(question => [question.id, question])));
}

function localBankForUnit(unitId, { requireReady = false } = {}) {
    const unit = unitDefinitions.get(unitId);
    if (!unit || (requireReady && unit.status !== "ready")) {
        throw new DomainValidationError("unit_not_ready", "這個單元題庫準備中，暫時不能開始。", 409);
    }
    const bankDocument = bankDocuments.get(unitId);
    const questionMap = questionMaps.get(unitId);
    if (!bankDocument || !questionMap?.size) {
        throw new DomainValidationError("unit_bank_unavailable", "這個單元題庫暫時無法使用。", 503);
    }
    return { unit, bankDocument, questionMap };
}

const rotations = new Map();
const gameSessions = new Map();
const attempts = new Map();
const results = new Map();
const teacherSessions = new Map();
const loginRates = new Map();

const MIME_TO_EXTENSION = new Map([
    ["audio/webm;codecs=opus", "webm"], ["audio/webm", "webm"], ["audio/mp4", "mp4"], ["audio/m4a", "m4a"],
    ["audio/x-m4a", "m4a"], ["audio/ogg;codecs=opus", "ogg"], ["audio/ogg", "ogg"], ["audio/mpeg", "mp3"], ["audio/wav", "wav"]
]);
const CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg", ".webp": "image/webp", ".mp3": "audio/mpeg", ".mp4": "audio/mp4", ".webm": "audio/webm",
    ".ogg": "audio/ogg", ".svg": "image/svg+xml", ".ttf": "font/ttf"
};

function sendJson(response, statusCode, body) {
    response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    response.end(JSON.stringify(body));
}

async function readJsonBody(request) {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of request) {
        bytes += chunk.length;
        if (bytes > MAX_BODY_BYTES) throw Object.assign(new Error("送出資料超過大小限制。"), { status: 413, code: "body_too_large" });
        chunks.push(chunk);
    }
    try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { throw Object.assign(new Error("送出的資料格式不正確。"), { status: 400, code: "invalid_json" }); }
}

async function transcribeAudio({ bytes, mimeType }) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw Object.assign(new Error("本機尚未設定語音服務。"), { status: 503, code: "speech_service_unconfigured" });
    const normalizedMime = String(mimeType || "").toLowerCase();
    const extension = MIME_TO_EXTENSION.get(normalizedMime);
    if (!extension) throw Object.assign(new Error("這個錄音格式暫時不支援，請改用最新版 Safari 或 Chrome。"), { status: 415, code: "unsupported_audio_type" });
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: normalizedMime }), `speech.${extension}`);
    form.append("model", "gpt-4o-mini-transcribe");
    form.append("language", "en");
    form.append("response_format", "json");
    form.append("temperature", "0");
    const apiResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form });
    const payload = await apiResponse.json().catch(() => ({}));
    if (!apiResponse.ok) throw Object.assign(new Error("語音轉文字暫時無法完成，請稍後再試。"), { status: apiResponse.status === 429 ? 429 : 502, code: "transcription_unavailable" });
    const transcript = String(payload.text || "").trim();
    if (!transcript) throw Object.assign(new Error("我沒有聽清楚。請靠近麥克風，再說一次吧！"), { status: 422, code: "speech_not_detected" });
    return transcript;
}

function requiredSessionId(value) {
    const id = typeof value === "string" ? value.trim() : "";
    if (!/^[A-Za-z0-9_-]{10,120}$/u.test(id)) throw new DomainValidationError("invalid_game_session", "遊戲工作階段格式不正確。");
    return id;
}

function expectedPlayer(session, turnIndex) {
    return expectedAssignedPlayerForTurn(session.assignment, turnIndex);
}

function startLocalGame(body) {
    const unitId = validateUnitId(body?.unitId);
    const { unit, bankDocument } = localBankForUnit(unitId, { requireReady: true });
    const students = validateStudentCodes(body?.students);
    const date = taipeiDate();
    const rotationId = pairRotationId({ unitId, date, students });
    const rotation = rotations.get(rotationId) || null;
    const decision = decideGameStart({ rotation, students, unitId, requestId: body?.requestId, now: new Date() });
    if (decision.action === "resume") return { ok: true, gameSessionId: decision.gameSessionId, assignment: decision.assignment, activeUntil: decision.activeUntil, resumed: true, date };
    const gameSessionId = `session_${randomBytes(12).toString("base64url")}`;
    const session = {
        id: gameSessionId, unitId, date, rotationId, students, assignment: decision.assignment,
        questionBankVersion: unit.questionBankVersion || bankDocument.mode?.questionBankVersion || "", status: "active", createdAt: new Date().toISOString(), activeUntil: decision.activeUntil
    };
    gameSessions.set(gameSessionId, session);
    rotations.set(rotationId, {
        unitId, date, completedGameCount: decision.completedGameCount, activeGameId: gameSessionId,
        activeRequestId: decision.requestId, activeStudents: students, activeAssignment: decision.assignment, activeUntil: decision.activeUntil
    });
    return { ok: true, gameSessionId, assignment: decision.assignment, activeUntil: decision.activeUntil, resumed: false, date };
}

function abandonLocalGame(body) {
    const sessionId = requiredSessionId(body?.gameSessionId);
    const session = gameSessions.get(sessionId);
    if (!session) throw new DomainValidationError("game_not_found", "找不到這一局遊戲。", 404);
    if (session.status === "active") {
        session.status = "abandoned";
        session.abandonedAt = new Date().toISOString();
        const rotation = rotations.get(session.rotationId);
        if (rotation?.activeGameId === sessionId) Object.assign(rotation, { activeGameId: null, activeRequestId: null, activeStudents: null, activeAssignment: null, activeUntil: null });
    }
    const existingResult = results.get(sessionId);
    if (session.status === "abandoned" && existingResult && existingResult.recordStatus !== "completed") {
        existingResult.recordStatus = "partial_ended";
        existingResult.endedAt = session.abandonedAt || new Date().toISOString();
        existingResult.updatedAt = existingResult.endedAt;
    }
    return { ok: true, status: session.status, nextGamePattern: "fixed_round_alternation" };
}

async function evaluateLocalSpeech(body) {
    const sessionId = requiredSessionId(body?.gameSessionId);
    const turnIndex = Number(body?.turnIndex);
    const attemptNumber = Number(body?.attemptNumber);
    if (!Number.isInteger(turnIndex) || turnIndex < 0 || turnIndex > 11 || !Number.isInteger(attemptNumber) || attemptNumber < 1 || attemptNumber > 3) throw new DomainValidationError("invalid_attempt_context", "評測回合或次數不正確。");
    const session = gameSessions.get(sessionId);
    if (!session || session.status !== "active" || new Date(session.activeUntil).getTime() <= Date.now()) throw new DomainValidationError("game_not_active", "這一局已結束或逾時。", 409);
    const { questionMap } = localBankForUnit(session.unitId);
    const question = questionMap.get(String(body?.questionId || ""));
    if (!question) throw new DomainValidationError("question_not_found", "找不到這一道題目。", 404);
    const player = expectedPlayer(session, turnIndex);
    if (player.questionType !== question.type) throw new DomainValidationError("wrong_question_type", "這個回合的題型與玩家分配不一致。", 409);
    const attemptId = `${sessionId}_${String(turnIndex).padStart(2, "0")}_${attemptNumber}`;
    if (attempts.has(attemptId)) return { ok: true, consumeAttempt: true, ...attempts.get(attemptId).response };
    if (typeof body.audioBase64 !== "string" || !body.audioBase64) throw Object.assign(new Error("沒有收到錄音資料。"), { status: 400, code: "invalid_audio_data" });
    const audioBytes = Buffer.from(body.audioBase64, "base64");
    if (audioBytes.length < 1000) throw Object.assign(new Error("錄音太短或沒有有效聲音，請再試一次。"), { status: 422, code: "audio_too_short" });
    if (audioBytes.length > MAX_AUDIO_BYTES) throw Object.assign(new Error("錄音檔過大，請縮短後再試一次。"), { status: 413, code: "audio_too_large" });
    const transcript = await transcribeAudio({ bytes: audioBytes, mimeType: body.mimeType });
    const score = scoreSpeechAttempt({ question, transcript, metrics: body.metrics || {} });
    if (score.valid !== true) throw Object.assign(new Error("這次沒有形成可評分的英文內容，請再說一次。"), { status: 422, code: "speech_not_valid" });
    const response = { attemptId, questionId: question.id, transcript, ...score, recordingStored: false, provider: { transcriptionModel: "gpt-4o-mini-transcribe" } };
    attempts.set(attemptId, {
        id: attemptId, gameSessionId: sessionId, unitId: session.unitId, date: session.date, turnIndex, attemptNumber,
        questionBankVersion: session.questionBankVersion,
        studentCode: player.studentCode, questionId: question.id, questionType: question.type, transcript, result: score,
        recordingAvailable: false, createdAt: new Date().toISOString(), response
    });
    return { ok: true, consumeAttempt: true, ...response };
}

function compactLocalAttempt(attempt) {
    return {
        attemptId: attempt.id,
        turnIndex: attempt.turnIndex,
        attemptNumber: attempt.attemptNumber,
        questionId: attempt.questionId,
        questionType: attempt.questionType,
        studentCode: attempt.studentCode,
        unitId: attempt.unitId,
        questionBankVersion: attempt.questionBankVersion,
        transcript: attempt.result?.displayTranscript || attempt.transcript,
        rawTranscript: attempt.result?.rawTranscript || attempt.transcript,
        canonicalTranscript: attempt.result?.canonicalTranscript || attempt.transcript,
        displayTranscript: attempt.result?.displayTranscript || attempt.transcript,
        scores: attempt.result?.scores || null,
        passed: attempt.result?.passed === true,
        feedback: attempt.result?.feedback || "",
        primaryIssue: attempt.result?.primaryIssue || null,
        matchedAnswer: attempt.result?.matchedAnswer || null,
        recordingAvailable: false,
        recordingExpiresAt: null,
    };
}

function verifyLocalSummary(session, summary) {
    const { questionMap } = localBankForUnit(session.unitId);
    const questionIds = summary.turnSummaries.map(turn => turn.questionId);
    if (new Set(questionIds).size !== questionIds.length || questionIds.some(id => !questionMap.has(id))) {
        throw new DomainValidationError("invalid_question_set", "遊戲進度包含重複或不存在的正式題目。", 409);
    }
    const attemptList = [];
    for (const turn of summary.turnSummaries) {
        const player = expectedPlayer(session, turn.turnIndex);
        const question = questionMap.get(turn.questionId);
        if (turn.studentCode !== player.studentCode || turn.questionType !== player.questionType || question.type !== player.questionType) {
            throw new DomainValidationError("turn_assignment_mismatch", "回合學生或題型與開局分配不一致。", 409);
        }
        for (const attemptId of turn.attemptIds) {
            const attempt = attempts.get(attemptId);
            if (
                !attempt ||
                attempt.gameSessionId !== session.id ||
                attempt.unitId !== session.unitId ||
                attempt.questionBankVersion !== session.questionBankVersion ||
                attempt.turnIndex !== turn.turnIndex ||
                attempt.questionId !== turn.questionId ||
                attempt.studentCode !== turn.studentCode ||
                attempt.questionType !== turn.questionType
            ) {
                throw new DomainValidationError("turn_attempt_mismatch", "回合評測紀錄與題目、學生或題序不一致。", 409);
            }
            attemptList.push(attempt);
        }
    }
    return attemptList;
}

function saveLocalGameProgress(body) {
    const sessionId = requiredSessionId(body?.gameSessionId);
    const summary = validateProgressSummary(body?.result);
    const session = gameSessions.get(sessionId);
    if (!session) throw new DomainValidationError("game_not_found", "找不到這一局遊戲。", 404);
    const attemptList = verifyLocalSummary(session, summary);
    const existingResult = results.get(sessionId) || null;
    const decision = decideProgressSave({ session, existingResult, completedTurns: summary.turnSummaries.length });
    if (["already_saved", "already_completed"].includes(decision.action)) {
        return { ok: true, resultId: sessionId, recordStatus: decision.recordStatus, completedTurns: decision.completedTurns, completedRounds: decision.completedRounds, idempotent: true };
    }
    const checkpointAt = new Date().toISOString();
    results.set(sessionId, {
        ...(existingResult || {}),
        id: sessionId,
        unitId: session.unitId,
        date: session.date,
        students: session.students,
        classCodes: [...new Set(session.students.map(code => code.slice(0, 3)))],
        assignment: session.assignment,
        questionBankVersion: session.questionBankVersion,
        scores: summary.scores,
        turnSummaries: summary.turnSummaries,
        attempts: attemptList.map(compactLocalAttempt),
        recordStatus: decision.recordStatus,
        completedTurns: decision.completedTurns,
        completedRounds: decision.completedRounds,
        createdAt: existingResult?.createdAt || checkpointAt,
        playedAt: existingResult?.playedAt || session.createdAt || checkpointAt,
        updatedAt: checkpointAt,
        deletedAt: existingResult?.deletedAt || null,
    });
    return { ok: true, resultId: sessionId, recordStatus: decision.recordStatus, completedTurns: decision.completedTurns, completedRounds: decision.completedRounds, idempotent: false };
}

function completeLocalGame(body) {
    const sessionId = requiredSessionId(body?.gameSessionId);
    const summary = validateCompletionSummary(body?.result);
    const session = gameSessions.get(sessionId);
    if (!session) throw new DomainValidationError("game_not_found", "找不到這一局遊戲。", 404);
    const rotation = rotations.get(session.rotationId);
    const decision = decideGameCompletion({ session, rotation });
    if (decision.action === "already_completed") return { ok: true, resultId: sessionId, completedGameCount: rotation?.completedGameCount ?? null, nextGamePattern: "fixed_round_alternation", idempotent: true };
    const attemptList = verifyLocalSummary(session, summary);
    const completedAt = new Date().toISOString();
    session.status = "completed";
    session.completedAt = completedAt;
    Object.assign(rotation, { completedGameCount: decision.completedGameCount, activeGameId: null, activeRequestId: null, activeStudents: null, activeAssignment: null, activeUntil: null, lastCompletedGameId: sessionId });
    const existingResult = results.get(sessionId) || null;
    results.set(sessionId, {
        ...(existingResult || {}),
        id: sessionId, unitId: session.unitId, date: session.date, students: session.students,
        classCodes: [...new Set(session.students.map(code => code.slice(0, 3)))], assignment: session.assignment,
        questionBankVersion: session.questionBankVersion,
        scores: summary.scores, turnSummaries: summary.turnSummaries,
        attempts: attemptList.map(compactLocalAttempt),
        recordStatus: "completed", completedTurns: 12, completedRounds: 6, completedAt, updatedAt: completedAt,
        playedAt: existingResult?.playedAt || completedAt, createdAt: existingResult?.createdAt || completedAt,
        deletedAt: existingResult?.deletedAt || null
    });
    return { ok: true, resultId: sessionId, completedGameCount: decision.completedGameCount, nextGamePattern: "fixed_round_alternation", idempotent: false };
}

function loadLocalTeacherConfig() {
    if (!existsSync(LOCAL_TEACHER_CONFIG_PATH)) return null;
    return JSON.parse(readFileSync(LOCAL_TEACHER_CONFIG_PATH, "utf8"));
}

async function localTeacherLogin(request, body) {
    const passcode = validatePasscode(body?.passcode);
    const key = rateLimitKey({ ip: request.socket.remoteAddress, userAgent: request.headers["user-agent"] });
    const rate = loginRates.get(key) || {};
    const decision = loginRateDecision(rate);
    if (!decision.allowed) {
        const error = new TeacherAuthError("teacher_login_locked", "錯誤次數過多，請稍後再試。", 429);
        error.retryAfterSeconds = decision.retryAfterSeconds;
        throw error;
    }
    const config = loadLocalTeacherConfig();
    const valid = await verifyPasscode(passcode, config);
    if (!valid) {
        loginRates.set(key, nextFailureRecord(rate));
        throw new TeacherAuthError("invalid_teacher_passcode", "教師通行碼不正確。", 401);
    }
    const session = createTeacherSession();
    teacherSessions.set(session.tokenHash, session);
    loginRates.set(key, {});
    return { ok: true, teacherSessionToken: session.token, idleExpiresAt: session.idleExpiresAt };
}

function requireLocalTeacher(request) {
    const token = parseBearerToken(request.headers.authorization);
    const hash = tokenHash(token);
    const session = teacherSessions.get(hash);
    const refreshed = checkTeacherSession(session);
    teacherSessions.set(hash, refreshed);
    return { hash, token };
}

function localTeacherAction(request, body) {
    const auth = requireLocalTeacher(request);
    if (body?.action === "listResults") {
        const filters = body.filters || {};
        let records = [...results.values()].filter(record => !record.deletedAt);
        if (filters.dateFrom) records = records.filter(record => record.date >= filters.dateFrom);
        if (filters.dateTo) records = records.filter(record => record.date <= filters.dateTo);
        if (filters.unitId) records = records.filter(record => record.unitId === filters.unitId);
        if (filters.classCode) records = records.filter(record => record.students.some(code => code.startsWith(filters.classCode)));
        if (filters.studentCode) records = records.filter(record => record.students.includes(filters.studentCode));
        if (filters.questionId) records = records.filter(record => record.turnSummaries.some(turn => turn.questionId === filters.questionId));
        records.sort((left, right) => right.playedAt.localeCompare(left.playedAt));
        return { ok: true, records, count: records.length, truncated: false };
    }
    if (body?.action === "softDeleteResult") {
        const id = requiredSessionId(body.resultId);
        const record = results.get(id);
        if (!record) throw new DomainValidationError("result_not_found", "找不到這份遊戲紀錄。", 404);
        record.deletedAt = new Date().toISOString();
        return { ok: true, resultId: id, status: "soft_deleted" };
    }
    if (body?.action === "logout") {
        teacherSessions.delete(auth.hash);
        return { ok: true };
    }
    throw new DomainValidationError("unknown_teacher_action", "教師後台動作不支援。");
}

function localTeacherRecording(request, body) {
    requireLocalTeacher(request);
    const attemptId = typeof body?.attemptId === "string" ? body.attemptId.trim() : "";
    if (!/^[A-Za-z0-9_-]{10,180}$/u.test(attemptId)) {
        throw new DomainValidationError("invalid_attempt_id", "錄音紀錄格式不正確。");
    }
    throw new DomainValidationError("local_recording_unavailable", "本機伺服器不保存學生錄音。", 410);
}

async function serveStatic(request, response) {
    const parsed = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    const requestedPath = decodeURIComponent(parsed.pathname === "/" ? "/index.html" : parsed.pathname);
    const filePath = path.resolve(SITE_ROOT, `.${requestedPath}`);
    if (filePath !== SITE_ROOT && !filePath.startsWith(`${SITE_ROOT}${path.sep}`)) return response.writeHead(403).end("Forbidden");
    try {
        const info = await stat(filePath);
        if (!info.isFile()) throw new Error("not a file");
        const bytes = await readFile(filePath);
        response.writeHead(200, { "Content-Type": CONTENT_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream", "Cache-Control": filePath.endsWith("index.html") ? "no-store" : "public, max-age=3600", "X-Content-Type-Options": "nosniff" });
        response.end(bytes);
    } catch { response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found"); }
}

const server = http.createServer(async (request, response) => {
    try {
        const pathname = new URL(request.url, `http://${request.headers.host || "localhost"}`).pathname;
        if (request.method === "GET" && pathname === "/api/health") return sendJson(response, 200, { ok: true, questionCount: [...questionMaps.values()].reduce((sum, map) => sum + map.size, 0), questionCountsByUnit: Object.fromEntries([...questionMaps].map(([unitId, map]) => [unitId, map.size])), openaiConfigured: Boolean(process.env.OPENAI_API_KEY), localTeacherConfigured: existsSync(LOCAL_TEACHER_CONFIG_PATH) });
        if (request.method === "POST") {
            const body = await readJsonBody(request);
            if (pathname === "/api/game/start") return sendJson(response, 200, startLocalGame(body));
            if (pathname === "/api/game/abandon") return sendJson(response, 200, abandonLocalGame(body));
            if (pathname === "/api/evaluate-speech") return sendJson(response, 200, await evaluateLocalSpeech(body));
            if (pathname === "/api/game/progress") return sendJson(response, 200, saveLocalGameProgress(body));
            if (pathname === "/api/game/complete") return sendJson(response, 200, completeLocalGame(body));
            if (pathname === "/api/teacher/login") return sendJson(response, 200, await localTeacherLogin(request, body));
            if (pathname === "/api/teacher/recording") return sendJson(response, 200, localTeacherRecording(request, body));
            if (pathname === "/api/teacher") return sendJson(response, 200, localTeacherAction(request, body));
        }
        if (request.method === "GET" || request.method === "HEAD") return await serveStatic(request, response);
        response.writeHead(405, { Allow: "GET, HEAD, POST" }).end("Method not allowed");
    } catch (error) {
        const status = Number(error.status) || Number(error.statusCode) || 500;
        const code = String(error.code || "local_api_failed");
        if (status >= 500) console.error("Local request failed", { code });
        sendJson(response, status, { ok: false, message: status >= 500 && !error.message ? "服務暫時無法完成，請稍後再試。" : error.message, consumeAttempt: false, error: { code, retryable: status === 429 || status >= 500, retryAfterSeconds: error.retryAfterSeconds || null } });
    }
});

server.listen(PORT, "127.0.0.1", () => {
    console.log(`Speech pinball local server: http://127.0.0.1:${PORT}`);
    console.log(`Question banks: ${[...questionMaps].map(([unitId, map]) => `${unitId}=${map.size}`).join(", ")}; OpenAI configured: ${Boolean(process.env.OPENAI_API_KEY)}; local teacher hash configured: ${existsSync(LOCAL_TEACHER_CONFIG_PATH)}`);
});
