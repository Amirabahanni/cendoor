'use strict';
// Announcements and mass messages to customers ("campaigns"). Sending is deliberately guarded:
// the sender must confirm after seeing the exact audience and text, customers who asked to stop are excluded,
// and there is a daily limit. Messages go out through the shop's WhatsApp connection when it exists;
// otherwise every recipient is queued with a one-tap WhatsApp link so nothing is lost.
const { get, all, run, tx } = require('./db');
const convo = require('./convo');
const whatsapp = require('./whatsapp');

const SEGMENTS = ['all', 'vip', 'recent', 'winback', 'new', 'city'];
const MAX_RECIPIENTS = 500, MAX_PER_DAY = 3;

const intl = phone => '212' + String(phone).replace(/^0/, '');
const first = name => String(name || '').trim().split(/\s+/)[0] || '';

function audience(shopId, segment = 'all', arg = '') {
  const where = ["shop_id=?", "phone != ''", "opted_out=0"]; const p = [shopId];
  if (segment === 'vip') where.push('ltv >= 1500');
  else if (segment === 'recent') where.push("last_order_at >= datetime('now','-30 days')");
  else if (segment === 'winback') where.push("last_order_at < datetime('now','-60 days')");
  else if (segment === 'new') where.push('orders_count <= 1');
  else if (segment === 'city' && arg) { where.push('city=?'); p.push(String(arg)); }
  const rows = all(`SELECT id, name, phone, city, ltv, orders_count FROM customers WHERE ${where.join(' AND ')} ORDER BY ltv DESC LIMIT ${MAX_RECIPIENTS}`, ...p);
  const excluded = get(`SELECT COUNT(*) n FROM customers WHERE shop_id=? AND opted_out=1`, shopId).n;
  return { rows, count: rows.length, excluded };
}

const DRAFTS = {
  promo: { en: (n, l) => `Hi {name}! ✨ A special offer at ${n}: ${l ? l + ' ' : ''}Order now and pay on delivery. Reply STOP to unsubscribe.`, fr: (n, l) => `Bonjour {name} ! ✨ Offre spéciale chez ${n} : ${l ? l + ' ' : ''}Commandez maintenant et payez à la livraison. Répondez STOP pour vous désabonner.`, ar: (n, l) => `مرحبا {name}! ✨ عرض خاص من ${n}: ${l ? l + ' ' : ''}اطلب الآن وادفع عند الاستلام. أرسل STOP لإلغاء الاشتراك.` },
  arrivals: { en: n => `Hi {name}! 🆕 New arrivals just landed at ${n}. Take a look and order in a minute. Reply STOP to unsubscribe.`, fr: n => `Bonjour {name} ! 🆕 Nouveautés chez ${n}. Découvrez-les et commandez en une minute. Répondez STOP pour vous désabonner.`, ar: n => `مرحبا {name}! 🆕 وصلت منتجات جديدة إلى ${n}. تفرج واطلب في دقيقة. أرسل STOP لإلغاء الاشتراك.` },
  delivery: { en: n => `Hi {name}! 🚚 Free delivery this weekend at ${n}. Reply STOP to unsubscribe.`, fr: n => `Bonjour {name} ! 🚚 Livraison gratuite ce week-end chez ${n}. Répondez STOP pour vous désabonner.`, ar: n => `مرحبا {name}! 🚚 توصيل مجاني هذا الأسبوع في ${n}. أرسل STOP لإلغاء الاشتراك.` },
  restock: { en: n => `Hi {name}! 🔔 Your favourites are back in stock at ${n}. Reply STOP to unsubscribe.`, fr: n => `Bonjour {name} ! 🔔 Vos produits préférés sont de retour chez ${n}. Répondez STOP pour vous désabonner.`, ar: n => `مرحبا {name}! 🔔 منتجاتك المفضلة رجعت إلى ${n}. أرسل STOP لإلغاء الاشتراك.` },
  thanks: { en: n => `Hi {name}! 💚 Thank you for shopping at ${n}. Your feedback means a lot to us. Reply STOP to unsubscribe.`, fr: n => `Bonjour {name} ! 💚 Merci pour vos achats chez ${n}. Votre avis compte beaucoup pour nous. Répondez STOP pour vous désabonner.`, ar: n => `مرحبا {name}! 💚 شكرا على تسوقك من ${n}. رأيك يهمنا كثيرا. أرسل STOP لإلغاء الاشتراك.` },
  winback: { en: n => `Hi {name}, we miss you at ${n}! 🎁 Come back and enjoy free delivery on your next order. Reply STOP to unsubscribe.`, fr: n => `Bonjour {name}, vous nous manquez chez ${n} ! 🎁 Revenez profiter de la livraison offerte sur votre prochaine commande. Répondez STOP pour vous désabonner.`, ar: n => `مرحبا {name}، افتقدناك في ${n}! 🎁 ارجع واستمتع بتوصيل مجاني في طلبك القادم. أرسل STOP لإلغاء الاشتراك.` },
};
const PURPOSES = Object.keys(DRAFTS);
function draft(shop, purpose = 'promo', lang = 'fr', link = '') {
  const L = ['en', 'fr', 'ar'].includes(lang) ? lang : 'fr'; const f = (DRAFTS[purpose] || DRAFTS.promo)[L];
  return f(shop.name, link);
}

