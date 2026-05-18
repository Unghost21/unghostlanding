// POST /api/register — student application submission.

const { sql } = require('../lib/db');
const { validateRegistration } = require('../lib/validate');


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
  };

  try {
    await sql`
      INSERT INTO registrations (name, email, phone, college, city, track, study_year, motivation)
      VALUES (${row.name}, ${row.email}, ${row.phone}, ${row.college}, ${row.city}, ${row.track}, ${row.study_year}, ${row.motivation})
    `;
    return res.status(200).json({ success: true });
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
