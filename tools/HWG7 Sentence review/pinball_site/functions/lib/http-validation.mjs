const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const MIN_AUDIO_BYTES = 1000;
const MAX_BASE64_LENGTH = Math.ceil(MAX_AUDIO_BYTES / 3) * 4;

const AUDIO_TYPES = Object.freeze({
  "audio/webm": { extension: "webm", container: "webm", openAiMime: "audio/webm" },
  "audio/ogg": { extension: "ogg", container: "ogg", openAiMime: "audio/ogg" },
  "audio/mp4": { extension: "mp4", container: "mp4", openAiMime: "audio/mp4" },
  "audio/m4a": { extension: "m4a", container: "mp4", openAiMime: "audio/mp4" },
  "audio/x-m4a": { extension: "m4a", container: "mp4", openAiMime: "audio/mp4" },
  "audio/mpeg": { extension: "mp3", container: "mp3", openAiMime: "audio/mpeg" },
  "audio/mp3": { extension: "mp3", container: "mp3", openAiMime: "audio/mpeg" },
  "audio/wav": { extension: "wav", container: "wav", openAiMime: "audio/wav" },
  "audio/x-wav": { extension: "wav", container: "wav", openAiMime: "audio/wav" },
  "audio/flac": { extension: "flac", container: "flac", openAiMime: "audio/flac" },
});

const BODY_FIELDS = new Set(["questionId", "mimeType", "audioBase64", "metrics", "gameSessionId", "turnIndex", "attemptNumber"]);
const METRIC_LIMITS = Object.freeze({
  speechWindowMs: { maximum: 60_000, integer: false },
  speechWindowSeconds: { maximum: 60, integer: false },
  spokenWordCount: { maximum: 100, integer: true },
  mediumPauses: { maximum: 30, integer: true },
  longPauses: { maximum: 30, integer: true },
  repetitions: { maximum: 30, integer: true },
});

export class RequestValidationError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "RequestValidationError";
    this.status = status;
    this.code = code;
    this.retryable = false;
  }
}

function fail(status, code, message) {
  throw new RequestValidationError(status, code, message);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function normalizeMimeType(value) {
  if (typeof value !== "string" || value.length > 100) {
    fail(415, "unsupported_audio_type", "這個錄音格式暫時不支援，請改用最新版 Safari 或 Chrome。");
  }
  const parts = value.toLowerCase().split(";").map((part) => part.trim()).filter(Boolean);
  const baseType = parts[0];
  const codecParameters = parts.slice(1);
  if (codecParameters.some((part) => !/^codecs=(opus|aac)$/u.test(part))) {
    fail(415, "unsupported_audio_type", "這個錄音格式暫時不支援，請改用最新版 Safari 或 Chrome。");
  }
  const type = AUDIO_TYPES[baseType];
  if (!type) {
    fail(415, "unsupported_audio_type", "這個錄音格式暫時不支援，請改用最新版 Safari 或 Chrome。");
  }
  return { baseType, ...type };
}

function decodeCanonicalBase64(value) {
  if (typeof value !== "string" || !value || value.length > MAX_BASE64_LENGTH) {
    fail(value?.length > MAX_BASE64_LENGTH ? 413 : 400, "invalid_audio_data", "沒有收到有效的錄音資料。");
  }
  if (value.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)) {
    fail(400, "invalid_audio_data", "錄音資料格式不正確，請重新錄音。");
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64") !== value) {
    fail(400, "invalid_audio_data", "錄音資料格式不正確，請重新錄音。");
  }
  if (bytes.length < MIN_AUDIO_BYTES) {
    fail(422, "audio_too_short", "錄音太短或沒有有效聲音，請再試一次。");
  }
  if (bytes.length > MAX_AUDIO_BYTES) {
    fail(413, "audio_too_large", "錄音檔過大，請縮短後再試一次。");
  }
  return bytes;
}

function detectedContainer(bytes) {
  if (bytes.length >= 4 && bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return "webm";
  if (bytes.length >= 4 && bytes.subarray(0, 4).toString("ascii") === "OggS") return "ogg";
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WAVE"
  ) return "wav";
  if (bytes.length >= 4 && bytes.subarray(0, 4).toString("ascii") === "fLaC") return "flac";
  if (bytes.length >= 8 && bytes.subarray(4, 8).toString("ascii") === "ftyp") return "mp4";
  if (
    bytes.length >= 3 &&
    (bytes.subarray(0, 3).toString("ascii") === "ID3" ||
      (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0))
  ) return "mp3";
  return null;
}

