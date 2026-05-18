// POST /api/admin/login — set signed admin cookie if password matches.

const { setAuthCookie } = require('../../lib/auth');

module.exports = (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const password = (req.body && req.body.password) || '';
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected) {
    console.error('ADMIN_PASSWORD env var is missing');
    return res.status(500).json({ error: 'server misconfigured' });
  }

  if (password !== expected) {
    return res.status(401).json({ error: 'wrong password' });
  }

  setAuthCookie(res);
  return res.status(200).json({ ok: true });
};
