'use strict';
// Customer-facing storefront: catalogue, quick COD order form, AI chat with voice in/out.
(() => {
  const slug = decodeURIComponent(location.pathname.split('/').filter(Boolean)[1] || '');
  const qs = new URLSearchParams(location.search);
  const SRC = (qs.get('p') || '').slice(0, 40);
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = { get(k, d) { try { return localStorage.getItem(k) ?? d; } catch (_) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} } };

  const TXT = {
    en: { dir: 'ltr', n: 'EN', chat: 'Chat to order', orderChat: 'Order by chat', orderHere: 'Order here', wa: 'WhatsApp', sold: 'Sold out', only: n => `Only ${n} left`, left: 'in stock', delivery: 'Delivery all over Morocco', cod: 'Pay cash on delivery', ai: 'Instant replies, day and night', free: n => `Free delivery above ${n} MAD`,
      qty: 'Quantity', name: 'Full name', phone: 'Phone (06… / 07…)', city: 'City', addr: 'Full address', place: 'Place order — pay on delivery', placed: 'Order confirmed!', thanks: 'Thank you', eta: d => `Delivery in about ${d} days. Pay cash when it arrives.`, verify: 'The shop will call you to verify your order.', close: 'Close', typeMsg: 'Type a message…', listening: 'Listening…', voiceLang: 'Voice language', speak: 'Read replies aloud', all: 'All', reviews: 'reviews', welcome: 'Hello! Ask me about any product, or tell me what you want to order. You can also send a voice message.', aiTitle: 'Shop assistant', aiSub: 'Replies instantly', mic: 'Speak', send: 'Send', badPhone: 'Please enter a Moroccan mobile number (06/07…).', missing: 'Please fill in all the fields.', soldNow: 'Sorry, this item just sold out.', err: 'Something went wrong. Please try again.', iWant: (q, n) => `I want ${q} ${n}`, powered: 'Powered by', noSpeech: 'Voice input is not supported on this browser.', total: 'Total', visitor: 'You', shopLabel: 'Shop' },
    fr: { dir: 'ltr', n: 'FR', chat: 'Commander par chat', orderChat: 'Commander par chat', orderHere: 'Commander ici', wa: 'WhatsApp', sold: 'Épuisé', only: n => `Plus que ${n}`, left: 'en stock', delivery: 'Livraison partout au Maroc', cod: 'Paiement à la livraison', ai: 'Réponses instantanées, jour et nuit', free: n => `Livraison gratuite dès ${n} MAD`,
      qty: 'Quantité', name: 'Nom complet', phone: 'Téléphone (06… / 07…)', city: 'Ville', addr: 'Adresse complète', place: 'Commander — payer à la livraison', placed: 'Commande confirmée !', thanks: 'Merci', eta: d => `Livraison en environ ${d} jours. Payez en espèces à la réception.`, verify: 'La boutique vous appellera pour vérifier votre commande.', close: 'Fermer', typeMsg: 'Écrivez un message…', listening: 'Écoute…', voiceLang: 'Langue vocale', speak: 'Lire les réponses à voix haute', all: 'Tout', reviews: 'avis', welcome: 'Bonjour ! Posez-moi vos questions sur un produit, ou dites-moi ce que vous voulez commander. Vous pouvez aussi envoyer un message vocal.', aiTitle: 'Assistant boutique', aiSub: 'Réponses instantanées', mic: 'Parler', send: 'Envoyer', badPhone: 'Saisissez un mobile marocain (06/07…).', missing: 'Veuillez remplir tous les champs.', soldNow: "Désolé, cet article vient d'être épuisé.", err: 'Une erreur est survenue. Réessayez.', iWant: (q, n) => `Je veux ${q} ${n}`, powered: 'Propulsé par', noSpeech: "La saisie vocale n'est pas disponible sur ce navigateur.", total: 'Total', visitor: 'Vous', shopLabel: 'Boutique' },
    dar: { dir: 'ltr', n: 'DAR', chat: 'Tlob f chat', orderChat: 'Tlob f chat', orderHere: 'Tlob mn hna', wa: 'WhatsApp', sold: 'Salat', only: n => `Ba9i ghir ${n}`, left: 'kayn', delivery: 'Tawsil l kol l-Maghrib', cod: 'Khlass 3and l-istilam', ai: 'Jawab f l-7in, nhar u lil', free: n => `Tawsil mjani fo9 ${n} DH`,
      qty: 'L-kmiya', name: 'Smiya kamla', phone: 'Telephone (06… / 07…)', city: 'L-medina', addr: 'L-3onwan kamel', place: 'Tlob — khlass 3and l-istilam', placed: 'L-commande t-confirmat!', thanks: 'Chokran', eta: d => `Ghadi twsel f ${d} iyam. Khlass cash melli twsel.`, verify: 'L-boutique ghadi tconctik bach t2kd l-commande.', close: 'Sedd', typeMsg: 'Kteb risala…', listening: 'Kanslem…', voiceLang: 'Lougha dyal s-sout', speak: 'Qra r-rodoud b s-sout', all: 'Kolchi', reviews: 'tqyim', welcome: 'Salam! Soulni 3la ay produit, wla goul-li achno bghiti t-chri. T9der tsifet-li risala sawtiya.', aiTitle: 'Mosa3ed l-boutique', aiSub: 'Kay-jawb f l-7in', mic: 'Hder', send: 'Sifet', badPhone: 'Dkhel numro mobile maghribi (06/07…).', missing: 'Kemmel kol l-khanat.', soldNow: 'Sme7 lina, had l-produit salat daba.', err: 'Waqe3 mochkil. 3awd.', iWant: (q, n) => `Bghit ${q} ${n}`, powered: 'Mchghol b', noSpeech: 'S-sout ma-khddamch f had l-navigateur.', total: 'L-majmo3', visitor: 'Nta', shopLabel: 'L-boutique' },
    ar: { dir: 'rtl', n: 'ع', chat: 'اطلب عبر الدردشة', orderChat: 'اطلب عبر الدردشة', orderHere: 'اطلب من هنا', wa: 'واتساب', sold: 'نفد', only: n => `باقي ${n} فقط`, left: 'متوفر', delivery: 'توصيل لكل المغرب', cod: 'الدفع عند الاستلام', ai: 'ردود فورية ليلا ونهارا', free: n => `توصيل مجاني فوق ${n} درهم`,
      qty: 'الكمية', name: 'الاسم الكامل', phone: 'الهاتف (06… / 07…)', city: 'المدينة', addr: 'العنوان الكامل', place: 'اطلب — الدفع عند الاستلام', placed: 'تم تأكيد طلبك!', thanks: 'شكرا', eta: d => `التوصيل خلال حوالي ${d} أيام. تدفع نقدا عند الاستلام.`, verify: 'سيتصل بك المحل للتأكد من الطلب.', close: 'إغلاق', typeMsg: 'اكتب رسالة…', listening: 'جارٍ الاستماع…', voiceLang: 'لغة الصوت', speak: 'قراءة الردود بصوت عال', all: 'الكل', reviews: 'تقييم', welcome: 'مرحبا! اسألني عن أي منتج، أو قل لي ماذا تريد أن تطلب. يمكنك أيضا إرسال رسالة صوتية.', aiTitle: 'مساعد المتجر', aiSub: 'ردود فورية', mic: 'تكلم', send: 'إرسال', badPhone: 'أدخل رقم موبايل مغربي (06/07…).', missing: 'المرجو ملء كل الحقول.', soldNow: 'عذرا، نفد هذا المنتج للتو.', err: 'حدث خطأ. حاول مجددا.', iWant: (q, n) => `بغيت ${q} ${n}`, powered: 'مدعوم من', noSpeech: 'الإدخال الصوتي غير مدعوم في هذا المتصفح.', total: 'المجموع', visitor: 'أنت', shopLabel: 'المحل' },
  };
  let L = store.get('cd_shop_lang', null);
  if (!TXT[L]) { const nl = (navigator.language || 'en').slice(0, 2); L = nl === 'fr' ? 'fr' : nl === 'ar' ? 'ar' : 'en'; }
  const T = () => TXT[L];

  let DATA = null, cat = 'all', open = null, sel = {}, chatOpen = false;
  const chat = { id: store.get('cd_sid_' + slug, null), last: 0, shown: new Set(), speak: false, vlang: 'ar-MA', rec: null, unread: false, busy: false };
  if (!chat.id) { chat.id = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)); store.set('cd_sid_' + slug, chat.id); }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const VLANGS = [['ar-MA', 'Darija'], ['fr-FR', 'Français'], ['en-US', 'English']];

  const ICON = { chat: 'M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 20l1.1-4.9A8.4 8.4 0 0 1 3 11.5 8.5 8.5 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z', x: 'M18 6L6 18M6 6l12 12', mic: 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8', send: 'M22 2L11 13M22 2l-7 20-4-9-9-4z', vol: 'M11 5L6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14', truck: 'M1 3h15v13H1zM16 8h4l3 3v5h-7zM5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z', cash: 'M2 7h18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zM2 7l14-4v4M17 14h.01', zap: 'M13 2L3 14h9l-1 8 10-12h-9z' };
  const ic = n => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[n]}"/></svg>`;
  const money = n => `${Math.round(n).toLocaleString('en-GB')} MAD`;

  async function load() {
    const q = SRC ? `?p=${encodeURIComponent(SRC)}` : '';
    const seenKey = 'cd_seen_' + slug + SRC;
    let visited = false; try { visited = sessionStorage.getItem(seenKey); } catch (_) {}
    const r = await fetch(`/api/shop/${encodeURIComponent(slug)}${visited ? '' : q}`);
    if (!r.ok) { document.getElementById('app').innerHTML = `<div class="wrap" style="padding:60px 0;text-align:center"><h1>404</h1><p>Shop not found.</p></div>`; return; }
    try { sessionStorage.setItem(seenKey, '1'); } catch (_) {}
    DATA = await r.json();
    document.title = DATA.shop.name;
    chat.vlang = L === 'fr' ? 'fr-FR' : L === 'en' ? 'en-US' : 'ar-MA';
    paint();
    if (DATA.source && DATA.source.product_id) { const p = DATA.products.find(x => x.id === DATA.source.product_id); if (p) openProduct(p.id); }
    syncChat(true);
    setInterval(() => syncChat(false), 4000);
  }

  // Seller-chosen brand colour: derive the whole palette from one hex value
  function applyTheme(hex) {
    const r = document.documentElement.style;
    if (!/^#[0-9a-f]{6}$/i.test(hex || '')) { ['--teal', '--teal-700', '--teal-100', '--teal-50'].forEach(k => r.removeProperty(k)); return; }
    const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    const mix = (a, b, p) => '#' + a.map((v, i) => Math.round(v * (1 - p) + b[i] * p).toString(16).padStart(2, '0')).join('');
    const dark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
    const base = dark ? mix(rgb, [255, 255, 255], 0.35) : hex;
    const baseRgb = [1, 3, 5].map(i => parseInt(base.slice(i, i + 2), 16));
    r.setProperty('--teal', base); r.setProperty('--teal-700', mix(baseRgb, [0, 0, 0], 0.25));
    r.setProperty('--teal-100', dark ? mix(rgb, [0, 0, 0], 0.55) : mix(rgb, [255, 255, 255], 0.82)); r.setProperty('--teal-50', dark ? mix(rgb, [0, 0, 0], 0.7) : mix(rgb, [255, 255, 255], 0.92));
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = hex;
  }
  function paint() {
    const t = T(); document.documentElement.lang = L === 'dar' ? 'ary-Latn' : L; document.documentElement.dir = t.dir;
    const { shop, products, rating } = DATA;
    applyTheme(shop.theme_color);
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
    const list = products.filter(p => cat === 'all' || p.category === cat);
    $('#app').innerHTML = `
      ${shop.announcement ? `<div class="ann">${esc(shop.announcement)}</div>` : ''}
      <header class="top"><div class="wrap"><div class="brand">${esc(shop.name)}</div><div class="langs">${Object.keys(TXT).map(k => `<button class="${k === L ? 'on' : ''}" data-lang="${k}" aria-label="${k}">${TXT[k].n}</button>`).join('')}</div></div></header>
      <main class="wrap">
        <section class="hero"><h1>${esc(shop.tagline || shop.name)}</h1>
          <div class="meta">${shop.city ? `<span class="tag">📍 ${esc(shop.city)}</span>` : ''}${rating.avg ? `<span class="tag star">★ ${rating.avg} <span style="color:var(--muted);font-weight:500">(${rating.count} ${t.reviews})</span></span>` : ''}${shop.free_shipping_over ? `<span class="tag">🚚 ${t.free(shop.free_shipping_over)}</span>` : ''}</div></section>
        ${cats.length ? `<div class="chips"><button class="chip ${cat === 'all' ? 'on' : ''}" data-cat="all">${t.all}</button>${cats.map(c => `<button class="chip ${cat === c ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
        <div class="grid">${list.map(p => card(p)).join('')}</div>
        <div class="trust"><div>${ic('truck')} ${t.delivery}</div><div>${ic('cash')} ${t.cod}</div><div>${ic('zap')} ${t.ai}</div></div>
      </main>
      <footer>${t.powered} <a href="/" target="_blank" rel="noopener">cendoor</a></footer>
      ${shop.ai_enabled !== false ? `<button class="fab ${chatOpen ? 'hidden' : ''}" data-chat="open">${ic('chat')} ${t.chat}${chat.unread ? '<span class="dot"></span>' : ''}</button>` : ''}
      <div id="chatHost"></div>`;
    if (chatOpen) paintChat();
  }
  function card(p) {
    const t = T(); const low = p.stock > 0 && p.stock <= 3;
    return `<button class="card" data-p="${p.id}"><div class="img">${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">` : esc(p.emoji || '📦')}${p.stock === 0 ? `<span class="badge">${t.sold}</span>` : low ? `<span class="badge low">${t.only(p.stock)}</span>` : ''}</div>
      <div class="cbody"><div class="n">${esc(p.name)}</div><div class="p">${money(Math.min(...p.variants.map(v => v.price)))}</div></div></button>`;
  }

  // ---------- product sheet ----------
  function openProduct(id) {
    const p = DATA.products.find(x => x.id === id); if (!p) return;
    open = p; const inStock = p.variants.filter(v => v.stock > 0);
    sel = { v: inStock[0] ? inStock[0].id : null, q: 1 };
    paintSheet();
  }
  function paintSheet(view = 'detail', result = null) {
    const t = T(); const p = open; if (!p) return;
    const v = p.variants.find(x => x.id === sel.v);
    const multi = p.variants.length > 1 || (p.variants[0] && p.variants[0].label !== 'Standard');
    let host = $('#sheetHost'); if (!host) { host = document.createElement('div'); host.id = 'sheetHost'; document.body.appendChild(host); }
    document.body.style.overflow = 'hidden';
    const head = `<div class="img" style="position:relative">${p.image ? `<img src="${esc(p.image)}" alt="">` : esc(p.emoji || '📦')}<button class="close" data-close aria-label="${t.close}">${ic('x')}</button></div>`;
    let body = '';
    if (view === 'done') body = `<div class="ok"><div class="big">✅</div><h2>${t.placed}</h2><p><b>${esc(result.number)}</b> · ${money(result.total)}</p><p>${t.eta(esc(result.eta))}</p>${result.verify ? `<p class="note">${t.verify}</p>` : ''}<button class="btn primary block" data-close>${t.close}</button></div>`;
    else if (view === 'form') body = `<div class="in"><h2>${esc(p.name)}</h2><div class="price">${money((v ? v.price : p.price) * sel.q)}</div>
      <label class="lbl">${t.name}</label><input class="inp" id="f_name" autocomplete="name"><label class="lbl">${t.phone}</label><input class="inp" id="f_phone" inputmode="tel" autocomplete="tel"><label class="lbl">${t.city}</label><input class="inp" id="f_city" autocomplete="address-level2"><label class="lbl">${t.addr}</label><input class="inp" id="f_addr" autocomplete="street-address">
      <div class="err" id="f_err"></div><div class="acts"><button class="btn primary block" data-submit>${t.place}</button><button class="btn block" data-back>←</button></div></div>`;
    else body = `<div class="in"><h2>${esc(p.name)}</h2><div class="price">${money(v ? v.price : p.price)}</div>${p.description ? `<p style="margin:0 0 10px;color:var(--muted)">${esc(p.description)}</p>` : ''}
      ${multi ? `<div class="vs">${p.variants.map(x => `<button class="v ${x.id === sel.v ? 'on' : ''}" data-v="${x.id}" ${x.stock === 0 ? 'disabled' : ''}>${esc(x.label)}</button>`).join('')}</div>` : ''}
      ${v ? `<div class="row" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap"><span class="lbl" style="margin:0">${t.qty}</span><div class="qty"><button data-q="-1" aria-label="-">−</button><span>${sel.q}</span><button data-q="1" aria-label="+">+</button></div><span class="note" style="margin:0">${v.stock <= 3 ? t.only(v.stock) : ''}</span></div>
      <div class="acts">${DATA.shop.ai_enabled !== false ? `<button class="btn accent block" data-orderchat>${ic('chat')} ${t.orderChat}</button>` : ''}<button class="btn primary block" data-orderhere>${t.orderHere}</button>${DATA.shop.wa_number ? `<a class="btn block" href="${waLink(p, v)}" target="_blank" rel="noopener">${t.wa}</a>` : ''}</div>` : `<div class="err">${t.sold}</div>`}</div>`;
    host.innerHTML = `<div class="ov" data-ov><div class="sheet" role="dialog" aria-modal="true">${view === 'done' ? head.replace(/<img[^>]*>/, '') : head}${body}</div></div>`;
  }
  function closeSheet() { const h = $('#sheetHost'); if (h) h.remove(); open = null; document.body.style.overflow = chatOpen && window.innerWidth < 720 ? 'hidden' : ''; }
  function waLink(p, v) {
    const label = v && v.label !== 'Standard' ? ' ' + v.label : '';
    const msg = `${T().iWant(sel.q, p.name + label)} (ref: ${DATA.shop.slug}${SRC ? '~' + SRC : ''})`;
    return `https://wa.me/${DATA.shop.wa_number}?text=${encodeURIComponent(msg)}`;
  }
  async function submitOrder() {
    const t = T(); const p = open; const v = p.variants.find(x => x.id === sel.v);
    const body = { items: [{ variantId: v.id, qty: sel.q }], name: $('#f_name').value, phone: $('#f_phone').value, city: $('#f_city').value, address: $('#f_addr').value, src: SRC };
    const err = $('#f_err'); err.textContent = '';
    if (!body.name.trim() || !body.city.trim() || body.address.trim().length < 5) { err.textContent = t.missing; return; }
    const btn = $('[data-submit]'); btn.disabled = true;
    try {
      const r = await fetch(`/api/shop/${encodeURIComponent(slug)}/order`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) { btn.disabled = false; err.textContent = d.error === 'bad_phone' ? t.badPhone : d.error === 'out_of_stock' ? t.soldNow : d.error === 'missing_details' ? t.missing : t.err; return; }
      paintSheet('done', d);
      const fresh = await (await fetch(`/api/shop/${encodeURIComponent(slug)}`)).json(); DATA.products = fresh.products; paintBehind();
    } catch (_) { btn.disabled = false; err.textContent = t.err; }
  }
  function paintBehind() { const g = $('.grid'); if (g) g.innerHTML = DATA.products.filter(p => cat === 'all' || p.category === cat).map(card).join(''); }

  // ---------- chat ----------
  function paintChat() {
    const t = T(); const host = $('#chatHost'); if (!host) return;
    host.innerHTML = `<section class="chat" role="dialog" aria-label="${t.aiTitle}">
      <div class="chead"><div class="av">${esc((DATA.shop.name[0] || 'C').toUpperCase())}</div><div class="t"><b>${esc(DATA.shop.name)}</b><small>${t.aiTitle} · ${t.aiSub}</small></div>
        <button data-speak class="${chat.speak ? 'on' : ''}" title="${t.speak}" aria-label="${t.speak}">${ic('vol')}</button><button data-chat="close" aria-label="${t.close}">${ic('x')}</button></div>
      <div class="cmsgs" id="cmsgs"></div><div class="quick" id="cquick"></div>
      <div class="vbar"><span>${t.voiceLang}:</span><button class="vlang" data-vlang>${VLANGS.find(x => x[0] === chat.vlang)[1]}</button></div>
      <div class="cin"><button class="rb ${chat.rec ? 'rec' : ''}" data-mic aria-label="${t.mic}">${ic('mic')}</button><input id="cinput" placeholder="${t.typeMsg}" autocomplete="off" maxlength="600"><button class="rb send" data-send aria-label="${t.send}">${ic('send')}</button></div></section>`;
    renderMsgs(true);
    if (window.innerWidth < 720) document.body.style.overflow = 'hidden';
    setTimeout(() => { const i = $('#cinput'); if (i && window.innerWidth >= 720) i.focus(); }, 50);
  }
  const allMsgs = [];
  function renderMsgs(full) {
    const box = $('#cmsgs'); if (!box) return;
    if (full) box.innerHTML = '';
    if (!allMsgs.length && full) { const d = document.createElement('div'); d.className = 'm bot'; d.textContent = DATA.shop.welcome_msg || T().welcome; box.appendChild(d); }
    for (const m of allMsgs) { if (!full && m._drawn) continue; box.appendChild(bubble(m)); m._drawn = true; }
    box.scrollTop = box.scrollHeight;
    const last = allMsgs[allMsgs.length - 1];
    const q = $('#cquick'); if (q) {
      const chips = last && last.role !== 'me' ? (last.quick || []) : (!allMsgs.length ? DATA.products.filter(p => p.stock > 0).slice(0, 4).map(p => p.name) : []);
      q.innerHTML = ''; for (const c of chips) { const b = document.createElement('button'); b.textContent = c; b.dataset.qr = c; q.appendChild(b); }
    }
  }
  function bubble(m) {
    const d = document.createElement('div'); d.className = 'm ' + (m.role === 'customer' || m.role === 'me' ? 'me' : m.role);
    if (m.role === 'seller') { const s = document.createElement('small'); s.textContent = T().shopLabel; d.appendChild(s); }
    d.appendChild(document.createTextNode(m.text)); return d;
  }
  function pushMsgs(list, speakIt) {
    for (const m of list) {
      if (chat.shown.has(m.id)) continue; chat.shown.add(m.id); chat.last = Math.max(chat.last, m.id);
      allMsgs.push(m); if (speakIt && m.role !== 'customer') speak(m.text);
      if (!chatOpen && m.role !== 'customer') { chat.unread = true; const f = $('.fab'); if (f && !f.querySelector('.dot')) f.insertAdjacentHTML('beforeend', '<span class="dot"></span>'); }
    }
    if (chatOpen) renderMsgs(false);
  }
  async function syncChat(first) {
    if (chat.busy && !first) return;
    try {
      const r = await fetch(`/api/shop/${encodeURIComponent(slug)}/chat?sessionId=${chat.id}&after=${chat.last}&all=1`); const d = await r.json();
      const fresh = (d.messages || []).filter(m => !chat.shown.has(m.id));
      pushMsgs(fresh, !first && chat.speak && !chat.busy);
    } catch (_) {}
  }
  function typing(on) {
    const box = $('#cmsgs'); if (!box) return; let t = $('#typing');
    if (on && !t) { t = document.createElement('div'); t.id = 'typing'; t.className = 'm bot typing'; t.innerHTML = '<i></i><i></i><i></i>'; box.appendChild(t); box.scrollTop = box.scrollHeight; }
    if (!on && t) t.remove();
  }
  async function sendText(text) {
    text = (text || '').trim(); if (!text || chat.busy) return;
    chat.busy = true; const inp = $('#cinput'); if (inp) inp.value = '';
    const q = $('#cquick'); if (q) q.innerHTML = '';
    pushMsgs([{ id: -Date.now(), role: 'me', text }], false);
    typing(true);
    try {
      const r = await fetch(`/api/shop/${encodeURIComponent(slug)}/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: chat.id, text, src: SRC }) });
      const d = await r.json(); typing(false);
      if (!r.ok) { pushMsgs([{ id: -Date.now() - 1, role: 'bot', text: T().err }], false); }
      else {
        // our own optimistic bubble has a temp id; real ids come from the server
        const list = d.replies || []; pushMsgs(list, chat.speak);
        if (d.orderId) { const fr = await (await fetch(`/api/shop/${encodeURIComponent(slug)}`)).json(); DATA.products = fr.products; paintBehind(); }
      }
    } catch (_) { typing(false); pushMsgs([{ id: -Date.now() - 2, role: 'bot', text: T().err }], false); }
    chat.busy = false;
    // customer messages are stored server-side too; mark the current high-water mark so polling never duplicates
    try { const r2 = await fetch(`/api/shop/${encodeURIComponent(slug)}/chat?sessionId=${chat.id}&after=${chat.last}&all=1`); const d2 = await r2.json(); for (const m of d2.messages || []) if (m.role === 'customer') { chat.shown.add(m.id); chat.last = Math.max(chat.last, m.id); } } catch (_) {}
  }
  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    try { const u = new SpeechSynthesisUtterance(text.replace(/[✅⭐👋😊•]/g, '')); u.lang = ({ 'ar-MA': 'ar-SA', 'fr-FR': 'fr-FR', 'en-US': 'en-US' })[chat.vlang]; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (_) {}
  }
  function toggleMic() {
    if (!SR) { const b = $('.vbar'); if (b) b.insertAdjacentHTML('beforeend', `<span style="color:var(--red)">${T().noSpeech}</span>`); return; }
    if (chat.rec) { chat.rec.stop(); return; }
    const inp = $('#cinput'); const mic = $('[data-mic]'); if (mic) mic.classList.add('rec');
    const r = new SR(); r.lang = chat.vlang; r.interimResults = true; r.continuous = false; chat.rec = r;
    r.onresult = e => { let fin = '', it = ''; for (const x of e.results) (x.isFinal ? (fin += x[0].transcript) : (it += x[0].transcript)); if (inp) inp.value = fin || it; if (fin) { chat.rec = null; if (mic) mic.classList.remove('rec'); sendText(fin); } };
    r.onerror = r.onend = () => { chat.rec = null; if (mic) mic.classList.remove('rec'); };
    try { r.start(); if (inp) inp.placeholder = T().listening; } catch (_) { chat.rec = null; if (mic) mic.classList.remove('rec'); }
  }

  // ---------- events ----------
  document.addEventListener('click', e => {
    const el = e.target;
    const lang = el.closest('[data-lang]'); if (lang) { L = lang.dataset.lang; store.set('cd_shop_lang', L); chat.vlang = L === 'fr' ? 'fr-FR' : L === 'en' ? 'en-US' : 'ar-MA'; paint(); if (open) paintSheet(); return; }
    const c = el.closest('[data-cat]'); if (c) { cat = c.dataset.cat; paint(); return; }
    const p = el.closest('[data-p]'); if (p) { openProduct(Number(p.dataset.p)); return; }
    if (el.closest('[data-close]') || (el.dataset && el.dataset.ov !== undefined)) { closeSheet(); return; }
    const v = el.closest('[data-v]'); if (v && open) { sel.v = Number(v.dataset.v); sel.q = 1; paintSheet(); return; }
    const q = el.closest('[data-q]'); if (q && open) { const vv = open.variants.find(x => x.id === sel.v); sel.q = Math.max(1, Math.min(vv ? vv.stock : 1, sel.q + Number(q.dataset.q))); paintSheet(); return; }
    if (el.closest('[data-orderhere]')) { paintSheet('form'); return; }
    if (el.closest('[data-back]')) { paintSheet(); return; }
    if (el.closest('[data-submit]')) { submitOrder(); return; }
    if (el.closest('[data-orderchat]')) { const vv = open.variants.find(x => x.id === sel.v); const label = vv && vv.label !== 'Standard' ? ' ' + vv.label : ''; const msg = T().iWant(sel.q, open.name + label); closeSheet(); chatOpen = true; chat.unread = false; paint(); sendText(msg); return; }
    const co = el.closest('[data-chat]'); if (co) { chatOpen = co.dataset.chat === 'open'; chat.unread = false; if (!chatOpen) { document.body.style.overflow = ''; if (chat.rec) chat.rec.stop(); } paint(); return; }
    if (el.closest('[data-send]')) { sendText($('#cinput').value); return; }
    if (el.closest('[data-mic]')) { toggleMic(); return; }
    const qb = el.closest('[data-qr]'); if (qb) { sendText(qb.dataset.qr); return; }
    if (el.closest('[data-speak]')) { chat.speak = !chat.speak; if (!chat.speak && 'speechSynthesis' in window) speechSynthesis.cancel(); el.closest('[data-speak]').classList.toggle('on', chat.speak); return; }
    if (el.closest('[data-vlang]')) { const i = VLANGS.findIndex(x => x[0] === chat.vlang); chat.vlang = VLANGS[(i + 1) % VLANGS.length][0]; el.closest('[data-vlang]').textContent = VLANGS.find(x => x[0] === chat.vlang)[1]; return; }
  });
  // quick-reply buttons share data-q with the quantity stepper: the chat chips live in #cquick and are matched above
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.id === 'cinput') { e.preventDefault(); sendText(e.target.value); }
    if (e.key === 'Escape') { if (open) closeSheet(); else if (chatOpen) { chatOpen = false; paint(); } }
  });

  load().catch(e => { console.error(e); document.getElementById('app').innerHTML = '<div class="wrap" style="padding:60px 0;text-align:center"><p>Could not load the shop.</p></div>'; });
})();
