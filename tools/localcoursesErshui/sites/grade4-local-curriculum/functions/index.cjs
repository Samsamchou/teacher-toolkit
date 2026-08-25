const { randomUUID, timingSafeEqual } = require("node:crypto");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const {
  FieldPath,
  getFirestore,
  Timestamp,
} = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { logger } = require("firebase-functions");
const { defineSecret } = require("firebase-functions/params");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");

initializeApp();

const teacherPassword = defineSecret("TEACHER_PASSWORD");
const TEACHER_UID = "ershui-grade4-teacher";
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const MAX_LOGIN_FAILURES = 5;
const TAIPEI_TIME_ZONE = "Asia/Taipei";
const RECORDING_STATUSES = new Set([
  "not_requested",
  "unsupported",
  "declined",
]);

function taipeiDate(value) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TAIPEI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const item = (type) => parts.find((part) => part.type === type)?.value;
  return `${item("year")}-${item("month")}-${item("day")}`;
}

function requireAnonymousStudent(request) {
  if (
    !request.auth ||
    request.auth.token.firebase?.sign_in_provider !== "anonymous"
  ) {
    throw new HttpsError("unauthenticated", "無法建立安全的學生紀錄。");
  }
}

exports.createTicketAttemptV2 = onCall(
  {
    region: "asia-east1",
    enforceAppCheck: true,
  },
  async (request) => {
    requireAnonymousStudent(request);
    const studentId = String(request.data?.studentId ?? "");
    if (!/^[0-9]{5}$/.test(studentId)) {
      throw new HttpsError("invalid-argument", "請輸入五位數學號。");
    }
    const requestedStatus = String(
      request.data?.recordingStatus ?? "not_requested",
    );
    const recordingStatus = RECORDING_STATUSES.has(requestedStatus)
      ? requestedStatus
      : "not_requested";
    const createdAtClient = String(request.data?.createdAtClient ?? "");
    const now = new Date();
    const expires = new Date(now);
    expires.setUTCFullYear(expires.getUTCFullYear() + 1);
    const practiceStartedAt = Timestamp.fromDate(now);
    const expiresAt = Timestamp.fromDate(expires);
    const attemptId = randomUUID();
    const record = {
      attemptId,
      uid: request.auth.uid,
      studentId,
      unitId: "train-tickets",
      contentVersion: "tickets-v2",
      status: "in_progress",
      currentStep: 1,
      passedSteps: 0,
      score: 0,
      errorCount: 0,
      eventCount: 0,
      practiceStartedAt,
      practiceDateTaipei: taipeiDate(now),
      practiceDateStatus: "server",
      travelDate: null,
      timeStart: null,
      timeEnd: null,
      origin: "ershui",
      destination: null,
      trainNumber: null,
      trainType: null,
      depart: null,
      arrive: null,
      durationMinutes: null,
      pdfPath: null,
      recordingPath: null,
      recordingStatus,
      createdAtClient:
        Number.isFinite(Date.parse(createdAtClient))
          ? createdAtClient
          : now.toISOString(),
      completedAtClient: null,
      expiresAt,
      createdAt: practiceStartedAt,
      updatedAt: practiceStartedAt,
    };
    await getFirestore().collection("tickets-v2").doc(attemptId).set(record);
    return {
      attemptId,
      uid: request.auth.uid,
      practiceStartedAtMillis: practiceStartedAt.toMillis(),
      practiceDateTaipei: record.practiceDateTaipei,
      expiresAtMillis: expiresAt.toMillis(),
      createdAtClient: record.createdAtClient,
      recordingStatus,
    };
  },
);

exports.backfillPracticeDates = onCall(
  {
    region: "asia-east1",
    enforceAppCheck: true,
    memory: "256MiB",
    timeoutSeconds: 300,
  },
  async (request) => {
    if (!request.auth || request.auth.token.teacher !== true) {
      throw new HttpsError("permission-denied", "需要教師權限。");
    }
    const database = getFirestore();
    let cursor = null;
    let scanned = 0;
    let updated = 0;
    let unconfirmed = 0;

    for (let page = 0; page < 10; page += 1) {
      let recordsQuery = database
        .collection("tickets-v2")
        .orderBy(FieldPath.documentId())
        .limit(450);
      if (cursor) recordsQuery = recordsQuery.startAfter(cursor);
      const snapshot = await recordsQuery.get();
      if (snapshot.empty) break;
      scanned += snapshot.size;
      const batch = database.batch();
      let writes = 0;
      for (const document of snapshot.docs) {
        const data = document.data();
        if (data.practiceDateTaipei && data.practiceStartedAt) continue;
        const serverCreatedAt = data.createdAt;
        if (typeof serverCreatedAt?.toDate === "function") {
          const startedAt = serverCreatedAt.toDate();
          batch.update(document.ref, {
            practiceStartedAt: serverCreatedAt,
            practiceDateTaipei: taipeiDate(startedAt),
            practiceDateStatus: "server_backfill",
          });
          updated += 1;
        } else {
          batch.update(document.ref, {
            practiceStartedAt: null,
            practiceDateTaipei: null,
            practiceDateStatus: "unconfirmed",
          });
          unconfirmed += 1;
        }
        writes += 1;
      }
      if (writes > 0) await batch.commit();
      cursor = snapshot.docs.at(-1);
      if (snapshot.size < 450) break;
    }

    logger.info("Practice date backfill finished", {
      scanned,
      updated,
      unconfirmed,
    });
    return { scanned, updated, unconfirmed };
  },
);

