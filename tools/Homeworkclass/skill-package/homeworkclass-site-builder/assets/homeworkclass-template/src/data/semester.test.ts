import { describe, expect, it } from "vitest";
import rawData from "./semester.json";
import {
  CLASS_IDS,
  CLASSES,
  PERIODS,
  SEMESTER,
  SUBJECT_IDS,
  WEEKLY_SCHEDULE,
} from "./semester";

describe("資料驅動學期輸入", () => {
  it("完整載入班級與非連續有效座號", () => {
    const orderedClasses = [...rawData.classes].sort(
      (a, b) => a.displayOrder - b.displayOrder,
    );
    expect(SEMESTER.id).toBe(rawData.semester.id);
    expect(CLASS_IDS).toEqual(orderedClasses.map((item) => item.id));
    expect(
      Object.fromEntries(CLASS_IDS.map((id) => [id, CLASSES[id].seats])),
    ).toEqual(
      Object.fromEntries(orderedClasses.map((item) => [item.id, item.seats])),
    );
  });

  it("每班使用互不重複且由資料提供的主色", () => {
    const accents = Object.values(CLASSES).map((item) => item.accent);
    expect(new Set(accents).size).toBe(CLASS_IDS.length);
  });

  it("科目、節次與課表完全由 normalized contract 驅動", () => {
    expect(SUBJECT_IDS).toHaveLength(rawData.subjects.length);
    expect(PERIODS).toHaveLength(rawData.periods.length);
    expect(WEEKLY_SCHEDULE).toHaveLength(rawData.schedule.length);
    expect(WEEKLY_SCHEDULE.map((item) => item.periodId)).toEqual(
      rawData.schedule.map((item) => item.periodId),
    );
    expect(
      new Set(WEEKLY_SCHEDULE.map((item) => `${item.weekday}-${item.periodId}`)).size,
    ).toBe(rawData.schedule.length);
  });
});