function validateMetrics(value) {
  if (value === undefined) return {};
  if (!isPlainObject(value)) fail(400, "invalid_metrics", "錄音計時資料格式不正確。");
  const unknown = Object.keys(value).filter((key) => !(key in METRIC_LIMITS));
  if (unknown.length) fail(400, "invalid_metrics", "錄音計時資料包含不支援的欄位。");

  const metrics = {};
  for (const [key, rawValue] of Object.entries(value)) {
    const number = Number(rawValue);
    const rule = METRIC_LIMITS[key];
    if (!Number.isFinite(number) || number < 0 || number > rule.maximum) {
      fail(400, "invalid_metrics", "錄音計時資料超出允許範圍。");
    }
    if (rule.integer && !Number.isInteger(number)) {
      fail(400, "invalid_metrics", "錄音計次資料必須是整數。");
    }
    metrics[key] = number;
  }
  return metrics;
}

export function validateEvaluationBody(body, questionIds) {
  if (!isPlainObject(body)) fail(400, "invalid_json_body", "送出的資料格式不正確。");

  // Rejecting every extra field prevents accidental collection of student
  // names, class-seat codes, or other identifiers at this endpoint.
  const unknown = Object.keys(body).filter((key) => !BODY_FIELDS.has(key));
  if (unknown.length) fail(400, "unexpected_field", "評測資料包含不需要的欄位。");

  if (typeof body.questionId !== "string" || !/^[A-Z0-9]+(?:-[A-Z0-9]+)*-\d{3}$/u.test(body.questionId)) {
    fail(400, "invalid_question_id", "題目編號格式不正確。");
  }
  if (!questionIds.has(body.questionId)) fail(404, "question_not_found", "找不到這一道題目。");

  const media = normalizeMimeType(body.mimeType);
  const bytes = decodeCanonicalBase64(body.audioBase64);
  if (detectedContainer(bytes) !== media.container) {
    fail(415, "audio_signature_mismatch", "錄音內容與檔案格式不一致，請重新錄音。");
  }

  const contextValues = [body.gameSessionId, body.turnIndex, body.attemptNumber];
  const hasAnyContext = contextValues.some((value) => value !== undefined);
  let gameContext = null;
  if (hasAnyContext) {
    if (typeof body.gameSessionId !== "string" || !/^[A-Za-z0-9_-]{10,120}$/u.test(body.gameSessionId)) {
      fail(400, "invalid_game_session", "遊戲工作階段格式不正確。");
    }
    if (!Number.isInteger(body.turnIndex) || body.turnIndex < 0 || body.turnIndex > 11) {
      fail(400, "invalid_turn_index", "遊戲回合編號不正確。");
    }
    if (!Number.isInteger(body.attemptNumber) || body.attemptNumber < 1 || body.attemptNumber > 3) {
      fail(400, "invalid_attempt_number", "作答次數不正確。");
    }
    gameContext = {
      gameSessionId: body.gameSessionId,
      turnIndex: body.turnIndex,
      attemptNumber: body.attemptNumber,
    };
  }

  return {
    questionId: body.questionId,
    bytes,
    metrics: validateMetrics(body.metrics),
    gameContext,
    ...media,
  };
}

export function parseAllowedOrigins(value) {
  const origins = new Set();
  for (const raw of String(value ?? "").split(",")) {
    const candidate = raw.trim();
    if (!candidate) continue;
    if (candidate === "*") fail(500, "unsafe_cors_config", "CORS 設定不可使用萬用來源。");
    let parsed;
    try {
      parsed = new URL(candidate);
    } catch {
      fail(500, "invalid_cors_config", "CORS 來源設定格式不正確。");
    }
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.pathname !== "/" || parsed.search || parsed.hash) {
      fail(500, "invalid_cors_config", "CORS 來源必須是完整且不含路徑的 http(s) 來源。");
    }
    origins.add(parsed.origin);
  }
  return origins;
}

function firstHeader(headers, name) {
  const value = headers?.[name];
  return Array.isArray(value) ? value[0] : String(value ?? "").split(",")[0].trim();
}

export function decideCors(headers, allowedOrigins) {
  const origin = firstHeader(headers, "origin");
  if (!origin) return { allowed: true, origin: null };

  let normalizedOrigin;
  try {
    normalizedOrigin = new URL(origin).origin;
  } catch {
    return { allowed: false, origin: null };
  }
  if (normalizedOrigin !== origin || allowedOrigins.has(normalizedOrigin)) {
    return normalizedOrigin === origin && allowedOrigins.has(normalizedOrigin)
      ? { allowed: true, origin: normalizedOrigin }
      : { allowed: false, origin: null };
  }

  const host = firstHeader(headers, "x-forwarded-host") || firstHeader(headers, "host");
  const protocol = firstHeader(headers, "x-forwarded-proto");
  try {
    const parsed = new URL(normalizedOrigin);
    const protocolMatches = !protocol || parsed.protocol === `${protocol}:`;
    return parsed.host === host && protocolMatches
      ? { allowed: true, origin: normalizedOrigin }
      : { allowed: false, origin: null };
  } catch {
    return { allowed: false, origin: null };
  }
}

export const AUDIO_LIMITS = Object.freeze({
  maximumBytes: MAX_AUDIO_BYTES,
  minimumBytes: MIN_AUDIO_BYTES,
});
