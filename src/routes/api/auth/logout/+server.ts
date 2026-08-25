import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteSessionCookie, invalidateSession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	if (locals.session) await invalidateSession(locals.session.id);
	deleteSessionCookie(cookies);
	return json({ ok: true });
};
