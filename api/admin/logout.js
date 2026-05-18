// POST /api/admin/logout — clear admin cookie.

const { clearAuthCookie } = require('../../lib/auth');

module.exports = (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  clearAuthCookie(res);
  return res.status(200).json({ ok: true });
};
