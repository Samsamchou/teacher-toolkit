import { json } from "@/lib/api";
import { getDbBinding, getEvidenceBucket } from "@/lib/runtime";
import { teacherApiIdentity } from "@/lib/teacher-auth";

type RouteContext = { params: Promise<{ attemptId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const identity = await teacherApiIdentity();
  if (!identity.ok) {
    return json({ code: "TEACHER_NOT_ALLOWED" }, { status: identity.status });
  }
  const { attemptId } = await context.params;
  const row = await (await getDbBinding())
    .prepare("SELECT pdf_key FROM attempts WHERE attempt_id = ?1")
    .bind(attemptId)
    .first<{ pdf_key: string | null }>();
  if (!row?.pdf_key) {
    return json({ code: "ATTEMPT_NOT_FOUND" }, { status: 404 });
  }
  const object = await (await getEvidenceBucket()).get(row.pdf_key);
  if (!object) return json({ code: "ATTEMPT_NOT_FOUND" }, { status: 404 });
  const disposition =
    new URL(request.url).searchParams.get("disposition") === "attachment"
      ? "attachment"
      : "inline";
  return new Response(object.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="train-ticket-${attemptId.slice(-6)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
