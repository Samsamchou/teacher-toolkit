import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { EMPTY_SNAPSHOT } from "../domain/logic";
import type {
  AppSnapshot,
  Assignment,
  AssignmentRevocation,
  ClassroomIncident,
  DeletedRecord,
  DeletionAudit,
  DeletionResult,
  SubmissionEvent,
  TimetableException,
} from "../types";
import { getFirebaseServices, isFirebaseConfigured } from "./firebaseClient";

export interface DataRepository {
  readonly mode: "demo" | "firebase";
  load(): Promise<AppSnapshot>;
  saveAssignment(value: Assignment): Promise<void>;
  saveSubmissionEvents(values: SubmissionEvent[]): Promise<void>;
  saveIncident(value: ClassroomIncident): Promise<void>;
  saveException(value: TimetableException): Promise<void>;
  deleteRecord(
    recordType: "assignment" | "classroom-incident",
    originalId: string,
  ): Promise<DeletionResult>;
  saveSettings(value: AppSnapshot["attentionWeights"]): Promise<void>;
  replaceAll(value: AppSnapshot): Promise<void>;
}

const STORAGE_KEY = "homeworkclass.snapshot.v1";
const RECYCLE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const cloneEmpty = (): AppSnapshot => structuredClone(EMPTY_SNAPSHOT);

export const stripUndefined = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, stripUndefined(item)]),
    ) as T;
  }
  return value;
};

const isoTimestamp = (value: unknown) =>
  value instanceof Timestamp
    ? value.toDate().toISOString()
    : typeof value === "string"
      ? value
      : "";

export const normalizeSnapshot = (
  value: Partial<AppSnapshot>,
): AppSnapshot => ({
  ...cloneEmpty(),
  ...value,
  schemaVersion: 1,
  assignments: Array.isArray(value.assignments) ? value.assignments : [],
  assignmentRevocations: Array.isArray(value.assignmentRevocations)
    ? value.assignmentRevocations
    : [],
  submissionEvents: Array.isArray(value.submissionEvents)
    ? value.submissionEvents
    : [],
  classroomIncidents: Array.isArray(value.classroomIncidents)
    ? value.classroomIncidents
    : [],
  deletedRecords: Array.isArray(value.deletedRecords)
    ? value.deletedRecords.filter(
        (item) => Date.parse(item.purgeAt) > Date.now(),
      )
    : [],
  deletionAudits: Array.isArray(value.deletionAudits)
    ? value.deletionAudits
    : [],
  timetableExceptions: Array.isArray(value.timetableExceptions)
    ? value.timetableExceptions
    : [],
  attentionWeights: value.attentionWeights
    ? { ...value.attentionWeights }
    : { ...EMPTY_SNAPSHOT.attentionWeights },
});

export const applyLocalDeletion = (
  snapshot: AppSnapshot,
  recordType: "assignment" | "classroom-incident",
  originalId: string,
  now = new Date(),
): DeletionResult => {
  const auditId = `${recordType}_${originalId}`;
  const existingAudit = snapshot.deletionAudits.find((item) => item.id === auditId);
  if (existingAudit) {
    return {
      status: "already-deleted",
      deletedCount: existingAudit.deletedCount,
    };
  }

  const deletedAt = now.toISOString();
  const purgeAt = new Date(now.getTime() + RECYCLE_RETENTION_MS).toISOString();

  if (recordType === "assignment") {
    const assignment = snapshot.assignments.find((item) => item.id === originalId);
    if (!assignment) throw new Error("找不到要刪除的作業。");
    const related = snapshot.submissionEvents.filter(
      (item) => item.assignmentId === originalId,
    );
    if (!snapshot.assignmentRevocations.some((item) => item.assignmentId === originalId)) {
      snapshot.assignmentRevocations.push({
        id: originalId,
        assignmentId: originalId,
        deletedAt,
      });
    }
    snapshot.deletedRecords.push(
      ...related.map((item) => ({
        id: `submission-event_${item.id}_${now.getTime()}`,
        recordType: "submission-event" as const,
        originalId: item.id,
        parentAssignmentId: originalId,
        payload: item,
        deletedAt,
        purgeAt,
      })),
    );
    snapshot.submissionEvents = snapshot.submissionEvents.filter(
      (item) => item.assignmentId !== originalId,
    );
    snapshot.deletionAudits.push({
      id: auditId,
      recordType,
      originalId,
      deletedAt,
      deletedCount: related.length,
    });
    return { status: "deleted", deletedCount: related.length };
  }

  const incident = snapshot.classroomIncidents.find(
    (item) => item.id === originalId,
  );
  if (!incident) throw new Error("找不到要刪除的課堂事件。");
  snapshot.deletedRecords.push({
    id: `classroom-incident_${incident.id}_${now.getTime()}`,
    recordType: "classroom-incident",
    originalId: incident.id,
    payload: incident,
    deletedAt,
    purgeAt,
  });
  snapshot.classroomIncidents = snapshot.classroomIncidents.filter(
    (item) => item.id !== originalId,
  );
  snapshot.deletionAudits.push({
    id: auditId,
    recordType,
    originalId,
    deletedAt,
    deletedCount: 1,
  });
  return { status: "deleted", deletedCount: 1 };
};

class LocalRepository implements DataRepository {
  readonly mode = "demo" as const;

