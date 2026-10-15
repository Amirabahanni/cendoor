'use strict';
const { get, all, run, tx, now } = require('./db');
const convo = require('./convo');
const { T, money } = require('./chat-text');
const { validPhone } = require('./nlp');
const network = require('./network');
const insights = require('./insights');

// ---------- catalogue -------------------------------------------------------
function loadCatalog(shopId, { activeOnly = true } = {}) {
  const products = all(`SELECT * FROM products WHERE shop_id=? ${activeOnly ? 'AND active=1' : ''} ORDER BY id`, shopId);
  const variants = all('SELECT v.* FROM variants v JOIN products p ON p.id=v.product_id WHERE p.shop_id=? ORDER BY v.id', shopId);
  const byProd = {};
  for (const v of variants) (byProd[v.product_id] = byProd[v.product_id] || []).push(v);
  return products.map(p => ({ ...p, variants: byProd[p.id] || [], stock: (byProd[p.id] || []).reduce((s, v) => s + v.stock, 0) }));
}
const variantPrice = (p, v) => (v && v.price_override != null ? v.price_override : p.price);

// ---------- shipping --------------------------------------------------------
function quoteShipping(shop, city, subtotal, carrierName) {
  const carriers = all('SELECT * FROM carriers WHERE shop_id=? AND enabled=1 ORDER BY id', shop.id);
  let c = carriers.find(x => x.name === (carrierName || shop.default_carrier)) || carriers[0];
  if (!c) return { carrier: shop.default_carrier || 'Amana', fee: 35, eta: '2-3', free: false };
  let prices = {};
  try { prices = JSON.parse(c.city_prices || '{}'); } catch (_) {}
  let fee = city && prices[city] != null ? Number(prices[city]) : Number(c.base_price);
  const free = shop.free_shipping_over > 0 && subtotal >= shop.free_shipping_over;
  if (free) fee = 0;
  return { carrier: c.name, fee, eta: c.eta_days, free };
}

// ---------- COD risk score (Phase 10) ---------------------------------------
function computeRisk(shop, { name, phone, address, total }) {
  let score = 10; const reasons = [];
  if (!validPhone(phone)) { score += 40; reasons.push('invalid_phone'); }
  const cust = get('SELECT * FROM customers WHERE shop_id=? AND phone=?', shop.id, phone || '');
  if (!cust) { score += 10; reasons.push('new_customer'); }
  else {
    if (cust.failed_count > 0) { score += Math.min(50, 25 * cust.failed_count); reasons.push('previous_failed'); }
    if (cust.delivered_count > 0) { score -= Math.min(20, 10 * cust.delivered_count); reasons.push('returning_good'); }
  }
  // Cendoor Shield: what other sellers saw for this number (counters only, never who or why)
  const net = network.lookup(phone, shop.id);
  if (net.failed >= 2 && net.failed > net.delivered) { score += 35; reasons.push('network_failed'); }
  else if (net.failed >= 1 && net.failed >= net.delivered) { score += 18; reasons.push('network_failed'); }
  else if (net.delivered >= 3 && net.failed === 0) { score -= 10; reasons.push('network_good'); }
  if (total > 1500) { score += 15; reasons.push('high_amount'); }
  if (!address || address.length < 12) { score += 10; reasons.push('short_address'); }
  const dup = get("SELECT COUNT(*) n FROM orders WHERE shop_id=? AND phone=? AND status IN ('pending_confirmation','confirmed') AND created_at > datetime('now','-1 day')", shop.id, phone || '');
  if (dup && dup.n > 0) { score += 20; reasons.push('duplicate_recent'); }
  score = Math.max(0, Math.min(100, score));
  const level = score >= 55 ? 'red' : score >= 30 ? 'yellow' : 'green';
  return { score, level, reasons };
}

// ---------- orders ----------------------------------------------------------
function upsertCustomer(shopId, { name, phone, city, address }) {
  let c = get('SELECT * FROM customers WHERE shop_id=? AND phone=?', shopId, phone);
  if (!c) {
    run('INSERT INTO customers (shop_id, phone, name, city, address) VALUES (?,?,?,?,?)', shopId, phone, name || '', city || '', address || '');
    c = get('SELECT * FROM customers WHERE shop_id=? AND phone=?', shopId, phone);
  } else {
    run('UPDATE customers SET name=?, city=?, address=? WHERE id=?', name || c.name, city || c.city, address || c.address, c.id);
  }
  return c;
}

class OrderError extends Error { constructor(code, msg, extra = {}) { super(msg || code); this.code = code; Object.assign(this, extra); } }

