'use strict';
// The storefront design system. One JSON document per shop describes the whole site: look (preset, colours, font,
// corners, card style, columns), hero, sections (about, FAQ, reviews, delivery, contact...), logo and social links.
// The Studio edits this document; the storefront renders it. Everything is validated here, so neither a seller's
// typo nor an AI tool call can produce a broken page or inject markup.
const { get, run } = require('./db');

const PRESETS = {
  minimal:    { mode: 'light', accent: '#111827', accent2: '#6b7280', bg: '#ffffff', font: 'modern',  radius: 6,  cards: 'outline', columns: 3, hero: 'minimal' },
  elegant:    { mode: 'light', accent: '#9c7a1e', accent2: '#2b2118', bg: '#fbf7ef', font: 'serif',   radius: 4,  cards: 'flat',    columns: 3, hero: 'split' },
  bold:       { mode: 'light', accent: '#e4572e', accent2: '#1b1b1b', bg: '#fffaf3', font: 'modern',  radius: 14, cards: 'soft',    columns: 2, hero: 'banner' },
  playful:    { mode: 'light', accent: '#d6457f', accent2: '#6b4bb5', bg: '#fff7fb', font: 'rounded', radius: 26, cards: 'soft',    columns: 2, hero: 'banner' },
  futuristic: { mode: 'dark',  accent: '#22d3ee', accent2: '#8b5cf6', bg: '#070b14', font: 'modern',  radius: 18, cards: 'glass',   columns: 3, hero: 'banner' },
  natural:    { mode: 'light', accent: '#1e8e5a', accent2: '#c9a46a', bg: '#f6f3ec', font: 'rounded', radius: 18, cards: 'soft',    columns: 3, hero: 'split' },
  luxury:     { mode: 'dark',  accent: '#c9a24a', accent2: '#7c5c1c', bg: '#0c0a08', font: 'serif',   radius: 2,  cards: 'outline', columns: 3, hero: 'split' },
  cendoor:    { mode: 'auto',  accent: '#0f5c5c', accent2: '#f28c28', bg: '',        font: 'modern',  radius: 18, cards: 'soft',    columns: 2, hero: 'minimal' },
};
const FONTS = ['modern', 'serif', 'rounded', 'mono'];
const CARDS = ['soft', 'outline', 'flat', 'glass'];
const MODES = ['light', 'dark', 'auto'];
const HERO_STYLES = ['banner', 'split', 'minimal'];
const SECTION_TYPES = ['featured', 'products', 'about', 'reviews', 'faq', 'delivery', 'contact', 'custom'];
const HEX = /^#[0-9a-fA-F]{6}$/;

const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, n);
const clampInt = (v, lo, hi, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
const hex = (v, d) => (HEX.test(String(v || '')) ? String(v).toLowerCase() : d);
const imgUrl = v => (/^\/(uploads|demo)\/[A-Za-z0-9._-]+$/.test(String(v || '')) ? String(v) : '');

function defaultSections() {
  return [
    { id: 's_featured', type: 'featured', enabled: false, title: '', body: '', items: [] },
    { id: 's_products', type: 'products', enabled: true, title: '', body: '', items: [] },
    { id: 's_about', type: 'about', enabled: false, title: '', body: '', items: [] },
    { id: 's_reviews', type: 'reviews', enabled: true, title: '', body: '', items: [] },
    { id: 's_faq', type: 'faq', enabled: false, title: '', body: '', items: [] },
    { id: 's_delivery', type: 'delivery', enabled: true, title: '', body: '', items: [] },
    { id: 's_contact', type: 'contact', enabled: true, title: '', body: '', items: [] },
  ];
}

function defaults(shop) {
  const p = PRESETS.cendoor;
  return {
    preset: 'cendoor', mode: p.mode, accent: hex(shop && shop.theme_color, p.accent), accent2: p.accent2, bg: p.bg, font: p.font, radius: p.radius, cards: p.cards, columns: p.columns,
    hero: { style: p.hero, title: '', subtitle: '', cta: '', emoji: '', image: '', align: 'start' },
    sections: defaultSections(), logo: { emoji: '', image: '', showName: true },
    social: { instagram: '', tiktok: '', whatsapp: '', phone: '', email: '' }, footer: '', aboutImage: '',
  };
}

function cleanItems(type, items) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 12).map(i => {
    if (type === 'faq') return { q: str(i && i.q, 140), a: str(i && i.a, 400) };
    if (type === 'reviews' || type === 'custom') return { text: str(i && i.text, 300), name: str(i && i.name, 40), emoji: str(i && i.emoji, 8) };
    if (type === 'featured') return { id: clampInt(i && i.id, 1, 1e9, 0) };
    return { text: str(i && i.text, 200), emoji: str(i && i.emoji, 8) };
  }).filter(i => Object.values(i).some(v => v));
}

