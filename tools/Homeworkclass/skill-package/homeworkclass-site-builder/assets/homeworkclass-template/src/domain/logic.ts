import {
  addDays,
  eachDayOfInterval,
  format,
  getISODay,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfISOWeek,
} from "date-fns";
import { CLASSES, SEMESTER, WEEKLY_SCHEDULE } from "../data/semester";
import type {
  AppSnapshot,
  Assignment,
  ClassId,
  ClassroomIncident,
  IncidentCategory,
  SubmissionEvent,
  SubmissionOutcome,
  TimetableException,
} from "../types";

export const DEFAULT_ATTENTION_WEIGHTS = {
  late: 1,
  chatting: 1,
  disorder: 2,
  "missing-materials": 1,
  threshold: 4,
} as const;

export const EMPTY_SNAPSHOT: AppSnapshot = {
  schemaVersion: 2,
  semesterId: SEMESTER.id,
  assignments: [],
  submissionEvents: [],
  classroomIncidents: [],
  timetableExceptions: [],
  attentionWeights: { ...DEFAULT_ATTENTION_WEIGHTS },
};

export const dateKey = (value: Date | string) =>
  format(typeof value === "string" ? parseISO(value) : value, "yyyy-MM-dd");

export const weekStartKey = (value: Date | string) =>
  dateKey(startOfISOWeek(typeof value === "string" ? parseISO(value) : value));

export const weekDates = (weekStart: string) =>
  SEMESTER.workingDays.map((weekday) =>
    dateKey(addDays(parseISO(weekStart), weekday - 1)),
  );

