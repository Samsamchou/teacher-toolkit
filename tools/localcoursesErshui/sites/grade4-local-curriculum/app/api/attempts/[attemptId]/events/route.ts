import { authorizeAttempt } from "@/lib/attempt-auth";
import { json } from "@/lib/api";
import { getDbBinding } from "@/lib/runtime";

const validSteps = new Set([
  "student_id",
  "origin",
  "destination",
  "date",
  "search",
  "train",
  "summary",
  "success",
]);
const validActions = new Set([
  "attempt_started",
  "field_selected",
  "validation_failed",
  "swap",
  "back",
  "step_passed",
  "attempt_completed",
]);

type RouteContext = { params: Promise<{ attemptId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { attemptId } = await context.params;
  const attempt = await authorizeAttempt(request, attemptId);
  if (!attempt) {
    return json({ code: "ATTEMPT_TOKEN_REQUIRED" }, { status: 401 });
  }
  if (attempt.status === "completed" || attempt.status === "deletion_pending") {
    return json({ code: "ATTEMPT_LOCKED" }, { status: 409 });
  }

  let body: { events?: Array<Record<string, unknown>> };
  try {
    body = await request.json();
  } catch {
    return json({ code: "INVALID_REQUEST" }, { status: 400 });
  }
  const events = body.events;
  if (!Array.isArray(events) || events.length < 1 || events.length > 25) {
    return json({ code: "INVALID_EVENT_BATCH" }, { status: 400 });
  }

  const db = await getDbBinding();
  const maxRow = await db
    .prepare(
      "SELECT COALESCE(MAX(seq), 0) AS max_seq FROM attempt_events WHERE attempt_id = ?1",
    )
    .bind(attemptId)
    .first<{ max_seq: number }>();
  let accepted = Number(maxRow?.max_seq ?? 0);

  for (const event of events) {
    const seq = Number(event.seq);
    const step = String(event.step ?? "");
    const action = String(event.action ?? "");
    const elapsed = Number(event.clientElapsedMs);
    const payload = event.payload ?? {};
    const before = event.before ?? {};
    const after = event.after ?? {};
    if (
      !Number.isInteger(seq) ||
      !validSteps.has(step) ||
      !validActions.has(action) ||
      !Number.isInteger(elapsed) ||
      elapsed < 0 ||
      elapsed > 14_400_000
    ) {
      return json({ code: "INVALID_SIMULATION_VALUE" }, { status: 400 });
    }
    if (seq <= accepted) continue;
    if (seq !== accepted + 1) {
      return json(
        { code: "EVENT_SEQUENCE_CONFLICT", acceptedThroughSeq: accepted },
        { status: 409 },
      );
    }
    const payloadJson = JSON.stringify(payload);
    const beforeJson = JSON.stringify(before);
    const afterJson = JSON.stringify(after);
    if (
      payloadJson.length > 4096 ||
      beforeJson.length > 8192 ||
      afterJson.length > 8192
    ) {
      return json({ code: "INVALID_SIMULATION_VALUE" }, { status: 400 });
    }
    const receivedAt = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO attempt_events
          (attempt_id, seq, step, action, payload_json, before_state_json,
           after_state_json, client_elapsed_ms, server_received_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
      )
      .bind(
        attemptId,
        seq,
        step,
        action,
        payloadJson,
        beforeJson,
        afterJson,
        elapsed,
        receivedAt,
      )
      .run();

    if (action === "step_passed") {
      const pageNo = Number((payload as Record<string, unknown>).pageNo);
      const stepId = String((payload as Record<string, unknown>).stepId ?? "");
      if (pageNo >= 1 && pageNo <= 7 && stepId.startsWith("step.")) {
        await db
          .prepare(
            `INSERT INTO evidence_manifest
              (attempt_id, page_no, step_key, captured_at, checksum, upload_status)
             VALUES (?1, ?2, ?3, ?4, 'pending-client-upload', 'captured')
             ON CONFLICT(attempt_id, page_no) DO UPDATE SET
               step_key = excluded.step_key, captured_at = excluded.captured_at`,
          )
          .bind(attemptId, pageNo, stepId, receivedAt)
          .run();
      }
    }
    const errorDelta = action === "validation_failed" ? 1 : 0;
    const completed = action === "attempt_completed";
    await db
      .prepare(
        `UPDATE attempts SET
          last_event_at = ?2,
          event_count = event_count + 1,
          error_count = error_count + ?3,
          correction_count = correction_count + ?3,
          status = CASE WHEN ?4 = 1 THEN 'completed_pending_evidence' ELSE status END,
          completed_at = CASE WHEN ?4 = 1 THEN ?2 ELSE completed_at END
         WHERE attempt_id = ?1`,
      )
      .bind(attemptId, receivedAt, errorDelta, completed ? 1 : 0)
      .run();
    accepted = seq;
  }

  const status = await db
    .prepare("SELECT status FROM attempts WHERE attempt_id = ?1")
    .bind(attemptId)
    .first<{ status: string }>();
  return json({
    acceptedThroughSeq: accepted,
    nextSeq: accepted + 1,
    attemptStatus: status?.status ?? "in_progress",
  });
}
