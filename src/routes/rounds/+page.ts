import type { PageLoad } from './$types';
import { apiFetch } from '$lib/api';
import type { ApiRoundSummary } from '$lib/types';

export const load: PageLoad = async ({ fetch }) => {
	return { rounds: await apiFetch<ApiRoundSummary[]>(fetch, '/api/rounds') };
};
