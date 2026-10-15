'use strict';
// Cendoor Studio: the seller talks to their shop and it gets designed, written and changed.
//   "build my shop" / "a luxurious website for my abayas, black and gold"  -> a site is generated for THAT description
//   "another version", "use a carousel", "make it dark", "serif font"       -> regenerate with the change
//   "hero title: …", "add an About section: …", photos, products, prices    -> content, free
//   "send a message to customers who haven't ordered in 2 months: …"       -> campaign (always asks to confirm)
// Basic customisation (the generator, content, photos, products, campaigns) uses no AI credits. Free-form requests
// handled by Claude (bespoke pages) use credits. Every change is logged and undoable.
const { get, all, run, tx } = require('./db');
const nlp = require('./nlp');
const orders = require('./orders');
const analytics = require('./analytics');
const D = require('./design');
const siteLib = require('./site');
const gen = require('./sitegen');
const FONTS = require('./fonts');
const broadcast = require('./broadcast');

// ---------- safe actions ----------------------------------------------------
const FIELDS = ['tagline', 'announcement', 'welcome_msg', 'free_shipping_over', 'tone', 'lang', 'ai_enabled', 'name', 'confirm_agent'];
function clean(k, v) {
  switch (k) {
    case 'tagline': case 'announcement': return String(v).trim().slice(0, 140);
    case 'welcome_msg': return String(v).trim().slice(0, 300);
    case 'name': return String(v).trim().slice(0, 60) || null;
    case 'free_shipping_over': return Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null;
    case 'tone': return v === 'formal' || v === 'friendly' ? v : null;
    case 'lang': return ['dar', 'fr', 'en', 'ar'].includes(v) ? v : null;
    case 'ai_enabled': case 'confirm_agent': return v ? 1 : 0;
    default: return null;
  }
}
function log(shopId, kind, label, before) { run('INSERT INTO assistant_log (shop_id, kind, label, before) VALUES (?,?,?,?)', shopId, kind, String(label).slice(0, 200), JSON.stringify(before)); }
const shopRow = shopId => get('SELECT * FROM shops WHERE id=?', shopId);
const siteJson = shopId => (get('SELECT site FROM shops WHERE id=?', shopId) || {}).site || '';

function setShop(shopId, fields, label) {
  const shop = shopRow(shopId); const before = {}, sets = [], vals = [];
  for (const [k, raw] of Object.entries(fields)) {
    if (!FIELDS.includes(k)) continue;
    const v = clean(k, raw); if (v === null) return { error: 'invalid', field: k };
    before[k] = shop[k]; sets.push(`${k}=?`); vals.push(v);
  }
  if (!sets.length) return { error: 'nothing' };
  run(`UPDATE shops SET ${sets.join(',')} WHERE id=?`, ...vals, shopId);
  log(shopId, 'shop', label || sets.join(','), before);
  return { ok: true };
}

// One undoable edit of the content document (hero text, About, FAQ, social, logo, photos).
function editDesign(shopId, label, fn) {
  const shop = shopRow(shopId); const before = D.getDesign(shopId);
  const next = D.normalize(fn(JSON.parse(JSON.stringify(before))), shop);
  D.saveDesign(shopId, next);
  log(shopId, 'design', label, { design: before });
  return { ok: true, design: next };
}
// Text, photos, name, tagline in one go (used by the "Edit" form and by the AI). Free: no credits.
function editContent(shopId, p) {
  const shop = shopRow(shopId); const before = { shop: { name: shop.name, tagline: shop.tagline, announcement: shop.announcement }, design: D.getDesign(shopId) };
  const sh = {};
  for (const k of ['name', 'tagline', 'announcement']) if (typeof p[k] === 'string') { const c = clean(k, p[k]); if (c === null) return { error: 'invalid', field: k }; sh[k] = c; }
  let next = JSON.parse(JSON.stringify(before.design)); const img = p.images || {};
  if (p.hero) for (const k of ['title', 'subtitle', 'cta']) if (typeof p.hero[k] === 'string') next.hero[k] = p.hero[k];
  if (p.about) {
    const cur = D.section(next, 'about'); const fields = {};
    if (typeof p.about.title === 'string') fields.title = p.about.title;
    if (typeof p.about.body === 'string') { fields.body = p.about.body; fields.enabled = !!p.about.body.trim(); }
    next = D.upsertSection(next, 'about', { ...fields, enabled: fields.enabled === undefined ? (cur ? cur.enabled : true) : fields.enabled });
  }
  if (typeof p.footer === 'string') next.footer = p.footer;
  if (p.social && typeof p.social === 'object') next.social = { ...next.social, ...p.social };
  if (img.hero !== undefined) next.hero.image = img.hero;
  if (img.about !== undefined) next.aboutImage = img.about;
  if (img.logo !== undefined) { next.logo.image = img.logo; if (img.logo) next.logo.emoji = ''; }
  tx(() => {
    if (Object.keys(sh).length) run(`UPDATE shops SET ${Object.keys(sh).map(k => k + '=?').join(',')} WHERE id=?`, ...Object.values(sh), shopId);
    D.saveDesign(shopId, next);
    log(shopId, 'content', 'content', before);
  });
  return { ok: true };
}
const photoTo = (shopId, target, url) => editContent(shopId, { images: { [target]: url } });

function findProduct(shopId, query) {
  const catalog = orders.loadCatalog(shopId);
  const m = nlp.matchProducts(query, catalog);
  if (!m.length) return { error: 'not_found' };
  if (m.length > 1 && m[0].score - m[1].score < 1) return { error: 'ambiguous', options: m.slice(0, 4).map(x => x.product.name) };
  return { product: m[0].product };
}
function setPrice(shopId, query, price) {
  const f = findProduct(shopId, query); if (!f.product) return f;
  if (!(price > 0)) return { error: 'invalid', field: 'price' };
  const p = f.product;
  run('UPDATE products SET price=? WHERE id=? AND shop_id=?', price, p.id, shopId);
  log(shopId, 'price', `${p.name}: ${p.price} → ${price}`, { id: p.id, price: p.price });
  return { ok: true, product: p.name, old: p.price, price };
}
function setStock(shopId, query, mode, n) {
  const f = findProduct(shopId, query); if (!f.product) return f;
  const p = f.product; let v;
  if (p.variants.length === 1) v = p.variants[0];
  else { const pv = nlp.pickVariant(query, p); if (pv.narrowed && pv.candidates.length === 1) v = pv.candidates[0]; else return { error: 'which_variant', product: p.name, options: p.variants.map(x => x.label) }; }
  const next = Math.max(0, Math.floor(mode === 'add' ? v.stock + n : n));
  run('UPDATE variants SET stock=? WHERE id=?', next, v.id);
  log(shopId, 'stock', `${p.name} ${v.label}: ${v.stock} → ${next}`, { rows: [{ id: v.id, stock: v.stock }] });
  return { ok: true, product: p.name, label: v.label, old: v.stock, stock: next };
}
function insertProduct(shopId, d, imageUrl) {
  const r = run('INSERT INTO products (shop_id, name, description, price, category, emoji, image, keywords) VALUES (?,?,?,?,?,?,?,?)', shopId, String(d.name).slice(0, 80), String(d.description || '').slice(0, 500), Number(d.price), String(d.category || '').slice(0, 40), String(d.emoji || '📦').slice(0, 8), imageUrl || '', String(d.keywords || '').slice(0, 200));
  const pid = Number(r.lastInsertRowid);
  const variants = d.variants && d.variants.length ? d.variants : [[d.color || '', d.size || '', d.stock || 0]];
  for (const [color, size, stock] of variants) run('INSERT INTO variants (product_id, label, color, size, stock) VALUES (?,?,?,?,?)', pid, [color, size].filter(Boolean).join(' / ') || 'Standard', String(color || '').slice(0, 20), String(size || '').slice(0, 12), Math.max(0, Math.floor(Number(stock) || 0)));
  return pid;
}
function addProduct(shopId, d, imageUrl) {
  const name = String(d.name || '').trim().slice(0, 80), price = Number(d.price);
  if (!name) return { error: 'invalid', field: 'name' };
  if (!(price > 0)) return { error: 'need_price', name };
  const id = tx(() => insertProduct(shopId, { ...d, name }, imageUrl));
  log(shopId, 'add_product', name, { id });
  return { ok: true, name, price, id };
}
function archiveProduct(shopId, query) {
  const f = findProduct(shopId, query); if (!f.product) return f;
  run('UPDATE products SET active=0 WHERE id=? AND shop_id=?', f.product.id, shopId);
  log(shopId, 'archive', f.product.name, { id: f.product.id });
  return { ok: true, product: f.product.name };
}
function setProductImage(shopId, query, url) {
  const f = findProduct(shopId, query); if (!f.product) return f;
  const p = get('SELECT image FROM products WHERE id=?', f.product.id);
  run('UPDATE products SET image=? WHERE id=? AND shop_id=?', url, f.product.id, shopId);
  log(shopId, 'product_image', f.product.name, { id: f.product.id, image: p.image });
  return { ok: true, product: f.product.name };
}

// ---------- generated websites ------------------------------------------------
const MOOD_TO_PRESET = { elegant: 'elegant', luxury: 'luxury', minimal: 'minimal', bold: 'bold', playful: 'playful', futuristic: 'futuristic', natural: 'natural', warm: 'natural' };
function guessCategory(shopId) {
  const text = orders.loadCatalog(shopId).map(p => `${p.name} ${p.category} ${p.keywords}`).join(' ');
  if (!text.trim()) return 'other';
  const sp = nlp.spaced(text); let best = 'other', score = 0;
  for (const [k, c] of Object.entries(D.CATEGORIES)) { const n = c.words.filter(w => nlp.hasAny(sp, [w])).length; if (n > score) { score = n; best = k; } }
  return best;
}
function createSamples(shopId, category) {
  const have = get('SELECT COUNT(*) n FROM products WHERE shop_id=? AND active=1', shopId).n; if (have >= 3) return [];
  const made = []; for (const s of (D.CATEGORIES[category] || D.CATEGORIES.other).samples) made.push(insertProduct(shopId, s, ''));
  if (made.length) log(shopId, 'samples', 'sample products', { created: made });
  return made;
}
// Build a whole site: generated layout + the texts that go into it.
function buildSite(shopId, input, lang, { samples = false, seed } = {}) {
  const shop = shopRow(shopId); const L = lang === 'dar' ? 'fr' : (['en', 'fr', 'ar'].includes(lang) ? lang : 'fr');
  const beforeDesign = D.getDesign(shopId); const beforeSite = siteJson(shopId); const created = [];
  const category = input.category || guessCategory(shopId);
  const content = D.buildFromWizard(shop, { category, style: MOOD_TO_PRESET[input.mood] || 'natural', lang: L });
  let r;
  tx(() => {
    const d = content.design; d.logo = beforeDesign.logo; d.social = beforeDesign.social; d.hero.image = beforeDesign.hero.image; d.aboutImage = beforeDesign.aboutImage;
    D.saveDesign(shopId, d);
    run('UPDATE shops SET tagline=? WHERE id=?', content.tagline, shopId);
    r = siteLib.build(shopId, { ...input, category }, { fresh: true, seed });
    if (samples) created.push(...createSamples(shopId, category));
  });
  log(shopId, 'build', 'site', { design: beforeDesign, site: beforeSite, tagline: shop.tagline, created });
  return { ok: true, params: r.params, category: content.category, samples: created.length, warnings: r.warnings };
}
// A change to the look of an existing site (or the first site, if none yet).
function restyle(shopId, patch, lang, { bump = false } = {}) {
  const cur = siteLib.getSite(shopId);
  if (!cur) return buildSite(shopId, { ...patch, category: patch.category || guessCategory(shopId) }, lang);
  const beforeSite = siteJson(shopId);
  const r = siteLib.build(shopId, patch, { bump });
  log(shopId, 'site', 'look', { site: beforeSite });
  return { ok: true, params: r.params, warnings: r.warnings };
}

