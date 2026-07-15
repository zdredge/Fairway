// Runs before each server test file's imports, so the db singleton
// (src/lib/server/db/index.ts) binds to a throwaway in-memory database
// instead of local.db. Vitest does not load .env, so this is the only
// DATABASE_URL the test process sees.
process.env.DATABASE_URL = ':memory:';
