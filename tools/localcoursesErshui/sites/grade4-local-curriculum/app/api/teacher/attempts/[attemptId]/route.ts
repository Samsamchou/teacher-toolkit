import { json } from "@/lib/api";
import { getDbBinding, getEvidenceBucket } from "@/lib/runtime";
import { teacherApiIdentity } from "@/lib/teacher-auth";

type RouteContext = { params: Promise<{ attemptId: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  const identity = await teacherApiIdentity();
  if (!identity.ok) {
    return json({ code: "TEACHER_NOT_ALLOWED" }, { status: identity.status });
  }
  const { attemptId } = await context.params;
  const body = (await request.json()) as {
    confirmation?: string;
    reason?: string;
  };
  if (
    body.confirmation !== "DELETE" ||
    body.reason !== "teacher_manual_delete"
  ) {
    return json({ code: "INVALID_REQUEST" }, { status: 400 });
  }
  const db = await getDbBinding();
  const row = await db
    .prepare("SELECT unit_slug, pdf_key FROM attempts WHERE attempt_id = ?1")
    .bind(attemptId)
    .first<{ unit_slug: string; pdf_key: string | null }>();
  if (!row) return json({ code: "ATTEMPT_NOT_FOUND" }, { status: 404 });

  let r2Result: "not_present" | "deleted" | "failed" = "not_present";
  if (row.pdf_key) {
    try {
      await (await getEvidenceBucket()).delete(row.pdf_key);
      r2Result = "deleted";
    } catch {
      r2Result = "failed";
      return json({ code: "DELETE_DEFERRED" }, { status: 503 });
    }
  }
  await db
    .prepare("DELETE FROM attempts WHERE attempt_id = ?1")
    .bind(attemptId)
    .run();
  await db
    .prepare(
      `INSERT INTO deletion_log
        (attempt_id, unit_slug, reason, requested_by, deleted_at, r2_result, d1_result)
       VALUES (?1, ?2, 'teacher_manual_delete', ?3, ?4, ?5, 'deleted')`,
    )
    .bind(
      attemptId,
      row.unit_slug,
      identity.email,
      new Date().toISOString(),
      r2Result,
    )
    .run();
  return json({ deleted: true });
}
