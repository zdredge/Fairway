import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSession, setSessionCookie, verifyPassword } from '$lib/server/auth';
import { getUserByEmail } from '$lib/server/db/queries';
import { badRequest, readJsonBody } from '$lib/server/http';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await readJsonBody(request);
	if (typeof body !== 'object' || body === null) badRequest(['Body must be a JSON object']);
	const { email, password } = body as Record<string, unknown>;
	if (typeof email !== 'string' || typeof password !== 'string') {
		badRequest(['email and password are required']);
	}

	const user = await getUserByEmail((email as string).trim().toLowerCase());
	// Same message whether the email is unknown or the password is wrong.
	if (!user || !(await verifyPassword(user.passwordHash, password as string))) {
		error(401, { message: 'Incorrect email or password' });
	}

	const { token, session } = await createSession(user.id);
	setSessionCookie(cookies, token, session.expiresAt);

	return json({ id: user.id, email: user.email, displayName: user.displayName });
};
