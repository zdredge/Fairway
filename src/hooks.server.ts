import type { Handle } from '@sveltejs/kit';
import {
	SESSION_COOKIE,
	deleteSessionCookie,
	setSessionCookie,
	validateSessionToken
} from '$lib/server/auth';

// Resolve the session cookie on every request into event.locals.user/session.
export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	if (!token) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const valid = await validateSessionToken(token);
	if (valid) {
		event.locals.user = valid.user;
		event.locals.session = valid.session;
		// Sliding window: reissue the cookie with the (possibly extended) expiry.
		setSessionCookie(event.cookies, token, valid.session.expiresAt);
	} else {
		event.locals.user = null;
		event.locals.session = null;
		deleteSessionCookie(event.cookies);
	}

	return resolve(event);
};
