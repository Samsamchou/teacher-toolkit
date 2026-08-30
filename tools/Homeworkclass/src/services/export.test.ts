import { describe, expect, it } from "vitest";
import { createCsvReportContent, type ReportExport } from "./export";

describe("CSV report export", () => {
  it("keeps the timetable exception sheet, holiday status, conflicts, and revocation reason", () => {
    const report: ReportExport = {
      title: "英語作業與課堂紀錄",
      subtitle: "2026-08-31 至 2026-09-04",
      tables: [
        {
          name: "課表異動",
          rows: [
            {
              日期: "2026-08-31",
              異動類型: "國定假日",
              狀態: "已撤銷",
              資料衝突: "作業 1 筆、課堂事件 1 筆、補課／調課 1 筆",
              原因或備註: "日期登記錯誤",
            },
          ],
        },
      ],
    };

    const csv = createCsvReportContent(report);

    expect(csv.startsWith("\ufeff")).toBe(true);
    expect(csv).toContain('"課表異動"');
    expect(csv).toContain('"國定假日"');
    expect(csv).toContain('"已撤銷"');
    expect(csv).toContain('"作業 1 筆、課堂事件 1 筆、補課／調課 1 筆"');
    expect(csv).toContain('"日期登記錯誤"');
  });
});
