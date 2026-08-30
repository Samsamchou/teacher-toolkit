import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import {
  activeHolidayForDate,
  EMPTY_SNAPSHOT,
  revocationForHoliday,
} from "../domain/logic";
import { createRepository } from "../services/repository";
import type {
  AppSnapshot,
  Assignment,
  ClassroomIncident,
  SubmissionEvent,
  TimetableException,
} from "../types";

interface AppDataContextValue {
  snapshot: AppSnapshot;
  mode: "demo" | "firebase";
  ready: boolean;
  error: string | null;
  addAssignment(value: Assignment): Promise<void>;
  addSubmissionEvents(values: SubmissionEvent[]): Promise<void>;
  addIncident(value: ClassroomIncident): Promise<void>;
  addException(value: TimetableException): Promise<void>;
  updateWeights(value: AppSnapshot["attentionWeights"]): Promise<void>;
  restore(value: AppSnapshot): Promise<void>;
  refresh(): Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: PropsWithChildren) {
  const repository = useMemo(() => createRepository(), []);
  const [snapshot, setSnapshot] = useState<AppSnapshot>(() =>
    structuredClone(EMPTY_SNAPSHOT),
  );
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setSnapshot(await repository.load());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "資料載入失敗");
    } finally {
      setReady(true);
    }
  }, [repository]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addAssignment = async (value: Assignment) => {
    if (activeHolidayForDate(value.assignedDate, snapshot.timetableExceptions)) {
      throw new Error("國定假日當天沒有上課，不能新增作業。");
    }
    await repository.saveAssignment(value);
    setSnapshot((current) => ({
      ...current,
      assignments: [...current.assignments, value],
    }));
  };

  const addSubmissionEvents = async (values: SubmissionEvent[]) => {
    await repository.saveSubmissionEvents(values);
    setSnapshot((current) => ({
      ...current,
      submissionEvents: [...current.submissionEvents, ...values],
    }));
  };

  const addIncident = async (value: ClassroomIncident) => {
    if (activeHolidayForDate(value.date, snapshot.timetableExceptions)) {
      throw new Error("國定假日當天沒有上課，不能新增課堂情況。");
    }
    await repository.saveIncident(value);
    setSnapshot((current) => ({
      ...current,
      classroomIncidents: [...current.classroomIncidents, value],
    }));
  };

  const addException = async (value: TimetableException) => {
    const holiday = activeHolidayForDate(value.date, snapshot.timetableExceptions);
    if (value.type === "holiday") {
      if (!value.holidayName?.trim()) throw new Error("請輸入假日名稱。");
      if (holiday) throw new Error("這一天已經登記為國定假日。");
    }
    if ((value.type === "cancel" || value.type === "add") && holiday) {
      throw new Error(`這一天是「${holiday.holidayName}」，不能新增停課、補課或調課。`);
    }
    if (value.type === "holiday-revoke") {
      const target = snapshot.timetableExceptions.find(
        (item) => item.id === value.targetHolidayId && item.type === "holiday",
      );
      if (!target || target.date !== value.date) {
        throw new Error("找不到要撤銷的國定假日。");
      }
      if (revocationForHoliday(target.id, snapshot.timetableExceptions)) {
        throw new Error("這筆國定假日已經撤銷。");
      }
      if (!value.note?.trim()) throw new Error("請輸入撤銷原因。");
    }
    await repository.saveException(value);
    setSnapshot((current) => ({
      ...current,
      timetableExceptions: [...current.timetableExceptions, value],
    }));
  };

  const updateWeights = async (value: AppSnapshot["attentionWeights"]) => {
    await repository.saveSettings(value);
    setSnapshot((current) => ({ ...current, attentionWeights: value }));
  };

  const restore = async (value: AppSnapshot) => {
    if (value.schemaVersion !== 1) throw new Error("不支援的備份版本");
    await repository.replaceAll(value);
    setSnapshot(value);
  };

  const value: AppDataContextValue = {
    snapshot,
    mode: repository.mode,
    ready,
    error,
    addAssignment,
    addSubmissionEvents,
    addIncident,
    addException,
    updateWeights,
    restore,
    refresh,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) throw new Error("useAppData 必須在 AppDataProvider 內使用");
  return context;
};
