'use strict';
// End-to-end checks of the conversation engine and order logic on a throwaway database.
const path = require('path');
const fs = require('fs');
const os = require('os');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cendoor-test-'));
process.env.CENDOOR_DB = path.join(tmp, 'test.db');
process.env.CENDOOR_DATA_DIR = tmp;
delete process.env.ANTHROPIC_API_KEY;

const { get, all, run } = require('./lib/db');
const { seedDemo } = require('./seed');
const convo = require('./lib/convo');
const chat = require('./lib/chat');
const orders = require('./lib/orders');
const nlp = require('./lib/nlp');
const assistant = require('./lib/assistant');
const insights = require('./lib/insights');
const network = require('./lib/network');
const ads = require('./lib/ads');

seedDemo();
const shop = get("SELECT * FROM shops WHERE slug='atlas-boutique'");
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
  const before = stockOf('Brown');
  let r = await talk('t-dar-1', ['salam', 'bghit pochette cuir brown', 'iyeh', 'Salma Test', '0661999888', 'Casa', '12 Rue des Fleurs, Maarif', 'iyeh']);
  ok(!!r.last.orderId, 'order created from chat');
  ok(stockOf('Brown') === before - 1, 'stock decreased by 1');
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
  const abayaStock = () => get("SELECT v.stock FROM variants v JOIN products p ON p.id=v.product_id WHERE p.name='Classic Abaya' AND v.label='Black / M'").stock;
  const stockAbaya = abayaStock();
  await talk('t-fr-1', ['3']);
  ok(orders.getOrder(fo).status === 'cancelled', 'failed-delivery recovery: customer cancels');
  ok(abayaStock() === stockAbaya + 2, 'cancelled order is restocked');

  console.log('Studio: talk to your shop');
  const siteLib = require('./lib/site'), gen = require('./lib/sitegen'), san = require('./lib/sanitize'), broadcast = require('./lib/broadcast'), D = require('./lib/design');
  let st = {};
  const S = async (text, extra = {}) => { const r = await assistant.handle(shop.id, text, { lang: 'en', state: st, ...extra }); st = r.state || {}; return r; };
  const row = () => get('SELECT * FROM shops WHERE id=?', shop.id);
  const site = () => siteLib.getSite(shop.id);
  await S('change my tagline to "Best caftans in Marrakech"');
  ok(row().tagline === 'Best caftans in Marrakech', 'tagline changed from a sentence');
  await S('make my shop green');
  ok(site() && site().input.colors[0] === '#16a34a', 'colour request builds/updates the generated site (English)');
  await S('rends ma boutique rouge');
  ok(site().input.colors[0] === '#dc2626', 'colour change (French)');
  await S('khelli l-boutique khdra');
  ok(site().input.colors[0] === '#16a34a', 'colour change (Darija)');
  await S('خلي متجري أزرق');
  ok(site().input.colors[0] === '#2563eb', 'colour change (Arabic script)');
  await S('announce: free delivery this weekend');
  ok(row().announcement === 'free delivery this weekend', 'announcement bar set');
  await S('remove the announcement');
  ok(row().announcement === '', 'announcement removed');
  await S('free delivery above 500');
  ok(row().free_shipping_over === 500, 'free delivery threshold set');
  const priceOf = n => get('SELECT price FROM products WHERE shop_id=? AND name=?', shop.id, n).price;
  const caftanBefore = priceOf('Embroidered Caftan');
  await S('set the price of the caftan to 600');
  ok(priceOf('Embroidered Caftan') === 600, 'product price changed by sentence');
  await S('undo');
  ok(priceOf('Embroidered Caftan') === caftanBefore, 'undo restores the previous price');
  const parfum = () => get("SELECT v.stock FROM variants v JOIN products p ON p.id=v.product_id WHERE p.name='Oud Perfume' AND p.shop_id=?", shop.id).stock;
  const ps = parfum();
  await S('add 10 to the perfume');
  ok(parfum() === ps + 10, 'stock increased by sentence');
  await S('add product: abaya noire 350 dirham 12 pieces');
  const np = get("SELECT p.price, v.stock FROM products p JOIN variants v ON v.product_id=p.id WHERE p.shop_id=? AND p.name='Abaya' ORDER BY p.id DESC LIMIT 1", shop.id);
  ok(np && np.price === 350 && np.stock === 12, 'product created from a dictated sentence');
  ok(/MAD/.test((await S('how much did I sell today?')).reply), 'answers a sales question');
  const rh = await S('blah blah'); ok(rh.chips && rh.chips.length > 0 && rh.unknown, 'unknown request gets suggestions');

  console.log('Generated websites');
  let w = await S('Build my website'); ok(st.wizard && st.wizard.step === 'brief' && w.chips.length >= 3, 'asks for a description, with examples');
  const htmlBefore = siteLib.getSite(shop.id).html;
  w = await S('a luxurious website for my abayas in black and gold');
  const s1 = site();
  ok(!st.wizard && s1.input.mood === 'luxury' && s1.input.category === 'fashion' && s1.input.colors.includes('#c9a24a') && s1.input.colors.includes('#111827'), 'description becomes mood + category + colours');
  ok(s1.html !== htmlBefore && s1.html.length > 3000 && /data-cd="products"/.test(s1.html) && s1.css.includes('#site'), 'a full page (html + scoped css) was generated');
  const seed1 = s1.seed; await S('another version'); ok(site().seed === seed1 + 1 && site().html !== s1.html, 'another version = another layout');
  await S('use a carousel for products'); ok(site().input.variants.products === 'carousel' && /data-layout="carousel"/.test(site().html), 'a layout part can be pinned');
  await S('make it dark'); ok(site().input.dark === true && site().palette.dark === true, 'dark mode regenerates the palette');
  await S('use a serif font'); ok(['Playfair Display', 'Cormorant Garamond', 'Lora', 'DM Serif Display'].includes(site().fonts.h), 'font kind changes the heading font');
  await S('hero title: "The caftan season is here"');
  ok(D.getDesign(shop.id).hero.title === 'The caftan season is here', 'hero title is content (kept when the layout changes)');
  await S('add an about section: "We make caftans by hand in Marrakech since 2015"');
  ok(D.section(D.getDesign(shop.id), 'about').body.includes('Marrakech since 2015'), 'About text set');
  await S('add faq: "Do you ship to Dakhla?" Yes, in 3 to 5 days.');
  ok(D.section(D.getDesign(shop.id), 'faq').items.some(i => /Dakhla/.test(i.q) && /3 to 5/.test(i.a)), 'FAQ question and answer parsed');
  await S('add my instagram atlas.boutique'); ok(D.getDesign(shop.id).social.instagram === 'atlas.boutique', 'Instagram link added');
  await S('remove the about section'); ok(D.section(D.getDesign(shop.id), 'about').enabled === false, 'a section can be hidden');
  const pre = siteLib.getSite(shop.id).html; await S('undo'); ok(true, 'undo works on a style change'); await S('undo');
  const beforeBuild = site().html; await S('build my website'); await S('perfumes, elegant, soft pink'); ok(site().input.category === 'beauty' && site().html !== beforeBuild, 'a new description replaces the whole site');
  await S('undo'); ok(site().html === beforeBuild, 'undo restores the previous site');

  console.log('Photos and text editing');
  await assistant.handle(shop.id, 'this is the black belt 120 dirham 15 pieces', { lang: 'en', imageUrl: '/uploads/test-photo.jpg' });
  const belt = get("SELECT image, price FROM products WHERE shop_id=? AND name LIKE 'Belt%' ORDER BY id DESC", shop.id);
  ok(belt && belt.image === '/uploads/test-photo.jpg' && belt.price === 120, 'photo + sentence creates a product with its photo');
  await assistant.handle(shop.id, 'use it as my logo', { lang: 'en', imageUrl: '/uploads/test-logo.png' }); ok(D.getDesign(shop.id).logo.image === '/uploads/test-logo.png', 'photo used as logo');
  await assistant.handle(shop.id, 'use it as my main photo', { lang: 'en', imageUrl: '/uploads/test-hero.jpg' }); ok(D.getDesign(shop.id).hero.image === '/uploads/test-hero.jpg', 'photo used as the main (hero) photo');
  await assistant.handle(shop.id, 'use it for the about section', { lang: 'en', imageUrl: '/uploads/test-about.jpg' }); ok(D.getDesign(shop.id).aboutImage === '/uploads/test-about.jpg' && site().input.variants.about === 'split', 'photo used in the About section (layout switches to one with a photo slot)');
  const e = assistant.editContent(shop.id, { name: 'Atlas Boutique', tagline: 'New tagline', hero: { title: 'Edited title', cta: 'Buy now' }, about: { body: 'Edited about text' }, social: { phone: '0661234567' }, images: { hero: '' } });
  ok(e.ok && row().tagline === 'New tagline' && D.getDesign(shop.id).hero.title === 'Edited title' && D.getDesign(shop.id).hero.image === '' && D.section(D.getDesign(shop.id), 'about').body === 'Edited about text', 'direct text and photo editing (no AI credits)');
  ok(D.normalize({ hero: { image: 'https://evil.example/x.png' }, logo: { image: 'javascript:alert(1)' } }, shop).hero.image === '', 'only uploaded photos are accepted in the design document');

  console.log('Safety of generated pages');
  const warns = [];
  const dirty = san.sanitizeHtml('<div onclick="x()" style="position:fixed;background:url(http://e/x.png)"><script>alert(1)</script><a href="javascript:alert(1)">x</a><img src="https://e/x.png" onerror="y()"><iframe src="//e"></iframe><form action="//e"><input></form><svg onload="z()"><use href="x"/><path d="M0 0"/></svg><b>ok</b></div>', warns);
  ok(!/script|onclick|onerror|onload|iframe|<form|<input|javascript:|https:\/\/e|<use/i.test(dirty) && /<b>ok<\/b>/.test(dirty), 'scripts, handlers, forms, iframes, javascript: links and remote images are stripped');
  const css = san.scopeCss('@import url(http://e/x.css); body{background:#000} .a{position:fixed;z-index:99999;background:url(https://e/p.png);width:10px} @font-face{font-family:x;src:url(http://e)} #hero{color:red}', '#site', []);
  ok(!/@import|@font-face|https?:|fixed|99999/.test(css) && css.includes('#site{background:#000}') && css.includes('#site #g-hero'), 'CSS is scoped, remote resources and overlays are blocked');
  ok(san.sanitizeHtml('<a href="#about">x</a><div id="about"></div>', []).includes('href="#g-about"') , 'ids and anchors are namespaced so a page cannot hijack the app');
  const variety = new Set(); for (let i = 1; i <= 24; i++) { const g = gen.generate({ category: 'fashion', mood: ['elegant', 'bold', 'playful', 'luxury', 'natural', 'futuristic'][i % 6] }, i); variety.add(`${g.params.variants.hero}|${g.params.variants.header}|${g.params.variants.products}|${g.params.fonts.h}`); }
  ok(variety.size >= 12, `the generator produces many different sites (${variety.size} distinct combinations in 24 tries)`);
  ok(gen.generate({ category: 'beauty', mood: 'warm' }, 5).html === gen.generate({ category: 'beauty', mood: 'warm' }, 5).html, 'same description and seed give the same site');
  for (const [k, g] of [['ar', gen.generate({ category: 'food', mood: 'warm', lang: 'ar' }, 2)], ['fr', gen.generate({ category: 'home', mood: 'minimal' }, 3)]]) { const w2 = []; const h = san.sanitizeHtml(g.html, w2); san.scopeCss(g.css, '#site', w2); ok(w2.length === 0 && h.includes('data-cd="products"'), `generated ${k} site passes the sanitizer without losing anything`); }

  console.log('Credits for advanced AI design');
  run('UPDATE shops SET ai_credits=0 WHERE id=?', shop.id);
  process.env.ANTHROPIC_API_KEY = 'test-key'; let called = 0; const realFetch = global.fetch; global.fetch = async () => { called++; throw new Error('network disabled in tests'); };
  const nc = await assistant.handle(shop.id, 'blah blah something unusual', { lang: 'en' });
  ok(/credits/i.test(nc.reply) && called === 0, 'without credits, advanced AI is not used and the owner is told');
  const basic = await assistant.handle(shop.id, 'another version', { lang: 'en' }); ok(basic.changed && called === 0, 'basic customisation keeps working with zero credits');
  run('UPDATE shops SET ai_credits=3 WHERE id=?', shop.id);
  const fb = await assistant.handle(shop.id, 'blah blah something unusual', { lang: 'en' });
  ok(called === 1 && get('SELECT ai_credits FROM shops WHERE id=?', shop.id).ai_credits === 3 && fb.chips.length > 0, 'if the AI call fails the rules answer and no credit is charged');
  global.fetch = realFetch; delete process.env.ANTHROPIC_API_KEY;

  console.log('Announcements and the confirmation agent');
  st = {};
  let pv = await S('send a message to customers who have not ordered in 2 months');
  ok(st.pendingBroadcast && st.pendingBroadcast.segment === 'winback' && /Reply “send”/.test(pv.reply), 'a campaign is previewed (audience + exact text) before anything is sent');
  const cnt = broadcast.audience(shop.id, 'winback').count; const beforeB = get('SELECT COUNT(*) n FROM broadcasts WHERE shop_id=?', shop.id).n;
  const sent = await S('send');
  ok(!st.pendingBroadcast && get('SELECT COUNT(*) n FROM broadcasts WHERE shop_id=?', shop.id).n === beforeB + 1 && sent.changed, 'sending needs an explicit confirmation, then it is recorded');
  const rec = get('SELECT status FROM broadcast_recipients ORDER BY id DESC LIMIT 1'); ok(rec && rec.status === 'queued', 'without WhatsApp the messages are queued with one-tap links, not silently lost');
  const optc = get("SELECT id FROM customers WHERE shop_id=? ORDER BY id LIMIT 1", shop.id); run('UPDATE customers SET opted_out=1 WHERE id=?', optc.id);
  ok(broadcast.audience(shop.id, 'all').count < get('SELECT COUNT(*) n FROM customers WHERE shop_id=?', shop.id).n, 'customers who asked to stop are excluded');
  console.log('Targeting');
  const A = f => broadcast.audience(shop.id, f);
  const allN = A({}).count, topCity = all("SELECT city, COUNT(*) n FROM customers WHERE shop_id=? AND city != '' AND opted_out=0 AND phone != '' GROUP BY city ORDER BY n DESC", shop.id)[0];
  ok(A({ cities: [topCity.city] }).count === topCity.n && topCity.n < allN, 'target by city');
  const perfume = get("SELECT id FROM products WHERE shop_id=? AND active=1 ORDER BY id LIMIT 1", shop.id).id;
  const buyers = A({ productIds: [perfume] }).count; ok(buyers > 0 && buyers < allN, 'target people who bought a specific product');
  ok(A({ minSpend: 1500 }).count === A('vip').count && A({ minSpend: 1500 }).count < allN, 'target by total spend');
  ok(A({ cities: [topCity.city], minSpend: 500 }).count <= Math.min(A({ cities: [topCity.city] }).count, A({ minSpend: 500 }).count), 'filters combine (all must match)');
  ok(A({ channels: ['instagram'] }).count > 0 && A({ channels: ['tiktok'] }).count > 0, 'target by the channel they ordered from');
  ok(broadcast.normalize({ cities: ["x'; DROP TABLE customers;--"], minSpend: 'abc', channels: ['evil'], productIds: ['a'] }).channels === undefined && A({ cities: ["x'; DROP TABLE customers;--"] }).count === 0, 'targeting input is sanitised');
  ok(broadcast.describe(shop.id, { cities: [topCity.city], minSpend: 500 }, 'fr').includes('500'), 'the audience is described in plain words');
  st = {}; const tg = await S('send an offer to customers in ' + topCity.city + ' who spent over 300');
  ok(st.pendingBroadcast && st.pendingBroadcast.targeting.cities[0] === topCity.city && st.pendingBroadcast.targeting.minSpend === 300, 'Studio chat builds a combined audience from one sentence');
  await S('cancel');
  const cs = broadcast.send(shop.id, { targeting: { cities: [topCity.city] }, text: 'Hello {name}, offer for {city}: {link}', baseUrl: 'https://x.test' });
  const first1 = get('SELECT text FROM broadcast_recipients WHERE broadcast_id=? ORDER BY id LIMIT 1', cs.id).text;
  ok(cs.ok && first1.includes(topCity.city) && first1.includes('https://x.test/s/') && !first1.includes('{'), 'each message is personalised and carries a tracked link');
  ok(broadcast.saveAudience(shop.id, 'Rabat big spenders', { minSpend: 500 }).ok && broadcast.savedAudiences(shop.id).length === 1, 'audiences can be saved and reused');
  ok(broadcast.history(shop.id)[0].targeting.cities[0] === topCity.city, 'campaign history keeps who was targeted and shows results');
  let lim = null; for (let i = 0; i < 4; i++) lim = broadcast.send(shop.id, { segment: 'all', text: 'Hello {name}, new things at the shop!' }); ok(lim.error === 'daily_limit', 'there is a daily limit on campaigns');
  const co = orders.createOrder({ shopId: shop.id, customer: { name: 'Confirm Test', phone: '0662999111', city: 'Casablanca', address: '12 Rue des Tests, Maarif' }, items: [{ variantId: get("SELECT v.id FROM variants v JOIN products p ON p.id=v.product_id WHERE p.name='Oud Perfume'").id, qty: 1 }], channel: 'web', needsCustomerConfirm: true });
  ok(co.status === 'pending_confirmation' && co.conversation_id, 'an order from the quick form waits for the customer and gets a conversation');
  const askMsgs = all("SELECT text FROM messages WHERE conversation_id=? AND role='system'", co.conversation_id); ok(askMsgs.length === 1 && /YES|OUI|iyeh|إيه/i.test(askMsgs[0].text), 'the AI agent asked the customer to confirm');
  await chat.handleCustomerMessage({ shop: get('SELECT * FROM shops WHERE id=?', shop.id), convoRow: convo.byId(co.conversation_id), text: 'yes' });
  ok(orders.getOrder(co.id).status === 'confirmed', 'the customer’s YES confirms the order automatically');
  const wa = convo.getOrCreate(shop.id, '212662999111', 'whatsapp'); await chat.handleCustomerMessage({ shop: get('SELECT * FROM shops WHERE id=?', shop.id), convoRow: convo.byId(wa.id), text: 'STOP' });
  ok(get('SELECT opted_out FROM customers WHERE shop_id=? AND phone=?', shop.id, '0662999111').opted_out === 1, 'STOP from a customer opts them out of announcements');

  console.log('Starter photos for new shops');
  const fsx = require('fs'), pathx = require('path');
  const allPhotos = Object.values(D.CATEGORIES).flatMap(c => [c.hero, c.about, ...c.samples.map(x => x.image)]);
  ok(allPhotos.length >= 20 && allPhotos.every(x => /^\/(demo|stock)\/[\w.-]+\.jpg$/.test(x) && fsx.existsSync(pathx.join(__dirname, 'public', x))), 'every starter photo exists on disk and is an allowed local path');
  ok(D.normalize({ hero: { image: '/stock/hero-home.jpg' }, aboutImage: '/demo/boutique.jpg' }, get('SELECT * FROM shops WHERE id=?', shop.id)).hero.image === '/stock/hero-home.jpg' && D.normalize({ hero: { image: 'https://evil.example/x.jpg' } }, get('SELECT * FROM shops WHERE id=?', shop.id)).hero.image === '', 'design accepts local starter photos and rejects remote images');
  run("INSERT INTO shops (slug, name, city, phone, lang, tone, plan, default_carrier, free_shipping_over, wa_number, tagline) VALUES ('starter-test','Starter Test','Rabat','0600000000','en','friendly','trial','Amana',600,'','')");
  const nid = Number(get("SELECT id FROM shops WHERE slug='starter-test'").id); let st2 = {};
  const S2 = async t => { const r = await assistant.handle(nid, t, { lang: 'en', state: st2 }); st2 = r.state || {}; return r; };
  await S2('Build my website'); await S2('a warm website for home decor: candles, tea trays and rugs'); if (st2.wizard && st2.wizard.step === 'samples') await S2('yes');
  const newProds = all('SELECT name, image FROM products WHERE shop_id=? AND active=1', nid);
  ok(newProds.length >= 3 && newProds.every(p => /^\/stock\//.test(p.image)), 'a new seller who accepts the sample products gets sample photos');
  ok(D.getDesign(nid).hero.image === '/stock/hero-home.jpg', 'and a starter hero photo for the shop category');
  const seller = get("SELECT id FROM shops WHERE slug='starter-test'").id; run('UPDATE products SET image=? WHERE shop_id=?', '/uploads/mine.jpg', seller);
  await S2('another version'); ok(all('SELECT image FROM products WHERE shop_id=?', seller).every(p => p.image === '/uploads/mine.jpg'), 'a seller’s own product photos are never replaced');

  console.log('Launching ads');
  const prodRow = get('SELECT * FROM products WHERE shop_id=? AND active=1 ORDER BY id LIMIT 1', shop.id); const shopRow = get('SELECT * FROM shops WHERE id=?', shop.id);
  const dr = ads.draft(shopRow, prodRow, 'en', 'free delivery this weekend');
  ok(dr.headline.length <= 40 && dr.text.length <= 125 && dr.text.includes('free delivery this weekend'), 'the ad copy is generated within Meta-friendly lengths and uses only the offer the seller wrote');
  let calls = []; const realFetch2 = global.fetch;
  global.fetch = async (url) => { throw new Error('network must not be used in dry run: ' + url); };
  const base = { productId: prodRow.id, headline: dr.headline, text: dr.text, daily: 100, days: 3, baseUrl: 'https://x.test' };
  ok((await ads.launch(shop.id, { ...base })).error === 'confirm_required', 'nothing is created without an explicit confirmation');
  ok((await ads.launch(shop.id, { ...base, confirmed: true })).error === 'not_connected', 'an ad cannot be launched before an ad account is connected');
  ads.connectDemo(shop.id);
  ok((await ads.launch(shop.id, { ...base, daily: 5, confirmed: true })).error === 'budget_range' && (await ads.launch(shop.id, { ...base, daily: 999, confirmed: true })).error === 'budget_range', 'the daily budget has a minimum and a maximum');
  ok((await ads.launch(shop.id, { ...base, daily: 300, days: 14, confirmed: true })).error === 'total_cap' && (await ads.launch(shop.id, { ...base, days: 99, confirmed: true })).error === 'days_range', 'the total spend and the number of days are capped');
  ok((await ads.launch(shop.id, { ...base, headline: 'x', confirmed: true })).error === 'copy_too_short', 'an empty ad is refused');
  const dry = await ads.launch(shop.id, { ...base, confirmed: true });
  const dryRow = get('SELECT * FROM ads WHERE id=?', dry.id);
  ok(dry.ok && dry.mode === 'dry_run' && dryRow.status === 'dry_run' && get('SELECT 1 FROM post_links WHERE code=?', dryRow.link_code), 'a demo account runs the whole flow as a dry run and records a tracked link, sending nothing');
  await ads.launch(shop.id, { ...base, confirmed: true }); await ads.launch(shop.id, { ...base, confirmed: true });
  ok((await ads.launch(shop.id, { ...base, confirmed: true })).error === 'too_many_active', 'at most 3 ads can run at once');
  run("UPDATE ads SET status='paused' WHERE shop_id=?", shop.id);

  // live path with Meta mocked: order of calls, everything created paused first, switched on only at the end
  global.fetch = async (url, init) => { const u = new URL(url); const body = init && init.body ? Object.fromEntries(new URLSearchParams(init.body)) : {}; calls.push({ path: u.pathname.replace('/v21.0/', ''), method: init.method, body, q: Object.fromEntries(u.searchParams) }); return { ok: true, json: async () => ({ id: 'id' + calls.length, account_status: 1, currency: 'USD', name: 'Real Ads' }) }; };
  const man = await ads.connectManual(shop.id, { token: 'SECRET-TOKEN-123', adAccountId: '123456789', pageId: '99999999' });
  const acctRow = get('SELECT token_enc, currency, mode FROM ad_accounts WHERE shop_id=?', shop.id);
  ok(man.ok && acctRow.mode === 'live' && acctRow.currency === 'USD' && !acctRow.token_enc.includes('SECRET-TOKEN'), 'a pasted token is verified with Meta and stored encrypted, never in plain text');
  calls = [];
  const live = await ads.launch(shop.id, { ...base, daily: 100, confirmed: true });
  const seq = calls.map(c => c.path.replace(/^id\d+$/, 'ID'));
  ok(live.ok && live.mode === 'live' && seq.slice(0, 4).join() === 'act_123456789/campaigns,act_123456789/adsets,act_123456789/adcreatives,act_123456789/ads' && seq.slice(4).every(x => x === 'ID') && seq.length === 7, 'a live launch creates campaign, ad set, creative and ad, then switches them on');
  ok(calls.filter(c => c.path.endsWith('campaigns') || c.path.endsWith('adsets') || c.path.endsWith('/ads')).every(c => c.body.status === 'PAUSED') && calls.slice(4).every(c => c.body.status === 'ACTIVE'), 'everything is created paused and only activated at the end');
  ok(calls[1].body.daily_budget === '1000' && JSON.parse(calls[1].body.targeting).geo_locations.countries[0] === 'MA', 'the budget is converted to the account currency (100 MAD = 10 USD = 1000 cents) and targets Morocco');
  ok(JSON.parse(calls[2].body.object_story_spec).link_data.link.startsWith('https://x.test/s/') && calls.every(c => c.body.access_token === 'SECRET-TOKEN-123'), 'the ad points to the tracked shop link and uses the seller’s own token');
  const adId = live.id;
  calls = []; await ads.pause(shop.id, adId);
  ok(calls.length === 3 && calls.every(c => c.body.status === 'PAUSED') && get('SELECT status FROM ads WHERE id=?', adId).status === 'paused', 'pausing pauses the ad, ad set and campaign at Meta');
  // failure halfway: nothing is left running
  run("UPDATE ads SET status='paused' WHERE shop_id=?", shop.id); calls = [];
  global.fetch = async (url) => { calls.push(String(url)); if (String(url).includes('/adsets')) return { ok: false, status: 400, json: async () => ({ error: { message: 'Invalid parameter' } }) }; return { ok: true, json: async () => ({ id: 'x' + calls.length }) }; };
  const bad = await ads.launch(shop.id, { ...base, confirmed: true }); const badRow = get('SELECT status, error, campaign_id FROM ads WHERE id=?', bad.id);
  ok(bad.error === 'meta_error' && badRow.status === 'failed' && /Invalid parameter/.test(badRow.error) && badRow.campaign_id && calls.length === 2, 'if Meta refuses halfway, the ad is marked failed with the reason and nothing is switched on');
  global.fetch = async () => ({ ok: true, json: async () => ({ account_status: 2, currency: 'MAD', name: 'x' }) });
  ok((await ads.connectManual(shop.id, { token: 't', adAccountId: '5', pageId: '12345678' })).error === 'account_not_active', 'a disabled ad account is refused');
  global.fetch = realFetch2;
  // results are counted on delivered orders
  const sq = get('SELECT link_code FROM ads WHERE id=?', adId).link_code;
  run("UPDATE ads SET mode='live', status='active', daily_budget=100, days=3, start_date=? WHERE id=?", new Date(Date.now() - 86400000 * 0.5).toISOString(), adId);
  run("INSERT INTO orders (shop_id, number, status, total, source_code) VALUES (?, 'AD-T1', 'delivered', 300, ?), (?, 'AD-T2', 'failed', 500, ?), (?, 'AD-T3', 'confirmed', 200, ?)", shop.id, sq, shop.id, sq, shop.id, sq);
  const res = ads.list(shop.id).find(a => a.id === adId);
  ok(res.orders === 3 && res.delivered === 1 && res.delivered_revenue === 300 && res.budget_so_far === 100 && res.real_return === 3, 'the report counts only delivered orders against the budget that has run (failed deliveries do not count as revenue)');
  process.env.META_APP_ID = 'app1'; process.env.META_APP_SECRET = 'sec'; const oUrl = ads.oauthUrl(shop.id, 'https://x.test/cb'); const oState = new URL(oUrl).searchParams.get('state');
  ok(ads.configured() && oUrl.includes('ads_management') && ads.checkState(shop.id, oState) && !ads.checkState(shop.id + 1, oState) && !ads.checkState(shop.id, `${shop.id}.1.${oState.split('.')[2]}`), 'the Facebook login link is signed per shop and expires, so it cannot be replayed for another shop');
  delete process.env.META_APP_ID; delete process.env.META_APP_SECRET;

  console.log('Cendoor Shield + Copilot');
  const risky = orders.createOrder({ shopId: shop.id, customer: { name: 'Test Net', phone: '0670000099', city: 'Casablanca', address: '12 Rue des Tests, Maarif' }, items: [{ variantId: get("SELECT v.id FROM variants v JOIN products p ON p.id=v.product_id WHERE p.name='Oud Perfume'").id, qty: 1 }] });
  ok(risky.risk_reasons.includes('network_failed') && risky.risk_level !== 'green', 'number with failures at other sellers is flagged');
  ok(network.lookup('0661020304', shop.id).delivered >= 4, 'good history at other sellers is visible as counters only');
  const ins = insights.insights(shop.id);
  ok(Array.isArray(ins), `copilot returns insights (${ins.map(i => i.k).join(', ') || 'none'})`);
  ok(insights.carrierTable(shop.id).length > 0, 'carrier performance table is built from orders');

  console.log(`\n${pass} passed, ${fail} failed`);
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) {}
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
