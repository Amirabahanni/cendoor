'use strict';
// Ready-to-post captions for Instagram / TikTok / WhatsApp status. Template-based, so it works offline;
// the seller edits and posts. (An LLM could vary the style, but templates keep prices and stock exact.)
const CATEGORY_TAGS = { robes: ['robe', 'fashionmaroc', 'robesoiree'], caftans: ['caftan', 'caftanmarocain', 'takchita'], abayas: ['abaya', 'modestfashion'], chaussures: ['sneakers', 'chaussures', 'sabbat'], parfums: ['parfum', 'oud', 'parfummaroc'], sacs: ['sac', 'maroquinerie', 'bag'] };

function tags(product, shop) {
  const base = (CATEGORY_TAGS[String(product.category || '').toLowerCase()] || [String(product.category || product.name).toLowerCase().replace(/[^a-z0-9]/g, '')]).filter(Boolean);
  const city = String(shop.city || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return [...new Set([...base, 'maroc', 'morocco', city, 'livraisonmaroc'].filter(Boolean))].slice(0, 7).map(t => '#' + t).join(' ');
}

const T = {
  dar: (p, o) => `${o.emoji} ${p.name} ✨\n${o.desc}\n💰 ${o.price} DH · 🚚 Tawsil l kol l-Maghrib · khlass 3and l-istilam${o.urgent ? `\n⚠️ Ba9i ghir ${o.stock} dyal l-qta3!` : ''}\n👉 Tlob daba: ${o.link}`,
  fr: (p, o) => `${o.emoji} ${p.name} ✨\n${o.desc}\n💰 ${o.price} DH · 🚚 Livraison partout au Maroc · paiement à la livraison${o.urgent ? `\n⚠️ Plus que ${o.stock} pièces !` : ''}\n👉 Commandez ici : ${o.link}`,
  en: (p, o) => `${o.emoji} ${p.name} ✨\n${o.desc}\n💰 ${o.price} MAD · 🚚 Delivery all over Morocco · pay on delivery${o.urgent ? `\n⚠️ Only ${o.stock} left!` : ''}\n👉 Order here: ${o.link}`,
  ar: (p, o) => `${o.emoji} ${p.name} ✨\n${o.desc}\n💰 ${o.price} درهم · 🚚 توصيل لكل المغرب · الدفع عند الاستلام${o.urgent ? `\n⚠️ باقي ${o.stock} قطع فقط!` : ''}\n👉 اطلب الآن: ${o.link}`,
};

function caption(product, shop, { lang = 'dar', link }) {
  const stock = (product.variants || []).reduce((s, v) => s + v.stock, 0);
  const prices = (product.variants || []).map(v => (v.price_override != null ? v.price_override : product.price));
  const price = prices.length ? Math.min(...prices) : product.price;
  const desc = String(product.description || '').split(/[.!?]/)[0].trim();
  const body = (T[lang] || T.dar)(product, { emoji: product.emoji || '✨', desc: desc || '', price: Math.round(price), stock, urgent: stock > 0 && stock <= 5, link });
  return `${body.replace(/\n\n+/g, '\n')}\n\n${tags(product, shop)}`;
}

module.exports = { caption };
