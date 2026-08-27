// Password hashing with Node's built-in scrypt — no external dependency, and no
// SvelteKit imports, so it's usable from tsx scripts (seed) and unit tests alike.
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

/** Hash a password as `salt:derivedKey`, both hex. */
export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16).toString('hex');
	const derived = (await scryptAsync(password, salt, 64)) as Buffer;
	return `${salt}:${derived.toString('hex')}`;
}

/** Constant-time verify against a `salt:derivedKey` hash. */
export async function verifyPassword(stored: string, password: string): Promise<boolean> {
	const [salt, keyHex] = stored.split(':');
	if (!salt || !keyHex) return false;
	const key = Buffer.from(keyHex, 'hex');
	const derived = (await scryptAsync(password, salt, 64)) as Buffer;
	return key.length === derived.length && timingSafeEqual(key, derived);
}
