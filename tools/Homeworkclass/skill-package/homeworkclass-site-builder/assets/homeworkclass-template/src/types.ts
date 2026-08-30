export type ClassId = string;
export type SubjectId = string;
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type HomeworkType =
  | "textbook"
  | "workbook"
  | "online-or-worksheet"
  | "quiz";

export type MissingReason = "excused-absence" | "unexcused" | "other";
export type SubmissionOutcome =
  | "submitted"
  | "still-missing"
  | "same-day-completed"
  | "later-submitted";

export type IncidentCategory =
  | "late"
  | "chatting"
  | "disorder"
  | "missing-materials";

export interface ClassMeta {
  id: ClassId;
  label: string;
  shortLabel: string;
  displayOrder: number;
  accent: string;
  accentSoft: string;
  ink: string;
  seats: number[];
}

export interface SubjectMeta {
  id: SubjectId;
  label: string;
  shortLabel: string;
  displayOrder: number;
  accent: string;
}

export interface PeriodTime {
  id: string;
  label: string;
  displayOrder: number;
  period: number;
  startTime: string;
  endTime: string;
}

export interface ScheduleSlot {
  id: string;
  weekday: Weekday;
  periodId: string;
  period: number;
  startTime: string;
  endTime: string;
  classId: ClassId;
  subjectId: SubjectId;
}

export interface SemesterConfig {
  id: string;
  label: string;
  siteTitle: string;
  startDate: string;
  endDate: string;
  timezone: string;
  sourceNote: string;
  status: "active";
  workingDays: Weekday[];
}

export interface NormalizedSubject {
  id: SubjectId;
  label: string;
  shortLabel: string;
  displayOrder: number;
}

export interface NormalizedPeriod {
  id: string;
  label: string;
  displayOrder: number;
  startTime: string;
  endTime: string;
}

export interface SemesterDataFile {
  contractVersion: "homeworkclass-input-v1";
  semester: Omit<SemesterConfig, "status" | "workingDays">;
  subjects: NormalizedSubject[];
  classes: ClassMeta[];
  periods: NormalizedPeriod[];
  schedule: Array<{
    id: string;
    weekday: Weekday;
    periodId: string;
    classId: ClassId;
    subjectId: SubjectId;
    note?: string;
  }>;
}

export interface Assignment {
  id: string;
  semesterId: string;
  classId: ClassId;
  subjectId: SubjectId;
  assignedDate: string;
  periodId: string;
  period: number;
  homeworkType: HomeworkType;
  content: string;
  createdAt: string;
}

export interface SubmissionEvent {
  id: string;
  semesterId: string;
  assignmentId: string;
  classId: ClassId;
  seatNumber: number;
  outcome: SubmissionOutcome;
  reason?: MissingReason;
  note?: string;
  occurredOn: string;
  recordedAt: string;
}

export interface ClassroomIncident {
  id: string;
  semesterId: string;
  classId: ClassId;
  subjectId: SubjectId;
  date: string;
  periodId: string;
  period: number;
  category: IncidentCategory;
  seatNumber?: number;
  note?: string;
  weight: number;
  recordedAt: string;
}

export type TimetableExceptionType =
  | "cancel"
  | "add"
  | "holiday"
  | "holiday-revoke";

export interface TimetableException {
  id: string;
  semesterId: string;
  date: string;
  type: TimetableExceptionType;
  scheduleSlotId?: string;
  replacement?: Omit<ScheduleSlot, "weekday">;
  holidayName?: string;
  targetHolidayId?: string;
  note?: string;
  createdAt: string;
}

export interface AttentionWeights {
  late: number;
  chatting: number;
  disorder: number;
  "missing-materials": number;
  threshold: number;
}

export interface AppSnapshot {
  schemaVersion: 2;
  semesterId: string;
  assignments: Assignment[];
  submissionEvents: SubmissionEvent[];
  classroomIncidents: ClassroomIncident[];
  timetableExceptions: TimetableException[];
  attentionWeights: AttentionWeights;
  exportedAt?: string;
}
