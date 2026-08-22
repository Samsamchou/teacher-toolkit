import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
export const PASSCODE_LENGTH = 6;
export const SESSION_IDLE_MS = 30 * 60 * 1000;
export const SESSION_ABSOLUTE_MS = 8 * 60 * 60 * 1000;
export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;
const DEFAULT_SCRYPT = Object.freeze({ N: 32768, r: 8, p: 1, keyLength: 32, maxmem: 64 * 1024 * 1024 });

export class TeacherAuthError extends Error {
  constructor(code, message, status = 401) {
    super(message);
    this.name = "TeacherAuthError";
    this.code = code;
    this.status = status;
  }
}

export function validatePasscode(value) {
  const passcode = typeof value === "string" ? value : "";
  if (!/^\d{6}$/u.test(passcode)) {
    throw new TeacherAuthError("invalid_passcode_format", "請輸入六碼教師通行碼。", 400);
  }
  return passcode;
}

function normalizeParameters(value = {}) {
  const parameters = {
    N: Number(value.N ?? DEFAULT_SCRYPT.N),
    r: Number(value.r ?? DEFAULT_SCRYPT.r),
    p: Number(value.p ?? DEFAULT_SCRYPT.p),
    keyLength: Number(value.keyLength ?? DEFAULT_SCRYPT.keyLength),
    maxmem: Number(value.maxmem ?? DEFAULT_SCRYPT.maxmem),
  };
  if (
    !Number.isInteger(parameters.N) || parameters.N < 16384 ||
    !Number.isInteger(parameters.r) || parameters.r < 8 ||
    !Number.isInteger(parameters.p) || parameters.p < 1 ||
    !Number.isInteger(parameters.keyLength) || parameters.keyLength < 32 || parameters.keyLength > 64 ||
    !Number.isInteger(parameters.maxmem) || parameters.maxmem < 32 * 1024 * 1024
  ) {
    throw new TypeError("Unsafe scrypt parameters");
  }
  return parameters;
}

async function derive(passcode, salt, parameters) {
  return Buffer.from(await scrypt(passcode, salt, parameters.keyLength, {
    N: parameters.N,
    r: parameters.r,
    p: parameters.p,
    maxmem: parameters.maxmem,
  }));
}

export async function createPasscodeConfig(passcode, { salt = randomBytes(24), parameters } = {}) {
  const validPasscode = validatePasscode(passcode);
  const normalized = normalizeParameters(parameters);
  const saltBuffer = Buffer.isBuffer(salt) ? salt : Buffer.from(salt);
  if (saltBuffer.length < 16) throw new TypeError("Passcode salt must be at least 16 bytes");
  const hash = await derive(validPasscode, saltBuffer, normalized);
  return {
    version: 1,
    algorithm: "scrypt",
    saltBase64: saltBuffer.toString("base64"),
    hashBase64: hash.toString("base64"),
    parameters: normalized,
  };
}

export async function verifyPasscode(passcode, config) {
  const validPasscode = validatePasscode(passcode);
  if (!config || config.algorithm !== "scrypt") throw new TeacherAuthError("teacher_auth_not_configured", "教師登入尚未完成安全設定。", 503);
  const parameters = normalizeParameters(config.parameters);
  const salt = Buffer.from(String(config.saltBase64 || ""), "base64");
  const expected = Buffer.from(String(config.hashBase64 || ""), "base64");
  if (salt.length < 16 || expected.length !== parameters.keyLength) throw new TeacherAuthError("teacher_auth_invalid", "教師登入設定無法使用。", 503);
  const actual = await derive(validPasscode, salt, parameters);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function tokenHash(token) {
  const value = typeof token === "string" ? token.trim() : "";
  if (!/^[A-Za-z0-9_-]{40,120}$/u.test(value)) throw new TeacherAuthError("invalid_teacher_session", "教師登入已失效，請重新登入。", 401);
  return createHash("sha256").update(value).digest("hex");
}

export function createTeacherSession(now = new Date()) {
  const nowMs = new Date(now).getTime();
  if (!Number.isFinite(nowMs)) throw new TypeError("createTeacherSession requires a valid date");
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: tokenHash(token),
    createdAt: new Date(nowMs).toISOString(),
    lastSeenAt: new Date(nowMs).toISOString(),
    idleExpiresAt: new Date(nowMs + SESSION_IDLE_MS).toISOString(),
    absoluteExpiresAt: new Date(nowMs + SESSION_ABSOLUTE_MS).toISOString(),
  };
}

export function parseBearerToken(value) {
  const match = String(value || "").match(/^Bearer\s+([^\s]+)$/iu);
  if (!match) throw new TeacherAuthError("teacher_session_required", "請先登入教師後台。", 401);
  tokenHash(match[1]);
  return match[1];
}

export function checkTeacherSession(session, now = new Date()) {
  if (!session || session.revokedAt) throw new TeacherAuthError("teacher_session_expired", "教師登入已失效，請重新登入。", 401);
  const nowMs = new Date(now).getTime();
  const idleMs = new Date(session.idleExpiresAt).getTime();
  const absoluteMs = new Date(session.absoluteExpiresAt).getTime();
  if (!Number.isFinite(idleMs) || !Number.isFinite(absoluteMs) || nowMs >= idleMs || nowMs >= absoluteMs) {
    throw new TeacherAuthError("teacher_session_expired", "教師登入已逾時，請重新登入。", 401);
  }
  return {
    ...session,
    lastSeenAt: new Date(nowMs).toISOString(),
    idleExpiresAt: new Date(Math.min(nowMs + SESSION_IDLE_MS, absoluteMs)).toISOString(),
  };
}

export function rateLimitKey({ ip, userAgent }) {
  const material = `teacher-login-v1|${String(ip || "unknown")}|${String(userAgent || "unknown").slice(0, 240)}`;
  return createHash("sha256").update(material).digest("hex");
}

export function loginRateDecision(record = {}, now = new Date()) {
  const nowMs = new Date(now).getTime();
  const lockedUntilMs = record.lockedUntil ? new Date(record.lockedUntil).getTime() : 0;
  if (lockedUntilMs > nowMs) {
    return { allowed: false, retryAfterSeconds: Math.ceil((lockedUntilMs - nowMs) / 1000) };
  }
  return { allowed: true, failures: Number.isInteger(record.failures) && record.failures > 0 ? record.failures : 0 };
}

export function nextFailureRecord(record = {}, now = new Date()) {
  const nowMs = new Date(now).getTime();
  const current = loginRateDecision(record, now);
  const failures = current.allowed ? current.failures + 1 : MAX_FAILED_LOGINS;
  return {
    failures,
    lastFailedAt: new Date(nowMs).toISOString(),
    lockedUntil: failures >= MAX_FAILED_LOGINS ? new Date(nowMs + LOCKOUT_MS).toISOString() : null,
  };
}