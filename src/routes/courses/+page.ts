import type { PageLoad } from './$types';
import { browser } from '$app/environment';
import { apiFetch, ApiError } from '$lib/api';
import type { ApiCourse } from '$lib/types';

export const load: PageLoad = async ({ fetch }) => {
	try {
		return { courses: await apiFetch<ApiCourse[]>(fetch, '/api/courses'), offline: false };
	} catch (err) {
		// Offline with no cached course list: show an offline notice instead of the
		// error page (mirrors the rounds list / stats degradation).
		const offlineMiss = err instanceof ApiError && err.status === 503;
		if (browser && (offlineMiss || !navigator.onLine)) return { courses: [], offline: true };
		throw err;
	}
};
