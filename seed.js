'use strict';
// Demo data: a believable Moroccan boutique with 45 days of history, so every screen has something to show.
const { get, all, run, tx } = require('./lib/db');
const auth = require('./lib/auth');
const network = require('./lib/network');
const designLib = require('./lib/design');
const siteLib = require('./lib/site');

function rng(seed) { let a = seed; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ts = (daysAgo, hour = 12, min = 0) => { const d = new Date(Date.now() - daysAgo * 86400000); d.setUTCHours(hour, min, 0, 0); return d.toISOString().replace('T', ' ').slice(0, 19); };

function addUser(shopId, email, name, role) {
  const salt = auth.newSalt();
  run('INSERT INTO users (shop_id, email, name, pass_hash, salt, role) VALUES (?,?,?,?,?,?)', shopId, email, name, auth.hash('demo1234', salt), salt, role);
}

function seedDemo() {
  if (get('SELECT id FROM shops LIMIT 1')) return false;
  const rand = rng(20261012);
  tx(() => {
    run(`INSERT INTO shops (slug, name, city, phone, lang, tone, plan, default_carrier, free_shipping_over, wa_number, tagline) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      'atlas-boutique', 'Atlas Boutique', 'Marrakech', '0661234567', 'en', 'friendly', 'solo', 'Amana', 600, '', 'Dresses, caftans & accessories, delivered all over Morocco');
    const shopId = Number(get('SELECT id FROM shops WHERE slug=?', 'atlas-boutique').id);
    run("UPDATE shops SET plan='trial', trial_ends_at=datetime('now','+11 days'), lang='en' WHERE id=?", shopId);
    addUser(shopId, 'demo@cendoor.com', 'Demo Owner', 'admin');
    addUser(shopId, 'manager@cendoor.com', 'Demo Manager', 'manager');
    addUser(shopId, 'operator@cendoor.com', 'Demo Operator', 'operator');
    addUser(shopId, 'viewer@cendoor.com', 'Demo Viewer', 'viewer');

    const carriers = [
      ['Amana', 35, '2-4', { Casablanca: 30, Rabat: 30, Marrakech: 30, 'Laâyoune': 55, Dakhla: 65 }],
      ['CTM', 30, '1-3', { Casablanca: 25, Rabat: 25, Tanger: 30 }],
      ['Aramex', 45, '1-2', { Casablanca: 35, Rabat: 35 }],
      ['CashPlus', 30, '2-3', {}],
    ];
    for (const [n, b, e, c] of carriers) run('INSERT INTO carriers (shop_id, name, base_price, eta_days, city_prices) VALUES (?,?,?,?,?)', shopId, n, b, e, JSON.stringify(c));

    const prods = [
      ['Satin Dress', 'Flowing satin dress, perfect for evenings and weddings.', 220, 'Dresses', '👗', 'robe, dress, fostan, فستان, satin, soiree', [['Blue', 'M', 20], ['Blue', 'L', 15], ['Red', 'M', 8], ['Black', 'M', 2]]],
      ['Embroidered Caftan', 'Hand-embroidered caftan in a light, elegant fabric.', 650, 'Caftans', '🥻', 'caftan, kaftan, قفطان, takchita, brode', [['Gold', '', 6], ['Green', '', 4]]],
      ['Classic Abaya', 'Elegant black abaya in a breathable fabric.', 340, 'Abayas', '🧥', 'abaya, عباية, jilbab', [['Black', 'S', 10], ['Black', 'M', 12], ['Black', 'L', 9]]],
      ['Urban Sneakers', 'Comfortable sneakers for every day.', 420, 'Shoes', '👟', 'sneakers, baskets, chaussures, sabbat, صباط, shoes', [['White', '38', 5], ['White', '39', 7], ['White', '40', 6], ['White', '41', 3]]],
      ['Oud Perfume', "Oriental perfume, 50 ml, lasts up to 10 hours.", 180, 'Perfumes', '🧴', 'parfum, perfume, oud, عطر, 3titr', [['', '', 40]]],
      ['Leather Bag', 'Handbag in genuine leather.', 390, 'Bags', '👜', 'sac, bag, cuir, leather, شنطة, chanta', [['Brown', '', 7], ['Black', '', 0]]],
    ];
    // free stock photos (Pexels licence), saved in public/demo; sellers upload their own
    const PHOTO = { 'Satin Dress': '/demo/dress.jpg', 'Embroidered Caftan': '/demo/caftan.jpg', 'Classic Abaya': '/demo/abaya.jpg', 'Urban Sneakers': '/demo/sneakers.jpg', 'Oud Perfume': '/demo/perfume.jpg', 'Leather Bag': '/demo/bag.jpg' };
    const pid = [];
    for (const [name, desc, price, cat, emoji, kw, vs] of prods) {
      run('INSERT INTO products (shop_id, name, description, price, category, emoji, image, keywords) VALUES (?,?,?,?,?,?,?,?)', shopId, name, desc, price, cat, emoji, PHOTO[name] || '', kw);
      const id = Number(get('SELECT MAX(id) m FROM products').m); pid.push(id);
      for (const [c, s, stock] of vs) {
        const label = [c, s].filter(Boolean).join(' / ') || 'Standard';
        run('INSERT INTO variants (product_id, label, color, size, stock) VALUES (?,?,?,?,?)', id, label, c, s, stock);
      }
    }

    // storefront design: what a seller would get after talking to the Studio
    {
      const shopRow = get('SELECT * FROM shops WHERE id=?', shopId);
      const built = designLib.buildFromWizard(shopRow, { category: 'fashion', style: 'natural', lang: 'en' });
      built.design.hero.title = '';
      built.design.hero.image = '/demo/caftan.jpg';
      built.design.aboutImage = '/demo/boutique.jpg';
      built.design.logo = { emoji: '', image: '', showName: true };
      built.design.social = { instagram: 'atlas.boutique', tiktok: 'atlas.boutique', whatsapp: '', phone: '0661234567', email: '' };
      designLib.saveDesign(shopId, built.design);
      run('UPDATE shops SET ai_credits=10 WHERE id=?', shopId);
      siteLib.build(shopId, { category: 'fashion', mood: 'warm', colors: [], variants: { hero: 'split', products: 'magazine' } }, { seed: 7 });
    }
    run("INSERT INTO post_links (shop_id, code, label, channel, product_id, visits) VALUES (?,?,?,?,?,?)", shopId, 'ig-satin', 'Reel: Blue Satin Dress', 'instagram', pid[0], 540);
    run("INSERT INTO post_links (shop_id, code, label, channel, product_id, visits) VALUES (?,?,?,?,?,?)", shopId, 'tt-caftan', 'TikTok: Embroidered Caftan', 'tiktok', pid[1], 1350);
    run("INSERT INTO post_links (shop_id, code, label, channel, product_id, visits) VALUES (?,?,?,?,?,?)", shopId, 'ig-bio', 'Link in bio', 'instagram', null, 980);
    run("INSERT INTO post_links (shop_id, code, label, channel, product_id, visits) VALUES (?,?,?,?,?,?)", shopId, 'wa-status', 'WhatsApp status', 'whatsapp', null, 520);

    // ---- history ----
    const people = [
      ['Salma Idrissi', '0661020304', 'Casablanca', '12 Rue des Orangers, Maarif'], ['Hassan Bennani', '0662030405', 'Rabat', '45 Avenue Hassan II, Agdal'],
      ['Khadija Berrada', '0663040506', 'Fès', 'Lot 8 Hay Saada, Narjiss'], ['Youssef Tazi', '0664050607', 'Tanger', '23 Rue de Fes, Centre ville'],
      ['Nadia Fassi', '0665060708', 'Marrakech', '7 Derb Sidi Bouamar, Gueliz'], ['Omar Chraibi', '0666070809', 'Agadir', 'Immeuble 3 Appt 12, Founty'],
      ['Imane Skalli', '0667080910', 'Casablanca', '90 Boulevard Zerktouni, 3e étage'], ['Karim Lahlou', '0668091011', 'Meknès', '15 Rue Ibn Khaldoun, Hamria'],
      ['Zineb Kettani', '0669101112', 'Oujda', 'Hay Al Qods Rue 9 N 22'], ['Mehdi Benjelloun', '0670111213', 'Kénitra', '31 Avenue Mohammed V'],
      ['Anas Sebti', '0671121314', 'Tétouan', 'Résidence Al Andalous Bloc B'], ['Lamia Filali', '0672131415', 'Casablanca', '5 Rue Abou Kacem, Bourgogne'],
      ['Rachid Amrani', '0673141516', 'Safi', 'Quartier Industriel, Rue 4 N 18'], ['Sara El Fassi', '0674151617', 'Rabat', 'Lot Ennahda, Villa 14, Hay Riad'],
      ['Yassine Mouline', '0675161718', 'Marrakech', '44 Route de Targa'], ['Hajar Naciri', '0676171819', 'El Jadida', 'Rue Mohammed VI N 61'],
    ];
    const channels = ['instagram', 'instagram', 'tiktok', 'tiktok', 'whatsapp', 'whatsapp', 'whatsapp', 'web'];
    const catalog = all('SELECT v.id vid, v.label, v.stock, p.id pid, p.name, p.price FROM variants v JOIN products p ON p.id=v.product_id WHERE p.shop_id=?', shopId);
    const custId = {};
    let seq = 0;
    for (let d = 45; d >= 0; d--) {
      const n = d > 30 ? 1 : d > 14 ? 2 : 3 + Math.floor(rand() * 3);
      for (let k = 0; k < n; k++) {
        const person = people[Math.floor(rand() * people.length)];
        const v = catalog[Math.floor(rand() * catalog.length)];
        const qty = rand() < 0.2 ? 2 : 1;
        const subtotal = v.price * qty;
        const fee = subtotal >= 600 ? 0 : 30 + (rand() < 0.3 ? 5 : 0);
        const ch = channels[Math.floor(rand() * channels.length)];
        const src = ch === 'instagram' ? (rand() < 0.5 ? 'ig-satin' : 'ig-bio') : ch === 'tiktok' ? 'tt-caftan' : ch === 'whatsapp' ? 'wa-status' : '';
        const carrier = ['Amana', 'CTM', 'Aramex', 'CashPlus'][Math.floor(rand() * 4)];
        const pFail = { Amana: 0.05, CTM: 0.08, Aramex: 0.14, CashPlus: 0.3 }[carrier]; // fictional: carriers differ, so Copilot has something to find
        let status = 'delivered';
        const r = rand();
        if (d > 5) status = r < pFail ? 'failed' : r < pFail + 0.05 ? 'cancelled' : 'delivered';
        else if (d > 2) status = r < 0.5 ? 'delivered' : r < 0.8 ? 'shipped' : 'confirmed';
        else status = r < 0.5 ? 'confirmed' : r < 0.85 ? 'shipped' : 'pending_confirmation';
        const shipSt = status === 'delivered' ? 'delivered' : status === 'failed' ? 'failed' : status === 'shipped' ? (rand() < 0.5 ? 'in_transit' : 'out_for_delivery') : 'none';
        seq++;
        run('UPDATE shops SET order_seq = ? WHERE id=?', seq, shopId);
        if (!custId[person[1]]) { run('INSERT INTO customers (shop_id, phone, name, city, address) VALUES (?,?,?,?,?)', shopId, person[1], person[0], person[2], person[3]); custId[person[1]] = Number(get('SELECT id FROM customers WHERE shop_id=? AND phone=?', shopId, person[1]).id); }
        const created = ts(d, 9 + Math.floor(rand() * 11), Math.floor(rand() * 60));
        const number = `#CD-${String(seq).padStart(4, '0')}`;
        const risk = status === 'pending_confirmation' ? ['red', 62, ['new_customer', 'short_address']] : ['green', 12, ['returning_good']];
        run(`INSERT INTO orders (shop_id, number, customer_id, name, phone, city, address, status, shipment_status, carrier, tracking, subtotal, shipping_fee, total, channel, source_code, risk_level, risk_score, risk_reasons, cod_remitted, delivered_at, created_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          shopId, number, custId[person[1]], person[0], person[1], person[2], person[3], status, shipSt, carrier,
          shipSt === 'none' ? '' : `CDW${String(seq).padStart(6, '0')}MA`, subtotal, fee, subtotal + fee, ch, src, risk[0], risk[1], JSON.stringify(risk[2]),
          status === 'delivered' && d > 6 ? 1 : 0, status === 'delivered' ? ts(Math.max(0, d - 2), 15) : null, created);
        const oid = Number(get('SELECT id FROM orders WHERE shop_id=? AND number=?', shopId, number).id);
        run('INSERT INTO order_items (order_id, product_id, variant_id, name, label, qty, price) VALUES (?,?,?,?,?,?,?)', oid, v.pid, v.vid, v.name, v.label, qty, v.price);
        run('INSERT INTO shipment_events (order_id, status, note, created_at) VALUES (?,?,?,?)', oid, 'order_created', ch, created);
        if (shipSt !== 'none') run('INSERT INTO shipment_events (order_id, status, note, created_at) VALUES (?,?,?,?)', oid, shipSt, '', created);
        if (status === 'delivered' && rand() < 0.65) run('INSERT INTO reviews (shop_id, order_id, rating, created_at) VALUES (?,?,?,?)', shopId, oid, rand() < 0.8 ? 5 : rand() < 0.6 ? 4 : 3, created);
      }
    }
    // customer stats from the history
    for (const c of all('SELECT id FROM customers WHERE shop_id=?', shopId)) {
      const s = get(`SELECT COUNT(*) n, SUM(status='delivered') dl, SUM(status='failed') fl,
        SUM(CASE WHEN status='delivered' THEN total ELSE 0 END) ltv, MAX(created_at) last FROM orders WHERE customer_id=?`, c.id);
      run('UPDATE customers SET orders_count=?, delivered_count=?, failed_count=?, ltv=?, last_order_at=? WHERE id=?', s.n, s.dl || 0, s.fl || 0, s.ltv || 0, s.last, c.id);
    }
    // Cendoor Shield: this shop's own outcomes, plus a little FICTIONAL history from other sellers so the demo can show the network effect.
    for (const o of all("SELECT phone, status FROM orders WHERE shop_id=? AND status IN ('delivered','failed')", shopId)) network.record(o.phone, shopId, o.status === 'delivered' ? { delivered: 1 } : { failed: 1 });
    network.record('0670000099', 9001, { failed: 2 }); network.record('0670000099', 9002, { failed: 1 }); network.record('0670000099', 9003, { failed: 1 });
    network.record('0661020304', 9001, { delivered: 4 }); network.record('0661020304', 9002, { delivered: 2 });
    run('UPDATE shops SET auto_carrier=1 WHERE id=?', shopId);
    // a customer who has not ordered in a long time (re-engagement demo)
    run('UPDATE customers SET last_order_at=? WHERE shop_id=? AND phone=?', ts(75), shopId, '0675161718');
    run("UPDATE orders SET created_at=?, delivered_at=? WHERE customer_id=? ", ts(75), ts(73), custId['0675161718']);

    // Chat-created orders: every customer gets a WhatsApp thread, and orders from chat channels are linked to it
    for (const c of all('SELECT id, phone, name FROM customers WHERE shop_id=?', shopId)) {
      if (['0661020304', '0672131415'].includes(c.phone)) continue; // these two have hand-written conversations below
      const key = '212' + c.phone.replace(/^0/, '');
      run('INSERT INTO conversations (shop_id, customer_key, channel, lang, customer_id, customer_name, updated_at, created_at) VALUES (?,?,?,?,?,?,?,?)', shopId, key, 'whatsapp', 'fr', c.id, c.name, ts(3, 10), ts(30, 10));
      const cid = Number(get('SELECT id FROM conversations WHERE shop_id=? AND customer_key=?', shopId, key).id);
      run('INSERT INTO messages (conversation_id, role, text, created_at) VALUES (?,?,?,?)', cid, 'system', 'Your order is confirmed ✅ Thank you!', ts(3, 10));
      run("UPDATE orders SET conversation_id=? WHERE customer_id=? AND channel IN ('whatsapp','instagram','tiktok')", cid, c.id);
    }
    // a few failed deliveries that the AI recovered (the customer asked to retry)
    for (const o of all("SELECT id FROM orders WHERE shop_id=? AND status='delivered' ORDER BY id LIMIT 4", shopId)) run('INSERT INTO shipment_events (order_id, status, note) VALUES (?,?,?)', o.id, 'retry', 'Customer asked to retry tomorrow');

    // ---- conversations ----
    const mk = (key, ch, lang, msgs, extra = {}) => {
      run('INSERT INTO conversations (shop_id, customer_key, channel, lang, customer_name, needs_attention, attention_reason, unread, updated_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
        shopId, key, ch, lang, extra.name || '', extra.attn ? 1 : 0, extra.reason || '', extra.unread || 0, ts(extra.ago || 0, 14), ts(extra.ago || 0, 13));
      const cid = Number(get('SELECT id FROM conversations WHERE shop_id=? AND customer_key=?', shopId, key).id);
      msgs.forEach(([role, text], i) => run('INSERT INTO messages (conversation_id, role, text, created_at) VALUES (?,?,?,?)', cid, role, text, ts(extra.ago || 0, 13, i)));
    };
    mk('212661020304', 'whatsapp', 'dar', [
      ['customer', 'Salam, bghit robe zerqa M'], ['bot', 'Salam! Satin Dress (Blue / M) taman dyalo 220 DH. Kayn f stock. Bghiti t-commandih?'],
      ['customer', 'iyeh'], ['bot', 'Wakha! Smiytek l-kamla, 3afak?'], ['customer', 'Salma Idrissi'], ['bot', 'Ra9m t-telephone dyalek? (06… wla 07…)'],
      ['customer', '0661020304 Casablanca 12 Rue des Orangers Maarif'], ['bot', 'Hak l-commande dyalek: 1 × Satin Dress (Blue / M) — 220 DH. N-confirmi?'], ['customer', 'iyeh'],
      ['bot', 'L-commande dyalek #CD-0001 t-confirmat ✅ Chokran!'],
    ], { name: 'Salma Idrissi', ago: 1 });
    mk('212672131415', 'whatsapp', 'fr', [
      ['customer', 'Bonjour, j’ai reçu la robe mais la taille ne convient pas, trop petit'], ['bot', 'Je suis désolé pour ce souci. J’ai alerté le vendeur pour qu’il vous aide directement.'],
    ], { name: 'Lamia Filali', attn: true, reason: 'complaint', unread: 1, ago: 0 });
    mk('web-demo-seed', 'web', 'en', [
      ['customer', 'Do you have the caftan in green?'], ['bot', 'Embroidered Caftan (Green) costs 650 DH. Only 4 left! Would you like to order it?'],
    ], { name: '', unread: 1, ago: 0 });
  });
  return true;
}

module.exports = { seedDemo };
if (require.main === module) { console.log(seedDemo() ? 'Demo data created.' : 'Database already has data; nothing seeded.'); }
