import type {
  HomeworkType,
  IncidentCategory,
  MissingReason,
  SubmissionOutcome,
} from "../types";

export const HOMEWORK_LABELS: Record<HomeworkType, string> = {
  textbook: "課本",
  workbook: "習作",
  "online-or-worksheet": "線上練習／學習單",
  quiz: "小考",
};

export const INCIDENT_LABELS: Record<IncidentCategory, string> = {
  late: "上課遲到",
  chatting: "上課聊天",
  disorder: "不守秩序",
  "missing-materials": "未帶課本、習作或文具",
};

export const REASON_LABELS: Record<MissingReason, string> = {
  "excused-absence": "因請假未交",
  unexcused: "無故未交",
  other: "其他原因",
};

export const OUTCOME_LABELS: Record<SubmissionOutcome, string> = {
  submitted: "已繳交",
  "still-missing": "仍未交",
  "same-day-completed": "當天完成後繳交",
  "later-submitted": "日後補交",
};

export const WEEKDAY_LABELS = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];

export const formatSchoolDate = (date: string) => {
  const value = new Date(`${date}T12:00:00+08:00`);
  return new Intl.DateTimeFormat("zh-TW", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Taipei",
  }).format(value);
};

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Taipei",
  }).format(new Date(value));
