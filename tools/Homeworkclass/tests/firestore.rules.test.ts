// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const PROJECT_ID = "homeworkclass-rules-test";
const TEACHER_UID = "homeworkclass-teacher";
const NOW = "2026-08-31T03:15:00.000Z";

let testEnvironment: RulesTestEnvironment;

const assignment = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  classId: "五乙",
  subjectId: "english",
  assignedDate: "2026-08-31",
  period: 3,
  homeworkType: "textbook",
  content: "課本第 1 頁",
  createdAt: NOW,
  ...overrides,
});

const submissionEvent = (
  id: string,
  assignmentId: string,
  overrides: Record<string, unknown> = {},
) => ({
  id,
  assignmentId,
  classId: "五乙",
  seatNumber: 1,
  outcome: "submitted",
  occurredOn: "2026-09-01",
  recordedAt: "2026-09-01T02:30:00.000Z",
  ...overrides,
});

const incident = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  classId: "五乙",
  subjectId: "english",
  date: "2026-08-31",
  period: 3,
  category: "chatting",
  seatNumber: 1,
  weight: 1,
  recordedAt: NOW,
  ...overrides,
});

const teacherDb = (): Firestore =>
  testEnvironment
    .authenticatedContext(TEACHER_UID, { role: "teacher" })
    .firestore();

beforeAll(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
});

afterAll(async () => {
  await testEnvironment.cleanup();
});

describe("single-teacher boundary / 單一教師權限邊界", () => {
  it("rejects unauthenticated reads and writes", async () => {
    const database = testEnvironment.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(database, "assignments", "missing")));
    await assertFails(
      setDoc(doc(database, "assignments", "unauthenticated"), assignment("unauthenticated")),
    );
  });

  it("requires both the fixed uid and teacher role", async () => {
    const wrongUid = testEnvironment
      .authenticatedContext("different-user", { role: "teacher" })
      .firestore();
    const wrongRole = testEnvironment
      .authenticatedContext(TEACHER_UID, { role: "viewer" })
      .firestore();

    await assertFails(
      setDoc(doc(wrongUid, "assignments", "wrong-uid"), assignment("wrong-uid")),
    );
    await assertFails(
      setDoc(doc(wrongRole, "assignments", "wrong-role"), assignment("wrong-role")),
    );
  });

  it("allows the fixed teacher identity to create and read valid data", async () => {
    const database = teacherDb();
    const reference = doc(database, "assignments", "valid-assignment");
    await assertSucceeds(setDoc(reference, assignment("valid-assignment")));
    const snapshot = await assertSucceeds(getDoc(reference));
    expect(snapshot.data()?.classId).toBe("五乙");
  });
});

describe("assignment schema / 作業欄位", () => {
  it("rejects wrong document ids, unknown fields, and invalid homework types", async () => {
    const database = teacherDb();
    await assertFails(
      setDoc(doc(database, "assignments", "path-id"), assignment("different-id")),
    );
    await assertFails(
      setDoc(
        doc(database, "assignments", "extra-field"),
        assignment("extra-field", { studentName: "不得儲存姓名" }),
      ),
    );
    await assertFails(
      setDoc(
        doc(database, "assignments", "bad-type"),
        assignment("bad-type", { homeworkType: "video" }),
      ),
    );
  });

  it("keeps assignment records append-only", async () => {
    const database = teacherDb();
    const reference = doc(database, "assignments", "append-only-assignment");
    await assertSucceeds(setDoc(reference, assignment("append-only-assignment")));
    await assertFails(updateDoc(reference, { content: "覆寫內容" }));
    await assertFails(deleteDoc(reference));
  });
});

describe("submission event validation / 繳交事件驗證", () => {
  it("validates seat numbers, outcomes, reasons, and assignment class", async () => {
    const database = teacherDb();
    await assertSucceeds(
      setDoc(
        doc(database, "assignments", "four-a-homework"),
        assignment("four-a-homework", { classId: "四甲" }),
      ),
    );

    await assertSucceeds(
      setDoc(
        doc(database, "submissionEvents", "valid-seat"),
        submissionEvent("valid-seat", "four-a-homework", {
          classId: "四甲",
          seatNumber: 4,
          outcome: "still-missing",
          reason: "excused-absence",
        }),
      ),
    );
    await assertFails(
      setDoc(
        doc(database, "submissionEvents", "excluded-seat"),
        submissionEvent("excluded-seat", "four-a-homework", {
          classId: "四甲",
          seatNumber: 3,
        }),
      ),
    );
    await assertFails(
      setDoc(
        doc(database, "submissionEvents", "bad-outcome"),
        submissionEvent("bad-outcome", "four-a-homework", {
          classId: "四甲",
          seatNumber: 4,
          outcome: "lost",
        }),
      ),
    );
    await assertFails(
      setDoc(
        doc(database, "submissionEvents", "missing-reason"),
        submissionEvent("missing-reason", "four-a-homework", {
          classId: "四甲",
          seatNumber: 4,
          outcome: "still-missing",
        }),
      ),
    );
    await assertFails(
      setDoc(
        doc(database, "submissionEvents", "wrong-class"),
        submissionEvent("wrong-class", "four-a-homework", {
          classId: "五乙",
          seatNumber: 1,
        }),
      ),
    );
  });

  it("keeps submission history append-only", async () => {
    const database = teacherDb();
    await assertSucceeds(
      setDoc(doc(database, "assignments", "event-parent"), assignment("event-parent")),
    );
    const reference = doc(database, "submissionEvents", "append-only-event");
    await assertSucceeds(
      setDoc(reference, submissionEvent("append-only-event", "event-parent")),
    );
    await assertFails(updateDoc(reference, { outcome: "later-submitted" }));
    await assertFails(deleteDoc(reference));
  });
});

