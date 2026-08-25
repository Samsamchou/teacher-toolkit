import { json } from "@/lib/api";
import { getDbBinding, getEvidenceBucket } from "@/lib/runtime";
import { teacherApiIdentity } from "@/lib/teacher-auth";

export async function POST(request: Request) {
  const identity = await teacherApiIdentity();
  if (!identity.ok) {
    return json({ code: "TEACHER_NOT_ALLOWED" }, { status: identity.status });
  }
  const input = (await request.json().catch(() => ({}))) as { limit?: number };
  const limit = Math.min(25, Math.max(1, Number(input.limit) || 25));
  const db = await getDbBinding();
  const expired = await db
    .prepare(
      `SELECT attempt_id, unit_slug, pdf_key
         FROM attempts
        WHERE expires_at < ?1
        ORDER BY expires_at ASC
        LIMIT ?2`,
    )
    .bind(new Date().toISOString(), limit)
    .all<{
      attempt_id: string;
      unit_slug: string;
      pdf_key: string | null;
    }>();

  let deleted = 0;
  let failed = 0;
  for (const row of expired.results as Array<{
    attempt_id: string;
    unit_slug: string;
    pdf_key: string | null;
  }>) {
    let r2Result: "not_present" | "deleted" | "failed" = "not_present";
    try {
      if (row.pdf_key) {
        await (await getEvidenceBucket()).delete(row.pdf_key);
        r2Result = "deleted";
      }
      await db
        .prepare("DELETE FROM attempts WHERE attempt_id = ?1")
        .bind(row.attempt_id)
        .run();
      await db
        .prepare(
          `INSERT INTO deletion_log
            (attempt_id, unit_slug, reason, requested_by, deleted_at, r2_result, d1_result)
           VALUES (?1, ?2, 'retention_expired', ?3, ?4, ?5, 'deleted')`,
        )
        .bind(
          row.attempt_id,
          row.unit_slug,
          identity.email,
          new Date().toISOString(),
          r2Result,
        )
        .run();
      deleted += 1;
    } catch {
      failed += 1;
    }
  }
  return json({
    scanned: expired.results.length,
    deleted,
    failed,
    nextCursor: expired.results.length === limit ? "more" : null,
  });
}