function undoLast(shopId) {
  const l = get('SELECT * FROM assistant_log WHERE shop_id=? AND undone=0 ORDER BY id DESC LIMIT 1', shopId);
  if (!l) return null;
  const b = JSON.parse(l.before || '{}');
  const setSite = json => { let theme = ''; try { theme = (JSON.parse(json || '{}').vars || {}).a || ''; } catch (_) {} run("UPDATE shops SET site=?, theme_color=CASE WHEN ?!='' THEN ? ELSE theme_color END WHERE id=?", json || '', theme, theme, shopId); };
  tx(() => {
    if (l.kind === 'shop') { const keys = Object.keys(b).filter(k => FIELDS.includes(k)); if (keys.length) run(`UPDATE shops SET ${keys.map(k => k + '=?').join(',')} WHERE id=?`, ...keys.map(k => b[k]), shopId); }
    if (['design', 'wizard', 'build', 'content'].includes(l.kind)) {
      run('UPDATE shops SET design=? WHERE id=?', JSON.stringify(b.design), shopId);
      if (l.kind === 'content') run('UPDATE shops SET name=?, tagline=?, announcement=? WHERE id=?', b.shop.name, b.shop.tagline, b.shop.announcement, shopId);
      if (l.kind === 'wizard' || l.kind === 'build') { run('UPDATE shops SET tagline=? WHERE id=?', b.tagline || '', shopId); for (const id of b.created || []) run('UPDATE products SET active=0 WHERE id=? AND shop_id=?', id, shopId); }
      if (l.kind === 'build') setSite(b.site);
    }
    if (l.kind === 'site') setSite(b.site);
    if (l.kind === 'samples') for (const id of b.created || []) run('UPDATE products SET active=0 WHERE id=? AND shop_id=?', id, shopId);
    if (l.kind === 'price') run('UPDATE products SET price=? WHERE id=? AND shop_id=?', b.price, b.id, shopId);
    if (l.kind === 'stock') for (const r of b.rows) run('UPDATE variants SET stock=? WHERE id=? AND product_id IN (SELECT id FROM products WHERE shop_id=?)', r.stock, r.id, shopId);
    if (l.kind === 'add_product') run('UPDATE products SET active=0 WHERE id=? AND shop_id=?', b.id, shopId);
    if (l.kind === 'archive') run('UPDATE products SET active=1 WHERE id=? AND shop_id=?', b.id, shopId);
    if (l.kind === 'product_image') run('UPDATE products SET image=? WHERE id=? AND shop_id=?', b.image || '', b.id, shopId);
    run('UPDATE assistant_log SET undone=1 WHERE id=?', l.id);
  });
  return l;
}
const recentLog = shopId => all('SELECT id, kind, label, created_at FROM assistant_log WHERE shop_id=? AND undone=0 ORDER BY id DESC LIMIT 8', shopId);

function stats(shopId, what) {
  const a = analytics.overview(shopId, 14);
  if (what === 'today') return { today: a.today };
  if (what === 'month') return { month: a.month };
  if (what === 'low') return { low: a.lowStock.map(x => `${x.pname}${x.label !== 'Standard' ? ' (' + x.label + ')' : ''}: ${x.stock}`) };
  if (what === 'pending') return { pending: a.pending, attention: a.attention };
  if (what === 'top') return { top: a.top.map(x => `${x.name} (${Math.round(x.revenue)} MAD)`) };
  return { today: a.today, month: a.month };
}

