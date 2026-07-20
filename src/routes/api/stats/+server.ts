import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';
import { getStatsForUser } from '$lib/server/stats';

export const GET: RequestHandler = async () => {
	const user = await getSessionUser();
	return json(await getStatsForUser(user.id));
};
