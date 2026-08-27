// The offline write queue. Scorings (and a round's completion) are recorded here
// first, then sent to the API; anything that couldn't send stays queued and is
// flushed on reconnect. Client-only — call these behind a `browser` guard.
import { apiFetch, ApiError } from '$lib/api';
import type { ScoringFacts } from '$lib/types';
import { idbDelete, idbGetAll, idbPut } from './db';
import type { PendingScore } from './merge';

interface ScoreEntry {
	key: string; // score:{roundId}:{hole}
	type: 'score';
	roundId: string;
	holeNumber: number;
	facts: ScoringFacts;
	queuedAt: number;
}

interface CompleteEntry {
	key: string; // complete:{roundId}
	type: 'complete';
	roundId: string;
	queuedAt: number;
}

type OutboxEntry = ScoreEntry | CompleteEntry;

const scoreKey = (roundId: string, hole: number) => `score:${roundId}:${hole}`;
const completeKey = (roundId: string) => `complete:${roundId}`;

async function allEntries(): Promise<OutboxEntry[]> {
	const entries = await idbGetAll<OutboxEntry>();
	return entries.sort((a, b) => a.queuedAt - b.queuedAt);
}

/** Pending scorings for one round, for merging into the displayed scorecard. */
export async function pendingScores(roundId: string): Promise<PendingScore[]> {
	const entries = await idbGetAll<OutboxEntry>();
	return entries
		.filter((e): e is ScoreEntry => e.type === 'score' && e.roundId === roundId)
		.map((e) => ({ holeNumber: e.holeNumber, facts: e.facts }));
}

/** Round ids with a queued completion, for overlaying "complete" status offline. */
export async function pendingCompletes(): Promise<string[]> {
	const entries = await idbGetAll<OutboxEntry>();
	return entries.filter((e): e is CompleteEntry => e.type === 'complete').map((e) => e.roundId);
}

/**
 * Queued score-hole numbers grouped by round id — lets the rounds list show a
 * per-round "unsynced" count without fetching each round's detail.
 */
export async function pendingScoreHolesByRound(): Promise<Map<string, number[]>> {
	const entries = await idbGetAll<OutboxEntry>();
	const byRound = new Map<string, number[]>();
	for (const e of entries) {
		if (e.type !== 'score') continue;
		const holes = byRound.get(e.roundId) ?? [];
		holes.push(e.holeNumber);
		byRound.set(e.roundId, holes);
	}
	return byRound;
}

/** Total number of entries still waiting to sync, for the status indicator. */
export async function pendingCount(): Promise<number> {
	return (await idbGetAll<OutboxEntry>()).length;
}

/**
 * Record a hole: queue it durably, then try to send. A real server rejection
 * (ApiError) is surfaced; a network failure leaves it queued and resolves
 * optimistically so scoring continues offline.
 */
export async function saveScoring(
	roundId: string,
	holeNumber: number,
	facts: ScoringFacts,
	fetchFn: typeof fetch
): Promise<void> {
	const key = scoreKey(roundId, holeNumber);
	await idbPut<ScoreEntry>({
		key,
		type: 'score',
		roundId,
		holeNumber,
		facts,
		queuedAt: Date.now()
	});

	try {
		await apiFetch(fetchFn, `/api/rounds/${roundId}/scores`, {
			method: 'POST',
			body: { holeNumber, ...facts }
		});
		await idbDelete(key);
	} catch (err) {
		if (err instanceof ApiError) {
			await idbDelete(key); // the server saw it and refused — don't keep retrying
			throw err;
		}
		// Network failure: keep it queued, carry on.
	}
}

/** Mark a round complete, queuing it if the network is down. */
export async function queueComplete(roundId: string): Promise<void> {
	await idbPut<CompleteEntry>({
		key: completeKey(roundId),
		type: 'complete',
		roundId,
		queuedAt: Date.now()
	});
}

/** Replay the outbox oldest-first. Stops on the first network/401 failure. */
export async function flush(fetchFn: typeof fetch): Promise<{ sent: number; remaining: number }> {
	let sent = 0;
	for (const entry of await allEntries()) {
		try {
			if (entry.type === 'score') {
				await apiFetch(fetchFn, `/api/rounds/${entry.roundId}/scores`, {
					method: 'POST',
					body: { holeNumber: entry.holeNumber, ...entry.facts }
				});
			} else {
				await apiFetch(fetchFn, `/api/rounds/${entry.roundId}`, {
					method: 'PATCH',
					body: { status: 'complete' }
				});
			}
			await idbDelete(entry.key);
			sent += 1;
		} catch (err) {
			if (err instanceof ApiError) {
				if (err.status === 401) break; // signed out — retry after re-login
				// Other 4xx (e.g. round already complete): drop it, it's not retryable.
				await idbDelete(entry.key);
				console.warn(`Dropped un-syncable outbox entry ${entry.key}: ${err.message}`);
				continue;
			}
			break; // still offline
		}
	}
	const remaining = (await idbGetAll<OutboxEntry>()).length;
	return { sent, remaining };
}
