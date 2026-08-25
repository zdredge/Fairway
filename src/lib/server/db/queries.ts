import { and, desc, eq } from 'drizzle-orm';
import { db } from './index';
import {
	courses,
	holes,
	rounds,
	scoring,
	sessions,
	users,
	type Course,
	type Hole,
	type NewScoring,
	type Round,
	type SafeUser,
	type Scoring,
	type Session,
	type User
} from './schema';

// ---- users ----

export async function createUser(input: {
	email: string;
	displayName: string;
	passwordHash: string;
}): Promise<User> {
	const [user] = await db.insert(users).values(input).returning();
	return user;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
	return db.query.users.findFirst({ where: eq(users.email, email) });
}

// ---- sessions ----

export async function insertSession(session: Session): Promise<void> {
	await db.insert(sessions).values(session);
}

export type SessionWithUser = Session & { user: SafeUser };

export async function getSessionWithUser(id: string): Promise<SessionWithUser | undefined> {
	const row = await db.query.sessions.findFirst({
		where: eq(sessions.id, id),
		with: { user: { columns: { id: true, email: true, displayName: true } } }
	});
	return row as SessionWithUser | undefined;
}

export async function deleteSession(id: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.id, id));
}

export async function refreshSessionExpiry(id: string, expiresAt: Date): Promise<void> {
	await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id));
}

// ---- courses ----

export interface CreateCourseInput {
	userId: string;
	name: string;
	holes: Array<{ number: number; par: number; yardage?: number }>;
}

export type CourseWithHoles = Course & { holes: Hole[] };

export function createCourse(input: CreateCourseInput): CourseWithHoles {
	return db.transaction((tx) => {
		const course = tx
			.insert(courses)
			.values({ userId: input.userId, name: input.name, holeCount: input.holes.length })
			.returning()
			.get();
		const courseHoles = tx
			.insert(holes)
			.values(input.holes.map((hole) => ({ ...hole, courseId: course.id })))
			.returning()
			.all();
		return { ...course, holes: courseHoles };
	});
}

export async function listCourses(userId: string): Promise<Course[]> {
	return db.query.courses.findMany({ where: eq(courses.userId, userId), orderBy: courses.name });
}

export async function getCourse(id: string): Promise<CourseWithHoles | undefined> {
	return db.query.courses.findFirst({
		where: eq(courses.id, id),
		with: { holes: { orderBy: holes.number } }
	});
}

// ---- rounds ----

export interface CreateRoundInput {
	userId: string;
	courseId: string;
	holeCount: number;
	tee?: string;
	playedOn?: Date;
}

export type RoundWithCourse = Round & { course: Course };
export type RoundWithDetails = Round & { course: CourseWithHoles; scorings: Scoring[] };

export async function createRound(input: CreateRoundInput): Promise<Round> {
	const [round] = await db.insert(rounds).values(input).returning();
	return round;
}

export async function listRounds(userId: string): Promise<RoundWithCourse[]> {
	return db.query.rounds.findMany({
		where: eq(rounds.userId, userId),
		orderBy: desc(rounds.playedOn),
		with: { course: true }
	});
}

/** All of a user's rounds (newest first) with holes + scorings — for history summaries. */
export async function listRoundSummaries(userId: string): Promise<RoundWithDetails[]> {
	return db.query.rounds.findMany({
		where: eq(rounds.userId, userId),
		orderBy: desc(rounds.playedOn),
		with: {
			course: { with: { holes: { orderBy: holes.number } } },
			scorings: { orderBy: scoring.holeNumber }
		}
	});
}

export async function getRound(id: string): Promise<RoundWithDetails | undefined> {
	return db.query.rounds.findFirst({
		where: eq(rounds.id, id),
		with: {
			course: { with: { holes: { orderBy: holes.number } } },
			scorings: { orderBy: scoring.holeNumber }
		}
	});
}

/** Completed rounds with their scorings and course holes — the raw input for stats. */
export async function listCompletedRoundsWithScorings(userId: string): Promise<RoundWithDetails[]> {
	return db.query.rounds.findMany({
		where: and(eq(rounds.userId, userId), eq(rounds.status, 'complete')),
		with: {
			course: { with: { holes: { orderBy: holes.number } } },
			scorings: { orderBy: scoring.holeNumber }
		}
	});
}

export async function completeRound(id: string): Promise<Round | undefined> {
	const [round] = await db
		.update(rounds)
		.set({ status: 'complete' })
		.where(eq(rounds.id, id))
		.returning();
	return round;
}

// ---- scorings ----

/** Insert or replace the scoring for a hole (re-scoring a hole overwrites it). */
export async function saveScoring(input: NewScoring): Promise<Scoring> {
	const [saved] = await db
		.insert(scoring)
		.values(input)
		.onConflictDoUpdate({
			target: [scoring.roundId, scoring.holeNumber],
			set: {
				strokes: input.strokes,
				putts: input.putts,
				fairwayHit: input.fairwayHit,
				penalties: input.penalties ?? 0,
				penaltyType: input.penaltyType ?? null
			}
		})
		.returning();
	return saved;
}
