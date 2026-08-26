import 'dotenv/config';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../src/lib/server/db/index';
import { rounds, scoring, users } from '../src/lib/server/db/schema';

// Delete rounds (and their scorings, via ON DELETE CASCADE) without touching
// users or courses. Scope to one account with `--email you@example.com`;
// with no email it clears every round in the database.
//   npm run db:clear-rounds
//   npm run db:clear-rounds -- --email z.dredge32@gmail.com
async function clearRounds() {
	const emailFlag = process.argv.indexOf('--email');
	const email = emailFlag !== -1 ? process.argv[emailFlag + 1] : undefined;

	let userId: string | undefined;
	if (email) {
		const user = await db.query.users.findFirst({ where: eq(users.email, email) });
		if (!user) throw new Error(`No user with email ${email}.`);
		userId = user.id;
	}

	const toDelete = userId
		? await db.select({ id: rounds.id }).from(rounds).where(eq(rounds.userId, userId))
		: await db.select({ id: rounds.id }).from(rounds);

	if (toDelete.length === 0) {
		console.log(email ? `No rounds for ${email}.` : 'No rounds to clear.');
		return;
	}

	const scoringCount = (
		await db
			.select({ id: scoring.id })
			.from(scoring)
			.where(
				inArray(
					scoring.roundId,
					toDelete.map((r) => r.id)
				)
			)
	).length;

	if (userId) {
		await db.delete(rounds).where(eq(rounds.userId, userId));
	} else {
		await db.delete(rounds);
	}

	const scope = email ? ` for ${email}` : '';
	console.log(
		`Deleted ${toDelete.length} round(s)${scope} (and cascaded ~${scoringCount} scoring row(s)).`
	);
}

clearRounds().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});
