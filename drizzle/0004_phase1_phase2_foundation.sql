PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS `class_subjects` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` text NOT NULL,
  `class_id` text NOT NULL,
  `subject_id` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade,
  FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE cascade,
  FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS `class_subjects_unique` ON `class_subjects` (`school_id`, `class_id`, `subject_id`);
CREATE INDEX IF NOT EXISTS `class_subjects_class_idx` ON `class_subjects` (`school_id`, `class_id`);
CREATE INDEX IF NOT EXISTS `class_subjects_subject_idx` ON `class_subjects` (`school_id`, `subject_id`);

CREATE TABLE IF NOT EXISTS `parent_ward_links` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` text NOT NULL,
  `parent_id` text NOT NULL,
  `student_id` text NOT NULL,
  `relationship` text NOT NULL DEFAULT 'GUARDIAN',
  `is_primary` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade,
  FOREIGN KEY (`parent_id`) REFERENCES `users`(`id`) ON DELETE cascade,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS `parent_ward_links_unique` ON `parent_ward_links` (`school_id`, `parent_id`, `student_id`);
CREATE INDEX IF NOT EXISTS `parent_ward_links_parent_idx` ON `parent_ward_links` (`school_id`, `parent_id`);
CREATE INDEX IF NOT EXISTS `parent_ward_links_student_idx` ON `parent_ward_links` (`school_id`, `student_id`);