export const revocationForHoliday = (
  holidayId: string,
  exceptions: TimetableException[],
) =>
  exceptions
    .filter(
      (item) =>
        item.semesterId === SEMESTER.id &&
        item.type === "holiday-revoke" &&
        item.targetHolidayId === holidayId,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

export const activeHolidayForDate = (
  date: string,
  exceptions: TimetableException[],
) => {
  const holidays = exceptions
    .filter(
      (item) =>
        item.semesterId === SEMESTER.id &&
        item.type === "holiday" &&
        item.date === date &&
        !revocationForHoliday(item.id, exceptions),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return holidays[0];
};

export const holidayConflictsForDate = (
  date: string,
  snapshot: AppSnapshot,
) => {
  const assignments = snapshot.assignments.filter(
    (item) => item.semesterId === SEMESTER.id && item.assignedDate === date,
  ).length;
  const classroomIncidents = snapshot.classroomIncidents.filter(
    (item) => item.semesterId === SEMESTER.id && item.date === date,
  ).length;
  const addedLessons = snapshot.timetableExceptions.filter(
    (item) =>
      item.semesterId === SEMESTER.id && item.type === "add" && item.date === date,
  ).length;
  return {
    assignments,
    classroomIncidents,
    addedLessons,
    total: assignments + classroomIncidents + addedLessons,
  };
};

const isCancelled = (
  date: string,
  slotId: string,
  exceptions: TimetableException[],
) =>
  exceptions.some(
    (item) =>
      item.semesterId === SEMESTER.id &&
      item.type === "cancel" &&
      item.date === date &&
      item.scheduleSlotId === slotId,
  );

export const scheduleForDate = (
  date: string,
  exceptions: TimetableException[],
) => {
  if (date < SEMESTER.startDate || date > SEMESTER.endDate) return [];
  if (activeHolidayForDate(date, exceptions)) return [];
  const day = parseISO(date);
  const isoDay = getISODay(day);
  const scheduled = WEEKLY_SCHEDULE.filter(
    (slot) =>
      slot.weekday === isoDay && !isCancelled(date, slot.id, exceptions),
  ).map((slot) => ({ ...slot, date }));
  const added = exceptions
    .filter(
      (item) =>
        item.semesterId === SEMESTER.id &&
        item.type === "add" &&
        item.date === date &&
        item.replacement,
    )
    .map((item) => ({ ...item.replacement!, weekday: isoDay, date }));
  return [...scheduled, ...added].sort((a, b) => a.period - b.period);
};

export const recentActualClassDates = (
  classId: ClassId,
  selectedDate: string,
  exceptions: TimetableException[],
  limit = 5,
) => {
  const start = parseISO(SEMESTER.startDate);
  const selected = parseISO(selectedDate);
  const end = isAfter(selected, parseISO(SEMESTER.endDate))
    ? parseISO(SEMESTER.endDate)
    : selected;
  if (isBefore(end, start)) return [];
  return eachDayOfInterval({ start, end })
    .filter((day) =>
      scheduleForDate(dateKey(day), exceptions).some(
        (slot) => slot.classId === classId,
      ),
    )
    .map(dateKey)
    .slice(-limit)
    .reverse();
};

export const latestSubmissionBySeat = (
  assignmentId: string,
  events: SubmissionEvent[],
) => {
  const map = new Map<number, SubmissionEvent>();
  events
    .filter(
      (event) =>
        event.semesterId === SEMESTER.id && event.assignmentId === assignmentId,
    )
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
    .forEach((event) => map.set(event.seatNumber, event));
  return map;
};

export const latestSubmissionBySeatAsOf = (
  assignmentId: string,
  events: SubmissionEvent[],
  cutoffDate: string,
) => {
  const map = new Map<number, SubmissionEvent>();
  events
    .filter(
      (event) =>
        event.assignmentId === assignmentId && event.occurredOn <= cutoffDate,
    )
    .sort((a, b) =>
      `${a.occurredOn}-${a.recordedAt}`.localeCompare(
        `${b.occurredOn}-${b.recordedAt}`,
      ),
    )
    .forEach((event) => map.set(event.seatNumber, event));
  return map;
};

export const currentOutcome = (
  assignmentId: string,
  seatNumber: number,
  events: SubmissionEvent[],
): SubmissionOutcome =>
  latestSubmissionBySeat(assignmentId, events).get(seatNumber)?.outcome ??
  "submitted";

export const outstandingForAssignment = (
  assignment: Assignment,
  events: SubmissionEvent[],
) => {
  const latest = latestSubmissionBySeat(assignment.id, events);
  return CLASSES[assignment.classId].seats.filter(
    (seat) => latest.get(seat)?.outcome === "still-missing",
  );
};

export const assignmentsForClassWindow = (
  classId: ClassId,
  selectedDate: string,
  assignments: Assignment[],
  events: SubmissionEvent[],
  exceptions: TimetableException[],
) => {
  const recentDates = new Set(
    recentActualClassDates(classId, selectedDate, exceptions),
  );
  const classAssignments = assignments
    .filter(
      (assignment) =>
        assignment.semesterId === SEMESTER.id &&
        assignment.classId === classId &&
        assignment.assignedDate <= selectedDate,
    )
    .sort((a, b) => b.assignedDate.localeCompare(a.assignedDate));
  return {
    recent: classAssignments.filter((item) => recentDates.has(item.assignedDate)),
    olderOutstanding: classAssignments.filter(
      (item) =>
        !recentDates.has(item.assignedDate) &&
        outstandingForAssignment(item, events).length > 0,
    ),
  };
};

export const attentionScores = (
  incidents: ClassroomIncident[],
  weekStart: string,
  weights: AppSnapshot["attentionWeights"],
) => {
  const start = parseISO(weekStart);
  const end = addDays(start, Math.max(...SEMESTER.workingDays) - 1);
  const scores = new Map<string, number>();
  incidents
    .filter((incident) => {
      const day = parseISO(incident.date);
      return (
        !isBefore(day, start) &&
        (!isAfter(day, end) || isSameDay(day, end)) &&
        incident.seatNumber !== undefined
      );
    })
    .forEach((incident) => {
      if (incident.semesterId !== SEMESTER.id) return;
      const key = `${incident.classId}-${incident.seatNumber}`;
      const weight = weights[incident.category as IncidentCategory];
      scores.set(key, (scores.get(key) ?? 0) + weight);
    });
  return [...scores.entries()]
    .map(([key, score]) => {
      const [classId, seat] = key.split("-");
      return {
        classId: classId as ClassId,
        seatNumber: Number(seat),
        score,
        needsAttention: score >= weights.threshold,
      };
    })
    .sort((a, b) => b.score - a.score);
};

export const createId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
