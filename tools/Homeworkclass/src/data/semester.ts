import type {
  ClassId,
  ClassMeta,
  PeriodTime,
  ScheduleSlot,
  SemesterConfig,
  SubjectId,
  SubjectMeta,
} from "../types";

const seats = (start: number, end: number, excluded: number[] = []) =>
  Array.from({ length: end - start + 1 }, (_, index) => start + index).filter(
    (seat) => !excluded.includes(seat),
  );

export const SEMESTER: SemesterConfig = {
  id: "115-1",
  label: "115 學年度第一學期",
  startDate: "2026-08-31",
  endDate: "2027-01-20",
  timezone: "Asia/Taipei",
};

export const SUBJECTS: Record<SubjectId, SubjectMeta> = {
  english: { id: "english", label: "英語", shortLabel: "英" },
  local: { id: "local", label: "在地", shortLabel: "地" },
  "international-song": {
    id: "international-song",
    label: "國際歌謠",
    shortLabel: "歌",
  },
};

export const CLASSES: Record<ClassId, ClassMeta> = {
  六甲: {
    id: "六甲",
    label: "六年甲班",
    shortLabel: "六甲",
    accent: "#FF4F70",
    accentSoft: "#FFE3EA",
    ink: "#5A1025",
    seats: seats(1, 20),
  },
  六乙: {
    id: "六乙",
    label: "六年乙班",
    shortLabel: "六乙",
    accent: "#FF7A32",
    accentSoft: "#FFE8D8",
    ink: "#5C2508",
    seats: seats(1, 19),
  },
  五甲: {
    id: "五甲",
    label: "五年甲班",
    shortLabel: "五甲",
    accent: "#F3C623",
    accentSoft: "#FFF5C2",
    ink: "#4D3A00",
    seats: seats(1, 26),
  },
  五乙: {
    id: "五乙",
    label: "五年乙班",
    shortLabel: "五乙",
    accent: "#69D34C",
    accentSoft: "#E3F8DC",
    ink: "#174F0B",
    seats: seats(1, 26),
  },
  四甲: {
    id: "四甲",
    label: "四年甲班",
    shortLabel: "四甲",
    accent: "#11BFA5",
    accentSoft: "#D5F7F1",
    ink: "#064E43",
    seats: seats(1, 19, [3]),
  },
  四乙: {
    id: "四乙",
    label: "四年乙班",
    shortLabel: "四乙",
    accent: "#2F9BFF",
    accentSoft: "#DCEEFF",
    ink: "#073D70",
    seats: seats(1, 18),
  },
  三甲: {
    id: "三甲",
    label: "三年甲班",
    shortLabel: "三甲",
    accent: "#725CFF",
    accentSoft: "#E9E4FF",
    ink: "#2B1B7D",
    seats: seats(1, 15, [8]),
  },
  三乙: {
    id: "三乙",
    label: "三年乙班",
    shortLabel: "三乙",
    accent: "#DE4FC2",
    accentSoft: "#FAE0F5",
    ink: "#681457",
    seats: seats(1, 14),
  },
};

export const PERIODS: PeriodTime[] = [
  { period: 1, startTime: "08:35", endTime: "09:15" },
  { period: 2, startTime: "09:25", endTime: "10:05" },
  { period: 3, startTime: "10:30", endTime: "11:10" },
  { period: 4, startTime: "11:20", endTime: "12:00" },
  { period: 5, startTime: "13:30", endTime: "14:10" },
  { period: 6, startTime: "14:20", endTime: "15:00" },
  { period: 7, startTime: "15:10", endTime: "15:50" },
];

const slot = (
  weekday: ScheduleSlot["weekday"],
  period: number,
  subjectId: SubjectId,
  classId: ClassId,
): ScheduleSlot => {
  const time = PERIODS.find((item) => item.period === period)!;
  return {
    id: `w${weekday}-p${period}-${subjectId}-${classId}`,
    weekday,
    period,
    startTime: time.startTime,
    endTime: time.endTime,
    subjectId,
    classId,
  };
};

export const WEEKLY_SCHEDULE: ScheduleSlot[] = [
  slot(1, 2, "local", "四乙"),
  slot(1, 3, "english", "五乙"),
  slot(1, 4, "local", "三乙"),
  slot(1, 5, "international-song", "六乙"),
  slot(1, 6, "english", "三甲"),
  slot(1, 7, "local", "四甲"),
  slot(2, 3, "english", "四乙"),
  slot(2, 4, "english", "六甲"),
  slot(2, 6, "english", "五甲"),
  slot(2, 7, "english", "五乙"),
  slot(3, 2, "english", "四甲"),
  slot(3, 3, "english", "三乙"),
  slot(3, 4, "english", "五甲"),
  slot(4, 3, "local", "三甲"),
  slot(4, 4, "english", "六乙"),
  slot(4, 5, "international-song", "五乙"),
  slot(4, 7, "international-song", "六甲"),
  slot(5, 1, "english", "六乙"),
  slot(5, 2, "english", "六甲"),
  slot(5, 3, "international-song", "五甲"),
];

export const SOURCE_MANIFEST = {
  roster: {
    path: "D:/115 上學期 備課/第一堂/3-6年級班級名條.xlsx",
    sha256: "713ADCBA6DFDFDFF0D8249248322B7D53814DABE80D2F32699658328A9F2D7BE",
  },
  timetable: {
    path: "D:/115 上學期 備課/第一堂/115課表.jpg",
    sha256: "609C3B429D79D90620483304A800A246DA37AB419CD9068DC49C3548195A2632",
  },
} as const;