CREATE TABLE IF NOT EXISTS `teacher_class_assignments` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` text NOT NULL,
  `teacher_id` text NOT NULL,
  `class_id` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade,
  FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`) ON DELETE cascade,
  FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS `teacher_class_teacher_unique` ON `teacher_class_assignments` (`school_id`, `teacher_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `teacher_class_class_unique` ON `teacher_class_assignments` (`school_id`, `class_id`);
CREATE INDEX IF NOT EXISTS `teacher_class_assignments_teacher_idx` ON `teacher_class_assignments` (`school_id`, `teacher_id`);

CREATE TABLE IF NOT EXISTS `teacher_subject_assignments` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` text NOT NULL,
  `teacher_id` text NOT NULL,
  `subject_id` text NOT NULL,
  `class_id` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade,
  FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`) ON DELETE cascade,
  FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE cascade,
  FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS `teacher_subject_assignments_unique` ON `teacher_subject_assignments` (`school_id`, `teacher_id`, `subject_id`, `class_id`);
CREATE INDEX IF NOT EXISTS `teacher_subject_assignments_teacher_idx` ON `teacher_subject_assignments` (`school_id`, `teacher_id`);
CREATE INDEX IF NOT EXISTS `teacher_subject_assignments_class_idx` ON `teacher_subject_assignments` (`school_id`, `class_id`);
CREATE INDEX IF NOT EXISTS `teacher_subject_assignments_subject_idx` ON `teacher_subject_assignments` (`school_id`, `subject_id`);

CREATE TABLE IF NOT EXISTS `daily_marks` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` text NOT NULL,
  `student_id` text NOT NULL,
  `subject_id` text NOT NULL,
  `class_id` text NOT NULL,
  `section_id` text,
  `teacher_id` text NOT NULL,
  `session_id` text NOT NULL,
  `term_id` text NOT NULL,
  `assessment_type` text NOT NULL,
  `score` real NOT NULL,
  `max_score` real NOT NULL,
  `weightage` real NOT NULL,
  `feedback_notes` text,
  `modification_history_json` text NOT NULL DEFAULT '[]',
  `recorded_date` integer NOT NULL,
  `recorded_by` text NOT NULL,
  `last_modified_by` text,
  `is_deleted` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE cascade,
  FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE cascade,
  FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE cascade,
  FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE set null,
  FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`) ON DELETE cascade,
  FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE cascade,
  FOREIGN KEY (`term_id`) REFERENCES `terms`(`id`) ON DELETE cascade,
  FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON DELETE cascade,
  FOREIGN KEY (`last_modified_by`) REFERENCES `users`(`id`) ON DELETE set null
);

CREATE INDEX IF NOT EXISTS `daily_marks_term_idx` ON `daily_marks` (`school_id`, `term_id`, `class_id`, `subject_id`);
CREATE INDEX IF NOT EXISTS `daily_marks_student_idx` ON `daily_marks` (`school_id`, `student_id`, `term_id`);
CREATE INDEX IF NOT EXISTS `daily_marks_teacher_idx` ON `daily_marks` (`school_id`, `teacher_id`, `term_id`);

CREATE TABLE IF NOT EXISTS `attendance_records` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` text NOT NULL,
  `class_id` text NOT NULL,
  `section_id` text,
  `student_id` text NOT NULL,
  `session_id` text NOT NULL,
  `term_id` text NOT NULL,
  `attendance_date` integer NOT NULL,
  `status` text NOT NULL,
  `excuse_reason` text,
  `marked_by` text NOT NULL,
  `marked_time` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade,
  FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE cascade,
  FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE set null,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE cascade,
  FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE cascade,
  FOREIGN KEY (`term_id`) REFERENCES `terms`(`id`) ON DELETE cascade,
  FOREIGN KEY (`marked_by`) REFERENCES `users`(`id`) ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS `attendance_unique` ON `attendance_records` (`school_id`, `student_id`, `term_id`, `attendance_date`);
CREATE INDEX IF NOT EXISTS `attendance_class_idx` ON `attendance_records` (`school_id`, `class_id`, `term_id`, `attendance_date`);
CREATE INDEX IF NOT EXISTS `attendance_student_idx` ON `attendance_records` (`school_id`, `student_id`, `term_id`);

CREATE TABLE IF NOT EXISTS `teacher_remarks` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` text NOT NULL,
  `session_id` text NOT NULL,
  `term_id` text NOT NULL,
  `student_id` text NOT NULL,
  `class_id` text NOT NULL,
  `section_id` text,
  `type` text NOT NULL,
  `subject_id` text,
  `academic_performance` text,
  `class_participation` text,
  `attitude_to_duties` text,
  `custom_remark` text,
  `promotion_recommendation` text,
  `remarked_by` text NOT NULL,
  `remarked_date` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade,
  FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE cascade,
  FOREIGN KEY (`term_id`) REFERENCES `terms`(`id`) ON DELETE cascade,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE cascade,
  FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE cascade,
  FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE set null,
  FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE set null,
  FOREIGN KEY (`remarked_by`) REFERENCES `users`(`id`) ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS `teacher_remarks_idx` ON `teacher_remarks` (`school_id`, `student_id`, `term_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `teacher_remarks_unique` ON `teacher_remarks` (`school_id`, `student_id`, `term_id`, `type`, `subject_id`);

CREATE TABLE IF NOT EXISTS `report_cards` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` text NOT NULL,
  `student_id` text NOT NULL,
  `term_id` text NOT NULL,
  `session_id` text NOT NULL,
  `class_id` text NOT NULL,
  `section_id` text,
  `class_name` text NOT NULL,
  `term_number` integer NOT NULL,
  `year_label` text NOT NULL,
  `subject_scores_json` text NOT NULL DEFAULT '[]',
  `total_score` real NOT NULL DEFAULT 0,
  `average_score` real NOT NULL DEFAULT 0,
  `class_ranking` integer,
  `class_size` integer,
  `overall_remark` text,
  `attendance_percentage` real,
  `comportment_json` text NOT NULL DEFAULT '{}',
  `promotion_status` text,
  `repeat_reason` text,
  `generated_date` integer NOT NULL,
  `approved_by` text,
  `print_count` integer NOT NULL DEFAULT 0,
  `print_history_json` text NOT NULL DEFAULT '[]',
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE cascade,
  FOREIGN KEY (`term_id`) REFERENCES `terms`(`id`) ON DELETE cascade,
  FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE cascade,
  FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE cascade,
  FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE set null,
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE set null
);

CREATE UNIQUE INDEX IF NOT EXISTS `report_cards_unique` ON `report_cards` (`school_id`, `student_id`, `term_id`);
CREATE INDEX IF NOT EXISTS `report_cards_class_idx` ON `report_cards` (`school_id`, `class_id`, `term_id`);

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` text NOT NULL,
  `recipient_id` text NOT NULL,
  `recipient_role` text NOT NULL,
  `type` text NOT NULL,
  `title` text NOT NULL,
  `message` text NOT NULL,
  `action_url` text,
  `delivery_channels_json` text NOT NULL DEFAULT '["IN_APP"]',
  `delivered_at` integer,
  `read_at` integer,
  `priority` text NOT NULL DEFAULT 'NORMAL',
  `created_date` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade,
  FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS `notifications_recipient_idx` ON `notifications` (`school_id`, `recipient_id`, `read_at`);
CREATE INDEX IF NOT EXISTS `notifications_type_idx` ON `notifications` (`school_id`, `type`, `created_date`);

CREATE TABLE IF NOT EXISTS `student_lifecycle_records` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` text NOT NULL,
  `student_id` text NOT NULL,
  `admission_date` integer,
  `admission_class` text,
  `current_class` text,
  `current_status` text NOT NULL DEFAULT 'ACTIVE',
  `milestones_json` text NOT NULL DEFAULT '[]',
  `graduation_date` integer,
  `certificate_id` text,
  `certification_status` text NOT NULL DEFAULT 'PENDING',
  `suspension_count` integer NOT NULL DEFAULT 0,
  `withdrawal_reason` text,
  `overall_performance_json` text NOT NULL DEFAULT '{}',
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS `student_lifecycle_unique` ON `student_lifecycle_records` (`school_id`, `student_id`);
CREATE INDEX IF NOT EXISTS `student_lifecycle_status_idx` ON `student_lifecycle_records` (`school_id`, `current_status`);

CREATE TABLE IF NOT EXISTS `certificates` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` text NOT NULL,
  `student_id` text NOT NULL,
  `student_name` text NOT NULL,
  `student_admission_number` text NOT NULL,
  `admission_year` integer,
  `graduation_year` integer,
  `class_level` text NOT NULL,
  `certificate_number` text NOT NULL,
  `issued_date` integer,
  `signature_approval_status` text NOT NULL DEFAULT 'PENDING',
  `signed_by_principal_id` text,
  `signed_by_principal_name` text,
  `signature_date` integer,
  `reprint_count` integer NOT NULL DEFAULT 0,
  `reprint_history_json` text NOT NULL DEFAULT '[]',
  `digital_hash` text,
  `qr_code` text,
  `is_verifiable` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE cascade,
  FOREIGN KEY (`signed_by_principal_id`) REFERENCES `users`(`id`) ON DELETE set null
);

CREATE UNIQUE INDEX IF NOT EXISTS `certificates_student_unique` ON `certificates` (`school_id`, `student_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `certificates_number_unique` ON `certificates` (`school_id`, `certificate_number`);