function passwordMatches(submitted, expected) {
  const submittedBytes = Buffer.from(submitted, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return (
    submittedBytes.length === expectedBytes.length &&
    timingSafeEqual(submittedBytes, expectedBytes)
  );
}

exports.activateTeacherAccess = onCall(
  {
    region: "asia-east1",
    secrets: [teacherPassword],
    enforceAppCheck: true,
  },
  async (request) => {
    if (
      !request.auth ||
      request.auth.token.firebase?.sign_in_provider !== "anonymous"
    ) {
      throw new HttpsError("unauthenticated", "無法建立安全登入工作階段。");
    }
    const submittedPassword = String(request.data?.password ?? "");
    if (!submittedPassword || submittedPassword.length > 128) {
      throw new HttpsError("invalid-argument", "密碼不正確，請稍後再試。");
    }
    const expectedPassword = teacherPassword.value();
    const matches = passwordMatches(submittedPassword, expectedPassword);
    const database = getFirestore();
    const limiterRef = database
      .collection("teacher-login-rate-v2")
      .doc(request.auth.uid);
    const nowMs = Date.now();
    const decision = await database.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(limiterRef);
      const data = snapshot.exists ? snapshot.data() : {};
      const currentLock = data.lockedUntil?.toMillis?.() ?? 0;
      if (currentLock > nowMs) {
        return { locked: true, accepted: false };
      }
      const storedWindow = data.windowStartedAt?.toMillis?.() ?? nowMs;
      const windowStartedAt =
        nowMs - storedWindow >= LOGIN_WINDOW_MS ? nowMs : storedWindow;
      const priorFailures =
        windowStartedAt === nowMs ? 0 : Number(data.failedCount ?? 0);

      if (matches) {
        transaction.delete(limiterRef);
        return { locked: false, accepted: true };
      }

      const failedCount = priorFailures + 1;
      const locked = failedCount >= MAX_LOGIN_FAILURES;
      transaction.set(limiterRef, {
        failedCount,
        windowStartedAt: Timestamp.fromMillis(windowStartedAt),
        lockedUntil: locked
          ? Timestamp.fromMillis(nowMs + LOGIN_LOCK_MS)
          : null,
        updatedAt: Timestamp.fromMillis(nowMs),
      });
      return { locked, accepted: false };
    });

    if (decision.locked) {
      throw new HttpsError(
        "resource-exhausted",
        "嘗試次數過多，請15分鐘後再試。",
      );
    }
    if (!decision.accepted) {
      throw new HttpsError("permission-denied", "密碼不正確，請稍後再試。");
    }

    const auth = getAuth();
    let teacherUser;
    try {
      teacherUser = await auth.getUser(TEACHER_UID);
    } catch (error) {
      if (error?.code !== "auth/user-not-found") throw error;
      teacherUser = await auth.createUser({
        uid: TEACHER_UID,
        displayName: "二水國小教師",
      });
    }
    if (teacherUser.customClaims?.teacher !== true) {
      await auth.setCustomUserClaims(TEACHER_UID, {
        ...(teacherUser.customClaims || {}),
        teacher: true,
      });
    }
    const customToken = await auth.createCustomToken(TEACHER_UID, {
      teacher: true,
    });
    logger.info("Teacher password login succeeded", {
      anonymousUid: request.auth.uid,
    });
    return { customToken };
  },
);

exports.cleanupExpiredTicketAttempts = onSchedule(
  {
    schedule: "15 3 * * *",
    timeZone: "Asia/Taipei",
    region: "asia-east1",
    memory: "256MiB",
    timeoutSeconds: 540,
    retryCount: 3,
  },
  async () => {
    const db = getFirestore();
    const bucket = getStorage().bucket();
    const snapshot = await db
      .collection("tickets-v2")
      .where("expiresAt", "<=", Timestamp.now())
      .limit(100)
      .get();

    let deleted = 0;
    let failed = 0;
    for (const attempt of snapshot.docs) {
      const data = attempt.data();
      try {
        const prefix = `tickets-v2/${data.uid}/${attempt.id}/`;
        const [files] = await bucket.getFiles({ prefix });
        await Promise.all(
          files.map((file) => file.delete({ ignoreNotFound: true })),
        );
        await db.recursiveDelete(attempt.ref);
        deleted += 1;
      } catch (error) {
        failed += 1;
        logger.error("Failed to delete expired ticket attempt", {
          attemptId: attempt.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info("Ticket retention cleanup finished", {
      scanned: snapshot.size,
      deleted,
      failed,
    });
  },
);
