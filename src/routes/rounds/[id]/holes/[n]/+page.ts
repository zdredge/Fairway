import { error, redirect } from '@sveltejs/kit';
import { browser } from '$app/environment';
import type { PageLoad } from './$types';
import { apiFetch, ApiError } from '$lib/api';
import { resolve } from '$app/paths';
import { mergeScorings } from '$lib/offline/merge';
import { pendingScores } from '$lib/offline/outbox';
import type { ApiRoundDetail } from '$lib/types';

export const load: PageLoad = async ({ fetch, params }) => {
	const holeNumber = Number(params.n);
	if (!Number.isInteger(holeNumber) || holeNumber < 1) error(404, 'Hole not found');

	let round: ApiRoundDetail;
	try {
		round = await apiFetch<ApiRoundDetail>(fetch, `/api/rounds/${params.id}`);
	} catch (err) {
		if (err instanceof ApiError && err.status === 404) error(404, 'Round not found');
		throw err;
	}

	// Overlay pending offline scorings so re-scoring a queued hole opens prefilled.
	if (browser) round.scorings = mergeScorings(round.scorings, await pendingScores(round.id));

	// A completed round can't be scored — send the user back to the read-only hub.
	if (round.status === 'complete') redirect(303, resolve('/rounds/[id]', { id: params.id }));

	const hole = round.course.holes.find((h) => h.number === holeNumber);
	if (!hole || holeNumber > round.holeCount) error(404, 'Hole not found');

	const existing = round.scorings.find((s) => s.holeNumber === holeNumber);

	return { round, holeNumber, par: hole.par, existing };
};
