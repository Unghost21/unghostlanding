// Tiny HMAC-signed cookie auth for the admin panel.
// No external deps — uses node:crypto.

const crypto = require('crypto');

const COOKIE_NAME = 'ug_admin';
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

function getSecret() {
  const s = process.env.COOKIE_SECRET;
  if (!s || s.length < 16) {
    throw new Error('COOKIE_SECRET is not set or is too short (min 16 chars).');
  }
  return s;
}

function sign(value) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
}

function makeToken() {
  const value = 'ok.' + Date.now();
  const sig = sign(value);
  return value + '.' + sig;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const value = parts[0] + '.' + parts[1];
  const expected = sign(value);
  // constant-time compare
  const a = Buffer.from(parts[2], 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function setAuthCookie(res) {
  const token = makeToken();
  const cookie = [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${MAX_AGE_SECONDS}`,
    'Secure',
  ].join('; ');
  res.setHeader('Set-Cookie', cookie);
}

function clearAuthCookie(res) {
  const cookie = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    'Secure',
  ].join('; ');
  res.setHeader('Set-Cookie', cookie);
}

function isAuthed(req) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  return verifyToken(token);
}

function requireAuth(req, res) {
  if (!isAuthed(req)) {
    res.status(401).json({ error: 'unauthorized' });
    return false;
  }
  return true;
}

module.exports = {
  COOKIE_NAME,
  setAuthCookie,
  clearAuthCookie,
  isAuthed,
  requireAuth,
};