// ---------- replies ---------------------------------------------------------
const M = n => `${Math.round(n)} MAD`;
const R = {
  en: {
    tagline: v => `Tagline updated to “${v}”.`, announce: v => `Announcement bar is live: “${v}”.`, announceOff: () => 'Announcement bar removed.', welcome: v => `Chat welcome message updated: “${v}”.`,
    freeShip: n => `Free delivery now starts at ${M(n)}.`, freeShipOff: () => 'Free delivery turned off.', tone: v => `The assistant now speaks in a ${v} tone.`,
    aiOn: () => 'The AI will answer customers again.', aiOff: () => 'The AI is paused: customers will see your shop but chat replies are off.', lang: v => `Default language set to ${v}.`, price: r => `${r.product}: ${r.old} → ${r.price} MAD.`,
    stock: r => `${r.product}${r.label !== 'Standard' ? ' (' + r.label + ')' : ''}: stock ${r.old} → ${r.stock}.`, added: r => `Added “${r.name}” at ${r.price} MAD.`, archived: r => `“${r.product}” is hidden from your shop.`,
    undone: l => `Undone: ${l}`, nothingUndo: () => 'There is nothing to undo.', notFound: () => 'I could not find that product. Try its name as it appears in your catalogue.', ambiguous: o => `Which one? ${o.join(', ')}`,
    which: r => `${r.product} has several options (${r.options.join(', ')}). Which one?`, needPrice: n => `What price for “${n}”? For example: add product ${n} 200 dirham 10 pieces.`, invalid: f => `That value is not valid for ${f}.`,
    today: a => `Today: ${M(a.sales)} from ${a.orders} order(s).`, month: a => `This month: ${M(a.sales)} from ${a.orders} order(s).`, low: l => (l.length ? `Running low: ${l.join('; ')}.` : 'Nothing is running low.'), pending: r => `${r.pending} order(s) waiting, ${r.attention} conversation(s) need you.`, top: l => (l.length ? `Top products: ${l.join(', ')}.` : 'No sales yet.'),
    unknown: () => 'I did not catch that. Try “build my website”, “another version”, “make it dark with gold”, “add an About section”, “send a message to my customers” or send a photo.',
    help: () => 'Tell me what you want, in your own words. I design your whole website from a description, change its look and layout, write the hero and sections (About, FAQ, contact), use your photos, add products, change prices and stock, and send announcements to your customers. Say “undo” to revert the last change.',
    chips: ['Build my website', 'Another version', 'Make it dark with gold', 'Add my Instagram', 'Send a message to my customers', 'How much did I sell today?'],
    hero: () => 'Top banner text updated.', sectionOn: n => `The “${n}” part is now on your site.`, sectionOff: n => `The “${n}” part is hidden.`, faqAdded: q => `FAQ added: “${q}”.`, testimonial: () => 'Testimonial added.',
    social: k => `${k} added to your site.`, logoEmoji: e => `Logo set to ${e}.`, logoImage: () => 'Logo updated from your photo.', heroImage: () => 'Main photo updated.', aboutImage: () => 'About photo updated.', imageProduct: n => `Photo added to “${n}”.`,
    askImage: () => 'Got your photo. What is it? For example: “this is the blue dress, 220 dirham, 20 pieces”, “use it as my main photo”, “use it for the About section” or “use it as my logo”.',
    briefAsk: () => 'Describe the website you want: what you sell, the style and the colours. For example “abayas, luxurious, black and gold”.', briefChips: ['Abayas, luxurious, black and gold', 'Perfumes, elegant, soft pink', 'Sneakers, bold, orange and black', 'Honey and sweets, warm and natural'],
    catAsk: () => 'Got the style. What do you sell?', samplesAsk: () => 'Should I add 3 sample products so you can see it working? You can edit or remove them later.',
    siteBuilt: r => `Your website is ready: ${r.mood} style${r.colors ? `, ${r.colors}` : ''}, ${r.cat}. Check the preview. I can try another version, change colours, fonts or layout, or use your photos.`,
    siteChips: ['Another version', 'Make it darker', 'Change the colours to green and gold', 'Use a carousel for products', 'Use a big banner'],
    restyled: w => `Done: ${w}.`, regen: () => 'Here is another version.', newLook: () => 'fresh look',
    moodNames: { elegant: 'elegant', luxury: 'luxury', minimal: 'minimal', bold: 'bold', playful: 'playful', futuristic: 'futuristic', natural: 'natural', warm: 'warm and traditional' }, partNames: { hero: 'main banner', products: 'products', header: 'menu', about: 'about', footer: 'footer' },
    wizCancel: () => 'No problem, I stopped.', wizRetry: () => 'I did not catch that. Pick one of the options below.', yes: 'Yes, add samples', no: 'No, I will add mine', catChips: Object.values(D.CATEGORIES).map(c => c.label.en),
    bcPreview: r => `I will send this to ${r.count} customer(s) (${r.segment})${r.excluded ? `; ${r.excluded} who asked to stop are left out` : ''}:\n“${r.text}”\nReply “send” to confirm, or tell me what to change.`,
    bcNone: () => 'No customers match this audience yet.', bcSent: r => (r.live ? `Sent to ${r.recipients} customers.` : `${r.recipients} messages are ready. WhatsApp is not connected yet, so open Customers > Campaigns to send them with one tap each.`), bcCancel: () => 'Okay, nothing was sent.', bcLimit: r => `You already sent ${r.limit} campaigns today. Try again tomorrow.`, bcShort: () => 'That message is too short.',
    segNames: { all: 'all customers', vip: 'best customers', recent: 'ordered in the last 30 days', winback: 'no order for 60+ days', new: 'first-time customers', city: 'customers in that city' }, bcChips: ['Send', 'Cancel'],
    noCredits: () => 'Advanced AI design uses AI credits and yours are finished. Basic customization (look, layout, text, photos, products) still works and is unlimited. Upgrade your plan to get more credits.',
  },
  fr: {
    tagline: v => `Slogan mis à jour : « ${v} ».`, announce: v => `Bandeau d'annonce en ligne : « ${v} ».`, announceOff: () => "Bandeau d'annonce retiré.", welcome: v => `Message d'accueil du chat mis à jour : « ${v} ».`,
    freeShip: n => `La livraison est gratuite dès ${M(n)}.`, freeShipOff: () => 'Livraison gratuite désactivée.', tone: v => `L'assistant parle maintenant sur un ton ${v}.`,
    aiOn: () => "L'IA répond de nouveau aux clients.", aiOff: () => "L'IA est en pause : les clients voient la boutique mais le chat ne répond plus.", lang: v => `Langue par défaut : ${v}.`, price: r => `${r.product} : ${r.old} → ${r.price} MAD.`,
    stock: r => `${r.product}${r.label !== 'Standard' ? ' (' + r.label + ')' : ''} : stock ${r.old} → ${r.stock}.`, added: r => `« ${r.name} » ajouté à ${r.price} MAD.`, archived: r => `« ${r.product} » est masqué de votre boutique.`,
    undone: l => `Annulé : ${l}`, nothingUndo: () => 'Rien à annuler.', notFound: () => "Je n'ai pas trouvé ce produit. Essayez son nom tel qu'il apparaît dans votre catalogue.", ambiguous: o => `Lequel ? ${o.join(', ')}`,
    which: r => `${r.product} existe en plusieurs versions (${r.options.join(', ')}). Laquelle ?`, needPrice: n => `Quel prix pour « ${n} » ? Par exemple : ajoute produit ${n} 200 dirham 10 pièces.`, invalid: f => `Cette valeur n'est pas valide pour ${f}.`,
    today: a => `Aujourd'hui : ${M(a.sales)} pour ${a.orders} commande(s).`, month: a => `Ce mois-ci : ${M(a.sales)} pour ${a.orders} commande(s).`, low: l => (l.length ? `Bientôt épuisés : ${l.join(' ; ')}.` : 'Rien ne manque.'), pending: r => `${r.pending} commande(s) en attente, ${r.attention} conversation(s) à traiter.`, top: l => (l.length ? `Meilleurs produits : ${l.join(', ')}.` : 'Pas encore de ventes.'),
    unknown: () => "Je n'ai pas compris. Essayez « construis mon site », « autre version », « mode sombre et or », « ajoute une section À propos », « envoie un message à mes clients » ou envoyez une photo.",
    help: () => "Dites-moi ce que vous voulez, avec vos mots. Je crée tout votre site à partir d'une description, je change son style et sa mise en page, j'écris la bannière et les sections (À propos, FAQ, contact), j'utilise vos photos, j'ajoute des produits, je modifie prix et stock, et j'envoie des annonces à vos clients. Dites « annuler » pour revenir en arrière.",
    chips: ['Construis mon site', 'Autre version', 'Mode sombre et or', 'Ajoute mon Instagram', 'Envoie un message à mes clients', "Combien j'ai vendu aujourd'hui ?"],
    hero: () => 'Texte de la bannière mis à jour.', sectionOn: n => `La partie « ${n} » est maintenant sur votre site.`, sectionOff: n => `La partie « ${n} » est masquée.`, faqAdded: q => `Question ajoutée à la FAQ : « ${q} ».`, testimonial: () => 'Témoignage ajouté.',
    social: k => `${k} ajouté à votre site.`, logoEmoji: e => `Logo défini : ${e}.`, logoImage: () => 'Logo mis à jour avec votre photo.', heroImage: () => 'Photo principale mise à jour.', aboutImage: () => 'Photo « À propos » mise à jour.', imageProduct: n => `Photo ajoutée à « ${n} ».`,
    askImage: () => "Photo reçue. De quoi s'agit-il ? Par exemple : « voici la robe bleue, 220 dirham, 20 pièces », « utilise-la comme photo principale », « pour la section À propos » ou « comme logo ».",
    briefAsk: () => 'Décrivez le site que vous voulez : ce que vous vendez, le style et les couleurs. Par exemple « abayas, luxueux, noir et or ».', briefChips: ['Abayas, luxueux, noir et or', 'Parfums, élégant, rose poudré', 'Sneakers, audacieux, orange et noir', 'Miel et douceurs, chaleureux et naturel'],
    catAsk: () => "J'ai le style. Que vendez-vous ?", samplesAsk: () => "Voulez-vous que j'ajoute 3 produits d'exemple pour voir le résultat ? Vous pourrez les modifier ou les supprimer.",
    siteBuilt: r => `Votre site est prêt : style ${r.mood}${r.colors ? `, ${r.colors}` : ''}, ${r.cat}. Regardez l'aperçu. Je peux proposer une autre version, changer couleurs, polices ou mise en page, ou utiliser vos photos.`,
    siteChips: ['Autre version', 'Plus sombre', 'Couleurs vert et or', 'Carrousel pour les produits', 'Grande bannière'],
    restyled: w => `C'est fait : ${w}.`, regen: () => 'Voici une autre version.', newLook: () => 'nouveau style',
    moodNames: { elegant: 'élégant', luxury: 'luxe', minimal: 'minimal', bold: 'audacieux', playful: 'ludique', futuristic: 'futuriste', natural: 'naturel', warm: 'chaleureux et traditionnel' }, partNames: { hero: 'bannière principale', products: 'produits', header: 'menu', about: 'à propos', footer: 'pied de page' },
    wizCancel: () => "D'accord, j'ai arrêté.", wizRetry: () => "Je n'ai pas compris. Choisissez une des options ci-dessous.", yes: 'Oui, ajoute des exemples', no: "Non, j'ajoute les miens", catChips: Object.values(D.CATEGORIES).map(c => c.label.fr),
    bcPreview: r => `Je vais envoyer ceci à ${r.count} client(s) (${r.segment})${r.excluded ? ` ; ${r.excluded} qui ont demandé l'arrêt sont exclus` : ''} :\n« ${r.text} »\nRépondez « envoyer » pour confirmer, ou dites-moi quoi changer.`,
    bcNone: () => 'Aucun client ne correspond à cette audience pour le moment.', bcSent: r => (r.live ? `Envoyé à ${r.recipients} clients.` : `${r.recipients} messages sont prêts. WhatsApp n'est pas encore connecté : ouvrez Clients > Campagnes pour les envoyer en un clic chacun.`), bcCancel: () => "D'accord, rien n'a été envoyé.", bcLimit: r => `Vous avez déjà envoyé ${r.limit} campagnes aujourd'hui. Réessayez demain.`, bcShort: () => 'Ce message est trop court.',
    segNames: { all: 'tous les clients', vip: 'meilleurs clients', recent: 'ont commandé ces 30 derniers jours', winback: 'sans commande depuis 60+ jours', new: 'nouveaux clients', city: 'clients de cette ville' }, bcChips: ['Envoyer', 'Annuler'],
    noCredits: () => "Le design IA avancé utilise des crédits IA et les vôtres sont épuisés. La personnalisation de base (style, mise en page, textes, photos, produits) reste illimitée. Passez à une offre supérieure pour plus de crédits.",
  },
  dar: {},
  ar: {
    tagline: v => `تم تحديث الشعار: «${v}».`, announce: v => `شريط الإعلان يعمل الآن: «${v}».`, announceOff: () => 'تمت إزالة شريط الإعلان.', welcome: v => `تم تحديث رسالة ترحيب المحادثة: «${v}».`,
    freeShip: n => `التوصيل مجاني ابتداء من ${M(n)}.`, freeShipOff: () => 'تم إيقاف التوصيل المجاني.', tone: v => `المساعد يتكلم الآن بأسلوب ${v}.`,
    aiOn: () => 'الذكاء الاصطناعي سيجيب الزبناء من جديد.', aiOff: () => 'الذكاء الاصطناعي متوقف: سيرى الزبناء متجرك لكن ردود المحادثة متوقفة.', lang: v => `اللغة الافتراضية: ${v}.`, price: r => `${r.product}: ${r.old} ← ${r.price} درهم.`,
    stock: r => `${r.product}${r.label !== 'Standard' ? ' (' + r.label + ')' : ''}: المخزون ${r.old} ← ${r.stock}.`, added: r => `تمت إضافة «${r.name}» بثمن ${r.price} درهم.`, archived: r => `«${r.product}» مخفي من متجرك.`,
    undone: l => `تم التراجع: ${l}`, nothingUndo: () => 'لا شيء للتراجع عنه.', notFound: () => 'لم أجد هذا المنتج. جرّب اسمه كما يظهر في الكتالوج.', ambiguous: o => `أي واحد؟ ${o.join('، ')}`,
    which: r => `${r.product} له عدة خيارات (${r.options.join('، ')}). أي واحد؟`, needPrice: n => `ما ثمن «${n}»؟ مثلا: زيد منتج ${n} 200 درهم 10 قطع.`, invalid: f => `هذه القيمة غير صالحة لـ ${f}.`,
    today: a => `اليوم: ${M(a.sales)} من ${a.orders} طلب.`, month: a => `هذا الشهر: ${M(a.sales)} من ${a.orders} طلب.`, low: l => (l.length ? `على وشك النفاد: ${l.join('؛ ')}.` : 'لا شيء على وشك النفاد.'), pending: r => `${r.pending} طلب في الانتظار، و${r.attention} محادثة تحتاجك.`, top: l => (l.length ? `أفضل المنتجات: ${l.join('، ')}.` : 'لا مبيعات بعد.'),
    unknown: () => 'لم أفهم جيدا. جرّب «ابني موقعي» أو «نسخة أخرى» أو «خليه داكنا بالذهبي» أو «زيد قسم من نحن» أو «صيفط رسالة للزبناء» أو أرسل صورة.',
    help: () => 'قل لي ماذا تريد بكلامك. أصمم لك موقعا كاملا من وصف، وأغيّر شكله وتخطيطه، وأكتب البانر والأقسام (من نحن، الأسئلة، التواصل)، وأستعمل صورك، وأضيف منتجات، وأغيّر الأثمنة والمخزون، وأرسل إعلانات لزبناءك. قل «تراجع» لإلغاء آخر تغيير.',
    chips: ['ابني موقعي', 'نسخة أخرى', 'خليه داكنا بالذهبي', 'زيد الإنستغرام ديالي', 'صيفط رسالة للزبناء', 'شحال بعت اليوم؟'],
    hero: () => 'تم تحديث نص البانر الرئيسي.', sectionOn: n => `قسم «${n}» أصبح في موقعك.`, sectionOff: n => `قسم «${n}» مخفي.`, faqAdded: q => `تمت إضافة سؤال: «${q}».`, testimonial: () => 'تمت إضافة الشهادة.',
    social: k => `تمت إضافة ${k} إلى موقعك.`, logoEmoji: e => `تم تعيين الشعار: ${e}.`, logoImage: () => 'تم تحديث الشعار من صورتك.', heroImage: () => 'تم تحديث الصورة الرئيسية.', aboutImage: () => 'تم تحديث صورة «من نحن».', imageProduct: n => `تمت إضافة الصورة إلى «${n}».`,
    askImage: () => 'وصلتني الصورة. ما هي؟ مثلا: «هذا الفستان الأزرق، 220 درهم، 20 قطعة»، أو «استعملها كصورة رئيسية» أو «لقسم من نحن» أو «كشعار».',
    briefAsk: () => 'صف الموقع الذي تريده: ماذا تبيع، والأسلوب والألوان. مثلا «عبايات، فاخر، أسود وذهبي».', briefChips: ['عبايات، فاخر، أسود وذهبي', 'عطور، أنيق، وردي هادئ', 'أحذية رياضية، جريء، برتقالي وأسود', 'عسل وحلويات، دافئ وطبيعي'],
    catAsk: () => 'فهمت الأسلوب. ماذا تبيع؟', samplesAsk: () => 'هل أضيف 3 منتجات تجريبية لترى النتيجة؟ يمكنك تعديلها أو حذفها لاحقا.',
    siteBuilt: r => `موقعك جاهز: أسلوب ${r.mood}${r.colors ? `، ${r.colors}` : ''}، ${r.cat}. شاهد المعاينة. يمكنني اقتراح نسخة أخرى أو تغيير الألوان والخطوط والتخطيط أو استعمال صورك.`,
    siteChips: ['نسخة أخرى', 'أغمق', 'ألوان أخضر وذهبي', 'عرض المنتجات كشريط متحرك', 'بانر كبير'],
    restyled: w => `تم: ${w}.`, regen: () => 'هذه نسخة أخرى.', newLook: () => 'مظهر جديد',
    moodNames: { elegant: 'أنيق', luxury: 'فاخر', minimal: 'بسيط', bold: 'جريء', playful: 'مرح', futuristic: 'مستقبلي', natural: 'طبيعي', warm: 'دافئ وتقليدي' }, partNames: { hero: 'البانر الرئيسي', products: 'المنتجات', header: 'القائمة', about: 'من نحن', footer: 'التذييل' },
    wizCancel: () => 'حسنا، توقفت.', wizRetry: () => 'لم أفهم. اختر أحد الخيارات أدناه.', yes: 'نعم، أضف أمثلة', no: 'لا، سأضيف منتجاتي', catChips: Object.values(D.CATEGORIES).map(c => c.label.ar),
    bcPreview: r => `سأرسل هذا إلى ${r.count} زبون (${r.segment})${r.excluded ? `؛ ${r.excluded} طلبوا التوقف ولن يتوصلوا به` : ''}:\n«${r.text}»\nجاوب «أرسل» للتأكيد، أو قل لي ما أغيّر.`,
    bcNone: () => 'لا يوجد زبناء في هذه الفئة حاليا.', bcSent: r => (r.live ? `تم الإرسال إلى ${r.recipients} زبون.` : `${r.recipients} رسالة جاهزة. واتساب غير مربوط بعد، افتح الزبناء > الحملات لإرسالها بنقرة لكل واحدة.`), bcCancel: () => 'حسنا، لم يُرسل أي شيء.', bcLimit: r => `أرسلت ${r.limit} حملات اليوم. حاول غدا.`, bcShort: () => 'الرسالة قصيرة جدا.',
    segNames: { all: 'كل الزبناء', vip: 'أفضل الزبناء', recent: 'طلبوا خلال آخر 30 يوما', winback: 'بدون طلب منذ أكثر من 60 يوما', new: 'زبناء جدد', city: 'زبناء هذه المدينة' }, bcChips: ['أرسل', 'إلغاء'],
    noCredits: () => 'التصميم المتقدم بالذكاء الاصطناعي يستهلك رصيدا وقد انتهى رصيدك. التخصيص الأساسي (الشكل والتخطيط والنصوص والصور والمنتجات) يبقى مفتوحا. رقّ باقتك للحصول على رصيد أكبر.',
  },
};
R.dar = { ...R.fr, tagline: v => `S-sh3ar tbddl: “${v}”.`, announce: v => `L-i3lan tlq f l-boutique: “${v}”.`, announceOff: () => 'L-i3lan t7yed.', freeShip: n => `T-tawsil mjani mn ${M(n)}.`, price: r => `${r.product}: ${r.old} → ${r.price} DH.`, undone: l => `Rje3t: ${l}`, nothingUndo: () => 'Walo bach nrje3.', today: a => `Lyoum: ${M(a.sales)} f ${a.orders} commande.`, month: a => `Had ch-chhar: ${M(a.sales)} f ${a.orders} commande.`, unknown: () => 'Ma-fhmtch mzyan. Jreb “bni site dyali”, “nokha okhra” wla “siyft message l z-zbanat”.', chips: ['Bni site dyali', 'Nokha okhra', 'Khelliha dalma b dhab', 'Siyft message l z-zbanat'], regen: () => 'Hak nokha okhra.' };

