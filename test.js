'use strict';
// End-to-end checks of the conversation engine and order logic on a throwaway database.
const path = require('path');
const fs = require('fs');
const os = require('os');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cendoor-test-'));
process.env.CENDOOR_DB = path.join(tmp, 'test.db');
process.env.CENDOOR_DATA_DIR = tmp;
delete process.env.ANTHROPIC_API_KEY;

const { get, all } = require('./lib/db');
const { seedDemo } = require('./seed');
const convo = require('./lib/convo');
const chat = require('./lib/chat');
const orders = require('./lib/orders');
const nlp = require('./lib/nlp');
const assistant = require('./lib/assistant');
const insights = require('./lib/insights');
const network = require('./lib/network');

seedDemo();
const shop = get("SELECT * FROM shops WHERE slug='amina-boutique'");
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ok  ', msg); } else { fail++; console.log('  FAIL', msg); } };
const VERBOSE = process.argv.includes('-v');

async function talk(key, lines, channel = 'web') {
  const c0 = convo.getOrCreate(shop.id, key, channel);
  let last = null;
  for (const line of lines) {
    const c = convo.byId(c0.id);
    const out = await chat.handleCustomerMessage({ shop: get('SELECT * FROM shops WHERE id=?', shop.id), convoRow: c, text: line });
    last = out;
    if (VERBOSE) { console.log('  > ' + line); for (const r of out.replies) console.log('    < ' + r.text.replace(/\n/g, '\n      ')); }
  }
  return { last, convoId: c0.id, text: () => all('SELECT role,text FROM messages WHERE conversation_id=? ORDER BY id', c0.id).filter(m => m.role !== 'customer').map(m => m.text).join('\n---\n') };
}
const stockOf = label => get("SELECT v.stock FROM variants v JOIN products p ON p.id=v.product_id WHERE v.label=? AND p.shop_id=? ORDER BY v.id LIMIT 1", label, shop.id).stock;

