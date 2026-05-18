// One-shot script to create / migrate the registrations table in Neon.
// Idempotent — safe to run multiple times.
// Run: node scripts/init-db.js

const fs = require('fs');
const path = require('path');

// minimal .env.local loader (no dotenv dep)
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = process.env[m[1]] || m[2];
  }
}

const { sql } = require('../lib/db');

(async () => {
  console.log('→ Connecting to Neon…');
  try {
    const v = await sql`SELECT version()`;
    console.log('  Connected. Server:', v[0].version.split(',')[0]);

    console.log('→ Creating registrations table (if not exists)…');
    await sql`
      CREATE TABLE IF NOT EXISTS registrations (
        id          SERIAL PRIMARY KEY,
        name        TEXT NOT NULL,
        email       TEXT NOT NULL,
        phone       TEXT NOT NULL,
        college     TEXT NOT NULL,
        city        TEXT NOT NULL,
        track       TEXT NOT NULL,
        study_year  TEXT NOT NULL,
        motivation  TEXT NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_email ON registrations (LOWER(email))`;

    console.log('→ Migrating: adding optional portfolio / linkedin / github columns…');
    await sql`ALTER TABLE registrations ADD COLUMN IF NOT EXISTS portfolio_url TEXT`;
    await sql`ALTER TABLE registrations ADD COLUMN IF NOT EXISTS linkedin_url TEXT`;
    await sql`ALTER TABLE registrations ADD COLUMN IF NOT EXISTS github_url   TEXT`;
    console.log('  Table ready.');

    const count = await sql`SELECT COUNT(*)::int AS n FROM registrations`;
    console.log(`→ Current row count: ${count[0].n}`);

    console.log('\n✓ Database initialised / migrated successfully.\n');
    process.exit(0);
  } catch (e) {
    console.error('\n✗ Init failed:\n', e);
    process.exit(1);
  }
})();
