CREATE TABLE `attempt_events` (
	`event_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`attempt_id` text NOT NULL,
	`seq` integer NOT NULL,
	`step` text NOT NULL,
	`action` text NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`before_state_json` text DEFAULT '{}' NOT NULL,
	`after_state_json` text DEFAULT '{}' NOT NULL,
	`client_elapsed_ms` integer NOT NULL,
	`server_received_at` text NOT NULL,
	FOREIGN KEY (`attempt_id`) REFERENCES `attempts`(`attempt_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "attempt_events_seq_chk" CHECK("attempt_events"."seq" >= 1),
	CONSTRAINT "attempt_events_elapsed_chk" CHECK("attempt_events"."client_elapsed_ms" >= 0 and "attempt_events"."client_elapsed_ms" <= 14400000),
	CONSTRAINT "attempt_events_json_size_chk" CHECK(length("attempt_events"."payload_json") <= 4096 and length("attempt_events"."before_state_json") <= 8192 and length("attempt_events"."after_state_json") <= 8192)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attempt_events_attempt_seq_uq` ON `attempt_events` (`attempt_id`,`seq`);--> statement-breakpoint
CREATE INDEX `attempt_events_attempt_time_idx` ON `attempt_events` (`attempt_id`,`client_elapsed_ms`);--> statement-breakpoint
CREATE INDEX `attempt_events_action_idx` ON `attempt_events` (`action`);--> statement-breakpoint
CREATE TABLE `attempts` (
	`attempt_id` text PRIMARY KEY NOT NULL,
	`attempt_token_hash` text NOT NULL,
	`student_id` text NOT NULL,
	`unit_slug` text NOT NULL,
	`content_version` text NOT NULL,
	`started_at` text NOT NULL,
	`last_event_at` text NOT NULL,
	`completed_at` text,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`expires_at` text NOT NULL,
	`event_count` integer DEFAULT 1 NOT NULL,
	`error_count` integer DEFAULT 0 NOT NULL,
	`correction_count` integer DEFAULT 0 NOT NULL,
	`pdf_key` text,
	`pdf_checksum` text,
	`pdf_page_count` integer,
	`pdf_uploaded_at` text,
	FOREIGN KEY (`unit_slug`) REFERENCES `units`(`slug`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "attempts_student_id_chk" CHECK("attempts"."student_id" glob '[0-9][0-9][0-9][0-9][0-9]'),
	CONSTRAINT "attempts_pdf_page_count_chk" CHECK("attempts"."pdf_page_count" is null or "attempts"."pdf_page_count" = 7)
);
--> statement-breakpoint
CREATE INDEX `attempts_date_student_idx` ON `attempts` (`started_at`,`student_id`);--> statement-breakpoint
CREATE INDEX `attempts_unit_date_idx` ON `attempts` (`unit_slug`,`started_at`);--> statement-breakpoint
CREATE INDEX `attempts_status_idx` ON `attempts` (`status`);--> statement-breakpoint
CREATE INDEX `attempts_expires_at_idx` ON `attempts` (`expires_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `attempts_token_hash_uq` ON `attempts` (`attempt_token_hash`);--> statement-breakpoint
CREATE TABLE `deletion_log` (
	`deletion_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`attempt_id` text NOT NULL,
	`unit_slug` text NOT NULL,
	`reason` text NOT NULL,
	`requested_by` text,
	`deleted_at` text NOT NULL,
	`r2_result` text NOT NULL,
	`d1_result` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `deletion_log_deleted_at_idx` ON `deletion_log` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `deletion_log_attempt_idx` ON `deletion_log` (`attempt_id`);--> statement-breakpoint
CREATE TABLE `evidence_manifest` (
	`evidence_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`attempt_id` text NOT NULL,
	`page_no` integer NOT NULL,
	`step_key` text NOT NULL,
	`captured_at` text NOT NULL,
	`checksum` text NOT NULL,
	`upload_status` text DEFAULT 'captured' NOT NULL,
	FOREIGN KEY (`attempt_id`) REFERENCES `attempts`(`attempt_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "evidence_manifest_page_chk" CHECK("evidence_manifest"."page_no" between 1 and 7)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `evidence_manifest_attempt_page_uq` ON `evidence_manifest` (`attempt_id`,`page_no`);--> statement-breakpoint
CREATE UNIQUE INDEX `evidence_manifest_attempt_step_uq` ON `evidence_manifest` (`attempt_id`,`step_key`);--> statement-breakpoint
CREATE INDEX `evidence_manifest_status_idx` ON `evidence_manifest` (`upload_status`);--> statement-breakpoint
CREATE TABLE `teacher_allowlist` (
	`email` text PRIMARY KEY NOT NULL,
	`role` text DEFAULT 'teacher' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "teacher_allowlist_email_lower_chk" CHECK("teacher_allowlist"."email" = lower("teacher_allowlist"."email"))
);
--> statement-breakpoint
CREATE INDEX `teacher_allowlist_active_idx` ON `teacher_allowlist` (`active`);--> statement-breakpoint
CREATE TABLE `units` (
	`slug` text PRIMARY KEY NOT NULL,
	`unit_id` text NOT NULL,
	`display_name` text NOT NULL,
	`version` text NOT NULL,
	`evidence_policy` text NOT NULL,
	`status` text DEFAULT 'placeholder' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "units_evidence_policy_chk" CHECK("units"."evidence_policy" in ('to-be-defined','event-replay-and-seven-page-pdf'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `units_unit_id_uq` ON `units` (`unit_id`);