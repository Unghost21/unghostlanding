// GET /api/admin/data — dashboard payload (auth required).

const { sql } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');

const ALREADY_FILLED = 316;
const CAPACITY = 500;

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method not allowed' });
  }
  if (!requireAuth(req, res)) return;

  try {
    const rows = await sql`
      SELECT id, name, email, phone, college, city, track, study_year, motivation,
             to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') AS created_at
      FROM registrations
      ORDER BY created_at DESC
    `;
    const breakdown = await sql`
      SELECT track, COUNT(*)::int AS n
      FROM registrations
      GROUP BY track
      ORDER BY track
    `;
    const total = rows.length;
    return res.status(200).json({
      total,
      rows,
      breakdown,
      capacity: CAPACITY,
      alreadyFilled: ALREADY_FILLED,
    });
  } catch (e) {
    console.error('data error:', e);
    return res.status(500).json({ error: 'database error' });
  }
};
