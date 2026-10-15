'use strict';
// Announcements and offers to customers ("campaigns") with targeting.
// Targeting combines filters (AND): city, products or categories bought, total spend, number of orders,
// how recently they ordered, the channel they ordered from, and reliability. The seller always sees the audience
// and the exact message before sending, customers who asked to stop are excluded, and there is a daily limit.
// Messages go out through the shop's WhatsApp connection when it exists; otherwise every recipient is queued with
// a one-tap WhatsApp link. Each campaign gets its own tracked shop link, so the orders it brings in are counted.
const { get, all, run, tx } = require('./db');
const convo = require('./convo');
const whatsapp = require('./whatsapp');

const MAX_RECIPIENTS = 500, MAX_PER_DAY = 3;
const CHANNELS = ['instagram', 'tiktok', 'whatsapp', 'web'];
const intl = phone => '212' + String(phone).replace(/^0/, '');
const first = name => String(name || '').trim().split(/\s+/)[0] || '';

// Quick audiences are just ready-made filters.
const PRESETS = {
  all: () => ({}), vip: () => ({ minSpend: 1500 }), recent: () => ({ lastWithin: 30 }), winback: () => ({ olderThan: 60, minOrders: 1 }),
  new: () => ({ maxOrders: 1 }), city: arg => ({ cities: arg ? [String(arg)] : [] }),
};
const SEGMENTS = Object.keys(PRESETS);

const ints = (v, lo, hi) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : undefined; };
const list = (v, f, max = 20) => (Array.isArray(v) ? v.map(f).filter(x => x !== undefined && x !== '').slice(0, max) : []);
// Accepts a preset name, or a filter object from the dashboard or the AI, and returns a safe filter object.
function normalize(t, arg) {
  if (typeof t === 'string') return normalize(PRESETS[t] ? PRESETS[t](arg) : {});
  const x = t && typeof t === 'object' ? t : {};
  const out = {};
  const cities = list(x.cities, c => String(c).slice(0, 40)); if (cities.length) out.cities = cities;
  const products = list(x.productIds, p => ints(p, 1, 1e9)); if (products.length) out.productIds = products;
  const cats = list(x.categories, c => String(c).slice(0, 40)); if (cats.length) out.categories = cats;
  const chans = list(x.channels, c => (CHANNELS.includes(c) ? c : undefined), 4); if (chans.length) out.channels = chans;
  for (const [k, lo, hi] of [['minSpend', 0, 1e7], ['maxSpend', 0, 1e7], ['minOrders', 0, 1e4], ['maxOrders', 0, 1e4], ['lastWithin', 1, 3650], ['olderThan', 1, 3650]]) { const n = ints(x[k], lo, hi); if (n !== undefined) out[k] = n; }
  if (x.reliableOnly) out.reliableOnly = true;
  return out;
}

function where(shopId, t) {
  const w = ['c.shop_id=?', "c.phone != ''", 'c.opted_out=0']; const p = [shopId];
  if (t.cities) { w.push(`c.city IN (${t.cities.map(() => '?').join(',')})`); p.push(...t.cities); }
  if (t.minSpend !== undefined) { w.push('c.ltv >= ?'); p.push(t.minSpend); }
  if (t.maxSpend !== undefined) { w.push('c.ltv <= ?'); p.push(t.maxSpend); }
  if (t.minOrders !== undefined) { w.push('c.orders_count >= ?'); p.push(t.minOrders); }
  if (t.maxOrders !== undefined) { w.push('c.orders_count <= ?'); p.push(t.maxOrders); }
  if (t.lastWithin !== undefined) { w.push("c.last_order_at >= datetime('now', ?)"); p.push(`-${t.lastWithin} days`); }
  if (t.olderThan !== undefined) { w.push("c.last_order_at < datetime('now', ?)"); p.push(`-${t.olderThan} days`); }
  if (t.reliableOnly) w.push('c.failed_count = 0');
  if (t.productIds) { w.push(`EXISTS (SELECT 1 FROM orders o JOIN order_items oi ON oi.order_id=o.id WHERE o.customer_id=c.id AND o.status != 'cancelled' AND oi.product_id IN (${t.productIds.map(() => '?').join(',')}))`); p.push(...t.productIds); }
  if (t.categories) { w.push(`EXISTS (SELECT 1 FROM orders o JOIN order_items oi ON oi.order_id=o.id JOIN products pr ON pr.id=oi.product_id WHERE o.customer_id=c.id AND o.status != 'cancelled' AND pr.category IN (${t.categories.map(() => '?').join(',')}))`); p.push(...t.categories); }
  if (t.channels) { w.push(`EXISTS (SELECT 1 FROM orders o WHERE o.customer_id=c.id AND o.channel IN (${t.channels.map(() => '?').join(',')}))`); p.push(...t.channels); }
  return { sql: w.join(' AND '), params: p };
}

