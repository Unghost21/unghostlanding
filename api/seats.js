// GET /api/seats — live seat counter for Cohort 2026.
// Public endpoint, no auth. Cached for 15s at the edge to avoid pounding the DB.

const { sql } = require('../lib/db');

const ALREADY_FILLED = 316;
const CAPACITY = 500;

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method not allowed' });
  }

  try {
    const r = await sql`SELECT COUNT(*)::int AS n FROM registrations`;
    const newApps = r[0].n;
    const used = ALREADY_FILLED + newApps;
    const left = Math.max(0, CAPACITY - used);

    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    return res.status(200).json({
      filled: used,
      capacity: CAPACITY,
      left,
      alreadyFilled: ALREADY_FILLED,
      newApps,
    });
  } catch (e) {
    console.error('seats error:', e);
    // Soft-fail: return last-known plausible values so the UI doesn't break
    return res.status(200).json({
      filled: ALREADY_FILLED,
      capacity: CAPACITY,
      left: CAPACITY - ALREADY_FILLED,
      alreadyFilled: ALREADY_FILLED,
      newApps: 0,
      stale: true,
    });
  }
};
