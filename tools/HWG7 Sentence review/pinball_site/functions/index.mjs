import { readFileSync } from "node:fs";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAppCheck } from "firebase-admin/app-check";
import { defineSecret, defineString } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { scoreSpeechAttempt } from "./lib/scoring.mjs";
import {
  RequestValidationError,
  decideCors,
  parseAllowedOrigins,
  validateEvaluationBody,
} from "./lib/http-validation.mjs";

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const ALLOWED_ORIGINS = defineString("ALLOWED_ORIGINS", {
  default: "http://localhost:5000,http://127.0.0.1:5000",
  description: "Comma-separated exact origins allowed to call the speech endpoint; wildcards are rejected.",
});
const REQUIRE_APP_CHECK = defineString("REQUIRE_APP_CHECK", {
  default: "true",
  description: "Keep true in production. Set false only for a deliberately controlled local test.",
});

const bankDocument = JSON.parse(
  readFileSync(new URL("./data/question-bank.json", import.meta.url), "utf8"),
);
const questions = Array.isArray(bankDocument.questions) ? bankDocument.questions : [];
const questionMap = new Map(questions.map((question) => [question.id, question]));
if (questions.length !== 13 || questionMap.size !== 13) {
  throw new Error("Deployable question bank must contain 13 unique questions.");
}

function toBoolean(value) {
  return /^(1|true|yes|on)$/iu.test(String(value ?? "").trim());
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
    response.set("Access-Control-Allow-Headers", "Content-Type, X-Firebase-AppCheck");
    response.set("Access-Control-Max-Age", "3600");
  }
  return decision;
}

function sendError(response, status, code, message, retryable = false) {
  setResponseHeaders(response);
  return response.status(status).json({
    ok: false,
    message,
    consumeAttempt: false,
    error: { code, retryable, consumeAttempt: false },
  });
}

async function verifyAppCheck(request) {
  if (!toBoolean(REQUIRE_APP_CHECK.value())) return;
  const token = String(request.get("X-Firebase-AppCheck") ?? "").trim();
  if (!token) {
    throw new RequestValidationError(401, "app_check_required", "無法驗證這次評測請求，請重新整理後再試。");
  }
  if (!getApps().length) initializeApp();
  try {
    await getAppCheck().verifyToken(token);
  } catch {
    throw new RequestValidationError(401, "invalid_app_check", "無法驗證這次評測請求，請重新整理後再試。");
  }
}

async function transcribeAudio(audio) {
  const apiKey = OPENAI_API_KEY.value();
  if (!apiKey) {
    const error = new Error("OPENAI_API_KEY is unavailable.");
    error.code = "speech_service_unconfigured";
    throw error;
  }

  const form = new FormData();
  // The filename is intentionally generic: neither question ID nor student
  // information is included in the request sent to OpenAI.
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

export const evaluateSpeech = onRequest(
  {
    region: "asia-east1",
    timeoutSeconds: 60,
    memory: "256MiB",
    concurrency: 20,
    maxInstances: 10,
    cors: false,
    secrets: [OPENAI_API_KEY],
  },
  async (request, response) => {
    setResponseHeaders(response);
    let cors;
    try {
      cors = applyCorsHeaders(request, response);
    } catch {
      return sendError(response, 500, "cors_configuration_error", "服務的來源限制尚未正確設定。");
    }
    if (!cors.allowed) {
      return sendError(response, 403, "origin_not_allowed", "這個網站來源未獲准使用口說評測。");
    }
    if (request.method === "OPTIONS") return response.status(204).send("");
    if (request.method !== "POST") {
      response.set("Allow", "POST, OPTIONS");
      return sendError(response, 405, "method_not_allowed", "此評測端點只接受 POST 請求。");
    }
    if (!request.is("application/json")) {
      return sendError(response, 415, "json_required", "請用 JSON 格式送出評測資料。");
    }

    try {
      await verifyAppCheck(request);
      const audio = validateEvaluationBody(request.body, new Set(questionMap.keys()));
      const question = questionMap.get(audio.questionId);
      const transcript = await transcribeAudio(audio);
      const result = scoreSpeechAttempt({ question, transcript, metrics: audio.metrics });
      if (result.valid !== true) {
        return sendError(
          response,
          422,
          "speech_not_valid",
          "這次沒有形成可評分的英文內容，請再說一次。",
          true,
        );
      }
      setResponseHeaders(response);
      return response.status(200).json({
        ok: true,
        consumeAttempt: result.valid === true,
        questionId: question.id,
        transcript,
        ...result,
        provider: { transcriptionModel: "gpt-4o-mini-transcribe" },
      });
    } catch (error) {
      if (error instanceof RequestValidationError) {
        return sendError(
          response,
          error.status,
          error.code,
          error.message,
          error.retryable === true,
        );
      }

      // Never log request bodies, audio, transcripts, student identifiers, or
      // the secret. Only a coarse internal code is emitted for operations.
      const code = String(error?.code ?? "speech_evaluation_failed");
      console.error("evaluateSpeech failed", { code });
      const retryable = error?.retryable === true;
      return sendError(
        response,
        retryable ? 503 : 500,
        code,
        "口說評分暫時無法完成，請稍後再試。",
        retryable,
      );
    }
  },
);
