import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * Specification-only Drizzle schema for Cloudflare D1.
 * The future Sites implementation should generate and inspect its own migration
 * from this schema before deployment.
 */

export const teacherAllowlist = sqliteTable(
  "teacher_allowlist",
  {
    email: text("email").primaryKey(),
    role: text("role", { enum: ["teacher", "admin"] })
      .notNull()
      .default("teacher"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("teacher_allowlist_active_idx").on(table.active),
    check("teacher_allowlist_email_lower_chk", sql`${table.email} = lower(${table.email})`),
  ],
);

export const units = sqliteTable(
  "units",
  {
    slug: text("slug").primaryKey(),
    unitId: text("unit_id").notNull(),
    displayName: text("display_name").notNull(),
    version: text("version").notNull(),
    evidencePolicy: text("evidence_policy").notNull(),
    status: text("status", { enum: ["placeholder", "specified", "active", "archived"] })
      .notNull()
      .default("placeholder"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("units_unit_id_uq").on(table.unitId),
    check(
      "units_evidence_policy_chk",
      sql`${table.evidencePolicy} in ('to-be-defined','event-replay-and-seven-page-pdf')`,
    ),
  ],
);

export const attempts = sqliteTable(
  "attempts",
  {
    attemptId: text("attempt_id").primaryKey(),
    attemptTokenHash: text("attempt_token_hash").notNull(),
    studentId: text("student_id").notNull(),
    unitSlug: text("unit_slug")
      .notNull()
      .references(() => units.slug),
    contentVersion: text("content_version").notNull(),
    startedAt: text("started_at").notNull(),
    lastEventAt: text("last_event_at").notNull(),
    completedAt: text("completed_at"),
    status: text("status", {
      enum: [
        "in_progress",
        "completed_pending_evidence",
        "completed",
        "sync_pending",
        "deletion_pending",
      ],
    })
      .notNull()
      .default("in_progress"),
    expiresAt: text("expires_at").notNull(),
    eventCount: integer("event_count").notNull().default(1),
    errorCount: integer("error_count").notNull().default(0),
    correctionCount: integer("correction_count").notNull().default(0),
    pdfKey: text("pdf_key"),
    pdfChecksum: text("pdf_checksum"),
    pdfPageCount: integer("pdf_page_count"),
    pdfUploadedAt: text("pdf_uploaded_at"),
  },
  (table) => [
    index("attempts_date_student_idx").on(table.startedAt, table.studentId),
    index("attempts_unit_date_idx").on(table.unitSlug, table.startedAt),
    index("attempts_status_idx").on(table.status),
    index("attempts_expires_at_idx").on(table.expiresAt),
    uniqueIndex("attempts_token_hash_uq").on(table.attemptTokenHash),
    check("attempts_student_id_chk", sql`${table.studentId} glob '[0-9][0-9][0-9][0-9][0-9]'`),
    check(
      "attempts_pdf_page_count_chk",
      sql`${table.pdfPageCount} is null or ${table.pdfPageCount} = 7`,
    ),
  ],
);

export const attemptEvents = sqliteTable(
  "attempt_events",
  {
    eventId: integer("event_id").primaryKey({ autoIncrement: true }),
    attemptId: text("attempt_id")
      .notNull()
      .references(() => attempts.attemptId, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    step: text("step", {
      enum: [
        "student_id",
        "origin",
        "destination",
        "date",
        "search",
        "train",
        "summary",
        "success",
      ],
    }).notNull(),
    action: text("action", {
      enum: [
        "attempt_started",
        "field_selected",
        "validation_failed",
        "swap",
        "back",
        "step_passed",
        "attempt_completed",
      ],
    }).notNull(),
    payloadJson: text("payload_json").notNull().default("{}"),
    beforeStateJson: text("before_state_json").notNull().default("{}"),
    afterStateJson: text("after_state_json").notNull().default("{}"),
    clientElapsedMs: integer("client_elapsed_ms").notNull(),
    serverReceivedAt: text("server_received_at").notNull(),
  },
  (table) => [
    uniqueIndex("attempt_events_attempt_seq_uq").on(table.attemptId, table.seq),
    index("attempt_events_attempt_time_idx").on(
      table.attemptId,
      table.clientElapsedMs,
    ),
    index("attempt_events_action_idx").on(table.action),
    check("attempt_events_seq_chk", sql`${table.seq} >= 1`),
    check(
      "attempt_events_elapsed_chk",
      sql`${table.clientElapsedMs} >= 0 and ${table.clientElapsedMs} <= 14400000`,
    ),
    check(
      "attempt_events_json_size_chk",
      sql`length(${table.payloadJson}) <= 4096 and length(${table.beforeStateJson}) <= 8192 and length(${table.afterStateJson}) <= 8192`,
    ),
  ],
);

export const evidenceManifest = sqliteTable(
  "evidence_manifest",
  {
    evidenceId: integer("evidence_id").primaryKey({ autoIncrement: true }),
    attemptId: text("attempt_id")
      .notNull()
      .references(() => attempts.attemptId, { onDelete: "cascade" }),
    pageNo: integer("page_no").notNull(),
    stepKey: text("step_key").notNull(),
    capturedAt: text("captured_at").notNull(),
    checksum: text("checksum").notNull(),
    uploadStatus: text("upload_status", {
      enum: ["captured", "pdf_pending", "uploaded", "failed"],
    })
      .notNull()
      .default("captured"),
  },
  (table) => [
    uniqueIndex("evidence_manifest_attempt_page_uq").on(
      table.attemptId,
      table.pageNo,
    ),
    uniqueIndex("evidence_manifest_attempt_step_uq").on(
      table.attemptId,
      table.stepKey,
    ),
    index("evidence_manifest_status_idx").on(table.uploadStatus),
    check(
      "evidence_manifest_page_chk",
      sql`${table.pageNo} between 1 and 7`,
    ),
  ],
);

export const deletionLog = sqliteTable(
  "deletion_log",
  {
    deletionId: integer("deletion_id").primaryKey({ autoIncrement: true }),
    attemptId: text("attempt_id").notNull(),
    unitSlug: text("unit_slug").notNull(),
    reason: text("reason", {
      enum: ["retention_expired", "teacher_manual_delete"],
    }).notNull(),
    requestedBy: text("requested_by"),
    deletedAt: text("deleted_at").notNull(),
    r2Result: text("r2_result", {
      enum: ["not_present", "deleted", "failed"],
    }).notNull(),
    d1Result: text("d1_result", {
      enum: ["deleted", "failed"],
    }).notNull(),
  },
  (table) => [
    index("deletion_log_deleted_at_idx").on(table.deletedAt),
    index("deletion_log_attempt_idx").on(table.attemptId),
  ],
);

export const schemaVersion = "0001_initial";
