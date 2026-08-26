import type { ApiRoundSummary, ApiScoring, RoundStatus, ScoringFacts } from '$lib/types';

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

/**
 * Overlay a queued completion onto a round's status: a round finished offline
 * reads as 'complete' even though the server hasn't seen the PATCH yet. Never
 * downgrades — a server-complete round stays complete.
 */
export function applyPendingComplete(
	status: RoundStatus,
	hasPendingComplete: boolean
): RoundStatus {
	return hasPendingComplete ? 'complete' : status;
}

/**
 * Overlay pending outbox state onto one round summary for the history list.
 * Flips status when a completion is queued and reports how many of this round's
 * holes are still unsynced (`pendingSync`). Stroke/par totals are intentionally
 * left untouched — the summary lacks per-hole pars and can't tell a re-score from
 * a new hole, so exact totals reconcile on sync; the merged scorecard on the
 * round page is the accurate offline view. Pure, so it's unit-testable.
 */
export function overlayRoundSummary(
	summary: ApiRoundSummary,
	pending: { pendingScoreHoles: number[]; hasPendingComplete: boolean }
): ApiRoundSummary {
	const pendingSync = pending.pendingScoreHoles.length;
	if (pendingSync === 0 && !pending.hasPendingComplete) return summary;
	return {
		...summary,
		status: applyPendingComplete(summary.status, pending.hasPendingComplete),
		pendingSync
	};
}

/**
 * Pick which round is "current" for the list badge / resume affordance. Prefers
 * the round the user last opened (`activeId`) when it's present and still in
 * progress; otherwise the most-recent in-progress round (the list is ordered
 * newest-first). Returns null when nothing is in progress. Pure/testable.
 */
export function pickCurrentRoundId(
	rounds: ApiRoundSummary[],
	activeId: string | null
): string | null {
	if (activeId) {
		const active = rounds.find((r) => r.id === activeId);
		if (active && active.status !== 'complete') return active.id;
	}
	return rounds.find((r) => r.status !== 'complete')?.id ?? null;
}
