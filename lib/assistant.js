'use strict';
// Cendoor Studio: the seller talks to their shop and it gets built and changed.
//   "build my shop"                      -> a short guided conversation, then the whole site is created
//   "make it elegant, gold and black"    -> look and colours        "add an about section: ..." -> content sections
//   "lower the caftan to 600"            -> catalogue               a photo + "this is the blue dress 220 dirham" -> new product
// A rule-based interpreter (Arabic, French, English and Darija) always works; with ANTHROPIC_API_KEY a Claude
// tool-calling loop handles free-form requests with the same safe actions. Every change is logged and undoable.
const { get, all, run, tx } = require('./db');
const nlp = require('./nlp');
const orders = require('./orders');
const analytics = require('./analytics');
const D = require('./design');

// ---------- safe actions ----------------------------------------------------
const FIELDS = ['tagline', 'announcement', 'welcome_msg', 'free_shipping_over', 'tone', 'lang', 'ai_enabled', 'name'];
function clean(k, v) {
  switch (k) {
    case 'tagline': case 'announcement': return String(v).trim().slice(0, 140);
    case 'welcome_msg': return String(v).trim().slice(0, 300);
    case 'name': return String(v).trim().slice(0, 60) || null;
    case 'free_shipping_over': return Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null;
    case 'tone': return v === 'formal' || v === 'friendly' ? v : null;
    case 'lang': return ['dar', 'fr', 'en', 'ar'].includes(v) ? v : null;
    case 'ai_enabled': return v ? 1 : 0;
    default: return null;
  }
}
function log(shopId, kind, label, before) { run('INSERT INTO assistant_log (shop_id, kind, label, before) VALUES (?,?,?,?)', shopId, kind, String(label).slice(0, 200), JSON.stringify(before)); }
const shopRow = shopId => get('SELECT * FROM shops WHERE id=?', shopId);

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

// One undoable edit of the storefront design document.
function editDesign(shopId, label, fn) {
  const shop = shopRow(shopId); const before = D.getDesign(shopId);
  const next = D.normalize(fn(JSON.parse(JSON.stringify(before))), shop);
  D.saveDesign(shopId, next);
  log(shopId, 'design', label, { design: before });
  return { ok: true, design: next };
}

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

// "Build my shop": look, hero, sections and (optionally) sample products from four answers.
function applyWizard(shopId, a, lang) {
  const shop = shopRow(shopId); const L = lang === 'dar' ? 'fr' : (['en', 'fr', 'ar'].includes(lang) ? lang : 'fr');
  const built = D.buildFromWizard(shop, { category: a.cat, style: a.style, color: a.color, lang: L });
  const beforeDesign = D.getDesign(shopId); const created = [];
  tx(() => {
    D.saveDesign(shopId, built.design);
    run('UPDATE shops SET tagline=? WHERE id=?', built.tagline, shopId);
    const have = get('SELECT COUNT(*) n FROM products WHERE shop_id=? AND active=1', shopId).n;
    if (a.samples && have < 3) for (const s of built.category.samples) created.push(insertProduct(shopId, { ...s, variants: s.variants }, ''));
  });
  log(shopId, 'wizard', 'build', { design: beforeDesign, tagline: shop.tagline, created });
  return { ok: true, category: built.category, samples: created.length };
}

