import type { PageLoad } from './$types';
import { browser } from '$app/environment';
import { apiFetch, ApiError } from '$lib/api';
import type { StatsByLength } from '$lib/types';

export const load: PageLoad = async ({ fetch }) => {
	try {
		return { stats: await apiFetch<StatsByLength>(fetch, '/api/stats'), offline: false };
	} catch (err) {
		// Aggregate stats are computed server-side and can't be recomputed offline.
		// If we're offline with no cached copy, show an "unavailable offline" state
		// rather than the error page. A real (online) failure still propagates.
		const offlineMiss = err instanceof ApiError && err.status === 503;
		if (browser && (offlineMiss || !navigator.onLine)) {
			return { stats: null, offline: true };
		}
		throw err;
	}
};