function history(shopId) {
  return all(`SELECT b.*, (SELECT COUNT(*) FROM broadcast_recipients r WHERE r.broadcast_id=b.id AND r.status='sent') sent,
    (SELECT COUNT(*) FROM broadcast_recipients r WHERE r.broadcast_id=b.id AND r.status='queued') queued FROM broadcasts b WHERE b.shop_id=? ORDER BY b.id DESC LIMIT 20`, shopId);
}
function queue(shopId, broadcastId) {
  const shop = get('SELECT * FROM shops WHERE id=?', shopId);
  return all(`SELECT r.id, r.phone, r.name, r.text FROM broadcast_recipients r JOIN broadcasts b ON b.id=r.broadcast_id WHERE b.shop_id=? AND r.broadcast_id=? AND r.status='queued' ORDER BY r.id`, shopId, broadcastId)
    .map(r => ({ ...r, link: `https://wa.me/${intl(r.phone)}?text=${encodeURIComponent(r.text)}` }));
}
function markDone(shopId, recipientId) {
  run("UPDATE broadcast_recipients SET status='sent' WHERE id=? AND broadcast_id IN (SELECT id FROM broadcasts WHERE shop_id=?)", recipientId, shopId);
}

// Create and deliver a campaign. The caller must already have shown the audience and text to the seller.
function send(shopId, { segment = 'all', arg = '', text, createdBy = null }) {
  const body = String(text || '').trim().slice(0, 900);
  if (body.length < 8) return { error: 'text_too_short' };
  if (!SEGMENTS.includes(segment)) return { error: 'bad_segment' };
  const today = get("SELECT COUNT(*) n FROM broadcasts WHERE shop_id=? AND date(created_at)=date('now')", shopId).n;
  if (today >= MAX_PER_DAY) return { error: 'daily_limit', limit: MAX_PER_DAY };
  const a = audience(shopId, segment, arg);
  if (!a.count) return { error: 'no_recipients' };
  const shop = get('SELECT * FROM shops WHERE id=?', shopId);
  const live = whatsapp.configured();
  const id = tx(() => {
    const r = run('INSERT INTO broadcasts (shop_id, segment, arg, text, recipients, status, created_by) VALUES (?,?,?,?,?,?,?)', shopId, segment, String(arg).slice(0, 40), body, a.count, live ? 'sent' : 'queued', createdBy);
    return Number(r.lastInsertRowid);
  });
  let sent = 0, queued = 0;
  for (const c of a.rows) {
    const personal = body.replace(/\{name\}/g, first(c.name)).replace(/\{shop\}/g, shop.name).replace(/\s{2,}/g, ' ').replace(/ ([!,.])/g, '$1');
    const conv = convo.getOrCreate(shopId, intl(c.phone), 'whatsapp');
    if (!conv.customer_id) convo.saveState(conv.id, convo.stateOf(conv), { customer_id: c.id, customer_name: c.name });
    convo.sendToCustomer(conv.id, 'seller', personal);
    run('INSERT INTO broadcast_recipients (broadcast_id, customer_id, phone, name, text, status) VALUES (?,?,?,?,?,?)', id, c.id, c.phone, c.name, personal, live ? 'sent' : 'queued');
    live ? sent++ : queued++;
  }
  return { ok: true, id, recipients: a.count, sent, queued, live };
}

module.exports = { audience, draft, PURPOSES, SEGMENTS, history, queue, markDone, send, MAX_PER_DAY };
