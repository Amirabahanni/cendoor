'use strict';
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const { get, all, run, tx, DATA_DIR } = require('./lib/db');
const auth = require('./lib/auth');
const convo = require('./lib/convo');
const chat = require('./lib/chat');
const orders = require('./lib/orders');
const analytics = require('./lib/analytics');
const nlp = require('./lib/nlp');
const whatsapp = require('./lib/whatsapp');
const { labelHtml } = require('./lib/label');
const insights = require('./lib/insights');
const { caption } = require('./lib/caption');
const assistant = require('./lib/assistant');
const designLib = require('./lib/design');
const siteLib = require('./lib/site');
const fontsLib = require('./lib/fonts');
const broadcast = require('./lib/broadcast');
const ads = require('./lib/ads');
// advanced (AI-written) design uses real AI usage, so it is metered; basic customisation is always free
const PLAN_CREDITS = { trial: 10, solo: 0, growth: 100 };
const { seedDemo } = require('./seed');

if (process.env.CENDOOR_SEED !== '0') seedDemo();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // behind Render / Railway / Fly: real client IP and https detection
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=(self)');
  next();
});
app.get('/fonts.css', (req, res) => { res.type('text/css').set('Cache-Control', 'public, max-age=86400').send(fontsLib.css(req.query.f)); });
app.get('/fonts/:pkg/files/:file', (req, res) => { const p = fontsLib.filePath(req.params.pkg, req.params.file); if (!p) return res.sendStatus(404); res.set('Cache-Control', 'public, max-age=31536000, immutable'); res.type('font/woff2'); res.sendFile(p); });
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use(express.json({ limit: '4mb', verify: (req, res, buf) => { req.rawBody = buf; } }));
const UPLOADS = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOADS, { recursive: true });
app.use('/uploads', express.static(UPLOADS, { maxAge: '7d', setHeaders: res => res.setHeader('X-Content-Type-Options', 'nosniff') }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const hits = new Map();
function limited(key, max, windowMs = 60000) {
  const t = Date.now(); const arr = (hits.get(key) || []).filter(x => t - x < windowMs);
  arr.push(t); hits.set(key, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > max;
}
const str = (v, n = 200) => String(v == null ? '' : v).trim().slice(0, n);
const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const slugify = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'shop';

function saveImage(dataUrl, shopId) {
  const m = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!m) return null;
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 1_500_000) return null;
  const name = `${shopId}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
  fs.writeFileSync(path.join(UPLOADS, name), buf);
  return `/uploads/${name}`;
}

// =========================================================================
// PUBLIC: storefront + chat
// =========================================================================
function publicShop(slug) { return get('SELECT * FROM shops WHERE slug=?', String(slug || '').toLowerCase()); }
function publicProducts(shopId) {
  return orders.loadCatalog(shopId).map(p => ({
    id: p.id, name: p.name, description: p.description, price: p.price, category: p.category, emoji: p.emoji, image: p.image, stock: p.stock,
    variants: p.variants.map(v => ({ id: v.id, label: v.label, color: v.color, size: v.size, stock: v.stock, price: orders.variantPrice(p, v) })),
  }));
}

app.get('/api/shop/:slug', (req, res) => {
  const shop = publicShop(req.params.slug);
  if (!shop) return res.status(404).json({ error: 'not_found' });
  let source = null;
  if (req.query.p) {
    const l = get('SELECT * FROM post_links WHERE shop_id=? AND code=?', shop.id, String(req.query.p));
    if (l) { run('UPDATE post_links SET visits = visits + 1 WHERE id=?', l.id); source = { code: l.code, channel: l.channel, product_id: l.product_id, label: l.label }; }
  }
  res.json({
    shop: { name: shop.name, slug: shop.slug, city: shop.city, tagline: shop.tagline, lang: shop.lang, wa_number: shop.wa_number, free_shipping_over: shop.free_shipping_over, ai_enabled: !!shop.ai_enabled, theme_color: shop.theme_color, announcement: shop.announcement, welcome_msg: shop.welcome_msg },
    design: designLib.getDesign(shop.id), site: siteLib.publicSite(shop.id),
    featured: (() => {
      const top = all(`SELECT oi.product_id id, SUM(oi.qty) q FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.shop_id=? AND o.status != 'cancelled' AND date(o.created_at) >= date('now','-60 days') GROUP BY oi.product_id ORDER BY q DESC LIMIT 4`, shop.id).map(x => x.id);
      return top.length ? top : all('SELECT id FROM products WHERE shop_id=? AND active=1 ORDER BY id LIMIT 4', shop.id).map(x => x.id);
    })(),
    reviews: all('SELECT r.rating, r.comment, o.name, o.city FROM reviews r LEFT JOIN orders o ON o.id=r.order_id WHERE r.shop_id=? ORDER BY r.id DESC LIMIT 6', shop.id).map(r => ({ rating: r.rating, comment: r.comment, name: String(r.name || '').split(' ')[0], city: r.city })),
    products: publicProducts(shop.id), rating: orders.shopRating(shop.id), source,
    carriers: all('SELECT name, base_price, eta_days FROM carriers WHERE shop_id=? AND enabled=1', shop.id),
  });
});

app.get('/api/shop/:slug/quote', (req, res) => {
  const shop = publicShop(req.params.slug);
  if (!shop) return res.status(404).json({ error: 'not_found' });
  const city = nlp.extractCity(str(req.query.city)) || str(req.query.city, 60);
  res.json({ city, ...orders.quoteShipping(shop, city, num(req.query.subtotal)) });
});

const sessionKey = id => (/^[a-zA-Z0-9-]{8,64}$/.test(id || '') ? 'web-' + id : null);

app.post('/api/shop/:slug/chat', wrap(async (req, res) => {
  const shop = publicShop(req.params.slug);
  if (!shop) return res.status(404).json({ error: 'not_found' });
  if (limited('chat:' + req.ip, 40)) return res.status(429).json({ error: 'slow_down' });
  const key = sessionKey(req.body.sessionId);
  const text = str(req.body.text, 600);
  if (!key || !text) return res.status(400).json({ error: 'bad_request' });
  const link = req.body.src ? get('SELECT code FROM post_links WHERE shop_id=? AND code=?', shop.id, str(req.body.src, 40)) : null;
  const c = convo.getOrCreate(shop.id, key, 'web', link ? link.code : '');
  const before = get('SELECT COALESCE(MAX(id),0) m FROM messages WHERE conversation_id=?', c.id).m;
  const out = await chat.handleCustomerMessage({ shop, convoRow: c, text });
  const msgs = convo.messagesSince(c.id, before).filter(m => m.role !== 'customer');
  res.json({ conversationId: c.id, replies: msgs, orderId: out.orderId || null, paused: !!out.paused });
}));

app.get('/api/shop/:slug/chat', (req, res) => {
  const shop = publicShop(req.params.slug);
  if (!shop) return res.status(404).json({ error: 'not_found' });
  const key = sessionKey(String(req.query.sessionId || ''));
  if (!key) return res.json({ messages: [] });
  const c = get('SELECT id FROM conversations WHERE shop_id=? AND customer_key=?', shop.id, key);
  if (!c) return res.json({ messages: [] });
  res.json({ messages: convo.messagesSince(c.id, num(req.query.after)).filter(m => m.role !== 'customer' || num(req.query.all)) });
});

// Order without chat (storefront cart form). Same validation and stock rules as the chat path.
app.post('/api/shop/:slug/order', wrap(async (req, res) => {
  const shop = publicShop(req.params.slug);
  if (!shop) return res.status(404).json({ error: 'not_found' });
  if (limited('order:' + req.ip, 10)) return res.status(429).json({ error: 'slow_down' });
  const b = req.body || {};
  const phone = nlp.extractPhone(str(b.phone, 30)).phone;
  const city = nlp.extractCity(str(b.city, 60)) || str(b.city, 60);
  if (!phone) return res.status(400).json({ error: 'bad_phone' });
  if (!str(b.name) || !city || str(b.address).length < 5) return res.status(400).json({ error: 'missing_details' });
  const link = b.src ? get('SELECT code, channel FROM post_links WHERE shop_id=? AND code=?', shop.id, str(b.src, 40)) : null;
  try {
    const order = orders.createOrder({
      shopId: shop.id, customer: { name: str(b.name, 80), phone, city, address: str(b.address, 200) },
      items: (Array.isArray(b.items) ? b.items : []).slice(0, 20).map(i => ({ variantId: num(i.variantId), qty: Math.min(20, Math.max(1, num(i.qty, 1))) })),
      channel: link ? link.channel : 'web', sourceCode: link ? link.code : '', needsCustomerConfirm: !!shop.confirm_agent,
    });
    res.json({ ok: true, number: order.number, total: order.total, eta: order.eta, verify: order.verify });
  } catch (e) {
    if (e instanceof orders.OrderError) return res.status(409).json({ error: e.code, available: e.available });
    throw e;
  }
}));

app.post('/api/shop/:slug/review', (req, res) => {
  res.status(410).json({ error: 'reviews are collected in chat after delivery' });
});

// WhatsApp Cloud API webhook
app.get('/webhooks/whatsapp', whatsapp.webhookVerify);
app.post('/webhooks/whatsapp', wrap(whatsapp.webhookPost));

// =========================================================================
// AUTH
// =========================================================================
app.post('/api/auth/signup', (req, res) => {
  if (limited('signup:' + req.ip, 10, 3600000)) return res.status(429).json({ error: 'slow_down' });
  const email = str(req.body.email, 120).toLowerCase(), password = String(req.body.password || ''), shopName = str(req.body.shopName, 60), name = str(req.body.name, 60);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'bad_email' });
  if (password.length < 8) return res.status(400).json({ error: 'weak_password' });
  if (!shopName) return res.status(400).json({ error: 'shop_name_required' });
  if (get('SELECT id FROM users WHERE email=?', email)) return res.status(409).json({ error: 'email_taken' });
  let slug = slugify(shopName); let i = 1;
  while (get('SELECT id FROM shops WHERE slug=?', slug)) slug = slugify(shopName) + '-' + (++i);
  const token = tx(() => {
    run("INSERT INTO shops (slug, name, city, phone, lang, plan, trial_ends_at, ai_credits) VALUES (?,?,?,?,?,'trial',datetime('now','+14 days')," + PLAN_CREDITS.trial + ")", slug, shopName, str(req.body.city, 40), str(req.body.phone, 20), 'fr');
    const shop = get('SELECT id FROM shops WHERE slug=?', slug);
    const salt = auth.newSalt();
    run('INSERT INTO users (shop_id, email, name, pass_hash, salt, role) VALUES (?,?,?,?,?,?)', shop.id, email, name || shopName, auth.hash(password, salt), salt, 'admin');
    for (const [n, b, e] of [['Amana', 35, '2-4'], ['CTM', 30, '1-3'], ['Aramex', 45, '1-2'], ['CashPlus', 30, '2-3']]) run('INSERT INTO carriers (shop_id, name, base_price, eta_days) VALUES (?,?,?,?)', shop.id, n, b, e);
    const u = get('SELECT id FROM users WHERE email=?', email);
    return auth.createSession(u.id);
  });
  auth.setCookie(res, token);
  res.json({ ok: true, slug });
});

app.post('/api/auth/login', (req, res) => {
  if (limited('login:' + req.ip, 15, 300000)) return res.status(429).json({ error: 'slow_down' });
  const u = get('SELECT * FROM users WHERE email=?', str(req.body.email, 120).toLowerCase());
  if (!u || !auth.verify(String(req.body.password || ''), u)) return res.status(401).json({ error: 'bad_credentials' });
  auth.setCookie(res, auth.createSession(u.id));
  res.json({ ok: true });
});
app.post('/api/auth/logout', (req, res) => {
  const t = auth.parseCookies(req).cd_session; if (t) run('DELETE FROM sessions WHERE token=?', t);
  auth.clearCookie(res); res.json({ ok: true });
});
app.get('/api/me', auth.auth(), (req, res) => {
  const { site: _site, design: _design, ...shop } = get('SELECT * FROM shops WHERE id=?', req.shopId);
  const used = analytics.monthlyUsage(shop.id);
  res.json({
    user: req.user, shop, can: Object.fromEntries(Object.entries(auth.CAN).map(([k, v]) => [k, v.includes(req.user.role)])),
    usage: { orders: used, limit: null },
    trial: shop.plan === 'trial' ? { daysLeft: Math.max(0, Math.ceil((Date.parse(String(shop.trial_ends_at).replace(' ', 'T') + 'Z') - Date.now()) / 86400000)) } : null,
    integrations: { whatsapp: whatsapp.configured(), llm: chat.llmEnabled() }, demo: process.env.CENDOOR_DEMO === '1' && req.user.email === 'demo@cendoor.com',
  });
});

// =========================================================================
// SETTINGS / CARRIERS / TEAM
// =========================================================================
app.put('/api/settings', auth.auth('settings'), (req, res) => {
  const b = req.body || {};
  const f = {
    name: str(b.name, 60), city: str(b.city, 40), phone: str(b.phone, 20), tagline: str(b.tagline, 140),
    lang: ['dar', 'fr', 'en', 'ar'].includes(b.lang) ? b.lang : 'dar', tone: b.tone === 'formal' ? 'formal' : 'friendly',
    ai_enabled: b.ai_enabled ? 1 : 0, default_carrier: str(b.default_carrier, 30), free_shipping_over: Math.max(0, num(b.free_shipping_over)),
    auto_carrier: b.auto_carrier ? 1 : 0, confirm_agent: b.confirm_agent ? 1 : 0, wa_number: str(b.wa_number, 20).replace(/\D/g, ''), plan: ['solo', 'growth'].includes(b.plan) ? b.plan : undefined,
  };
  if (!f.name) return res.status(400).json({ error: 'name_required' });
  const cur = get('SELECT * FROM shops WHERE id=?', req.shopId);
  if (f.plan && f.plan !== cur.plan) run('UPDATE shops SET ai_credits=? WHERE id=?', PLAN_CREDITS[f.plan] ?? 0, req.shopId);
  run('UPDATE shops SET name=?, city=?, phone=?, tagline=?, lang=?, tone=?, ai_enabled=?, default_carrier=?, free_shipping_over=?, wa_number=?, plan=?, auto_carrier=?, confirm_agent=? WHERE id=?',
    f.name, f.city, f.phone, f.tagline, f.lang, f.tone, f.ai_enabled, f.default_carrier || cur.default_carrier, f.free_shipping_over, f.wa_number, f.plan || cur.plan, f.auto_carrier, f.confirm_agent, req.shopId);
  res.json({ ok: true });
});
app.get('/api/carriers', auth.auth(), (req, res) => res.json(all('SELECT * FROM carriers WHERE shop_id=? ORDER BY id', req.shopId).map(c => ({ ...c, city_prices: convo.safeJson(c.city_prices, {}) }))));
app.put('/api/carriers/:id', auth.auth('settings'), (req, res) => {
  const c = get('SELECT * FROM carriers WHERE id=? AND shop_id=?', num(req.params.id), req.shopId);
  if (!c) return res.status(404).json({ error: 'not_found' });
  const prices = {};
  for (const [k, v] of Object.entries(req.body.city_prices || {})) if (nlp.CITY_NAMES.includes(k) && num(v, -1) >= 0) prices[k] = num(v);
  run('UPDATE carriers SET enabled=?, base_price=?, eta_days=?, city_prices=? WHERE id=?', req.body.enabled ? 1 : 0, Math.max(0, num(req.body.base_price, c.base_price)), str(req.body.eta_days, 12) || c.eta_days, JSON.stringify(prices), c.id);
  res.json({ ok: true });
});

app.get('/api/team', auth.auth(), (req, res) => res.json(all('SELECT id, email, name, role, created_at FROM users WHERE shop_id=? ORDER BY id', req.shopId)));
app.post('/api/team', auth.auth('team'), (req, res) => {
  const email = str(req.body.email, 120).toLowerCase(), role = ['admin', 'manager', 'operator', 'viewer'].includes(req.body.role) ? req.body.role : 'viewer';
  const password = String(req.body.password || '');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'bad_email' });
  if (password.length < 8) return res.status(400).json({ error: 'weak_password' });
  if (get('SELECT id FROM users WHERE email=?', email)) return res.status(409).json({ error: 'email_taken' });
  const salt = auth.newSalt();
  run('INSERT INTO users (shop_id, email, name, pass_hash, salt, role) VALUES (?,?,?,?,?,?)', req.shopId, email, str(req.body.name, 60), auth.hash(password, salt), salt, role);
  res.json({ ok: true });
});
app.patch('/api/team/:id', auth.auth('team'), (req, res) => {
  const role = ['admin', 'manager', 'operator', 'viewer'].includes(req.body.role) ? req.body.role : null;
  const u = get('SELECT * FROM users WHERE id=? AND shop_id=?', num(req.params.id), req.shopId);
  if (!u || !role) return res.status(400).json({ error: 'bad_request' });
  if (u.id === req.user.id && role !== 'admin') return res.status(400).json({ error: 'cannot_demote_self' });
  run('UPDATE users SET role=? WHERE id=?', role, u.id); res.json({ ok: true });
});
app.delete('/api/team/:id', auth.auth('team'), (req, res) => {
  if (num(req.params.id) === req.user.id) return res.status(400).json({ error: 'cannot_remove_self' });
  run('DELETE FROM users WHERE id=? AND shop_id=?', num(req.params.id), req.shopId); res.json({ ok: true });
});

// =========================================================================
// PRODUCTS
// =========================================================================
function productRow(shopId, id) {
  const p = get('SELECT * FROM products WHERE id=? AND shop_id=?', id, shopId);
  if (!p) return null;
  p.variants = all('SELECT * FROM variants WHERE product_id=? ORDER BY id', id);
  p.stock = p.variants.reduce((s, v) => s + v.stock, 0);
  return p;
}
function writeVariants(productId, list) {
  const keep = [];
  const clean = (Array.isArray(list) && list.length ? list : [{ label: 'Standard', stock: 0 }]).slice(0, 60);
  for (const v of clean) {
    const color = str(v.color, 20), size = str(v.size, 12);
    const label = str(v.label, 40) || [color, size].filter(Boolean).join(' / ') || 'Standard';
    const po = v.price_override === '' || v.price_override == null ? null : Math.max(0, num(v.price_override));
    const stock = Math.max(0, Math.floor(num(v.stock)));
    if (v.id && get('SELECT id FROM variants WHERE id=? AND product_id=?', num(v.id), productId)) {
      run('UPDATE variants SET label=?, color=?, size=?, stock=?, price_override=? WHERE id=?', label, color, size, stock, po, num(v.id)); keep.push(num(v.id));
    } else {
      const r = run('INSERT INTO variants (product_id, label, color, size, stock, price_override) VALUES (?,?,?,?,?,?)', productId, label, color, size, stock, po); keep.push(Number(r.lastInsertRowid));
    }
  }
  for (const v of all('SELECT id FROM variants WHERE product_id=?', productId)) if (!keep.includes(v.id)) run('DELETE FROM variants WHERE id=?', v.id);
}

app.get('/api/products', auth.auth(), (req, res) => res.json(orders.loadCatalog(req.shopId, { activeOnly: false }).filter(p => p.active)));
app.post('/api/products', auth.auth('products'), (req, res) => {
  const b = req.body || {};
  if (!str(b.name) || !(num(b.price) > 0)) return res.status(400).json({ error: 'name_and_price_required' });
  const image = b.image ? saveImage(b.image, req.shopId) : '';
  const id = tx(() => {
    const r = run('INSERT INTO products (shop_id, name, description, price, category, emoji, image, keywords, low_stock_alert) VALUES (?,?,?,?,?,?,?,?,?)',
      req.shopId, str(b.name, 80), str(b.description, 500), num(b.price), str(b.category, 40), str(b.emoji, 8), image || '', str(b.keywords, 200), Math.max(0, Math.floor(num(b.low_stock_alert, 3))));
    const pid = Number(r.lastInsertRowid); writeVariants(pid, b.variants); return pid;
  });
  res.json(productRow(req.shopId, id));
});
app.put('/api/products/:id', auth.auth('products'), (req, res) => {
  const p = get('SELECT * FROM products WHERE id=? AND shop_id=?', num(req.params.id), req.shopId);
  if (!p) return res.status(404).json({ error: 'not_found' });
  const b = req.body || {};
  if (!str(b.name) || !(num(b.price) > 0)) return res.status(400).json({ error: 'name_and_price_required' });
  const image = b.image && b.image.startsWith('data:') ? saveImage(b.image, req.shopId) : (b.image === '' ? '' : p.image);
  tx(() => {
    run('UPDATE products SET name=?, description=?, price=?, category=?, emoji=?, image=?, keywords=?, low_stock_alert=? WHERE id=?',
      str(b.name, 80), str(b.description, 500), num(b.price), str(b.category, 40), str(b.emoji, 8), image == null ? p.image : image, str(b.keywords, 200), Math.max(0, Math.floor(num(b.low_stock_alert, 3))), p.id);
    if (Array.isArray(b.variants)) writeVariants(p.id, b.variants);
  });
  res.json(productRow(req.shopId, p.id));
});
app.delete('/api/products/:id', auth.auth('products'), (req, res) => {
  run('UPDATE products SET active=0 WHERE id=? AND shop_id=?', num(req.params.id), req.shopId); res.json({ ok: true });
});
app.post('/api/variants/:id/stock', auth.auth('products'), (req, res) => {
  const v = get('SELECT v.* FROM variants v JOIN products p ON p.id=v.product_id WHERE v.id=? AND p.shop_id=?', num(req.params.id), req.shopId);
  if (!v) return res.status(404).json({ error: 'not_found' });
  const next = req.body.set != null ? Math.floor(num(req.body.set)) : v.stock + Math.floor(num(req.body.delta));
  run('UPDATE variants SET stock=? WHERE id=?', Math.max(0, next), v.id); res.json({ stock: Math.max(0, next) });
});
app.post('/api/products/voice-parse', auth.auth('products'), (req, res) => res.json(nlp.parseProductVoice(str(req.body.text, 400))));
app.post('/api/products/import', auth.auth('products'), (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows.slice(0, 500) : [];
  const created = tx(() => {
    const groups = new Map();
    for (const r of rows) {
      const name = str(r.name, 80); if (!name || !(num(r.price) > 0)) continue;
      if (!groups.has(name)) groups.set(name, { r, variants: [] });
      groups.get(name).variants.push({ color: r.color, size: r.size, stock: r.stock });
    }
    let n = 0;
    for (const [name, g] of groups) {
      const ex = get('SELECT id FROM products WHERE shop_id=? AND name=? AND active=1', req.shopId, name);
      let pid;
      if (ex) pid = ex.id;
      else { pid = Number(run('INSERT INTO products (shop_id, name, description, price, category, emoji, keywords) VALUES (?,?,?,?,?,?,?)', req.shopId, name, str(g.r.description, 500), num(g.r.price), str(g.r.category, 40), str(g.r.emoji, 8), str(g.r.keywords, 200)).lastInsertRowid); n++; }
      for (const v of g.variants) {
        const color = str(v.color, 20), size = str(v.size, 12), label = [color, size].filter(Boolean).join(' / ') || 'Standard';
        const found = get('SELECT id FROM variants WHERE product_id=? AND label=?', pid, label);
        if (found) run('UPDATE variants SET stock=? WHERE id=?', Math.max(0, Math.floor(num(v.stock))), found.id);
        else run('INSERT INTO variants (product_id, label, color, size, stock) VALUES (?,?,?,?,?)', pid, label, color, size, Math.max(0, Math.floor(num(v.stock))));
      }
    }
    return n;
  });
  res.json({ created });
});

// =========================================================================
// ORDERS
// =========================================================================
const ORDER_SQL = `SELECT o.*, (SELECT GROUP_CONCAT(qty || '× ' || name || CASE WHEN label != 'Standard' AND label != '' THEN ' (' || label || ')' ELSE '' END, ', ') FROM order_items WHERE order_id=o.id) AS summary FROM orders o`;
app.get('/api/orders', auth.auth(), (req, res) => {
  const where = ['o.shop_id=?']; const p = [req.shopId];
  if (req.query.status && req.query.status !== 'all') { where.push('o.status=?'); p.push(String(req.query.status)); }
  if (req.query.q) { where.push('(o.name LIKE ? OR o.phone LIKE ? OR o.number LIKE ? OR o.city LIKE ?)'); const q = `%${String(req.query.q).slice(0, 40)}%`; p.push(q, q, q, q); }
  const rows = all(`${ORDER_SQL} WHERE ${where.join(' AND ')} ORDER BY o.id DESC LIMIT ?`, ...p, Math.min(500, num(req.query.limit, 200)));
  res.json(rows.map(o => ({ ...o, risk_reasons: convo.safeJson(o.risk_reasons, []) })));
});
app.get('/api/orders.csv', auth.auth(), (req, res) => {
  const rows = all(`${ORDER_SQL} WHERE o.shop_id=? ORDER BY o.id DESC`, req.shopId);
  const q = v => { let x = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(x)) x = "'" + x; return `"${x.replace(/"/g, '""')}"`; }; // neutralise spreadsheet formulas
  const head = ['number', 'date', 'status', 'customer', 'phone', 'city', 'address', 'items', 'subtotal', 'shipping', 'total', 'carrier', 'tracking', 'channel', 'risk'];
  const csv = [head.join(',')].concat(rows.map(o => [o.number, o.created_at, o.status, o.name, o.phone, o.city, o.address, o.summary, o.subtotal, o.shipping_fee, o.total, o.carrier, o.tracking, o.channel, o.risk_level].map(q).join(','))).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8'); res.setHeader('Content-Disposition', 'attachment; filename="cendoor-orders.csv"'); res.send('﻿' + csv);
});
function ownedOrder(req, res) {
  const o = get('SELECT id FROM orders WHERE id=? AND shop_id=?', num(req.params.id), req.shopId);
  if (!o) { res.status(404).json({ error: 'not_found' }); return null; }
  return o.id;
}
app.get('/api/orders/:id', auth.auth(), (req, res) => { const id = ownedOrder(req, res); if (id) res.json(orders.getOrder(id)); });
app.post('/api/orders', auth.auth('orders'), (req, res) => {
  const b = req.body || {};
  const phone = nlp.extractPhone(str(b.phone, 30)).phone, city = nlp.extractCity(str(b.city, 60)) || str(b.city, 60);
  try {
    const o = orders.createOrder({ shopId: req.shopId, customer: { name: str(b.name, 80), phone, city, address: str(b.address, 200) }, items: (b.items || []).map(i => ({ variantId: num(i.variantId), qty: num(i.qty, 1) })), channel: ['instagram', 'tiktok', 'whatsapp', 'web'].includes(b.channel) ? b.channel : 'whatsapp', carrier: str(b.carrier, 30) || undefined, notes: str(b.notes, 200) });
    res.json(o);
  } catch (e) { if (e instanceof orders.OrderError) return res.status(400).json({ error: e.code, available: e.available }); throw e; }
});
app.patch('/api/orders/:id/status', auth.auth('orders'), (req, res) => {
  const id = ownedOrder(req, res); if (!id) return;
  try { res.json(orders.setOrderStatus(id, String(req.body.status), { note: str(req.body.note, 120) })); }
  catch (e) { if (e instanceof orders.OrderError) return res.status(400).json({ error: e.code, detail: e.message }); throw e; }
});
app.patch('/api/orders/:id', auth.auth('orders'), (req, res) => {
  const id = ownedOrder(req, res); if (!id) return;
  const o = get('SELECT * FROM orders WHERE id=?', id);
  const carrier = str(req.body.carrier, 30) || o.carrier;
  if (o.status === 'confirmed' || o.status === 'pending_confirmation') {
    const shop = get('SELECT * FROM shops WHERE id=?', req.shopId);
    const q = orders.quoteShipping(shop, o.city, o.subtotal, carrier);
    run('UPDATE orders SET carrier=?, notes=?, shipping_fee=?, total=? WHERE id=?', carrier, str(req.body.notes, 300), q.fee, o.subtotal + q.fee, id);
  } else run('UPDATE orders SET notes=? WHERE id=?', str(req.body.notes, 300), id);
  res.json(orders.getOrder(id));
});
app.post('/api/orders/:id/advance', auth.auth('orders'), (req, res) => {
  const id = ownedOrder(req, res); if (!id) return;
  try { res.json(orders.advanceShipment(id, { fail: !!req.body.fail })); }
  catch (e) { if (e instanceof orders.OrderError) return res.status(400).json({ error: e.code, detail: e.message }); throw e; }
});
app.post('/api/orders/:id/remit', auth.auth('orders'), (req, res) => { const id = ownedOrder(req, res); if (id) res.json(orders.markRemitted(id, req.body.remitted !== false)); });
app.get('/api/orders/:id/label', auth.auth(), (req, res) => {
  const id = ownedOrder(req, res); if (!id) return;
  const o0 = get('SELECT status FROM orders WHERE id=?', id);
  if (o0.status === 'confirmed' || o0.status === 'shipped' || o0.status === 'failed' || o0.status === 'delivered') orders.ensureLabel(id);
  const order = orders.getOrder(id);
  res.type('html').send(labelHtml(order, get('SELECT * FROM shops WHERE id=?', req.shopId)));
});
app.get('/api/reconciliation', auth.auth(), (req, res) => res.json(analytics.reconciliation(req.shopId)));

