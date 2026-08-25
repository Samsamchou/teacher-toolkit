import { getBearerToken, sha256 } from "./api";
import { getDbBinding } from "./runtime";

export type AttemptRow = {
  attempt_id: string;
  attempt_token_hash: string;
  student_id: string;
  unit_slug: string;
  content_version: string;
  status: string;
  event_count: number;
  error_count: number;
  correction_count: number;
  pdf_key: string | null;
  pdf_page_count: number | null;
};

export async function authorizeAttempt(
  request: Request,
  attemptId: string,
): Promise<AttemptRow | null> {
  const token = getBearerToken(request);
  if (!token) return null;
  const row = await (await getDbBinding())
    .prepare(
      `SELECT attempt_id, attempt_token_hash, student_id, unit_slug,
              content_version, status, event_count, error_count,
              correction_count, pdf_key, pdf_page_count
         FROM attempts WHERE attempt_id = ?1`,
    )
    .bind(attemptId)
    .first<AttemptRow>();
  if (!row) return null;
  const actual = await sha256(token);
  return actual === row.attempt_token_hash ? row : null;
}
