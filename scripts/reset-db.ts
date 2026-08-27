import 'dotenv/config';
import { rmSync } from 'node:fs';

// Delete the local SQLite database (and its WAL sidecars) so the next migrate
// starts from an empty schema. Cross-platform; used by `npm run db:reset`.
const url = process.env.DATABASE_URL ?? 'local.db';
if (/^(:memory:|.*:\/\/)/.test(url)) {
	console.error(`Refusing to reset a non-file DATABASE_URL: ${url}`);
	process.exit(1);
}

for (const suffix of ['', '-wal', '-shm', '-journal']) {
	rmSync(`${url}${suffix}`, { force: true });
}
console.log(`Removed ${url} (+ sidecars). Run migrate + seed next.`);