// Accepts anything (stored JSON, an AI tool call, a partial patch) and returns a complete, safe document.
function normalize(input, shop) {
  const base = defaults(shop);
  const d = input && typeof input === 'object' ? input : {};
  const out = {
    preset: PRESETS[d.preset] || d.preset === 'custom' ? d.preset : base.preset,
    mode: MODES.includes(d.mode) ? d.mode : base.mode,
    accent: hex(d.accent, base.accent), accent2: hex(d.accent2, base.accent2),
    bg: d.bg === '' ? '' : hex(d.bg, base.bg),
    font: FONTS.includes(d.font) ? d.font : base.font,
    radius: clampInt(d.radius, 0, 32, base.radius),
    cards: CARDS.includes(d.cards) ? d.cards : base.cards,
    columns: clampInt(d.columns, 2, 4, base.columns),
    footer: str(d.footer, 200),
    aboutImage: imgUrl(d.aboutImage),
  };
  const h = d.hero && typeof d.hero === 'object' ? d.hero : {};
  out.hero = { style: HERO_STYLES.includes(h.style) ? h.style : base.hero.style, title: str(h.title, 120), subtitle: str(h.subtitle, 240), cta: str(h.cta, 40), emoji: str(h.emoji, 8), image: imgUrl(h.image), align: h.align === 'center' ? 'center' : 'start' };
  const l = d.logo && typeof d.logo === 'object' ? d.logo : {};
  out.logo = { emoji: str(l.emoji, 8), image: imgUrl(l.image), showName: l.showName === false ? false : true };
  const s = d.social && typeof d.social === 'object' ? d.social : {};
  out.social = {
    instagram: str(s.instagram, 60).replace(/^.*instagram\.com\//i, '').replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, ''),
    tiktok: str(s.tiktok, 60).replace(/^.*tiktok\.com\/@?/i, '').replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, ''),
    whatsapp: str(s.whatsapp, 20).replace(/\D/g, ''), phone: str(s.phone, 20).replace(/[^\d+ ]/g, ''),
    email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(str(s.email, 80)) ? str(s.email, 80) : '',
  };
  const raw = Array.isArray(d.sections) ? d.sections : base.sections;
  const seen = new Set();
  out.sections = raw.slice(0, 16).map((x, i) => {
    const type = SECTION_TYPES.includes(x && x.type) ? x.type : null; if (!type) return null;
    if (type !== 'custom' && seen.has(type)) return null; seen.add(type);
    const id = /^s_[a-z0-9_]{1,24}$/.test(x.id || '') ? x.id : `s_${type}${type === 'custom' ? '_' + i : ''}`;
    return { id, type, enabled: x.enabled !== false, title: str(x.title, 80), body: str(x.body, 800), items: cleanItems(type, x.items) };
  }).filter(Boolean);
  if (!out.sections.some(x => x.type === 'products')) out.sections.splice(1, 0, defaultSections()[1]);
  return out;
}

function getDesign(shopId) {
  const shop = get('SELECT * FROM shops WHERE id=?', shopId);
  let raw = {}; try { raw = JSON.parse(shop.design || '{}'); } catch (_) {}
  return normalize(raw, shop);
}
function saveDesign(shopId, design) {
  const shop = get('SELECT * FROM shops WHERE id=?', shopId);
  const clean = normalize(design, shop);
  run('UPDATE shops SET design=?, theme_color=? WHERE id=?', JSON.stringify(clean), clean.accent, shopId);
  return clean;
}

// A preset sets the whole look but keeps the seller's content (hero text, sections, logo, social).
function withPreset(design, name) {
  const p = PRESETS[name]; if (!p) return null;
  return { ...design, preset: name, mode: p.mode, accent: p.accent, accent2: p.accent2, bg: p.bg, font: p.font, radius: p.radius, cards: p.cards, columns: p.columns, hero: { ...design.hero, style: p.hero } };
}

