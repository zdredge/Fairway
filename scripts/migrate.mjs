// Apply pending Drizzle migrations to the DATABASE_URL, then exit.
//
// Serverless (Vercel) has no boot hook, so migrations are applied from here:
// - local dev:  DATABASE_URL=file:local.db  node scripts/migrate.mjs
// - Turso:      DATABASE_URL=libsql://<db>.turso.io  TURSO_AUTH_TOKEN=...  node scripts/migrate.mjs
//
// libSQL is the SQLite dialect, so the committed drizzle/*.sql apply unchanged.
// Idempotent — Drizzle records applied migrations.
//
// Loads .env for local runs (`npm run db:migrate`); explicit env vars (e.g. a
// Turso URL + token set in the shell) take precedence, since dotenv never
// overrides an already-set variable.
import 'dotenv/config';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
await migrate(drizzle(client), { migrationsFolder: './drizzle' });
client.close();

console.log(`Migrations applied to ${url}`);