(async () => {
  console.log('NLP');
  ok(nlp.detectLang('salam bghit robe zerqa') === 'dar', 'detects Darija (Latin)');
  ok(nlp.detectLang('بغيت فستان') === 'ar', 'detects Arabic script');
  ok(nlp.extractPhone('0612-34 56 78').phone === '0612345678', 'normalises phone');
  ok(nlp.extractPhone('+212 661 234 567').phone === '0661234567', 'normalises +212 phone');
  ok(nlp.extractCity('f Casa') === 'Casablanca', 'city alias Casa');
  ok(nlp.extractCity('safi mzyan') === null, '"safi" alone is not a city');
  const v = nlp.parseProductVoice('robe zerqa 200 dirham 50 pieces');
  ok(v.name === 'Robe' && v.price === 200 && v.stock === 50 && v.color === 'Blue', 'voice-to-product parse (Darija)');

  console.log('Darija order, step by step');
  const before = stockOf('Blue / M');
  let r = await talk('t-dar-1', ['salam', 'bghit robe zerqa M', 'iyeh', 'Salma Test', '0661999888', 'Casa', '12 Rue des Fleurs, Maarif', 'iyeh']);
  ok(!!r.last.orderId, 'order created from chat');
  ok(stockOf('Blue / M') === before - 1, 'stock decreased by 1');
  const o1 = orders.getOrder(r.last.orderId);
  ok(o1 && o1.city === 'Casablanca' && o1.phone === '0661999888' && o1.subtotal === 220 && o1.total === o1.subtotal + o1.shipping_fee, `order totals right (${o1 && o1.total}, carrier ${o1 && o1.carrier} chosen automatically)`);

  console.log('French, everything in one message');
  r = await talk('t-fr-1', ['Bonjour', 'Je voudrais 2 abayas noires taille M', "Je m'appelle Nadia Test, 0662111222, Rabat, 45 Avenue Hassan II Agdal", 'oui']);
  ok(!!r.last.orderId, 'FR order created');
  const o2 = r.last.orderId && orders.getOrder(r.last.orderId);
  ok(o2 && o2.items[0].qty === 2, 'quantity 2 captured');
  ok(o2 && o2.shipping_fee === 0, 'free delivery above threshold');

  console.log('English price question then order');
  r = await talk('t-en-1', ['hi', 'how much is the perfume?']);
  ok(/180/.test(r.text()), 'answers price 180');
  r = await talk('t-en-1', ['yes', 'Omar Test', '0663444555', 'Tanger', '23 Rue de la Liberte, Centre', 'yes']);
  ok(!!r.last.orderId, 'EN order created after price question');

  console.log('Out of stock');
  r = await talk('t-oos-1', ['bghit sac k7el']);
  ok(/sme7|sold|épuisé|salat/i.test(r.text()), 'says black bag is sold out');

  console.log('Colour not available');
  r = await talk('t-col-1', ['bghit caftan zerqa']);
  ok(/Gold|Green/.test(r.text()), 'offers available colours');

  console.log('Arabic script');
  r = await talk('t-ar-1', ['بغيت عطر', 'ايه']);
  ok(/180/.test(r.text()), 'prices the perfume in Arabic script');

  console.log('Complaint → seller attention');
  r = await talk('t-cmp-1', ['probleme avec ma commande, la robe est trop petite']);
  ok(get('SELECT needs_attention FROM conversations WHERE id=?', r.convoId).needs_attention === 1, 'complaint flags the conversation');

  console.log('Quantity above stock');
  r = await talk('t-qty-1', ['bghit 5 sneakers 41']);
  ok(/ba9i|only|reste/i.test(r.text()), 'refuses more than stock (3 left)');

  console.log('Red risk → pending confirmation');
  r = await talk('t-risk-1', ['bghit parfum', 'iyeh', 'Test Risk', '0670000001', 'Casa', 'rue 1', 'iyeh']);
  const o3 = r.last.orderId && orders.getOrder(r.last.orderId);
  ok(o3 && (o3.risk_level !== 'green' ? o3.status === 'pending_confirmation' || o3.status === 'confirmed' : true), 'risk flagged order is handled');

  console.log('Status flow + notifications + review + recovery');
  const oid = o1.id;
  orders.setOrderStatus(oid, 'shipped');
  ok(orders.getOrder(oid).tracking.startsWith('CDW'), 'label/tracking assigned on shipping');
  orders.advanceShipment(oid); // in_transit
  orders.advanceShipment(oid); // out_for_delivery
  const delivered = orders.advanceShipment(oid);
  ok(delivered.status === 'delivered', 'order delivered via carrier feed');
  const c1 = get('SELECT * FROM conversations WHERE customer_key=?', 't-dar-1');
  const notes = all("SELECT text FROM messages WHERE conversation_id=? AND role='system'", c1.id);
  ok(notes.length >= 3, `customer got ${notes.length} automatic updates`);
  const rv = await talk('t-dar-1', ['5']);
  ok(get('SELECT COUNT(*) n FROM reviews WHERE order_id=?', oid).n === 1, 'review collected from chat');

  const fo = o2.id;
  orders.setOrderStatus(fo, 'shipped');
  orders.setOrderStatus(fo, 'failed');
  const abayaStock = () => get("SELECT v.stock FROM variants v JOIN products p ON p.id=v.product_id WHERE p.name='Abaya Classique' AND v.label='Black / M'").stock;
  const stockAbaya = abayaStock();
  await talk('t-fr-1', ['3']);
  ok(orders.getOrder(fo).status === 'cancelled', 'failed-delivery recovery: customer cancels');
  ok(abayaStock() === stockAbaya + 2, 'cancelled order is restocked');

  console.log('Studio: talk to your shop');
  const S = async text => assistant.handle(shop.id, text, { lang: 'en' });
  const row = () => get('SELECT * FROM shops WHERE id=?', shop.id);
  await S('change my tagline to "Best caftans in Marrakech"');
  ok(row().tagline === 'Best caftans in Marrakech', 'tagline changed from a sentence');
  await S('make my shop green');
  ok(row().theme_color === '#1e8e5a', 'theme colour changed (English)');
  await S('rends ma boutique rouge');
  ok(row().theme_color === '#c8382e', 'theme colour changed (French)');
  await S('khelli l-boutique khdra');
  ok(row().theme_color === '#1e8e5a', 'theme colour changed (Darija)');
  await S('خلي متجري أزرق');
  ok(row().theme_color === '#1f5fbf', 'theme colour changed (Arabic script)');
  await S('announce: free delivery this weekend');
  ok(row().announcement === 'free delivery this weekend', 'announcement bar set');
  await S('remove the announcement');
  ok(row().announcement === '', 'announcement removed');
  await S('free delivery above 500');
  ok(row().free_shipping_over === 500, 'free delivery threshold set');
  const priceOf = n => get('SELECT price FROM products WHERE shop_id=? AND name=?', shop.id, n).price;
  const caftanBefore = priceOf('Caftan Brodé');
  await S('set the price of the caftan to 600');
  ok(priceOf('Caftan Brodé') === 600, 'product price changed by sentence');
  await S('undo');
  ok(priceOf('Caftan Brodé') === caftanBefore, 'undo restores the previous price');
  const parfum = () => get("SELECT v.stock FROM variants v JOIN products p ON p.id=v.product_id WHERE p.name='Parfum Oud' AND p.shop_id=?", shop.id).stock;
  const ps = parfum();
  await S('add 10 to the perfume');
  ok(parfum() === ps + 10, 'stock increased by sentence');
  await S('add product: abaya noire 350 dirham 12 pieces');
  const np = get("SELECT p.price, v.stock FROM products p JOIN variants v ON v.product_id=p.id WHERE p.shop_id=? AND p.name='Abaya' ORDER BY p.id DESC LIMIT 1", shop.id);
  ok(np && np.price === 350 && np.stock === 12, 'product created from a dictated sentence');
  const rs = await S('how much did I sell today?');
  ok(/MAD/.test(rs.reply), 'answers a sales question');
  const rh = await S('blah blah');
  ok(rh.chips && rh.chips.length > 0, 'unknown request gets suggestions');

  console.log('Studio: build the whole shop');
  const D = require('./lib/design');
  let st = {};
  const W = async (text, extra = {}) => { const r = await assistant.handle(shop.id, text, { lang: 'en', state: st, ...extra }); st = r.state || {}; return r; };
  let w = await W('build my shop');
  ok(st.wizard && st.wizard.step === 'cat' && w.chips.length >= 5, 'wizard asks what you sell, with options');
  w = await W('I sell abayas and caftans'); ok(st.wizard.step === 'style', 'wizard understands the category');
  w = await W('elegant'); ok(st.wizard.step === 'color', 'wizard takes the style');
  w = await W('gold'); ok(st.wizard.step === 'samples', 'wizard takes the colour');
  const beforeProducts = get('SELECT COUNT(*) n FROM products WHERE shop_id=? AND active=1', shop.id).n;
  w = await W('no');
  ok(!st.wizard && w.changed, 'wizard builds the shop');
  const des = D.getDesign(shop.id);
  ok(des.preset === 'elegant' || des.preset === 'custom', 'design preset applied') ;
  ok(des.font === 'serif' && des.sections.some(s => s.type === 'about' && s.enabled && s.body) && des.sections.some(s => s.type === 'faq' && s.enabled && s.items.length === 3), 'whole site content created (serif look, About, FAQ)');
  ok(get('SELECT COUNT(*) n FROM products WHERE shop_id=? AND active=1', shop.id).n === beforeProducts, 'no sample products added when declined');
  await W('undo'); ok(D.getDesign(shop.id).preset !== 'elegant' || D.getDesign(shop.id).sections.find(s => s.type === 'faq').items.length !== 3, 'undo reverts the whole build');
  await S('make it futuristic with dark mode');
  const fut = D.getDesign(shop.id); ok(fut.preset === 'futuristic' && fut.mode === 'dark' && fut.cards === 'glass', 'style preset + dark mode in one sentence');
  await S('use gold and black');
  const gb = D.getDesign(shop.id); ok(gb.accent === '#9c7a1e' && gb.accent2 === '#26302f', 'two colours: main and secondary');
  await S('use a serif font and 4 columns');
  const sf = D.getDesign(shop.id); ok(sf.font === 'serif' && sf.columns === 4, 'font and columns');
  await S('add an about section: "We make caftans by hand in Marrakech since 2015"');
  ok(D.section(D.getDesign(shop.id), 'about').body.includes('Marrakech since 2015'), 'About section with the seller text');
  await S('add faq: "Do you ship to Dakhla?" Yes, in 3 to 5 days.');
  ok(D.section(D.getDesign(shop.id), 'faq').items.some(i => /Dakhla/.test(i.q) && /3 to 5/.test(i.a)), 'FAQ question and answer parsed');
  await S('add my instagram amina.boutique');
  ok(D.getDesign(shop.id).social.instagram === 'amina.boutique', 'Instagram link added');
  await S('hero title: "The caftan season is here"');
  ok(D.getDesign(shop.id).hero.title === 'The caftan season is here', 'hero title set');
  await S('move the faq to the top');
  ok(D.getDesign(shop.id).sections[0].type === 'faq', 'section moved');
  await S('remove the about section');
  ok(D.section(D.getDesign(shop.id), 'about').enabled === false, 'section hidden');
  const withImg = await assistant.handle(shop.id, 'this is the black belt 120 dirham 15 pieces', { lang: 'en', imageUrl: '/uploads/test-photo.jpg' });
  const belt = get("SELECT image, price FROM products WHERE shop_id=? AND name LIKE 'Belt%' ORDER BY id DESC", shop.id);
  ok(belt && belt.image === '/uploads/test-photo.jpg' && belt.price === 120, 'photo + sentence creates a product with its photo');
  await assistant.handle(shop.id, 'use it as my logo', { lang: 'en', imageUrl: '/uploads/test-logo.png' });
  ok(D.getDesign(shop.id).logo.image === '/uploads/test-logo.png', 'photo used as logo');
  const hostile = D.normalize({ accent: 'red;}</style><script>', hero: { image: 'https://evil.example/x.png', title: '<img src=x onerror=alert(1)>' }, sections: [{ type: 'about', body: 'ok' }, { type: 'evil' }] }, shop);
  ok(hostile.accent !== 'red;}</style><script>' && hostile.hero.image === '' && hostile.sections.every(s => D.SECTION_TYPES.includes(s.type)), 'design validation rejects injected colours, remote images and unknown sections');

  console.log('Cendoor Shield + Copilot');
  const risky = orders.createOrder({ shopId: shop.id, customer: { name: 'Test Net', phone: '0670000099', city: 'Casablanca', address: '12 Rue des Tests, Maarif' }, items: [{ variantId: get("SELECT v.id FROM variants v JOIN products p ON p.id=v.product_id WHERE p.name='Parfum Oud'").id, qty: 1 }] });
  ok(risky.risk_reasons.includes('network_failed') && risky.risk_level !== 'green', 'number with failures at other sellers is flagged');
  ok(network.lookup('0661020304', shop.id).delivered >= 4, 'good history at other sellers is visible as counters only');
  const ins = insights.insights(shop.id);
  ok(Array.isArray(ins), `copilot returns insights (${ins.map(i => i.k).join(', ') || 'none'})`);
  ok(insights.carrierTable(shop.id).length > 0, 'carrier performance table is built from orders');

  console.log(`\n${pass} passed, ${fail} failed`);
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) {}
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
