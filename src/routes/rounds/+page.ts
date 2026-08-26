import type { PageLoad } from './$types';
import { browser } from '$app/environment';
import { apiFetch, ApiError } from '$lib/api';
import { overlayRoundSummary } from '$lib/offline/merge';
import { pendingCompletes, pendingScoreHolesByRound } from '$lib/offline/outbox';
import type { ApiRoundSummary } from '$lib/types';

export const load: PageLoad = async ({ fetch }) => {
	let rounds: ApiRoundSummary[];
	try {
		rounds = await apiFetch<ApiRoundSummary[]>(fetch, '/api/rounds');
	} catch (err) {
		// Offline with no cached list (never visited online): show an offline notice
		// instead of the error page. The global "Resume round" pill still gets the
		// user back to their in-progress round.
		const offlineMiss = err instanceof ApiError && err.status === 503;
		if (browser && (offlineMiss || !navigator.onLine)) return { rounds: [], offline: true };
		throw err;
	}

	// Overlay the offline outbox so rounds scored/finished offline don't look stale:
	// flip status for queued completions and surface a per-round unsynced count.
	if (browser) {
		const holesByRound = await pendingScoreHolesByRound();
		const completed = new Set(await pendingCompletes());
		return {
			offline: false,
			rounds: rounds.map((r) =>
				overlayRoundSummary(r, {
					pendingScoreHoles: holesByRound.get(r.id) ?? [],
					hasPendingComplete: completed.has(r.id)
				})
			)
		};
	}

	return { rounds, offline: false };
};
