import { error } from '@sveltejs/kit';
import { browser } from '$app/environment';
import type { PageLoad } from './$types';
import { apiFetch, ApiError } from '$lib/api';
import { applyPendingComplete, mergeScorings } from '$lib/offline/merge';
import { pendingCompletes, pendingScores } from '$lib/offline/outbox';
import type { ApiRoundDetail } from '$lib/types';

export const load: PageLoad = async ({ fetch, params }) => {
	try {
		const round = await apiFetch<ApiRoundDetail>(fetch, `/api/rounds/${params.id}`);
		// Overlay the offline outbox so the scorecard is accurate offline: pending
		// scorings, plus a queued completion shows the round as already complete.
		if (browser) {
			round.scorings = mergeScorings(round.scorings, await pendingScores(round.id));
			round.status = applyPendingComplete(
				round.status,
				(await pendingCompletes()).includes(round.id)
			);
		}
		return { round };
	} catch (err) {
		if (err instanceof ApiError && err.status === 404) error(404, 'Round not found');
		throw err;
	}
};