function createOrder({ shopId, conversationId = null, customer, items, channel = 'web', sourceCode = '', carrier: carrierName, notes = '', needsCustomerConfirm = false }) {
  const shop = get('SELECT * FROM shops WHERE id=?', shopId);
  if (!shop) throw new OrderError('no_shop');
  if (!items || !items.length) throw new OrderError('empty');
  if (!validPhone(customer.phone)) throw new OrderError('bad_phone');
  if (!customer.name || !customer.city || !customer.address) throw new OrderError('missing_details');

  const created = tx(() => {
    const lines = [];
    let subtotal = 0;
    for (const it of items) {
      const v = get('SELECT v.*, p.name AS pname, p.price AS pprice, p.shop_id, p.active FROM variants v JOIN products p ON p.id=v.product_id WHERE v.id=?', it.variantId);
      if (!v || v.shop_id !== shopId || !v.active) throw new OrderError('bad_item');
      const qty = Math.max(1, Math.floor(Number(it.qty) || 1));
      if (v.stock < qty) throw new OrderError('out_of_stock', 'out_of_stock', { variant: v, available: v.stock });
      const price = v.price_override != null ? v.price_override : v.pprice;
      run('UPDATE variants SET stock = stock - ? WHERE id=?', qty, v.id);
      lines.push({ product_id: v.product_id, variant_id: v.id, name: v.pname, label: v.label, qty, price });
      subtotal += price * qty;
    }
    let chosen = carrierName;
    if (!chosen && shop.auto_carrier) {
      const enabled = all('SELECT name FROM carriers WHERE shop_id=? AND enabled=1', shopId).map(c => c.name);
      const rec = insights.recommendCarrier(shopId, customer.city, enabled);
      if (rec) chosen = rec.carrier;
    }
    const ship = quoteShipping(shop, customer.city, subtotal, chosen);
    const total = subtotal + ship.fee;
    const risk = computeRisk(shop, { ...customer, total });
    const cust = upsertCustomer(shopId, customer);
    run('UPDATE shops SET order_seq = order_seq + 1 WHERE id=?', shopId);
    const seq = get('SELECT order_seq FROM shops WHERE id=?', shopId).order_seq;
    const number = `#CD-${String(seq).padStart(4, '0')}`;
    const status = (risk.level === 'red' || needsCustomerConfirm) ? 'pending_confirmation' : 'confirmed';
    // every order gets a conversation (WhatsApp thread of the customer) so updates and confirmations have somewhere to go
    const convId = conversationId || convo.getOrCreate(shopId, '212' + String(customer.phone).replace(/^0/, ''), 'whatsapp', sourceCode || '').id;
    const r = run(`INSERT INTO orders (shop_id, number, customer_id, conversation_id, name, phone, city, address, status, carrier, subtotal, shipping_fee, total, channel, source_code, risk_level, risk_score, risk_reasons, notes)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      shopId, number, cust.id, convId, customer.name, customer.phone, customer.city, customer.address, status, ship.carrier, subtotal, ship.fee, total, channel, sourceCode || '', risk.level, risk.score, JSON.stringify(risk.reasons), notes || '');
    const orderId = Number(r.lastInsertRowid);
    for (const l of lines) run('INSERT INTO order_items (order_id, product_id, variant_id, name, label, qty, price) VALUES (?,?,?,?,?,?,?)', orderId, l.product_id, l.variant_id, l.name, l.label, l.qty, l.price);
    run('INSERT INTO shipment_events (order_id, status, note) VALUES (?,?,?)', orderId, 'order_created', channel);
    run('UPDATE customers SET orders_count = orders_count + 1, last_order_at=? WHERE id=?', now(), cust.id);
    run('UPDATE conversations SET customer_id=?, customer_name=? WHERE id=?', cust.id, customer.name, convId);
    return { ...getOrder(orderId), eta: ship.eta, verify: risk.level !== 'green' || needsCustomerConfirm };
  });
  if (needsCustomerConfirm) { try { requestConfirmation(created.id); } catch (e) { console.error('[confirmation agent]', e.message); } }
  return created;
}

// The AI confirmation agent: asks the customer to confirm a cash-on-delivery order and acts on the answer (see chat.js).
function requestConfirmation(orderId) {
  const o = get('SELECT * FROM orders WHERE id=?', orderId); if (!o || !o.conversation_id) return false;
  const c = convo.byId(o.conversation_id); const shop = get('SELECT * FROM shops WHERE id=?', o.shop_id);
  const lang = c.lang || shop.lang || 'fr'; const t = T(lang);
  convo.sendToCustomer(c.id, 'system', t.confirmAsk({ first: String(o.name).split(' ')[0], shop: shop.name, number: o.number, total: o.total, city: o.city }), [t.yes, t.no]);
  const st = convo.stateOf(c); st.awaiting = { type: 'confirm', orderId }; convo.saveState(c.id, st);
  run('INSERT INTO shipment_events (order_id, status, note) VALUES (?,?,?)', orderId, 'confirmation_requested', 'AI agent asked the customer to confirm');
  return true;
}

function getOrder(id) {
  const o = get('SELECT * FROM orders WHERE id=?', id);
  if (!o) return null;
  o.items = all('SELECT * FROM order_items WHERE order_id=?', id);
  o.events = all('SELECT status, note, created_at FROM shipment_events WHERE order_id=? ORDER BY id', id);
  try { o.risk_reasons = JSON.parse(o.risk_reasons || '[]'); } catch (_) { o.risk_reasons = []; }
  return o;
}

// ---------- status machine --------------------------------------------------
const FLOW = {
  pending_confirmation: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'failed', 'cancelled'],
  failed: ['shipped', 'cancelled'],
  delivered: [],
  cancelled: [],
};
function trackingFor(order) { return `CDW${String(order.id).padStart(6, '0')}MA`; }

function ensureLabel(orderId) {
  const o = get('SELECT * FROM orders WHERE id=?', orderId);
  if (!o.tracking) {
    run("UPDATE orders SET tracking=?, shipment_status=CASE WHEN shipment_status='none' THEN 'label_created' ELSE shipment_status END WHERE id=?", trackingFor(o), orderId);
    run('INSERT INTO shipment_events (order_id, status, note) VALUES (?,?,?)', orderId, 'label_created', o.carrier);
  }
  return get('SELECT * FROM orders WHERE id=?', orderId);
}

function restock(orderId) {
  for (const it of all('SELECT * FROM order_items WHERE order_id=?', orderId)) {
    if (it.variant_id) run('UPDATE variants SET stock = stock + ? WHERE id=?', it.qty, it.variant_id);
  }
}

function notifyOrder(order, kind, extra = {}) {
  if (!order.conversation_id) return;
  const c = convo.byId(order.conversation_id);
  if (!c) return;
  const shop = get('SELECT * FROM shops WHERE id=?', order.shop_id);
  const lang = c.lang || shop.lang || 'dar';
  const t = T(lang);
  const o = { number: order.number, carrier: order.carrier, tracking: order.tracking, eta: extra.eta || quoteShipping(shop, order.city, order.subtotal, order.carrier).eta, cash: money(order.total, lang) };
  let text = t[kind](o);
  if (process.env.PUBLIC_URL && ['shipped', 'outForDelivery'].includes(kind)) text += `\n🔎 ${process.env.PUBLIC_URL.replace(/\/$/, '')}/t/${shop.slug}/${order.number.replace('#', '')}`;
  convo.sendToCustomer(c.id, 'system', text);
  if (kind === 'delivered') {
    convo.sendToCustomer(c.id, 'system', t.reviewAsk(o), ['5', '4', '3', '2', '1']);
    const st = convo.stateOf(c); st.awaiting = { type: 'review', orderId: order.id }; convo.saveState(c.id, st);
  }
  if (kind === 'failed') {
    const st = convo.stateOf(c); st.awaiting = { type: 'recovery', orderId: order.id }; convo.saveState(c.id, st);
  }
}

function setOrderStatus(orderId, next, { note = '', silent = false } = {}) {
  const o = get('SELECT * FROM orders WHERE id=?', orderId);
  if (!o) throw new OrderError('not_found');
  if (o.status === next) return getOrder(orderId);
  if (!(FLOW[o.status] || []).includes(next)) throw new OrderError('bad_transition', `${o.status} -> ${next}`);
  tx(() => {
    run('UPDATE orders SET status=? WHERE id=?', next, orderId);
    if (next === 'confirmed') run('INSERT INTO shipment_events (order_id, status, note) VALUES (?,?,?)', orderId, 'confirmed', note);
    if (next === 'cancelled') { restock(orderId); run("UPDATE orders SET shipment_status=CASE WHEN shipment_status IN ('none','label_created') THEN shipment_status ELSE 'failed' END WHERE id=?", orderId); run('INSERT INTO shipment_events (order_id, status, note) VALUES (?,?,?)', orderId, 'cancelled', note); }
    if (next === 'shipped') {
      ensureLabel(orderId);
      run("UPDATE orders SET shipment_status='picked_up' WHERE id=?", orderId);
      run('INSERT INTO shipment_events (order_id, status, note) VALUES (?,?,?)', orderId, 'picked_up', note || o.carrier);
    }
    if (next === 'delivered') {
      run("UPDATE orders SET shipment_status='delivered', delivered_at=? WHERE id=?", now(), orderId);
      run('UPDATE customers SET delivered_count = delivered_count + 1, ltv = ltv + ? WHERE id=?', o.total, o.customer_id);
      run('INSERT INTO shipment_events (order_id, status, note) VALUES (?,?,?)', orderId, 'delivered', 'COD collected by carrier');
      network.record(o.phone, o.shop_id, { delivered: 1 });
    }
    if (next === 'failed') {
      run("UPDATE orders SET shipment_status='failed' WHERE id=?", orderId);
      run('UPDATE customers SET failed_count = failed_count + 1 WHERE id=?', o.customer_id);
      run('INSERT INTO shipment_events (order_id, status, note) VALUES (?,?,?)', orderId, 'failed', note || 'Customer unavailable or refused');
      network.record(o.phone, o.shop_id, { failed: 1 });
    }
  });
  const order = getOrder(orderId);
  if (!silent) {
    if (next === 'shipped') notifyOrder(order, 'shipped');
    if (next === 'delivered') notifyOrder(order, 'delivered');
    if (next === 'failed') notifyOrder(order, 'failed');
  }
  return order;
}

// Simulated carrier feed. Real carrier APIs plug in here (same shape: a status per tracking number).
const SHIP_SEQ = ['label_created', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'];
function advanceShipment(orderId, { fail = false } = {}) {
  let o = get('SELECT * FROM orders WHERE id=?', orderId);
  if (!o) throw new OrderError('not_found');
  if (o.status === 'confirmed') { ensureLabel(orderId); o = setOrderStatus(orderId, 'shipped'); return o; }
  if (o.status !== 'shipped') throw new OrderError('not_shippable', o.status);
  const i = SHIP_SEQ.indexOf(o.shipment_status);
  if (fail) return setOrderStatus(orderId, 'failed');
  const nxt = SHIP_SEQ[Math.min(SHIP_SEQ.length - 1, i + 1)];
  if (nxt === 'delivered') return setOrderStatus(orderId, 'delivered');
  run('UPDATE orders SET shipment_status=? WHERE id=?', nxt, orderId);
  run('INSERT INTO shipment_events (order_id, status, note) VALUES (?,?,?)', orderId, nxt, o.carrier);
  const order = getOrder(orderId);
  if (nxt === 'out_for_delivery') notifyOrder(order, 'outForDelivery');
  return order;
}

function markRemitted(orderId, remitted = true) {
  run('UPDATE orders SET cod_remitted=? WHERE id=?', remitted ? 1 : 0, orderId);
  return getOrder(orderId);
}

// Failed-delivery recovery (Phase 12)
function applyRecovery(orderId, choice) {
  const o = get('SELECT * FROM orders WHERE id=?', orderId);
  if (!o || o.status !== 'failed') return null;
  if (choice === 'retry') {
    run("UPDATE orders SET status='shipped', shipment_status='in_transit' WHERE id=?", orderId);
    run('INSERT INTO shipment_events (order_id, status, note) VALUES (?,?,?)', orderId, 'retry', 'Customer asked to retry tomorrow');
    run('UPDATE customers SET failed_count = MAX(0, failed_count - 1) WHERE id=?', o.customer_id); // recovered, not a refusal
    network.record(o.phone, o.shop_id, { failed: -1 });
  } else if (choice === 'pickup') {
    run("UPDATE orders SET status='shipped', shipment_status='in_transit', notes=trim(notes || ' Pickup at carrier agency requested.') WHERE id=?", orderId);
    run('INSERT INTO shipment_events (order_id, status, note) VALUES (?,?,?)', orderId, 'pickup_requested', 'Customer will collect at agency');
  } else if (choice === 'cancel') {
    setOrderStatus(orderId, 'cancelled', { note: 'Cancelled by customer after failed delivery', silent: true });
  }
  return getOrder(orderId);
}

function addReview(shopId, orderId, rating, comment = '') {
  if (get('SELECT id FROM reviews WHERE order_id=?', orderId)) return false;
  run('INSERT INTO reviews (shop_id, order_id, rating, comment) VALUES (?,?,?,?)', shopId, orderId, rating, comment);
  return true;
}

function shopRating(shopId) {
  const r = get('SELECT COUNT(*) n, AVG(rating) avg FROM reviews WHERE shop_id=?', shopId);
  return { count: r.n, avg: r.n ? Math.round(r.avg * 10) / 10 : null };
}

module.exports = {
  loadCatalog, variantPrice, quoteShipping, computeRisk, createOrder, getOrder, setOrderStatus, advanceShipment, ensureLabel,
  markRemitted, applyRecovery, addReview, shopRating, OrderError, FLOW, upsertCustomer, notifyOrder, requestConfirmation,
};
