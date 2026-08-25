import { error, type Cookies } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { randomBytes, createHash } from 'node:crypto';
import {
	deleteSession,
	getSessionWithUser,
	insertSession,
	refreshSessionExpiry
} from './db/queries';
import type { SafeUser, Session } from './db/schema';

// Re-exported so call sites can import password + session helpers from one place.
export { hashPassword, verifyPassword } from './password';

// ---- sessions (Lucia-style: random token in the cookie, its SHA-256 in the DB) ----

export const SESSION_COOKIE = 'session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const SESSION_REFRESH_MS = 1000 * 60 * 60 * 24 * 15; // extend when < 15 days remain

function sessionIdFromToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

/** Create a session for a user; returns the cookie token and the stored row. */
export async function createSession(userId: string): Promise<{ token: string; session: Session }> {
	const token = randomBytes(24).toString('base64url');
	const session: Session = {
		id: sessionIdFromToken(token),
		userId,
		expiresAt: new Date(Date.now() + SESSION_DURATION_MS)
	};
	await insertSession(session);
	return { token, session };
}

export interface ValidSession {
	user: SafeUser;
	session: Session;
}

/**
 * Validate a cookie token: returns the user + session, or null. Expired sessions
 * are deleted; sessions near expiry are extended (sliding window).
 */
export async function validateSessionToken(token: string): Promise<ValidSession | null> {
	const id = sessionIdFromToken(token);
	const row = await getSessionWithUser(id);
	if (!row) return null;

	if (Date.now() >= row.expiresAt.getTime()) {
		await deleteSession(id);
		return null;
	}

	let session: Session = { id: row.id, userId: row.userId, expiresAt: row.expiresAt };
	if (Date.now() >= row.expiresAt.getTime() - SESSION_REFRESH_MS) {
		const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
		await refreshSessionExpiry(id, expiresAt);
		session = { ...session, expiresAt };
	}

	return { user: row.user, session };
}

export async function invalidateSession(id: string): Promise<void> {
	await deleteSession(id);
}

// ---- cookie helpers ----

export function setSessionCookie(cookies: Cookies, token: string, expiresAt: Date): void {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		expires: expiresAt
	});
}

export function deleteSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

// ---- request guard ----

/** Return the signed-in user or reject the request with 401. */
export function requireLogin(locals: App.Locals): SafeUser {
	if (!locals.user) error(401, { message: 'You must be signed in' });
	return locals.user;
}
