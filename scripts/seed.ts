import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from '../src/lib/server/db';
import { courses } from '../src/lib/server/db/schema';
import { createCourse, createUser, getUserByEmail } from '../src/lib/server/db/queries';
import { hashPassword } from '../src/lib/server/password';

const DEV_USER_EMAIL = 'dev@fairway.local';
const DEV_USER_PASSWORD = 'password123';
const SAMPLE_COURSE_NAME = 'Pebble Creek (Sample)';

// A par-72 18-hole layout: [par, yardage] per hole.
const SAMPLE_HOLES: Array<[number, number]> = [
	[4, 380],
	[4, 410],
	[3, 165],
	[5, 520],
	[4, 355],
	[4, 395],
	[3, 180],
	[4, 420],
	[5, 495],
	[4, 370],
	[3, 150],
	[4, 400],
	[5, 540],
	[4, 385],
	[4, 415],
	[3, 190],
	[5, 505],
	[4, 360]
];

async function seed() {
	let user = await getUserByEmail(DEV_USER_EMAIL);
	if (user) {
		console.log(`Dev user already present: ${user.email}`);
	} else {
		user = await createUser({
			email: DEV_USER_EMAIL,
			displayName: 'Dev User',
			passwordHash: await hashPassword(DEV_USER_PASSWORD)
		});
		console.log(`Created dev user: ${user.email} (password: ${DEV_USER_PASSWORD})`);
	}

	const existingCourse = await db.query.courses.findFirst({
		where: eq(courses.name, SAMPLE_COURSE_NAME)
	});
	if (existingCourse) {
		console.log(`Sample course already present: ${existingCourse.name}`);
	} else {
		const course = await createCourse({
			userId: user.id,
			name: SAMPLE_COURSE_NAME,
			holes: SAMPLE_HOLES.map(([par, yardage], i) => ({ number: i + 1, par, yardage }))
		});
		const totalPar = course.holes.reduce((sum, hole) => sum + hole.par, 0);
		console.log(
			`Created sample course: ${course.name} (${course.holeCount} holes, par ${totalPar})`
		);
	}

	console.log('Seed complete.');
}

seed().catch((err) => {
	console.error('Seed failed:', err);
	process.exit(1);
});
