// GET /api/admin/export — CSV download of all registrations (auth required).

const { sql } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

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
    const headers = ['id', 'name', 'email', 'phone', 'college', 'city', 'track', 'study_year', 'motivation', 'created_at'];
    const csv = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(',')),
    ].join('\n');

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="unghost-registrations-${stamp}.csv"`);
    return res.status(200).send(csv);
  } catch (e) {
    console.error('export error:', e);
    return res.status(500).json({ error: 'database error' });
  }
};
