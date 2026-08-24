import type { PageLoad } from './$types';
import { apiFetch } from '$lib/api';
import type { StatsByLength } from '$lib/types';

export const load: PageLoad = async ({ fetch }) => {
	return { stats: await apiFetch<StatsByLength>(fetch, '/api/stats') };
};
