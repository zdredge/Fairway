// Runs before each server test file's imports, so the db singleton
// (src/lib/server/db/index.ts) binds to a throwaway in-memory database
// instead of local.db. Vitest does not load .env, so this is the only
// DATABASE_URL the test process sees.
//
// `file::memory:?cache=shared` (not bare `:memory:`): libSQL gives each
// connection its own private `:memory:` DB, so migrations and queries would
// land in different databases. Shared cache makes one in-memory DB for the
// whole process, fresh per worker.
process.env.DATABASE_URL = 'file::memory:?cache=shared';