function section(design, type) { return design.sections.find(s => s.type === type); }
function upsertSection(design, type, fields = {}) {
  const d = JSON.parse(JSON.stringify(design));
  let s = section(d, type);
  if (!s) { s = { id: type === 'custom' ? 's_custom_' + Date.now().toString(36).slice(-5) : 's_' + type, type, enabled: true, title: '', body: '', items: [] }; d.sections.push(s); }
  Object.assign(s, fields, { enabled: fields.enabled === undefined ? true : fields.enabled });
  return d;
}
function moveSection(design, type, where, otherType) {
  const d = JSON.parse(JSON.stringify(design));
  const i = d.sections.findIndex(s => s.type === type); if (i < 0) return d;
  const [s] = d.sections.splice(i, 1);
  if (where === 'top') d.sections.unshift(s);
  else if (where === 'bottom') d.sections.push(s);
  else { const j = d.sections.findIndex(x => x.type === otherType); if (j < 0) d.sections.push(s); else d.sections.splice(where === 'above' ? j : j + 1, 0, s); }
  return d;
}

// ---------- "Build my shop" content packs ----------------------------------------
const CATEGORIES = {
  fashion: { emoji: '👗', label: { en: 'Fashion & abayas', fr: 'Mode & abayas', dar: 'Mode u abayat', ar: 'أزياء وعبايات' }, words: ['fashion', 'mode', 'robe', 'robes', 'caftan', 'abaya', 'abayas', 'vetement', 'vetements', 'clothes', 'clothing', 'dress', 'hijab', 'jelaba', 'djellaba', 'قفطان', 'عباية', 'ملابس', 'لباس'],
    samples: [{ name: 'Robe Élégante', price: 320, emoji: '👗', category: 'Robes', keywords: 'robe, dress, فستان', variants: [['Black', 'M', 8], ['Black', 'L', 8], ['Beige', 'M', 6]] }, { name: 'Abaya Classique', price: 350, emoji: '🧥', category: 'Abayas', keywords: 'abaya, عباية', variants: [['Black', 'M', 10], ['Black', 'L', 8]] }, { name: 'Caftan Brodé', price: 650, emoji: '🥻', category: 'Caftans', keywords: 'caftan, قفطان', variants: [['Gold', '', 5], ['Green', '', 4]] }] },
  beauty: { emoji: '🧴', label: { en: 'Beauty & perfume', fr: 'Beauté & parfums', dar: 'Beauté u parfums', ar: 'جمال وعطور' }, words: ['beauty', 'beaute', 'parfum', 'perfume', 'maquillage', 'makeup', 'cosmetique', 'cosmetics', 'soin', 'skincare', 'oud', 'عطر', 'عطور', 'مكياج', 'تجميل'],
    samples: [{ name: 'Parfum Oud', price: 180, emoji: '🧴', category: 'Parfums', keywords: 'parfum, perfume, oud, عطر', variants: [['', '', 30]] }, { name: 'Sérum Éclat', price: 140, emoji: '✨', category: 'Soins', keywords: 'serum, soin, skincare', variants: [['', '', 25]] }, { name: 'Rouge à Lèvres', price: 90, emoji: '💄', category: 'Maquillage', keywords: 'rouge, makeup, lipstick', variants: [['Red', '', 20], ['Pink', '', 20]] }] },
  shoes: { emoji: '👟', label: { en: 'Shoes & bags', fr: 'Chaussures & sacs', dar: 'Sabbat u shnati', ar: 'أحذية وحقائب' }, words: ['shoes', 'shoe', 'chaussures', 'chaussure', 'sneakers', 'baskets', 'bag', 'bags', 'sac', 'sacs', 'sabbat', 'chanta', 'accessoires', 'accessories', 'حذاء', 'أحذية', 'حقيبة', 'شنطة'],
    samples: [{ name: 'Sneakers Urban', price: 420, emoji: '👟', category: 'Chaussures', keywords: 'sneakers, baskets, sabbat', variants: [['White', '39', 6], ['White', '40', 6], ['White', '41', 4]] }, { name: 'Sac Cuir', price: 390, emoji: '👜', category: 'Sacs', keywords: 'sac, bag, cuir, chanta', variants: [['Brown', '', 7], ['Black', '', 5]] }, { name: 'Ceinture Cuir', price: 120, emoji: '🧷', category: 'Accessoires', keywords: 'ceinture, belt', variants: [['Black', '', 15]] }] },
  home: { emoji: '🏺', label: { en: 'Home & decor', fr: 'Maison & déco', dar: 'Dar u déco', ar: 'المنزل والديكور' }, words: ['home', 'maison', 'deco', 'decor', 'decoration', 'meuble', 'furniture', 'tapis', 'carpet', 'poterie', 'ceramique', 'bougie', 'candle', 'ديكور', 'منزل'],
    samples: [{ name: 'Bougie Parfumée', price: 85, emoji: '🕯️', category: 'Déco', keywords: 'bougie, candle', variants: [['', '', 30]] }, { name: 'Plateau Marocain', price: 260, emoji: '🫖', category: 'Maison', keywords: 'plateau, tray, thé', variants: [['Gold', '', 10]] }, { name: 'Tapis Berbère', price: 750, emoji: '🧶', category: 'Tapis', keywords: 'tapis, carpet', variants: [['', '', 4]] }] },
  food: { emoji: '🍯', label: { en: 'Food & sweets', fr: 'Gourmandises', dar: 'Makla u 7lawiyat', ar: 'حلويات وأكل' }, words: ['food', 'sweets', 'gateau', 'gateaux', 'patisserie', 'miel', 'honey', 'dattes', 'dates', 'huile', 'argan', 'epices', 'spices', 'makla', 'حلويات', 'عسل', 'تمر'],
    samples: [{ name: "Miel d'Oranger", price: 120, emoji: '🍯', category: 'Épicerie', keywords: 'miel, honey', variants: [['', '', 25]] }, { name: 'Huile d\'Argan', price: 160, emoji: '🫒', category: 'Épicerie', keywords: 'argan, huile, oil', variants: [['', '', 20]] }, { name: 'Box Gâteaux', price: 150, emoji: '🍪', category: 'Pâtisserie', keywords: 'gateaux, cookies, sweets', variants: [['', '', 15]] }] },
  other: { emoji: '🛍️', label: { en: 'Something else', fr: 'Autre chose', dar: 'Chi 7aja khra', ar: 'شيء آخر' }, words: ['other', 'autre', 'else', 'khra', 'آخر'],
    samples: [{ name: 'Produit Vedette', price: 200, emoji: '🎁', category: 'Nouveautés', keywords: 'produit, nouveau', variants: [['', '', 20]] }, { name: 'Coffret Cadeau', price: 250, emoji: '🛍️', category: 'Cadeaux', keywords: 'coffret, cadeau, gift', variants: [['', '', 12]] }] },
};
const PACK_TEXT = {
  tagline: { en: c => `${c} delivered across Morocco`, fr: c => `${c} livrés partout au Maroc`, dar: c => `${c} kay-wsl l kol l-Maghrib`, ar: c => `${c} توصل لكل المغرب` },
  subtitle: { en: city => `Order in minutes, pay cash on delivery${city ? ' · ' + city : ''}`, fr: city => `Commandez en quelques minutes, payez à la livraison${city ? ' · ' + city : ''}`, dar: city => `Tlob f d9ayq, khlass 3and l-istilam${city ? ' · ' + city : ''}`, ar: city => `اطلب في دقائق وادفع عند الاستلام${city ? ' · ' + city : ''}` },
  cta: { en: 'Order now', fr: 'Commander', dar: 'Tlob daba', ar: 'اطلب الآن' },
  aboutTitle: { en: 'About us', fr: 'À propos', dar: '3lina', ar: 'من نحن' },
  about: { en: n => `${n} is a Moroccan shop run by passionate people. We pick our products with care, pack them ourselves and deliver all over Morocco. Order here or message us: we answer fast.`, fr: n => `${n} est une boutique marocaine tenue par des passionnés. Nous choisissons nos produits avec soin, les préparons nous-mêmes et livrons partout au Maroc. Commandez ici ou écrivez-nous : nous répondons vite.`, dar: n => `${n} boutique maghribiya dyal nas m7ababin l-khdma. Kankhtaro l-produits b 3naya, kan-wejdohom b yedna u kan-sifto l kol l-Maghrib. Tlob mn hna wla kteb lina: kanjawbo bsor3a.`, ar: n => `${n} متجر مغربي يديره أناس شغوفون. نختار منتجاتنا بعناية ونجهزها بأنفسنا ونوصلها لكل المغرب. اطلب من هنا أو راسلنا: نجيب بسرعة.` },
  faqTitle: { en: 'Questions', fr: 'Questions fréquentes', dar: 'As2ila', ar: 'أسئلة شائعة' },
  faq: {
    en: [{ q: 'How do I pay?', a: 'Cash on delivery: you pay the delivery person when you receive your parcel.' }, { q: 'How long does delivery take?', a: 'Usually 2 to 4 days depending on your city. You get updates by message.' }, { q: 'Can I exchange or return an item?', a: 'Yes. Message us within 48 hours and we arrange an exchange.' }],
    fr: [{ q: 'Comment payer ?', a: "Paiement à la livraison : vous payez le livreur à la réception de votre colis." }, { q: 'Quel est le délai de livraison ?', a: 'En général 2 à 4 jours selon votre ville. Vous recevez des mises à jour par message.' }, { q: 'Puis-je échanger un article ?', a: 'Oui. Écrivez-nous sous 48 heures et nous organisons un échange.' }],
    dar: [{ q: 'Kifach nkhlass?', a: 'Khlass 3and l-istilam: katkhlass l-livreur melli kaywsslek l-colis.' }, { q: 'Ch7al kayakhod t-tawsil?', a: 'Gheleb 2 l 4 iyam 7asab l-medina. Kayjik tahdit b risala.' }, { q: 'Wach n9der nbddl chi 7aja?', a: 'Iyeh. Kteb lina f 48 sa3a u ghadi nrattbo l-ibdal.' }],
    ar: [{ q: 'كيف أدفع؟', a: 'الدفع عند الاستلام: تدفع لعامل التوصيل عندما يصلك طردك.' }, { q: 'كم يستغرق التوصيل؟', a: 'عادة من 2 إلى 4 أيام حسب مدينتك. تصلك التحديثات برسالة.' }, { q: 'هل يمكنني تبديل منتج؟', a: 'نعم. راسلنا خلال 48 ساعة وسنرتب التبديل.' }],
  },
};

