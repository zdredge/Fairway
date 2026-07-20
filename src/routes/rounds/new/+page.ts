import type { PageLoad } from './$types';
import { apiFetch } from '$lib/api';
import type { ApiCourse } from '$lib/types';

export const load: PageLoad = async ({ fetch }) => {
	return { courses: await apiFetch<ApiCourse[]>(fetch, '/api/courses') };
};
