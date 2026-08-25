import { json } from "@/lib/api";
import { getDbBinding } from "@/lib/runtime";
import { teacherApiIdentity } from "@/lib/teacher-auth";

export async function GET(request: Request) {
  const identity = await teacherApiIdentity();
  if (!identity.ok) {
    return json(
      {
        code:
          identity.status === 401
            ? "TEACHER_SIGN_IN_REQUIRED"
            : "TEACHER_NOT_ALLOWED",
      },
      { status: identity.status },
    );
  }
  const url = new URL(request.url);
  const studentId = url.searchParams.get("studentId")?.trim() ?? "";
  const status = url.searchParams.get("status")?.trim() ?? "";
  const conditions: string[] = [];
  const values: string[] = [];
  if (studentId) {
    conditions.push("student_id = ?");
    values.push(studentId);
  }
  if (status) {
    conditions.push("status = ?");
    values.push(status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await (await getDbBinding())
    .prepare(
      `SELECT attempt_id, student_id, started_at, completed_at, status,
              event_count, error_count, pdf_key
         FROM attempts ${where}
        ORDER BY started_at DESC LIMIT 50`,
    )
    .bind(...values)
    .all<{
      attempt_id: string;
      student_id: string;
      started_at: string;
      completed_at: string | null;
      status: string;
      event_count: number;
      error_count: number;
      pdf_key: string | null;
    }>();
  return json({
    items: (
      result.results as Array<{
        attempt_id: string;
        student_id: string;
        started_at: string;
        completed_at: string | null;
        status: string;
        event_count: number;
        error_count: number;
        pdf_key: string | null;
      }>
    ).map((row) => ({
      attemptId: row.attempt_id,
      studentId: row.student_id,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      status: row.status,
      eventCount: row.event_count,
      errorCount: row.error_count,
      pdfReady: Boolean(row.pdf_key),
    })),
    nextCursor: null,
  });
}