describe("classroom incident validation / 課堂事件驗證", () => {
  it("accepts valid seat or text and rejects invalid categories or seats", async () => {
    const database = teacherDb();
    await assertSucceeds(
      setDoc(doc(database, "classroomIncidents", "valid-incident"), incident("valid-incident")),
    );
    const textOnly = incident("text-only", { note: "全班提醒攜帶課本" });
    delete (textOnly as { seatNumber?: unknown }).seatNumber;
    await assertSucceeds(
      setDoc(
        doc(database, "classroomIncidents", "text-only"),
        textOnly,
      ),
    );
    await assertFails(
      setDoc(
        doc(database, "classroomIncidents", "bad-category"),
        incident("bad-category", { category: "sleeping" }),
      ),
    );
    await assertFails(
      setDoc(
        doc(database, "classroomIncidents", "excluded-seat"),
        incident("excluded-seat", { classId: "三甲", seatNumber: 8 }),
      ),
    );
    const noSubject = incident("no-seat-or-note");
    delete (noSubject as { seatNumber?: unknown }).seatNumber;
    await assertFails(
      setDoc(doc(database, "classroomIncidents", "no-seat-or-note"), noSubject),
    );
  });
});

describe("timetable exception validation / 課表異動驗證", () => {
  it("allows bounded cancel/add/holiday/revocation records and rejects malformed data", async () => {
    const database = teacherDb();
    await assertSucceeds(
      setDoc(doc(database, "timetableExceptions", "cancel-slot"), {
        id: "cancel-slot",
        date: "2026-09-07",
        type: "cancel",
        scheduleSlotId: "w1-p3-english-五乙",
        createdAt: NOW,
      }),
    );
    await assertSucceeds(
      setDoc(doc(database, "timetableExceptions", "add-slot"), {
        id: "add-slot",
        date: "2026-09-12",
        type: "add",
        replacement: {
          id: "makeup-p3",
          period: 3,
          startTime: "10:30",
          endTime: "11:10",
          classId: "五乙",
          subjectId: "international-song",
        },
        createdAt: NOW,
      }),
    );
    await assertSucceeds(
      setDoc(doc(database, "timetableExceptions", "holiday-2026-09-10"), {
        id: "holiday-2026-09-10",
        date: "2026-09-10",
        type: "holiday",
        holidayName: "教師節補假",
        note: "依學校行事曆",
        createdAt: NOW,
      }),
    );
    await assertSucceeds(
      setDoc(doc(database, "timetableExceptions", "revoke-holiday-2026-09-10"), {
        id: "revoke-holiday-2026-09-10",
        date: "2026-09-10",
        type: "holiday-revoke",
        targetHolidayId: "holiday-2026-09-10",
        note: "日期登記錯誤",
        createdAt: NOW,
      }),
    );
    await assertFails(
      setDoc(doc(database, "timetableExceptions", "bad-add"), {
        id: "bad-add",
        date: "2026-09-12",
        type: "add",
        replacement: {
          id: "bad-seat-data",
          period: 9,
          startTime: "10:30",
          endTime: "11:10",
          classId: "五乙",
          subjectId: "unknown-subject",
        },
        createdAt: NOW,
      }),
    );
    await assertFails(
      setDoc(doc(database, "timetableExceptions", "holiday-without-name"), {
        id: "holiday-without-name",
        date: "2026-09-11",
        type: "holiday",
        createdAt: NOW,
      }),
    );
    await assertFails(
      setDoc(doc(database, "timetableExceptions", "bad-revoke-date"), {
        id: "bad-revoke-date",
        date: "2026-09-11",
        type: "holiday-revoke",
        targetHolidayId: "holiday-2026-09-10",
        note: "日期不一致",
        createdAt: NOW,
      }),
    );
    await assertFails(
      setDoc(doc(database, "timetableExceptions", "bad-revoke-target"), {
        id: "bad-revoke-target",
        date: "2026-09-10",
        type: "holiday-revoke",
        targetHolidayId: "missing-holiday",
        note: "目標不存在",
        createdAt: NOW,
      }),
    );
  });

  it("keeps holiday and revocation records append-only", async () => {
    const database = teacherDb();
    const reference = doc(database, "timetableExceptions", "append-only-holiday");
    await assertSucceeds(
      setDoc(reference, {
        id: "append-only-holiday",
        date: "2026-10-09",
        type: "holiday",
        holidayName: "國慶日調整放假",
        createdAt: NOW,
      }),
    );
    await assertFails(updateDoc(reference, { holidayName: "改名" }));
    await assertFails(deleteDoc(reference));
  });
});

describe("settings and hidden collections / 設定與隱藏集合", () => {
  it("allows only the validated main settings document", async () => {
    const database = teacherDb();
    const reference = doc(database, "settings", "main");
    const validSettings = {
      attentionWeights: {
        late: 1,
        chatting: 1,
        disorder: 2,
        "missing-materials": 1,
        threshold: 4,
      },
    };
    await assertSucceeds(setDoc(reference, validSettings));
    await assertSucceeds(
      updateDoc(reference, { "attentionWeights.threshold": 5 }),
    );
    await assertFails(
      setDoc(doc(database, "settings", "other"), validSettings),
    );
    await assertFails(
      setDoc(reference, {
        attentionWeights: { ...validSettings.attentionWeights, threshold: 0 },
      }),
    );
  });

  it("never exposes the rate-limit collection to browser clients", async () => {
    const database = teacherDb();
    await assertFails(
      getDoc(doc(database, "_securityRateLimits", "salted-ip-hash")),
    );
    await assertFails(
      setDoc(doc(database, "_securityRateLimits", "salted-ip-hash"), {
        failedAttempts: 1,
      }),
    );
  });
});