// audience(shopId, 'winback') or audience(shopId, { cities: ['Rabat'], minSpend: 500 })
function audience(shopId, targeting = 'all', arg = '') {
  const t = normalize(targeting, arg); const q = where(shopId, t);
  const rows = all(`SELECT c.id, c.name, c.phone, c.city, c.ltv, c.orders_count,
    (SELECT oi.name FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.customer_id=c.id ORDER BY o.id DESC LIMIT 1) AS last_product
    FROM customers c WHERE ${q.sql} ORDER BY c.ltv DESC LIMIT ${MAX_RECIPIENTS}`, ...q.params);
  const total = get(`SELECT COUNT(*) n FROM customers c WHERE ${q.sql}`, ...q.params).n;
  const excluded = get('SELECT COUNT(*) n FROM customers WHERE shop_id=? AND opted_out=1', shopId).n;
  return { rows, count: rows.length, total, excluded, targeting: t };
}

// Plain-language description of a filter, in the seller's language.
const D = {
  en: { all: 'all customers', and: ' and ', in: c => `in ${c}`, bought: p => `who bought ${p}`, boughtCat: p => `who bought ${p}`, spent: n => `who spent ${n}+ MAD`, spentMax: n => `who spent up to ${n} MAD`, orders: n => `with ${n}+ orders`, ordersMax: n => `with at most ${n} order(s)`, within: n => `who ordered in the last ${n} days`, older: n => `with no order for ${n}+ days`, via: c => `who ordered via ${c}`, reliable: 'with no failed delivery' },
  fr: { all: 'tous les clients', and: ' et ', in: c => `à ${c}`, bought: p => `qui ont acheté ${p}`, boughtCat: p => `qui ont acheté ${p}`, spent: n => `qui ont dépensé ${n}+ MAD`, spentMax: n => `qui ont dépensé jusqu'à ${n} MAD`, orders: n => `avec ${n}+ commandes`, ordersMax: n => `avec au plus ${n} commande(s)`, within: n => `qui ont commandé ces ${n} derniers jours`, older: n => `sans commande depuis ${n}+ jours`, via: c => `venus par ${c}`, reliable: 'sans livraison échouée' },
  ar: { all: 'كل الزبناء', and: ' و', in: c => `في ${c}`, bought: p => `الذين اشتروا ${p}`, boughtCat: p => `الذين اشتروا ${p}`, spent: n => `الذين أنفقوا ${n}+ درهم`, spentMax: n => `الذين أنفقوا حتى ${n} درهم`, orders: n => `لديهم ${n}+ طلبات`, ordersMax: n => `لديهم ${n} طلب على الأكثر`, within: n => `الذين طلبوا خلال آخر ${n} يوما`, older: n => `بدون طلب منذ ${n}+ يوما`, via: c => `الذين طلبوا عبر ${c}`, reliable: 'بدون توصيل فاشل' },
};
function describe(shopId, targeting, lang = 'en') {
  const t = normalize(targeting); const L = D[lang] || D.en; const parts = [];
  if (t.cities) parts.push(L.in(t.cities.join(', ')));
  if (t.productIds) { const names = all(`SELECT name FROM products WHERE shop_id=? AND id IN (${t.productIds.map(() => '?').join(',')})`, shopId, ...t.productIds).map(r => r.name); parts.push(L.bought(names.join(', ') || '…')); }
  if (t.categories) parts.push(L.boughtCat(t.categories.join(', ')));
  if (t.minSpend !== undefined) parts.push(L.spent(t.minSpend));
  if (t.maxSpend !== undefined) parts.push(L.spentMax(t.maxSpend));
  if (t.minOrders !== undefined && t.minOrders > 1) parts.push(L.orders(t.minOrders));
  if (t.maxOrders !== undefined) parts.push(L.ordersMax(t.maxOrders));
  if (t.lastWithin !== undefined) parts.push(L.within(t.lastWithin));
  if (t.olderThan !== undefined) parts.push(L.older(t.olderThan));
  if (t.channels) parts.push(L.via(t.channels.join(', ')));
  if (t.reliableOnly) parts.push(L.reliable);
  return parts.length ? `${L.all} ${parts.join(' ')}` : L.all;
}

