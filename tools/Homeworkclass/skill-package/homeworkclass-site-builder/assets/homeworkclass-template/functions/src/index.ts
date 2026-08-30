import { createHmac } from "node:crypto";
import bcrypt from "bcryptjs";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall, type CallableRequest } from "firebase-functions/v2/https";

if (getApps().length === 0) {
  initializeApp();
}

const TEACHER_UID = "homeworkclass-teacher";
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const RATE_RECORD_TTL_MS = 24 * 60 * 60 * 1000;

const teacherPinBcryptHash = defineSecret("TEACHER_PIN_BCRYPT_HASH");
const rateLimitIpSalt = defineSecret("RATE_LIMIT_IP_SALT");

interface VerifyTeacherPinInput {
  pin?: unknown;
}

interface RateLimitRecord {
  failedAttempts?: unknown;
  lockedUntil?: unknown;
}

interface AttemptResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

const genericDeniedMessage =
  "通行碼不正確，請再試一次。 / The passcode is incorrect.";
const lockedMessage =
  "嘗試次數過多，請稍後再試。 / Too many attempts; please try again later.";

function sourceIp(request: CallableRequest<VerifyTeacherPinInput>): string {
  const candidate =
    request.rawRequest.ip || request.rawRequest.socket.remoteAddress || "unknown";
  return candidate.startsWith("::ffff:") ? candidate.slice(7) : candidate;
}

function rateLimitDocumentId(ipAddress: string, secretSalt: string): string {
  return createHmac("sha256", secretSalt).update(ipAddress).digest("hex");
}

function timestampMillis(value: unknown): number {
  return value instanceof Timestamp ? value.toMillis() : 0;
}

function safeFailedAttempts(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? Math.min(value, MAX_FAILED_ATTEMPTS)
    : 0;
}

function lockedError(retryAfterSeconds: number): HttpsError {
  return new HttpsError("resource-exhausted", lockedMessage, {
    retryAfterSeconds: Math.max(1, retryAfterSeconds),
  });
}

async function ensureNotLocked(
  documentId: string,
  nowMillis: number,
): Promise<void> {
  const snapshot = await getFirestore()
    .collection("_securityRateLimits")
    .doc(documentId)
    .get();
  const lockedUntil = timestampMillis(
    (snapshot.data() as RateLimitRecord | undefined)?.lockedUntil,
  );
  if (lockedUntil > nowMillis) {
    throw lockedError(Math.ceil((lockedUntil - nowMillis) / 1000));
  }
}

async function recordAttempt(
  documentId: string,
  pinMatched: boolean,
  nowMillis: number,
): Promise<AttemptResult> {
  const database = getFirestore();
  const reference = database.collection("_securityRateLimits").doc(documentId);

  return database.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    const record = snapshot.data() as RateLimitRecord | undefined;
    const lockedUntil = timestampMillis(record?.lockedUntil);

    if (lockedUntil > nowMillis) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((lockedUntil - nowMillis) / 1000),
      };
    }

    if (pinMatched) {
      // A successful sign-in clears this IP's failure counter.
      // 成功登入即清除此 IP 的失敗計數。
      if (snapshot.exists) transaction.delete(reference);
      return { allowed: true };
    }

    const previousAttempts = lockedUntil === 0
      ? safeFailedAttempts(record?.failedAttempts)
      : 0;
    const failedAttempts = previousAttempts + 1;
    const expiresAt = Timestamp.fromMillis(nowMillis + RATE_RECORD_TTL_MS);

    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      const nextLockedUntil = Timestamp.fromMillis(nowMillis + LOCK_DURATION_MS);
      transaction.set(reference, {
        failedAttempts: MAX_FAILED_ATTEMPTS,
        lockedUntil: nextLockedUntil,
        updatedAt: FieldValue.serverTimestamp(),
        expiresAt,
      });
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(LOCK_DURATION_MS / 1000),
      };
    }

    transaction.set(reference, {
      failedAttempts,
      updatedAt: FieldValue.serverTimestamp(),
      expiresAt,
    });
    return { allowed: false };
  });
}

const enforceAppCheckInThisRuntime = process.env.FUNCTIONS_EMULATOR !== "true";

export const verifyTeacherPin = onCall<VerifyTeacherPinInput>(
  {
    region: "asia-east1",
    memory: "256MiB",
    timeoutSeconds: 15,
    maxInstances: 5,
    enforceAppCheck: enforceAppCheckInThisRuntime,
    secrets: [teacherPinBcryptHash, rateLimitIpSalt],
  },
  async (request) => {
    try {
      // Secret values supplied through standard input can contain a trailing
      // newline. Normalize surrounding whitespace without ever logging it.
      // 透過標準輸入設定 Secret 時可能帶有尾端換行；僅移除前後空白，絕不記錄內容。
      const storedHash = teacherPinBcryptHash.value().trim();
      const ipSalt = rateLimitIpSalt.value().trim();

      if (!/^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$/.test(storedHash)) {
        throw new HttpsError(
          "failed-precondition",
          "教師登入尚未完成安全設定。 / Teacher sign-in is not configured.",
        );
      }
      if (ipSalt.length < 32) {
        throw new HttpsError(
          "failed-precondition",
          "教師登入尚未完成安全設定。 / Teacher sign-in is not configured.",
        );
      }

      const nowMillis = Date.now();
      const documentId = rateLimitDocumentId(sourceIp(request), ipSalt);
      await ensureNotLocked(documentId, nowMillis);

      // Invalid shapes still consume an attempt, but are never logged or echoed.
      // 格式錯誤仍計入嘗試次數，但絕不記錄或回顯通行碼。
      const rawPin = request.data?.pin;
      const candidatePin =
        typeof rawPin === "string" && /^[0-9]{6}$/.test(rawPin)
          ? rawPin
          : "invalid";
      const pinMatched = await bcrypt.compare(candidatePin, storedHash);
      const result = await recordAttempt(documentId, pinMatched, nowMillis);

      if (!result.allowed) {
        if (result.retryAfterSeconds) {
          throw lockedError(result.retryAfterSeconds);
        }
        throw new HttpsError("permission-denied", genericDeniedMessage);
      }

      const customToken = await getAuth().createCustomToken(TEACHER_UID, {
        role: "teacher",
      });
      return { customToken };
    } catch (error) {
      if (error instanceof HttpsError) throw error;

      // Never log request data, PINs, raw IP addresses, hashes, or secret values.
      // 絕不記錄 request data、PIN、原始 IP、雜湊或秘密值。
      logger.error("Teacher PIN verification failed unexpectedly.", {
        errorType: error instanceof Error ? error.name : typeof error,
      });
      throw new HttpsError(
        "internal",
        "目前無法完成登入，請稍後再試。 / Sign-in is temporarily unavailable.",
      );
    }
  },
);
