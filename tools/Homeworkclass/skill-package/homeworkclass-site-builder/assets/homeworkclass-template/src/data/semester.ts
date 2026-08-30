import rawData from "./semester.json";
import type {
  ClassMeta,
  PeriodTime,
  ScheduleSlot,
  SemesterDataFile,
  SubjectMeta,
  Weekday,
} from "../types";

const fail = (message: string): never => {
  throw new Error(`semester.json 設定錯誤：${message}`);
};

const data = rawData as SemesterDataFile;
const subjectAccents = ["#6D28D9", "#0F766E", "#C2410C", "#BE185D", "#0369A1", "#A16207"];

if (data.contractVersion !== "homeworkclass-input-v1") fail("contractVersion 不相容");
if (!data.semester.id.trim()) fail("semester.id 不可空白");
if (!data.classes.length) fail("至少需要一個班級");
if (!data.subjects.length) fail("至少需要一個科目");
if (!data.periods.length) fail("至少需要一個節次");

const unique = <T,>(values: T[], label: string) => {
  if (new Set(values).size !== values.length) fail(`${label} 不可重複`);
};

unique(data.classes.map((item) => item.id), "班級 ID");
unique(data.subjects.map((item) => item.id), "科目 ID");
unique(data.periods.map((item) => item.id), "節次 ID");
unique(data.periods.map((item) => item.displayOrder), "節次順序");
unique(data.schedule.map((item) => item.id), "課程 ID");

const orderedClasses = [...data.classes].sort((a, b) => a.displayOrder - b.displayOrder);
const orderedSubjects = [...data.subjects].sort((a, b) => a.displayOrder - b.displayOrder);
const orderedPeriods = [...data.periods].sort((a, b) => a.displayOrder - b.displayOrder);
const classIds = new Set(orderedClasses.map((item) => item.id));
const subjectIds = new Set(orderedSubjects.map((item) => item.id));
const periodById = new Map(orderedPeriods.map((item) => [item.id, item]));
const occupied = new Set<string>();

orderedClasses.forEach((item) => {
  if (!item.id.trim() || !item.label.trim()) fail("班級 ID 與名稱不可空白");
  if (!item.seats.length) fail(`${item.label} 至少需要一個有效座號`);
  unique(item.seats, `${item.label} 座號`);
  if (item.seats.some((seat) => !Number.isInteger(seat) || seat < 1)) {
    fail(`${item.label} 座號必須是正整數`);
  }
});

data.schedule.forEach((slot) => {
  if (!classIds.has(slot.classId)) fail(`課程 ${slot.id} 使用不存在的班級`);
  if (!subjectIds.has(slot.subjectId)) fail(`課程 ${slot.id} 使用不存在的科目`);
  if (!periodById.has(slot.periodId)) fail(`課程 ${slot.id} 使用不存在的節次`);
  const key = `${slot.weekday}-${slot.periodId}`;
  if (occupied.has(key)) fail(`教師課表衝突：${key}`);
  occupied.add(key);
});

const maxWeekday = Math.max(5, ...data.schedule.map((item) => item.weekday));
const workingDays = Array.from({ length: maxWeekday }, (_, index) => (index + 1) as Weekday);

export const SITE = Object.freeze({
  name: data.semester.siteTitle,
  shortName: data.semester.siteTitle,
});
export const SEMESTER = Object.freeze({
  ...data.semester,
  status: "active" as const,
  workingDays,
});
export const CLASS_IDS = orderedClasses.map((item) => item.id);
export const SUBJECT_IDS = orderedSubjects.map((item) => item.id);
export const CLASSES: Record<string, ClassMeta> = Object.fromEntries(
  orderedClasses.map((item) => [item.id, { ...item, seats: [...item.seats] }]),
);
export const SUBJECTS: Record<string, SubjectMeta> = Object.fromEntries(
  orderedSubjects.map((item, index) => [
    item.id,
    { ...item, accent: subjectAccents[index % subjectAccents.length] },
  ]),
);
export const PERIODS: PeriodTime[] = orderedPeriods.map((item) => ({
  ...item,
  period: item.displayOrder,
}));
export const WEEKLY_SCHEDULE: ScheduleSlot[] = data.schedule.map((slot) => {
  const time = periodById.get(slot.periodId)!;
  return {
    ...slot,
    period: time.displayOrder,
    startTime: time.startTime,
    endTime: time.endTime,
  };
});

export const SEMESTER_FIXTURE = Object.freeze({
  semesterId: SEMESTER.id,
  classIds: [...CLASS_IDS],
  subjectIds: [...SUBJECT_IDS],
  periodIds: PERIODS.map((item) => item.id),
  validSeats: Object.fromEntries(
    CLASS_IDS.map((classId) => [classId, [...CLASSES[classId].seats]]),
  ),
});