function buildFromWizard(shop, { category = 'fashion', style = 'natural', color, lang = 'dar' }) {
  const cat = CATEGORIES[category] || CATEGORIES.fashion; const L = ['en', 'fr', 'dar', 'ar'].includes(lang) ? lang : 'fr';
  let d = withPreset(getDesign(shop.id), PRESETS[style] ? style : 'natural');
  if (color && HEX.test(color)) { d.accent = color.toLowerCase(); d.preset = 'custom'; }
  const tagline = PACK_TEXT.tagline[L](cat.label[L]);
  d.hero = { ...d.hero, title: tagline, subtitle: PACK_TEXT.subtitle[L](shop.city), cta: PACK_TEXT.cta[L], emoji: cat.emoji, align: d.hero.style === 'banner' ? 'center' : 'start' };
  d = upsertSection(d, 'featured', { enabled: true });
  d = upsertSection(d, 'about', { title: PACK_TEXT.aboutTitle[L], body: PACK_TEXT.about[L](shop.name), enabled: true });
  d = upsertSection(d, 'faq', { title: PACK_TEXT.faqTitle[L], items: PACK_TEXT.faq[L], enabled: true });
  d.sections = normalize({ ...d, sections: d.sections }, shop).sections;
  // order: featured, products, about, reviews, faq, delivery, contact
  const order = ['featured', 'products', 'about', 'reviews', 'faq', 'delivery', 'contact'];
  d.sections.sort((a, b) => (order.indexOf(a.type) < 0 ? 99 : order.indexOf(a.type)) - (order.indexOf(b.type) < 0 ? 99 : order.indexOf(b.type)));
  return { design: d, tagline, category: cat };
}

