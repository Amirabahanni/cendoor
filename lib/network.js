'use strict';
// Cendoor Shield: a shared delivery-reliability signal across sellers.
// Only a keyed hash of the phone number and delivered/failed counters are stored: no names, addresses or seller identities.
// Each seller sees counts from OTHER sellers, never who reported them.
const crypto = require('crypto');
const { get, run } = require('./db');

const SECRET = process.env.CENDOOR_NETWORK_SECRET || 'cendoor-dev-secret-change-me';
const hash = phone => crypto.createHmac('sha256', SECRET).update(String(phone || '')).digest('hex').slice(0, 32);

function record(phone, shopId, { delivered = 0, failed = 0 }) {
  if (!phone) return;
  const h = hash(phone);
  run(`INSERT INTO phone_rep (phone_hash, shop_id, delivered, failed) VALUES (?,?,?,?)
       ON CONFLICT(phone_hash, shop_id) DO UPDATE SET delivered = MAX(0, delivered + excluded.delivered), failed = MAX(0, failed + excluded.failed)`,
    h, shopId, Math.max(0, delivered), Math.max(0, failed));
  // negative adjustments (a failed delivery that was later recovered)
  if (delivered < 0 || failed < 0) run('UPDATE phone_rep SET delivered = MAX(0, delivered + ?), failed = MAX(0, failed + ?) WHERE phone_hash=? AND shop_id=?', Math.min(0, delivered), Math.min(0, failed), h, shopId);
}

// What the other sellers have seen for this number.
function lookup(phone, excludeShopId) {
  const r = get('SELECT COALESCE(SUM(delivered),0) delivered, COALESCE(SUM(failed),0) failed, COUNT(*) shops FROM phone_rep WHERE phone_hash=? AND shop_id != ?', hash(phone), excludeShopId || -1);
  return { delivered: r.delivered, failed: r.failed, shops: r.shops };
}

module.exports = { record, lookup, hash };
