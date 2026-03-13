PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS `class_arms` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` text NOT NULL,
  `name` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS `class_arms_school_name_unique` ON `class_arms` (`school_id`, `name`);
CREATE INDEX IF NOT EXISTS `class_arms_school_idx` ON `class_arms` (`school_id`);

CREATE TABLE IF NOT EXISTS `sections` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` text NOT NULL,
  `class_id` text NOT NULL,
  `arm_id` text NOT NULL,
  `name` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade,
  FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE cascade,
  FOREIGN KEY (`arm_id`) REFERENCES `class_arms`(`id`) ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS `sections_school_class_arm_unique` ON `sections` (`school_id`, `class_id`, `arm_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `sections_school_name_unique` ON `sections` (`school_id`, `name`);
CREATE INDEX IF NOT EXISTS `sections_school_idx` ON `sections` (`school_id`);
CREATE INDEX IF NOT EXISTS `sections_class_idx` ON `sections` (`school_id`, `class_id`);

CREATE TABLE IF NOT EXISTS `admission_settings` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` text NOT NULL,
  `prefix` text NOT NULL,
  `year_format` text NOT NULL,
  `number_length` integer NOT NULL DEFAULT 3,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS `admission_settings_school_unique` ON `admission_settings` (`school_id`);

ALTER TABLE `enrollments` ADD COLUMN `section_id` text REFERENCES `sections`(`id`) ON DELETE set null;
ALTER TABLE `results` ADD COLUMN `section_id` text REFERENCES `sections`(`id`) ON DELETE set null;

DROP INDEX IF EXISTS `enrollments_unique`;
CREATE UNIQUE INDEX IF NOT EXISTS `enrollments_unique` ON `enrollments` (`student_id`, `section_id`, `session_id`, `term_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `enrollments_legacy_unique` ON `enrollments` (`student_id`, `class_id`, `session_id`, `term_id`);
CREATE INDEX IF NOT EXISTS `enrollments_section_idx` ON `enrollments` (`school_id`, `section_id`, `session_id`, `term_id`);

DROP INDEX IF EXISTS `results_unique`;
CREATE UNIQUE INDEX IF NOT EXISTS `results_unique` ON `results` (`student_id`, `subject_id`, `section_id`, `session_id`, `term_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `results_legacy_unique` ON `results` (`student_id`, `subject_id`, `class_id`, `session_id`, `term_id`);
CREATE INDEX IF NOT EXISTS `results_section_idx` ON `results` (`school_id`, `section_id`, `session_id`, `term_id`);

PRAGMA foreign_keys = ON;
