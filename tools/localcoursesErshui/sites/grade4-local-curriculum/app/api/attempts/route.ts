import siteContent from "@/content/site-content.json";
import { futureIso, json, makeId, sha256 } from "@/lib/api";
import { getDbBinding } from "@/lib/runtime";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ code: "INVALID_REQUEST" }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const studentId = String(input.studentId ?? "");
  if (!/^\d{5}$/.test(studentId)) {
    return json(
      { code: "INVALID_STUDENT_ID", message: "請輸入五位數學號。" },
      { status: 400 },
    );
  }
  if (
    input.unitId !== "unit.train-tickets" ||
    input.contentVersion !== siteContent.contentVersion
  ) {
    return json({ code: "INVALID_SIMULATION_VALUE" }, { status: 400 });
  }

  const db = await getDbBinding();
  const now = new Date().toISOString();
  const attemptId = makeId("a");
  const attemptToken = makeId("t");
  const tokenHash = await sha256(attemptToken);

  await db
    .prepare(
      `INSERT OR IGNORE INTO units
        (slug, unit_id, display_name, version, evidence_policy, status, created_at, updated_at)
       VALUES ('train-tickets', 'unit.train-tickets', '坐火車趣集集',
               'tickets-v1', 'event-replay-and-seven-page-pdf', 'specified', ?1, ?1)`,
    )
    .bind(now)
    .run();
  await db.batch([
    db
      .prepare(
        `INSERT INTO attempts
          (attempt_id, attempt_token_hash, student_id, unit_slug, content_version,
           started_at, last_event_at, status, expires_at, event_count)
         VALUES (?1, ?2, ?3, 'train-tickets', ?4, ?5, ?5, 'in_progress', ?6, 1)`,
      )
      .bind(
        attemptId,
        tokenHash,
        studentId,
        siteContent.contentVersion,
        now,
        futureIso(365),
      ),
    db
      .prepare(
        `INSERT INTO attempt_events
          (attempt_id, seq, step, action, payload_json, before_state_json,
           after_state_json, client_elapsed_ms, server_received_at)
         VALUES (?1, 1, 'student_id', 'attempt_started', ?2, '{}', ?3, 0, ?4)`,
      )
      .bind(
        attemptId,
        JSON.stringify({ contentVersion: siteContent.contentVersion }),
        JSON.stringify({ currentStep: "origin", passedSteps: [] }),
        now,
      ),
  ]);

  return json(
    {
      attemptId,
      attemptToken,
      nextSeq: 2,
      status: "in_progress",
      expiresAt: futureIso(365),
    },
    { status: 201 },
  );
}
