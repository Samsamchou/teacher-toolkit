import { json } from "@/lib/api";
import { getDbBinding } from "@/lib/runtime";
import { teacherApiIdentity } from "@/lib/teacher-auth";

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET() {
  const identity = await teacherApiIdentity();
  if (!identity.ok) {
    return json({ code: "TEACHER_NOT_ALLOWED" }, { status: identity.status });
  }
  const result = await (await getDbBinding())
    .prepare(
      `SELECT student_id, unit_slug, started_at, completed_at, status,
              event_count, error_count, correction_count, pdf_page_count
         FROM attempts ORDER BY started_at DESC`,
    )
    .all<Record<string, unknown>>();
  const keys = [
    "student_id",
    "unit_slug",
    "started_at",
    "completed_at",
    "status",
    "event_count",
    "error_count",
    "correction_count",
    "pdf_page_count",
  ];
  const lines = [
    keys.join(","),
    ...(result.results as Array<Record<string, unknown>>).map((row) =>
      keys.map((key) => csvCell(row[key])).join(","),
    ),
  ];
  return new Response(`\uFEFF${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="train-ticket-attempts.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
