// Neon serverless Postgres client.
// Uses HTTP fetch under the hood — no persistent connections, perfect for serverless.

const { neon } = require('@neondatabase/serverless');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Add it to .env.local (dev) or Vercel env vars (prod).');
}

const sql = neon(process.env.DATABASE_URL);

module.exports = { sql };