// ---------- rule-based interpreter -------------------------------------------
const W = {
  undo: ['undo', 'annuler', 'annule', 'cancel that', 'revert', 'rj3', 'rje3', 'تراجع', 'رجع'],
  help: ['help', 'aide', 'what can you do', '3awni', 'مساعدة', 'اش تقدر'],
  build: ['build my shop', 'build my store', 'build my website', 'build my site', 'build me a shop', 'build me a website', 'create my website', 'create my site', 'create my shop', 'create my store', 'design my website', 'design my site', 'set up my shop', 'set up my store', 'start from scratch', 'make me a website', 'construis ma boutique', 'construis mon site', 'cree ma boutique', 'cree mon site', 'creer mon site', 'concois mon site', 'bni boutique', 'bni l boutique', 'bni lboutique', 'bni site', 'bni lsite', 'ابني متجري', 'ابني موقعي', 'انشئ متجري', 'أنشئ متجري', 'انشئ موقعي', 'أنشئ موقعي', 'صمم موقعي', 'صمم لي موقع'],
  makeVerb: ['make', 'build', 'create', 'design', 'generate', 'i want', 'i need', 'fais', 'fais moi', 'construis', 'cree', 'concois', 'je veux', 'j ai besoin', 'bni', 'bghit', 'صمم', 'ابني', 'بغيت', 'انشئ', 'أنشئ'],
  siteNoun: ['website', 'web site', 'site', 'shop', 'store', 'boutique', 'page', 'موقع', 'متجر'],
  regen: ['another version', 'another design', 'another layout', 'another one', 'different design', 'different version', 'try again', 'regenerate', 'redo it', 'new design', 'new version', 'surprise me', 'autre version', 'autre design', 'autre mise en page', 'un autre', 'refais', 'surprends moi', 'nokha okhra', 'نسخة أخرى', 'تصميم آخر', 'تصميم اخر'],
  cancel: ['cancel', 'stop', 'annuler', 'annule', 'passer', 'laisse tomber', 'wa9ef', 'وقف', 'إلغاء', 'الغاء'],
  send: ['send', 'send it', 'go ahead', 'confirm', 'yes send', 'envoyer', 'envoie', 'envoie le', 'confirme', 'oui envoie', 'siyft', 'sift', 'أرسل', 'ارسل', 'صيفط', 'أكد'],
  tagline: ['tagline', 'slogan', 'accroche', 'headline', 'sh3ar', 'shi3ar', 'شعار'],
  announce: ['announce', 'announcement', 'announcement bar', 'annonce', 'bandeau', 'i3lan', 'ilan', 'إعلان', 'اعلان'],
  welcome: ['welcome message', 'welcome text', 'message de bienvenue', 'message daccueil', 'risalat tarhib', 'رسالة الترحيب', 'رسالة ترحيب'],
  free: ['free delivery', 'free shipping', 'livraison gratuite', 'tawsil mjani', 'twsil mjani', 'توصيل مجاني'],
  off: ['remove', 'clear', 'delete', 'disable', 'turn off', 'hide', 'no more', 'supprime', 'retire', 'enleve', 'cache', 'desactive', '7yed', 'hyed', 'weqef', 'حيد', 'احذف', 'ألغ', 'الغ', 'اخف', 'أخف'],
  on: ['add', 'show', 'enable', 'create', 'put', 'ajoute', 'ajouter', 'affiche', 'montre', 'active', 'zid', 'اضف', 'أضف', 'زيد', 'اظهر', 'أظهر', 'اعرض'],
  tone: ['tone', 'nabra', 'نبرة'], formal: ['formal', 'formel', 'rasmi', 'رسمي', 'professionnel', 'professional'], friendly: ['friendly', 'amical', 'chaleureux', 'wadi', 'ودي', 'casual'],
  ai: ['the ai', 'l ia', 'lia', 'chatbot', 'bot', 'الذكاء الاصطناعي'], pause: ['pause', 'turn off', 'disable', 'stop', 'desactive', 'weqef', 'وقف', 'أوقف'], resume: ['resume', 'turn on', 'enable', 'activate', 'active', 'reactive', 'chghel', 'شغل', 'فعل'],
  language: ['default language', 'langue par defaut', 'lougha', 'اللغة الافتراضية'],
  addProduct: ['add product', 'new product', 'ajoute produit', 'ajoute un produit', 'ajouter un produit', 'nouveau produit', 'zid produit', 'zid chi produit', 'زيد منتج', 'إضافة منتج', 'اضافة منتج', 'أضف منتج', 'اضف منتج'],
  thisIs: ['this is', 'voici', 'voila', 'hada', 'hadi', 'هذا', 'هادا', 'هذه'],
  archive: ['remove product', 'delete product', 'hide product', 'archive', 'supprime le produit', 'retire le produit', 'cache le produit', '7yed produit', 'حيد المنتج', 'احذف المنتج'],
  price: ['price', 'prix', 'taman', 'tarif', 'ثمن', 'سعر', 'الثمن', 'السعر'],
  stock: ['stock', 'restock', 'quantite', 'quantity', 'pieces', 'pcs', 'zid', 'ajoute', 'add', 'mets', 'set', 'kmiya', 'كمية', 'المخزون', 'زيد'],
  photoWord: ['photo', 'picture', 'image', 'pic', 'tswira', 'صورة'],
  logo: ['logo', 'لوغو', 'شعار المتجر'], hero: ['hero', 'cover', 'main banner', 'top banner', 'main photo', 'main picture', 'banner image', 'banniere', 'banniere principale', 'photo principale', 'en tete', 'header image', 'الصورة الرئيسية', 'البانر'],
  aboutPhoto: ['about section', 'about us', 'a propos', 'qui sommes nous', 'من نحن', 'for about'],
  heroTitle: ['title', 'titre', 'headline', 'عنوان'], heroSub: ['subtitle', 'sous titre', 'sub title', 'وصف'], heroCta: ['button', 'bouton', 'cta', 'زر'],
  sold: ['sold', 'sales', 'sell', 'vendu', 'vendre', 'ventes', 'chiffre', 'bi3t', 'bi3', 'mabi3at', 'revenue', 'مبيعات', 'بعت'],
  lowStock: ['low on stock', 'low stock', 'running low', 'stock bas', 'bientot epuise', 'epuise', 'kay sali', 'kaysali', 'gaysali', 'غادي تسالي', 'تسالي', 'كيسالي'],
  pending: ['pending', 'to approve', 'waiting', 'en attente', 'a valider', 'kat tsna', 'كتسنى'], top: ['best seller', 'best selling', 'top product', 'meilleur', 'ahsen', 'الأكثر مبيعا'],
  section: ['section', 'bloc', 'قسم'], testimonial: ['testimonial', 'review from', 'temoignage', 'شهادة'],
  broadcast: ['send a message to', 'send message to', 'send a message', 'message all', 'message my customers', 'text my customers', 'broadcast', 'newsletter', 'announce to', 'mass message', 'campaign', 'envoie un message', 'envoyer un message', 'envoie une annonce', 'diffuse', 'message a tous', 'message a mes clients', 'siyft message', 'siyft risala', 'sift message', 'ارسل رسالة', 'أرسل رسالة', 'رسالة جماعية', 'صيفط ميساج', 'صيفط رسالة', 'حملة'],
  vip: ['vip', 'best customers', 'top customers', 'loyal customers', 'meilleurs clients', 'clients fideles', 'أفضل الزبناء', 'الزبناء المميزين'],
  winbackSeg: ['not ordered', 'have not ordered', 'havent ordered', 'inactive', 'win back', 'winback', 'lost customers', 'plus commande', 'inactifs', 'ما طلبوش', 'ما طلبو'],
  recentSeg: ['recent customers', 'last month', 'this month', 'recently', 'clients recents', 'ce mois', 'الشهر الماضي'], newSeg: ['new customers', 'first time', 'first-time', 'nouveaux clients', 'زبناء جدد'],
  purposeDelivery: ['free delivery', 'livraison gratuite', 'tawsil mjani', 'توصيل مجاني'], purposeArrivals: ['new arrivals', 'new products', 'nouveautes', 'nouveau', 'new collection', 'منتجات جديدة'], purposeRestock: ['restock', 'back in stock', 'de retour', 'retour en stock', 'رجعت'], purposeThanks: ['thank', 'merci', 'chokran', 'شكرا'], purposeWin: ['miss you', 'come back', 'win back', 'vous manquez', 'افتقدناك'],
};
const SEC = { about: ['about', 'about us', 'a propos', 'qui sommes nous', 'notre histoire', '3lina', 'من نحن'], faq: ['faq', 'questions', 'questions frequentes', 'as2ila', 'أسئلة', 'اسئلة'], reviews: ['reviews', 'testimonials', 'avis', 'temoignages', 'تقييمات', 'آراء'], contact: ['contact', 'contact us', 'nous contacter', 'اتصل بنا', 'تواصل'] };
const has = (sp, key) => nlp.hasAny(sp, W[key]);
const hasW = (sp, list) => nlp.hasAny(sp, list);
const EMOJI_RE = /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*/u;
function after(text, words) {
  const low = text.toLowerCase(); let best = -1, len = 0;
  for (const w of words) { const i = low.indexOf(w.toLowerCase()); if (i >= 0 && (best < 0 || i < best)) { best = i; len = w.length; } }
  if (best < 0) return null;
  let rest = text.slice(best + len).trim().replace(/^(?:to|into|en|est|is|as|comme|par|b|:|=|-|–|ب)\s+/i, '').replace(/^[:=\-–]\s*/, '').trim();
  return rest.replace(/^["“«]+|["”»]+$/g, '').trim();
}
const quoted = t => { const m = /["“«]([^"”»“«]{2,400})["”»]/.exec(t); return m ? m[1].trim() : null; };
const numbers = t => (nlp.norm(t).match(/\d+(?:[.,]\d+)?/g) || []).map(x => Number(x.replace(',', '.')));
const briefHasSignal = b => !!(b.category || b.mood || (b.colors && b.colors.length) || b.dark !== undefined);
const tweakHasSignal = b => !!(b.mood || (b.colors && b.colors.length) || b.dark !== undefined || Object.keys(b.variants || {}).length || b.fontKind || b.fontHeading || b.radius !== undefined);
const tweakWords = sp => nlp.hasAny(sp, ['make it', 'make the', 'make my', 'change', 'use', 'switch', 'put', 'style', 'look', 'color', 'colour', 'theme', 'design', 'font', 'layout', 'rends', 'rend', 'utilise', 'mets', 'khelli', 'khlli', 'خلي', 'اجعل', 'غير', 'استعمل', 'لون']);

function interpret(text, ctx = {}) {
  const sp = nlp.spaced(text); const tk = nlp.tokens(text); const short = tk.length <= 4; const off = has(sp, 'off'); const img = ctx.imageUrl;
  if (short && has(sp, 'undo')) return { t: 'undo' };
  if (short && has(sp, 'help')) return { t: 'help' };
  if (has(sp, 'build')) { const b = gen.parseBrief(text, D.CATEGORIES); return briefHasSignal(b) ? { t: 'brief', b } : { t: 'brief_start' }; }
  if (has(sp, 'broadcast')) return { t: 'broadcast', text };
  if (has(sp, 'regen') && !has(sp, 'price')) return { t: 'regen', b: gen.parseBrief(text, D.CATEGORIES) };
  if (has(sp, 'lowStock')) return { t: 'stats', what: 'low' };
  if (has(sp, 'top')) return { t: 'stats', what: 'top' };
  if (has(sp, 'pending')) return { t: 'stats', what: 'pending' };
  if (has(sp, 'sold') && !has(sp, 'price') && !/\d{2,}/.test(text)) return { t: 'stats', what: /month|mois|chhar|شهر|الشهر/i.test(text) ? 'month' : 'today' };
  if (has(sp, 'welcome')) return off ? { t: 'shop', fields: { welcome_msg: '' }, key: 'welcome', value: '' } : { t: 'shop', fields: { welcome_msg: quoted(text) || after(text, W.welcome) || '' }, key: 'welcome' };
  if (has(sp, 'announce') && !has(sp, 'hero')) { if (off) return { t: 'shop', fields: { announcement: '' }, key: 'announceOff' }; const v = quoted(text) || after(text, W.announce); return v ? { t: 'shop', fields: { announcement: v }, key: 'announce', value: v } : { t: 'help' }; }
  if (has(sp, 'tagline')) { const v = quoted(text) || after(text, W.tagline); return v ? { t: 'shop', fields: { tagline: v }, key: 'tagline', value: v } : { t: 'help' }; }
  if (has(sp, 'free')) { if (off) return { t: 'shop', fields: { free_shipping_over: 0 }, key: 'freeShipOff' }; const n = numbers(text); return n.length ? { t: 'shop', fields: { free_shipping_over: n[n.length - 1] }, key: 'freeShip', value: n[n.length - 1] } : { t: 'unknown' }; }
  if (has(sp, 'tone') || (has(sp, 'formal') && short) || (has(sp, 'friendly') && short)) { const v = has(sp, 'formal') ? 'formal' : has(sp, 'friendly') ? 'friendly' : null; if (v) return { t: 'shop', fields: { tone: v }, key: 'tone', value: v }; }
  if (has(sp, 'ai')) { if (has(sp, 'pause')) return { t: 'shop', fields: { ai_enabled: 0 }, key: 'aiOff' }; if (has(sp, 'resume')) return { t: 'shop', fields: { ai_enabled: 1 }, key: 'aiOn' }; }
  if (has(sp, 'language')) { const map = { fr: ['french', 'francais', 'fr'], en: ['english', 'anglais', 'en'], ar: ['arabic', 'arabe', 'عربية'] }; for (const [k, ws] of Object.entries(map)) if (nlp.hasAny(sp, ws)) return { t: 'shop', fields: { lang: k }, key: 'lang', value: k }; }
  if (img && has(sp, 'logo')) return { t: 'image', target: 'logo' };
  if (img && has(sp, 'hero')) return { t: 'image', target: 'hero' };
  if (img && has(sp, 'aboutPhoto')) return { t: 'image', target: 'about' };
  if (has(sp, 'hero') && !img) {
    const f = {}; const sub = after(text, W.heroSub), cta = after(text, W.heroCta), title = after(text, W.heroTitle);
    if (sub && hasW(sp, W.heroSub)) f.subtitle = sub; else if (cta && hasW(sp, W.heroCta)) f.cta = cta; else if (title && hasW(sp, W.heroTitle)) f.title = title; else if (quoted(text)) f.title = quoted(text);
    if (Object.keys(f).length) return { t: 'content', patch: { hero: f }, key: 'hero' };
  }
  const secKey = Object.keys(SEC).find(k => nlp.hasAny(sp, SEC[k]));
  if (secKey && !img) {
    if (off && (has(sp, 'section') || nlp.hasAny(sp, ['remove', 'hide', 'delete', 'supprime', 'cache', 'retire', 'حيد', 'اخف']))) return { t: 'section_off', type: secKey };
    if (secKey === 'faq') {
      const qa = /["“«]([^"”»“«]{4,140}[?؟])["”»]\s*[:\-–—]?\s*(.{2,400})$/.exec(text); if (qa) return { t: 'faq_add', q: qa[1].trim(), a: qa[2].trim() };
      const body = quoted(text) || after(text, ['faq', 'questions']); const m0 = body && /^(.{4,140}?[?؟])\s*(.{2,400})$/.exec(body); if (m0) return { t: 'faq_add', q: m0[1].trim(), a: m0[2].trim() };
      if (has(sp, 'on') || has(sp, 'section')) return { t: 'section_on', type: 'faq' };
    }
    if (secKey === 'reviews' && has(sp, 'testimonial')) { const q = quoted(text); const name = /[-–—]\s*([^\-–—"”»]{2,40})$/.exec(text); if (q) return { t: 'testimonial', text: q, name: name ? name[1].trim() : '' }; }
    if (has(sp, 'on') || has(sp, 'section')) { const body = secKey === 'about' ? (quoted(text) || after(text, [...SEC.about, ...W.section])) : null; return { t: 'section_on', type: secKey, body: body && body.length > 8 ? body : '' }; }
  }
  const soc = {}; let m;
  if ((m = /(?:instagram|insta|ig)\W+(?:is\s+|account\s+)?@?([A-Za-z0-9._]{2,30})/i.exec(text))) soc.instagram = m[1];
  if ((m = /tiktok\W+(?:is\s+|account\s+)?@?([A-Za-z0-9._]{2,30})/i.exec(text))) soc.tiktok = m[1];
  if ((m = /[\w.+-]+@[\w-]+\.[\w.]+/.exec(text))) soc.email = m[0];
  const ph = nlp.extractPhone(text); if (ph.phone && /whatsapp|واتساب|wa\b|phone|tel|téléphone|telephone|هاتف|رقم/i.test(text)) { if (/whatsapp|واتساب|wa\b/i.test(text)) soc.whatsapp = '212' + ph.phone.slice(1); else soc.phone = ph.phone; }
  if (Object.keys(soc).length && !has(sp, 'price') && !/\bstock\b/i.test(text)) return { t: 'content', patch: { social: soc }, key: 'social', what: Object.keys(soc).map(k => k[0].toUpperCase() + k.slice(1)).join(', ') };
  if (has(sp, 'logo')) { const e = EMOJI_RE.exec(text); if (e) return { t: 'logo_emoji', emoji: e[0] }; }
  const nums = numbers(text);
  if (img && (has(sp, 'addProduct') || has(sp, 'thisIs') || (nums.length && !has(sp, 'photoWord') && !has(sp, 'hero') && !has(sp, 'logo')))) return { t: 'add', d: nlp.parseProductVoice(after(text, [...W.addProduct, ...W.thisIs]) || text), image: img };
  if (has(sp, 'addProduct')) return { t: 'add', d: nlp.parseProductVoice(after(text, W.addProduct) || ''), image: img };
  if (has(sp, 'archive')) return { t: 'archive', q: after(text, W.archive) || text };
  if (has(sp, 'price') && nums.length) return { t: 'price', q: text.replace(/\d+(?:[.,]\d+)?\s*(?:dh|dhs|mad|dirhams?|درهم)?/gi, ' '), price: nums[nums.length - 1] };
  if (has(sp, 'stock') && nums.length && !/\bcolumns?\b/i.test(text)) { const set = nlp.hasAny(sp, ['set', 'mets', 'dir', 'khelli', 'to', 'a', 'à', 'ل', 'خلي']) && !nlp.hasAny(sp, ['add', 'ajoute', 'zid', 'زيد', 'plus']); return { t: 'stock', q: text.replace(/\d+(?:[.,]\d+)?/g, ' '), mode: set ? 'set' : 'add', n: nums[nums.length - 1] }; }
  const b = gen.parseBrief(text, D.CATEGORIES);
  if (has(sp, 'makeVerb') && hasW(sp, W.siteNoun) && briefHasSignal(b)) return { t: 'brief', b };
  if (tweakHasSignal(b) && !has(sp, 'price') && !/\d{3,}/.test(text) && (ctx.hasSite || tweakWords(sp) || short)) return { t: 'tweak', b };
  if (img && has(sp, 'photoWord')) return { t: 'image', target: 'product', q: text };
  if (img) return { t: 'ask_image' };
  return { t: 'unknown' };
}

function segmentOf(text, sp) {
  if (has(sp, 'vip')) return { segment: 'vip' }; if (has(sp, 'winbackSeg')) return { segment: 'winback' }; if (has(sp, 'newSeg')) return { segment: 'new' }; if (has(sp, 'recentSeg')) return { segment: 'recent' };
  const city = nlp.extractCity(text); if (city && /\b(in|à|a|from|ف|في|dyal|de)\b/i.test(text)) return { segment: 'city', arg: city };
  return { segment: 'all' };
}
const purposeOf = sp => (has(sp, 'purposeDelivery') ? 'delivery' : has(sp, 'purposeArrivals') ? 'arrivals' : has(sp, 'purposeRestock') ? 'restock' : has(sp, 'purposeThanks') ? 'thanks' : has(sp, 'purposeWin') || has(sp, 'winbackSeg') ? 'winback' : 'promo');
const rr = lang => R[lang] || R.en;
const COLOR_WORDS = {
  en: { Blue: 'blue', Red: 'red', Green: 'green', Pink: 'pink', Purple: 'purple', Orange: 'orange', Black: 'black', Gold: 'gold', Brown: 'brown', Gray: 'grey', Yellow: 'yellow', Beige: 'beige', White: 'white', Silver: 'silver', Teal: 'teal', Navy: 'navy' },
  fr: { Blue: 'bleu', Red: 'rouge', Green: 'vert', Pink: 'rose', Purple: 'violet', Orange: 'orange', Black: 'noir', Gold: 'or', Brown: 'marron', Gray: 'gris', Yellow: 'jaune', Beige: 'beige', White: 'blanc', Silver: 'argent', Teal: 'turquoise', Navy: 'bleu marine' },
  ar: { Blue: 'أزرق', Red: 'أحمر', Green: 'أخضر', Pink: 'وردي', Purple: 'بنفسجي', Orange: 'برتقالي', Black: 'أسود', Gold: 'ذهبي', Brown: 'بني', Gray: 'رمادي', Yellow: 'أصفر', Beige: 'بيج', White: 'أبيض', Silver: 'فضي', Teal: 'تركوازي', Navy: 'كحلي' },
};
const HEX_NAME = Object.fromEntries(Object.entries(gen.COLOR_HEX).map(([n, h]) => [h.toLowerCase(), n]));
const colorsText = (colors, lang) => (colors || []).map(h => { const n = HEX_NAME[String(h).toLowerCase()]; return n ? (COLOR_WORDS[lang] || COLOR_WORDS.en)[n] : h; }).join(' + ');
function describeTweak(r, b, lang) {
  const w = [];
  if (b.mood) w.push(r.moodNames[b.mood] || b.mood);
  if (b.colors && b.colors.length) w.push(colorsText(b.colors, lang));
  if (b.dark === true) w.push('dark'); else if (b.dark === false) w.push('light');
  for (const [part, v] of Object.entries(b.variants || {})) w.push(`${r.partNames[part] || part}: ${v}`);
  if (b.fontHeading) w.push(b.fontHeading); else if (b.fontKind) w.push(b.fontKind);
  if (b.radius !== undefined) w.push(b.radius > 16 ? 'round corners' : 'sharp corners');
  return w.join(', ') || r.newLook();
}
const siteInput = b => ({ category: b.category, mood: b.mood, colors: b.colors, dark: b.dark, variants: b.variants, fontKind: b.fontKind, fontHeading: b.fontHeading, radius: b.radius });
const secName = t => ({ about: 'About', faq: 'FAQ', reviews: 'Reviews', contact: 'Contact' })[t] || t;

function runRules(shopId, text, uiLang, ctx = {}) {
  const shop = shopRow(shopId);
  const state = ctx.state && typeof ctx.state === 'object' ? { ...ctx.state } : {};
  const lang0 = nlp.detectLang(text, state.lang || (uiLang === 'ar' ? 'ar' : uiLang) || shop.lang);
  const lang = (state.wizard || state.pendingBroadcast) && state.lang ? state.lang : lang0;
  const r = rr(lang); const L3 = lang === 'dar' ? 'fr' : lang;
  const out = { lang, reply: '', changes: [], changed: false, chips: [], state };
  const sp = nlp.spaced(text), tk = nlp.tokens(text);
  const note = msg => { out.reply += (out.reply ? ' ' : '') + msg; out.changes.push({ label: msg }); out.changed = true; };
  const fail = e => (e.error === 'not_found' ? r.notFound() : e.error === 'ambiguous' ? r.ambiguous(e.options) : e.error === 'which_variant' ? r.which(e) : e.error === 'need_price' ? r.needPrice(e.name) : r.invalid(e.field || ''));
  const hasSite = !!siteLib.getSite(shopId);
  const catLabel = k => (D.CATEGORIES[k] || D.CATEGORIES.other).label[L3];
  const siteDone = (res, b) => { out.reply = r.siteBuilt({ mood: r.moodNames[res.params.mood] || res.params.mood, colors: colorsText(b.colors, L3), cat: catLabel(res.params.category) }); out.changed = true; out.changes.push({ label: out.reply }); out.chips = r.siteChips; };
  const fewProducts = () => get('SELECT COUNT(*) n FROM products WHERE shop_id=? AND active=1', shopId).n < 3;
  const askSamples = category => { out.state.wizard = { step: 'samples', category }; out.state.lang = lang; out.reply += ' ' + r.samplesAsk(); out.chips = [r.yes, r.no]; };

  // --- a campaign waits for the seller's confirmation ---
  if (state.pendingBroadcast) {
    const pb = state.pendingBroadcast; const yes = nlp.intents(text).yes && tk.length <= 3;
    if (has(sp, 'send') || yes) {
      const res = broadcast.send(shopId, { segment: pb.segment, arg: pb.arg, text: pb.text, createdBy: ctx.userId });
      out.state = {};
      if (res.error === 'daily_limit') out.reply = r.bcLimit(res); else if (res.error === 'text_too_short') out.reply = r.bcShort(); else if (res.error) out.reply = r.invalid('campaign'); else { out.reply = r.bcSent(res); out.changed = true; out.changes.push({ label: out.reply }); }
      return out;
    }
    if (nlp.hasAny(sp, W.cancel) || (nlp.intents(text).no && tk.length <= 3)) { out.state = {}; out.reply = r.bcCancel(); return out; }
    const newText = quoted(text) || (text.includes(':') ? text.slice(text.indexOf(':') + 1).trim() : '');
    if (newText.length > 7) { pb.text = newText; const a = broadcast.audience(shopId, pb.segment, pb.arg); out.state.pendingBroadcast = pb; out.state.lang = lang; out.reply = r.bcPreview({ count: a.count, segment: r.segNames[pb.segment], excluded: a.excluded, text: pb.text }); out.chips = r.bcChips; return out; }
    out.state = {};
  }

  // --- guided building: describe -> (what do you sell?) -> (samples?) ---
  if (state.wizard && state.wizard.step) {
    const w = { ...state.wizard };
    if (nlp.hasAny(sp, W.cancel) && tk.length <= 3) { out.state = {}; out.reply = r.wizCancel(); return out; }
    if (w.step === 'brief' || w.step === 'cat') {
      const b = w.step === 'brief' ? gen.parseBrief(text, D.CATEGORIES) : (w.brief || {});
      if (w.step === 'brief' && !briefHasSignal(b) && tk.length < 3) { out.state.wizard = w; out.reply = r.wizRetry(); out.chips = r.briefChips; return out; }
      let cat = b.category;
      if (w.step === 'cat') { cat = null; for (const [k, c] of Object.entries(D.CATEGORIES)) if (nlp.hasAny(sp, c.words) || Object.values(c.label).some(l => nlp.norm(l) === nlp.norm(text.trim()))) { cat = k; break; } if (!cat) { out.state.wizard = w; out.reply = r.wizRetry(); out.chips = r.catChips; return out; } }
      if (!cat) { out.state.wizard = { step: 'cat', brief: b }; out.state.lang = lang; out.reply = r.catAsk(); out.chips = r.catChips; return out; }
      const res = buildSite(shopId, { ...siteInput(b), category: cat }, lang); siteDone(res, b);
      if (fewProducts()) askSamples(cat); else out.state = {};
      return out;
    }
    if (w.step === 'samples') {
      const it = nlp.intents(text); const n = nlp.norm(text);
      if (it.yes || /\b(oui|yes|iyeh|نعم)\b/.test(n) || n === nlp.norm(r.yes)) { const made = createSamples(shopId, w.category); out.state = {}; out.reply = made.length ? `+${made.length} ✓` : '✓'; out.changed = !!made.length; if (made.length) out.changes.push({ label: out.reply }); return out; }
      out.state = {}; out.reply = '✓'; return out;
    }
  }

  const it = interpret(text, { imageUrl: ctx.imageUrl, hasSite });
  switch (it.t) {
    case 'brief_start': out.state.wizard = { step: 'brief' }; out.state.lang = lang; out.reply = r.briefAsk(); out.chips = r.briefChips; break;
    case 'brief': {
      const b = it.b;
      if (!b.category && !hasSite && !orders.loadCatalog(shopId).length) { out.state.wizard = { step: 'cat', brief: b }; out.state.lang = lang; out.reply = r.catAsk(); out.chips = r.catChips; break; }
      const res = buildSite(shopId, siteInput(b), lang); siteDone(res, b);
      if (fewProducts()) askSamples(res.params.category);
      break;
    }
    case 'regen': { const b = it.b; restyle(shopId, tweakHasSignal(b) ? siteInput(b) : {}, lang, { bump: true }); note(r.regen()); out.chips = r.siteChips; break; }
    case 'tweak': { const b = it.b; restyle(shopId, siteInput(b), lang); note(r.restyled(describeTweak(r, b, L3))); out.chips = r.siteChips; break; }
    case 'undo': { const l = undoLast(shopId); out.reply = l ? r.undone(l.label) : r.nothingUndo(); out.changed = !!l; break; }
    case 'help': out.reply = r.help(); out.chips = r.chips; break;
    case 'stats': { const s = stats(shopId, it.what); out.reply = s.today ? r.today(s.today) : s.month ? r.month(s.month) : s.low ? r.low(s.low) : s.pending !== undefined ? r.pending(s) : r.top(s.top); break; }
    case 'shop': {
      const res = setShop(shopId, it.fields, it.key + ': ' + JSON.stringify(Object.values(it.fields)[0]).slice(0, 60));
      if (!res.ok) { out.reply = fail(res); break; }
      const v = it.value !== undefined ? it.value : Object.values(it.fields)[0];
      out.reply = it.key === 'lang' ? r.lang(v) : r[it.key](v); out.changed = true; out.changes.push({ label: out.reply }); break;
    }
    case 'content': { const res = editContent(shopId, it.patch); if (res.ok) note(it.key === 'social' ? r.social(it.what) : r.hero()); else out.reply = fail(res); break; }
    case 'section_on': {
      editDesign(shopId, 'section ' + it.type, d => { const cur = D.section(d, it.type); const base = { about: () => ({ title: D.PACK_TEXT.aboutTitle[L3], body: it.body || (cur && cur.body) || D.PACK_TEXT.about[L3](shop.name) }), faq: () => ({ title: D.PACK_TEXT.faqTitle[L3], items: cur && cur.items.length ? cur.items : D.PACK_TEXT.faq[L3] }) }[it.type]; return D.upsertSection(d, it.type, { enabled: true, ...(base ? base() : {}) }); });
      note(r.sectionOn(secName(it.type))); break;
    }
    case 'section_off': editDesign(shopId, 'hide ' + it.type, d => { const s = D.section(d, it.type); if (s) s.enabled = false; return d; }); note(r.sectionOff(secName(it.type))); break;
    case 'faq_add': editDesign(shopId, 'faq', d => { const s = D.section(d, 'faq'); const items = [...((s && s.items) || []), { q: it.q, a: it.a }]; return D.upsertSection(d, 'faq', { title: (s && s.title) || D.PACK_TEXT.faqTitle[L3], items, enabled: true }); }); note(r.faqAdded(it.q)); break;
    case 'testimonial': editDesign(shopId, 'testimonial', d => { const s = D.section(d, 'reviews'); const items = [...((s && s.items) || []), { text: it.text, name: it.name }]; return D.upsertSection(d, 'reviews', { items, enabled: true }); }); note(r.testimonial()); break;
    case 'logo_emoji': editDesign(shopId, 'logo', d => ({ ...d, logo: { ...d.logo, emoji: it.emoji, image: '' } })); note(r.logoEmoji(it.emoji)); break;
    case 'image': {
      if (it.target === 'logo') { photoTo(shopId, 'logo', ctx.imageUrl); note(r.logoImage()); }
      else if (it.target === 'hero') { photoTo(shopId, 'hero', ctx.imageUrl); note(r.heroImage()); }
      else if (it.target === 'about') { photoTo(shopId, 'about', ctx.imageUrl); const cur = siteLib.getSite(shopId); if (cur && cur.input && !(cur.input.variants && cur.input.variants.about)) restyle(shopId, { variants: { about: 'split' } }, lang); note(r.aboutImage()); }
      else { const res = setProductImage(shopId, it.q.replace(/\b(photo|picture|image|pic)\b/gi, ' '), ctx.imageUrl); out.reply = res.ok ? r.imageProduct(res.product) : (res.error === 'not_found' ? r.askImage() : fail(res)); out.changed = !!res.ok; if (res.ok) out.changes.push({ label: out.reply }); }
      break;
    }
    case 'ask_image': out.reply = r.askImage(); break;
    case 'broadcast': {
      const sg = segmentOf(it.text, sp); const body = quoted(it.text) || (it.text.includes(':') ? it.text.slice(it.text.indexOf(':') + 1).trim() : '');
      const msg = body.length > 7 ? body : broadcast.draft(shop, purposeOf(sp), L3, '');
      const a = broadcast.audience(shopId, sg.segment, sg.arg);
      if (!a.count) { out.reply = r.bcNone(); break; }
      out.state.pendingBroadcast = { segment: sg.segment, arg: sg.arg || '', text: msg }; out.state.lang = lang;
      out.reply = r.bcPreview({ count: a.count, segment: r.segNames[sg.segment], excluded: a.excluded, text: msg }); out.chips = r.bcChips; break;
    }
    case 'price': { const res = setPrice(shopId, it.q, it.price); out.reply = res.ok ? r.price(res) : fail(res); out.changed = !!res.ok; if (res.ok) out.changes.push({ label: out.reply }); break; }
    case 'stock': { const res = setStock(shopId, it.q, it.mode, it.n); out.reply = res.ok ? r.stock(res) : fail(res); out.changed = !!res.ok; if (res.ok) out.changes.push({ label: out.reply }); break; }
    case 'add': { const res = addProduct(shopId, it.d, it.image); out.reply = res.ok ? r.added(res) : fail(res); out.changed = !!res.ok; if (res.ok) out.changes.push({ label: out.reply }); break; }
    case 'archive': { const res = archiveProduct(shopId, it.q); out.reply = res.ok ? r.archived(res) : fail(res); out.changed = !!res.ok; if (res.ok) out.changes.push({ label: out.reply }); break; }
    default: out.reply = r.unknown(); out.chips = r.chips; out.unknown = true;
  }
  return out;
}

// ---------- advanced mode: Claude writes the page (uses AI credits) -----------------------
const MODEL = process.env.CENDOOR_MODEL || 'claude-sonnet-5-5';
const llmEnabled = () => !!process.env.ANTHROPIC_API_KEY;
const CLASS_GUIDE = `Page contract. You write the BODY markup and CSS of a storefront. Dynamic content is placed with placeholders that you style:
<div data-cd="products" data-layout="grid|carousel|magazine|list" data-cols="2-4" data-limit="12"></div> (cards: .g-pcard > .g-pimg + .g-pbody > .g-pname, .g-pprice; badge .g-badge), <div data-cd="categories"></div> (.g-cats > .g-cat.on), <div data-cd="featured" data-limit="4"></div>, <div data-cd="reviews" data-limit="6"></div> (.g-review > .g-stars, .g-rtext, .g-rname), <div data-cd="faq"></div> (.g-faq > details.g-qa), <div data-cd="delivery"></div>, <div data-cd="contact"></div> (.g-clink), <div data-cd="langs"></div> (.g-lang.on), <span data-cd="logo"></span>, <div data-cd="announcement"></div>, <div data-cd="photo" data-target="hero|about"></div> (the seller's own photo).
Buttons: <a data-act="chat" href="#top">, <a data-act="shop" href="#products">. Text tokens: {{name}} {{tagline}} {{city}} {{hero_title}} {{hero_subtitle}} {{cta}} {{about}} {{rating}} {{review_count}} {{year}} {{from_price}} {{ui.delivery}} {{ui.cod}} {{ui.chatShort}} {{ui.products}} {{ui.about}} {{ui.faqTitle}} {{ui.reviewsTitle}} {{ui.contactTitle}} {{ui.navShop}} {{ui.navAbout}} {{ui.navContact}} {{ui.powered}}.
Use data-if="about|faq|reviews|featured|rating|city" on wrappers that should disappear when empty. Ids become g-<id>; anchors #products #about #faq #reviews #contact must exist. Allowed: semantic HTML, inline <svg> illustrations, CSS variables var(--a) accent, var(--a2), var(--bg), var(--sf), var(--tx), var(--mu), var(--ln), var(--r), var(--hf) heading font, var(--bf) body font. No scripts, forms, iframes, external URLs, @import or @font-face; CSS is scoped automatically (write plain selectors with classes). Fonts: ${FONTS.names().join(', ')}.`;
const TOOLS = [
  { name: 'write_site', description: 'Write a complete bespoke storefront: layout (HTML), styling (CSS), palette and fonts. Use only when the owner wants a design the generator cannot express. ' + CLASS_GUIDE, input_schema: { type: 'object', properties: { html: { type: 'string' }, css: { type: 'string' }, palette: { type: 'object', properties: { a: { type: 'string' }, a2: { type: 'string' }, bg: { type: 'string' }, sf: { type: 'string' }, tx: { type: 'string' }, mu: { type: 'string' }, ln: { type: 'string' } }, required: ['a', 'bg', 'tx'] }, fonts: { type: 'object', properties: { heading: { type: 'string' }, body: { type: 'string' } } }, radius: { type: 'number' } }, required: ['html', 'css', 'palette'] } },
  { name: 'restyle_site', description: 'Change the generated site: mood (elegant, luxury, minimal, bold, playful, futuristic, natural, warm), colours (#hex list), dark mode, font kind or name, corner radius, pinned layout parts {hero, products, header, about, footer, values, sechead, reviews, faq}, or another layout (bump_seed).', input_schema: { type: 'object', properties: { mood: { type: 'string' }, colors: { type: 'array', items: { type: 'string' } }, dark: { type: 'boolean' }, font_kind: { type: 'string', enum: ['serif', 'sans'] }, font_heading: { type: 'string' }, radius: { type: 'number' }, variants: { type: 'object' }, bump_seed: { type: 'boolean' } } } },
  { name: 'build_site', description: 'Generate a complete site from scratch for a category (fashion, beauty, shoes, home, food, other) and style.', input_schema: { type: 'object', properties: { category: { type: 'string' }, mood: { type: 'string' }, colors: { type: 'array', items: { type: 'string' } }, dark: { type: 'boolean' }, samples: { type: 'boolean' } }, required: ['category'] } },
  { name: 'update_content', description: 'Change texts: shop name, tagline, announcement, hero {title, subtitle, cta}, about {title, body}, footer, social {instagram, tiktok, whatsapp, phone, email}.', input_schema: { type: 'object', properties: { name: { type: 'string' }, tagline: { type: 'string' }, announcement: { type: 'string' }, hero: { type: 'object' }, about: { type: 'object' }, footer: { type: 'string' }, social: { type: 'object' } } } },
  { name: 'use_attached_image', description: 'Use the photo the owner just sent as the logo, the main (hero) photo, the About photo, or the photo of an existing product.', input_schema: { type: 'object', properties: { target: { type: 'string', enum: ['logo', 'hero', 'about', 'product'] }, product: { type: 'string' } }, required: ['target'] } },
  { name: 'prepare_broadcast', description: 'Draft an announcement for customers and show the audience size. Nothing is sent: the owner must confirm in the next message. segment: all, vip, recent, winback, new.', input_schema: { type: 'object', properties: { text: { type: 'string' }, segment: { type: 'string', enum: ['all', 'vip', 'recent', 'winback', 'new'] } }, required: ['text'] } },
  { name: 'update_storefront', description: 'Change text settings: announcement bar ("" removes it), chat welcome message, free delivery threshold (MAD, 0 disables), assistant tone, assistant on/off.', input_schema: { type: 'object', properties: { announcement: { type: 'string' }, welcome_msg: { type: 'string' }, free_shipping_over: { type: 'number' }, tone: { type: 'string', enum: ['friendly', 'formal'] }, ai_enabled: { type: 'boolean' } } } },
  { name: 'set_product_price', description: 'Set the price (MAD) of one product, found by name.', input_schema: { type: 'object', properties: { product: { type: 'string' }, price: { type: 'number' } }, required: ['product', 'price'] } },
  { name: 'set_stock', description: 'Set or add stock of a product.', input_schema: { type: 'object', properties: { product: { type: 'string' }, mode: { type: 'string', enum: ['set', 'add'] }, quantity: { type: 'number' } }, required: ['product', 'mode', 'quantity'] } },
  { name: 'add_product', description: 'Create a product with one variant. use_attached_image true uses the photo the owner just sent.', input_schema: { type: 'object', properties: { name: { type: 'string' }, price: { type: 'number' }, stock: { type: 'number' }, color: { type: 'string' }, size: { type: 'string' }, category: { type: 'string' }, description: { type: 'string' }, emoji: { type: 'string' }, use_attached_image: { type: 'boolean' } }, required: ['name', 'price'] } },
  { name: 'archive_product', description: 'Hide a product from the shop (reversible).', input_schema: { type: 'object', properties: { product: { type: 'string' } }, required: ['product'] } },
  { name: 'get_business_stats', description: 'Read sales and stock numbers.', input_schema: { type: 'object', properties: { what: { type: 'string', enum: ['today', 'month', 'low', 'pending', 'top'] } }, required: ['what'] } },
  { name: 'undo_last_change', description: 'Undo the most recent change.', input_schema: { type: 'object', properties: {} } },
];
function execTool(shopId, name, i, changes, ctx) {
  const note = (res, label) => { if (res && res.ok) changes.push({ label }); return res; };
  if (name === 'write_site') {
    const fonts = { h: FONTS.FONTS[i.fonts && i.fonts.heading] ? i.fonts.heading : 'Inter', b: FONTS.FONTS[i.fonts && i.fonts.body] ? i.fonts.body : 'Inter' };
    const ok = h => /^#[0-9a-fA-F]{6}$/.test(h || ''); const pl = i.palette || {};
    if (!ok(pl.a)) return { error: 'palette.a must be #rrggbb' };
    const lum = h => { const [r, g, b] = [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16) / 255); return .2126 * r + .7152 * g + .0722 * b; };
    const palette = { a: pl.a, a2: ok(pl.a2) ? pl.a2 : pl.a, bg: ok(pl.bg) ? pl.bg : '#ffffff', tx: ok(pl.tx) ? pl.tx : '#111111', ln: ok(pl.ln) ? pl.ln : '#dddddd' };
    palette.sf = ok(pl.sf) ? pl.sf : palette.bg; palette.mu = ok(pl.mu) ? pl.mu : palette.tx; palette.onA = lum(palette.a) > .5 ? '#111111' : '#ffffff'; palette.onA2 = lum(palette.a2) > .5 ? '#111111' : '#ffffff';
    const before = siteJson(shopId);
    const res = siteLib.saveSite(shopId, { html: i.html, css: i.css, palette, fonts, radius: i.radius, source: 'ai', seed: 1, input: null });
    if (res.error) return { error: res.error, warnings: res.warnings };
    log(shopId, 'site', 'ai site', { site: before }); changes.push({ label: 'Custom page written' });
    return { ok: true, warnings: res.warnings };
  }
  if (name === 'restyle_site') { const patch = {}; if (i.mood) patch.mood = i.mood; if (Array.isArray(i.colors)) patch.colors = i.colors.filter(c => /^#[0-9a-fA-F]{6}$/.test(c)); if (typeof i.dark === 'boolean') patch.dark = i.dark; if (i.font_kind) patch.fontKind = i.font_kind; if (i.font_heading) patch.fontHeading = i.font_heading; if (Number.isFinite(i.radius)) patch.radius = i.radius; if (i.variants && typeof i.variants === 'object') patch.variants = i.variants; return note(restyle(shopId, patch, ctx.lang, { bump: !!i.bump_seed }), 'Look updated'); }
  if (name === 'build_site') return note(buildSite(shopId, { category: i.category, mood: i.mood, colors: Array.isArray(i.colors) ? i.colors : [], dark: i.dark }, ctx.lang, { samples: !!i.samples }), 'Site built');
  if (name === 'update_content') return note(editContent(shopId, i), 'Content updated');
  if (name === 'use_attached_image') {
    if (!ctx.imageUrl) return { error: 'no_image_attached' };
    if (['logo', 'hero', 'about'].includes(i.target)) return note(photoTo(shopId, i.target, ctx.imageUrl), `Photo: ${i.target}`);
    const r = setProductImage(shopId, i.product || '', ctx.imageUrl); return note(r, r.ok ? `Photo: ${r.product}` : '');
  }
  if (name === 'prepare_broadcast') { const a = broadcast.audience(shopId, i.segment || 'all', ''); ctx.pendingBroadcast = { segment: i.segment || 'all', arg: '', text: String(i.text || '').slice(0, 900) }; return { audience: a.count, excluded_opted_out: a.excluded, note: 'Not sent. Ask the owner to reply "send" to confirm.' }; }
  if (name === 'update_storefront') { const f = { ...i }; if ('ai_enabled' in f) f.ai_enabled = f.ai_enabled ? 1 : 0; return note(setShop(shopId, f, 'studio: ' + Object.keys(f).join(', ')), 'Storefront: ' + Object.keys(f).join(', ')); }
  if (name === 'set_product_price') { const r = setPrice(shopId, i.product, Number(i.price)); return note(r, r.ok ? `${r.product}: ${r.old} → ${r.price} MAD` : ''); }
  if (name === 'set_stock') { const r = setStock(shopId, i.product, i.mode, Number(i.quantity)); return note(r, r.ok ? `${r.product} ${r.label}: ${r.old} → ${r.stock}` : ''); }
  if (name === 'add_product') { const r = addProduct(shopId, i, i.use_attached_image ? ctx.imageUrl : ''); return note(r, r.ok ? `+ ${r.name}` : ''); }
  if (name === 'archive_product') { const r = archiveProduct(shopId, i.product); return note(r, r.ok ? `- ${r.product}` : ''); }
  if (name === 'get_business_stats') return stats(shopId, i.what);
  if (name === 'undo_last_change') { const l = undoLast(shopId); if (l) changes.push({ label: 'Undo: ' + l.label }); return l ? { ok: true, undone: l.label } : { ok: false }; }
  return { error: 'unknown_tool' };
}
async function runLlm(shopId, text, ctx) {
  const shop = shopRow(shopId); const cur = siteLib.getSite(shopId);
  const cat = orders.loadCatalog(shopId).map(p => `${p.name} (${p.price} MAD): ${p.variants.map(v => `${v.label} x${v.stock}`).join(', ')}`).join('\n');
  const system = `You are Cendoor Studio. The owner of the Moroccan online shop "${shop.name}" (${shop.city || 'Morocco'}) talks to you and you design, write and change their website and run their shop: bespoke page design, colours, fonts, texts, About/FAQ/contact content, photos they attach, products, prices, stock, and customer announcements.
Reply in the language the owner writes (Arabic, French, English, or Moroccan Darija in Latin letters). Keep replies to 1-2 short sentences and say what you changed.
Always use tools to change anything; never claim a change without a successful tool result. Prefer restyle_site / build_site for ordinary requests (cheap and reliable); use write_site only when the owner wants something the generator cannot do (a specific layout, unusual sections, custom illustration). After write_site, read the warnings it returns and fix them. Announcements: use prepare_broadcast, then tell the owner to reply "send" (you never send).
${ctx.imageUrl ? 'The owner attached a photo to this message.' : ''}
Current site: ${cur ? JSON.stringify({ source: cur.source, input: cur.input }) : 'none yet'}. Tagline="${shop.tagline}", announcement="${shop.announcement}", free_shipping_over=${shop.free_shipping_over}.
Catalogue:\n${cat || '(empty)'}\n\n${CLASS_GUIDE}`;
  const msgs = [];
  for (const h of (ctx.history || []).slice(-8)) if (h && h.text && (h.role === 'user' || h.role === 'assistant')) { const last = msgs[msgs.length - 1]; if (last && last.role === h.role) last.content[0].text += '\n' + h.text; else msgs.push({ role: h.role, content: [{ type: 'text', text: String(h.text).slice(0, 600) }] }); }
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  if (msgs.length && msgs[msgs.length - 1].role === 'user') msgs.pop();
  msgs.push({ role: 'user', content: [{ type: 'text', text: text || '(photo)' }] });
  const changes = []; const tctx = { ...ctx };
  for (let turn = 0; turn < 8; turn++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: MODEL, max_tokens: 6000, system, tools: TOOLS, messages: msgs }) });
    if (!res.ok) throw new Error(`LLM ${res.status}`);
    const data = await res.json();
    const uses = (data.content || []).filter(b => b.type === 'tool_use');
    if (!uses.length || data.stop_reason !== 'tool_use') return { lang: ctx.lang, reply: (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim() || R.en.unknown(), changes, changed: changes.length > 0, chips: [], state: tctx.pendingBroadcast ? { pendingBroadcast: tctx.pendingBroadcast, lang: ctx.lang } : {} };
    msgs.push({ role: 'assistant', content: data.content });
    msgs.push({ role: 'user', content: uses.map(u => { let o; try { o = execTool(shopId, u.name, u.input || {}, changes, tctx); } catch (e) { o = { error: e.message }; } return { type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(o) }; }) });
  }
  return { lang: ctx.lang, reply: R.en.unknown(), changes, changed: changes.length > 0, chips: [], state: {} };
}

// Ordinary requests never use credits. Claude is used only for what the rules cannot handle, and only while credits last.
async function handle(shopId, text, { history, lang, state, imageUrl, userId } = {}) {
  text = String(text || '').trim().slice(0, 600);
  if (!text && !imageUrl) return { reply: '', changes: [], changed: false, chips: [], state: state || {} };
  const rules = runRules(shopId, text, lang, { state, imageUrl, userId });
  const credits = (shopRow(shopId) || {}).ai_credits || 0; rules.credits = credits;
  if (!rules.unknown || !llmEnabled()) return rules;
  if (credits <= 0) { rules.reply = rr(rules.lang).noCredits(); rules.chips = []; return rules; }
  try {
    const res = await runLlm(shopId, text, { history, lang: lang || 'en', imageUrl });
    run('UPDATE shops SET ai_credits = MAX(0, ai_credits - 1) WHERE id=?', shopId); res.credits = Math.max(0, credits - 1); return res;
  } catch (e) { console.error('[studio llm] falling back to rules:', e.message); return rules; }
}

module.exports = { handle, undoLast, recentLog, interpret, runRules, llmEnabled, editContent, buildSite, restyle, chips: lang => rr(lang).chips };
