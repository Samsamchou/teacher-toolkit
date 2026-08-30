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
  "hwclass-479d2";

if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId)) {
  console.error("Emulator project ID 格式無效。 / Invalid emulator project ID.");
  process.exit(1);
}

const encodeValue = (value) => {
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number" && Number.isInteger(value)) {
    return { integerValue: String(value) };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encodeValue) } };
  }
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
    classId: "五乙",
    subjectId: "english",
    assignedDate: "2026-08-31",
    period: 3,
    homeworkType: "textbook",
    content: "假資料：課本第 1 頁 / Demo: textbook page 1",
    createdAt: "2026-08-31T03:15:00.000Z",
  }),
  documentWrite("submissionEvents", "seed-submission-001", {
    id: "seed-submission-001",
    assignmentId: "seed-assignment-001",
    classId: "五乙",
    seatNumber: 1,
    outcome: "submitted",
    occurredOn: "2026-09-01",
    recordedAt: "2026-09-01T02:30:00.000Z",
  }),
  documentWrite("submissionEvents", "seed-submission-002", {
    id: "seed-submission-002",
    assignmentId: "seed-assignment-001",
    classId: "五乙",
    seatNumber: 2,
    outcome: "still-missing",
    reason: "unexcused",
    note: "假資料 / Demo only",
    occurredOn: "2026-09-01",
    recordedAt: "2026-09-01T02:30:00.000Z",
  }),
  documentWrite("classroomIncidents", "seed-incident-001", {
    id: "seed-incident-001",
    classId: "五乙",
    subjectId: "english",
    date: "2026-08-31",
    period: 3,
    category: "chatting",
    seatNumber: 2,
    note: "假資料 / Demo only",
    weight: 1,
    recordedAt: "2026-08-31T03:20:00.000Z",
  }),
  documentWrite("timetableExceptions", "seed-exception-001", {
    id: "seed-exception-001",
    date: "2026-09-07",
    type: "cancel",
    scheduleSlotId: "w1-p3-english-五乙",
    note: "假資料：停課 / Demo: cancelled lesson",
    createdAt: "2026-09-06T01:00:00.000Z",
  }),
  documentWrite("settings", "main", {
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
      // Firestore Emulator's local owner token bypasses Rules like Admin SDK.
      // This is never sent anywhere except the loopback host validated above.
      authorization: "Bearer owner",
    },
    body: JSON.stringify({ writes }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const message = (await response.text()).slice(0, 1000);
    throw new Error(`Emulator returned HTTP ${response.status}: ${message}`);
  }

  console.log(
    `Emulator seed completed: ${writes.length} documents; ` +
      `project=${projectId}; host=${emulatorUrl.origin}`,
  );
} catch (error) {
  console.error(
    "Emulator seed failed / Emulator 假資料寫入失敗:",
    error instanceof Error ? error.message : "unknown error",
  );
  process.exitCode = 1;
}
