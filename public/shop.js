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
      qty: 'Quantity', name: 'Full name', phone: 'Phone (06… / 07…)', city: 'City', addr: 'Full address', place: 'Place order — pay on delivery', placed: 'Order confirmed!', thanks: 'Thank you', eta: d => `Delivery in about ${d} days. Pay cash when it arrives.`, verify: 'You will get a message to confirm your order. Reply YES and we prepare it.', close: 'Close', typeMsg: 'Type a message…', listening: 'Listening…', voiceLang: 'Voice language', speak: 'Read replies aloud', all: 'All', reviews: 'reviews', welcome: 'Hello! Ask me about any product, or tell me what you want to order. You can also send a voice message.', aiTitle: 'Shop assistant', aiSub: 'Replies instantly', mic: 'Speak', send: 'Send', badPhone: 'Please enter a Moroccan mobile number (06/07…).', missing: 'Please fill in all the fields.', soldNow: 'Sorry, this item just sold out.', err: 'Something went wrong. Please try again.', iWant: (q, n) => `I want ${q} ${n}`, powered: 'Powered by', noSpeech: 'Voice input is not supported on this browser.', total: 'Total', visitor: 'You', shopLabel: 'Shop' },
    fr: { dir: 'ltr', n: 'FR', chat: 'Commander par chat', orderChat: 'Commander par chat', orderHere: 'Commander ici', wa: 'WhatsApp', sold: 'Épuisé', only: n => `Plus que ${n}`, left: 'en stock', delivery: 'Livraison partout au Maroc', cod: 'Paiement à la livraison', ai: 'Réponses instantanées, jour et nuit', free: n => `Livraison gratuite dès ${n} MAD`,
      qty: 'Quantité', name: 'Nom complet', phone: 'Téléphone (06… / 07…)', city: 'Ville', addr: 'Adresse complète', place: 'Commander — payer à la livraison', placed: 'Commande confirmée !', thanks: 'Merci', eta: d => `Livraison en environ ${d} jours. Payez en espèces à la réception.`, verify: 'Vous allez recevoir un message pour confirmer votre commande. Répondez OUI et nous la préparons.', close: 'Fermer', typeMsg: 'Écrivez un message…', listening: 'Écoute…', voiceLang: 'Langue vocale', speak: 'Lire les réponses à voix haute', all: 'Tout', reviews: 'avis', welcome: 'Bonjour ! Posez-moi vos questions sur un produit, ou dites-moi ce que vous voulez commander. Vous pouvez aussi envoyer un message vocal.', aiTitle: 'Assistant boutique', aiSub: 'Réponses instantanées', mic: 'Parler', send: 'Envoyer', badPhone: 'Saisissez un mobile marocain (06/07…).', missing: 'Veuillez remplir tous les champs.', soldNow: "Désolé, cet article vient d'être épuisé.", err: 'Une erreur est survenue. Réessayez.', iWant: (q, n) => `Je veux ${q} ${n}`, powered: 'Propulsé par', noSpeech: "La saisie vocale n'est pas disponible sur ce navigateur.", total: 'Total', visitor: 'Vous', shopLabel: 'Boutique' },
    ar: { dir: 'rtl', n: 'ع', chat: 'اطلب عبر الدردشة', orderChat: 'اطلب عبر الدردشة', orderHere: 'اطلب من هنا', wa: 'واتساب', sold: 'نفد', only: n => `باقي ${n} فقط`, left: 'متوفر', delivery: 'توصيل لكل المغرب', cod: 'الدفع عند الاستلام', ai: 'ردود فورية ليلا ونهارا', free: n => `توصيل مجاني فوق ${n} درهم`,
      qty: 'الكمية', name: 'الاسم الكامل', phone: 'الهاتف (06… / 07…)', city: 'المدينة', addr: 'العنوان الكامل', place: 'اطلب — الدفع عند الاستلام', placed: 'تم تأكيد طلبك!', thanks: 'شكرا', eta: d => `التوصيل خلال حوالي ${d} أيام. تدفع نقدا عند الاستلام.`, verify: 'ستصلك رسالة لتأكيد طلبك. أجب بنعم وسنجهزه.', close: 'إغلاق', typeMsg: 'اكتب رسالة…', listening: 'جارٍ الاستماع…', voiceLang: 'لغة الصوت', speak: 'قراءة الردود بصوت عال', all: 'الكل', reviews: 'تقييم', welcome: 'مرحبا! اسألني عن أي منتج، أو قل لي ماذا تريد أن تطلب. يمكنك أيضا إرسال رسالة صوتية.', aiTitle: 'مساعد المتجر', aiSub: 'ردود فورية', mic: 'تكلم', send: 'إرسال', badPhone: 'أدخل رقم موبايل مغربي (06/07…).', missing: 'المرجو ملء كل الحقول.', soldNow: 'عذرا، نفد هذا المنتج للتو.', err: 'حدث خطأ. حاول مجددا.', iWant: (q, n) => `بغيت ${q} ${n}`, powered: 'مدعوم من', noSpeech: 'الإدخال الصوتي غير مدعوم في هذا المتصفح.', total: 'المجموع', visitor: 'أنت', shopLabel: 'المحل' },
  };

  const X = {
    en: { shopNow: 'Shop now', sec: { products: 'Our products', featured: 'Best sellers', reviews: 'What customers say', faq: 'Questions', delivery: 'Delivery', contact: 'Get in touch', about: 'About us' }, navAbout: 'About', navFaq: 'FAQ', navContact: 'Contact', navShop: 'Shop', days: 'days', free2: n => `Free delivery above ${n} MAD`, cod2: 'Cash on delivery: pay when you receive your parcel', nation: 'We deliver all over Morocco', callUs: 'Call', mailUs: 'Email', follow: 'Follow us', noItems: 'Products are coming soon.', basedIn: c => `Based in ${c}` },
    fr: { shopNow: 'Découvrir', sec: { products: 'Nos produits', featured: 'Meilleures ventes', reviews: 'Ce que disent nos clients', faq: 'Questions fréquentes', delivery: 'Livraison', contact: 'Nous contacter', about: 'À propos' }, navAbout: 'À propos', navFaq: 'FAQ', navContact: 'Contact', navShop: 'Boutique', days: 'jours', free2: n => `Livraison gratuite dès ${n} MAD`, cod2: 'Paiement à la livraison : vous payez à la réception du colis', nation: 'Nous livrons partout au Maroc', callUs: 'Appeler', mailUs: 'E-mail', follow: 'Suivez-nous', noItems: 'Les produits arrivent bientôt.', basedIn: c => `Basés à ${c}` },
    ar: { shopNow: 'تسوق الآن', sec: { products: 'منتجاتنا', featured: 'الأكثر مبيعا', reviews: 'ماذا يقول زبناؤنا', faq: 'أسئلة شائعة', delivery: 'التوصيل', contact: 'تواصل معنا', about: 'من نحن' }, navAbout: 'من نحن', navFaq: 'الأسئلة', navContact: 'تواصل', navShop: 'المتجر', days: 'أيام', free2: n => `توصيل مجاني فوق ${n} درهم`, cod2: 'الدفع عند الاستلام: تدفع عندما يصلك طردك', nation: 'نوصل لكل المغرب', callUs: 'اتصل', mailUs: 'بريد', follow: 'تابعنا', noItems: 'المنتجات قادمة قريبا.', basedIn: c => `مقرنا في ${c}` },
  };
  for (const k of Object.keys(TXT)) Object.assign(TXT[k], X[k]);

  const UI = {
    en: { delivery: 'Delivery all over Morocco', cod: 'Pay cash on delivery', ai: 'Instant replies, day and night', quality: 'Carefully selected', navShop: 'Shop', navAbout: 'About', navReviews: 'Reviews', navFaq: 'FAQ', navContact: 'Contact', chatShort: 'Order by chat', reviews: 'reviews', reviewsTitle: 'What customers say', faqTitle: 'Questions', contactTitle: 'Get in touch', products: 'Our products', featured: 'Best sellers', about: 'About us', rating: 'Rating', ready: 'Ready to order?', powered: 'Powered by', from: 'From' },
    fr: { delivery: 'Livraison partout au Maroc', cod: 'Paiement à la livraison', ai: 'Réponses instantanées, jour et nuit', quality: 'Sélection soignée', navShop: 'Boutique', navAbout: 'À propos', navReviews: 'Avis', navFaq: 'FAQ', navContact: 'Contact', chatShort: 'Commander par chat', reviews: 'avis', reviewsTitle: 'Ce que disent nos clients', faqTitle: 'Questions fréquentes', contactTitle: 'Nous contacter', products: 'Nos produits', featured: 'Meilleures ventes', about: 'À propos', rating: 'Note', ready: 'Prêt à commander ?', powered: 'Propulsé par', from: 'Dès' },
    ar: { delivery: 'توصيل لكل المغرب', cod: 'الدفع عند الاستلام', ai: 'ردود فورية ليلا ونهارا', quality: 'اختيار بعناية', navShop: 'المتجر', navAbout: 'من نحن', navReviews: 'التقييمات', navFaq: 'الأسئلة', navContact: 'تواصل', chatShort: 'اطلب عبر الدردشة', reviews: 'تقييم', reviewsTitle: 'ماذا يقول زبناؤنا', faqTitle: 'أسئلة شائعة', contactTitle: 'تواصل معنا', products: 'منتجاتنا', featured: 'الأكثر مبيعا', about: 'من نحن', rating: 'التقييم', ready: 'جاهز للطلب؟', powered: 'مدعوم من', from: 'ابتداء من' },
  };
  let L = store.get('cd_shop_lang', null);
  if (!TXT[L]) { const nl = (navigator.language || 'en').slice(0, 2); L = nl === 'fr' ? 'fr' : nl === 'ar' ? 'ar' : 'en'; }
  const T = () => TXT[L];

  let DATA = null, cat = 'all', open = null, sel = {}, chatOpen = false;
  const chat = { id: store.get('cd_sid_' + slug, null), last: 0, shown: new Set(), speak: false, vlang: 'ar-MA', rec: null, unread: false, busy: false };
  if (!chat.id) { chat.id = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)); store.set('cd_sid_' + slug, chat.id); }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const VLANGS = [['ar-MA', 'العربية'], ['fr-FR', 'Français'], ['en-US', 'English']];

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

  // ---------- design system: one JSON document describes the whole site ----------
  const FONT_STACKS = {
    modern: 'system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans Arabic",sans-serif',
    serif: '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,"Noto Naskh Arabic","Times New Roman",serif',
    rounded: 'ui-rounded,"SF Pro Rounded",Nunito,"Varela Round","Segoe UI",system-ui,"Noto Sans Arabic",sans-serif',
    mono: 'ui-monospace,"SF Mono","Cascadia Code",Consolas,"Noto Sans Arabic",monospace',
  };
  const rgbOf = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const hexOf = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, p) => hexOf(rgbOf(a).map((v, i) => v * (1 - p) + rgbOf(b)[i] * p));
  const lum = h => { const [r, g, b] = rgbOf(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  function applyDesign(d) {
    const st = document.documentElement.style; const set = (k, v) => st.setProperty(k, v);
    const sysDark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = d.mode === 'dark' || (d.mode === 'auto' && sysDark);
    let bg = d.bg && /^#[0-9a-f]{6}$/i.test(d.bg) && (lum(d.bg) < 0.25) === dark ? d.bg : (dark ? '#0e1717' : '#faf7f2');
    let accent = d.accent; if (dark && lum(accent) < 0.18) accent = mix(accent, '#ffffff', 0.45); if (!dark && lum(accent) > 0.8) accent = mix(accent, '#000000', 0.35);
    const surface = dark ? mix(bg, '#ffffff', 0.07) : '#ffffff';
    set('--bg', bg); set('--surface', surface); set('--text', dark ? '#e8f0ee' : '#1b2a2a'); set('--muted', dark ? '#9db1b0' : '#62767a');
    set('--border', dark ? mix(bg, '#ffffff', 0.15) : mix(bg, '#000000', 0.09)); set('--gray-100', dark ? mix(bg, '#ffffff', 0.1) : mix(bg, '#000000', 0.05));
    set('--teal', accent); set('--teal-700', mix(accent, '#000000', 0.25)); set('--teal-100', dark ? mix(bg, accent, 0.28) : mix(accent, '#ffffff', 0.82)); set('--teal-50', dark ? mix(bg, accent, 0.14) : mix(accent, '#ffffff', 0.92));
    set('--orange', d.accent2); set('--orange-600', mix(d.accent2, '#000000', 0.2)); set('--orange-100', dark ? mix(bg, d.accent2, 0.25) : mix(d.accent2, '#ffffff', 0.85));
    set('--on-accent', lum(accent) > 0.5 ? '#111111' : '#ffffff'); set('--on-accent2', lum(d.accent2) > 0.5 ? '#111111' : '#ffffff');
    set('--r', d.radius + 'px'); set('--font', FONT_STACKS[d.font] || FONT_STACKS.modern); set('--cols', String(d.columns));
    document.documentElement.dataset.mode = dark ? 'dark' : 'light';
    document.body.className = `cards-${d.cards} hero-${d.hero.style}`;
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = bg;
  }

  function logoHtml(d, shop) {
    const art = d.logo.image ? `<img src="${esc(d.logo.image)}" alt="">` : `<span class="lg-e">${esc(d.logo.emoji || (shop.name[0] || 'C').toUpperCase())}</span>`;
    return `<a class="brand" href="#top">${art}${d.logo.showName ? `<span>${esc(shop.name)}</span>` : ''}</a>`;
  }
  function heroHtml(d, shop, rating) {
    const t = T(); const h = d.hero;
    const title = h.title || shop.tagline || shop.name; const sub = h.subtitle;
    const art = h.image ? `<img src="${esc(h.image)}" alt="">` : `<span class="hero-emoji">${esc(h.emoji || d.logo.emoji || '🛍️')}</span>`;
    const tags = `${shop.city ? `<span class="tag">📍 ${esc(shop.city)}</span>` : ''}${rating.avg ? `<span class="tag star">★ ${rating.avg} <span class="mut">(${rating.count} ${t.reviews})</span></span>` : ''}${shop.free_shipping_over ? `<span class="tag">🚚 ${t.free2(shop.free_shipping_over)}</span>` : ''}`;
    return `<section class="hero align-${h.align}" id="top"><div class="hero-text"><h1>${esc(title)}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}<div class="hero-actions"><a class="btn primary" href="#sec-products">${esc(h.cta || t.shopNow)}</a></div><div class="meta">${tags}</div></div>${h.style === 'minimal' ? '' : `<div class="hero-art">${art}</div>`}</section>`;
  }
  function stars(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }
  function sectionHtml(s, d, cats, list) {
    const t = T(); const title = s.title || t.sec[s.type] || '';
    const head = title ? `<h2>${esc(title)}</h2>` : '';
    switch (s.type) {
      case 'featured': { const f = (DATA.featured || []).map(id => DATA.products.find(p => p.id === id)).filter(Boolean).slice(0, 4); return f.length ? `<section class="sec" id="sec-featured">${head}<div class="grid">${f.map(card).join('')}</div></section>` : ''; }
      case 'products': return `<section class="sec" id="sec-products">${head}${cats.length > 1 ? `<div class="chips"><button class="chip ${cat === 'all' ? 'on' : ''}" data-cat="all">${t.all}</button>${cats.map(c => `<button class="chip ${cat === c ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}${list.length ? `<div class="grid">${list.map(card).join('')}</div>` : `<p class="mut">${t.noItems}</p>`}</section>`;
      case 'about': return s.body ? `<section class="sec about" id="sec-about">${head}<p class="lead">${esc(s.body)}</p></section>` : '';
      case 'reviews': {
        const own = (s.items || []).filter(i => i.text).map(i => ({ rating: 5, comment: i.text, name: i.name }));
        const real = (DATA.reviews || []).map(r => ({ rating: r.rating, comment: r.comment, name: [r.name, r.city].filter(Boolean).join(', ') }));
        const all = [...own, ...real].slice(0, 6); if (!all.length) return '';
        return `<section class="sec" id="sec-reviews">${head}<div class="rv">${all.map(r => `<div class="card rcard"><div class="st5">${stars(r.rating)}</div>${r.comment ? `<p>${esc(r.comment)}</p>` : ''}<div class="mut">${esc(r.name || '')}</div></div>`).join('')}</div></section>`;
      }
      case 'faq': return (s.items || []).length ? `<section class="sec" id="sec-faq">${head}<div class="faq">${s.items.map(i => `<details class="card"><summary>${esc(i.q)}</summary><p>${esc(i.a)}</p></details>`).join('')}</div></section>` : '';
      case 'delivery': {
        const car = (DATA.carriers || []).slice(0, 4).map(c => `<li><b>${esc(c.name)}</b> · ${esc(c.eta_days)} ${t.days}</li>`).join('');
        return `<section class="sec" id="sec-delivery">${head}<div class="card dl"><p>🚚 ${t.nation}</p><p>💵 ${t.cod2}</p>${DATA.shop.free_shipping_over ? `<p>🎁 ${t.free2(DATA.shop.free_shipping_over)}</p>` : ''}${car ? `<ul>${car}</ul>` : ''}${s.body ? `<p class="mut">${esc(s.body)}</p>` : ''}</div></section>`;
      }
      case 'contact': {
        const so = d.social; const wa = so.whatsapp || DATA.shop.wa_number; const b = [];
        if (wa) b.push(`<a class="btn" href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener">WhatsApp</a>`);
        if (so.instagram) b.push(`<a class="btn" href="https://instagram.com/${esc(so.instagram)}" target="_blank" rel="noopener">Instagram</a>`);
        if (so.tiktok) b.push(`<a class="btn" href="https://tiktok.com/@${esc(so.tiktok)}" target="_blank" rel="noopener">TikTok</a>`);
        if (so.phone) b.push(`<a class="btn" href="tel:${esc(so.phone.replace(/\s/g, ''))}">${t.callUs} ${esc(so.phone)}</a>`);
        if (so.email) b.push(`<a class="btn" href="mailto:${esc(so.email)}">${t.mailUs}</a>`);
        return b.length ? `<section class="sec" id="sec-contact">${head}<div class="contact">${b.join('')}</div></section>` : '';
      }
      case 'custom': return s.body ? `<section class="sec" id="sec-${esc(s.id)}">${head}<p class="lead">${esc(s.body)}</p></section>` : '';
      default: return '';
    }
  }


  // ---------- AI-written / generated site (sanitised on the server, rendered inside #site) ----------
  function applyVars(v) {
    const st = document.documentElement.style; const set = (k, x) => st.setProperty(k, x);
    const dark = lum(v.bg) < 0.25;
    set('--bg', v.bg); set('--surface', v.sf); set('--text', v.tx); set('--muted', v.mu); set('--border', v.ln); set('--gray-100', mix(v.bg, v.tx, 0.07));
    set('--teal', v.a); set('--teal-700', mix(v.a, '#000000', 0.25)); set('--teal-100', dark ? mix(v.bg, v.a, 0.28) : mix(v.a, '#ffffff', 0.82)); set('--teal-50', dark ? mix(v.bg, v.a, 0.14) : mix(v.a, '#ffffff', 0.92));
    set('--orange', v.a2); set('--orange-600', mix(v.a2, '#000000', 0.2)); set('--orange-100', dark ? mix(v.bg, v.a2, 0.25) : mix(v.a2, '#ffffff', 0.85));
    set('--on-accent', v['on-a']); set('--on-accent2', v['on-a2']); set('--r', v.r); set('--font', v.bf);
    document.documentElement.dataset.mode = dark ? 'dark' : 'light'; document.body.className = 'site-mode';
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = v.bg;
  }
  function tokenValues() {
    const d = DATA.design, shop = DATA.shop, t = T(); const about = d.sections.find(s => s.type === 'about') || {};
    const prices = DATA.products.flatMap(p => p.variants.map(v => v.price)); const min = prices.length ? Math.min(...prices) : 0;
    return { name: shop.name, tagline: shop.tagline || '', city: shop.city || '', about: about.body || '', hero_title: d.hero.title || shop.tagline || shop.name, hero_subtitle: d.hero.subtitle || '', cta: d.hero.cta || t.shopNow, announcement: shop.announcement || '',
      rating: DATA.rating.avg || '', review_count: DATA.rating.count || '', year: String(new Date().getFullYear()), from_price: min ? `${UI[L].from} ${Math.round(min)} MAD` : '', instagram: d.social.instagram, phone: d.social.phone, email: d.social.email, logo_emoji: d.logo.emoji };
  }
  const blockHas = {
    about: () => !!((DATA.design.sections.find(s => s.type === 'about') || {}).body) && (DATA.design.sections.find(s => s.type === 'about') || {}).enabled !== false,
    faq: () => { const s = DATA.design.sections.find(x => x.type === 'faq'); return !!(s && s.enabled && s.items.length); },
    reviews: () => { const s = DATA.design.sections.find(x => x.type === 'reviews'); return (!s || s.enabled !== false) && ((DATA.reviews || []).length > 0 || !!(s && s.items.some(i => i.text))); },
    featured: () => { const s = DATA.design.sections.find(x => x.type === 'featured'); return !!(s && s.enabled) && (DATA.featured || []).length > 0 && DATA.products.length > 8; },
    rating: () => !!DATA.rating.avg, city: () => !!DATA.shop.city,
  };
  function pcardHtml(p) {
    const t = T(); const low = p.stock > 0 && p.stock <= 3;
    return `<button class="g-pcard" data-p="${p.id}"><div class="g-pimg">${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">` : esc(p.emoji || '📦')}${p.stock === 0 ? `<span class="g-badge">${t.sold}</span>` : low ? `<span class="g-badge low">${t.only(p.stock)}</span>` : ''}</div><div class="g-pbody"><div class="g-pname">${esc(p.name)}</div><div class="g-pprice">${money(Math.min(...p.variants.map(v => v.price)))}</div></div></button>`;
  }
  function hydrateBlocks(root) {
    const t = T(), d = DATA.design, shop = DATA.shop; const cats = [...new Set(DATA.products.map(p => p.category).filter(Boolean))];
    root.querySelectorAll('[data-cd]').forEach(el => {
      const k = el.dataset.cd;
      if (k === 'announcement') { if (shop.announcement) el.innerHTML = `<div class="g-ann">${esc(shop.announcement)}</div>`; }
      else if (k === 'logo') { el.innerHTML = d.logo.image ? `<span class="g-lg"><img src="${esc(d.logo.image)}" alt=""></span>` : d.logo.emoji ? `<span class="g-lg">${esc(d.logo.emoji)}</span>` : ''; }
      else if (k === 'langs') { el.innerHTML = `<div class="g-langs">${Object.keys(TXT).map(x => `<button class="g-lang ${x === L ? 'on' : ''}" data-lang="${x}" aria-label="${x}">${TXT[x].n}</button>`).join('')}</div>`; }
      else if (k === 'categories') { el.innerHTML = cats.length > 1 ? `<div class="g-cats"><button class="g-cat ${cat === 'all' ? 'on' : ''}" data-cat="all">${t.all}</button>${cats.map(c => `<button class="g-cat ${cat === c ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''; }
      else if (k === 'products') { const lay = /^(grid|carousel|magazine|list|masonry)$/.test(el.dataset.layout) ? el.dataset.layout : 'grid'; const list = DATA.products.filter(p => cat === 'all' || p.category === cat).slice(0, Number(el.dataset.limit) || 48); el.className = `g-products g-layout-${lay}`; el.style.setProperty('--cols', String(Math.min(4, Math.max(2, Number(el.dataset.cols) || 3)))); el.innerHTML = list.length ? list.map(pcardHtml).join('') : `<p class="g-empty">${t.noItems}</p>`; }
      else if (k === 'featured') { const f = (DATA.featured || []).map(id => DATA.products.find(p => p.id === id)).filter(Boolean).slice(0, Number(el.dataset.limit) || 4); el.className = 'g-products g-layout-grid'; el.style.setProperty('--cols', '4'); el.innerHTML = f.map(pcardHtml).join(''); }
      else if (k === 'reviews') {
        const own = ((d.sections.find(s => s.type === 'reviews') || {}).items || []).filter(i => i.text).map(i => ({ rating: 5, comment: i.text, name: i.name }));
        const real = (DATA.reviews || []).map(r => ({ rating: r.rating, comment: r.comment, name: [r.name, r.city].filter(Boolean).join(', ') }));
        el.className = 'g-reviews'; el.innerHTML = [...own, ...real].slice(0, Number(el.dataset.limit) || 6).map(r => `<div class="g-review"><div class="g-stars">${stars(r.rating)}</div>${r.comment ? `<p class="g-rtext">${esc(r.comment)}</p>` : ''}<div class="g-rname">${esc(r.name || '')}</div></div>`).join('');
      }
      else if (k === 'faq') { const s = d.sections.find(x => x.type === 'faq'); el.className = 'g-faq'; el.innerHTML = ((s && s.items) || []).map(i => `<details class="g-qa"><summary>${esc(i.q)}</summary><p>${esc(i.a)}</p></details>`).join(''); }
      else if (k === 'delivery') { const car = (DATA.carriers || []).slice(0, 4).map(c => `<div class="g-dline"><b>${esc(c.name)}</b> · ${esc(c.eta_days)} ${t.days}</div>`).join(''); el.className = 'g-delivery'; el.innerHTML = `<div class="g-dline">🚚 ${t.nation}</div><div class="g-dline">💵 ${t.cod2}</div>${shop.free_shipping_over ? `<div class="g-dline">🎁 ${t.free2(shop.free_shipping_over)}</div>` : ''}${car}`; }
      else if (k === 'contact') {
        const so = d.social; const wa = so.whatsapp || shop.wa_number; const b = [];
        if (wa) b.push(`<a class="g-clink" href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener">WhatsApp</a>`);
        if (so.instagram) b.push(`<a class="g-clink" href="https://instagram.com/${esc(so.instagram)}" target="_blank" rel="noopener">Instagram</a>`);
        if (so.tiktok) b.push(`<a class="g-clink" href="https://tiktok.com/@${esc(so.tiktok)}" target="_blank" rel="noopener">TikTok</a>`);
        if (so.phone) b.push(`<a class="g-clink" href="tel:${esc(so.phone.replace(/\s/g, ''))}">${t.callUs} ${esc(so.phone)}</a>`);
        if (so.email) b.push(`<a class="g-clink" href="mailto:${esc(so.email)}">${t.mailUs}</a>`);
        el.className = 'g-contact'; el.innerHTML = b.join('');
      }
      else if (k === 'photo') { const img = el.dataset.target === 'about' ? d.aboutImage : d.hero.image; el.innerHTML = img ? `<img src="${esc(img)}" alt="">` : ''; }
    });
  }
  function paintSite() {
    const t = T(); const s = DATA.site; const shop = DATA.shop;
    document.documentElement.lang = L; document.documentElement.dir = t.dir;
    let link = document.getElementById('site-fonts'); if (!link) { link = document.createElement('link'); link.id = 'site-fonts'; link.rel = 'stylesheet'; document.head.appendChild(link); } if (link.getAttribute('href') !== s.fontsHref) link.setAttribute('href', s.fontsHref);
    let st = document.getElementById('site-css'); if (!st) { st = document.createElement('style'); st.id = 'site-css'; document.head.appendChild(st); } st.textContent = s.css;
    applyVars(s.vars);
    const tok = tokenValues(); const ui = UI[L];
    const html = s.html.replace(/\{\{([A-Za-z_.]+)\}\}/g, (m, k) => esc(k.startsWith('ui.') ? (ui[k.slice(3)] ?? '') : (tok[k] ?? '')));
    const vars = Object.entries(s.vars).map(([k, v]) => `--${k}:${v}`).join(';');
    $('#app').innerHTML = `<div id="site" style="${esc(vars)}">${html}</div>${shop.ai_enabled !== false ? `<button class="fab ${chatOpen ? 'hidden' : ''}" data-chat="open">${ic('chat')} ${t.chat}${chat.unread ? '<span class="dot"></span>' : ''}</button>` : ''}<div id="chatHost"></div>`;
    const root = $('#site');
    root.querySelectorAll('[data-if]').forEach(el => { const f = blockHas[el.dataset.if]; if (f && !f()) el.remove(); });
    hydrateBlocks(root); enhance(root);
    if (chatOpen) paintChat();
  }
  function rehydrateProducts() { const root = $('#site'); if (!root) return; hydrateBlocks(root); enhance(root); }

  // Motion and layout polish applied after the page is painted. Everything here is cosmetic: with no JS or with
  // "reduce motion" the page is complete and fully visible.
  let revealObs = null;
  function enhance(root) {
    // a grid with fewer products than columns uses only as many columns as it has products
    root.querySelectorAll('.g-layout-grid').forEach(g => { const n = g.children.length; const cols = Number(g.dataset.cols) || 4; if (n && n < cols) g.style.setProperty('--cols', n); });
    // collage hero: show product photos instead of emoji tiles
    const photos = (DATA.products || []).filter(p => p.image).map(p => p.image);
    if (photos.length) root.querySelectorAll('.g-hero-col .g-tile:not(.t0):not(.t1)').forEach((tile, i) => { const src = photos[(i + 1) % photos.length]; const em = tile.querySelector(':scope > span'); if (!em || tile.querySelector('.g-tileimg')) return; const img = document.createElement('img'); img.className = 'g-tileimg'; img.src = src; img.alt = ''; img.loading = 'lazy'; tile.prepend(img); em.style.display = 'none'; });
    // magazine layout: the last card widens so the grid never ends with a lonely card
    const mag = root.querySelector('.g-layout-magazine');
    if (mag) {
      const cs = [...mag.children]; const n = cs.length;
      if (n < 4) mag.classList.add('g-mag-s');
      else {
        const last = cs[n - 1]; let spanD = 1; const r = (n - 3) % 3; // three columns: the big card, two beside it, then rows of three
        if (r) spanD = 4 - r;
        const spanM = (n - 1) % 2 ? 2 : 1;
        last.style.setProperty('--span-d', spanD); last.style.setProperty('--span-m', spanM);
        if (spanD > 1) last.classList.add('g-wide-d'); if (spanM > 1) last.classList.add('g-wide-m');
      }
    }
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;
    if (revealObs) revealObs.disconnect();
    revealObs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revealObs.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    const items = root.querySelectorAll('.g-sechead, .g-lead, .g-pcard, .g-review, .g-qa, .g-ab-art, .g-values > *, .g-dline, .g-contact, .g-stats > *');
    let i = 0, lastTop = -1;
    items.forEach(el => { const top = Math.round(el.getBoundingClientRect().top + window.scrollY); if (top !== lastTop) { i = 0; lastTop = top; } el.style.setProperty('--d', (Math.min(i++, 5) * 0.08) + 's'); el.classList.add('rv'); revealObs.observe(el); });
    // the hero enters on load
    root.querySelectorAll('.g-hero .g-wrap > div > *, .g-hero-c > *, .g-hero-art').forEach((el, k) => { el.style.setProperty('--d', (0.05 + k * 0.09) + 's'); el.classList.add('g-in'); });
    const head = root.querySelector('.g-head'); if (head && !window.__cdScroll) { window.__cdScroll = true; addEventListener('scroll', () => { const h = document.querySelector('#site .g-head'); if (h) h.classList.toggle('g-scrolled', scrollY > 12); }, { passive: true }); }
  }

  function paint() {
    if (DATA.site) return paintSite();
    const t = T(); document.documentElement.lang = L; document.documentElement.dir = t.dir;
    const { shop, products, rating, design: d } = DATA;
    applyDesign(d);
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
    const list = products.filter(p => cat === 'all' || p.category === cat);
    const on = d.sections.filter(s => s.enabled);
    const nav = [['products', t.navShop], ['about', t.navAbout], ['faq', t.navFaq], ['contact', t.navContact]].filter(([k]) => on.some(s => s.type === k)).map(([k, n]) => `<a href="#sec-${k}">${esc(n)}</a>`).join('');
    $('#app').innerHTML = `
      ${shop.announcement ? `<div class="ann">${esc(shop.announcement)}</div>` : ''}
      <header class="top"><div class="wrap">${logoHtml(d, shop)}<nav class="nav">${nav}</nav><div class="langs">${Object.keys(TXT).map(k => `<button class="${k === L ? 'on' : ''}" data-lang="${k}" aria-label="${k}">${TXT[k].n}</button>`).join('')}</div></div></header>
      <main class="wrap">${heroHtml(d, shop, rating)}${on.map(s => sectionHtml(s, d, cats, list)).join('')}</main>
      <footer><div class="wrap">${d.footer ? `<p>${esc(d.footer)}</p>` : ''}<p class="pw">${t.powered} <a href="/" target="_blank" rel="noopener">cendoor</a></p></div></footer>
      ${shop.ai_enabled !== false ? `<button class="fab ${chatOpen ? 'hidden' : ''}" data-chat="open">${ic('chat')} ${t.chat}${chat.unread ? '<span class="dot"></span>' : ''}</button>` : ''}
      <div id="chatHost"></div>`;
    if (chatOpen) paintChat();
  }
  function card(p) {
    const t = T(); const low = p.stock > 0 && p.stock <= 3;
    return `<button class="card pcard" data-p="${p.id}"><div class="img">${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">` : esc(p.emoji || '📦')}${p.stock === 0 ? `<span class="badge">${t.sold}</span>` : low ? `<span class="badge low">${t.only(p.stock)}</span>` : ''}</div>
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
  function paintBehind() { paint(); }

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
    const c = el.closest('[data-cat]'); if (c) { cat = c.dataset.cat; if (DATA.site) rehydrateProducts(); else paint(); return; }
    const act = el.closest('#site [data-act]'); if (act) { e.preventDefault(); const a = act.dataset.act; if (a === 'chat') { chatOpen = true; chat.unread = false; paint(); } else if (a === 'shop') { const t0 = document.querySelector('#site [data-cd=products]'); if (t0) t0.scrollIntoView({ behavior: 'smooth', block: 'start' }); } else if (a === 'whatsapp' && DATA.shop.wa_number) window.open('https://wa.me/' + DATA.shop.wa_number, '_blank', 'noopener'); return; }
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