  async load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneEmpty();
    try {
      const parsed = JSON.parse(raw) as AppSnapshot;
      if (parsed.schemaVersion !== 1) return cloneEmpty();
      const normalized = normalizeSnapshot(parsed);
      const serialized = JSON.stringify(normalized);
      if (serialized !== raw) localStorage.setItem(STORAGE_KEY, serialized);
      return normalized;
    } catch {
      return cloneEmpty();
    }
  }

  private async update(mutator: (value: AppSnapshot) => void) {
    const snapshot = await this.load();
    mutator(snapshot);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }

  async saveAssignment(value: Assignment) {
    await this.update((snapshot) => snapshot.assignments.push(value));
  }

  async saveSubmissionEvents(values: SubmissionEvent[]) {
    await this.update((snapshot) => snapshot.submissionEvents.push(...values));
  }

  async saveIncident(value: ClassroomIncident) {
    await this.update((snapshot) => snapshot.classroomIncidents.push(value));
  }

  async saveException(value: TimetableException) {
    await this.update((snapshot) => snapshot.timetableExceptions.push(value));
  }

  async deleteRecord(
    recordType: "assignment" | "classroom-incident",
    originalId: string,
  ) {
    let result: DeletionResult | undefined;
    await this.update((snapshot) => {
      result = applyLocalDeletion(snapshot, recordType, originalId);
    });
    if (!result) throw new Error("刪除操作未完成。");
    return result;
  }

  async saveSettings(value: AppSnapshot["attentionWeights"]) {
    await this.update((snapshot) => {
      snapshot.attentionWeights = value;
    });
  }

  async replaceAll(value: AppSnapshot) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSnapshot(value)));
  }
}

class FirestoreRepository implements DataRepository {
  readonly mode = "firebase" as const;

  private get db() {
    return getFirebaseServices().db;
  }

  private async readCollection<T>(name: string) {
    const result = await getDocs(collection(this.db, name));
    return result.docs.map((item) => item.data() as T);
  }

  async load(): Promise<AppSnapshot> {
    const [
      assignments,
      assignmentRevocations,
      submissionEvents,
      classroomIncidents,
      deletedRecords,
      deletionAudits,
      exceptions,
      settings,
    ] =
      await Promise.all([
        this.readCollection<Assignment>("assignments"),
        this.readCollection<AssignmentRevocation>("assignmentRevocations"),
        this.readCollection<SubmissionEvent>("submissionEvents"),
        this.readCollection<ClassroomIncident>("classroomIncidents"),
        this.readCollection<DeletedRecord>("deletedRecords"),
        this.readCollection<DeletionAudit>("deletionAudits"),
        this.readCollection<TimetableException>("timetableExceptions"),
        getDoc(doc(this.db, "settings", "main")),
      ]);
    return {
      schemaVersion: 1,
      assignments,
      assignmentRevocations: assignmentRevocations.map((item) => ({
        ...item,
        deletedAt: isoTimestamp(item.deletedAt),
      })),
      submissionEvents,
      classroomIncidents,
      deletedRecords: deletedRecords
        .map((item) => ({
          ...item,
          deletedAt: isoTimestamp(item.deletedAt),
          purgeAt: isoTimestamp(item.purgeAt),
        }))
        .filter((item) => Date.parse(item.purgeAt) > Date.now()) as DeletedRecord[],
      deletionAudits: deletionAudits.map((item) => ({
        ...item,
        deletedAt: isoTimestamp(item.deletedAt),
      })),
      timetableExceptions: exceptions,
      attentionWeights: settings.exists()
        ? (settings.data().attentionWeights as AppSnapshot["attentionWeights"])
        : { ...EMPTY_SNAPSHOT.attentionWeights },
    };
  }

  async saveAssignment(value: Assignment) {
    await setDoc(doc(this.db, "assignments", value.id), stripUndefined(value));
  }

  async saveSubmissionEvents(values: SubmissionEvent[]) {
    const batch = writeBatch(this.db);
    values.forEach((value) =>
      batch.set(doc(this.db, "submissionEvents", value.id), stripUndefined(value)),
    );
    await batch.commit();
  }

  async saveIncident(value: ClassroomIncident) {
    await setDoc(doc(this.db, "classroomIncidents", value.id), stripUndefined(value));
  }

  async saveException(value: TimetableException) {
    await setDoc(doc(this.db, "timetableExceptions", value.id), stripUndefined(value));
  }

  async deleteRecord(
    recordType: "assignment" | "classroom-incident",
    originalId: string,
  ) {
    const callable = httpsCallable<
      { recordType: "assignment" | "classroom-incident"; originalId: string },
      DeletionResult
    >(getFirebaseServices().functions, "deleteTeacherRecord");
    const result = await callable({ recordType, originalId });
    if (
      !result.data ||
      !["deleted", "already-deleted"].includes(result.data.status) ||
      !Number.isInteger(result.data.deletedCount)
    ) {
      throw new Error("刪除服務回傳了無法辨識的結果。");
    }
    return result.data;
  }

  async saveSettings(value: AppSnapshot["attentionWeights"]) {
    await setDoc(doc(this.db, "settings", "main"), { attentionWeights: value });
  }

  async replaceAll(value: AppSnapshot) {
    void value;
    throw new Error(
      "Firebase 模式不允許瀏覽器覆寫歷史紀錄；請使用經驗證的後端匯入流程。",
    );
  }
}

export const createRepository = (): DataRepository =>
  import.meta.env.VITE_DATA_MODE === "firebase" && isFirebaseConfigured
    ? new FirestoreRepository()
    : new LocalRepository();
