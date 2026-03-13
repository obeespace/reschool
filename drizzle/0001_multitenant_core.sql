DROP TABLE IF EXISTS `results`;
DROP TABLE IF EXISTS `enrollments`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `students`;
DROP TABLE IF EXISTS `subjects`;
DROP TABLE IF EXISTS `classes`;
DROP TABLE IF EXISTS `terms`;
DROP TABLE IF EXISTS `sessions`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `schools`;

CREATE TABLE `schools` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `address` text,
  `logo_url` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE TABLE `users` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` text NOT NULL,
  `name` text NOT NULL,
  `email` text NOT NULL,
  `password_hash` text NOT NULL,
  `role` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade
);

CREATE TABLE `sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` text NOT NULL,
  `year` text NOT NULL,
  `is_current` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade
);

CREATE TABLE `terms` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` text NOT NULL,
  `session_id` text NOT NULL,
  `name` text NOT NULL,
  `is_current` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade,
  FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE cascade
);

CREATE TABLE `classes` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` text NOT NULL,
  `name` text NOT NULL,
  `level` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade
);

CREATE TABLE `students` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` text NOT NULL,
  `first_name` text NOT NULL,
  `last_name` text NOT NULL,
  `admission_number` text NOT NULL,
  `gender` text,
  `date_of_birth` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade
);

CREATE TABLE `subjects` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` text NOT NULL,
  `name` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade
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

CREATE TABLE `audit_logs` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` text NOT NULL,
  `actor_id` text,
  `action` text NOT NULL,
  `meta_json` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade,
  FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE set null
);

CREATE UNIQUE INDEX `users_school_email_unique` ON `users` (`school_id`, `email`);
CREATE INDEX `users_school_idx` ON `users` (`school_id`);

CREATE UNIQUE INDEX `sessions_school_year_unique` ON `sessions` (`school_id`, `year`);
CREATE UNIQUE INDEX `sessions_current_per_school_unique` ON `sessions` (`school_id`) WHERE `is_current` = 1;
CREATE INDEX `sessions_school_current_idx` ON `sessions` (`school_id`, `is_current`);

CREATE UNIQUE INDEX `terms_session_name_unique` ON `terms` (`session_id`, `name`);
CREATE UNIQUE INDEX `terms_current_per_session_unique` ON `terms` (`session_id`) WHERE `is_current` = 1;
CREATE INDEX `terms_school_session_current_idx` ON `terms` (`school_id`, `session_id`, `is_current`);

CREATE UNIQUE INDEX `classes_school_name_unique` ON `classes` (`school_id`, `name`);
CREATE INDEX `classes_school_level_idx` ON `classes` (`school_id`, `level`);

CREATE UNIQUE INDEX `students_school_admission_unique` ON `students` (`school_id`, `admission_number`);
CREATE INDEX `students_school_admission_idx` ON `students` (`school_id`, `admission_number`);

CREATE UNIQUE INDEX `subjects_school_name_unique` ON `subjects` (`school_id`, `name`);

CREATE UNIQUE INDEX `enrollments_unique` ON `enrollments` (`student_id`, `class_id`, `session_id`, `term_id`);
CREATE INDEX `enrollments_student_session_term_idx` ON `enrollments` (`school_id`, `student_id`, `session_id`, `term_id`);

CREATE UNIQUE INDEX `results_unique` ON `results` (`student_id`, `subject_id`, `class_id`, `session_id`, `term_id`);
CREATE INDEX `results_student_idx` ON `results` (`school_id`, `student_id`, `session_id`, `term_id`);
CREATE INDEX `results_class_idx` ON `results` (`school_id`, `class_id`, `session_id`, `term_id`);
CREATE INDEX `results_subject_idx` ON `results` (`school_id`, `subject_id`, `session_id`, `term_id`);

CREATE INDEX `audit_school_created_idx` ON `audit_logs` (`school_id`, `created_at`);
