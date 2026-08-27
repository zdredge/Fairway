import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

// process.env rather than $env/dynamic/private so the same client works under
// SvelteKit, standalone tsx scripts (seed, check), and the migrate script.
//
// DATABASE_URL is a libSQL URL: `file:local.db` (dev), `:memory:` (tests), or
// `libsql://<db>.turso.io` (prod, with TURSO_AUTH_TOKEN). The auth token is only
// needed for a remote Turso database.
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
// SQLite defaults foreign keys OFF; enable so ON DELETE CASCADE is enforced
// (matches the schema's expectations). No-op if already on.
client.execute('PRAGMA foreign_keys = ON').catch(() => {});

export const db = drizzle(client, { schema });
