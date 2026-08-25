import { json } from "@/lib/api";
import { getDbBinding } from "@/lib/runtime";
import { teacherApiIdentity } from "@/lib/teacher-auth";

type RouteContext = { params: Promise<{ attemptId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const identity = await teacherApiIdentity();
  if (!identity.ok) {
    return json({ code: "TEACHER_NOT_ALLOWED" }, { status: identity.status });
  }
  const { attemptId } = await context.params;
  const result = await (await getDbBinding())
    .prepare(
      `SELECT seq, step, action, payload_json, before_state_json,
              after_state_json, client_elapsed_ms
         FROM attempt_events WHERE attempt_id = ?1 ORDER BY seq ASC`,
    )
    .bind(attemptId)
    .all<{
      seq: number;
      step: string;
      action: string;
      payload_json: string;
      before_state_json: string;
      after_state_json: string;
      client_elapsed_ms: number;
    }>();
  return json({
    events: (
      result.results as Array<{
        seq: number;
        step: string;
        action: string;
        payload_json: string;
        before_state_json: string;
        after_state_json: string;
        client_elapsed_ms: number;
      }>
    ).map((row) => ({
      seq: row.seq,
      step: row.step,
      action: row.action,
      payload: JSON.parse(row.payload_json),
      before: JSON.parse(row.before_state_json),
      after: JSON.parse(row.after_state_json),
      clientElapsedMs: row.client_elapsed_ms,
    })),
  });
}
