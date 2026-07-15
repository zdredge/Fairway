import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
// Relative import (not $lib) — drizzle-kit and the tsx scripts don't resolve SvelteKit aliases.
import { fairwayHitValues, penaltyTypeValues } from '../../types';

export { fairwayHitValues, penaltyTypeValues };
export type { FairwayHit, PenaltyType } from '../../types';

export const roundStatusValues = ['in_progress', 'complete'] as const;
export type RoundStatus = (typeof roundStatusValues)[number];

const id = () =>
	text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
	integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date());

export const users = sqliteTable('users', {
	id: id(),
	email: text('email').notNull().unique(),
	displayName: text('display_name').notNull(),
	createdAt: createdAt()
});

export const courses = sqliteTable('courses', {
	id: id(),
	name: text('name').notNull(),
	holeCount: integer('hole_count').notNull(),
	createdAt: createdAt()
});

export const holes = sqliteTable(
	'holes',
	{
		id: id(),
		courseId: text('course_id')
			.notNull()
			.references(() => courses.id, { onDelete: 'cascade' }),
		number: integer('number').notNull(),
		par: integer('par').notNull(),
		yardage: integer('yardage')
	},
	(table) => [uniqueIndex('holes_course_number_idx').on(table.courseId, table.number)]
);

export const rounds = sqliteTable('rounds', {
	id: id(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	courseId: text('course_id')
		.notNull()
		.references(() => courses.id),
	tee: text('tee'),
	playedOn: integer('played_on', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	// 9 or 18 — how many holes this round covers, independent of the course's hole count
	holeCount: integer('hole_count').notNull(),
	status: text('status', { enum: roundStatusValues }).notNull().default('in_progress')
});

export const scoring = sqliteTable(
	'scoring',
	{
		id: id(),
		roundId: text('round_id')
			.notNull()
			.references(() => rounds.id, { onDelete: 'cascade' }),
		holeNumber: integer('hole_number').notNull(),
		strokes: integer('strokes').notNull(),
		putts: integer('putts').notNull(),
		fairwayHit: text('fairway_hit', { enum: fairwayHitValues }).notNull(),
		penalties: integer('penalties').notNull().default(0),
		penaltyType: text('penalty_type', { enum: penaltyTypeValues })
	},
	(table) => [uniqueIndex('scoring_round_hole_idx').on(table.roundId, table.holeNumber)]
);

export const usersRelations = relations(users, ({ many }) => ({
	rounds: many(rounds)
}));

export const coursesRelations = relations(courses, ({ many }) => ({
	holes: many(holes),
	rounds: many(rounds)
}));

export const holesRelations = relations(holes, ({ one }) => ({
	course: one(courses, { fields: [holes.courseId], references: [courses.id] })
}));

export const roundsRelations = relations(rounds, ({ one, many }) => ({
	user: one(users, { fields: [rounds.userId], references: [users.id] }),
	course: one(courses, { fields: [rounds.courseId], references: [courses.id] }),
	scorings: many(scoring)
}));

export const scoringRelations = relations(scoring, ({ one }) => ({
	round: one(rounds, { fields: [scoring.roundId], references: [rounds.id] })
}));

export type User = typeof users.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Hole = typeof holes.$inferSelect;
export type Round = typeof rounds.$inferSelect;
export type Scoring = typeof scoring.$inferSelect;

export type NewCourse = typeof courses.$inferInsert;
export type NewHole = typeof holes.$inferInsert;
export type NewRound = typeof rounds.$inferInsert;
export type NewScoring = typeof scoring.$inferInsert;
