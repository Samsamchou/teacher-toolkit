import { describe, expect, it } from "vitest";
import {
  activeHolidayForDate,
  assignmentsForClassWindow,
  attentionScores,
  DEFAULT_ATTENTION_WEIGHTS,
  holidayConflictsForDate,
  latestSubmissionBySeatAsOf,
  outstandingForAssignment,
  recentActualClassDates,
  scheduleForDate,
} from "./logic";
import type {
  Assignment,
  ClassroomIncident,
  SubmissionEvent,
  TimetableException,
} from "../types";

const assignment = (id: string, assignedDate: string): Assignment => ({
  id,
  classId: "六甲",
  subjectId: "english",
  assignedDate,
  period: 4,
  homeworkType: "workbook",
  content: "p. 12",
  createdAt: `${assignedDate}T08:00:00+08:00`,
});

const submission = (
  id: string,
  assignmentId: string,
  outcome: SubmissionEvent["outcome"],
  recordedAt: string,
): SubmissionEvent => ({
  id,
  assignmentId,
  classId: "六甲",
  seatNumber: 3,
  outcome,
  occurredOn: recordedAt.slice(0, 10),
  recordedAt,
});

describe("作業日期與待補交邏輯", () => {
  it("前五個實際上課日可以跨週並略過停課", () => {
    const exceptions: TimetableException[] = [
      {
        id: "cancel-1",
        date: "2026-09-10",
        type: "cancel",
        scheduleSlotId: "w4-p7-international-song-六甲",
        createdAt: "2026-09-09T08:00:00+08:00",
      },
    ];
    expect(recentActualClassDates("六甲", "2026-09-14", exceptions)).toEqual([
      "2026-09-11",
      "2026-09-08",
      "2026-09-04",
      "2026-09-03",
      "2026-09-01",
    ]);
  });

  it("週六補課仍會算成實際上課日", () => {
    const exceptions: TimetableException[] = [
      {
        id: "makeup-1",
        date: "2026-09-12",
        type: "add",
        replacement: {
          id: "makeup-six-a",
          period: 2,
          startTime: "09:25",
          endTime: "10:05",
          classId: "六甲",
          subjectId: "english",
        },
        createdAt: "2026-09-08T08:00:00+08:00",
      },
    ];
    expect(scheduleForDate("2026-09-12", exceptions)).toMatchObject([
      { classId: "六甲", weekday: 6, period: 2 },
    ]);
    expect(recentActualClassDates("六甲", "2026-09-14", exceptions)).toEqual([
      "2026-09-12",
      "2026-09-11",
      "2026-09-10",
      "2026-09-08",
      "2026-09-04",
    ]);
  });

  it("國定假日會蓋過同日固定課與補課，並從實際上課日略過", () => {
    const exceptions: TimetableException[] = [
      {
        id: "makeup-on-holiday",
        date: "2026-09-10",
        type: "add",
        replacement: {
          id: "makeup-six-a-on-holiday",
          period: 1,
          startTime: "08:35",
          endTime: "09:15",
          classId: "六甲",
          subjectId: "english",
        },
        createdAt: "2026-09-01T01:00:00.000Z",
      },
      {
        id: "holiday-2026-09-10",
        date: "2026-09-10",
        type: "holiday",
        holidayName: "教師節補假",
        createdAt: "2026-09-02T01:00:00.000Z",
      },
    ];

    expect(activeHolidayForDate("2026-09-10", exceptions)?.holidayName).toBe(
      "教師節補假",
    );
    expect(scheduleForDate("2026-09-10", exceptions)).toEqual([]);
    expect(recentActualClassDates("六甲", "2026-09-14", exceptions)).toEqual([
      "2026-09-11",
      "2026-09-08",
      "2026-09-04",
      "2026-09-03",
      "2026-09-01",
    ]);
  });

  it("撤銷國定假日後會恢復原固定課與既有補課", () => {
    const exceptions: TimetableException[] = [
      {
        id: "makeup-saturday",
        date: "2026-09-12",
        type: "add",
        replacement: {
          id: "makeup-saturday-slot",
          period: 2,
          startTime: "09:25",
          endTime: "10:05",
          classId: "六甲",
          subjectId: "english",
        },
        createdAt: "2026-09-01T01:00:00.000Z",
      },
      {
        id: "holiday-saturday",
        date: "2026-09-12",
        type: "holiday",
        holidayName: "中秋節補假",
        createdAt: "2026-09-02T01:00:00.000Z",
      },
      {
        id: "revoke-holiday-saturday",
        date: "2026-09-12",
        type: "holiday-revoke",
        targetHolidayId: "holiday-saturday",
        note: "日期登記錯誤",
        createdAt: "2026-09-03T01:00:00.000Z",
      },
    ];

    expect(activeHolidayForDate("2026-09-12", exceptions)).toBeUndefined();
    expect(scheduleForDate("2026-09-12", exceptions)).toMatchObject([
      { id: "makeup-saturday-slot", classId: "六甲", weekday: 6, period: 2 },
    ]);
  });

  it("假日衝突只計算既有作業、課堂事件與補課異動", () => {
    const work = assignment("holiday-assignment", "2026-09-10");
    const incident: ClassroomIncident = {
      id: "holiday-incident",
      classId: "六甲",
      subjectId: "english",
      date: "2026-09-10",
      period: 4,
      category: "chatting",
      seatNumber: 3,
      weight: 1,
      recordedAt: "2026-09-10T01:00:00.000Z",
    };
    const add: TimetableException = {
      id: "holiday-conflict-add",
      date: "2026-09-10",
      type: "add",
      replacement: {
        id: "holiday-conflict-slot",
        period: 1,
        startTime: "08:35",
        endTime: "09:15",
        classId: "六甲",
        subjectId: "english",
      },
      createdAt: "2026-09-01T01:00:00.000Z",
    };

    expect(
      holidayConflictsForDate("2026-09-10", {
        schemaVersion: 1,
        assignments: [work],
        submissionEvents: [],
        classroomIncidents: [incident],
        timetableExceptions: [add],
        attentionWeights: { ...DEFAULT_ATTENTION_WEIGHTS },
      }),
    ).toEqual({
      assignments: 1,
      classroomIncidents: 1,
      addedLessons: 1,
      total: 3,
    });
  });

  it("不會在學期有效日期之外產生固定課程", () => {
    expect(scheduleForDate("2026-08-28", [])).toEqual([]);
    expect(scheduleForDate("2027-01-21", [])).toEqual([]);
  });

  it("較舊的未補交作業不消失，補交事件加入後才移除", () => {
    const old = assignment("old", "2026-09-01");
    const recent = assignment("recent", "2026-09-11");
    const missing = submission(
      "missing",
      old.id,
      "still-missing",
      "2026-09-01T16:00:00+08:00",
    );
    const firstWindow = assignmentsForClassWindow(
      "六甲",
      "2026-09-18",
      [old, recent],
      [missing],
      [],
    );
    expect(firstWindow.recent.map((item) => item.id)).toContain("recent");
    expect(firstWindow.olderOutstanding.map((item) => item.id)).toContain("old");
    expect(outstandingForAssignment(old, [missing])).toContain(3);

    const submitted = submission(
      "submitted",
      old.id,
      "later-submitted",
      "2026-09-19T09:00:00+08:00",
    );
    expect(
      assignmentsForClassWindow(
        "六甲",
        "2026-09-21",
        [old, recent],
        [missing, submitted],
        [],
      ).olderOutstanding,
    ).toEqual([]);
    expect(outstandingForAssignment(old, [missing, submitted])).not.toContain(3);
  });

  it("截止日未交紀錄不會被日後補交事件抹除", () => {
    const work = assignment("historical", "2026-08-31");
    const missing = submission(
      "missing",
      work.id,
      "still-missing",
      "2026-08-31T16:00:00+08:00",
    );
    const submitted = submission(
      "submitted",
      work.id,
      "later-submitted",
      "2026-09-01T09:00:00+08:00",
    );

    expect(
      latestSubmissionBySeatAsOf(work.id, [missing, submitted], "2026-08-31")
        .get(3)?.outcome,
    ).toBe("still-missing");
    expect(outstandingForAssignment(work, [missing, submitted])).not.toContain(3);
  });
});

describe("課堂需關注門檻", () => {
  it("依第 3 版權重加總，達 4 分才標示需關注", () => {
    const incidents: ClassroomIncident[] = [
      ["disorder", 2, "2026-09-07"],
      ["chatting", 1, "2026-09-08"],
      ["late", 1, "2026-09-11"],
    ].map(([category, weight, date], index) => ({
      id: `incident-${index}`,
      classId: "六甲",
      subjectId: "english",
      date: String(date),
      period: 4,
      category: category as ClassroomIncident["category"],
      seatNumber: 3,
      weight: Number(weight),
      recordedAt: `${date}T10:00:00+08:00`,
    }));
    expect(
      attentionScores(incidents, "2026-09-07", {
        ...DEFAULT_ATTENTION_WEIGHTS,
      }),
    ).toEqual([
      { classId: "六甲", seatNumber: 3, score: 4, needsAttention: true },
    ]);
  });
});
