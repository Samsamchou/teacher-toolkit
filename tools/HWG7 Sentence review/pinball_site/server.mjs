import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scoreSpeechAttempt } from "./functions/lib/scoring.mjs";

const SITE_ROOT = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.dirname(SITE_ROOT);
const BANK_PATH = path.join(SITE_ROOT, "data", "hwg7-sentence-review.json");
const ENV_PATH = path.join(WORKSPACE_ROOT, ".env.local");
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
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        process.env[match[1]] = value;
    }
}

loadLocalEnv(ENV_PATH);

const bankDocument = JSON.parse(await readFile(BANK_PATH, "utf8"));
const questionMap = new Map((bankDocument.questions || []).map(question => [question.questionId || question.id, question]));

const MIME_TO_EXTENSION = new Map([
    ["audio/webm;codecs=opus", "webm"],
    ["audio/webm", "webm"],
    ["audio/mp4", "mp4"],
    ["audio/m4a", "m4a"],
    ["audio/x-m4a", "m4a"],
    ["audio/ogg;codecs=opus", "ogg"],
    ["audio/ogg", "ogg"],
    ["audio/mpeg", "mp3"],
    ["audio/wav", "wav"]
]);

const CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".mp3": "audio/mpeg",
    ".mp4": "audio/mp4",
    ".webm": "audio/webm",
    ".ogg": "audio/ogg",
    ".svg": "image/svg+xml"
};

function sendJson(response, statusCode, body) {
    const payload = JSON.stringify(body);
    response.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
    });
    response.end(payload);
}

async function readJsonBody(request) {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of request) {
        bytes += chunk.length;
        if (bytes > MAX_BODY_BYTES) throw Object.assign(new Error("錄音資料超過大小限制。"), { statusCode: 413 });
        chunks.push(chunk);
    }
    try {
        return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
        throw Object.assign(new Error("送出的資料格式不正確。"), { statusCode: 400 });
    }
}

async function transcribeAudio({ bytes, mimeType, question }) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw Object.assign(new Error("本機尚未設定語音服務。"), { statusCode: 503 });
    const normalizedMime = String(mimeType || "").toLowerCase();
    const extension = MIME_TO_EXTENSION.get(normalizedMime);
    if (!extension) throw Object.assign(new Error("這個錄音格式暫時不支援，請改用最新版 Safari 或 Chrome。"), { statusCode: 415 });

    const form = new FormData();
    form.append("file", new Blob([bytes], { type: normalizedMime }), `${question.questionId || question.id}.${extension}`);
    form.append("model", "gpt-4o-mini-transcribe");
    form.append("language", "en");
    form.append("response_format", "json");
    form.append("temperature", "0");

    const apiResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form
    });
    const payload = await apiResponse.json().catch(() => ({}));
    if (!apiResponse.ok) {
        const error = new Error("語音轉文字暫時無法完成，請稍後再試。" );
        error.statusCode = apiResponse.status === 429 ? 429 : 502;
        throw error;
    }
    const transcript = String(payload.text || "").trim();
    if (!transcript) throw Object.assign(new Error("我沒有聽清楚。請靠近麥克風，再說一次吧！"), { statusCode: 422 });
    return { transcript, usage: payload.usage || null };
}

async function handleEvaluation(request, response) {
    const body = await readJsonBody(request);
    const question = questionMap.get(String(body.questionId || ""));
    if (!question) return sendJson(response, 404, { message: "找不到這一道題目。" });
    if (typeof body.audioBase64 !== "string" || !body.audioBase64) {
        return sendJson(response, 400, { message: "沒有收到錄音資料。" });
    }
    const audioBytes = Buffer.from(body.audioBase64, "base64");
    if (audioBytes.length < 1000) return sendJson(response, 422, { message: "錄音太短或沒有有效聲音，請再試一次。" });
    if (audioBytes.length > MAX_AUDIO_BYTES) return sendJson(response, 413, { message: "錄音檔過大，請縮短後再試一次。" });

    const { transcript, usage } = await transcribeAudio({ bytes: audioBytes, mimeType: body.mimeType, question });
    const result = scoreSpeechAttempt({ question, transcript, metrics: body.metrics || {} });
    if (result.valid !== true) {
        return sendJson(response, 422, {
            message: "這次沒有形成可評分的英文內容，請再說一次。",
            consumeAttempt: false
        });
    }
    return sendJson(response, 200, {
        questionId: question.questionId || question.id,
        rubricVersion: question.rubricVersion || bankDocument.rubricVersion || "a1-v1",
        passScore: bankDocument.game?.passScore || 80,
        transcript,
        ...result,
        provider: { transcriptionModel: "gpt-4o-mini-transcribe", usage }
    });
}

async function serveStatic(request, response) {
    const parsed = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    const requestedPath = decodeURIComponent(parsed.pathname === "/" ? "/index.html" : parsed.pathname);
    const filePath = path.resolve(SITE_ROOT, `.${requestedPath}`);
    if (filePath !== SITE_ROOT && !filePath.startsWith(`${SITE_ROOT}${path.sep}`)) {
        response.writeHead(403).end("Forbidden");
        return;
    }
    try {
        const info = await stat(filePath);
        if (!info.isFile()) throw new Error("not a file");
        const bytes = await readFile(filePath);
        response.writeHead(200, {
            "Content-Type": CONTENT_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
            "Cache-Control": filePath.endsWith("index.html") ? "no-store" : "public, max-age=3600",
            "X-Content-Type-Options": "nosniff"
        });
        response.end(bytes);
    } catch {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
    }
}

const server = http.createServer(async (request, response) => {
    try {
        if (request.method === "GET" && request.url === "/api/health") {
            return sendJson(response, 200, {
                ok: true,
                questionCount: questionMap.size,
                openaiConfigured: Boolean(process.env.OPENAI_API_KEY)
            });
        }
        if (request.method === "POST" && request.url === "/api/evaluate-speech") {
            return await handleEvaluation(request, response);
        }
        if (request.method === "GET" || request.method === "HEAD") return await serveStatic(request, response);
        response.writeHead(405, { Allow: "GET, HEAD, POST" }).end("Method not allowed");
    } catch (error) {
        const statusCode = Number(error.statusCode) || 500;
        if (statusCode >= 500) console.error("Request failed:", error.message);
        sendJson(response, statusCode, { message: statusCode >= 500 ? "服務暫時無法完成，請稍後再試。" : error.message });
    }
});

server.listen(PORT, "127.0.0.1", () => {
    console.log(`HWG7 speech pinball local server: http://127.0.0.1:${PORT}`);
    console.log(`Question bank: ${questionMap.size}; OpenAI configured: ${Boolean(process.env.OPENAI_API_KEY)}`);
});
