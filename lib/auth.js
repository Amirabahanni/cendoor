'use strict';
const crypto = require('crypto');
const { get, run } = require('./db');

const COOKIE = 'cd_session';
const DAY = 24 * 3600 * 1000;

function hash(password, salt) { return crypto.scryptSync(String(password), salt, 64).toString('hex'); }
function newSalt() { return crypto.randomBytes(16).toString('hex'); }
function verify(password, user) {
  const a = Buffer.from(hash(password, user.salt), 'hex');
  const b = Buffer.from(user.pass_hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  run('INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)', token, userId, Date.now() + 14 * DAY);
  return token;
}
function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function setCookie(res, token, req) {
  const r = req || res.req;
  const secure = r && (r.secure || process.env.NODE_ENV === 'production') ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${14 * 24 * 3600}${secure}`);
}
function clearCookie(res) { res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`); }

function userFromReq(req) {
  const token = parseCookies(req)[COOKIE];
  if (!token) return null;
  const s = get('SELECT * FROM sessions WHERE token=?', token);
  if (!s || s.expires_at < Date.now()) return null;
  const u = get('SELECT id, shop_id, email, name, role FROM users WHERE id=?', s.user_id);
  return u;
}

// What each role may change. Everyone logged in may read.
const CAN = {
  products: ['admin', 'manager'],
  orders: ['admin', 'manager', 'operator'],
  conversations: ['admin', 'manager', 'operator'],
  links: ['admin', 'manager'],
  settings: ['admin'],
  studio: ['admin', 'manager'],
  team: ['admin'],
};
function auth(action) {
  return (req, res, next) => {
    const u = userFromReq(req);
    if (!u) return res.status(401).json({ error: 'auth_required' });
    if (action && !CAN[action].includes(u.role)) return res.status(403).json({ error: 'forbidden', needs: action });
    req.user = u; req.shopId = u.shop_id;
    next();
  };
}

module.exports = { hash, newSalt, verify, createSession, setCookie, clearCookie, userFromReq, auth, CAN, parseCookies };