// English names for the sample products (the packs are written in French)
const SAMPLE_EN = { 'Robe Élégante': ['Elegant Dress', 'Dresses'], 'Abaya Classique': ['Classic Abaya', 'Abayas'], 'Caftan Brodé': ['Embroidered Caftan', 'Caftans'], 'Parfum Oud': ['Oud Perfume', 'Perfumes'], 'Sérum Éclat': ['Glow Serum', 'Skincare'], 'Rouge à Lèvres': ['Lipstick', 'Makeup'], 'Sneakers Urban': ['Urban Sneakers', 'Shoes'], 'Sac Cuir': ['Leather Bag', 'Bags'], 'Ceinture Cuir': ['Leather Belt', 'Accessories'], 'Bougie Parfumée': ['Scented Candle', 'Decor'], 'Plateau Marocain': ['Moroccan Tea Tray', 'Home'], 'Tapis Berbère': ['Berber Rug', 'Rugs'], "Miel d'Oranger": ['Orange Blossom Honey', 'Pantry'], "Huile d'Argan": ['Argan Oil', 'Pantry'], 'Box Gâteaux': ['Cookie Box', 'Pastry'], 'Produit Vedette': ['Featured Product', 'New'], 'Coffret Cadeau': ['Gift Box', 'Gifts'] };
module.exports = { SAMPLE_EN, PRESETS, CATEGORIES, FONTS, CARDS, SECTION_TYPES, defaults, normalize, getDesign, saveDesign, withPreset, upsertSection, moveSection, section, buildFromWizard, PACK_TEXT };