const DRAFTS = {
  promo: { en: (n, l) => `Hi {name}! ✨ A special offer at ${n}. Order now and pay on delivery. ${l}`, fr: (n, l) => `Bonjour {name} ! ✨ Offre spéciale chez ${n}. Commandez maintenant et payez à la livraison. ${l}`, ar: (n, l) => `مرحبا {name}! ✨ عرض خاص من ${n}. اطلب الآن وادفع عند الاستلام. ${l}` },
  arrivals: { en: (n, l) => `Hi {name}! 🆕 New arrivals just landed at ${n}. Take a look and order in a minute. ${l}`, fr: (n, l) => `Bonjour {name} ! 🆕 Nouveautés chez ${n}. Découvrez-les et commandez en une minute. ${l}`, ar: (n, l) => `مرحبا {name}! 🆕 وصلت منتجات جديدة إلى ${n}. تفرج واطلب في دقيقة. ${l}` },
  delivery: { en: (n, l) => `Hi {name}! 🚚 Free delivery this weekend at ${n}. ${l}`, fr: (n, l) => `Bonjour {name} ! 🚚 Livraison gratuite ce week-end chez ${n}. ${l}`, ar: (n, l) => `مرحبا {name}! 🚚 توصيل مجاني هذا الأسبوع في ${n}. ${l}` },
  restock: { en: (n, l) => `Hi {name}! 🔔 Your favourites are back in stock at ${n}. ${l}`, fr: (n, l) => `Bonjour {name} ! 🔔 Vos produits préférés sont de retour chez ${n}. ${l}`, ar: (n, l) => `مرحبا {name}! 🔔 منتجاتك المفضلة رجعت إلى ${n}. ${l}` },
  thanks: { en: n => `Hi {name}! 💚 Thank you for shopping at ${n}. Your feedback means a lot to us.`, fr: n => `Bonjour {name} ! 💚 Merci pour vos achats chez ${n}. Votre avis compte beaucoup pour nous.`, ar: n => `مرحبا {name}! 💚 شكرا على تسوقك من ${n}. رأيك يهمنا كثيرا.` },
  winback: { en: (n, l) => `Hi {name}, we miss you at ${n}! 🎁 Come back and enjoy free delivery on your next order. ${l}`, fr: (n, l) => `Bonjour {name}, vous nous manquez chez ${n} ! 🎁 Revenez profiter de la livraison offerte sur votre prochaine commande. ${l}`, ar: (n, l) => `مرحبا {name}، افتقدناك في ${n}! 🎁 ارجع واستمتع بتوصيل مجاني في طلبك القادم. ${l}` },
};
const STOP = { en: 'Reply STOP to unsubscribe.', fr: 'Répondez STOP pour vous désabonner.', ar: 'أرسل STOP لإلغاء الاشتراك.' };
const PURPOSES = Object.keys(DRAFTS);
function draft(shop, purpose = 'promo', lang = 'fr') {
  const L = ['en', 'fr', 'ar'].includes(lang) ? lang : 'fr'; const f = (DRAFTS[purpose] || DRAFTS.promo)[L];
  return `${f(shop.name, '{link}').replace(/\s+$/, '')} ${STOP[L]}`.replace(/\s{2,}/g, ' ');
}

