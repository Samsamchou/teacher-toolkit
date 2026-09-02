import { describe, expect, it } from "vitest";
import { EMPTY_SNAPSHOT } from "../domain/logic";
import {
  createCsvReportContent,
  createJsonBackupContent,
  type ReportExport,
} from "./export";

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

describe("JSON backup export", () => {
  it("keeps revocation and audit state but excludes 30-day recycle payloads", () => {
    const value = structuredClone(EMPTY_SNAPSHOT);
    value.assignmentRevocations.push({
      id: "assignment-1",
      assignmentId: "assignment-1",
      deletedAt: "2026-09-02T02:00:00.000Z",
    });
    value.deletionAudits.push({
      id: "assignment_assignment-1",
      recordType: "assignment",
      originalId: "assignment-1",
      deletedAt: "2026-09-02T02:00:00.000Z",
      deletedCount: 1,
    });
    value.deletedRecords.push({
      id: "submission-event-1",
      recordType: "submission-event",
      originalId: "submission-1",
      parentAssignmentId: "assignment-1",
      payload: {
        id: "submission-1",
        assignmentId: "assignment-1",
        classId: "四乙",
        seatNumber: 10,
        outcome: "still-missing",
        reason: "unexcused",
        occurredOn: "2026-09-01",
        recordedAt: "2026-09-01T08:00:00.000Z",
      },
      deletedAt: "2026-09-02T02:00:00.000Z",
      purgeAt: "2026-10-02T02:00:00.000Z",
    });

    const backup = JSON.parse(
      createJsonBackupContent(value, "2026-09-02T03:00:00.000Z"),
    ) as Record<string, unknown>;

    expect(backup).not.toHaveProperty("deletedRecords");
    expect(backup.assignmentRevocations).toHaveLength(1);
    expect(backup.deletionAudits).toHaveLength(1);
    expect(backup.exportedAt).toBe("2026-09-02T03:00:00.000Z");
  });
});
