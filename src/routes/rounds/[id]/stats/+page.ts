import { error } from '@sveltejs/kit';
import { browser } from '$app/environment';
import type { PageLoad } from './$types';
import { apiFetch, ApiError } from '$lib/api';
import { mergeScorings } from '$lib/offline/merge';
import { pendingScores } from '$lib/offline/outbox';
import type { ApiRoundDetail } from '$lib/types';

export const load: PageLoad = async ({ fetch, params }) => {
	try {
		const round = await apiFetch<ApiRoundDetail>(fetch, `/api/rounds/${params.id}`);
		// Overlay queued scorings so holes scored offline are counted in the stats.
		if (browser) round.scorings = mergeScorings(round.scorings, await pendingScores(round.id));
		return { round };
	} catch (err) {
		if (err instanceof ApiError && err.status === 404) error(404, 'Round not found');
		throw err;
	}
};
