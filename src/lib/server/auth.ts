import { error } from '@sveltejs/kit';
import { getUserByEmail } from './db/queries';
import type { User } from './db/schema';

const DEV_USER_EMAIL = 'dev@fairway.local';

let devUser: User | undefined;

/**
 * Resolve the user the request is acting as.
 *
 * This is the Phase 7 seam: until session auth lands, every request acts as
 * the seeded dev user. Phase 7 replaces this body with real session
 * validation; call sites stay unchanged.
 */
export async function getSessionUser(): Promise<User> {
	devUser ??= await getUserByEmail(DEV_USER_EMAIL);
	if (!devUser) {
		error(500, { message: 'Dev user not found — run `npm run db:seed` first' });
	}
	return devUser;
}
