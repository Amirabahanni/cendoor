'use strict';
const { get, all } = require('./db');
const orders = require('./orders');

const LIVE = "status != 'cancelled'";

function overview(shopId, days = 14) {
  const today = get(`SELECT COUNT(*) n, COALESCE(SUM(total),0) s FROM orders WHERE shop_id=? AND ${LIVE} AND date(created_at)=date('now')`, shopId);
  const month = get(`SELECT COUNT(*) n, COALESCE(SUM(total),0) s FROM orders WHERE shop_id=? AND ${LIVE} AND strftime('%Y-%m',created_at)=strftime('%Y-%m','now')`, shopId);
  const rows = all(`SELECT date(created_at) d, COUNT(*) n, COALESCE(SUM(total),0) s FROM orders WHERE shop_id=? AND ${LIVE} AND date(created_at) >= date('now', ?) GROUP BY d`, shopId, `-${days - 1} days`);
  const map = Object.fromEntries(rows.map(r => [r.d, r]));
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    series.push({ date: d, orders: map[d] ? map[d].n : 0, sales: map[d] ? map[d].s : 0 });
  }
  const top = all(`SELECT oi.name, SUM(oi.qty) qty, SUM(oi.qty*oi.price) revenue FROM order_items oi JOIN orders o ON o.id=oi.order_id
    WHERE o.shop_id=? AND o.status != 'cancelled' AND date(o.created_at) >= date('now','-30 days') GROUP BY oi.name ORDER BY revenue DESC LIMIT 5`, shopId);
  const channels = all(`SELECT channel, COUNT(*) n, COALESCE(SUM(total),0) s FROM orders WHERE shop_id=? AND ${LIVE} AND date(created_at) >= date('now','-30 days') GROUP BY channel ORDER BY n DESC`, shopId);
  const fin = get("SELECT SUM(status='delivered') d, SUM(status='failed') f FROM orders WHERE shop_id=? AND date(created_at) >= date('now','-90 days')", shopId);
  const done = (fin.d || 0) + (fin.f || 0);
  const lowStock = all(`SELECT p.name pname, v.label, v.stock, p.low_stock_alert FROM variants v JOIN products p ON p.id=v.product_id
    WHERE p.shop_id=? AND p.active=1 AND v.stock <= p.low_stock_alert ORDER BY v.stock, p.name LIMIT 12`, shopId);
  const pending = get("SELECT COUNT(*) n FROM orders WHERE shop_id=? AND status IN ('pending_confirmation','confirmed')", shopId).n;
  const attention = get('SELECT COUNT(*) n FROM conversations WHERE shop_id=? AND needs_attention=1', shopId).n;
  const open = get("SELECT COUNT(*) n FROM orders WHERE shop_id=? AND status='shipped'", shopId).n;
  const failed30 = get("SELECT COUNT(*) n FROM orders WHERE shop_id=? AND status='failed'", shopId).n;
  const recovered = get("SELECT COUNT(DISTINCT order_id) n FROM shipment_events se JOIN orders o ON o.id=se.order_id WHERE o.shop_id=? AND se.status='retry'", shopId).n;
  return {
    today: { orders: today.n, sales: today.s }, month: { orders: month.n, sales: month.s }, series, top, channels,
    successRate: done ? Math.round((fin.d || 0) / done * 1000) / 10 : null, delivered: fin.d || 0, failed: fin.f || 0,
    lowStock, pending, attention, inTransit: open, failedOpen: failed30, recovered, rating: orders.shopRating(shopId),
  };
}

function monthlyUsage(shopId) {
  return get("SELECT COUNT(*) n FROM orders WHERE shop_id=? AND strftime('%Y-%m',created_at)=strftime('%Y-%m','now')", shopId).n;
}

function reconciliation(shopId) {
  const today = get("SELECT COUNT(*) n, COALESCE(SUM(total),0) s FROM orders WHERE shop_id=? AND status='delivered' AND date(delivered_at)=date('now')", shopId);
  const failedToday = get("SELECT COUNT(*) n FROM orders WHERE shop_id=? AND status='failed' AND date(created_at) >= date('now','-1 day')", shopId);
  const pend = get("SELECT COUNT(*) n, COALESCE(SUM(total),0) s FROM orders WHERE shop_id=? AND status='delivered' AND cod_remitted=0", shopId);
  const remitted = get("SELECT COUNT(*) n, COALESCE(SUM(total),0) s FROM orders WHERE shop_id=? AND status='delivered' AND cod_remitted=1 AND date(delivered_at) >= date('now','-30 days')", shopId);
  const pendingList = all("SELECT id, number, name, city, carrier, total, delivered_at FROM orders WHERE shop_id=? AND status='delivered' AND cod_remitted=0 ORDER BY delivered_at DESC LIMIT 50", shopId);
  const byCarrier = all("SELECT carrier, COUNT(*) n, COALESCE(SUM(total),0) s FROM orders WHERE shop_id=? AND status='delivered' AND cod_remitted=0 GROUP BY carrier", shopId);
  return { deliveredToday: today, failedToday: failedToday.n, pending: pend, remitted30: remitted, pendingList, byCarrier };
}

function linkStats(shopId) {
  return all(`SELECT l.*, (SELECT COUNT(*) FROM orders o WHERE o.shop_id=l.shop_id AND o.source_code=l.code AND o.status != 'cancelled') orders,
    (SELECT COALESCE(SUM(total),0) FROM orders o WHERE o.shop_id=l.shop_id AND o.source_code=l.code AND o.status != 'cancelled') revenue
    FROM post_links l WHERE l.shop_id=? ORDER BY revenue DESC, l.id DESC`, shopId);
}

module.exports = { overview, monthlyUsage, reconciliation, linkStats };
