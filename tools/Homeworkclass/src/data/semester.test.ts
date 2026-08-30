import { describe, expect, it } from "vitest";
import { CLASSES, SUBJECTS, WEEKLY_SCHEDULE } from "./semester";

describe("學期初始化資料", () => {
  it("保留八個班級與來源名條的 155 個有效座號", () => {
    expect(Object.keys(CLASSES)).toEqual([
      "六甲",
      "六乙",
      "五甲",
      "五乙",
      "四甲",
      "四乙",
      "三甲",
      "三乙",
    ]);
    expect(
      Object.fromEntries(
        Object.entries(CLASSES).map(([id, meta]) => [id, meta.seats.length]),
      ),
    ).toEqual({
      六甲: 20,
      六乙: 19,
      五甲: 26,
      五乙: 26,
      四甲: 18,
      四乙: 18,
      三甲: 14,
      三乙: 14,
    });
    expect(Object.values(CLASSES).flatMap((item) => item.seats)).toHaveLength(155);
    expect(CLASSES.四甲.seats).not.toContain(3);
    expect(CLASSES.三甲.seats).not.toContain(8);
  });

  it("八班使用互不重複的主色", () => {
    const accents = Object.values(CLASSES).map((item) => item.accent);
    expect(new Set(accents).size).toBe(8);
  });

  it("課表保留 12 節英語、4 節在地與 4 節國際歌謠", () => {
    expect(WEEKLY_SCHEDULE).toHaveLength(20);
    expect(SUBJECTS.local.label).toBe("在地");
    expect(SUBJECTS["international-song"].label).toBe("國際歌謠");
    expect(
      WEEKLY_SCHEDULE.filter((item) => item.subjectId === "english"),
    ).toHaveLength(12);
    expect(
      WEEKLY_SCHEDULE.filter((item) => item.subjectId === "local"),
    ).toHaveLength(4);
    expect(
      WEEKLY_SCHEDULE.filter(
        (item) => item.subjectId === "international-song",
      ),
    ).toHaveLength(4);
    expect(
      new Set(WEEKLY_SCHEDULE.map((item) => `${item.weekday}-${item.period}`)).size,
    ).toBe(20);
  });
});