// ---------- results ---------------------------------------------------------
function statsFor(b) {
  const link = b.link_code ? get("SELECT COUNT(*) n, COALESCE(SUM(total),0) s FROM orders WHERE shop_id=? AND source_code=? AND status != 'cancelled'", b.shop_id, b.link_code) : { n: 0, s: 0 };
  const rec = get(`SELECT COUNT(*) n, COALESCE(SUM(o.total),0) s FROM orders o WHERE o.shop_id=? AND o.status != 'cancelled' AND o.created_at >= ? AND o.created_at <= datetime(?, '+7 days')
    AND o.customer_id IN (SELECT customer_id FROM broadcast_recipients WHERE broadcast_id=?)`, b.shop_id, b.created_at, b.created_at, b.id);
  const visits = b.link_code ? (get('SELECT visits FROM post_links WHERE shop_id=? AND code=?', b.shop_id, b.link_code) || { visits: 0 }).visits : 0;
  return { visits, linkOrders: link.n, linkRevenue: link.s, recipientOrders: rec.n, recipientRevenue: rec.s };
}
function history(shopId) {
  return all(`SELECT b.*, (SELECT COUNT(*) FROM broadcast_recipients r WHERE r.broadcast_id=b.id AND r.status='sent') sent,
    (SELECT COUNT(*) FROM broadcast_recipients r WHERE r.broadcast_id=b.id AND r.status='queued') queued FROM broadcasts b WHERE b.shop_id=? ORDER BY b.id DESC LIMIT 20`, shopId)
    .map(b => { let t = {}; try { t = JSON.parse(b.targeting || '{}'); } catch (_) {} return { ...b, targeting: t, ...statsFor(b) }; });
}
function queue(shopId, broadcastId) {
  return all(`SELECT r.id, r.phone, r.name, r.text FROM broadcast_recipients r JOIN broadcasts b ON b.id=r.broadcast_id WHERE b.shop_id=? AND r.broadcast_id=? AND r.status='queued' ORDER BY r.id`, shopId, broadcastId)
    .map(r => ({ ...r, link: `https://wa.me/${intl(r.phone)}?text=${encodeURIComponent(r.text)}` }));
}
function markDone(shopId, recipientId) {
  run("UPDATE broadcast_recipients SET status='sent' WHERE id=? AND broadcast_id IN (SELECT id FROM broadcasts WHERE shop_id=?)", recipientId, shopId);
}

// ---------- saved audiences ---------------------------------------------------
const savedAudiences = shopId => all('SELECT id, name, targeting FROM audiences WHERE shop_id=? ORDER BY id DESC LIMIT 30', shopId).map(a => ({ ...a, targeting: (() => { try { return JSON.parse(a.targeting); } catch (_) { return {}; } })() }));
function saveAudience(shopId, name, targeting) {
  const n = String(name || '').trim().slice(0, 50); if (n.length < 2) return { error: 'name_required' };
  run('INSERT INTO audiences (shop_id, name, targeting) VALUES (?,?,?)', shopId, n, JSON.stringify(normalize(targeting))); return { ok: true };
}
const deleteAudience = (shopId, id) => run('DELETE FROM audiences WHERE id=? AND shop_id=?', id, shopId);

