PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS `results`;
DROP TABLE IF EXISTS `enrollments`;
DROP TABLE IF EXISTS `terms`;
DROP TABLE IF EXISTS `sessions`;

CREATE TABLE `sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` text NOT NULL,
  `year` text NOT NULL,
  `start_date` integer NOT NULL,
  `end_date` integer NOT NULL,
  `is_current` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade
);

CREATE TABLE `terms` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` text NOT NULL,
  `session_id` text NOT NULL,
  `term_number` integer NOT NULL,
  `name` text NOT NULL,
  `start_date` integer NOT NULL,
  `end_date` integer NOT NULL,
  `is_current` integer DEFAULT 0 NOT NULL,
  `is_paid` integer DEFAULT 0 NOT NULL,
  `is_closed` integer DEFAULT 0 NOT NULL,
  `payment_date` integer,
  `payment_reference` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade,
  FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE cascade
);

CREATE TABLE `enrollments` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` text NOT NULL,
  `student_id` text NOT NULL,
  `class_id` text NOT NULL,
  `session_id` text NOT NULL,
  `term_id` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE cascade,
  FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE cascade,
  FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE cascade,
  FOREIGN KEY (`term_id`) REFERENCES `terms`(`id`) ON DELETE cascade
);

CREATE TABLE `results` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` text NOT NULL,
  `student_id` text NOT NULL,
  `subject_id` text NOT NULL,
  `class_id` text NOT NULL,
  `session_id` text NOT NULL,
  `term_id` text NOT NULL,
  `score` real NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE cascade,
  FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE cascade,
  FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE cascade,
  FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE cascade,
  FOREIGN KEY (`term_id`) REFERENCES `terms`(`id`) ON DELETE cascade
);

CREATE UNIQUE INDEX `sessions_school_year_unique` ON `sessions` (`school_id`, `year`);
CREATE UNIQUE INDEX `sessions_current_per_school_unique` ON `sessions` (`school_id`) WHERE `is_current` = 1;
CREATE INDEX `sessions_school_current_idx` ON `sessions` (`school_id`, `is_current`);

CREATE UNIQUE INDEX `terms_session_name_unique` ON `terms` (`session_id`, `name`);
CREATE UNIQUE INDEX `terms_session_number_unique` ON `terms` (`session_id`, `term_number`);
CREATE UNIQUE INDEX `terms_current_per_session_unique` ON `terms` (`session_id`) WHERE `is_current` = 1;
CREATE INDEX `terms_school_session_current_idx` ON `terms` (`school_id`, `session_id`, `is_current`);
CREATE INDEX `terms_school_paid_idx` ON `terms` (`school_id`, `is_paid`);

CREATE UNIQUE INDEX `enrollments_unique` ON `enrollments` (`student_id`, `class_id`, `session_id`, `term_id`);
CREATE INDEX `enrollments_student_session_term_idx` ON `enrollments` (`school_id`, `student_id`, `session_id`, `term_id`);

CREATE UNIQUE INDEX `results_unique` ON `results` (`student_id`, `subject_id`, `class_id`, `session_id`, `term_id`);
CREATE INDEX `results_student_idx` ON `results` (`school_id`, `student_id`, `session_id`, `term_id`);
CREATE INDEX `results_class_idx` ON `results` (`school_id`, `class_id`, `session_id`, `term_id`);
CREATE INDEX `results_subject_idx` ON `results` (`school_id`, `subject_id`, `session_id`, `term_id`);

PRAGMA foreign_keys = ON;
