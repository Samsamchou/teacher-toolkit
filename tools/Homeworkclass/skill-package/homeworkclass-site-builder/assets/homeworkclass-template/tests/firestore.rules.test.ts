import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import semesterInput from "../src/data/semester.json";
import { renderRulesTemplate } from "../scripts/render-firestore-rules.mjs";

const projectId = "demo-homeworkclass-template";
const semesterId = semesterInput.semester.id;
const slot = semesterInput.schedule[0];
const classMeta = semesterInput.classes.find((item) => item.id === slot.classId)!;
const periodMeta = semesterInput.periods.find((item) => item.id === slot.periodId)!;
const validSeat = classMeta.seats[0];
const invalidSeat = Math.max(...classMeta.seats) + 1000;
const invalidClassId = `${slot.classId}-not-configured`;
const otherSemesterId = `${semesterId}-archived`;
const assignedDate = semesterInput.semester.startDate;
const timestamp = (time: string) => `${assignedDate}T${time}.000Z`;

const assignment = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  semesterId,
  classId: slot.classId,
  subjectId: slot.subjectId,
  assignedDate,
  periodId: slot.periodId,
  period: periodMeta.displayOrder,
  homeworkType: "textbook",
  content: "synthetic fixture homework",
  createdAt: timestamp("01:00:00"),
  ...overrides,
});

const incident = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  semesterId,
  classId: slot.classId,
  subjectId: slot.subjectId,
  date: assignedDate,
  periodId: slot.periodId,
  period: periodMeta.displayOrder,
  category: "late",
  seatNumber: validSeat,
  weight: 1,
  recordedAt: timestamp("02:00:00"),
  ...overrides,
});

describe("generated Firestore Rules", () => {
  let environment: RulesTestEnvironment;

  beforeAll(async () => {
    let rules: string;
    try {
      const template = await readFile(resolve("firestore.rules.template"), "utf8");
      rules = renderRulesTemplate(template, semesterInput);
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
        throw error;
      }
      rules = await readFile(resolve("firestore.rules"), "utf8");
    }
    environment = await initializeTestEnvironment({
      projectId,
      firestore: { rules },
    });
  });

  afterEach(async () => {
    await environment.clearFirestore();
  });

  afterAll(async () => {
    if (environment) await environment.cleanup();
  });

  const teacherDb = () =>
    environment.authenticatedContext("homeworkclass-teacher", { role: "teacher" }).firestore();

  it("拒絕未登入及錯誤角色", async () => {
    const guest = environment.unauthenticatedContext().firestore();
    const wrongRole = environment
      .authenticatedContext("homeworkclass-teacher", { role: "viewer" })
      .firestore();
    await assertFails(setDoc(doc(guest, "assignments", "guest"), assignment("guest")));
    await assertFails(setDoc(doc(wrongRole, "assignments", "viewer"), assignment("viewer")));
  });

  it("只接受 fixture 目前學期的班級、科目與 periodId", async () => {
    const database = teacherDb();
    await assertSucceeds(
      setDoc(doc(database, "assignments", "valid-assignment"), assignment("valid-assignment")),
    );
    await assertFails(
      setDoc(
        doc(database, "assignments", "invalid-class"),
        assignment("invalid-class", { classId: invalidClassId }),
      ),
    );
    await assertFails(
      setDoc(
        doc(database, "assignments", "wrong-semester"),
        assignment("wrong-semester", { semesterId: otherSemesterId }),
      ),
    );
    await assertFails(
      setDoc(
        doc(database, "assignments", "invalid-period"),
        assignment("invalid-period", { periodId: `${slot.periodId}-unknown` }),
      ),
    );
  });

  it("繳交事件須使用同學期 parent、同班與有效座號", async () => {
    const database = teacherDb();
    await assertSucceeds(
      setDoc(doc(database, "assignments", "parent"), assignment("parent")),
    );
    const submission = (id: string, overrides: Record<string, unknown> = {}) => ({
      id,
      semesterId,
      assignmentId: "parent",
      classId: slot.classId,
      seatNumber: validSeat,
      outcome: "still-missing",
      reason: "unexcused",
      occurredOn: assignedDate,
      recordedAt: timestamp("03:00:00"),
      ...overrides,
    });
    await assertSucceeds(
      setDoc(doc(database, "submissionEvents", "valid-seat"), submission("valid-seat")),
    );
    await assertFails(
      setDoc(
        doc(database, "submissionEvents", "invalid-seat"),
        submission("invalid-seat", { seatNumber: invalidSeat }),
      ),
    );
    await assertFails(
      setDoc(
        doc(database, "submissionEvents", "wrong-event-semester"),
        submission("wrong-event-semester", { semesterId: otherSemesterId }),
      ),
    );
  });

  it("課堂事件保留 semesterId 與 periodId 並維持 append-only", async () => {
    const database = teacherDb();
    const reference = doc(database, "classroomIncidents", "incident");
    await assertSucceeds(setDoc(reference, incident("incident")));
    await assertFails(updateDoc(reference, { note: "overwrite" }));
    await assertFails(deleteDoc(reference));
    await assertFails(
      setDoc(
        doc(database, "classroomIncidents", "invalid-seat"),
        incident("invalid-seat", { seatNumber: invalidSeat }),
      ),
    );
  });

  it("課表異動與假日撤銷必須同一學期", async () => {
    const database = teacherDb();
    await assertSucceeds(
      setDoc(doc(database, "timetableExceptions", "add"), {
        id: "add",
        semesterId,
        date: assignedDate,
        type: "add",
        replacement: {
          id: "replacement",
          periodId: slot.periodId,
          period: periodMeta.displayOrder,
          startTime: periodMeta.startTime,
          endTime: periodMeta.endTime,
          classId: slot.classId,
          subjectId: slot.subjectId,
        },
        createdAt: timestamp("04:00:00"),
      }),
    );
    await assertSucceeds(
      setDoc(doc(database, "timetableExceptions", "holiday"), {
        id: "holiday",
        semesterId,
        date: assignedDate,
        type: "holiday",
        holidayName: "synthetic holiday",
        createdAt: timestamp("05:00:00"),
      }),
    );
    await assertSucceeds(
      setDoc(doc(database, "timetableExceptions", "revoke"), {
        id: "revoke",
        semesterId,
        date: assignedDate,
        type: "holiday-revoke",
        targetHolidayId: "holiday",
        note: "synthetic correction",
        createdAt: timestamp("06:00:00"),
      }),
    );
  });

  it("目前學期設定可更新，其他文件維持拒絕", async () => {
    const database = teacherDb();
    await assertSucceeds(
      setDoc(doc(database, "settings", semesterId), {
        semesterId,
        attentionWeights: {
          late: 1,
          chatting: 1,
          disorder: 2,
          "missing-materials": 1,
          threshold: 4,
        },
      }),
    );
    await assertSucceeds(getDoc(doc(database, "settings", semesterId)));
    await assertFails(setDoc(doc(database, "unexpected", "document"), { semesterId }));
  });
});
