'use strict';
// WhatsApp Cloud API adapter. Inactive until WHATSAPP_TOKEN + WHATSAPP_PHONE_ID are set
// (those require a verified Meta business). The webhook and sender follow Meta's documented payloads
// but have not been exercised against Meta's live servers.
const crypto = require('crypto');
const { get, run, now } = require('./db');
const convo = require('./convo');
const chat = require('./chat');
const { T } = require('./chat-text');

const TOKEN = () => process.env.WHATSAPP_TOKEN;
const PHONE_ID = () => process.env.WHATSAPP_PHONE_ID;
const configured = () => !!(TOKEN() && PHONE_ID());
const seen = new Set();

async function graph(body) {
  const res = await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID()}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN()}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...body }),
  });
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function send(to, text, quick = []) {
  if (!configured()) { console.log(`[whatsapp:dry-run] -> ${to}: ${text.slice(0, 80)}`); return; }
  const buttons = (quick || []).filter(q => String(q).length <= 20);
  if (buttons.length && buttons.length <= 3 && buttons.length === quick.length) {
    return graph({ to, type: 'interactive', interactive: { type: 'button', body: { text: text.slice(0, 1000) }, action: { buttons: buttons.map((q, i) => ({ type: 'reply', reply: { id: `q${i}`, title: String(q) } })) } } });
  }
  const suffix = quick && quick.length ? '\n\n' + quick.map(q => `• ${q}`).join('\n') : '';
  return graph({ to, type: 'text', text: { body: (text + suffix).slice(0, 4000) } });
}
convo.setSender(send);

function verifySignature(req) {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return true;
  const sig = String(req.headers['x-hub-signature-256'] || '').replace('sha256=', '');
  const expected = crypto.createHmac('sha256', secret).update(req.rawBody || Buffer.from('')).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex')); } catch (_) { return false; }
}

const REF = /\(?\s*ref[:=]\s*([a-z0-9-]+)(?:~([a-z0-9_-]+))?\s*\)?/i;

async function handleIncoming(msg) {
  if (!msg || seen.has(msg.id)) return;
  seen.add(msg.id); if (seen.size > 5000) seen.clear();
  const from = String(msg.from || '');
  let text = '';
  if (msg.type === 'text') text = msg.text && msg.text.body || '';
  else if (msg.type === 'interactive') text = (msg.interactive.button_reply && msg.interactive.button_reply.title) || (msg.interactive.list_reply && msg.interactive.list_reply.title) || '';
  else if (msg.type === 'audio') text = '';
  else text = '';

  let slug = null, code = '';
  const m = REF.exec(text);
  if (m) { slug = m[1]; code = m[2] || ''; text = text.replace(REF, '').trim(); }
  let shop = null;
  if (slug) shop = get('SELECT * FROM shops WHERE slug=?', slug.toLowerCase());
  if (shop) run('INSERT INTO wa_sessions (phone, shop_id, source_code, updated_at) VALUES (?,?,?,?) ON CONFLICT(phone) DO UPDATE SET shop_id=excluded.shop_id, source_code=excluded.source_code, updated_at=excluded.updated_at', from, shop.id, code, now());
  else {
    const s = get('SELECT * FROM wa_sessions WHERE phone=?', from);
    if (s) { shop = get('SELECT * FROM shops WHERE id=?', s.shop_id); code = s.source_code; }
  }
  if (!shop) { await send(from, 'Salam! Please open a shop link (from its Instagram or TikTok post) to start your order.'); return; }

  const c = convo.getOrCreate(shop.id, from, 'whatsapp', code);
  if (msg.type === 'audio') {
    convo.addMessage(c.id, 'customer', '🎤 (voice note)');
    const t = T(c.lang || shop.lang);
    await send(from, t.unclear());
    convo.flag(c.id, 'voice_note');
    return;
  }
  if (!text) text = shop.name; // first click with only a ref -> greeting
  const out = await chat.handleCustomerMessage({ shop, convoRow: c, text: text });
  return out;
}

async function webhookPost(req, res) {
  if (!verifySignature(req)) return res.sendStatus(401);
  res.sendStatus(200); // acknowledge fast, process after
  try {
    for (const entry of (req.body && req.body.entry) || [])
      for (const ch of entry.changes || [])
        for (const msg of (ch.value && ch.value.messages) || []) await handleIncoming(msg);
  } catch (e) { console.error('[whatsapp webhook]', e); }
}

function webhookVerify(req, res) {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN) return res.status(200).send(challenge);
  res.sendStatus(403);
}

module.exports = { webhookPost, webhookVerify, configured, send, handleIncoming };
