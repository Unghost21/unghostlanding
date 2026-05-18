// POST /api/register — student application submission.

const { sql } = require('../lib/db');
const { validateRegistration } = require('../lib/validate');

const ALREADY_FILLED = 316;
const CAPACITY = 500;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, errors: ['Method not allowed'] });
  }

  const body = req.body || {};
  const errors = validateRegistration(body);
  if (errors.length) {
    return res.status(400).json({ success: false, errors });
  }

  const row = {
    name: String(body.name).trim(),
    email: String(body.email).trim().toLowerCase(),
    phone: String(body.phone).trim(),
    college: String(body.college).trim(),
    city: String(body.city).trim(),
    track: String(body.track),
    study_year: String(body.study_year),
    motivation: String(body.motivation).trim(),
    portfolio_url: body.portfolio_url ? String(body.portfolio_url).trim() : null,
    linkedin_url: body.linkedin_url ? String(body.linkedin_url).trim() : null,
    github_url: body.github_url ? String(body.github_url).trim() : null,
  };

  try {
    await sql`
      INSERT INTO registrations (name, email, phone, college, city, track, study_year, motivation, portfolio_url, linkedin_url, github_url)
      VALUES (${row.name}, ${row.email}, ${row.phone}, ${row.college}, ${row.city}, ${row.track}, ${row.study_year}, ${row.motivation}, ${row.portfolio_url}, ${row.linkedin_url}, ${row.github_url})
    `;
    const count = await sql`SELECT COUNT(*)::int AS n FROM registrations`;
    const seatsLeft = Math.max(0, CAPACITY - ALREADY_FILLED - count[0].n);
    const seatNumber = ALREADY_FILLED + count[0].n;
    return res.status(200).json({ success: true, seatsLeft, seatNumber });
  } catch (e) {
    const msg = String(e && e.message || e);
    if (msg.includes('idx_registrations_email') || msg.toLowerCase().includes('unique')) {
      return res.status(409).json({
        success: false,
        errors: ["This email is already registered. We've got you."],
      });
    }
    console.error('register error:', e);
    return res.status(500).json({
      success: false,
      errors: ['Something went wrong. Please try again.'],
    });
  }
};
