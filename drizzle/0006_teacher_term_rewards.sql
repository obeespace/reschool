PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS `teacher_reward_winners` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` text NOT NULL,
  `term_id` text NOT NULL,
  `teacher_id` text NOT NULL,
  `rank` integer NOT NULL,
  `points` real NOT NULL,
  `breakdown_json` text NOT NULL DEFAULT '{}',
  `finalized_by` text NOT NULL,
  `note` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade,
  FOREIGN KEY (`term_id`) REFERENCES `terms`(`id`) ON DELETE cascade,
  FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`) ON DELETE cascade,
  FOREIGN KEY (`finalized_by`) REFERENCES `users`(`id`) ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS `teacher_reward_term_teacher_unique` ON `teacher_reward_winners` (`school_id`, `term_id`, `teacher_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `teacher_reward_term_rank_unique` ON `teacher_reward_winners` (`school_id`, `term_id`, `rank`);
CREATE INDEX IF NOT EXISTS `teacher_reward_term_idx` ON `teacher_reward_winners` (`school_id`, `term_id`, `rank`);
