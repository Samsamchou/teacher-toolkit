PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS teacher_allowlist (
  email TEXT PRIMARY KEY NOT NULL,
  role TEXT NOT NULL DEFAULT 'teacher' CHECK (role IN ('teacher', 'admin')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (email = lower(email))
);

CREATE INDEX IF NOT EXISTS teacher_allowlist_active_idx
  ON teacher_allowlist (active);

CREATE TABLE IF NOT EXISTS units (
  slug TEXT PRIMARY KEY NOT NULL,
  unit_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  version TEXT NOT NULL,
  evidence_policy TEXT NOT NULL
    CHECK (evidence_policy IN ('to-be-defined', 'event-replay-and-seven-page-pdf')),
  status TEXT NOT NULL DEFAULT 'placeholder'
    CHECK (status IN ('placeholder', 'specified', 'active', 'archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attempts (
  attempt_id TEXT PRIMARY KEY NOT NULL,
  attempt_token_hash TEXT NOT NULL UNIQUE,
  student_id TEXT NOT NULL
    CHECK (student_id GLOB '[0-9][0-9][0-9][0-9][0-9]'),
  unit_slug TEXT NOT NULL REFERENCES units(slug),
  content_version TEXT NOT NULL,
  started_at TEXT NOT NULL,
  last_event_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (
      status IN (
        'in_progress',
        'completed_pending_evidence',
        'completed',
        'sync_pending',
        'deletion_pending'
      )
    ),
  expires_at TEXT NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 1 CHECK (event_count >= 1),
  error_count INTEGER NOT NULL DEFAULT 0 CHECK (error_count >= 0),
  correction_count INTEGER NOT NULL DEFAULT 0 CHECK (correction_count >= 0),
  pdf_key TEXT,
  pdf_checksum TEXT,
  pdf_page_count INTEGER CHECK (pdf_page_count IS NULL OR pdf_page_count = 7),
  pdf_uploaded_at TEXT
);

CREATE INDEX IF NOT EXISTS attempts_date_student_idx
  ON attempts (started_at, student_id);

CREATE INDEX IF NOT EXISTS attempts_unit_date_idx
  ON attempts (unit_slug, started_at);

CREATE INDEX IF NOT EXISTS attempts_status_idx
  ON attempts (status);

CREATE INDEX IF NOT EXISTS attempts_expires_at_idx
  ON attempts (expires_at);

CREATE TABLE IF NOT EXISTS attempt_events (
  event_id INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id TEXT NOT NULL REFERENCES attempts(attempt_id) ON DELETE CASCADE,
  seq INTEGER NOT NULL CHECK (seq >= 1),
  step TEXT NOT NULL
    CHECK (
      step IN (
        'student_id',
        'origin',
        'destination',
        'date',
        'search',
        'train',
        'summary',
        'success'
      )
    ),
  action TEXT NOT NULL
    CHECK (
      action IN (
        'attempt_started',
        'field_selected',
        'validation_failed',
        'swap',
        'back',
        'step_passed',
        'attempt_completed'
      )
    ),
  payload_json TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(payload_json) AND length(payload_json) <= 4096),
  before_state_json TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(before_state_json) AND length(before_state_json) <= 8192),
  after_state_json TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(after_state_json) AND length(after_state_json) <= 8192),
  client_elapsed_ms INTEGER NOT NULL
    CHECK (client_elapsed_ms BETWEEN 0 AND 14400000),
  server_received_at TEXT NOT NULL,
  UNIQUE (attempt_id, seq)
);

CREATE INDEX IF NOT EXISTS attempt_events_attempt_time_idx
  ON attempt_events (attempt_id, client_elapsed_ms);

CREATE INDEX IF NOT EXISTS attempt_events_action_idx
  ON attempt_events (action);

CREATE TRIGGER IF NOT EXISTS attempt_events_contiguous_seq
BEFORE INSERT ON attempt_events
FOR EACH ROW
BEGIN
  SELECT CASE
    WHEN NEW.seq <> COALESCE(
      (SELECT MAX(seq) + 1 FROM attempt_events WHERE attempt_id = NEW.attempt_id),
      1
    )
    THEN RAISE(ABORT, 'EVENT_SEQUENCE_CONFLICT')
  END;
END;

CREATE TRIGGER IF NOT EXISTS attempt_events_no_insert_after_lock
BEFORE INSERT ON attempt_events
FOR EACH ROW
WHEN EXISTS (
  SELECT 1
  FROM attempts
  WHERE attempt_id = NEW.attempt_id
    AND status IN ('completed', 'deletion_pending')
)
BEGIN
  SELECT RAISE(ABORT, 'ATTEMPT_LOCKED');
END;

CREATE TRIGGER IF NOT EXISTS attempt_events_immutable
BEFORE UPDATE ON attempt_events
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'EVENT_IMMUTABLE');
END;

CREATE TABLE IF NOT EXISTS evidence_manifest (
  evidence_id INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id TEXT NOT NULL REFERENCES attempts(attempt_id) ON DELETE CASCADE,
  page_no INTEGER NOT NULL CHECK (page_no BETWEEN 1 AND 7),
  step_key TEXT NOT NULL
    CHECK (
      step_key IN (
        'step.origin',
        'step.destination',
        'step.date',
        'step.search',
        'step.train',
        'step.summary',
        'step.success'
      )
    ),
  captured_at TEXT NOT NULL,
  checksum TEXT NOT NULL,
  upload_status TEXT NOT NULL DEFAULT 'captured'
    CHECK (upload_status IN ('captured', 'pdf_pending', 'uploaded', 'failed')),
  UNIQUE (attempt_id, page_no),
  UNIQUE (attempt_id, step_key)
);

CREATE INDEX IF NOT EXISTS evidence_manifest_status_idx
  ON evidence_manifest (upload_status);

CREATE TABLE IF NOT EXISTS deletion_log (
  deletion_id INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id TEXT NOT NULL,
  unit_slug TEXT NOT NULL,
  reason TEXT NOT NULL
    CHECK (reason IN ('retention_expired', 'teacher_manual_delete')),
  requested_by TEXT,
  deleted_at TEXT NOT NULL,
  r2_result TEXT NOT NULL
    CHECK (r2_result IN ('not_present', 'deleted', 'failed')),
  d1_result TEXT NOT NULL
    CHECK (d1_result IN ('deleted', 'failed'))
);

CREATE INDEX IF NOT EXISTS deletion_log_deleted_at_idx
  ON deletion_log (deleted_at);

CREATE INDEX IF NOT EXISTS deletion_log_attempt_idx
  ON deletion_log (attempt_id);

INSERT OR IGNORE INTO units (
  slug,
  unit_id,
  display_name,
  version,
  evidence_policy,
  status,
  created_at,
  updated_at
) VALUES
  (
    'roundhouse',
    'unit.roundhouse',
    '扇形車庫',
    'placeholder-v1',
    'to-be-defined',
    'placeholder',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'train-tickets',
    'unit.train-tickets',
    '坐火車趣集集',
    'tickets-v1',
    'event-replay-and-seven-page-pdf',
    'specified',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'railway-reading',
    'unit.railway-reading',
    '閱覽鐵道風華',
    'placeholder-v1',
    'to-be-defined',
    'placeholder',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'narrow-gauge',
    'unit.narrow-gauge',
    '介紹五分車與認識小火車鐵道',
    'placeholder-v1',
    'to-be-defined',
    'placeholder',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );
