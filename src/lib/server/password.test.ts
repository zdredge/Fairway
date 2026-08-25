import { describe, expect, test } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
	test('verifies the correct password', async () => {
		const hash = await hashPassword('correct horse battery staple');
		expect(await verifyPassword(hash, 'correct horse battery staple')).toBe(true);
	});

	test('rejects the wrong password', async () => {
		const hash = await hashPassword('hunter2hunter2');
		expect(await verifyPassword(hash, 'hunter2')).toBe(false);
	});

	test('the same password hashes differently each time (random salt)', async () => {
		const a = await hashPassword('same-password-8');
		const b = await hashPassword('same-password-8');
		expect(a).not.toBe(b);
		// …but both still verify.
		expect(await verifyPassword(a, 'same-password-8')).toBe(true);
		expect(await verifyPassword(b, 'same-password-8')).toBe(true);
	});

	test('a malformed stored hash returns false, not a throw', async () => {
		expect(await verifyPassword('not-a-valid-hash', 'whatever')).toBe(false);
	});
});
