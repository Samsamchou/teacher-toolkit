import { authorizeAttempt } from "@/lib/attempt-auth";
import { json, sha256 } from "@/lib/api";
import { getDbBinding, getEvidenceBucket } from "@/lib/runtime";

type RouteContext = { params: Promise<{ attemptId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { attemptId } = await context.params;
  const attempt = await authorizeAttempt(request, attemptId);
  if (!attempt) {
    return json({ code: "ATTEMPT_TOKEN_REQUIRED" }, { status: 401 });
  }
  if (
    attempt.status !== "completed_pending_evidence" &&
    attempt.status !== "sync_pending"
  ) {
    return json({ code: "EVIDENCE_NOT_READY" }, { status: 409 });
  }

  const form = await request.formData();
  const pdf = form.get("pdf");
  const expectedChecksum = String(form.get("checksum") ?? "");
  const pageCount = Number(form.get("pageCount"));
  const contentVersion = String(form.get("contentVersion") ?? "");
  if (!(pdf instanceof File) || pdf.size > 12_582_912) {
    return json({ code: "EVIDENCE_TOO_LARGE" }, { status: 413 });
  }
  const bytes = await pdf.arrayBuffer();
  const signature = new TextDecoder().decode(bytes.slice(0, 4));
  const checksum = await sha256(bytes);
  if (
    signature !== "%PDF" ||
    pageCount !== 7 ||
    contentVersion !== attempt.content_version ||
    checksum !== expectedChecksum
  ) {
    return json({ code: "INVALID_EVIDENCE" }, { status: 400 });
  }

  let manifest: Array<{ pageNo: number; stepId: string; checksum: string }>;
  try {
    manifest = JSON.parse(String(form.get("manifest") ?? "[]"));
  } catch {
    return json({ code: "INVALID_EVIDENCE" }, { status: 400 });
  }
  if (
    manifest.length !== 7 ||
    manifest.some((item, index) => item.pageNo !== index + 1)
  ) {
    return json({ code: "INVALID_EVIDENCE" }, { status: 400 });
  }

  const key = `evidence/train-tickets/${attemptId}/proof.pdf`;
  await (await getEvidenceBucket()).put(key, bytes, {
    httpMetadata: { contentType: "application/pdf" },
    customMetadata: {
      attemptId,
      contentVersion,
      checksum,
      pageCount: "7",
    },
  });

  const db = await getDbBinding();
  const uploadedAt = new Date().toISOString();
  for (const item of manifest) {
    await db
      .prepare(
        `UPDATE evidence_manifest SET
           checksum = ?3, upload_status = 'uploaded'
         WHERE attempt_id = ?1 AND page_no = ?2`,
      )
      .bind(attemptId, item.pageNo, item.checksum)
      .run();
  }
  await db
    .prepare(
      `UPDATE attempts SET
         pdf_key = ?2, pdf_checksum = ?3, pdf_page_count = 7,
         pdf_uploaded_at = ?4, status = 'completed'
       WHERE attempt_id = ?1`,
    )
    .bind(attemptId, key, checksum, uploadedAt)
    .run();
  return json({ status: "received", pageCount: 7 });
}
