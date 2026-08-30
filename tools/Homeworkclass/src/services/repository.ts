import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { EMPTY_SNAPSHOT } from "../domain/logic";
import type {
  AppSnapshot,
  Assignment,
  ClassroomIncident,
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
  saveSettings(value: AppSnapshot["attentionWeights"]): Promise<void>;
  replaceAll(value: AppSnapshot): Promise<void>;
}

const STORAGE_KEY = "homeworkclass.snapshot.v1";

const cloneEmpty = (): AppSnapshot => structuredClone(EMPTY_SNAPSHOT);

class LocalRepository implements DataRepository {
  readonly mode = "demo" as const;

  async load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneEmpty();
    try {
      const parsed = JSON.parse(raw) as AppSnapshot;
      return parsed.schemaVersion === 1 ? parsed : cloneEmpty();
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

  async saveSettings(value: AppSnapshot["attentionWeights"]) {
    await this.update((snapshot) => {
      snapshot.attentionWeights = value;
    });
  }

  async replaceAll(value: AppSnapshot) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
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
    const [assignments, submissionEvents, classroomIncidents, exceptions, settings] =
      await Promise.all([
        this.readCollection<Assignment>("assignments"),
        this.readCollection<SubmissionEvent>("submissionEvents"),
        this.readCollection<ClassroomIncident>("classroomIncidents"),
        this.readCollection<TimetableException>("timetableExceptions"),
        getDoc(doc(this.db, "settings", "main")),
      ]);
    return {
      schemaVersion: 1,
      assignments,
      submissionEvents,
      classroomIncidents,
      timetableExceptions: exceptions,
      attentionWeights: settings.exists()
        ? (settings.data().attentionWeights as AppSnapshot["attentionWeights"])
        : { ...EMPTY_SNAPSHOT.attentionWeights },
    };
  }

  async saveAssignment(value: Assignment) {
    await setDoc(doc(this.db, "assignments", value.id), value);
  }

  async saveSubmissionEvents(values: SubmissionEvent[]) {
    const batch = writeBatch(this.db);
    values.forEach((value) =>
      batch.set(doc(this.db, "submissionEvents", value.id), value),
    );
    await batch.commit();
  }

  async saveIncident(value: ClassroomIncident) {
    await setDoc(doc(this.db, "classroomIncidents", value.id), value);
  }

  async saveException(value: TimetableException) {
    await setDoc(doc(this.db, "timetableExceptions", value.id), value);
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
