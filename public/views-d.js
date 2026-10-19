'use strict';
// Campaigns: offers and announcements to the right customers (targeting + preview + results).
(() => {
  const { t, html, raw, icon, api, toast, act, views } = CD;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  Object.assign(I18N.en, {
    campFine: 'Fine-tune who gets it (optional)', campStep2: 'What do you want to say?', campaigns: 'Campaigns', campSub: 'Send offers and announcements to the right customers. You always see who will receive it and the exact message before anything is sent.',
    audience: 'Who should receive it?', quick: 'Quick audiences', aud_all: 'All customers', aud_vip: 'Best customers', aud_recent: 'Ordered recently', aud_winback: 'Lapsed (60+ days)', aud_new: 'First-time buyers', saved: 'Saved audiences',
    fCity: 'City', fBought: 'Bought this product', fCategory: 'Bought from category', fSpend: 'Total spent (MAD)', fOrders: 'Number of orders', fLast: 'Last order', fChannel: 'Ordered from', fReliable: 'Only customers with no failed delivery', from: 'from', to: 'to', anyTime: 'Any time',
    last_w7: 'In the last 7 days', last_w30: 'In the last 30 days', last_w90: 'In the last 90 days', last_o30: 'More than 30 days ago', last_o60: 'More than 60 days ago', last_o90: 'More than 90 days ago', pickProducts: 'Choose products', filters: 'Targeting', clearAll: 'Clear all', saveAud: 'Save this audience', audName: 'Name this audience', savedOk: 'Audience saved.',
    campMessage: 'Message', campHint: 'Placeholders: {name} first name, {city}, {last_product}, {link} your shop link (tracked). Keep it short and useful.', writeForMe: 'Write it for me', purpose_promo: 'Offer', purpose_arrivals: 'New arrivals', purpose_delivery: 'Free delivery', purpose_restock: 'Back in stock', purpose_thanks: 'Thank you', purpose_winback: 'Win-back',
    willSend: (n, x) => `Will be sent to ${n} customer(s)${x ? `. ${x} who asked to stop are left out.` : '.'}`, noMatch: 'No customer matches these filters.', previewAs: 'Preview for', campSend: 'Send campaign', campConfirm: n => `Send this message to ${n} customer(s)?`, campSent: 'Campaign sent.', campQueued: n => `${n} messages are ready to send.`,
    campQueueTitle: 'Send with one tap', campQueueHint: 'WhatsApp is not connected yet, so open each chat with the message already written, and press send.', openWa: 'Open WhatsApp', campDone: 'Done', campHistory: 'Past campaigns and results', campNone: 'No campaign yet.', custom: 'Targeted', visitsN: n => `${n} visits`, ordersN: n => `${n} orders`,
    campRules: 'WhatsApp rules: only message customers who bought from you, include a way to stop (“Reply STOP”), and expect Meta to require approved templates for business-started messages once you connect the WhatsApp API.', optedOut: 'excluded (asked to stop)', campLimit: n => `Limit: ${n} campaigns per day.`, tooShort: 'Write a longer message first.',
  });
  Object.assign(I18N.fr, {
    campFine: 'Affiner les destinataires (facultatif)', campStep2: 'Que voulez-vous dire ?', campaigns: 'Campagnes', campSub: "Envoyez offres et annonces aux bons clients. Vous voyez toujours qui va recevoir le message, et le message exact, avant tout envoi.",
    audience: 'Qui doit la recevoir ?', quick: 'Audiences rapides', aud_all: 'Tous les clients', aud_vip: 'Meilleurs clients', aud_recent: 'Ont commandé récemment', aud_winback: 'Inactifs (60+ jours)', aud_new: 'Premiers achats', saved: 'Audiences enregistrées',
    fCity: 'Ville', fBought: 'Ont acheté ce produit', fCategory: 'Ont acheté dans la catégorie', fSpend: 'Total dépensé (MAD)', fOrders: 'Nombre de commandes', fLast: 'Dernière commande', fChannel: 'Commandé via', fReliable: 'Seulement sans livraison échouée', from: 'de', to: 'à', anyTime: "N'importe quand",
    last_w7: 'Ces 7 derniers jours', last_w30: 'Ces 30 derniers jours', last_w90: 'Ces 90 derniers jours', last_o30: 'Il y a plus de 30 jours', last_o60: 'Il y a plus de 60 jours', last_o90: 'Il y a plus de 90 jours', pickProducts: 'Choisir des produits', filters: 'Ciblage', clearAll: 'Tout effacer', saveAud: 'Enregistrer cette audience', audName: 'Nom de cette audience', savedOk: 'Audience enregistrée.',
    campMessage: 'Message', campHint: "Variables : {name} prénom, {city}, {last_product}, {link} lien de votre boutique (suivi). Restez court et utile.", writeForMe: 'Écrivez-le pour moi', purpose_promo: 'Offre', purpose_arrivals: 'Nouveautés', purpose_delivery: 'Livraison gratuite', purpose_restock: 'Retour en stock', purpose_thanks: 'Remerciement', purpose_winback: 'Relance',
    willSend: (n, x) => `Sera envoyé à ${n} client(s)${x ? `. ${x} qui ont demandé l'arrêt sont exclus.` : '.'}`, noMatch: 'Aucun client ne correspond à ces filtres.', previewAs: 'Aperçu pour', campSend: 'Envoyer la campagne', campConfirm: n => `Envoyer ce message à ${n} client(s) ?`, campSent: 'Campagne envoyée.', campQueued: n => `${n} messages sont prêts à être envoyés.`,
    campQueueTitle: 'Envoi en un clic', campQueueHint: "WhatsApp n'est pas encore connecté : ouvrez chaque discussion avec le message déjà écrit, et appuyez sur envoyer.", openWa: 'Ouvrir WhatsApp', campDone: 'Fait', campHistory: 'Campagnes passées et résultats', campNone: 'Aucune campagne.', custom: 'Ciblée', visitsN: n => `${n} visites`, ordersN: n => `${n} commandes`,
    campRules: "Règles WhatsApp : écrivez seulement aux clients qui ont acheté chez vous, prévoyez un moyen d'arrêter (« Répondez STOP ») et attendez-vous à ce que Meta exige des modèles approuvés pour les messages initiés par l'entreprise une fois l'API connectée.", optedOut: 'exclus (arrêt demandé)', campLimit: n => `Limite : ${n} campagnes par jour.`, tooShort: "Écrivez d'abord un message plus long.",
  });
  Object.assign(I18N.ar, {
    campFine: 'حدّد المستلمين بدقة (اختياري)', campStep2: 'ماذا تريد أن تقول؟', campaigns: 'الحملات', campSub: 'أرسل العروض والإعلانات للزبناء المناسبين. ترى دائما من سيتوصل بالرسالة والنص بالضبط قبل أي إرسال.',
    audience: 'من يجب أن يتوصل بها؟', quick: 'جماهير جاهزة', aud_all: 'كل الزبناء', aud_vip: 'أفضل الزبناء', aud_recent: 'طلبوا مؤخرا', aud_winback: 'غائبون (60+ يوما)', aud_new: 'مشترون لأول مرة', saved: 'جماهير محفوظة',
    fCity: 'المدينة', fBought: 'اشتروا هذا المنتج', fCategory: 'اشتروا من الفئة', fSpend: 'مجموع الإنفاق (درهم)', fOrders: 'عدد الطلبات', fLast: 'آخر طلب', fChannel: 'طلبوا عبر', fReliable: 'فقط من ليس لديهم توصيل فاشل', from: 'من', to: 'إلى', anyTime: 'أي وقت',
    last_w7: 'خلال آخر 7 أيام', last_w30: 'خلال آخر 30 يوما', last_w90: 'خلال آخر 90 يوما', last_o30: 'منذ أكثر من 30 يوما', last_o60: 'منذ أكثر من 60 يوما', last_o90: 'منذ أكثر من 90 يوما', pickProducts: 'اختر المنتجات', filters: 'الاستهداف', clearAll: 'مسح الكل', saveAud: 'احفظ هذا الجمهور', audName: 'اسم هذا الجمهور', savedOk: 'تم حفظ الجمهور.',
    campMessage: 'الرسالة', campHint: 'متغيرات: {name} الاسم الأول، {city}، {last_product}، {link} رابط متجرك (مُتتبَّع). اجعلها قصيرة ومفيدة.', writeForMe: 'اكتبها لي', purpose_promo: 'عرض', purpose_arrivals: 'منتجات جديدة', purpose_delivery: 'توصيل مجاني', purpose_restock: 'عاد للمخزون', purpose_thanks: 'شكر', purpose_winback: 'استرجاع',
    willSend: (n, x) => `ستُرسل إلى ${n} زبون${x ? `. ${x} طلبوا التوقف ولن يتوصلوا بها.` : '.'}`, noMatch: 'لا يوجد زبون يطابق هذه الشروط.', previewAs: 'معاينة لـ', campSend: 'إرسال الحملة', campConfirm: n => `إرسال هذه الرسالة إلى ${n} زبون؟`, campSent: 'تم إرسال الحملة.', campQueued: n => `${n} رسالة جاهزة للإرسال.`,
    campQueueTitle: 'إرسال بنقرة واحدة', campQueueHint: 'واتساب غير مربوط بعد، لذلك افتح كل محادثة والرسالة مكتوبة مسبقا واضغط إرسال.', openWa: 'فتح واتساب', campDone: 'تم', campHistory: 'الحملات السابقة ونتائجها', campNone: 'لا توجد حملات.', custom: 'مستهدفة', visitsN: n => `${n} زيارة`, ordersN: n => `${n} طلب`,
    campRules: 'قواعد واتساب: راسل فقط الزبناء الذين اشتروا منك، وأضف طريقة للإيقاف («أرسل STOP»)، وتوقع أن تطلب Meta قوالب معتمدة للرسائل التي تبدأها الشركة بعد ربط الواجهة.', optedOut: 'مستبعدون (طلبوا التوقف)', campLimit: n => `الحد: ${n} حملات في اليوم.`, tooShort: 'اكتب رسالة أطول أولا.',
  });

  let data = null, queue = null, current = {}, target = {}, text = '', lastPreview = null;
  const has = (k, v) => (target[k] || []).includes(v);
  const num = v => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= 0 ? n : undefined; };

  // Builds the filter object from the form
  function readForm() {
    const T = {}; const names = n => $$(`input[name="${n}"]:checked`).map(i => i.value);
    const cities = names('city'); if (cities.length) T.cities = cities;
    const prods = names('product').map(Number); if (prods.length) T.productIds = prods;
    const cats = names('category'); if (cats.length) T.categories = cats;
    const chans = names('channel'); if (chans.length) T.channels = chans;
    for (const [id, k] of [['f_smin', 'minSpend'], ['f_smax', 'maxSpend'], ['f_omin', 'minOrders'], ['f_omax', 'maxOrders']]) { const v = num($('#' + id).value); if (v !== undefined && !(v === 0 && k.startsWith('min'))) T[k] = v; }
    const last = $('#f_last').value; if (last) T[last[0] === 'w' ? 'lastWithin' : 'olderThan'] = Number(last.slice(1));
    if ($('#f_rel').checked) T.reliableOnly = true;
    return T;
  }
  const lastVal = () => (target.lastWithin ? 'w' + target.lastWithin : target.olderThan ? 'o' + target.olderThan : '');
  const box = (name, value, label) => html`<label class="cbx"><input type="checkbox" name="${name}" value="${value}" data-in="campT" ${has(name === 'city' ? 'cities' : name === 'product' ? 'productIds' : name === 'category' ? 'categories' : 'channels', name === 'product' ? Number(value) : value) ? raw('checked') : ''}> <span>${label}</span></label>`;

  views.campaigns = async main => {
    data = await api('/api/campaigns'); queue = queue && queue.id ? queue : null;
    const can = CD.can('studio'); const o = data.options;
    main.innerHTML = html`${CD.topbar(t('campaigns'))}<p class="muted" style="margin-top:-8px">${t('campSub')}</p>
      <div class="camp">
        <div class="card"><h3 style="margin-top:0"><span class="stepn">1</span> ${t('audience')}</h3>
          <div class="tiny muted">${t('quick')}</div>
          <div class="chips" style="margin:6px 0 4px">${['all', 'vip', 'recent', 'winback', 'new'].map(s => html`<button class="chip" data-act="campPreset" data-v="${s}">${t('aud_' + s)}<span class="n">${data.counts[s]}</span></button>`)}</div>
          ${o.saved.length ? html`<div class="tiny muted" style="margin-top:10px">${t('saved')}</div><div class="chips" style="margin-top:6px">${o.saved.map(a => html`<span class="chip"><span data-act="campSaved" data-id="${a.id}">${a.name}</span> <span data-act="campDelSaved" data-id="${a.id}" style="opacity:.6;margin-inline-start:4px" title="×">×</span></span>`)}</div>` : ''}
          <details class="more fine" ${Object.keys(target).length && !current.preset ? raw('open') : ''}><summary>${t('campFine')}</summary>
          <div class="row between"><b>${t('filters')}</b><button class="btn sm" data-act="campClear">${t('clearAll')}</button></div>
          ${o.cities.length ? html`<label class="f">${t('fCity')}</label><div class="cbxs">${o.cities.map(c => box('city', c.city, html`${c.city} <span class="muted">${c.n}</span>`))}</div>` : ''}
          ${o.products.length ? html`<label class="f">${t('fBought')}</label><details class="pickbox"${target.productIds ? raw(' open') : ''}><summary>${t('pickProducts')}${target.productIds ? ` (${target.productIds.length})` : ''}</summary><div class="cbxs" style="margin-top:8px">${o.products.map(p => box('product', p.id, p.name))}</div></details>` : ''}
          ${o.categories.length ? html`<label class="f">${t('fCategory')}</label><div class="cbxs">${o.categories.map(c => box('category', c, c))}</div>` : ''}
          <div class="grid2"><div><label class="f">${t('fSpend')}</label><div class="row" style="gap:6px"><input class="inp" id="f_smin" type="number" min="0" placeholder="${t('from')}" value="${target.minSpend ?? ''}" data-in="campT"><input class="inp" id="f_smax" type="number" min="0" placeholder="${t('to')}" value="${target.maxSpend ?? ''}" data-in="campT"></div></div>
          <div><label class="f">${t('fOrders')}</label><div class="row" style="gap:6px"><input class="inp" id="f_omin" type="number" min="0" placeholder="${t('from')}" value="${target.minOrders ?? ''}" data-in="campT"><input class="inp" id="f_omax" type="number" min="0" placeholder="${t('to')}" value="${target.maxOrders ?? ''}" data-in="campT"></div></div></div>
          <label class="f">${t('fLast')}</label><select class="inp" id="f_last" data-in="campT"><option value="">${t('anyTime')}</option>${['w7', 'w30', 'w90', 'o30', 'o60', 'o90'].map(v => html`<option value="${v}" ${lastVal() === v ? raw('selected') : ''}>${t('last_' + v)}</option>`)}</select>
          <label class="f">${t('fChannel')}</label><div class="cbxs">${o.channels.map(c => box('channel', c, c[0].toUpperCase() + c.slice(1)))}</div>
          <label class="cbx" style="margin-top:12px"><input type="checkbox" id="f_rel" data-in="campT" ${target.reliableOnly ? raw('checked') : ''}> <span>${t('fReliable')}</span></label>
          </details>
          <div class="audbox" id="c_info" aria-live="polite"></div>
          <div class="chips" style="margin-top:16px">${data.purposes.map(p => html`<button class="chip" data-act="campDraft" data-v="${p}">${t('purpose_' + p)}</button>`)}</div>
          <h3 style="margin:18px 0 8px"><span class="stepn">2</span> ${t('campStep2')}</h3><label class="f">${t('campMessage')}</label><textarea class="inp" id="c_text" rows="6" maxlength="900" placeholder="…">${text}</textarea><div class="tiny muted">${t('campHint')}</div>
          <div class="small" id="c_prev" style="margin-top:8px"></div>
          ${can ? html`<div class="row" style="margin-top:12px;flex-wrap:wrap"><button class="btn primary" data-act="campSend">${icon('send')} ${t('campSend')}</button><button class="btn" data-act="campDraft" data-v="promo">${icon('zap')} ${t('writeForMe')}</button><button class="btn" data-act="campSave">${t('saveAud')}</button></div>` : html`<p class="muted small">${t('readOnly')}</p>`}
          <p class="tiny muted" style="margin-top:12px">${t('campRules')} ${t('campLimit', data.maxPerDay)}</p></div>
        <div class="stack">${queue ? queueCard() : ''}<div class="card"><h3>${t('campHistory')}</h3>${data.history.length ? data.history.map(h => html`<div class="qrow"><div class="grow"><b>${h.recipients}</b> · ${t(h.segment && h.segment !== 'custom' && I18N.en['aud_' + h.segment] ? 'aud_' + h.segment : 'custom')}<div class="small muted">${h.text.slice(0, 90)}${h.text.length > 90 ? '…' : ''}</div><div class="tiny" style="margin-top:2px">${t('visitsN', h.visits)} · ${t('ordersN', Math.max(h.linkOrders, h.recipientOrders))} · ${CD.money(Math.max(h.linkRevenue, h.recipientRevenue))}</div></div><div class="small muted nowrap">${CD.fmtDate(h.created_at)}</div>${h.queued ? html`<button class="btn sm" data-act="campQueue" data-id="${h.id}">${h.queued}</button>` : html`<span class="pill green">✓</span>`}</div>`) : html`<div class="empty">${t('campNone')}</div>`}</div></div>
      </div>`.s;
    const ta = $('#c_text'); ta.addEventListener('input', e => { text = e.target.value; clearTimeout(ta._t); ta._t = setTimeout(refreshPreview, 400); });
    refreshInfo();
  };
  function queueCard() {
    return html`<div class="card"><h3>${icon('send')} ${t('campQueueTitle')}</h3><p class="small muted">${t('campQueueHint')}</p>${queue.items.length ? queue.items.map(q => html`<div class="qrow" id="q${q.id}"><div class="grow"><b>${q.name}</b><div class="small muted">${q.phone}</div></div><a class="btn sm accent" href="${q.link}" target="_blank" rel="noopener" data-act="campDone" data-id="${q.id}">${t('openWa')}</a></div>`) : html`<div class="empty">✓</div>`}</div>`;
  }
  async function refreshInfo() {
    target = readForm(); if (current.fromUser) current.preset = false;
    try {
      const p = await api('/api/campaigns/preview', { method: 'POST', body: { targeting: target, lang: CD.lang() }, quiet: true }); lastPreview = p;
      $('#c_info').innerHTML = ''; const d = document.createElement('div');
      d.innerHTML = '<b></b><div class="small muted"></div>'; d.firstChild.textContent = p.count ? t('willSend', p.count, p.excluded) : t('noMatch'); d.lastChild.textContent = p.summary + (p.sample.length ? ' · ' + p.sample.map(s => s.name).join(', ') : '');
      $('#c_info').appendChild(d); refreshPreview();
    } catch (_) {}
  }
  function refreshPreview() {
    const el = $('#c_prev'); if (!el) return; const s = lastPreview && lastPreview.sample[0];
    if (!s || !text.trim()) { el.textContent = ''; return; }
    const first = String(s.name || '').split(/\s+/)[0];
    const shown = text.replace(/\{name\}/g, first).replace(/\{city\}/g, s.city || '').replace(/\{last_product\}/g, s.last_product || '').replace(/\{shop\}/g, '').replace(/\{link\}/g, location.origin + '/s/…');
    el.innerHTML = ''; const b = document.createElement('div'); b.className = 'wabubble'; b.textContent = shown; const h = document.createElement('div'); h.className = 'tiny muted'; h.textContent = `${t('previewAs')} ${first}`; el.append(h, b);
  }
  const setTarget = T => { target = T || {}; CD.rerender(); };
  act.in_campT = () => { current.fromUser = true; refreshInfo(); current.fromUser = false; };
  act.campPreset = el => { current.preset = true; const P = data.options.presets[el.dataset.v] || {}; setTarget({ ...P }); };
  act.campSaved = el => { current.preset = true; const a = data.options.saved.find(x => x.id === Number(el.dataset.id)); if (a) setTarget({ ...a.targeting }); };
  act.campDelSaved = async el => { await api(`/api/campaigns/audiences/${el.dataset.id}`, { method: 'DELETE', quiet: true }); CD.rerender(); };
  act.campClear = () => setTarget({});
  act.campSave = async () => {
    const name = prompt(t('audName')); if (!name) return;
    try { await api('/api/campaigns/audiences', { method: 'POST', body: { name, targeting: readForm() }, quiet: true }); toast(t('savedOk')); CD.rerender(); } catch (_) { toast(t('error'), true); }
  };
  act.campDraft = async el => { try { const r = await api('/api/campaigns/draft', { method: 'POST', body: { purpose: el.dataset.v, lang: CD.lang() } }); text = r.text; $('#c_text').value = r.text; refreshPreview(); } catch (_) {} };
  act.campSend = async () => {
    const body = $('#c_text').value.trim(); if (body.length < 8) { toast(t('tooShort'), true); return; }
    const T = readForm(); const p = await api('/api/campaigns/preview', { method: 'POST', body: { targeting: T, lang: CD.lang() } });
    if (!p.count) { toast(t('noMatch'), true); return; }
    if (!confirm(`${t('campConfirm', p.count)}\n(${p.summary})\n\n${body}`)) return;
    try {
      const r = await api('/api/campaigns/send', { method: 'POST', body: { targeting: T, text: body }, quiet: true });
      toast(r.live ? t('campSent') : t('campQueued', r.queued)); text = '';
      if (!r.live) { const items = await api(`/api/campaigns/${r.id}/queue`); queue = { id: r.id, items }; } else queue = null;
      CD.rerender();
    } catch (e) { toast(e.code === 'daily_limit' ? t('campLimit', data.maxPerDay) : t('error'), true); }
  };
  act.campQueue = async el => { const items = await api(`/api/campaigns/${el.dataset.id}/queue`); queue = { id: Number(el.dataset.id), items }; CD.rerender(); };
  act.campDone = async el => { const id = el.dataset.id; setTimeout(async () => { try { await api(`/api/campaigns/recipients/${id}/done`, { method: 'POST', quiet: true }); const row = document.getElementById('q' + id); if (row) row.remove(); } catch (_) {} }, 400); };
})();
