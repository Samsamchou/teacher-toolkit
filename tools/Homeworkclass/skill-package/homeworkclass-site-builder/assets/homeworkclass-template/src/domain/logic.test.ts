import { addDays, parseISO } from "date-fns";
import { describe, expect, it } from "vitest";
import { CLASSES, SEMESTER, WEEKLY_SCHEDULE } from "../data/semester";
import type { Assignment, SubmissionEvent, TimetableException } from "../types";
import {
  assignmentsForClassWindow,
  dateKey,
  recentActualClassDates,
  scheduleForDate,
  weekDates,
  weekStartKey,
} from "./logic";

const slot = WEEKLY_SCHEDULE[0];
const weekStart = weekStartKey(SEMESTER.startDate);
let lessonDate = dateKey(addDays(parseISO(weekStart), slot.weekday - 1));
if (lessonDate < SEMESTER.startDate) lessonDate = dateKey(addDays(parseISO(lessonDate), 7));
const timestamp = `${lessonDate}T01:00:00.000Z`;

describe("資料驅動課表邏輯", () => {
  it("依目前 fixture 的工作日與 periodId 顯示課表", () => {
    expect(weekDates(weekStart)).toEqual(
      SEMESTER.workingDays.map((day) => dateKey(addDays(parseISO(weekStart), day - 1))),
    );
    expect(scheduleForDate(lessonDate, [])).toContainEqual(
      expect.objectContaining({ id: slot.id, periodId: slot.periodId }),
    );
  });

  it("停課與假日只處理目前 semesterId", () => {
    const cancel: TimetableException = {
      id: "cancel-fixture",
      semesterId: SEMESTER.id,
      date: lessonDate,
      type: "cancel",
      scheduleSlotId: slot.id,
      createdAt: timestamp,
    };
    expect(scheduleForDate(lessonDate, [cancel]).some((item) => item.id === slot.id)).toBe(false);
    const holiday: TimetableException = {
      id: "holiday-fixture",
      semesterId: SEMESTER.id,
      date: lessonDate,
      type: "holiday",
      holidayName: "synthetic holiday",
      createdAt: timestamp,
    };
    expect(scheduleForDate(lessonDate, [holiday])).toEqual([]);
  });

  it("未結案作業跨週仍保留，最近上課日均可回查班級", () => {
    const assignment: Assignment = {
      id: "assignment-fixture",
      semesterId: SEMESTER.id,
      classId: slot.classId,
      subjectId: slot.subjectId,
      assignedDate: lessonDate,
      periodId: slot.periodId,
      period: slot.period,
      homeworkType: "textbook",
      content: "synthetic fixture homework",
      createdAt: timestamp,
    };
    const missing: SubmissionEvent = {
      id: "missing-fixture",
      semesterId: SEMESTER.id,
      assignmentId: assignment.id,
      classId: slot.classId,
      seatNumber: CLASSES[slot.classId].seats[0],
      outcome: "still-missing",
      reason: "unexcused",
      occurredOn: lessonDate,
      recordedAt: timestamp,
    };
    const window = assignmentsForClassWindow(
      slot.classId,
      SEMESTER.endDate,
      [assignment],
      [missing],
      [],
    );
    expect([...window.recent, ...window.olderOutstanding]).toContainEqual(assignment);
    recentActualClassDates(slot.classId, SEMESTER.endDate, []).forEach((date) => {
      expect(scheduleForDate(date, []).some((item) => item.classId === slot.classId)).toBe(true);
    });
  });
});