// =========================================================================
// INBOX
// =========================================================================
app.get('/api/conversations', auth.auth(), (req, res) => {
  const where = ['c.shop_id=?']; if (req.query.filter === 'attention') where.push('c.needs_attention=1');
  const rows = all(`SELECT c.*, (SELECT text FROM messages WHERE conversation_id=c.id ORDER BY id DESC LIMIT 1) AS last_text,
    (SELECT role FROM messages WHERE conversation_id=c.id ORDER BY id DESC LIMIT 1) AS last_role,
    (SELECT COUNT(*) FROM orders WHERE conversation_id=c.id) AS orders_count FROM conversations c WHERE ${where.join(' AND ')} ORDER BY c.needs_attention DESC, c.updated_at DESC LIMIT 100`, req.shopId);
  res.json(rows.map(c => ({ id: c.id, channel: c.channel, name: c.customer_name || (c.channel === 'whatsapp' ? '+' + c.customer_key : 'Visitor ' + c.customer_key.slice(-4)), last_text: c.last_text, last_role: c.last_role, unread: c.unread, needs_attention: c.needs_attention, attention_reason: c.attention_reason, bot_paused: c.bot_paused, updated_at: c.updated_at, orders_count: c.orders_count, lang: c.lang })));
});
function ownedConvo(req, res) { const c = get('SELECT * FROM conversations WHERE id=? AND shop_id=?', num(req.params.id), req.shopId); if (!c) res.status(404).json({ error: 'not_found' }); return c; }
app.get('/api/conversations/:id', auth.auth(), (req, res) => {
  const c = ownedConvo(req, res); if (!c) return;
  run('UPDATE conversations SET unread=0 WHERE id=?', c.id);
  const msgs = convo.messagesSince(c.id, 0);
  const ords = all('SELECT id, number, status, total, created_at FROM orders WHERE conversation_id=? ORDER BY id DESC', c.id);
  const cust = c.customer_id ? get('SELECT * FROM customers WHERE id=?', c.customer_id) : null;
  res.json({ conversation: { ...c, state: undefined }, messages: msgs, orders: ords, customer: cust });
});
app.post('/api/conversations/:id/reply', auth.auth('conversations'), (req, res) => {
  const c = ownedConvo(req, res); if (!c) return;
  const text = str(req.body.text, 1000); if (!text) return res.status(400).json({ error: 'empty' });
  convo.sendToCustomer(c.id, 'seller', text);
  run('UPDATE conversations SET bot_paused=1, needs_attention=0 WHERE id=?', c.id);
  res.json({ ok: true });
});
app.post('/api/conversations/:id/resume-ai', auth.auth('conversations'), (req, res) => { const c = ownedConvo(req, res); if (!c) return; run('UPDATE conversations SET bot_paused=0 WHERE id=?', c.id); res.json({ ok: true }); });
app.post('/api/conversations/:id/resolve', auth.auth('conversations'), (req, res) => { const c = ownedConvo(req, res); if (!c) return; run('UPDATE conversations SET needs_attention=0, attention_reason=\'\' WHERE id=?', c.id); res.json({ ok: true }); });

