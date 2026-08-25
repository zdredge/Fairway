import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireLogin } from '$lib/server/auth';
import { getStatsForUser } from '$lib/server/stats';

export const GET: RequestHandler = async ({ locals }) => {
	const user = requireLogin(locals);
	return json(await getStatsForUser(user.id));
};
