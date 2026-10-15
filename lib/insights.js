'use strict';
// Cendoor Copilot: turns the seller's own order history into concrete decisions.
const { all, get } = require('./db');

const smooth = (d, f) => (d + 1) / (d + f + 2); // avoids 1 delivery out of 1 ranking as "100%"

function carrierRows(shopId) {
  return all("SELECT carrier, city, SUM(status='delivered') d, SUM(status='failed') f FROM orders WHERE shop_id=? AND status IN ('delivered','failed') GROUP BY carrier, city", shopId);
}

// Which carrier actually delivers best, for this city (or overall when the city has too little history)?
function recommendCarrier(shopId, city, enabledNames) {
  const rows = carrierRows(shopId).filter(r => !enabledNames || enabledNames.includes(r.carrier));
  const pick = (list, minN, scope) => {
    const by = {};
    for (const r of list) { const b = by[r.carrier] || (by[r.carrier] = { d: 0, f: 0 }); b.d += r.d; b.f += r.f; }
    const ranked = Object.entries(by).filter(([, v]) => v.d + v.f >= minN).map(([c, v]) => ({ carrier: c, n: v.d + v.f, rate: Math.round(v.d / (v.d + v.f) * 100), score: smooth(v.d, v.f), scope })).sort((a, b) => b.score - a.score);
    return ranked[0] || null;
  };
  return pick(rows.filter(r => r.city === city), 3, 'city') || pick(rows, 8, 'all');
}

function carrierTable(shopId) {
  const by = {};
  for (const r of carrierRows(shopId)) { const b = by[r.carrier] || (by[r.carrier] = { d: 0, f: 0 }); b.d += r.d; b.f += r.f; }
  return Object.entries(by).map(([carrier, v]) => ({ carrier, delivered: v.d, failed: v.f, n: v.d + v.f, rate: v.d + v.f ? Math.round(v.d / (v.d + v.f) * 100) : null })).sort((a, b) => (b.rate || 0) - (a.rate || 0));
}

function insights(shopId) {
  const out = [];
  // 1. stock runway
  const sold = all(`SELECT v.id, p.name, v.label, v.stock, SUM(oi.qty) q FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN variants v ON v.id=oi.variant_id JOIN products p ON p.id=v.product_id
     WHERE o.shop_id=? AND o.status != 'cancelled' AND date(o.created_at) >= date('now','-14 days') AND p.active=1 GROUP BY v.id`, shopId);
  const withRate = sold.map(r => ({ ...r, perDay: r.q / 14 })).filter(r => r.perDay >= 0.25);
  for (const r of withRate.filter(x => x.stock === 0).slice(0, 2)) out.push({ k: 'soldOut', product: r.name + (r.label !== 'Standard' ? ` (${r.label})` : ''), perWeek: Math.round(r.perDay * 7), reorder: Math.max(5, Math.ceil(r.perDay * 21)), href: '#/products' });
  const risky = withRate.filter(r => r.stock > 0 && r.stock / r.perDay <= 7).sort((a, b) => a.stock / a.perDay - b.stock / b.perDay).slice(0, 2);
  for (const r of risky) out.push({ k: 'runway', product: r.name + (r.label !== 'Standard' ? ` (${r.label})` : ''), days: Math.max(0, Math.round(r.stock / r.perDay)), stock: r.stock, reorder: Math.max(5, Math.ceil(r.perDay * 21 - r.stock)), href: '#/products' });
  // 2. carrier gap overall
  const ct = carrierTable(shopId).filter(c => c.n >= 8);
  if (ct.length >= 2) { const best = ct[0], worst = ct[ct.length - 1]; if (best.rate - worst.rate >= 10) out.push({ k: 'carrierGap', best: best.carrier, bestRate: best.rate, worst: worst.carrier, worstRate: worst.rate, href: '#/settings' }); }
  // 3. city-level carrier gap
  const byCity = {};
  for (const r of carrierRows(shopId)) (byCity[r.city] = byCity[r.city] || []).push(r);
  const cityGaps = [];
  for (const [city, list] of Object.entries(byCity)) {
    const c = list.filter(r => r.d + r.f >= 5).map(r => ({ carrier: r.carrier, rate: Math.round(r.d / (r.d + r.f) * 100) })).sort((a, b) => b.rate - a.rate);
    if (c.length >= 2 && c[0].rate - c[c.length - 1].rate >= 30) cityGaps.push({ k: 'carrierCity', city, best: c[0].carrier, bestRate: c[0].rate, worst: c[c.length - 1].carrier, worstRate: c[c.length - 1].rate, href: '#/settings', gap: c[0].rate - c[c.length - 1].rate });
  }
  out.push(...cityGaps.sort((a, b) => b.gap - a.gap).slice(0, 2));
  // 4. best post
  const links = all(`SELECT l.label, l.channel, l.visits, (SELECT COUNT(*) FROM orders o WHERE o.shop_id=l.shop_id AND o.source_code=l.code AND o.status != 'cancelled') n,
     (SELECT COALESCE(SUM(total),0) FROM orders o WHERE o.shop_id=l.shop_id AND o.source_code=l.code AND o.status != 'cancelled') rev FROM post_links l WHERE l.shop_id=? AND l.visits >= 50`, shopId)
    .map(l => ({ ...l, conv: l.n / l.visits })).sort((a, b) => b.conv - a.conv);
  if (links.length) out.push({ k: 'bestPost', label: links[0].label, channel: links[0].channel, conv: Math.round(links[0].conv * 1000) / 10, revenue: links[0].rev, href: '#/links' });
  // 5. win-back
  const wb = get("SELECT COUNT(*) n, COALESCE(AVG(ltv),0) a FROM customers WHERE shop_id=? AND orders_count>0 AND julianday('now') - julianday(last_order_at) >= 60", shopId);
  if (wb.n) out.push({ k: 'winback', n: wb.n, avg: Math.round(wb.a), href: '#/customers' });
  // 6. failure rate
  const m = get("SELECT SUM(status='failed') f, SUM(status IN ('delivered','failed')) t FROM orders WHERE shop_id=? AND date(created_at) >= date('now','-30 days')", shopId);
  if (m.t >= 10 && m.f / m.t >= 0.12) out.push({ k: 'failRate', pct: Math.round(m.f / m.t * 100), href: '#/orders' });
  return out;
}

// What Cendoor handled this month, in numbers the seller can check (estimates are labelled in the UI).
function value(shopId) {
  const rec = get(`SELECT COUNT(DISTINCT o.id) n, COALESCE(SUM(o.total),0) s FROM orders o JOIN shipment_events e ON e.order_id=o.id
     WHERE o.shop_id=? AND e.status IN ('retry','pickup_requested') AND o.status IN ('shipped','delivered')`, shopId);
  const held = get("SELECT COUNT(*) n, COALESCE(SUM(total),0) s FROM orders WHERE shop_id=? AND status='pending_confirmation'", shopId);
  const month = get("SELECT COUNT(*) n FROM orders WHERE shop_id=? AND status != 'cancelled' AND strftime('%Y-%m',created_at)=strftime('%Y-%m','now')", shopId).n;
  const viaChat = get("SELECT COUNT(*) n FROM orders WHERE shop_id=? AND conversation_id IS NOT NULL AND strftime('%Y-%m',created_at)=strftime('%Y-%m','now')", shopId).n;
  return { recovered: { n: rec.n, amount: rec.s }, held: { n: held.n, amount: held.s }, hours: Math.round(month * 6 / 60 * 10) / 10, month, viaChat };
}

module.exports = { recommendCarrier, carrierTable, insights, value };
