import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import type { AppSnapshot } from "../types";
import {
  createCsvReportContent,
  createJsonBackupContent,
  createXlsxReportBuffer,
  type ReportExport,
} from "./export";

const report: ReportExport = {
  title: "星河作業與課堂紀錄（範例）",
  subtitle: "2027-08-30 至 2027-09-04",
  tables: [
    {
      name: "課表異動",
      rows: [
        {
          日期: "2027-08-30",
          異動類型: "國定假日",
          狀態: "已撤銷",
          資料衝突: "作業 1 筆、課堂事件 1 筆、補課／調課 1 筆",
          原因或備註: "=HYPERLINK(\"https://example.invalid\")",
        },
      ],
    },
  ],
};

describe("CSV report export", () => {
  it("keeps the timetable exception sheet, holiday status, conflicts, and revocation reason", () => {
    const csv = createCsvReportContent(report);

    expect(csv.startsWith("\ufeff")).toBe(true);
    expect(csv).toContain('"課表異動"');
    expect(csv).toContain('"國定假日"');
    expect(csv).toContain('"已撤銷"');
    expect(csv).toContain('"作業 1 筆、課堂事件 1 筆、補課／調課 1 筆"');
    expect(csv).toContain('"\'=HYPERLINK(""https://example.invalid"")"');
  });

  it("creates an XLSX that can be read back with safe text cells", async () => {
    const buffer = await createXlsxReportBuffer(report);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["課表異動"]);
    expect(workbook.getWorksheet("課表異動")?.getRow(3).values).toContain("原因或備註");
    expect(workbook.getWorksheet("課表異動")?.getCell("E4").value).toBe(
      "'=HYPERLINK(\"https://example.invalid\")",
    );
  });

  it("creates a schema-preserving JSON backup that reads back", () => {
    const snapshot: AppSnapshot = {
      schemaVersion: 2,
      semesterId: "116-1",
      assignments: [],
      submissionEvents: [],
      classroomIncidents: [],
      timetableExceptions: [],
      attentionWeights: {
        late: 1,
        chatting: 1,
        disorder: 2,
        "missing-materials": 1,
        threshold: 4,
      },
    };
    const content = createJsonBackupContent(snapshot, "2027-08-30T00:00:00.000Z");
    const parsed = JSON.parse(content) as AppSnapshot;

    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.semesterId).toBe("116-1");
    expect(parsed.exportedAt).toBe("2027-08-30T00:00:00.000Z");
  });
});
