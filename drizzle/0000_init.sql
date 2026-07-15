CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`hole_count` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `holes` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`number` integer NOT NULL,
	`par` integer NOT NULL,
	`yardage` integer,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `holes_course_number_idx` ON `holes` (`course_id`,`number`);--> statement-breakpoint
CREATE TABLE `rounds` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`course_id` text NOT NULL,
	`tee` text,
	`played_on` integer NOT NULL,
	`hole_count` integer NOT NULL,
	`status` text DEFAULT 'in_progress' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `scoring` (
	`id` text PRIMARY KEY NOT NULL,
	`round_id` text NOT NULL,
	`hole_number` integer NOT NULL,
	`strokes` integer NOT NULL,
	`putts` integer NOT NULL,
	`fairway_hit` text NOT NULL,
	`penalties` integer DEFAULT 0 NOT NULL,
	`penalty_type` text,
	FOREIGN KEY (`round_id`) REFERENCES `rounds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scoring_round_hole_idx` ON `scoring` (`round_id`,`hole_number`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);