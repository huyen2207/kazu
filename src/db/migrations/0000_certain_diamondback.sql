CREATE TABLE `answer_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text,
	`question_id` text NOT NULL,
	`selected_answer` text NOT NULL,
	`correct_answer` text NOT NULL,
	`is_correct` integer NOT NULL,
	`response_time_seconds` real NOT NULL,
	`answered_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `study_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_answers_question` ON `answer_history` (`question_id`);--> statement-breakpoint
CREATE INDEX `idx_answers_session` ON `answer_history` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_answers_answered_at` ON `answer_history` (`answered_at`);--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`sentence` text NOT NULL,
	`choices` text NOT NULL,
	`correct_choice` text NOT NULL,
	`translation_jp` text NOT NULL,
	`explanation_jp` text NOT NULL,
	`choice_explanations` text NOT NULL,
	`vocabulary` text NOT NULL,
	`grammar` text NOT NULL,
	`collocations` text,
	`level` text DEFAULT 'A2' NOT NULL,
	`difficulty` text NOT NULL,
	`category` text NOT NULL,
	`target_vocabulary` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_questions_category` ON `questions` (`category`);--> statement-breakpoint
CREATE INDEX `idx_questions_target_vocabulary` ON `questions` (`target_vocabulary`);--> statement-breakpoint
CREATE TABLE `study_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text NOT NULL,
	`question_count` integer NOT NULL,
	`correct_count` integer NOT NULL,
	`wrong_count` integer NOT NULL,
	`accuracy` real NOT NULL,
	`studied_vocabulary` text DEFAULT '[]' NOT NULL,
	`wrong_vocabulary` text DEFAULT '[]' NOT NULL,
	`study_time_seconds` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_started_at` ON `study_sessions` (`started_at`);--> statement-breakpoint
CREATE TABLE `vocabulary_confusions` (
	`target_vocabulary_id` text NOT NULL,
	`confused_vocabulary_id` text NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	`last_occurred_at` text NOT NULL,
	PRIMARY KEY(`target_vocabulary_id`, `confused_vocabulary_id`),
	FOREIGN KEY (`target_vocabulary_id`) REFERENCES `vocabulary_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`confused_vocabulary_id`) REFERENCES `vocabulary_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `vocabulary_items` (
	`id` text PRIMARY KEY NOT NULL,
	`vietnamese` text NOT NULL,
	`normalized_vietnamese` text NOT NULL,
	`japanese_meaning` text NOT NULL,
	`part_of_speech` text NOT NULL,
	`level` text NOT NULL,
	`category` text NOT NULL,
	`example_sentence` text,
	`example_japanese` text,
	`collocations` text,
	`synonyms` text,
	`antonyms` text,
	`status` text DEFAULT 'new' NOT NULL,
	`exposure_count` integer DEFAULT 0 NOT NULL,
	`quiz_correct_count` integer DEFAULT 0 NOT NULL,
	`quiz_wrong_count` integer DEFAULT 0 NOT NULL,
	`flashcard_correct_count` integer DEFAULT 0 NOT NULL,
	`flashcard_wrong_count` integer DEFAULT 0 NOT NULL,
	`consecutive_correct` integer DEFAULT 0 NOT NULL,
	`consecutive_wrong` integer DEFAULT 0 NOT NULL,
	`mastery_score` integer DEFAULT 0 NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text,
	`last_reviewed_at` text,
	`next_review_at` text,
	`source_question_ids` text DEFAULT '[]' NOT NULL,
	`review_priority` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_vocabulary_normalized` ON `vocabulary_items` (`normalized_vietnamese`);--> statement-breakpoint
CREATE INDEX `idx_vocabulary_status` ON `vocabulary_items` (`status`);--> statement-breakpoint
CREATE INDEX `idx_vocabulary_next_review` ON `vocabulary_items` (`next_review_at`);--> statement-breakpoint
CREATE INDEX `idx_vocabulary_review_priority` ON `vocabulary_items` (`review_priority`);--> statement-breakpoint
CREATE TABLE `vocabulary_review_history` (
	`id` text PRIMARY KEY NOT NULL,
	`vocabulary_id` text NOT NULL,
	`review_type` text NOT NULL,
	`result` text NOT NULL,
	`reviewed_at` text NOT NULL,
	`previous_mastery_score` integer NOT NULL,
	`new_mastery_score` integer NOT NULL,
	`next_review_at` text NOT NULL,
	FOREIGN KEY (`vocabulary_id`) REFERENCES `vocabulary_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_review_history_vocabulary` ON `vocabulary_review_history` (`vocabulary_id`);--> statement-breakpoint
CREATE INDEX `idx_review_history_reviewed_at` ON `vocabulary_review_history` (`reviewed_at`);--> statement-breakpoint
CREATE TABLE `vocabulary_senses` (
	`sense_id` text PRIMARY KEY NOT NULL,
	`vocabulary_id` text NOT NULL,
	`meaning_jp` text NOT NULL,
	`part_of_speech` text NOT NULL,
	`example_sentence` text NOT NULL,
	`category` text,
	FOREIGN KEY (`vocabulary_id`) REFERENCES `vocabulary_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_senses_vocabulary` ON `vocabulary_senses` (`vocabulary_id`);