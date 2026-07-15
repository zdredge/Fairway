import 'dotenv/config';
import { getCourse, getUserByEmail, listCourses } from '../src/lib/server/db/queries';

// Phase 1 "done when" check: reads a course and its holes back through the query helpers.
async function check() {
	const user = await getUserByEmail('dev@fairway.local');
	if (!user) throw new Error('Dev user not found — run `npm run db:seed` first.');
	console.log(`User:   ${user.displayName} <${user.email}>`);

	const allCourses = await listCourses();
	if (allCourses.length === 0) throw new Error('No courses found — run `npm run db:seed` first.');

	const course = await getCourse(allCourses[0].id);
	if (!course) throw new Error('Course lookup by id failed.');
	if (course.holes.length !== course.holeCount) {
		throw new Error(`Expected ${course.holeCount} holes, got ${course.holes.length}.`);
	}

	const totalPar = course.holes.reduce((sum, hole) => sum + hole.par, 0);
	console.log(`Course: ${course.name} — ${course.holeCount} holes, par ${totalPar}`);
	for (const hole of course.holes) {
		console.log(`  #${String(hole.number).padStart(2)}  par ${hole.par}  ${hole.yardage} yds`);
	}

	console.log('DB check passed.');
}

check().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});
