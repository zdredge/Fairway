import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { env } from '$env/dynamic/private';
import {
	SESSION_COOKIE,
	deleteSessionCookie,
	setSessionCookie,
	validateSessionToken
} from '$lib/server/auth';

function corsHeaders(origin: string): Record<string, string> {
	return {
		'access-control-allow-origin': origin,
		'access-control-allow-credentials': 'true',
		'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS',
		'access-control-allow-headers': 'content-type'
	};
}

// CORS for `/api` — off unless CORS_ORIGINS is set (a comma-list). Same-origin
// web requests are unaffected; this readies the API for a future Capacitor origin.
const cors: Handle = async ({ event, resolve }) => {
	if (!event.url.pathname.startsWith('/api')) return resolve(event);

	const allowed = (env.CORS_ORIGINS ?? '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
	const origin = event.request.headers.get('origin');
	const ok = origin !== null && allowed.includes(origin);

	if (event.request.method === 'OPTIONS' && ok) {
		return new Response(null, { status: 204, headers: corsHeaders(origin) });
	}

	const response = await resolve(event);
	if (ok) {
		for (const [key, value] of Object.entries(corsHeaders(origin))) {
			response.headers.set(key, value);
		}
	}
	return response;
};

const PUBLIC_PAGES = new Set(['/login', '/signup']);

// Resolve the session cookie into locals, then guard page routes. Doing the
// redirect here (not in +layout.server.ts) keeps the layout load free of a `url`
// dependency, so SvelteKit reuses it across client navigations without a network
// round-trip — which is what lets navigation work offline.
const auth: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	const valid = token ? await validateSessionToken(token) : null;

	if (valid) {
		event.locals.user = valid.user;
		event.locals.session = valid.session;
		setSessionCookie(event.cookies, token!, valid.session.expiresAt); // sliding window
	} else {
		event.locals.user = null;
		event.locals.session = null;
		if (token) deleteSessionCookie(event.cookies);
	}

	// Guard only real page routes: event.route.id is null for assets/the SW, and
	// /api routes enforce their own 401 via requireLogin (they must not redirect).
	const path = event.url.pathname;
	if (event.route.id && !path.startsWith('/api')) {
		const isPublic = PUBLIC_PAGES.has(path);
		if (!event.locals.user && !isPublic) {
			return new Response(null, { status: 303, headers: { location: '/login' } });
		}
		if (event.locals.user && isPublic) {
			return new Response(null, { status: 303, headers: { location: '/' } });
		}
	}

	return resolve(event);
};

export const handle = sequence(cors, auth);