// =========================================================================
// CUSTOMERS / ANALYTICS / LINKS / REVIEWS
// =========================================================================
app.get('/api/customers', auth.auth(), (req, res) => {
  const rows = all("SELECT *, CAST(julianday('now') - julianday(last_order_at) AS INTEGER) AS days_since FROM customers WHERE shop_id=? ORDER BY ltv DESC, id DESC LIMIT 300", req.shopId);
  const shop = get('SELECT * FROM shops WHERE id=?', req.shopId);
  res.json(rows.map(c => ({ ...c, reengage: c.orders_count > 0 && c.days_since >= 60, tier: c.ltv >= 1500 ? 'vip' : c.orders_count >= 2 ? 'regular' : 'new', waLink: `https://wa.me/212${c.phone.replace(/^0/, '')}?text=${encodeURIComponent(`Salam ${c.name.split(' ')[0]}, c'est ${shop.name}. Nouveautés dispo — bghiti t-chof? 🎁`)}` })));
});
app.get('/api/analytics', auth.auth(), (req, res) => res.json(analytics.overview(req.shopId, Math.min(60, Math.max(7, num(req.query.days, 14))))));
app.get('/api/reviews', auth.auth(), (req, res) => res.json(all('SELECT r.*, o.number, o.name FROM reviews r LEFT JOIN orders o ON o.id=r.order_id WHERE r.shop_id=? ORDER BY r.id DESC LIMIT 100', req.shopId)));
app.get('/api/links', auth.auth(), (req, res) => res.json(analytics.linkStats(req.shopId)));
app.post('/api/links', auth.auth('links'), (req, res) => {
  const label = str(req.body.label, 80); if (!label) return res.status(400).json({ error: 'label_required' });
  const channel = ['instagram', 'tiktok', 'whatsapp', 'web'].includes(req.body.channel) ? req.body.channel : 'instagram';
  let code; do { code = (channel === 'instagram' ? 'ig' : channel === 'tiktok' ? 'tt' : channel === 'whatsapp' ? 'wa' : 'wb') + '-' + crypto.randomBytes(3).toString('hex'); } while (get('SELECT id FROM post_links WHERE code=?', code));
  const pid = req.body.product_id && get('SELECT id FROM products WHERE id=? AND shop_id=?', num(req.body.product_id), req.shopId) ? num(req.body.product_id) : null;
  run('INSERT INTO post_links (shop_id, code, label, channel, product_id) VALUES (?,?,?,?,?)', req.shopId, code, label, channel, pid);
  res.json({ ok: true, code });
});
app.delete('/api/links/:id', auth.auth('links'), (req, res) => { run('DELETE FROM post_links WHERE id=? AND shop_id=?', num(req.params.id), req.shopId); res.json({ ok: true }); });


// =========================================================================
// COPILOT: insights, carrier recommendation, post kit, tracking, demo reset
// =========================================================================
app.get('/api/insights', auth.auth(), (req, res) => res.json({ insights: insights.insights(req.shopId), value: insights.value(req.shopId), carriers: insights.carrierTable(req.shopId) }));
app.get('/api/carriers/recommend', auth.auth(), (req, res) => {
  const city = nlp.extractCity(str(req.query.city)) || str(req.query.city, 60);
  const names = all('SELECT name FROM carriers WHERE shop_id=? AND enabled=1', req.shopId).map(c => c.name);
  res.json({ city, recommendation: insights.recommendCarrier(req.shopId, city, names) });
});
app.get('/api/products/:id/caption', auth.auth(), (req, res) => {
  const p = productRow(req.shopId, num(req.params.id)); if (!p) return res.status(404).json({ error: 'not_found' });
  const shop = get('SELECT * FROM shops WHERE id=?', req.shopId);
  const base = `${req.protocol}://${req.get('host')}/s/${shop.slug}`;
  const lang = ['dar', 'fr', 'en', 'ar'].includes(req.query.lang) ? req.query.lang : shop.lang;
  const link = req.query.code ? `${base}?p=${encodeURIComponent(String(req.query.code).slice(0, 40))}` : base;
  res.json({ caption: caption(p, shop, { lang, link }), link });
});
// One-tap tracked link for a product post
app.post('/api/products/:id/postlink', auth.auth('links'), (req, res) => {
  const p = get('SELECT id, name FROM products WHERE id=? AND shop_id=?', num(req.params.id), req.shopId); if (!p) return res.status(404).json({ error: 'not_found' });
  const channel = ['instagram', 'tiktok', 'whatsapp'].includes(req.body.channel) ? req.body.channel : 'instagram';
  let code; do { code = (channel === 'instagram' ? 'ig' : channel === 'tiktok' ? 'tt' : 'wa') + '-' + crypto.randomBytes(3).toString('hex'); } while (get('SELECT id FROM post_links WHERE code=?', code));
  run('INSERT INTO post_links (shop_id, code, label, channel, product_id) VALUES (?,?,?,?,?)', req.shopId, code, `${channel === 'tiktok' ? 'TikTok' : channel === 'whatsapp' ? 'WhatsApp' : 'Instagram'}: ${p.name}`, channel, p.id);
  res.json({ code });
});

// Studio: talk to your shop (rules always; Claude tool-calling when ANTHROPIC_API_KEY is set)
app.post('/api/studio', auth.auth('studio'), wrap(async (req, res) => {
  if (limited('studio:' + req.user.id, 60)) return res.status(429).json({ error: 'slow_down' });
  const lang = ['en', 'fr', 'ar'].includes(req.body.lang) ? req.body.lang : 'en';
  const imageUrl = req.body.image ? saveImage(req.body.image, req.shopId) : null;
  if (req.body.image && !imageUrl) return res.status(400).json({ error: 'bad_image' });
  const out = await assistant.handle(req.shopId, req.body.text, { history: Array.isArray(req.body.history) ? req.body.history : [], lang, state: req.body.state && typeof req.body.state === 'object' ? req.body.state : null, imageUrl, userId: req.user.id });
  res.json({ ...out, log: assistant.recentLog(req.shopId) });
}));
app.post('/api/studio/undo', auth.auth('studio'), (req, res) => {
  const l = assistant.undoLast(req.shopId);
  res.json({ ok: !!l, label: l ? l.label : null, log: assistant.recentLog(req.shopId) });
});

// Edit the text and pictures of the generated site directly (free: no AI credits used)
app.get('/api/site/content', auth.auth(), (req, res) => {
  const shop = get('SELECT * FROM shops WHERE id=?', req.shopId); const d = designLib.getDesign(req.shopId); const about = designLib.section(d, 'about') || {}; const site = siteLib.getSite(req.shopId);
  res.json({ name: shop.name, tagline: shop.tagline, announcement: shop.announcement, hero: { title: d.hero.title, subtitle: d.hero.subtitle, cta: d.hero.cta, image: d.hero.image }, about: { title: about.title || '', body: about.body || '', image: d.aboutImage }, logo: d.logo, social: d.social, footer: d.footer, hasSite: !!site, source: site ? site.source : null, credits: shop.ai_credits });
});
app.put('/api/site/content', auth.auth('studio'), (req, res) => {
  const b = req.body || {}; const images = {};
  for (const k of ['hero', 'about', 'logo']) {
    const val = b.images && b.images[k];
    if (val === '' || val === null) images[k] = '';
    else if (typeof val === 'string' && val.startsWith('data:')) { const u = saveImage(val, req.shopId); if (!u) return res.status(400).json({ error: 'bad_image' }); images[k] = u; }
  }
  const r = assistant.editContent(req.shopId, { name: b.name, tagline: b.tagline, announcement: b.announcement, hero: b.hero, about: b.about, footer: b.footer, social: b.social, images });
  if (r.error) return res.status(400).json(r);
  res.json({ ok: true });
});

// Campaigns: announcements and mass messages (always previewed, opted-out customers excluded, daily limit)
// Targeting arrives either as a preset ({segment,arg}) or as a filter object ({targeting})
const targetOf = b => (b.targeting && typeof b.targeting === 'object' ? broadcast.normalize(b.targeting) : broadcast.normalize(broadcast.SEGMENTS.includes(b.segment) ? b.segment : 'all', str(b.arg, 40)));
app.get('/api/campaigns', auth.auth(), (req, res) => {
  const counts = Object.fromEntries(broadcast.SEGMENTS.filter(s => s !== 'city').map(s => [s, broadcast.audience(req.shopId, s).total]));
  res.json({ history: broadcast.history(req.shopId), counts, excluded: broadcast.audience(req.shopId, 'all').excluded, purposes: broadcast.PURPOSES, whatsapp: whatsapp.configured(), maxPerDay: broadcast.MAX_PER_DAY, options: broadcast.options(req.shopId) });
});
app.post('/api/campaigns/draft', auth.auth('studio'), (req, res) => {
  const shop = get('SELECT * FROM shops WHERE id=?', req.shopId); const lang = ['en', 'fr', 'ar'].includes(req.body.lang) ? req.body.lang : (shop.lang === 'dar' ? 'fr' : shop.lang);
  const purpose = broadcast.PURPOSES.includes(req.body.purpose) ? req.body.purpose : 'promo';
  res.json({ text: broadcast.draft(shop, purpose, lang) });
});
app.post('/api/campaigns/preview', auth.auth('studio'), (req, res) => {
  const t = targetOf(req.body); const a = broadcast.audience(req.shopId, t); const lang = ['en', 'fr', 'ar'].includes(req.body.lang) ? req.body.lang : 'en';
  res.json({ count: a.count, total: a.total, excluded: a.excluded, targeting: t, summary: broadcast.describe(req.shopId, t, lang), sample: a.rows.slice(0, 3).map(c => ({ name: c.name, city: c.city, last_product: c.last_product })) });
});
app.post('/api/campaigns/send', auth.auth('studio'), (req, res) => {
  if (limited('campaign:' + req.shopId, 5, 3600000)) return res.status(429).json({ error: 'slow_down' });
  const r = broadcast.send(req.shopId, { targeting: targetOf(req.body), segment: broadcast.SEGMENTS.includes(req.body.segment) ? req.body.segment : 'custom', arg: str(req.body.arg, 40), text: req.body.text, createdBy: req.user.id, baseUrl: process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}` });
  if (r.error) return res.status(r.error === 'daily_limit' ? 429 : 400).json(r);
  res.json(r);
});
app.post('/api/campaigns/audiences', auth.auth('studio'), (req, res) => { const r = broadcast.saveAudience(req.shopId, req.body.name, targetOf(req.body)); res.status(r.error ? 400 : 200).json(r); });
app.delete('/api/campaigns/audiences/:id', auth.auth('studio'), (req, res) => { broadcast.deleteAudience(req.shopId, num(req.params.id)); res.json({ ok: true }); });
app.get('/api/campaigns/:id/queue', auth.auth(), (req, res) => res.json(broadcast.queue(req.shopId, num(req.params.id))));
app.post('/api/campaigns/recipients/:id/done', auth.auth('studio'), (req, res) => { broadcast.markDone(req.shopId, num(req.params.id)); res.json({ ok: true }); });

// Ads: connect the seller's own Meta ad account, review an ad, launch it with one confirmed click
const baseUrl = req => process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
app.get('/api/ads', auth.auth(), (req, res) => {
  res.json({ connection: ads.connection(req.shopId), oauth: ads.configured(), limits: ads.LIMITS, ads: ads.list(req.shopId), products: all('SELECT id, name, price, image FROM products WHERE shop_id=? AND active=1 ORDER BY name', req.shopId) });
});
app.post('/api/ads/draft', auth.auth('studio'), (req, res) => {
  const shop = get('SELECT * FROM shops WHERE id=?', req.shopId); const p = get('SELECT * FROM products WHERE id=? AND shop_id=? AND active=1', num(req.body.product_id), req.shopId);
  if (!p) return res.status(404).json({ error: 'product_not_found' });
  const lang = ['en', 'fr', 'ar'].includes(req.body.lang) ? req.body.lang : (shop.lang === 'dar' ? 'fr' : shop.lang);
  res.json(ads.draft(shop, p, lang, str(req.body.offer, 60)));
});
app.post('/api/ads/launch', auth.auth('studio'), async (req, res) => {
  if (limited('adlaunch:' + req.shopId, 6, 3600000)) return res.status(429).json({ error: 'slow_down' });
  const r = await ads.launch(req.shopId, { productId: num(req.body.product_id), headline: str(req.body.headline, 60), text: str(req.body.text, 320), daily: num(req.body.daily), days: num(req.body.days), createdBy: req.user.id, baseUrl: baseUrl(req), confirmed: req.body.confirmed === true });
  if (r.error) return res.status(r.error === 'meta_error' ? 502 : r.error === 'daily_limit' ? 429 : 400).json(r);
  res.json(r);
});
app.post('/api/ads/:id/pause', auth.auth('studio'), async (req, res) => { const r = await ads.pause(req.shopId, num(req.params.id)); res.status(r.error ? (r.error === 'not_found' ? 404 : 502) : 200).json(r); });
app.post('/api/ads/connect', auth.auth('studio'), async (req, res) => {
  if (req.body.mode === 'demo') { ads.connectDemo(req.shopId); return res.json({ ok: true }); }
  const r = await ads.connectManual(req.shopId, { token: str(req.body.token, 600), adAccountId: str(req.body.ad_account_id, 40), pageId: str(req.body.page_id, 30) });
  res.status(r.error ? 400 : 200).json(r);
});
app.delete('/api/ads/connect', auth.auth('studio'), (req, res) => { ads.disconnect(req.shopId); res.json({ ok: true }); });
app.get('/api/ads/connect/meta', auth.auth('studio'), (req, res) => {
  if (!ads.configured()) return res.status(400).json({ error: 'meta_app_not_configured' });
  res.redirect(ads.oauthUrl(req.shopId, `${baseUrl(req)}/api/ads/connect/callback`));
});
app.get('/api/ads/connect/callback', auth.auth('studio'), async (req, res) => {
  try {
    if (!ads.checkState(req.shopId, req.query.state) || !req.query.code) return res.redirect('/app#/ads?connect=denied');
    const r = await ads.finishOauth(req.shopId, String(req.query.code), `${baseUrl(req)}/api/ads/connect/callback`);
    res.redirect(`/app#/ads?connect=${r.ok ? 'ok' : r.error}`);
  } catch (e) { console.error('[ads oauth]', e.message); res.redirect('/app#/ads?connect=error'); }
});

// Public order tracking: needs the order number AND the phone used on the order
app.get('/api/track', (req, res) => {
  if (limited('track:' + req.ip, 20)) return res.status(429).json({ error: 'slow_down' });
  const shop = publicShop(req.query.shop);
  const number = '#' + String(req.query.number || '').replace(/^#/, '').toUpperCase().slice(0, 20);
  const phone = nlp.extractPhone(str(req.query.phone, 30)).phone;
  if (!shop || !phone) return res.status(404).json({ error: 'not_found' });
  const o = get('SELECT * FROM orders WHERE shop_id=? AND number=? AND phone=?', shop.id, number, phone);
  if (!o) return res.status(404).json({ error: 'not_found' });
  res.json({ shop: shop.name, number: o.number, status: o.status, shipment: o.shipment_status, carrier: o.carrier, tracking: o.tracking, total: o.total, city: o.city, name: o.name.split(' ')[0],
    events: all('SELECT status, created_at FROM shipment_events WHERE order_id=? ORDER BY id', o.id), items: all('SELECT qty, name, label FROM order_items WHERE order_id=?', o.id) });
});
app.get(['/track', '/t/:slug/:num'], (req, res) => res.sendFile(path.join(__dirname, 'public', 'track.html')));

// Demo mode: put the demo shop back to its original state (only when CENDOOR_DEMO=1)
app.post('/api/demo/reset', auth.auth(), (req, res) => {
  if (process.env.CENDOOR_DEMO !== '1' || req.user.email !== 'demo@cendoor.com') return res.status(403).json({ error: 'forbidden' });
  tx(() => { for (const t of ['ads', 'ad_accounts', 'broadcast_recipients', 'broadcasts', 'audiences', 'assistant_log', 'phone_rep', 'wa_sessions', 'shipment_events', 'order_items', 'reviews', 'orders', 'messages', 'conversations', 'customers', 'post_links', 'carriers', 'variants', 'products', 'sessions', 'users', 'shops']) run(`DELETE FROM ${t}`); });
  seedDemo();
  const u = get("SELECT id FROM users WHERE email='demo@cendoor.com'");
  auth.setCookie(res, auth.createSession(u.id), req);
  res.json({ ok: true });
});

// ---- pages ----
app.get('/s/:slug', (req, res) => res.sendFile(path.join(__dirname, 'public', 'shop.html')));
app.get('/app', (req, res) => res.sendFile(path.join(__dirname, 'public', 'app.html')));

app.use((err, req, res, next) => {
  console.error('[error]', req.method, req.url, err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'server_error' });
});

const PORT = Number(process.env.PORT) || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Cendoor running on http://localhost:${PORT}`);
    console.log(`  Dashboard : http://localhost:${PORT}/app   (demo@cendoor.com / demo1234)`);
    console.log(`  Storefront: http://localhost:${PORT}/s/atlas-boutique`);
    console.log(`  AI mode   : ${chat.llmEnabled() ? 'Claude (tool calling)' : 'built-in rules (set ANTHROPIC_API_KEY for the LLM)'}`);
    console.log(`  WhatsApp  : ${whatsapp.configured() ? 'connected' : 'not configured (dry-run)'}`);
  });
}
module.exports = app;
