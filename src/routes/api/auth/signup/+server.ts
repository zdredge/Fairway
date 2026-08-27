import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSession, hashPassword, setSessionCookie } from '$lib/server/auth';
import { createUser, getUserByEmail } from '$lib/server/db/queries';
import { badRequest, readJsonBody } from '$lib/server/http';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await readJsonBody(request);
	if (typeof body !== 'object' || body === null) badRequest(['Body must be a JSON object']);
	const { email, password, displayName } = body as Record<string, unknown>;

	const errors: string[] = [];
	if (typeof email !== 'string' || !EMAIL_RE.test(email)) errors.push('A valid email is required');
	if (typeof password !== 'string' || password.length < 8) {
		errors.push('Password must be at least 8 characters');
	}
	if (displayName != null && typeof displayName !== 'string') {
		errors.push('displayName must be a string');
	}
	if (errors.length > 0) badRequest(errors);

	const normalizedEmail = (email as string).trim().toLowerCase();
	if (await getUserByEmail(normalizedEmail)) {
		badRequest(['An account with that email already exists']);
	}

	const name =
		typeof displayName === 'string' && displayName.trim().length > 0
			? displayName.trim()
			: normalizedEmail.split('@')[0];

	const user = await createUser({
		email: normalizedEmail,
		displayName: name,
		passwordHash: await hashPassword(password as string)
	});

	const { token, session } = await createSession(user.id);
	setSessionCookie(cookies, token, session.expiresAt);

	return json({ id: user.id, email: user.email, displayName: user.displayName }, { status: 201 });
};