// ---------- sending -----------------------------------------------------------
// The caller must already have shown the audience and text to the seller.
function send(shopId, { targeting, segment, arg = '', text, createdBy = null, baseUrl = '' }) {
  const body = String(text || '').trim().slice(0, 900);
  if (body.length < 8) return { error: 'text_too_short' };
  const t = normalize(targeting !== undefined ? targeting : (segment || 'all'), arg);
  const today = get("SELECT COUNT(*) n FROM broadcasts WHERE shop_id=? AND date(created_at)=date('now')", shopId).n;
  if (today >= MAX_PER_DAY) return { error: 'daily_limit', limit: MAX_PER_DAY };
  const a = audience(shopId, t);
  if (!a.count) return { error: 'no_recipients' };
  const shop = get('SELECT * FROM shops WHERE id=?', shopId);
  const live = whatsapp.configured();
  const base = String(baseUrl || process.env.PUBLIC_URL || '').replace(/\/$/, '');
  let id, code = '';
  tx(() => {
    const r = run('INSERT INTO broadcasts (shop_id, segment, arg, text, recipients, status, created_by, targeting) VALUES (?,?,?,?,?,?,?,?)', shopId, segment || 'custom', String(arg).slice(0, 40), body, a.count, live ? 'sent' : 'queued', createdBy, JSON.stringify(t));
    id = Number(r.lastInsertRowid); code = `cp-${id.toString(36)}`;
    run('INSERT INTO post_links (shop_id, code, label, channel) VALUES (?,?,?,?)', shopId, code, `Campaign: ${body.slice(0, 40)}`, 'whatsapp');
    run('UPDATE broadcasts SET link_code=? WHERE id=?', code, id);
  });
  const link = base ? `${base}/s/${shop.slug}?p=${code}` : '';
  let sent = 0, queued = 0;
  for (const c of a.rows) {
    const personal = body.replace(/\{name\}/g, first(c.name)).replace(/\{shop\}/g, shop.name).replace(/\{city\}/g, c.city || '').replace(/\{last_product\}/g, c.last_product || '').replace(/\{link\}/g, link)
      .replace(/\s{2,}/g, ' ').replace(/ ([!,.?])/g, '$1').trim();
    const conv = convo.getOrCreate(shopId, intl(c.phone), 'whatsapp');
    if (!conv.customer_id) convo.saveState(conv.id, convo.stateOf(conv), { customer_id: c.id, customer_name: c.name });
    convo.sendToCustomer(conv.id, 'seller', personal);
    run('INSERT INTO broadcast_recipients (broadcast_id, customer_id, phone, name, text, status) VALUES (?,?,?,?,?,?)', id, c.id, c.phone, c.name, personal, live ? 'sent' : 'queued');
    live ? sent++ : queued++;
  }
  return { ok: true, id, recipients: a.count, sent, queued, live, link: link || null };
}

// What the dashboard needs to build the targeting form.
function options(shopId) {
  return {
    cities: all("SELECT city, COUNT(*) n FROM customers WHERE shop_id=? AND city != '' AND opted_out=0 GROUP BY city ORDER BY n DESC LIMIT 40", shopId),
    products: all('SELECT id, name FROM products WHERE shop_id=? AND active=1 ORDER BY name', shopId),
    categories: all("SELECT DISTINCT category FROM products WHERE shop_id=? AND active=1 AND category != '' ORDER BY category", shopId).map(r => r.category),
    channels: CHANNELS, saved: savedAudiences(shopId), presets: Object.fromEntries(SEGMENTS.filter(s => s !== 'city').map(s => [s, PRESETS[s]()])),
  };
}

module.exports = { audience, normalize, describe, draft, PURPOSES, SEGMENTS, history, queue, markDone, send, options, saveAudience, deleteAudience, savedAudiences, MAX_PER_DAY, CHANNELS };
