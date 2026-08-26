import type { PageLoad } from './$types';
import { browser } from '$app/environment';
import { apiFetch } from '$lib/api';
import { overlayRoundSummary } from '$lib/offline/merge';
import { pendingCompletes, pendingScoreHolesByRound } from '$lib/offline/outbox';
import type { ApiRoundSummary } from '$lib/types';

export const load: PageLoad = async ({ fetch }) => {
	const rounds = await apiFetch<ApiRoundSummary[]>(fetch, '/api/rounds');

	// Overlay the offline outbox so rounds scored/finished offline don't look stale:
	// flip status for queued completions and surface a per-round unsynced count.
	if (browser) {
		const holesByRound = await pendingScoreHolesByRound();
		const completed = new Set(await pendingCompletes());
		return {
			rounds: rounds.map((r) =>
				overlayRoundSummary(r, {
					pendingScoreHoles: holesByRound.get(r.id) ?? [],
					hasPendingComplete: completed.has(r.id)
				})
			)
		};
	}

	return { rounds };
};
