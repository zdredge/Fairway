import type { ApiScoring, ScoringFacts } from '$lib/types';

/** A scoring still waiting in the outbox (no server id yet). */
export interface PendingScore {
	holeNumber: number;
	facts: ScoringFacts;
}

/**
 * Overlay pending (not-yet-synced) scorings onto the server's list, keyed by
 * hole number — pending wins, matching the server's per-hole upsert. Pure so it
 * can be unit-tested without IndexedDB.
 */
export function mergeScorings(serverScorings: ApiScoring[], pending: PendingScore[]): ApiScoring[] {
	if (pending.length === 0) return serverScorings;

	const byHole = new Map<number, ApiScoring>();
	for (const s of serverScorings) byHole.set(s.holeNumber, s);

	for (const p of pending) {
		const existing = byHole.get(p.holeNumber);
		byHole.set(p.holeNumber, {
			// Keep the server id when re-scoring a synced hole; use a local marker otherwise.
			id: existing?.id ?? `pending:${p.holeNumber}`,
			roundId: existing?.roundId ?? '',
			holeNumber: p.holeNumber,
			...p.facts
		});
	}

	return [...byHole.values()].sort((a, b) => a.holeNumber - b.holeNumber);
}
