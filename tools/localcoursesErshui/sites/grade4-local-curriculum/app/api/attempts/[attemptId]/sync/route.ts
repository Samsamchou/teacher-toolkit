import { authorizeAttempt } from "@/lib/attempt-auth";
import { json } from "@/lib/api";
import { getDbBinding } from "@/lib/runtime";

type RouteContext = { params: Promise<{ attemptId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { attemptId } = await context.params;
  const attempt = await authorizeAttempt(request, attemptId);
  if (!attempt) {
    return json({ code: "ATTEMPT_TOKEN_REQUIRED" }, { status: 401 });
  }
  const db = await getDbBinding();
  const seq = await db
    .prepare("SELECT COALESCE(MAX(seq), 0) AS max_seq FROM attempt_events WHERE attempt_id = ?1")
    .bind(attemptId)
    .first<{ max_seq: number }>();
  const pages = await db
    .prepare(
      "SELECT page_no FROM evidence_manifest WHERE attempt_id = ?1 ORDER BY page_no",
    )
    .bind(attemptId)
    .all<{ page_no: number }>();
  return json({
    nextSeq: Number(seq?.max_seq ?? 0) + 1,
    status: attempt.status,
    receivedEvidencePages: (pages.results as Array<{ page_no: number }>).map(
      (row) => row.page_no,
    ),
    pdfStatus: attempt.pdf_key ? "received" : "pending",
  });
}
