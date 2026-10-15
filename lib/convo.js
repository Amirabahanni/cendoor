'use strict';
const { get, all, run, now } = require('./db');

let sender = null; // set by whatsapp.js so outbound messages can leave the app
function setSender(fn) { sender = fn; }

function getOrCreate(shopId, customerKey, channel = 'web', sourceCode = '') {
  let c = get('SELECT * FROM conversations WHERE shop_id=? AND customer_key=?', shopId, customerKey);
  if (!c) {
    run('INSERT INTO conversations (shop_id, customer_key, channel, source_code) VALUES (?,?,?,?)', shopId, customerKey, channel, sourceCode);
    // a WhatsApp customer who replies later (to a confirmation or an announcement) must be routed to this shop
    if (channel === 'whatsapp') run('INSERT INTO wa_sessions (phone, shop_id, source_code, updated_at) VALUES (?,?,?,?) ON CONFLICT(phone) DO UPDATE SET shop_id=excluded.shop_id, updated_at=excluded.updated_at', customerKey, shopId, sourceCode || '', now());
    c = get('SELECT * FROM conversations WHERE shop_id=? AND customer_key=?', shopId, customerKey);
  } else if (sourceCode && !c.source_code) {
    run('UPDATE conversations SET source_code=? WHERE id=?', sourceCode, c.id);
    c.source_code = sourceCode;
  }
  return c;
}
const byId = id => get('SELECT * FROM conversations WHERE id=?', id);
const stateOf = c => { try { return JSON.parse(c.state || '{}'); } catch (_) { return {}; } };
function saveState(id, state, extra = {}) {
  const sets = ['state=?', 'updated_at=?'];
  const vals = [JSON.stringify(state), now()];
  for (const [k, v] of Object.entries(extra)) { sets.push(`${k}=?`); vals.push(v); }
  run(`UPDATE conversations SET ${sets.join(',')} WHERE id=?`, ...vals, id);
}

function addMessage(conversationId, role, text, quick = []) {
  if (!text) return null;
  run('INSERT INTO messages (conversation_id, role, text, quick) VALUES (?,?,?,?)', conversationId, role, text, JSON.stringify(quick || []));
  const row = get('SELECT * FROM messages WHERE conversation_id=? ORDER BY id DESC LIMIT 1', conversationId);
  if (role === 'customer') run('UPDATE conversations SET unread = unread + 1, updated_at=? WHERE id=?', now(), conversationId);
  else run('UPDATE conversations SET updated_at=? WHERE id=?', now(), conversationId);
  return row;
}

// Message that goes out to the customer (bot, seller or system notification).
function sendToCustomer(conversationId, role, text, quick = []) {
  const row = addMessage(conversationId, role, text, quick);
  const c = byId(conversationId);
  if (c && c.channel === 'whatsapp' && sender) {
    Promise.resolve(sender(c.customer_key, text, quick)).catch(err => console.error('[whatsapp send]', err.message));
  }
  return row;
}

function messagesSince(conversationId, afterId = 0) {
  return all('SELECT id, role, text, quick, created_at FROM messages WHERE conversation_id=? AND id>? ORDER BY id', conversationId, afterId)
    .map(m => ({ ...m, quick: safeJson(m.quick, []) }));
}
function recentMessages(conversationId, n = 20) {
  return all('SELECT role, text FROM messages WHERE conversation_id=? ORDER BY id DESC LIMIT ?', conversationId, n).reverse();
}
function safeJson(s, d) { try { return JSON.parse(s); } catch (_) { return d; } }

function flag(conversationId, reason) {
  run('UPDATE conversations SET needs_attention=1, attention_reason=? WHERE id=?', reason, conversationId);
}

module.exports = { getOrCreate, byId, stateOf, saveState, addMessage, sendToCustomer, messagesSince, recentMessages, flag, setSender, safeJson };
