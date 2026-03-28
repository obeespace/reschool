PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS `announcements` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` text NOT NULL,
  `created_by` text NOT NULL,
  `announcement_type` text NOT NULL DEFAULT 'GENERAL',
  `target_audience` text NOT NULL DEFAULT 'ALL',
  `class_id` text,
  `title` text NOT NULL,
  `message` text NOT NULL,
  `created_date` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE cascade,
  FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE set null
);

CREATE INDEX IF NOT EXISTS `announcements_school_created_idx` ON `announcements` (`school_id`, `created_date`);
CREATE INDEX IF NOT EXISTS `announcements_audience_idx` ON `announcements` (`school_id`, `target_audience`, `created_date`);
CREATE INDEX IF NOT EXISTS `announcements_class_idx` ON `announcements` (`school_id`, `class_id`, `created_date`);

CREATE TABLE IF NOT EXISTS `announcement_reads` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` text NOT NULL,
  `announcement_id` text NOT NULL,
  `reader_id` text NOT NULL,
  `read_at` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade,
  FOREIGN KEY (`announcement_id`) REFERENCES `announcements`(`id`) ON DELETE cascade,
  FOREIGN KEY (`reader_id`) REFERENCES `users`(`id`) ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS `announcement_reads_unique` ON `announcement_reads` (`school_id`, `announcement_id`, `reader_id`);
CREATE INDEX IF NOT EXISTS `announcement_reads_reader_idx` ON `announcement_reads` (`school_id`, `reader_id`, `read_at`);