function undoLast(shopId) {
  const l = get('SELECT * FROM assistant_log WHERE shop_id=? AND undone=0 ORDER BY id DESC LIMIT 1', shopId);
  if (!l) return null;
  const b = JSON.parse(l.before || '{}');
  tx(() => {
    if (l.kind === 'shop') { const keys = Object.keys(b).filter(k => FIELDS.includes(k)); if (keys.length) run(`UPDATE shops SET ${keys.map(k => k + '=?').join(',')} WHERE id=?`, ...keys.map(k => b[k]), shopId); }
    if (l.kind === 'design' || l.kind === 'wizard') {
      run('UPDATE shops SET design=?, theme_color=? WHERE id=?', JSON.stringify(b.design), b.design.accent, shopId);
      if (l.kind === 'wizard') { run('UPDATE shops SET tagline=? WHERE id=?', b.tagline || '', shopId); for (const id of b.created || []) run('UPDATE products SET active=0 WHERE id=? AND shop_id=?', id, shopId); }
    }
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
    theme: n => `Your shop is now ${n}.`, themeBack: () => 'Shop colour reset to the Cendoor default.', freeShip: n => `Free delivery now starts at ${M(n)}.`, freeShipOff: () => 'Free delivery turned off.', tone: v => `The assistant now speaks in a ${v} tone.`,
    aiOn: () => 'The AI will answer customers again.', aiOff: () => 'The AI is paused: customers will see your shop but chat replies are off.', lang: v => `Default language set to ${v}.`, price: r => `${r.product}: ${r.old} → ${r.price} MAD.`,
    stock: r => `${r.product}${r.label !== 'Standard' ? ' (' + r.label + ')' : ''}: stock ${r.old} → ${r.stock}.`, added: r => `Added “${r.name}” at ${r.price} MAD.`, archived: r => `“${r.product}” is hidden from your shop.`,
    undone: l => `Undone: ${l}`, nothingUndo: () => 'There is nothing to undo.', notFound: () => 'I could not find that product. Try its name as it appears in your catalogue.', ambiguous: o => `Which one? ${o.join(', ')}`,
    which: r => `${r.product} has several options (${r.options.join(', ')}). Which one?`, needPrice: n => `What price for “${n}”? For example: add product ${n} 200 dirham 10 pieces.`, invalid: f => `That value is not valid for ${f}.`,
    today: a => `Today: ${M(a.sales)} from ${a.orders} order(s).`, month: a => `This month: ${M(a.sales)} from ${a.orders} order(s).`, low: l => (l.length ? `Running low: ${l.join('; ')}.` : 'Nothing is running low.'), pending: r => `${r.pending} order(s) waiting, ${r.attention} conversation(s) need you.`, top: l => (l.length ? `Top products: ${l.join(', ')}.` : 'No sales yet.'),
    unknown: () => 'I did not catch that. Try “build my shop”, “make it elegant”, “add an About section”, “add my Instagram” or send a product photo.', help: () => 'Tell me what you want, in your own words. I can build your whole shop, change the look and colours, write the hero and sections (About, FAQ, delivery, contact), add products from a photo, change prices and stock, and answer “how much did I sell today?”. Say “undo” to revert the last change.',
    chips: ['Build my shop', 'Make it elegant, gold and black', 'Add an About section', 'Add my Instagram', 'Set free delivery above 500', 'How much did I sell today?'],
    colorNames: { '#1f5fbf': 'blue', '#c8382e': 'red', '#1e8e5a': 'green', '#d6457f': 'pink', '#6b4bb5': 'purple', '#d9751a': 'orange', '#26302f': 'black', '#9c7a1e': 'gold', '#7a4b2a': 'brown', '#0f5c5c': 'teal', '#4d5b5c': 'grey' },
    preset: n => `Done: your shop now has the ${n} look.`, mode: m => (m === 'dark' ? 'Dark mode is on.' : m === 'light' ? 'Light mode is on.' : 'Your shop now follows each visitor’s device setting.'), font: n => `Font changed to ${n}.`,
    radius: r => (r >= 20 ? 'Corners are now very round.' : r <= 4 ? 'Corners are now sharp.' : 'Corners updated.'), columns: n => `Products now show ${n} per row on large screens.`, colors: (a, b) => (b ? `Colours set: ${a} with ${b}.` : `Main colour set to ${a}.`),
    hero: () => 'Top banner updated.', sectionOn: n => `“${n}” section is now on your shop.`, sectionOff: n => `“${n}” section removed.`, sectionMoved: n => `“${n}” moved.`, faqAdded: q => `FAQ added: “${q}”.`, testimonial: () => 'Testimonial added.',
    social: k => `${k} added to your shop.`, logoEmoji: e => `Logo set to ${e}.`, logoImage: () => 'Logo updated from your photo.', heroImage: () => 'Top banner image updated from your photo.', imageProduct: n => `Photo added to “${n}”.`,
    askImage: () => 'Got your photo. What is it? For example: “this is the blue dress, 220 dirham, 20 pieces”, or “use it as my logo”.',
    wizCat: () => 'Let’s build your shop in 4 quick questions. What do you sell?', wizStyle: () => 'Nice! Which style do you like?', wizColor: () => 'Pick a main colour, or say “skip”.', wizSamples: () => 'Should I add 3 sample products so you can see it working? You can edit or remove them later.',
    wizDone: r => `Your shop is ready: ${r.style} style, ${r.cat}${r.n ? `, with ${r.n} sample products` : ''}. Check the preview and tell me anything to change.`, wizRetry: () => 'I did not catch that. Pick one of the options below.', wizCancel: () => 'No problem, I stopped the shop builder.',
    presetNames: { minimal: 'minimal', elegant: 'elegant', bold: 'bold', playful: 'playful', futuristic: 'futuristic', natural: 'natural', luxury: 'luxury' }, sectionNames: { about: 'About', faq: 'FAQ', reviews: 'Reviews', delivery: 'Delivery', contact: 'Contact', featured: 'Best sellers', products: 'Products', custom: 'Text' }, fontNames: { modern: 'modern', serif: 'classic serif', rounded: 'rounded', mono: 'tech monospace' },
    styleChips: ['Elegant', 'Minimal', 'Bold', 'Playful', 'Futuristic', 'Natural', 'Luxury'], colorChips: ['Gold', 'Green', 'Blue', 'Pink', 'Black', 'Orange', 'Skip'], yes: 'Yes, add samples', no: 'No, I will add mine',
  },
  fr: {
    tagline: v => `Slogan mis à jour : « ${v} ».`, announce: v => `Bandeau d'annonce en ligne : « ${v} ».`, announceOff: () => "Bandeau d'annonce retiré.", welcome: v => `Message d'accueil du chat mis à jour : « ${v} ».`,
    theme: n => `Votre boutique est maintenant ${n}.`, themeBack: () => 'Couleur remise par défaut.', freeShip: n => `La livraison est gratuite dès ${M(n)}.`, freeShipOff: () => 'Livraison gratuite désactivée.', tone: v => `L'assistant parle maintenant sur un ton ${v}.`,
    aiOn: () => "L'IA répond de nouveau aux clients.", aiOff: () => "L'IA est en pause : les clients voient la boutique mais le chat ne répond plus.", lang: v => `Langue par défaut : ${v}.`, price: r => `${r.product} : ${r.old} → ${r.price} MAD.`,
    stock: r => `${r.product}${r.label !== 'Standard' ? ' (' + r.label + ')' : ''} : stock ${r.old} → ${r.stock}.`, added: r => `« ${r.name} » ajouté à ${r.price} MAD.`, archived: r => `« ${r.product} » est masqué de votre boutique.`,
    undone: l => `Annulé : ${l}`, nothingUndo: () => 'Rien à annuler.', notFound: () => "Je n'ai pas trouvé ce produit. Essayez son nom tel qu'il apparaît dans votre catalogue.", ambiguous: o => `Lequel ? ${o.join(', ')}`,
    which: r => `${r.product} existe en plusieurs versions (${r.options.join(', ')}). Laquelle ?`, needPrice: n => `Quel prix pour « ${n} » ? Par exemple : ajoute produit ${n} 200 dirham 10 pièces.`, invalid: f => `Cette valeur n'est pas valide pour ${f}.`,
    today: a => `Aujourd'hui : ${M(a.sales)} pour ${a.orders} commande(s).`, month: a => `Ce mois-ci : ${M(a.sales)} pour ${a.orders} commande(s).`, low: l => (l.length ? `Bientôt épuisés : ${l.join(' ; ')}.` : 'Rien ne manque.'), pending: r => `${r.pending} commande(s) en attente, ${r.attention} conversation(s) à traiter.`, top: l => (l.length ? `Meilleurs produits : ${l.join(', ')}.` : 'Pas encore de ventes.'),
    unknown: () => "Je n'ai pas compris. Essayez « construis ma boutique », « style élégant », « ajoute une section À propos », « ajoute mon Instagram » ou envoyez une photo de produit.", help: () => "Dites-moi ce que vous voulez, avec vos mots. Je peux construire toute votre boutique, changer le style et les couleurs, écrire la bannière et les sections (À propos, FAQ, livraison, contact), ajouter des produits à partir d'une photo, modifier prix et stock, et répondre à « combien ai-je vendu aujourd'hui ? ». Dites « annuler » pour revenir en arrière.",
    chips: ['Construis ma boutique', 'Style élégant, or et noir', 'Ajoute une section À propos', 'Ajoute mon Instagram', 'Livraison gratuite à partir de 500', "Combien j'ai vendu aujourd'hui ?"],
    colorNames: { '#1f5fbf': 'bleue', '#c8382e': 'rouge', '#1e8e5a': 'verte', '#d6457f': 'rose', '#6b4bb5': 'violette', '#d9751a': 'orange', '#26302f': 'noire', '#9c7a1e': 'dorée', '#7a4b2a': 'marron', '#0f5c5c': 'turquoise', '#4d5b5c': 'grise' },
    preset: n => `C'est fait : votre boutique a maintenant le style ${n}.`, mode: m => (m === 'dark' ? 'Le mode sombre est activé.' : m === 'light' ? 'Le mode clair est activé.' : "Votre boutique suit maintenant le réglage de l'appareil de chaque visiteur."), font: n => `Police changée : ${n}.`,
    radius: r => (r >= 20 ? 'Les coins sont maintenant très arrondis.' : r <= 4 ? 'Les coins sont maintenant nets.' : 'Coins mis à jour.'), columns: n => `Les produits s'affichent par ${n} sur grand écran.`, colors: (a, b) => (b ? `Couleurs : ${a} avec ${b}.` : `Couleur principale : ${a}.`),
    hero: () => 'Bannière principale mise à jour.', sectionOn: n => `La section « ${n} » est maintenant sur votre boutique.`, sectionOff: n => `Section « ${n} » retirée.`, sectionMoved: n => `Section « ${n} » déplacée.`, faqAdded: q => `Question ajoutée à la FAQ : « ${q} ».`, testimonial: () => 'Témoignage ajouté.',
    social: k => `${k} ajouté à votre boutique.`, logoEmoji: e => `Logo défini : ${e}.`, logoImage: () => 'Logo mis à jour avec votre photo.', heroImage: () => 'Image de la bannière mise à jour.', imageProduct: n => `Photo ajoutée à « ${n} ».`,
    askImage: () => 'Photo reçue. De quoi s\'agit-il ? Par exemple : « voici la robe bleue, 220 dirham, 20 pièces », ou « utilise-la comme logo ».',
    wizCat: () => 'Construisons votre boutique en 4 questions. Que vendez-vous ?', wizStyle: () => 'Super ! Quel style vous plaît ?', wizColor: () => 'Choisissez une couleur principale, ou dites « passer ».', wizSamples: () => "Voulez-vous que j'ajoute 3 produits d'exemple pour voir le résultat ? Vous pourrez les modifier ou les supprimer.",
    wizDone: r => `Votre boutique est prête : style ${r.style}, ${r.cat}${r.n ? `, avec ${r.n} produits d'exemple` : ''}. Regardez l'aperçu et dites-moi ce que vous voulez changer.`, wizRetry: () => "Je n'ai pas compris. Choisissez une des options ci-dessous.", wizCancel: () => "D'accord, j'ai arrêté le créateur de boutique.",
    presetNames: { minimal: 'minimal', elegant: 'élégant', bold: 'audacieux', playful: 'ludique', futuristic: 'futuriste', natural: 'naturel', luxury: 'luxe' }, sectionNames: { about: 'À propos', faq: 'FAQ', reviews: 'Avis', delivery: 'Livraison', contact: 'Contact', featured: 'Meilleures ventes', products: 'Produits', custom: 'Texte' }, fontNames: { modern: 'moderne', serif: 'classique à empattements', rounded: 'arrondie', mono: 'technique à chasse fixe' },
    styleChips: ['Élégant', 'Minimal', 'Audacieux', 'Ludique', 'Futuriste', 'Naturel', 'Luxe'], colorChips: ['Or', 'Vert', 'Bleu', 'Rose', 'Noir', 'Orange', 'Passer'], yes: 'Oui, ajoute des exemples', no: "Non, j'ajoute les miens",
  },
  dar: {}, // Darija messages fall back to French for the new building features (see rr())
  ar: {
    tagline: v => `تم تحديث الشعار: «${v}».`, announce: v => `شريط الإعلان يعمل الآن: «${v}».`, announceOff: () => 'تمت إزالة شريط الإعلان.', welcome: v => `تم تحديث رسالة ترحيب المحادثة: «${v}».`,
    theme: n => `أصبح متجرك ${n}.`, themeBack: () => 'أُعيد لون المتجر إلى الافتراضي.', freeShip: n => `التوصيل مجاني ابتداء من ${M(n)}.`, freeShipOff: () => 'تم إيقاف التوصيل المجاني.', tone: v => `المساعد يتكلم الآن بأسلوب ${v}.`,
    aiOn: () => 'الذكاء الاصطناعي سيجيب الزبناء من جديد.', aiOff: () => 'الذكاء الاصطناعي متوقف: سيرى الزبناء متجرك لكن ردود المحادثة متوقفة.', lang: v => `اللغة الافتراضية: ${v}.`, price: r => `${r.product}: ${r.old} ← ${r.price} درهم.`,
    stock: r => `${r.product}${r.label !== 'Standard' ? ' (' + r.label + ')' : ''}: المخزون ${r.old} ← ${r.stock}.`, added: r => `تمت إضافة «${r.name}» بثمن ${r.price} درهم.`, archived: r => `«${r.product}» مخفي من متجرك.`,
    undone: l => `تم التراجع: ${l}`, nothingUndo: () => 'لا شيء للتراجع عنه.', notFound: () => 'لم أجد هذا المنتج. جرّب اسمه كما يظهر في الكتالوج.', ambiguous: o => `أي واحد؟ ${o.join('، ')}`,
    which: r => `${r.product} له عدة خيارات (${r.options.join('، ')}). أي واحد؟`, needPrice: n => `ما ثمن «${n}»؟ مثلا: زيد منتج ${n} 200 درهم 10 قطع.`, invalid: f => `هذه القيمة غير صالحة لـ ${f}.`,
    today: a => `اليوم: ${M(a.sales)} من ${a.orders} طلب.`, month: a => `هذا الشهر: ${M(a.sales)} من ${a.orders} طلب.`, low: l => (l.length ? `على وشك النفاد: ${l.join('؛ ')}.` : 'لا شيء على وشك النفاد.'), pending: r => `${r.pending} طلب في الانتظار، و${r.attention} محادثة تحتاجك.`, top: l => (l.length ? `أفضل المنتجات: ${l.join('، ')}.` : 'لا مبيعات بعد.'),
    unknown: () => 'لم أفهم جيدا. جرّب «ابني متجري» أو «خليه أنيق» أو «زيد قسم من نحن» أو «زيد الإنستغرام ديالي» أو أرسل صورة منتج.', help: () => 'قل لي ماذا تريد بكلامك. أستطيع بناء متجرك كاملا، وتغيير الشكل والألوان، وكتابة البانر والأقسام (من نحن، الأسئلة، التوصيل، التواصل)، وإضافة منتجات من صورة، وتغيير الأثمنة والمخزون، والإجابة عن «شحال بعت اليوم؟». قل «تراجع» لإلغاء آخر تغيير.',
    chips: ['ابني متجري', 'خليه أنيق بالذهبي والأسود', 'زيد قسم من نحن', 'زيد الإنستغرام ديالي', 'توصيل مجاني فوق 500', 'شحال بعت اليوم؟'],
    colorNames: { '#1f5fbf': 'زرقاء', '#c8382e': 'حمراء', '#1e8e5a': 'خضراء', '#d6457f': 'وردية', '#6b4bb5': 'بنفسجية', '#d9751a': 'برتقالية', '#26302f': 'سوداء', '#9c7a1e': 'ذهبية', '#7a4b2a': 'بنية', '#0f5c5c': 'تركوازية', '#4d5b5c': 'رمادية' },
    preset: n => `تم: أصبح لمتجرك مظهر ${n}.`, mode: m => (m === 'dark' ? 'تم تفعيل الوضع الداكن.' : m === 'light' ? 'تم تفعيل الوضع الفاتح.' : 'متجرك يتبع الآن إعداد جهاز كل زائر.'), font: n => `تم تغيير الخط إلى ${n}.`,
    radius: r => (r >= 20 ? 'الزوايا أصبحت مستديرة جدا.' : r <= 4 ? 'الزوايا أصبحت حادة.' : 'تم تحديث الزوايا.'), columns: n => `المنتجات تظهر الآن ${n} في الصف على الشاشات الكبيرة.`, colors: (a, b) => (b ? `الألوان: ${a} مع ${b}.` : `اللون الأساسي: ${a}.`),
    hero: () => 'تم تحديث البانر الرئيسي.', sectionOn: n => `قسم «${n}» أصبح في متجرك.`, sectionOff: n => `تمت إزالة قسم «${n}».`, sectionMoved: n => `تم نقل قسم «${n}».`, faqAdded: q => `تمت إضافة سؤال: «${q}».`, testimonial: () => 'تمت إضافة الشهادة.',
    social: k => `تمت إضافة ${k} إلى متجرك.`, logoEmoji: e => `تم تعيين الشعار: ${e}.`, logoImage: () => 'تم تحديث الشعار من صورتك.', heroImage: () => 'تم تحديث صورة البانر.', imageProduct: n => `تمت إضافة الصورة إلى «${n}».`,
    askImage: () => 'وصلتني الصورة. ما هي؟ مثلا: «هذا الفستان الأزرق، 220 درهم، 20 قطعة»، أو «استعملها كشعار».',
    wizCat: () => 'لنبني متجرك في 4 أسئلة سريعة. ماذا تبيع؟', wizStyle: () => 'رائع! أي أسلوب يعجبك؟', wizColor: () => 'اختر لونا أساسيا، أو قل «تخطى».', wizSamples: () => 'هل أضيف 3 منتجات تجريبية لترى النتيجة؟ يمكنك تعديلها أو حذفها لاحقا.',
    wizDone: r => `متجرك جاهز: أسلوب ${r.style}، ${r.cat}${r.n ? `، مع ${r.n} منتجات تجريبية` : ''}. شاهد المعاينة وقل لي ما تريد تغييره.`, wizRetry: () => 'لم أفهم. اختر أحد الخيارات أدناه.', wizCancel: () => 'حسنا، أوقفت منشئ المتجر.',
    presetNames: { minimal: 'بسيط', elegant: 'أنيق', bold: 'جريء', playful: 'مرح', futuristic: 'مستقبلي', natural: 'طبيعي', luxury: 'فاخر' }, sectionNames: { about: 'من نحن', faq: 'أسئلة شائعة', reviews: 'التقييمات', delivery: 'التوصيل', contact: 'التواصل', featured: 'الأكثر مبيعا', products: 'المنتجات', custom: 'نص' }, fontNames: { modern: 'عصري', serif: 'كلاسيكي', rounded: 'مستدير', mono: 'تقني' },
    styleChips: ['أنيق', 'بسيط', 'جريء', 'مرح', 'مستقبلي', 'طبيعي', 'فاخر'], colorChips: ['ذهبي', 'أخضر', 'أزرق', 'وردي', 'أسود', 'برتقالي', 'تخطى'], yes: 'نعم، أضف أمثلة', no: 'لا، سأضيف منتجاتي',
  },
};
// Darija (Latin script) replies reuse the existing French/Arabic building messages
R.dar = { ...R.fr, tagline: v => `S-sh3ar tbddl: “${v}”.`, announce: v => `L-i3lan tlq f l-boutique: “${v}”.`, announceOff: () => 'L-i3lan t7yed.', theme: n => `L-boutique dyalek wllat ${n}.`, freeShip: n => `T-tawsil mjani mn ${M(n)}.`, price: r => `${r.product}: ${r.old} → ${r.price} DH.`, undone: l => `Rje3t: ${l}`, nothingUndo: () => 'Walo bach nrje3.', notFound: () => 'Ma-lqitch had l-produit. Kteb smiyto kima kayn f l-catalogue.', today: a => `Lyoum: ${M(a.sales)} f ${a.orders} commande.`, month: a => `Had ch-chhar: ${M(a.sales)} f ${a.orders} commande.`, unknown: () => 'Ma-fhmtch mzyan. Jreb “bni boutique”, “khelliha raqiya” wla “zid section 3lina”.', chips: ['Bni l-boutique dyali', 'Khelliha raqiya b dhabi u k7el', 'Tawsil mjani fo9 500', 'Chhal bi3t lyoum?'], colorNames: { '#1f5fbf': 'zer9a', '#c8382e': '7mra', '#1e8e5a': 'khdra', '#d6457f': 'wardiya', '#6b4bb5': 'banafsajiya', '#d9751a': 'orange', '#26302f': 'k7la', '#9c7a1e': 'dhabiya', '#7a4b2a': 'qhwiya', '#0f5c5c': 'turquoise', '#4d5b5c': 'ramadiya' } };

// ---------- rule-based interpreter -------------------------------------------
const THEME = { Blue: '#1f5fbf', Red: '#c8382e', Green: '#1e8e5a', Pink: '#d6457f', Purple: '#6b4bb5', Orange: '#d9751a', Black: '#26302f', Gold: '#9c7a1e', Brown: '#7a4b2a', Gray: '#4d5b5c', Yellow: '#9c7a1e', Beige: '#7a4b2a', Silver: '#4d5b5c', White: '#0f5c5c' };
const PRESET_WORDS = {
  minimal: ['minimal', 'minimalist', 'minimaliste', 'simple', 'clean', 'epure', 'بسيط', 'بسيطة'],
  elegant: ['elegant', 'elegante', 'chic', 'classy', 'raffine', 'sophisticated', 'raqi', 'أنيق', 'أنيقة', 'راقي'],
  bold: ['bold', 'audacieux', 'strong', 'punchy', 'jari2', 'جريء', 'قوي'],
  playful: ['playful', 'ludique', 'fun', 'colorful', 'colore', 'joyeux', 'مرح', 'ملون'],
  futuristic: ['futuristic', 'futuriste', 'futurist', 'cyber', 'neon', 'tech', 'sci fi', 'مستقبلي'],
  natural: ['natural', 'naturel', 'organic', 'bio', 'earthy', 'tabi3i', 'طبيعي'],
  luxury: ['luxury', 'luxe', 'luxueux', 'premium', 'high end', 'fakhm', 'فاخر', 'فخم'],
};
const W = {
  undo: ['undo', 'annuler', 'annule', 'cancel that', 'revert', 'rj3', 'rje3', 'تراجع', 'رجع'],
  help: ['help', 'aide', 'what can you do', '3awni', 'مساعدة', 'اش تقدر'],
  build: ['build my shop', 'build my store', 'build my website', 'build me a shop', 'create my website', 'create my shop', 'create my store', 'set up my shop', 'set up my store', 'start from scratch', 'make me a website', 'construis ma boutique', 'cree ma boutique', 'cree mon site', 'creer ma boutique', 'construire ma boutique', 'bni boutique', 'bni l boutique', 'bni lboutique', 'ابني متجري', 'انشئ متجري', 'أنشئ متجري', 'ابني موقعي', 'انشئ موقعي'],
  cancel: ['cancel', 'stop', 'annuler', 'annule', 'passer', 'laisse tomber', 'wa9ef', 'وقف', 'إلغاء', 'الغاء'],
  skip: ['skip', 'passer', 'pass', 'auto', 'no preference', 'peu importe', 'tkhta', 'تخطى', 'عادي'],
  tagline: ['tagline', 'slogan', 'accroche', 'headline', 'sh3ar', 'shi3ar', 'شعار'],
  announce: ['announce', 'announcement', 'announcement bar', 'annonce', 'bandeau', 'i3lan', 'ilan', 'إعلان', 'اعلان'],
  welcome: ['welcome message', 'welcome text', 'message de bienvenue', 'message daccueil', 'risalat tarhib', 'رسالة الترحيب', 'رسالة ترحيب'],
  free: ['free delivery', 'free shipping', 'livraison gratuite', 'tawsil mjani', 'twsil mjani', 'توصيل مجاني'],
  off: ['remove', 'clear', 'delete', 'disable', 'turn off', 'hide', 'no more', 'supprime', 'retire', 'enleve', 'cache', 'desactive', '7yed', 'hyed', 'weqef', 'حيد', 'احذف', 'ألغ', 'الغ', 'اخف', 'أخف'],
  on: ['add', 'show', 'enable', 'create', 'put', 'ajoute', 'ajouter', 'affiche', 'montre', 'active', 'zid', 'ando', 'اضف', 'أضف', 'زيد', 'اظهر', 'أظهر', 'اعرض'],
  tone: ['tone', 'nabra', 'نبرة'], formal: ['formal', 'formel', 'rasmi', 'رسمي', 'professionnel', 'professional'], friendly: ['friendly', 'amical', 'chaleureux', 'wadi', 'ودي', 'casual'],
  ai: ['the ai', 'l ia', 'lia', 'chatbot', 'bot', 'الذكاء الاصطناعي'], pause: ['pause', 'turn off', 'disable', 'stop', 'desactive', 'weqef', 'وقف', 'أوقف'], resume: ['resume', 'turn on', 'enable', 'activate', 'active', 'reactive', 'chghel', 'شغل', 'فعل'],
  language: ['default language', 'langue par defaut', 'lougha', 'اللغة الافتراضية'],
  addProduct: ['add product', 'new product', 'ajoute produit', 'ajoute un produit', 'ajouter un produit', 'nouveau produit', 'zid produit', 'zid chi produit', 'زيد منتج', 'إضافة منتج', 'اضافة منتج', 'أضف منتج', 'اضف منتج'],
  thisIs: ['this is', 'voici', 'voila', 'hada', 'hadi', 'هذا', 'هادا', 'هذه'],
  archive: ['remove product', 'delete product', 'hide product', 'archive', 'supprime le produit', 'retire le produit', 'cache le produit', '7yed produit', 'حيد المنتج', 'احذف المنتج'],
  price: ['price', 'prix', 'taman', 'tarif', 'ثمن', 'سعر', 'الثمن', 'السعر'],
  stock: ['stock', 'restock', 'quantite', 'quantity', 'pieces', 'pcs', 'zid', 'ajoute', 'add', 'mets', 'set', 'kmiya', 'كمية', 'المخزون', 'زيد'],
  photoWord: ['photo', 'picture', 'image', 'pic', 'tswira', 'صورة'],
  look: ['style', 'look', 'design', 'theme', 'make', 'rends', 'rend', 'khelli', 'khlli', 'خلي', 'اجعل', 'use', 'utilise', 'استعمل', 'change', 'switch', 'shop', 'store', 'boutique', 'site', 'website', 'page', 'متجر', 'متجري', 'متجرك', 'المحل', 'محلي', 'موقعي', 'couleur', 'color', 'colour', 'loun', 'لون'],
  hero: ['hero', 'cover', 'main banner', 'top banner', 'banniere', 'banniere principale', 'en tete', 'header'],
  heroTitle: ['title', 'titre', 'headline', 'عنوان'], heroSub: ['subtitle', 'sous titre', 'sub title', 'وصف'], heroCta: ['button', 'bouton', 'cta', 'زر'],
  logo: ['logo', 'لوغو', 'شعار المتجر'],
  darkMode: ['dark mode', 'dark theme', 'night mode', 'mode sombre', 'theme sombre', 'wad3 dalam', 'الوضع الداكن', 'وضع داكن'], lightMode: ['light mode', 'light theme', 'mode clair', 'theme clair', 'الوضع الفاتح', 'وضع فاتح'], autoMode: ['auto mode', 'automatic mode', 'mode auto', 'follow the device'],
  serif: ['serif', 'classic font', 'police classique', 'avec empattement', 'خط كلاسيكي'], rounded: ['rounded font', 'police arrondie', 'خط مستدير'], modernFont: ['modern font', 'sans serif', 'police moderne', 'خط عصري'], mono: ['monospace', 'mono font', 'police technique', 'خط تقني'], fontWord: ['font', 'police', 'typo', 'typography', 'خط'],
  roundCorners: ['rounded corners', 'round corners', 'rounder', 'coins arrondis', 'plus arrondi', 'زوايا مستديرة'], sharpCorners: ['sharp corners', 'square corners', 'sharper', 'coins carres', 'coins nets', 'زوايا حادة'],
  columnsWord: ['column', 'columns', 'colonne', 'colonnes', 'per row', 'par ligne', 'في الصف', 'أعمدة'],
  sold: ['sold', 'sales', 'sell', 'vendu', 'vendre', 'ventes', 'chiffre', 'bi3t', 'bi3', 'mabi3at', 'revenue', 'مبيعات', 'بعت'],
  lowStock: ['low on stock', 'low stock', 'running low', 'stock bas', 'bientot epuise', 'epuise', 'kay sali', 'kaysali', 'gaysali', 'غادي تسالي', 'تسالي', 'كيسالي'],
  pending: ['pending', 'to approve', 'waiting', 'en attente', 'a valider', 'kat tsna', 'كتسنى'], top: ['best seller', 'best selling', 'top product', 'meilleur', 'ahsen', 'الأكثر مبيعا'],
  move: ['move', 'put', 'place', 'mets', 'deplace', 'monte', 'descends', 'حط', 'انقل', 'حرك'], top_: ['top', 'first', 'haut', 'premier', 'en haut', 'الأعلى', 'فوق'], bottom_: ['bottom', 'last', 'end', 'bas', 'dernier', 'en bas', 'الأسفل', 'تحت'], above: ['above', 'before', 'avant', 'au dessus', 'قبل'], below: ['below', 'after', 'apres', 'en dessous', 'بعد'],
  testimonial: ['testimonial', 'review from', 'temoignage', 'شهادة'], section: ['section', 'bloc', 'قسم'],
};
const SEC = {
  about: ['about', 'about us', 'a propos', 'qui sommes nous', 'notre histoire', '3lina', 'من نحن'],
  faq: ['faq', 'questions', 'questions frequentes', 'as2ila', 'أسئلة', 'اسئلة'],
  reviews: ['reviews', 'testimonials', 'avis', 'temoignages', 'تقييمات', 'آراء'],
  delivery: ['delivery info', 'delivery section', 'shipping info', 'livraison', 'delivery', 'معلومات التوصيل', 'التوصيل'],
  contact: ['contact', 'contact us', 'nous contacter', 'اتصل بنا', 'تواصل'],
  featured: ['featured', 'best sellers', 'bestsellers', 'meilleures ventes', 'produits phares', 'الأكثر مبيعا'],
  products: ['products', 'produits', 'catalogue', 'catalog', 'المنتجات'],
};
const CAT_WORDS = Object.entries(D.CATEGORIES).map(([k, c]) => [k, c.words]);
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
const presetOf = sp => Object.keys(PRESET_WORDS).find(k => nlp.hasAny(sp, PRESET_WORDS[k]));
function colorTokens(tk, text) {
  const out = []; const hexes = text.match(/#[0-9a-fA-F]{6}\b/g) || [];
  for (const t of tk) { const c = nlp.colorOf(t) || (t === 'teal' || t === 'turquoise' ? 'Teal' : null); if (c && !out.includes(c)) out.push(c); }
  return { names: out, hexes };
}
const colorHex = n => (n === 'Teal' ? '#0f5c5c' : THEME[n]);

const STYLE_ORDER = ['elegant', 'minimal', 'bold', 'playful', 'futuristic', 'natural', 'luxury'];
function wizardOptions(R_) { return { cat: Object.values(D.CATEGORIES).map(c => c.label), style: R_.styleChips, color: R_.colorChips }; }
function wizardAnswer(step, text, R_, sp, tk) {
  if (step === 'cat') {
    for (const [k, words] of CAT_WORDS) if (nlp.hasAny(sp, words) || Object.values(D.CATEGORIES[k].label).some(l => nlp.norm(l) === nlp.norm(text.trim()))) return k;
    return null;
  }
  if (step === 'style') {
    const k = presetOf(sp); if (k) return k;
    const i = R_.styleChips.findIndex(c => nlp.norm(c) === nlp.norm(text.trim())); return i >= 0 ? STYLE_ORDER[i] : null;
  }
  if (step === 'color') {
    if (has(sp, 'skip') || nlp.hasAny(sp, ['skip', 'passer', 'تخطى'])) return 'skip';
    const c = colorTokens(tk, text); if (c.hexes.length) return c.hexes[0].toLowerCase(); if (c.names.length) return colorHex(c.names[0]);
    const i = R_.colorChips.findIndex(x => nlp.norm(x) === nlp.norm(text.trim())); if (i >= 0 && i < 6) return colorHex(['Gold', 'Green', 'Blue', 'Pink', 'Black', 'Orange'][i]); return null;
  }
  if (step === 'samples') {
    const it = nlp.intents(text); const n = nlp.norm(text);
    if (it.yes || /\b(oui|yes|iyeh|نعم|add|ajoute)\b/.test(n) || n === nlp.norm(R_.yes)) return true;
    if (it.no || /\b(non|no|la|لا)\b/.test(n) || n === nlp.norm(R_.no)) return false; return null;
  }
  return null;
}

function interpret(text, ctx = {}) {
  const sp = nlp.spaced(text); const tk = nlp.tokens(text); const short = tk.length <= 4; const off = has(sp, 'off');
  const img = ctx.imageUrl;
  if (short && has(sp, 'undo')) return { t: 'undo' };
  if (short && has(sp, 'help')) return { t: 'help' };
  if (has(sp, 'build')) return { t: 'wizard_start' };
  // questions about the business
  if (has(sp, 'lowStock')) return { t: 'stats', what: 'low' };
  if (has(sp, 'top')) return { t: 'stats', what: 'top' };
  if (has(sp, 'pending')) return { t: 'stats', what: 'pending' };
  if (has(sp, 'sold') && !has(sp, 'price') && !/\d{2,}/.test(text)) return { t: 'stats', what: /month|mois|chhar|شهر|الشهر/i.test(text) ? 'month' : 'today' };
  // text settings
  if (has(sp, 'welcome')) return off ? { t: 'shop', fields: { welcome_msg: '' }, key: 'welcome', value: '' } : { t: 'shop', fields: { welcome_msg: quoted(text) || after(text, W.welcome) || '' }, key: 'welcome' };
  if (has(sp, 'announce') && !has(sp, 'hero')) { if (off) return { t: 'shop', fields: { announcement: '' }, key: 'announceOff' }; const v = quoted(text) || after(text, W.announce); return v ? { t: 'shop', fields: { announcement: v }, key: 'announce', value: v } : { t: 'help' }; }
  if (has(sp, 'tagline')) { const v = quoted(text) || after(text, W.tagline); return v ? { t: 'shop', fields: { tagline: v }, key: 'tagline', value: v } : { t: 'help' }; }
  if (has(sp, 'free')) { if (off) return { t: 'shop', fields: { free_shipping_over: 0 }, key: 'freeShipOff' }; const n = numbers(text); return n.length ? { t: 'shop', fields: { free_shipping_over: n[n.length - 1] }, key: 'freeShip', value: n[n.length - 1] } : { t: 'unknown' }; }
  if (has(sp, 'tone') || (has(sp, 'formal') && short) || (has(sp, 'friendly') && short)) { const v = has(sp, 'formal') ? 'formal' : has(sp, 'friendly') ? 'friendly' : null; if (v) return { t: 'shop', fields: { tone: v }, key: 'tone', value: v }; }
  if (has(sp, 'ai')) { if (has(sp, 'pause')) return { t: 'shop', fields: { ai_enabled: 0 }, key: 'aiOff' }; if (has(sp, 'resume')) return { t: 'shop', fields: { ai_enabled: 1 }, key: 'aiOn' }; }
  if (has(sp, 'language')) { const map = { fr: ['french', 'francais', 'fr'], en: ['english', 'anglais', 'en'], ar: ['arabic', 'arabe', 'عربية'] }; for (const [k, ws] of Object.entries(map)) if (nlp.hasAny(sp, ws)) return { t: 'shop', fields: { lang: k }, key: 'lang', value: k }; }
  // photo + logo / hero
  if (img && has(sp, 'logo')) return { t: 'image', target: 'logo' };
  if (img && has(sp, 'hero')) return { t: 'image', target: 'hero' };
  // hero text
  if (has(sp, 'hero')) {
    const f = {}; const e = EMOJI_RE.exec(text); if (e) f.emoji = e[0];
    const sub = after(text, W.heroSub), cta = after(text, W.heroCta), title = after(text, W.heroTitle);
    if (sub && hasW(sp, W.heroSub)) f.subtitle = sub; else if (cta && hasW(sp, W.heroCta)) f.cta = cta; else if (title && hasW(sp, W.heroTitle)) f.title = title; else if (quoted(text)) f.title = quoted(text);
    if (nlp.hasAny(sp, ['center', 'centre', 'centered', 'centre', 'وسط'])) f.align = 'center';
    if (nlp.hasAny(sp, ['split', 'two columns', 'deux colonnes'])) f.style = 'split'; else if (nlp.hasAny(sp, ['full banner', 'big banner', 'banner style', 'grande banniere'])) f.style = 'banner'; else if (nlp.hasAny(sp, ['minimal', 'simple', 'text only'])) f.style = 'minimal';
    if (Object.keys(f).length) return { t: 'design', ops: [{ op: 'hero', f }] };
  }
  // sections
  const secKey = Object.keys(SEC).find(k => nlp.hasAny(sp, SEC[k]) && k !== 'delivery' && k !== 'products' ? true : (k === 'delivery' || k === 'products') && nlp.hasAny(sp, SEC[k]) && (has(sp, 'section') || has(sp, 'move')));
  if (secKey && has(sp, 'move')) {
    const where = nlp.hasAny(sp, ['to the top', 'at the top', 'on top', 'en haut', 'first', 'top', 'premier', 'الأعلى']) ? 'top' : nlp.hasAny(sp, ['to the bottom', 'at the bottom', 'en bas', 'last', 'bottom', 'dernier', 'الأسفل']) ? 'bottom' : null;
    if (where) return { t: 'design', ops: [{ op: 'move', type: secKey, where }] };
    const other = Object.keys(SEC).find(k => k !== secKey && nlp.hasAny(sp, SEC[k]));
    if (other) return { t: 'design', ops: [{ op: 'move', type: secKey, where: has(sp, 'below') ? 'below' : 'above', other }] };
  }
  if (secKey && !img) {
    if (off && (has(sp, 'section') || nlp.hasAny(sp, ['remove', 'hide', 'delete', 'supprime', 'cache', 'retire', 'حيد', 'اخف']))) return { t: 'design', ops: [{ op: 'sectionOff', type: secKey }] };
    if (secKey === 'faq') {
      const qa = /["“«]([^"”»“«]{4,140}[?؟])["”»]\s*[:\-–—]?\s*(.{2,400})$/.exec(text);
      if (qa) return { t: 'design', ops: [{ op: 'faqAdd', q: qa[1].trim(), a: qa[2].trim() }] };
      const body = quoted(text) || after(text, ['faq', 'questions']); const m = body && /^(.{4,140}?[?؟])\s*(.{2,400})$/.exec(body);
      if (m) return { t: 'design', ops: [{ op: 'faqAdd', q: m[1].trim(), a: m[2].trim() }] };
      if (has(sp, 'on') || has(sp, 'section')) return { t: 'design', ops: [{ op: 'sectionOn', type: 'faq', fill: true }] };
    }
    if (secKey === 'reviews' && has(sp, 'testimonial')) {
      const q = quoted(text); const name = /[-–—]\s*([^\-–—"”»]{2,40})$/.exec(text); if (q) return { t: 'design', ops: [{ op: 'testimonial', text: q, name: name ? name[1].trim() : '' }] };
    }
    if (has(sp, 'on') || has(sp, 'section')) {
      const body = secKey === 'about' || secKey === 'contact' ? (quoted(text) || after(text, [...SEC[secKey], ...W.section])) : null;
      return { t: 'design', ops: [{ op: 'sectionOn', type: secKey, body: body && body.length > 8 ? body : '', fill: true }] };
    }
  }
  // social links
  const soc = {}; let m;
  if ((m = /(?:instagram|insta|ig)\W+(?:is\s+|account\s+)?@?([A-Za-z0-9._]{2,30})/i.exec(text))) soc.instagram = m[1];
  if ((m = /tiktok\W+(?:is\s+|account\s+)?@?([A-Za-z0-9._]{2,30})/i.exec(text))) soc.tiktok = m[1];
  if ((m = /[\w.+-]+@[\w-]+\.[\w.]+/.exec(text))) soc.email = m[0];
  const ph = nlp.extractPhone(text); if (ph.phone && /whatsapp|واتساب|wa\b|phone|tel|téléphone|telephone|هاتف|رقم/i.test(text)) { if (/whatsapp|واتساب|wa\b/i.test(text)) soc.whatsapp = '212' + ph.phone.slice(1); else soc.phone = ph.phone; }
  if (Object.keys(soc).length && !has(sp, 'price') && !/\bstock\b/i.test(text)) return { t: 'design', ops: [{ op: 'social', f: soc }] };
  // logo
  if (has(sp, 'logo')) { const e = EMOJI_RE.exec(text); if (e) return { t: 'design', ops: [{ op: 'logoEmoji', emoji: e[0] }] }; }
  // look & feel (several can be combined in one sentence)
  const ops = []; const colors = colorTokens(tk, text); const lookish = has(sp, 'look') || short; const noCatalog = !has(sp, 'price') && !/\d{3,}/.test(text);
  if (has(sp, 'darkMode')) ops.push({ op: 'mode', v: 'dark' }); else if (has(sp, 'lightMode')) ops.push({ op: 'mode', v: 'light' }); else if (has(sp, 'autoMode')) ops.push({ op: 'mode', v: 'auto' });
  if (has(sp, 'serif')) ops.push({ op: 'font', v: 'serif' }); else if (has(sp, 'rounded') && has(sp, 'fontWord')) ops.push({ op: 'font', v: 'rounded' }); else if (has(sp, 'mono')) ops.push({ op: 'font', v: 'mono' }); else if (has(sp, 'modernFont')) ops.push({ op: 'font', v: 'modern' });
  if (has(sp, 'roundCorners')) ops.push({ op: 'radius', v: 26 }); else if (has(sp, 'sharpCorners')) ops.push({ op: 'radius', v: 2 });
  if (has(sp, 'columnsWord')) { const n = numbers(text).find(x => x >= 2 && x <= 4); if (n) ops.push({ op: 'columns', v: n }); }
  const pk = presetOf(sp);
  if (pk && lookish && noCatalog) ops.unshift({ op: 'preset', v: pk });
  if ((colors.names.length || colors.hexes.length) && noCatalog && (has(sp, 'look') || pk)) {
    const hexes = [...colors.hexes.map(x => x.toLowerCase()), ...colors.names.map(colorHex)];
    ops.push({ op: 'colors', a: hexes[0], b: hexes[1] || '', legacy: !pk && hexes.length === 1 });
  }
  if (/\b(reset|default|original|par defaut|asli)\b/i.test(text) && has(sp, 'look')) ops.push({ op: 'preset', v: 'cendoor' });
  if (ops.length) return { t: 'design', ops };
  // catalogue
  const nums = numbers(text);
  if (img && (has(sp, 'addProduct') || has(sp, 'thisIs') || (nums.length && !has(sp, 'photoWord')))) return { t: 'add', d: nlp.parseProductVoice(after(text, [...W.addProduct, ...W.thisIs]) || text), image: img };
  if (has(sp, 'addProduct')) return { t: 'add', d: nlp.parseProductVoice(after(text, W.addProduct) || ''), image: img };
  if (has(sp, 'archive')) return { t: 'archive', q: after(text, W.archive) || text };
  if (has(sp, 'price') && nums.length) return { t: 'price', q: text.replace(/\d+(?:[.,]\d+)?\s*(?:dh|dhs|mad|dirhams?|درهم)?/gi, ' '), price: nums[nums.length - 1] };
  if (has(sp, 'stock') && nums.length) { const set = nlp.hasAny(sp, ['set', 'mets', 'dir', 'khelli', 'to', 'a', 'à', 'ل', 'خلي']) && !nlp.hasAny(sp, ['add', 'ajoute', 'zid', 'زيد', 'plus']); return { t: 'stock', q: text.replace(/\d+(?:[.,]\d+)?/g, ' '), mode: set ? 'set' : 'add', n: nums[nums.length - 1] }; }
  if (img && has(sp, 'photoWord')) return { t: 'image', target: 'product', q: text };
  if (img) return { t: 'ask_image' };
  return { t: 'unknown' };
}

const rr = lang => R[lang] || R.en;
function colorLabel(r, hex) { return (r.colorNames && r.colorNames[String(hex).toLowerCase()]) || hex; }

function applyOp(shopId, op, r, lang, out) {
  const note = msg => { out.reply += (out.reply ? ' ' : '') + msg; out.changes.push({ label: msg }); out.changed = true; };
  const L = lang === 'dar' ? 'fr' : lang; const shop = shopRow(shopId);
  const edit = (label, fn) => editDesign(shopId, label, fn);
  switch (op.op) {
    case 'preset': edit('preset ' + op.v, d => D.withPreset(d, op.v)); note(r.preset(r.presetNames[op.v] || op.v)); break;
    case 'mode': edit('mode ' + op.v, d => ({ ...d, mode: op.v })); note(r.mode(op.v)); break;
    case 'font': edit('font ' + op.v, d => ({ ...d, font: op.v })); note(r.font(r.fontNames[op.v])); break;
    case 'radius': edit('corners', d => ({ ...d, radius: op.v })); note(r.radius(op.v)); break;
    case 'columns': edit('columns', d => ({ ...d, columns: op.v })); note(r.columns(op.v)); break;
    case 'colors': edit('colours', d => ({ ...d, accent: op.a, accent2: op.b || d.accent2 })); note(op.legacy ? r.theme(colorLabel(r, op.a)) : r.colors(colorLabel(r, op.a), op.b ? colorLabel(r, op.b) : '')); break;
    case 'hero': edit('hero', d => ({ ...d, hero: { ...d.hero, ...op.f } })); note(r.hero()); break;
    case 'logoEmoji': edit('logo', d => ({ ...d, logo: { ...d.logo, emoji: op.emoji, image: '' } })); note(r.logoEmoji(op.emoji)); break;
    case 'social': edit('social', d => ({ ...d, social: { ...d.social, ...op.f } })); note(r.social(Object.keys(op.f).map(k => k[0].toUpperCase() + k.slice(1)).join(', '))); break;
    case 'sectionOn': {
      const defaults = { about: () => ({ title: D.PACK_TEXT.aboutTitle[L] || 'About', body: op.body || D.PACK_TEXT.about[L](shop.name) }), faq: () => ({ title: D.PACK_TEXT.faqTitle[L], items: D.PACK_TEXT.faq[L] }), contact: () => ({}), reviews: () => ({}), delivery: () => ({}), featured: () => ({}), products: () => ({}) };
      edit('section ' + op.type, d => { const cur = D.section(d, op.type); const base = (defaults[op.type] || (() => ({})))(); const fields = { enabled: true }; if (op.type === 'about') { fields.title = (cur && cur.title) || base.title; fields.body = op.body || (cur && cur.body) || base.body; } if (op.type === 'faq' && !(cur && cur.items.length)) { fields.title = (cur && cur.title) || base.title; fields.items = base.items; } return D.upsertSection(d, op.type, fields); });
      note(r.sectionOn(r.sectionNames[op.type])); break;
    }
    case 'sectionOff': edit('hide ' + op.type, d => { const s = D.section(d, op.type); if (s) s.enabled = false; return d; }); note(r.sectionOff(r.sectionNames[op.type])); break;
    case 'move': edit('move ' + op.type, d => D.moveSection(d, op.type, op.where, op.other)); note(r.sectionMoved(r.sectionNames[op.type])); break;
    case 'faqAdd': edit('faq', d => { const s = D.section(d, 'faq'); const items = [...((s && s.items) || []), { q: op.q, a: op.a }]; return D.upsertSection(d, 'faq', { title: (s && s.title) || D.PACK_TEXT.faqTitle[L], items, enabled: true }); }); note(r.faqAdded(op.q)); break;
    case 'testimonial': edit('testimonial', d => { const s = D.section(d, 'reviews'); const items = [...((s && s.items) || []), { text: op.text, name: op.name }]; return D.upsertSection(d, 'reviews', { items, enabled: true }); }); note(r.testimonial()); break;
    default: break;
  }
}

function runRules(shopId, text, uiLang, ctx = {}) {
  const shop = shopRow(shopId);
  const state = ctx.state && typeof ctx.state === 'object' ? { ...ctx.state } : {};
  const lang0 = nlp.detectLang(text, state.lang || (uiLang === 'ar' ? 'ar' : uiLang) || shop.lang);
  const lang = state.wizard && state.lang ? state.lang : lang0;
  const r = rr(lang);
  const out = { lang, reply: '', changes: [], changed: false, chips: [], state };
  const sp = nlp.spaced(text), tk = nlp.tokens(text);
  const fail = e => (e.error === 'not_found' ? r.notFound() : e.error === 'ambiguous' ? r.ambiguous(e.options) : e.error === 'which_variant' ? r.which(e) : e.error === 'need_price' ? r.needPrice(e.name) : r.invalid(e.field || ''));
  const opts = wizardOptions(r);

  // --- guided "build my shop" ---
  const wizardAsk = step => { out.state.wizard = { ...(out.state.wizard || {}), step }; out.state.lang = lang; out.reply = step === 'cat' ? r.wizCat() : step === 'style' ? r.wizStyle() : step === 'color' ? r.wizColor() : r.wizSamples(); out.chips = step === 'cat' ? opts.cat.map(l => l[lang === 'dar' ? 'fr' : lang]) : step === 'style' ? opts.style : step === 'color' ? opts.color : [r.yes, r.no]; };
  if (state.wizard && state.wizard.step) {
    if (nlp.hasAny(sp, W.cancel) && tk.length <= 3) { out.state = {}; out.reply = r.wizCancel(); return out; }
    const w = { ...state.wizard }; const ans = wizardAnswer(w.step, text, r, sp, tk);
    if (ans === null || ans === undefined) { out.state.wizard = w; wizardAsk(w.step); out.reply = r.wizRetry(); return out; }
    if (w.step === 'cat') { w.cat = ans; w.step = 'style'; }
    else if (w.step === 'style') { w.style = ans; w.step = 'color'; }
    else if (w.step === 'color') { w.color = ans === 'skip' ? '' : ans; w.step = 'samples'; }
    else if (w.step === 'samples') { w.samples = !!ans; const res = applyWizard(shopId, w, lang); out.state = {}; out.reply = r.wizDone({ style: r.presetNames[w.style] || w.style, cat: D.CATEGORIES[w.cat].label[lang === 'dar' ? 'fr' : lang], n: res.samples }); out.changed = true; out.changes.push({ label: out.reply }); return out; }
    out.state.wizard = w; wizardAsk(w.step); return out;
  }

  const it = interpret(text, { imageUrl: ctx.imageUrl });
  switch (it.t) {
    case 'wizard_start': out.state.wizard = {}; wizardAsk('cat'); break;
    case 'undo': { const l = undoLast(shopId); out.reply = l ? r.undone(l.label) : r.nothingUndo(); out.changed = !!l; break; }
    case 'help': out.reply = r.help(); out.chips = r.chips; break;
    case 'stats': { const s = stats(shopId, it.what); out.reply = s.today ? r.today(s.today) : s.month ? r.month(s.month) : s.low ? r.low(s.low) : s.pending !== undefined ? r.pending(s) : r.top(s.top); break; }
    case 'shop': {
      const res = setShop(shopId, it.fields, it.key + ': ' + JSON.stringify(Object.values(it.fields)[0]).slice(0, 60));
      if (!res.ok) { out.reply = fail(res); break; }
      const v = it.value !== undefined ? it.value : Object.values(it.fields)[0];
      out.reply = it.key === 'lang' ? r.lang(v) : r[it.key](v); out.changed = true; out.changes.push({ label: out.reply }); break;
    }
    case 'design': for (const op of it.ops) applyOp(shopId, op, r, lang, out); break;
    case 'image': {
      if (it.target === 'logo') { editDesign(shopId, 'logo', d => ({ ...d, logo: { ...d.logo, image: ctx.imageUrl, emoji: '' } })); out.reply = r.logoImage(); out.changed = true; out.changes.push({ label: out.reply }); }
      else if (it.target === 'hero') { editDesign(shopId, 'hero image', d => ({ ...d, hero: { ...d.hero, image: ctx.imageUrl, style: d.hero.style === 'minimal' ? 'split' : d.hero.style } })); out.reply = r.heroImage(); out.changed = true; out.changes.push({ label: out.reply }); }
      else { const res = setProductImage(shopId, it.q.replace(/\b(photo|picture|image|pic)\b/gi, ' '), ctx.imageUrl); out.reply = res.ok ? r.imageProduct(res.product) : (res.error === 'not_found' ? r.askImage() : fail(res)); out.changed = !!res.ok; if (res.ok) out.changes.push({ label: out.reply }); }
      break;
    }
    case 'ask_image': out.reply = r.askImage(); break;
    case 'price': { const res = setPrice(shopId, it.q, it.price); out.reply = res.ok ? r.price(res) : fail(res); out.changed = !!res.ok; if (res.ok) out.changes.push({ label: out.reply }); break; }
    case 'stock': { const res = setStock(shopId, it.q, it.mode, it.n); out.reply = res.ok ? r.stock(res) : fail(res); out.changed = !!res.ok; if (res.ok) out.changes.push({ label: out.reply }); break; }
    case 'add': { const res = addProduct(shopId, it.d, it.image); out.reply = res.ok ? r.added(res) : fail(res); out.changed = !!res.ok; if (res.ok) out.changes.push({ label: out.reply }); break; }
    case 'archive': { const res = archiveProduct(shopId, it.q); out.reply = res.ok ? r.archived(res) : fail(res); out.changed = !!res.ok; if (res.ok) out.changes.push({ label: out.reply }); break; }
    default: out.reply = r.unknown(); out.chips = r.chips;
  }
  return out;
}

// ---------- optional Claude tool-calling mode --------------------------------
const MODEL = process.env.CENDOOR_MODEL || 'claude-sonnet-5-5';
const llmEnabled = () => !!process.env.ANTHROPIC_API_KEY;
const TOOLS = [
  { name: 'update_design', description: 'Change the storefront look. Pass only fields to change. preset applies a whole look first (then other fields override). Colours are #rrggbb. hero/logo/social are partial objects.', input_schema: { type: 'object', properties: { preset: { type: 'string', enum: Object.keys(D.PRESETS) }, mode: { type: 'string', enum: ['light', 'dark', 'auto'] }, accent: { type: 'string' }, accent2: { type: 'string' }, bg: { type: 'string' }, font: { type: 'string', enum: D.FONTS }, radius: { type: 'number' }, cards: { type: 'string', enum: D.CARDS }, columns: { type: 'number' }, footer: { type: 'string' }, hero: { type: 'object', properties: { style: { type: 'string', enum: ['banner', 'split', 'minimal'] }, title: { type: 'string' }, subtitle: { type: 'string' }, cta: { type: 'string' }, emoji: { type: 'string' }, align: { type: 'string', enum: ['start', 'center'] } } }, logo: { type: 'object', properties: { emoji: { type: 'string' }, showName: { type: 'boolean' } } }, social: { type: 'object', properties: { instagram: { type: 'string' }, tiktok: { type: 'string' }, whatsapp: { type: 'string' }, phone: { type: 'string' }, email: { type: 'string' } } } } } },
  { name: 'upsert_section', description: 'Add or update a content section of the storefront. For faq pass items [{q,a}]; for reviews testimonials [{text,name}]; for custom a title and body.', input_schema: { type: 'object', properties: { type: { type: 'string', enum: ['featured', 'about', 'reviews', 'faq', 'delivery', 'contact', 'custom'] }, title: { type: 'string' }, body: { type: 'string' }, items: { type: 'array', items: { type: 'object' } }, enabled: { type: 'boolean' } }, required: ['type'] } },
  { name: 'move_section', description: 'Reorder a section.', input_schema: { type: 'object', properties: { type: { type: 'string' }, where: { type: 'string', enum: ['top', 'bottom', 'above', 'below'] }, other: { type: 'string' } }, required: ['type', 'where'] } },
  { name: 'build_shop', description: 'Create a complete starter shop (look, hero, sections, optional sample products) from a category and a style.', input_schema: { type: 'object', properties: { category: { type: 'string', enum: Object.keys(D.CATEGORIES) }, style: { type: 'string', enum: Object.keys(D.PRESETS) }, accent: { type: 'string' }, samples: { type: 'boolean' } }, required: ['category', 'style'] } },
  { name: 'update_storefront', description: 'Change text settings: tagline, announcement bar ("" removes it), chat welcome message, free delivery threshold (MAD, 0 disables), assistant tone, assistant on/off.', input_schema: { type: 'object', properties: { tagline: { type: 'string' }, announcement: { type: 'string' }, welcome_msg: { type: 'string' }, free_shipping_over: { type: 'number' }, tone: { type: 'string', enum: ['friendly', 'formal'] }, ai_enabled: { type: 'boolean' } } } },
  { name: 'set_product_price', description: 'Set the price (MAD) of one product, found by name.', input_schema: { type: 'object', properties: { product: { type: 'string' }, price: { type: 'number' } }, required: ['product', 'price'] } },
  { name: 'set_stock', description: 'Set or add stock of a product (mention colour/size in "product" when it has variants).', input_schema: { type: 'object', properties: { product: { type: 'string' }, mode: { type: 'string', enum: ['set', 'add'] }, quantity: { type: 'number' } }, required: ['product', 'mode', 'quantity'] } },
  { name: 'add_product', description: 'Create a product with one variant. Set use_attached_image true to use the photo the owner just sent.', input_schema: { type: 'object', properties: { name: { type: 'string' }, price: { type: 'number' }, stock: { type: 'number' }, color: { type: 'string' }, size: { type: 'string' }, category: { type: 'string' }, description: { type: 'string' }, emoji: { type: 'string' }, use_attached_image: { type: 'boolean' } }, required: ['name', 'price'] } },
  { name: 'use_attached_image', description: 'Use the photo the owner just sent as the logo, the top banner (hero) image, or the photo of an existing product.', input_schema: { type: 'object', properties: { target: { type: 'string', enum: ['logo', 'hero', 'product'] }, product: { type: 'string' } }, required: ['target'] } },
  { name: 'archive_product', description: 'Hide a product from the shop (reversible).', input_schema: { type: 'object', properties: { product: { type: 'string' } }, required: ['product'] } },
  { name: 'get_business_stats', description: 'Read sales and stock numbers.', input_schema: { type: 'object', properties: { what: { type: 'string', enum: ['today', 'month', 'low', 'pending', 'top'] } }, required: ['what'] } },
  { name: 'undo_last_change', description: 'Undo the most recent change.', input_schema: { type: 'object', properties: {} } },
];
function mergeDesign(d, p) {
  let out = { ...d };
  if (p.preset && D.PRESETS[p.preset]) out = D.withPreset(out, p.preset);
  for (const k of ['mode', 'accent', 'accent2', 'bg', 'font', 'radius', 'cards', 'columns', 'footer']) if (p[k] !== undefined) out[k] = p[k];
  for (const k of ['hero', 'logo', 'social']) if (p[k] && typeof p[k] === 'object') out[k] = { ...out[k], ...p[k] };
  return out;
}
function execTool(shopId, name, i, changes, ctx) {
  const note = (res, label) => { if (res && res.ok) changes.push({ label }); return res; };
  if (name === 'update_design') return note(editDesign(shopId, 'design', d => mergeDesign(d, i)), 'Design updated');
  if (name === 'upsert_section') return note(editDesign(shopId, 'section ' + i.type, d => D.upsertSection(d, i.type, { title: i.title, body: i.body, items: i.items, enabled: i.enabled })), `Section: ${i.type}`);
  if (name === 'move_section') return note(editDesign(shopId, 'move ' + i.type, d => D.moveSection(d, i.type, i.where, i.other)), `Moved: ${i.type}`);
  if (name === 'build_shop') { const r = applyWizard(shopId, { cat: i.category, style: i.style, color: i.accent, samples: !!i.samples }, ctx.lang || 'fr'); return note(r, 'Shop built'); }
  if (name === 'update_storefront') { const f = { ...i }; if ('ai_enabled' in f) f.ai_enabled = f.ai_enabled ? 1 : 0; return note(setShop(shopId, f, 'studio: ' + Object.keys(f).join(', ')), 'Storefront: ' + Object.keys(f).join(', ')); }
  if (name === 'set_product_price') { const r = setPrice(shopId, i.product, Number(i.price)); return note(r, r.ok ? `${r.product}: ${r.old} → ${r.price} MAD` : ''); }
  if (name === 'set_stock') { const r = setStock(shopId, i.product, i.mode, Number(i.quantity)); return note(r, r.ok ? `${r.product} ${r.label}: ${r.old} → ${r.stock}` : ''); }
  if (name === 'add_product') { const r = addProduct(shopId, i, i.use_attached_image ? ctx.imageUrl : ''); return note(r, r.ok ? `+ ${r.name}` : ''); }
  if (name === 'use_attached_image') {
    if (!ctx.imageUrl) return { error: 'no_image_attached' };
    if (i.target === 'logo') return note(editDesign(shopId, 'logo', d => ({ ...d, logo: { ...d.logo, image: ctx.imageUrl, emoji: '' } })), 'Logo updated');
    if (i.target === 'hero') return note(editDesign(shopId, 'hero image', d => ({ ...d, hero: { ...d.hero, image: ctx.imageUrl, style: d.hero.style === 'minimal' ? 'split' : d.hero.style } })), 'Hero image updated');
    const r = setProductImage(shopId, i.product || '', ctx.imageUrl); return note(r, r.ok ? `Photo: ${r.product}` : '');
  }
  if (name === 'archive_product') { const r = archiveProduct(shopId, i.product); return note(r, r.ok ? `- ${r.product}` : ''); }
  if (name === 'get_business_stats') return stats(shopId, i.what);
  if (name === 'undo_last_change') { const l = undoLast(shopId); if (l) changes.push({ label: 'Undo: ' + l.label }); return l ? { ok: true, undone: l.label } : { ok: false }; }
  return { error: 'unknown_tool' };
}
async function runLlm(shopId, text, ctx) {
  const shop = shopRow(shopId); const design = D.getDesign(shopId);
  const cat = orders.loadCatalog(shopId).map(p => `${p.name} (${p.price} MAD): ${p.variants.map(v => `${v.label} x${v.stock}`).join(', ')}`).join('\n');
  const system = `You are Cendoor Studio. The owner of the Moroccan online shop "${shop.name}" (${shop.city || 'Morocco'}) talks to you and you build and change their online shop for them: look and colours, hero banner, sections (About, FAQ, delivery, contact, reviews), social links, logo, products (also from a photo they attach), prices, stock, texts.
Reply in the language the owner writes (Arabic, French, English, or Moroccan Darija in Latin letters). Keep replies to 1-2 short sentences and say what you changed.
Always use the tools to change anything and never claim a change without a successful tool result. If a request is vague ("make it nicer"), pick a sensible preset and tell the owner; if a product is ambiguous or a price is missing, ask one short question. When the owner wants a whole shop built from scratch, ask at most two short questions (what they sell, the style) and call build_shop.
Presets: ${Object.keys(D.PRESETS).filter(k => k !== 'cendoor').join(', ')}. ${ctx.imageUrl ? 'The owner attached a photo to this message: use use_attached_image or add_product with use_attached_image.' : ''}
Current tagline="${shop.tagline}", announcement="${shop.announcement}", free_shipping_over=${shop.free_shipping_over}. Current design: ${JSON.stringify({ ...design, sections: design.sections.map(s => ({ type: s.type, enabled: s.enabled })) })}
Catalogue:\n${cat || '(empty)'}`;
  const msgs = [];
  for (const h of (ctx.history || []).slice(-8)) if (h && h.text && (h.role === 'user' || h.role === 'assistant')) { const last = msgs[msgs.length - 1]; if (last && last.role === h.role) last.content[0].text += '\n' + h.text; else msgs.push({ role: h.role, content: [{ type: 'text', text: String(h.text).slice(0, 600) }] }); }
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  if (msgs.length && msgs[msgs.length - 1].role === 'user') msgs.pop();
  msgs.push({ role: 'user', content: [{ type: 'text', text: text || '(photo)' }] });
  const changes = [];
  for (let turn = 0; turn < 8; turn++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: MODEL, max_tokens: 700, system, tools: TOOLS, messages: msgs }) });
    if (!res.ok) throw new Error(`LLM ${res.status}`);
    const data = await res.json();
    const uses = (data.content || []).filter(b => b.type === 'tool_use');
    if (!uses.length || data.stop_reason !== 'tool_use') return { lang: ctx.lang, reply: (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim() || R.en.unknown(), changes, changed: changes.length > 0, chips: [], state: {} };
    msgs.push({ role: 'assistant', content: data.content });
    msgs.push({ role: 'user', content: uses.map(u => { let o; try { o = execTool(shopId, u.name, u.input || {}, changes, ctx); } catch (e) { o = { error: e.message }; } return { type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(o) }; }) });
  }
  return { lang: ctx.lang, reply: R.en.unknown(), changes, changed: changes.length > 0, chips: [], state: {} };
}

async function handle(shopId, text, { history, lang, state, imageUrl } = {}) {
  text = String(text || '').trim().slice(0, 600);
  if (!text && !imageUrl) return { reply: '', changes: [], changed: false, chips: [], state: state || {} };
  const wizardActive = state && state.wizard && state.wizard.step;
  if (llmEnabled() && !wizardActive) { try { return await runLlm(shopId, text, { history, lang: lang || 'en', imageUrl }); } catch (e) { console.error('[studio llm] falling back to rules:', e.message); } }
  return runRules(shopId, text, lang, { state, imageUrl });
}

module.exports = { handle, undoLast, recentLog, interpret, runRules, llmEnabled, chips: lang => rr(lang).chips };
