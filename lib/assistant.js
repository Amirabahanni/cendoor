'use strict';
// Cendoor Studio: the seller talks to their shop ("make it green", "lower the caftan to 600") and it changes.
// A rule-based interpreter (Darija / French / English / Arabic) always works; with ANTHROPIC_API_KEY a Claude
// tool-calling loop handles free-form requests using the same safe actions. Every change is logged and undoable.
const { get, all, run, tx } = require('./db');
const nlp = require('./nlp');
const orders = require('./orders');
const analytics = require('./analytics');

// ---------- safe actions ----------------------------------------------------
const FIELDS = ['tagline', 'announcement', 'theme_color', 'welcome_msg', 'free_shipping_over', 'tone', 'lang', 'ai_enabled', 'name'];
function clean(k, v) {
  switch (k) {
    case 'theme_color': return v === '' || /^#[0-9a-fA-F]{6}$/.test(v) ? String(v).toLowerCase() : null;
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
function log(shopId, kind, label, before) { run('INSERT INTO assistant_log (shop_id, kind, label, before) VALUES (?,?,?,?)', shopId, kind, label, JSON.stringify(before)); }

function setShop(shopId, fields, label) {
  const shop = get('SELECT * FROM shops WHERE id=?', shopId);
  const before = {}, sets = [], vals = [];
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
  const p = f.product;
  let v;
  if (p.variants.length === 1) v = p.variants[0];
  else { const pv = nlp.pickVariant(query, p); if (pv.narrowed && pv.candidates.length === 1) v = pv.candidates[0]; else return { error: 'which_variant', product: p.name, options: p.variants.map(x => x.label) }; }
  const next = Math.max(0, Math.floor(mode === 'add' ? v.stock + n : n));
  run('UPDATE variants SET stock=? WHERE id=?', next, v.id);
  log(shopId, 'stock', `${p.name} ${v.label}: ${v.stock} → ${next}`, { rows: [{ id: v.id, stock: v.stock }] });
  return { ok: true, product: p.name, label: v.label, old: v.stock, stock: next };
}
function addProduct(shopId, d) {
  const name = String(d.name || '').trim().slice(0, 80), price = Number(d.price);
  if (!name) return { error: 'invalid', field: 'name' };
  if (!(price > 0)) return { error: 'need_price', name };
  const id = tx(() => {
    const r = run('INSERT INTO products (shop_id, name, description, price, category, emoji, keywords) VALUES (?,?,?,?,?,?,?)', shopId, name, String(d.description || '').slice(0, 500), price, String(d.category || '').slice(0, 40), '📦', String(d.keywords || '').slice(0, 200));
    const pid = Number(r.lastInsertRowid);
    const color = String(d.color || '').slice(0, 20), size = String(d.size || '').slice(0, 12);
    run('INSERT INTO variants (product_id, label, color, size, stock) VALUES (?,?,?,?,?)', pid, [color, size].filter(Boolean).join(' / ') || 'Standard', color, size, Math.max(0, Math.floor(Number(d.stock) || 0)));
    return pid;
  });
  log(shopId, 'add_product', name, { id });
  return { ok: true, name, price, id };
}
function archiveProduct(shopId, query) {
  const f = findProduct(shopId, query); if (!f.product) return f;
  run('UPDATE products SET active=0 WHERE id=? AND shop_id=?', f.product.id, shopId);
  log(shopId, 'archive', f.product.name, { id: f.product.id });
  return { ok: true, product: f.product.name };
}
function undoLast(shopId) {
  const l = get('SELECT * FROM assistant_log WHERE shop_id=? AND undone=0 ORDER BY id DESC LIMIT 1', shopId);
  if (!l) return null;
  const b = JSON.parse(l.before || '{}');
  tx(() => {
    if (l.kind === 'shop') { const keys = Object.keys(b).filter(k => FIELDS.includes(k)); if (keys.length) run(`UPDATE shops SET ${keys.map(k => k + '=?').join(',')} WHERE id=?`, ...keys.map(k => b[k]), shopId); }
    if (l.kind === 'price') run('UPDATE products SET price=? WHERE id=? AND shop_id=?', b.price, b.id, shopId);
    if (l.kind === 'stock') for (const r of b.rows) run('UPDATE variants SET stock=? WHERE id=? AND product_id IN (SELECT id FROM products WHERE shop_id=?)', r.stock, r.id, shopId);
    if (l.kind === 'add_product') run('UPDATE products SET active=0 WHERE id=? AND shop_id=?', b.id, shopId);
    if (l.kind === 'archive') run('UPDATE products SET active=1 WHERE id=? AND shop_id=?', b.id, shopId);
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

// ---------- replies in four registers ---------------------------------------
const M = n => `${Math.round(n)} MAD`;
const R = {
  en: {
    tagline: v => `Tagline updated to “${v}”.`, announce: v => `Announcement bar is live: “${v}”.`, announceOff: () => 'Announcement bar removed.', welcome: v => `Chat welcome message updated: “${v}”.`,
    theme: n => `Your shop is now ${n}.`, themeBack: () => 'Shop colour reset to the Cendoor default.', freeShip: n => `Free delivery now starts at ${M(n)}.`, freeShipOff: () => 'Free delivery turned off.', tone: v => `The assistant now speaks in a ${v} tone.`,
    aiOn: () => 'The AI will answer customers again.', aiOff: () => 'The AI is paused: customers will see your shop but chat replies are off.', lang: v => `Default language set to ${v}.`, price: r => `${r.product}: ${r.old} → ${r.price} MAD.`,
    stock: r => `${r.product}${r.label !== 'Standard' ? ' (' + r.label + ')' : ''}: stock ${r.old} → ${r.stock}.`, added: r => `Added “${r.name}” at ${r.price} MAD. Open Products to add a photo.`, archived: r => `“${r.product}” is hidden from your shop.`,
    undone: l => `Undone: ${l}`, nothingUndo: () => 'There is nothing to undo.', notFound: () => 'I could not find that product. Try its name as it appears in your catalogue.', ambiguous: o => `Which one? ${o.join(', ')}`,
    which: r => `${r.product} has several options (${r.options.join(', ')}). Which one?`, needPrice: n => `What price for “${n}”? Say it like: add product ${n} 200 dirham 10 pieces.`, invalid: f => `That value is not valid for ${f}.`,
    today: a => `Today: ${M(a.sales)} from ${a.orders} order(s).`, month: a => `This month: ${M(a.sales)} from ${a.orders} order(s).`, low: l => (l.length ? `Running low: ${l.join('; ')}.` : 'Nothing is running low.'), pending: r => `${r.pending} order(s) waiting, ${r.attention} conversation(s) need you.`, top: l => (l.length ? `Top products: ${l.join(', ')}.` : 'No sales yet.'),
    unknown: () => 'I did not catch that. I can change your tagline, colour, announcement and prices, update stock, add products, and answer questions about sales. Try one of the suggestions.', help: () => 'Tell me what to change on your shop, in your own words: tagline, colour, announcement bar, welcome message, prices, stock, free delivery, new products. I can also answer “how much did I sell today?”. Say “undo” to revert the last change.',
    chips: ['Make my shop green', 'Announce: free delivery this weekend', 'Set free delivery above 500', 'How much did I sell today?', 'Which products are low on stock?', 'Add product: abaya noire 350 dirham 12 pieces'], colorNames: { '#1f5fbf': 'blue', '#c8382e': 'red', '#1e8e5a': 'green', '#d6457f': 'pink', '#6b4bb5': 'purple', '#d9751a': 'orange', '#26302f': 'black', '#9c7a1e': 'gold', '#7a4b2a': 'brown', '#0f5c5c': 'teal', '#4d5b5c': 'grey' },
  },
  fr: {
    tagline: v => `Slogan mis à jour : « ${v} ».`, announce: v => `Bandeau d'annonce en ligne : « ${v} ».`, announceOff: () => "Bandeau d'annonce retiré.", welcome: v => `Message d'accueil du chat mis à jour : « ${v} ».`,
    theme: n => `Votre boutique est maintenant ${n}.`, themeBack: () => 'Couleur remise par défaut.', freeShip: n => `La livraison est gratuite dès ${M(n)}.`, freeShipOff: () => 'Livraison gratuite désactivée.', tone: v => `L'assistant parle maintenant sur un ton ${v}.`,
    aiOn: () => "L'IA répond de nouveau aux clients.", aiOff: () => "L'IA est en pause : les clients voient la boutique mais le chat ne répond plus.", lang: v => `Langue par défaut : ${v}.`, price: r => `${r.product} : ${r.old} → ${r.price} MAD.`,
    stock: r => `${r.product}${r.label !== 'Standard' ? ' (' + r.label + ')' : ''} : stock ${r.old} → ${r.stock}.`, added: r => `« ${r.name} » ajouté à ${r.price} MAD. Ouvrez Produits pour ajouter une photo.`, archived: r => `« ${r.product} » est masqué de votre boutique.`,
    undone: l => `Annulé : ${l}`, nothingUndo: () => 'Rien à annuler.', notFound: () => "Je n'ai pas trouvé ce produit. Essayez son nom tel qu'il apparaît dans votre catalogue.", ambiguous: o => `Lequel ? ${o.join(', ')}`,
    which: r => `${r.product} existe en plusieurs versions (${r.options.join(', ')}). Laquelle ?`, needPrice: n => `Quel prix pour « ${n} » ? Dites par exemple : ajoute produit ${n} 200 dirham 10 pièces.`, invalid: f => `Cette valeur n'est pas valide pour ${f}.`,
    today: a => `Aujourd'hui : ${M(a.sales)} pour ${a.orders} commande(s).`, month: a => `Ce mois-ci : ${M(a.sales)} pour ${a.orders} commande(s).`, low: l => (l.length ? `Bientôt épuisés : ${l.join(' ; ')}.` : 'Rien ne manque.'), pending: r => `${r.pending} commande(s) en attente, ${r.attention} conversation(s) à traiter.`, top: l => (l.length ? `Meilleurs produits : ${l.join(', ')}.` : 'Pas encore de ventes.'),
    unknown: () => "Je n'ai pas compris. Je peux changer votre slogan, la couleur, l'annonce et les prix, mettre à jour le stock, ajouter des produits et répondre sur vos ventes. Essayez une suggestion.", help: () => "Dites-moi ce qu'il faut changer sur votre boutique, avec vos mots : slogan, couleur, bandeau d'annonce, message d'accueil, prix, stock, livraison gratuite, nouveaux produits. Je réponds aussi à « combien ai-je vendu aujourd'hui ? ». Dites « annuler » pour revenir en arrière.",
    chips: ['Rends ma boutique verte', 'Annonce : livraison gratuite ce week-end', 'Livraison gratuite à partir de 500', "Combien j'ai vendu aujourd'hui ?", 'Quels produits sont bientôt épuisés ?', 'Ajoute produit : abaya noire 350 dirham 12 pièces'], colorNames: { '#1f5fbf': 'bleue', '#c8382e': 'rouge', '#1e8e5a': 'verte', '#d6457f': 'rose', '#6b4bb5': 'violette', '#d9751a': 'orange', '#26302f': 'noire', '#9c7a1e': 'dorée', '#7a4b2a': 'marron', '#0f5c5c': 'turquoise', '#4d5b5c': 'grise' },
  },
  dar: {
    tagline: v => `S-sh3ar tbddl: “${v}”.`, announce: v => `L-i3lan tlq f l-boutique: “${v}”.`, announceOff: () => 'L-i3lan t7yed.', welcome: v => `Risalat t-tarhib tbddlat: “${v}”.`,
    theme: n => `L-boutique dyalek wllat ${n}.`, themeBack: () => 'L-loun rje3 l-asli.', freeShip: n => `T-tawsil mjani mn ${M(n)}.`, freeShipOff: () => 'T-tawsil l-mjani t7bes.', tone: v => `L-mosa3ed daba kayhder b nabra ${v}.`,
    aiOn: () => 'L-IA 3awdat kat-jawb z-zbanat.', aiOff: () => 'L-IA wa9fa: z-zbanat ghadi ychofo l-boutique walakin ma-ghadich ytjaweb f chat.', lang: v => `L-lougha l-asliya: ${v}.`, price: r => `${r.product}: ${r.old} → ${r.price} DH.`,
    stock: r => `${r.product}${r.label !== 'Standard' ? ' (' + r.label + ')' : ''}: stock ${r.old} → ${r.stock}.`, added: r => `Zdt “${r.name}” b ${r.price} DH. Dkhol l Produits bach tzid tsswira.`, archived: r => `“${r.product}” tkhba mn l-boutique.`,
    undone: l => `Rje3t: ${l}`, nothingUndo: () => 'Walo bach nrje3.', notFound: () => 'Ma-lqitch had l-produit. Kteb smiyto kima kayn f l-catalogue.', ambiguous: o => `Achmen wa7ed? ${o.join(', ')}`,
    which: r => `${r.product} 3ndo bzaf d l-khyarat (${r.options.join(', ')}). Achmen wa7ed?`, needPrice: n => `Ch7al taman dyal “${n}”? Goul mital: zid produit ${n} 200 dirham 10 pieces.`, invalid: f => `Had l-9ima machi s7i7a f ${f}.`,
    today: a => `Lyoum: ${M(a.sales)} f ${a.orders} commande.`, month: a => `Had ch-chhar: ${M(a.sales)} f ${a.orders} commande.`, low: l => (l.length ? `Kayb9aw 9lal: ${l.join('; ')}.` : 'Walo ma-9all.'), pending: r => `${r.pending} commande kat-tsna, ${r.attention} conversation kat-7taj-lek.`, top: l => (l.length ? `Ahsen l-produits: ${l.join(', ')}.` : 'Mazal ma-kayn 7ta bi3.'),
    unknown: () => 'Ma-fhmtch mzyan. N9der nbddl s-sh3ar, l-loun, l-i3lan u t-tamanat, nzid stock, nzid produits u njawbek 3la l-mabi3at. Jreb chi iqtirah.', help: () => 'Goul-li achno bghiti tbddl f l-boutique b klamek: s-sh3ar, l-loun, l-i3lan, risalat t-tarhib, t-tamanat, stock, tawsil mjani, produits jdad. Jaweb 7ta 3la “chhal bi3t lyoum?”. Goul “rje3” bach tbtl akhir t-tghyir.',
    chips: ['Khelli l-boutique khdra', 'I3lan: tawsil mjani had l-weekend', 'Tawsil mjani fo9 500', 'Chhal bi3t lyoum?', 'Achmen produits kay-sali?', 'Zid produit: abaya k7la 350 dirham 12 pieces'], colorNames: { '#1f5fbf': 'zer9a', '#c8382e': '7mra', '#1e8e5a': 'khdra', '#d6457f': 'wardiya', '#6b4bb5': 'banafsajiya', '#d9751a': 'orange', '#26302f': 'k7la', '#9c7a1e': 'dhabiya', '#7a4b2a': 'qhwiya', '#0f5c5c': 'turquoise', '#4d5b5c': 'ramadiya' },
  },
  ar: {
    tagline: v => `تم تحديث الشعار: «${v}».`, announce: v => `شريط الإعلان يعمل الآن: «${v}».`, announceOff: () => 'تمت إزالة شريط الإعلان.', welcome: v => `تم تحديث رسالة ترحيب المحادثة: «${v}».`,
    theme: n => `أصبح متجرك ${n}.`, themeBack: () => 'أُعيد لون المتجر إلى الافتراضي.', freeShip: n => `التوصيل مجاني ابتداء من ${M(n)}.`, freeShipOff: () => 'تم إيقاف التوصيل المجاني.', tone: v => `المساعد يتكلم الآن بأسلوب ${v}.`,
    aiOn: () => 'الذكاء الاصطناعي سيجيب الزبناء من جديد.', aiOff: () => 'الذكاء الاصطناعي متوقف: سيرى الزبناء متجرك لكن ردود المحادثة متوقفة.', lang: v => `اللغة الافتراضية: ${v}.`, price: r => `${r.product}: ${r.old} ← ${r.price} درهم.`,
    stock: r => `${r.product}${r.label !== 'Standard' ? ' (' + r.label + ')' : ''}: المخزون ${r.old} ← ${r.stock}.`, added: r => `تمت إضافة «${r.name}» بثمن ${r.price} درهم. افتح المنتجات لإضافة صورة.`, archived: r => `«${r.product}» مخفي من متجرك.`,
    undone: l => `تم التراجع: ${l}`, nothingUndo: () => 'لا شيء للتراجع عنه.', notFound: () => 'لم أجد هذا المنتج. جرّب اسمه كما يظهر في الكتالوج.', ambiguous: o => `أي واحد؟ ${o.join('، ')}`,
    which: r => `${r.product} له عدة خيارات (${r.options.join('، ')}). أي واحد؟`, needPrice: n => `ما ثمن «${n}»؟ قل مثلا: زيد منتج ${n} 200 درهم 10 قطع.`, invalid: f => `هذه القيمة غير صالحة لـ ${f}.`,
    today: a => `اليوم: ${M(a.sales)} من ${a.orders} طلب.`, month: a => `هذا الشهر: ${M(a.sales)} من ${a.orders} طلب.`, low: l => (l.length ? `على وشك النفاد: ${l.join('؛ ')}.` : 'لا شيء على وشك النفاد.'), pending: r => `${r.pending} طلب في الانتظار، و${r.attention} محادثة تحتاجك.`, top: l => (l.length ? `أفضل المنتجات: ${l.join('، ')}.` : 'لا مبيعات بعد.'),
    unknown: () => 'لم أفهم جيدا. أستطيع تغيير الشعار واللون والإعلان والأثمنة، وتحديث المخزون وإضافة منتجات والإجابة عن المبيعات. جرّب أحد الاقتراحات.', help: () => 'قل لي ماذا تريد أن تغيّر في متجرك بكلامك: الشعار، اللون، شريط الإعلان، رسالة الترحيب، الأثمنة، المخزون، التوصيل المجاني، منتجات جديدة. وأجيب أيضا عن «شحال بعت اليوم؟». قل «تراجع» لإلغاء آخر تغيير.',
    chips: ['خلي متجري أخضر', 'إعلان: توصيل مجاني هذا الأسبوع', 'توصيل مجاني فوق 500', 'شحال بعت اليوم؟', 'أشمن منتجات غادي تسالي؟', 'زيد منتج: عباية كحلة 350 درهم 12 قطعة'], colorNames: { '#1f5fbf': 'زرقاء', '#c8382e': 'حمراء', '#1e8e5a': 'خضراء', '#d6457f': 'وردية', '#6b4bb5': 'بنفسجية', '#d9751a': 'برتقالية', '#26302f': 'سوداء', '#9c7a1e': 'ذهبية', '#7a4b2a': 'بنية', '#0f5c5c': 'تركوازية', '#4d5b5c': 'رمادية' },
  },
};

// ---------- rule-based interpreter -------------------------------------------
const THEME = { Blue: '#1f5fbf', Red: '#c8382e', Green: '#1e8e5a', Pink: '#d6457f', Purple: '#6b4bb5', Orange: '#d9751a', Black: '#26302f', Gold: '#9c7a1e', Brown: '#7a4b2a', Gray: '#4d5b5c', Yellow: '#9c7a1e', Beige: '#7a4b2a', Silver: '#4d5b5c', White: '#0f5c5c' };
const W = {
  undo: ['undo', 'annuler', 'annule', 'cancel that', 'revert', 'rj3', 'rje3', 'تراجع', 'رجع'],
  help: ['help', 'aide', 'what can you do', '3awni', 'مساعدة', 'اش تقدر'],
  tagline: ['tagline', 'slogan', 'accroche', 'headline', 'sh3ar', 'shi3ar', 'شعار'],
  announce: ['announce', 'announcement', 'banner', 'annonce', 'bandeau', 'i3lan', 'ilan', 'إعلان', 'اعلان'],
  welcome: ['welcome message', 'welcome text', 'message de bienvenue', 'message daccueil', 'risalat tarhib', 'رسالة الترحيب', 'رسالة ترحيب'],
  free: ['free delivery', 'free shipping', 'livraison gratuite', 'tawsil mjani', 'twsil mjani', 'توصيل مجاني'],
  off: ['remove', 'clear', 'delete', 'disable', 'turn off', 'no more', 'supprime', 'retire', 'enleve', 'desactive', '7yed', 'hyed', 'weqef', 'حيد', 'احذف', 'ألغ', 'الغ'],
  tone: ['tone', 'ton', 'nabra', 'style', 'أسلوب', 'نبرة'],
  formal: ['formal', 'formel', 'rasmi', 'رسمي', 'professionnel', 'professional'],
  friendly: ['friendly', 'amical', 'chaleureux', 'wadi', 'ودي', 'casual'],
  ai: ['the ai', 'l ia', 'lia', 'assistant', 'chatbot', 'bot', 'الذكاء الاصطناعي'],
  pause: ['pause', 'turn off', 'disable', 'stop', 'desactive', 'weqef', 'وقف', 'أوقف'],
  resume: ['resume', 'turn on', 'enable', 'activate', 'active', 'reactive', 'chghel', 'شغل', 'فعل'],
  language: ['default language', 'langue par defaut', 'lougha', 'اللغة الافتراضية'],
  add: ['add product', 'new product', 'ajoute produit', 'ajoute un produit', 'ajouter un produit', 'nouveau produit', 'zid produit', 'zid chi produit', 'زيد منتج', 'إضافة منتج', 'اضافة منتج'],
  archive: ['remove product', 'delete product', 'hide product', 'archive', 'supprime le produit', 'retire le produit', 'cache le produit', '7yed produit', 'حيد المنتج', 'احذف المنتج'],
  price: ['price', 'prix', 'taman', 'tarif', 'ثمن', 'سعر', 'الثمن', 'السعر'],
  stock: ['stock', 'restock', 'quantite', 'quantity', 'pieces', 'pcs', 'zid', 'ajoute', 'add', 'mets', 'set', 'kmiya', 'كمية', 'المخزون', 'زيد'],
  themeWords: ['theme', 'theme', 'couleur', 'color', 'colour', 'loun', 'look', 'design', 'apparence', 'لون', 'shop', 'store', 'boutique', 'site', 'website', 'متجر', 'متجري', 'متجرك', 'المحل', 'محلي', 'موقعي'],
  sold: ['sold', 'sales', 'sell', 'vendu', 'vendre', 'ventes', 'chiffre', 'bi3t', 'bi3', 'mabi3at', 'revenue', 'مبيعات', 'بعت'],
  lowStock: ['low on stock', 'low stock', 'running low', 'stock bas', 'bientot epuise', 'epuise', 'kay sali', 'kaysali', 'gaysali', 'غادي تسالي', 'تسالي', 'كيسالي'],
  pending: ['pending', 'to approve', 'waiting', 'en attente', 'a valider', 'kat tsna', 'كتسنى'],
  top: ['best seller', 'best selling', 'top product', 'meilleur', 'ahsen', 'الأكثر مبيعا'],
};
const has = (sp, key) => nlp.hasAny(sp, W[key]);
function after(text, words) {
  const low = text.toLowerCase(); let best = -1, len = 0;
  for (const w of words) { const i = low.indexOf(w.toLowerCase()); if (i >= 0 && (best < 0 || i < best)) { best = i; len = w.length; } }
  if (best < 0) return null;
  let rest = text.slice(best + len).trim().replace(/^(?:to|into|en|est|is|as|comme|par|b|:|=|-|–|ب)\s+/i, '').replace(/^[:=\-–]\s*/, '').trim();
  return rest.replace(/^["“«]+|["”»]+$/g, '').trim();
}
const quoted = t => { const m = /["“«]([^"”»“«]{2,300})["”»]/.exec(t); return m ? m[1].trim() : null; };
const numbers = t => (nlp.norm(t).match(/\d+(?:[.,]\d+)?/g) || []).map(x => Number(x.replace(',', '.')));

function interpret(text, shopId) {
  const sp = nlp.spaced(text); const tk = nlp.tokens(text); const short = tk.length <= 4;
  const off = has(sp, 'off');
  if (short && has(sp, 'undo')) return { t: 'undo' };
  if (short && has(sp, 'help')) return { t: 'help' };
  // questions about the business
  if (has(sp, 'lowStock')) return { t: 'stats', what: 'low' };
  if (has(sp, 'top')) return { t: 'stats', what: 'top' };
  if (has(sp, 'pending')) return { t: 'stats', what: 'pending' };
  if (has(sp, 'sold') && !has(sp, 'price') && !/\d{2,}/.test(text)) return { t: 'stats', what: /month|mois|chhar|شهر|الشهر/i.test(text) ? 'month' : 'today' };
  // storefront content
  if (has(sp, 'welcome')) return off ? { t: 'shop', fields: { welcome_msg: '' }, key: 'welcome', value: '' } : { t: 'shop', fields: { welcome_msg: quoted(text) || after(text, W.welcome) || '' }, key: 'welcome' };
  if (has(sp, 'announce')) { if (off) return { t: 'shop', fields: { announcement: '' }, key: 'announceOff' }; const v = quoted(text) || after(text, W.announce); return v ? { t: 'shop', fields: { announcement: v }, key: 'announce', value: v } : { t: 'help' }; }
  if (has(sp, 'tagline')) { const v = quoted(text) || after(text, W.tagline); return v ? { t: 'shop', fields: { tagline: v }, key: 'tagline', value: v } : { t: 'help' }; }
  if (has(sp, 'free')) { if (off) return { t: 'shop', fields: { free_shipping_over: 0 }, key: 'freeShipOff' }; const n = numbers(text); return n.length ? { t: 'shop', fields: { free_shipping_over: n[n.length - 1] }, key: 'freeShip', value: n[n.length - 1] } : { t: 'unknown' }; }
  if (has(sp, 'tone') || (has(sp, 'formal') && short) || (has(sp, 'friendly') && short)) { const v = has(sp, 'formal') ? 'formal' : has(sp, 'friendly') ? 'friendly' : null; if (v) return { t: 'shop', fields: { tone: v }, key: 'tone', value: v }; }
  if (has(sp, 'ai')) { if (has(sp, 'pause')) return { t: 'shop', fields: { ai_enabled: 0 }, key: 'aiOff' }; if (has(sp, 'resume')) return { t: 'shop', fields: { ai_enabled: 1 }, key: 'aiOn' }; }
  if (has(sp, 'language')) { const map = { dar: ['darija', 'daridja', 'دارجة'], fr: ['french', 'francais', 'fr'], en: ['english', 'anglais', 'en'], ar: ['arabic', 'arabe', 'عربية'] }; for (const [k, ws] of Object.entries(map)) if (nlp.hasAny(sp, ws)) return { t: 'shop', fields: { lang: k }, key: 'lang', value: k }; }
  // catalogue
  if (has(sp, 'add')) { const rest = after(text, W.add) || ''; const d = nlp.parseProductVoice(rest); return { t: 'add', d }; }
  if (has(sp, 'archive')) return { t: 'archive', q: after(text, W.archive) || text };
  // colour theme: needs a colour word + a "shop / theme" word and no price/stock vocabulary
  const colorTok = tk.map(nlp.colorOf).find(Boolean) || (tk.includes('teal') || tk.includes('turquoise') ? 'Teal' : null);
  const hex = /#[0-9a-fA-F]{6}\b/.exec(text);
  if ((colorTok || hex) && has(sp, 'themeWords') && !has(sp, 'price') && !/\d{2,}/.test(text)) return { t: 'shop', fields: { theme_color: hex ? hex[0] : (colorTok === 'Teal' ? '#0f5c5c' : THEME[colorTok]) }, key: 'theme' };
  if (/\b(reset|default|original|par defaut|asli)\b/i.test(text) && has(sp, 'themeWords')) return { t: 'shop', fields: { theme_color: '' }, key: 'themeBack' };
  const nums = numbers(text);
  if (has(sp, 'price') && nums.length) return { t: 'price', q: text.replace(/\d+(?:[.,]\d+)?\s*(?:dh|dhs|mad|dirhams?|درهم)?/gi, ' '), price: nums[nums.length - 1] };
  if (has(sp, 'stock') && nums.length) {
    const set = nlp.hasAny(sp, ['set', 'mets', 'dir', 'khelli', 'to', 'a', 'à', 'ل', 'خلي']) && !nlp.hasAny(sp, ['add', 'ajoute', 'zid', 'زيد', 'plus']);
    return { t: 'stock', q: text.replace(/\d+(?:[.,]\d+)?/g, ' '), mode: set ? 'set' : 'add', n: nums[nums.length - 1] };
  }
  return { t: 'unknown' };
}

function colorLabel(R_, hex) { return (R_.colorNames && R_.colorNames[String(hex).toLowerCase()]) || hex; }

function runRules(shopId, text, uiLang) {
  const shop = get('SELECT * FROM shops WHERE id=?', shopId);
  const lang = nlp.detectLang(text, uiLang === 'ar' ? 'ar' : uiLang || shop.lang);
  const r = R[lang] || R.en;
  const it = interpret(text, shopId);
  const out = { lang, reply: '', changes: [], changed: false, chips: [] };
  const fail = e => {
    if (e.error === 'not_found') return r.notFound();
    if (e.error === 'ambiguous') return r.ambiguous(e.options);
    if (e.error === 'which_variant') return r.which(e);
    if (e.error === 'need_price') return r.needPrice(e.name);
    return r.invalid(e.field || '');
  };
  switch (it.t) {
    case 'undo': { const l = undoLast(shopId); out.reply = l ? r.undone(l.label) : r.nothingUndo(); out.changed = !!l; break; }
    case 'help': out.reply = r.help(); out.chips = r.chips; break;
    case 'stats': { const s = stats(shopId, it.what); out.reply = s.today ? r.today(s.today) : s.month ? r.month(s.month) : s.low ? r.low(s.low) : s.pending !== undefined ? r.pending(s) : r.top(s.top); break; }
    case 'shop': {
      const res = setShop(shopId, it.fields, it.key + ': ' + JSON.stringify(Object.values(it.fields)[0]).slice(0, 60));
      if (!res.ok) { out.reply = fail(res); break; }
      const v = it.value !== undefined ? it.value : Object.values(it.fields)[0];
      out.reply = it.key === 'theme' ? r.theme(colorLabel(r, v)) : it.key === 'lang' ? r.lang(v) : r[it.key](v);
      out.changed = true; out.changes.push({ label: out.reply }); break;
    }
    case 'price': { const res = setPrice(shopId, it.q, it.price); out.reply = res.ok ? r.price(res) : fail(res); out.changed = !!res.ok; if (res.ok) out.changes.push({ label: out.reply }); break; }
    case 'stock': { const res = setStock(shopId, it.q, it.mode, it.n); out.reply = res.ok ? r.stock(res) : fail(res); out.changed = !!res.ok; if (res.ok) out.changes.push({ label: out.reply }); break; }
    case 'add': { const res = addProduct(shopId, it.d); out.reply = res.ok ? r.added(res) : fail(res); out.changed = !!res.ok; if (res.ok) out.changes.push({ label: out.reply }); break; }
    case 'archive': { const res = archiveProduct(shopId, it.q); out.reply = res.ok ? r.archived(res) : fail(res); out.changed = !!res.ok; if (res.ok) out.changes.push({ label: out.reply }); break; }
    default: out.reply = r.unknown(); out.chips = r.chips;
  }
  return out;
}

// ---------- optional Claude tool-calling mode --------------------------------
const MODEL = process.env.CENDOOR_MODEL || 'claude-sonnet-5-5';
const llmEnabled = () => !!process.env.ANTHROPIC_API_KEY;
const TOOLS = [
  { name: 'update_storefront', description: 'Change storefront settings. Only pass the fields to change. theme_color must be a #rrggbb hex; use "" to reset. announcement "" removes the bar.', input_schema: { type: 'object', properties: { tagline: { type: 'string' }, announcement: { type: 'string' }, theme_color: { type: 'string' }, welcome_msg: { type: 'string' }, free_shipping_over: { type: 'number' }, tone: { type: 'string', enum: ['friendly', 'formal'] }, lang: { type: 'string', enum: ['dar', 'fr', 'en', 'ar'] }, ai_enabled: { type: 'boolean' } } } },
  { name: 'set_product_price', description: 'Set the price (MAD) of one product, found by name.', input_schema: { type: 'object', properties: { product: { type: 'string' }, price: { type: 'number' } }, required: ['product', 'price'] } },
  { name: 'set_stock', description: 'Set or add stock of a product (mention colour/size in "product" when it has variants).', input_schema: { type: 'object', properties: { product: { type: 'string' }, mode: { type: 'string', enum: ['set', 'add'] }, quantity: { type: 'number' } }, required: ['product', 'mode', 'quantity'] } },
  { name: 'add_product', description: 'Create a product with one variant.', input_schema: { type: 'object', properties: { name: { type: 'string' }, price: { type: 'number' }, stock: { type: 'number' }, color: { type: 'string' }, size: { type: 'string' }, category: { type: 'string' }, description: { type: 'string' } }, required: ['name', 'price'] } },
  { name: 'archive_product', description: 'Hide a product from the shop (reversible).', input_schema: { type: 'object', properties: { product: { type: 'string' } }, required: ['product'] } },
  { name: 'get_business_stats', description: 'Read sales and stock numbers.', input_schema: { type: 'object', properties: { what: { type: 'string', enum: ['today', 'month', 'low', 'pending', 'top'] } }, required: ['what'] } },
  { name: 'undo_last_change', description: 'Undo the most recent change.', input_schema: { type: 'object', properties: {} } },
];
function execTool(shopId, name, i, changes) {
  const note = (res, label) => { if (res && res.ok) changes.push({ label }); return res; };
  if (name === 'update_storefront') {
    const f = { ...i }; if ('ai_enabled' in f) f.ai_enabled = f.ai_enabled ? 1 : 0;
    return note(setShop(shopId, f, 'studio: ' + Object.keys(f).join(', ')), 'Storefront: ' + Object.keys(f).join(', '));
  }
  if (name === 'set_product_price') { const r = setPrice(shopId, i.product, Number(i.price)); return note(r, r.ok ? `${r.product}: ${r.old} → ${r.price} MAD` : ''); }
  if (name === 'set_stock') { const r = setStock(shopId, i.product, i.mode, Number(i.quantity)); return note(r, r.ok ? `${r.product} ${r.label}: ${r.old} → ${r.stock}` : ''); }
  if (name === 'add_product') { const r = addProduct(shopId, i); return note(r, r.ok ? `+ ${r.name}` : ''); }
  if (name === 'archive_product') { const r = archiveProduct(shopId, i.product); return note(r, r.ok ? `- ${r.product}` : ''); }
  if (name === 'get_business_stats') return stats(shopId, i.what);
  if (name === 'undo_last_change') { const l = undoLast(shopId); if (l) changes.push({ label: 'Undo: ' + l.label }); return l ? { ok: true, undone: l.label } : { ok: false }; }
  return { error: 'unknown_tool' };
}
async function runLlm(shopId, text, history, uiLang) {
  const shop = get('SELECT * FROM shops WHERE id=?', shopId);
  const cat = orders.loadCatalog(shopId).map(p => `${p.name} (${p.price} MAD): ${p.variants.map(v => `${v.label} x${v.stock}`).join(', ')}`).join('\n');
  const system = `You are Cendoor Studio, the assistant of the owner of the Moroccan online shop "${shop.name}". The owner talks to you to change their storefront and catalogue and to ask about sales.
Reply in the language the owner writes (Darija in Latin or Arabic script, French, English). Keep replies to 1-2 short sentences.
Always use the tools to change anything and never claim a change without a successful tool result. If a product is ambiguous or a value is missing, ask one short question.
Current storefront: tagline="${shop.tagline}", announcement="${shop.announcement}", theme_color="${shop.theme_color}", free_shipping_over=${shop.free_shipping_over}, tone=${shop.tone}, ai_enabled=${shop.ai_enabled}.
Catalogue:\n${cat || '(empty)'}`;
  const msgs = [];
  for (const h of (history || []).slice(-8)) if (h && h.text && (h.role === 'user' || h.role === 'assistant')) { const last = msgs[msgs.length - 1]; if (last && last.role === h.role) last.content[0].text += '\n' + h.text; else msgs.push({ role: h.role, content: [{ type: 'text', text: String(h.text).slice(0, 600) }] }); }
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  if (msgs.length && msgs[msgs.length - 1].role === 'user') msgs.pop();
  msgs.push({ role: 'user', content: [{ type: 'text', text }] });
  const changes = [];
  for (let turn = 0; turn < 6; turn++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: MODEL, max_tokens: 600, system, tools: TOOLS, messages: msgs }) });
    if (!res.ok) throw new Error(`LLM ${res.status}`);
    const data = await res.json();
    const uses = (data.content || []).filter(b => b.type === 'tool_use');
    if (!uses.length || data.stop_reason !== 'tool_use') return { lang: uiLang, reply: (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim() || R.en.unknown(), changes, changed: changes.length > 0, chips: [] };
    msgs.push({ role: 'assistant', content: data.content });
    msgs.push({ role: 'user', content: uses.map(u => { let o; try { o = execTool(shopId, u.name, u.input || {}, changes); } catch (e) { o = { error: e.message }; } return { type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(o) }; }) });
  }
  return { lang: uiLang, reply: R.en.unknown(), changes, changed: changes.length > 0, chips: [] };
}

async function handle(shopId, text, { history, lang } = {}) {
  text = String(text || '').trim().slice(0, 600);
  if (!text) return { reply: '', changes: [], changed: false, chips: [] };
  if (llmEnabled()) { try { return await runLlm(shopId, text, history, lang || 'en'); } catch (e) { console.error('[studio llm] falling back to rules:', e.message); } }
  return runRules(shopId, text, lang);
}

module.exports = { handle, undoLast, recentLog, interpret, runRules, llmEnabled, chips: lang => (R[lang] || R.en).chips };
