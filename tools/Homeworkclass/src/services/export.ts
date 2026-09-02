import type { AppSnapshot } from "../types";

export type ExportCell = string | number | boolean | null | undefined;

export interface ExportTable {
  name: string;
  rows: Array<Record<string, ExportCell>>;
}

export interface ReportExport {
  title: string;
  subtitle: string;
  tables: ExportTable[];
}

const saveBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
};

const safeFilename = (value: string) =>
  value.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "_");

const csvCell = (value: ExportCell) => {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
};

export const createCsvReportContent = (report: ReportExport) => {
  const lines: string[] = [[report.title], [report.subtitle]].map((row) => row.map(csvCell).join(","));
  report.tables.forEach((table) => {
    lines.push("", csvCell(table.name));
    const headers = table.rows.length ? Object.keys(table.rows[0]) : ["說明"];
    lines.push(headers.map(csvCell).join(","));
    if (!table.rows.length) {
      lines.push(csvCell("此篩選範圍沒有紀錄"));
      return;
    }
    table.rows.forEach((row) => lines.push(headers.map((header) => csvCell(row[header])).join(",")));
  });
  return `\ufeff${lines.join("\r\n")}`;
};

export const downloadCsvReport = (report: ReportExport) => {
  saveBlob(
    new Blob([createCsvReportContent(report)], { type: "text/csv;charset=utf-8" }),
    `${safeFilename(report.title)}.csv`,
  );
};

const colorForSheet = (index: number) =>
  ["FF5C7C", "FF8A3D", "E9B800", "43B95C", "198CE7", "7357E8"][index % 6];

export const downloadXlsxReport = async (report: ReportExport) => {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "英語作業與課堂紀錄";
  workbook.created = new Date();
  workbook.subject = report.subtitle;

  report.tables.forEach((table, index) => {
    const worksheet = workbook.addWorksheet(table.name.slice(0, 31), {
      views: [{ state: "frozen", ySplit: 3 }],
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    });
    const headers = table.rows.length ? Object.keys(table.rows[0]) : ["說明"];
    worksheet.mergeCells(1, 1, 1, Math.max(headers.length, 1));
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = `${report.title}｜${table.name}`;
    titleCell.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${colorForSheet(index)}` } };
    titleCell.alignment = { vertical: "middle" };
    worksheet.getRow(1).height = 30;
    worksheet.mergeCells(2, 1, 2, Math.max(headers.length, 1));
    worksheet.getCell(2, 1).value = report.subtitle;
    worksheet.getCell(2, 1).font = { color: { argb: "FF555062" }, italic: true };

    const headerRow = worksheet.getRow(3);
    headerRow.values = headers;
    headerRow.font = { bold: true, color: { argb: "FF211A3A" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3EFFD" } };
    headerRow.alignment = { vertical: "middle", wrapText: true };
    headerRow.height = 25;

    if (table.rows.length) {
      table.rows.forEach((row) => worksheet.addRow(headers.map((header) => row[header] ?? "")));
    } else {
      worksheet.addRow(["此篩選範圍沒有紀錄"]);
    }

    headers.forEach((header, columnIndex) => {
      const values = table.rows.slice(0, 200).map((row) => String(row[header] ?? "").length);
      const width = Math.min(42, Math.max(12, header.length * 2 + 2, ...values.map((length) => length + 2)));
      worksheet.getColumn(columnIndex + 1).width = width;
    });
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 3 && rowNumber % 2 === 0) {
        row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBF7" } };
      }
      row.alignment = { vertical: "top", wrapText: true };
    });
    worksheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: headers.length } };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveBlob(
    new Blob([buffer as unknown as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${safeFilename(report.title)}.xlsx`,
  );
};

export const createJsonBackupValue = (
  snapshot: AppSnapshot,
  exportedAt = new Date().toISOString(),
) => {
  const { deletedRecords: _recycleBin, ...preserved } = snapshot;
  return { ...preserved, exportedAt };
};

export const createJsonBackupContent = (
  snapshot: AppSnapshot,
  exportedAt?: string,
) => JSON.stringify(createJsonBackupValue(snapshot, exportedAt), null, 2);

export const downloadJsonBackup = (snapshot: AppSnapshot) => {
  const date = new Date().toISOString().slice(0, 10);
  saveBlob(
    new Blob([createJsonBackupContent(snapshot)], { type: "application/json;charset=utf-8" }),
    `英語作業與課堂紀錄_完整備份_${date}.json`,
  );
};
