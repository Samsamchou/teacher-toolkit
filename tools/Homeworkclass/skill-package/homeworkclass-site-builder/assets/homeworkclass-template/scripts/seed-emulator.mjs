import { readFile } from "node:fs/promises";

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

if (!emulatorHost) {
  console.error(
    "拒絕執行：未設定 FIRESTORE_EMULATOR_HOST；本工具絕不連線正式 Firestore。\n" +
      "Refusing to run: FIRESTORE_EMULATOR_HOST is missing; this tool never writes to production.",
  );
  process.exit(1);
}

let emulatorUrl;
try {
  emulatorUrl = new URL(`http://${emulatorHost}`);
} catch {
  console.error("FIRESTORE_EMULATOR_HOST 格式無效。 / Invalid emulator host.");
  process.exit(1);
}

const allowedLoopbackHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);
if (
  emulatorUrl.protocol !== "http:" ||
  !allowedLoopbackHosts.has(emulatorUrl.hostname) ||
  !emulatorUrl.port ||
  emulatorUrl.username ||
  emulatorUrl.password
) {
  console.error(
    "拒絕執行：Emulator 必須是有明確連接埠的本機 loopback 位址。\n" +
      "Refusing to run: the emulator must use a local loopback address with an explicit port.",
  );
  process.exit(1);
}

const projectId =
  process.env.GCLOUD_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  "demo-homeworkclass-template";

if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId)) {
  console.error("Emulator project ID 格式無效。 / Invalid emulator project ID.");
  process.exit(1);
}

const semesterInput = JSON.parse(
  await readFile(new URL("../src/data/semester.json", import.meta.url), "utf8"),
);
if (semesterInput.contractVersion !== "homeworkclass-input-v1") {
  throw new Error("semester.json contractVersion 不相容");
}

const slot = semesterInput.schedule[0];
if (!slot) throw new Error("semester.json 至少需要一筆固定課程");
const classMeta = semesterInput.classes.find((item) => item.id === slot.classId);
const periodMeta = semesterInput.periods.find((item) => item.id === slot.periodId);
if (!classMeta || !periodMeta || !classMeta.seats.length) {
  throw new Error("semester.json 至少需要一筆完整課程及一個有效座號");
}

const semesterId = semesterInput.semester.id;
const date = semesterInput.semester.startDate;
const firstSeat = classMeta.seats[0];
const secondSeat = classMeta.seats[1] ?? firstSeat;
const timestamp = (time) => `${date}T${time}.000Z`;

const encodeValue = (value) => {
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number" && Number.isInteger(value)) {
    return { integerValue: String(value) };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (value && typeof value === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([key, nested]) => [key, encodeValue(nested)]),
        ),
      },
    };
  }
  throw new TypeError("Unsupported seed value");
};

const documentWrite = (collectionName, documentId, data) => ({
  update: {
    name:
      `projects/${projectId}/databases/(default)/documents/` +
      `${collectionName}/${documentId}`,
    fields: Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, encodeValue(value)]),
    ),
  },
});

const writes = [
  documentWrite("assignments", "seed-assignment-001", {
    id: "seed-assignment-001",
    semesterId,
    classId: slot.classId,
    subjectId: slot.subjectId,
    assignedDate: date,
    periodId: slot.periodId,
    period: periodMeta.displayOrder,
    homeworkType: "textbook",
    content: "synthetic fixture homework",
    createdAt: timestamp("01:00:00"),
  }),
  documentWrite("submissionEvents", "seed-submission-001", {
    id: "seed-submission-001",
    semesterId,
    assignmentId: "seed-assignment-001",
    classId: slot.classId,
    seatNumber: firstSeat,
    outcome: "submitted",
    occurredOn: date,
    recordedAt: timestamp("02:00:00"),
  }),
  documentWrite("submissionEvents", "seed-submission-002", {
    id: "seed-submission-002",
    semesterId,
    assignmentId: "seed-assignment-001",
    classId: slot.classId,
    seatNumber: secondSeat,
    outcome: "still-missing",
    reason: "unexcused",
    note: "synthetic fixture only",
    occurredOn: date,
    recordedAt: timestamp("02:01:00"),
  }),
  documentWrite("classroomIncidents", "seed-incident-001", {
    id: "seed-incident-001",
    semesterId,
    classId: slot.classId,
    subjectId: slot.subjectId,
    date,
    periodId: slot.periodId,
    period: periodMeta.displayOrder,
    category: "chatting",
    seatNumber: secondSeat,
    note: "synthetic fixture only",
    weight: 1,
    recordedAt: timestamp("03:00:00"),
  }),
  documentWrite("timetableExceptions", "seed-exception-001", {
    id: "seed-exception-001",
    semesterId,
    date,
    type: "cancel",
    scheduleSlotId: slot.id,
    note: "synthetic fixture cancellation",
    createdAt: timestamp("04:00:00"),
  }),
  documentWrite("settings", semesterId, {
    semesterId,
    attentionWeights: {
      late: 1,
      chatting: 1,
      disorder: 2,
      "missing-materials": 1,
      threshold: 4,
    },
  }),
];

const endpoint =
  `${emulatorUrl.origin}/v1/projects/${encodeURIComponent(projectId)}` +
  "/databases/(default)/documents:commit";

try {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer owner",
    },
    body: JSON.stringify({ writes }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Emulator returned HTTP ${response.status}: ${(await response.text()).slice(0, 1000)}`);
  }
  console.log(
    `Emulator seed completed: ${writes.length} documents; semester=${semesterId}; ` +
      `project=${projectId}; host=${emulatorUrl.origin}`,
  );
} catch (error) {
  console.error(
    "Emulator seed failed / Emulator 假資料寫入失敗:",
    error instanceof Error ? error.message : "unknown error",
  );
  process.exitCode = 1;
}
