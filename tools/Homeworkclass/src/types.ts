export const CLASS_IDS = [
  "六甲",
  "六乙",
  "五甲",
  "五乙",
  "四甲",
  "四乙",
  "三甲",
  "三乙",
] as const;

export type ClassId = (typeof CLASS_IDS)[number];

export const SUBJECT_IDS = ["english", "local", "international-song"] as const;
export type SubjectId = (typeof SUBJECT_IDS)[number];

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
  accent: string;
  accentSoft: string;
  ink: string;
  seats: number[];
}

export interface SubjectMeta {
  id: SubjectId;
  label: string;
  shortLabel: string;
}

export interface PeriodTime {
  period: number;
  startTime: string;
  endTime: string;
}

export interface ScheduleSlot {
  id: string;
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  period: number;
  startTime: string;
  endTime: string;
  classId: ClassId;
  subjectId: SubjectId;
}

export interface SemesterConfig {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  timezone: "Asia/Taipei";
}

export interface Assignment {
  id: string;
  classId: ClassId;
  subjectId: SubjectId;
  assignedDate: string;
  period: number;
  homeworkType: HomeworkType;
  content: string;
  createdAt: string;
}

export interface SubmissionEvent {
  id: string;
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
  classId: ClassId;
  subjectId: SubjectId;
  date: string;
  period: number;
  category: IncidentCategory;
  seatNumber?: number;
  note?: string;
  weight: number;
  recordedAt: string;
}

export interface AssignmentRevocation {
  id: string;
  assignmentId: string;
  deletedAt: string;
}

export interface DeletedSubmissionRecord {
  id: string;
  recordType: "submission-event";
  originalId: string;
  parentAssignmentId: string;
  payload: SubmissionEvent;
  deletedAt: string;
  purgeAt: string;
}

export interface DeletedIncidentRecord {
  id: string;
  recordType: "classroom-incident";
  originalId: string;
  payload: ClassroomIncident;
  deletedAt: string;
  purgeAt: string;
}

export type DeletedRecord = DeletedSubmissionRecord | DeletedIncidentRecord;

export interface DeletionAudit {
  id: string;
  recordType: "assignment" | "classroom-incident";
  originalId: string;
  deletedAt: string;
  deletedCount: number;
}

export interface DeletionResult {
  status: "deleted" | "already-deleted";
  deletedCount: number;
}

export type TimetableExceptionType =
  | "cancel"
  | "add"
  | "holiday"
  | "holiday-revoke";

export interface TimetableException {
  id: string;
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
  schemaVersion: 1;
  assignments: Assignment[];
  assignmentRevocations: AssignmentRevocation[];
  submissionEvents: SubmissionEvent[];
  classroomIncidents: ClassroomIncident[];
  deletedRecords: DeletedRecord[];
  deletionAudits: DeletionAudit[];
  timetableExceptions: TimetableException[];
  attentionWeights: AttentionWeights;
  exportedAt?: string;
}
