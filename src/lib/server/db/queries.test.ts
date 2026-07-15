import { beforeAll, describe, expect, test } from 'vitest';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { count, eq } from 'drizzle-orm';
import { db } from './index';
import { courses, holes, scoring } from './schema';
import {
	completeRound,
	createCourse,
	createRound,
	createUser,
	getCourse,
	getRound,
	getUserByEmail,
	saveScoring
} from './queries';

// The real committed migrations, applied to the in-memory DB from
// vitest-setup.server.ts — so these tests exercise drizzle/0000_init.sql,
// not a parallel schema definition.
beforeAll(() => {
	migrate(db, { migrationsFolder: 'drizzle' });
});

const threeHoles = [
	{ number: 2, par: 4, yardage: 380 },
	{ number: 1, par: 3, yardage: 160 },
	{ number: 3, par: 5 } // yardage optional
];

async function makeRound() {
	const user = await createUser({
		email: `golfer-${crypto.randomUUID()}@test.local`,
		displayName: 'Test Golfer'
	});
	const course = createCourse({ name: 'Round Course', holes: threeHoles });
	const round = await createRound({ userId: user.id, courseId: course.id, holeCount: 3 });
	return { user, course, round };
}

describe('users', () => {
	test('create and fetch by email', async () => {
		const created = await createUser({ email: 'dev@test.local', displayName: 'Dev' });
		const fetched = await getUserByEmail('dev@test.local');
		expect(fetched?.id).toBe(created.id);
	});

	test('duplicate email is rejected', async () => {
		await createUser({ email: 'dupe@test.local', displayName: 'First' });
		await expect(createUser({ email: 'dupe@test.local', displayName: 'Second' })).rejects.toThrow(
			/UNIQUE/i
		);
	});
});

describe('courses', () => {
	test('createCourse → getCourse round-trips holes in number order', async () => {
		const created = createCourse({ name: 'Trip Course', holes: threeHoles });
		expect(created.holeCount).toBe(3);

		const fetched = await getCourse(created.id);
		expect(fetched).toBeDefined();
		expect(fetched!.holes.map((h) => h.number)).toEqual([1, 2, 3]);
		expect(fetched!.holes.map((h) => h.par)).toEqual([3, 4, 5]);
		expect(fetched!.holes[2].yardage).toBeNull();
	});

	test('duplicate hole number within a course is rejected', async () => {
		const course = createCourse({ name: 'Dupe Hole Course', holes: threeHoles });
		await expect(
			db.insert(holes).values({ courseId: course.id, number: 1, par: 4 })
		).rejects.toThrow(/UNIQUE/i);
	});

	test('deleting a course cascades to its holes', async () => {
		const course = createCourse({ name: 'Doomed Course', holes: threeHoles });
		await db.delete(courses).where(eq(courses.id, course.id));
		const [remaining] = await db
			.select({ n: count() })
			.from(holes)
			.where(eq(holes.courseId, course.id));
		expect(remaining.n).toBe(0);
	});
});

describe('rounds & scoring', () => {
	test('saveScoring twice for the same hole updates in place', async () => {
		const { round } = await makeRound();

		const first = await saveScoring({
			roundId: round.id,
			holeNumber: 1,
			strokes: 5,
			putts: 3,
			fairwayHit: 'na',
			penalties: 0
		});
		const second = await saveScoring({
			roundId: round.id,
			holeNumber: 1,
			strokes: 4,
			putts: 2,
			fairwayHit: 'na',
			penalties: 1,
			penaltyType: 'water_hazard'
		});

		const [rows] = await db
			.select({ n: count() })
			.from(scoring)
			.where(eq(scoring.roundId, round.id));
		expect(rows.n).toBe(1);
		expect(second.id).toBe(first.id);
		expect(second.strokes).toBe(4);
		expect(second.penaltyType).toBe('water_hazard');
	});

	test('getRound returns course holes and scorings in order', async () => {
		const { round, course } = await makeRound();
		await saveScoring({
			roundId: round.id,
			holeNumber: 2,
			strokes: 5,
			putts: 2,
			fairwayHit: 'left',
			penalties: 0
		});
		await saveScoring({
			roundId: round.id,
			holeNumber: 1,
			strokes: 3,
			putts: 2,
			fairwayHit: 'na',
			penalties: 0
		});

		const fetched = await getRound(round.id);
		expect(fetched).toBeDefined();
		expect(fetched!.course.id).toBe(course.id);
		expect(fetched!.course.holes.map((h) => h.number)).toEqual([1, 2, 3]);
		expect(fetched!.scorings.map((s) => s.holeNumber)).toEqual([1, 2]);
	});

	test('completeRound flips status', async () => {
		const { round } = await makeRound();
		expect(round.status).toBe('in_progress');
		const completed = await completeRound(round.id);
		expect(completed?.status).toBe('complete');
	});
});
