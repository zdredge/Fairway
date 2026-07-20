import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { apiFetch, ApiError } from '$lib/api';
import type { ApiRoundDetail } from '$lib/types';

export const load: PageLoad = async ({ fetch, params }) => {
	try {
		return { round: await apiFetch<ApiRoundDetail>(fetch, `/api/rounds/${params.id}`) };
	} catch (err) {
		if (err instanceof ApiError && err.status === 404) error(404, 'Round not found');
		throw err;
	}
};
