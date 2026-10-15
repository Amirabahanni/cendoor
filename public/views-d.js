'use strict';
// Campaigns: announcements and mass messages to customers.
(() => {
  const { t, html, raw, icon, api, toast, act, views, esc } = CD;
  const $ = (s, r = document) => r.querySelector(s);
  Object.assign(I18N.en, {
    campaigns: 'Campaigns', campSub: 'Send an announcement to your customers. You always see the audience and the exact message before anything is sent.',
    audience: 'Who should receive it?', aud_all: 'All customers', aud_vip: 'Best customers (1,500+ MAD)', aud_recent: 'Ordered in the last 30 days', aud_winback: 'No order for 60+ days', aud_new: 'First-time customers', aud_city: 'Customers in a city',
    campMessage: 'Message', campHint: 'Use {name} for the customer\'s first name. Keep it short and useful.', writeForMe: 'Write it for me', purpose_promo: 'Offer', purpose_arrivals: 'New arrivals', purpose_delivery: 'Free delivery', purpose_restock: 'Back in stock', purpose_thanks: 'Thank you', purpose_winback: 'Win-back',
    willSend: (n, x) => `Will be sent to ${n} customer(s)${x ? `. ${x} who asked to stop are left out.` : '.'}`, campSend: 'Send campaign', campConfirm: n => `Send this message to ${n} customer(s)?`, campSent: 'Campaign sent.', campQueued: n => `${n} messages are ready to send.`,
    campQueueTitle: 'Send with one tap', campQueueHint: 'WhatsApp is not connected yet, so open each chat with the message already written, and press send.', openWa: 'Open WhatsApp', campDone: 'Done', campHistory: 'Past campaigns', campNone: 'No campaign yet.',
    campRules: 'WhatsApp rules: only message customers who bought from you, include a way to stop (“Reply STOP”), and expect Meta to require approved templates for business-started messages once you connect the WhatsApp API.', optedOut: 'excluded (asked to stop)', campLimit: n => `Limit: ${n} campaigns per day.`, tooShort: 'Write a longer message first.',
  });
  Object.assign(I18N.fr, {
    campaigns: 'Campagnes', campSub: "Envoyez une annonce à vos clients. Vous voyez toujours l'audience et le message exact avant tout envoi.",
    audience: 'Qui doit la recevoir ?', aud_all: 'Tous les clients', aud_vip: 'Meilleurs clients (1 500+ MAD)', aud_recent: 'Ont commandé ces 30 derniers jours', aud_winback: 'Sans commande depuis 60+ jours', aud_new: 'Nouveaux clients', aud_city: "Clients d'une ville",
    campMessage: 'Message', campHint: "Utilisez {name} pour le prénom du client. Restez court et utile.", writeForMe: 'Écrivez-le pour moi', purpose_promo: 'Offre', purpose_arrivals: 'Nouveautés', purpose_delivery: 'Livraison gratuite', purpose_restock: 'Retour en stock', purpose_thanks: 'Remerciement', purpose_winback: 'Relance',
    willSend: (n, x) => `Sera envoyé à ${n} client(s)${x ? `. ${x} qui ont demandé l'arrêt sont exclus.` : '.'}`, campSend: 'Envoyer la campagne', campConfirm: n => `Envoyer ce message à ${n} client(s) ?`, campSent: 'Campagne envoyée.', campQueued: n => `${n} messages sont prêts à être envoyés.`,
    campQueueTitle: 'Envoi en un clic', campQueueHint: "WhatsApp n'est pas encore connecté : ouvrez chaque discussion avec le message déjà écrit, et appuyez sur envoyer.", openWa: 'Ouvrir WhatsApp', campDone: 'Fait', campHistory: 'Campagnes passées', campNone: 'Aucune campagne.',
    campRules: "Règles WhatsApp : écrivez seulement aux clients qui ont acheté chez vous, prévoyez un moyen d'arrêter (« Répondez STOP ») et attendez-vous à ce que Meta exige des modèles approuvés pour les messages initiés par l'entreprise une fois l'API connectée.", optedOut: 'exclus (arrêt demandé)', campLimit: n => `Limite : ${n} campagnes par jour.`, tooShort: "Écrivez d'abord un message plus long.",
  });
  Object.assign(I18N.ar, {
    campaigns: 'الحملات', campSub: 'أرسل إعلانا لزبناءك. ترى دائما الجمهور والرسالة بالضبط قبل أي إرسال.',
    audience: 'من يجب أن يتوصل بها؟', aud_all: 'كل الزبناء', aud_vip: 'أفضل الزبناء (1,500+ درهم)', aud_recent: 'طلبوا خلال آخر 30 يوما', aud_winback: 'بدون طلب منذ أكثر من 60 يوما', aud_new: 'زبناء جدد', aud_city: 'زبناء مدينة معينة',
    campMessage: 'الرسالة', campHint: 'استعمل {name} للاسم الأول للزبون. اجعلها قصيرة ومفيدة.', writeForMe: 'اكتبها لي', purpose_promo: 'عرض', purpose_arrivals: 'منتجات جديدة', purpose_delivery: 'توصيل مجاني', purpose_restock: 'عاد للمخزون', purpose_thanks: 'شكر', purpose_winback: 'استرجاع',
    willSend: (n, x) => `ستُرسل إلى ${n} زبون${x ? `. ${x} طلبوا التوقف ولن يتوصلوا بها.` : '.'}`, campSend: 'إرسال الحملة', campConfirm: n => `إرسال هذه الرسالة إلى ${n} زبون؟`, campSent: 'تم إرسال الحملة.', campQueued: n => `${n} رسالة جاهزة للإرسال.`,
    campQueueTitle: 'إرسال بنقرة واحدة', campQueueHint: 'واتساب غير مربوط بعد، لذلك افتح كل محادثة والرسالة مكتوبة مسبقا واضغط إرسال.', openWa: 'فتح واتساب', campDone: 'تم', campHistory: 'الحملات السابقة', campNone: 'لا توجد حملات.',
    campRules: 'قواعد واتساب: راسل فقط الزبناء الذين اشتروا منك، وأضف طريقة للإيقاف («أرسل STOP»)، وتوقع أن تطلب Meta قوالب معتمدة للرسائل التي تبدأها الشركة بعد ربط الواجهة.', optedOut: 'مستبعدون (طلبوا التوقف)', campLimit: n => `الحد: ${n} حملات في اليوم.`, tooShort: 'اكتب رسالة أطول أولا.',
  });

  let data = null, queue = null, current = { segment: 'all', arg: '', text: '' };
  views.campaigns = async main => {
    data = await api('/api/campaigns'); queue = queue && queue.id ? queue : null;
    const can = CD.can('studio');
    main.innerHTML = html`${CD.topbar(t('campaigns'))}<p class="muted" style="margin-top:-8px">${t('campSub')}</p>
      <div class="camp">
        <div class="card"><label class="f" style="margin-top:0">${t('audience')}</label>
          <select class="inp" id="c_seg" data-in="campSeg">${['all', 'vip', 'recent', 'winback', 'new'].map(s => html`<option value="${s}" ${current.segment === s ? raw('selected') : ''}>${t('aud_' + s)} (${data.counts[s]})</option>`)}<option value="city" ${current.segment === 'city' ? raw('selected') : ''}>${t('aud_city')}</option></select>
          <select class="inp ${current.segment === 'city' ? '' : 'hidden'}" id="c_city" data-in="campSeg" style="margin-top:8px">${data.cities.map(c => html`<option ${current.arg === c ? raw('selected') : ''}>${c}</option>`)}</select>
          <div class="chips" style="margin-top:14px">${data.purposes.map(p => html`<button class="chip" data-act="campDraft" data-v="${p}">${t('purpose_' + p)}</button>`)}</div>
          <label class="f">${t('campMessage')}</label><textarea class="inp" id="c_text" rows="6" maxlength="900" placeholder="…">${current.text}</textarea><div class="tiny muted">${t('campHint')}</div>
          <div class="small" id="c_info" style="margin-top:10px"></div>
          ${can ? html`<div class="row" style="margin-top:12px"><button class="btn primary" data-act="campSend">${icon('send')} ${t('campSend')}</button><button class="btn" data-act="campDraft" data-v="promo">${icon('zap')} ${t('writeForMe')}</button></div>` : html`<p class="muted small">${t('readOnly')}</p>`}
          <p class="tiny muted" style="margin-top:12px">${t('campRules')} ${t('campLimit', data.maxPerDay)}</p></div>
        <div class="stack">${queue ? queueCard() : ''}<div class="card"><h3>${t('campHistory')}</h3>${data.history.length ? data.history.map(h => html`<div class="qrow"><div class="grow"><b>${h.recipients}</b> · ${t('aud_' + h.segment)}<div class="small muted">${h.text.slice(0, 90)}${h.text.length > 90 ? '…' : ''}</div></div><div class="small muted nowrap">${CD.fmtDate(h.created_at)}</div>${h.queued ? html`<button class="btn sm" data-act="campQueue" data-id="${h.id}">${h.queued}</button>` : html`<span class="pill green">✓</span>`}</div>`) : html`<div class="empty">${t('campNone')}</div>`}</div></div>
      </div>`.s;
    refreshInfo();
    $('#c_text').addEventListener('input', e => { current.text = e.target.value; });
  };
  function queueCard() {
    return html`<div class="card"><h3>${icon('send')} ${t('campQueueTitle')}</h3><p class="small muted">${t('campQueueHint')}</p>${queue.items.length ? queue.items.map(q => html`<div class="qrow" id="q${q.id}"><div class="grow"><b>${q.name}</b><div class="small muted">${q.phone}</div></div><a class="btn sm accent" href="${q.link}" target="_blank" rel="noopener" data-act="campDone" data-id="${q.id}">${t('openWa')}</a></div>`) : html`<div class="empty">✓</div>`}</div>`;
  }
  async function refreshInfo() {
    const seg = $('#c_seg').value; const arg = seg === 'city' ? ($('#c_city').value || '') : ''; current.segment = seg; current.arg = arg;
    $('#c_city').classList.toggle('hidden', seg !== 'city');
    try { const p = await api('/api/campaigns/preview', { method: 'POST', body: { segment: seg, arg }, quiet: true }); $('#c_info').textContent = t('willSend', p.count, p.excluded); } catch (_) {}
  }
  act.in_campSeg = () => refreshInfo();
  act.campDraft = async el => { try { const r = await api('/api/campaigns/draft', { method: 'POST', body: { purpose: el.dataset.v, lang: CD.lang() } }); current.text = r.text; $('#c_text').value = r.text; } catch (_) {} };
  act.campSend = async () => {
    const text = $('#c_text').value.trim(); if (text.length < 8) { toast(t('tooShort'), true); return; }
    const p = await api('/api/campaigns/preview', { method: 'POST', body: { segment: current.segment, arg: current.arg } });
    if (!p.count) { toast(t('campNone'), true); return; }
    if (!confirm(`${t('campConfirm', p.count)}\n\n${text}`)) return;
    try {
      const r = await api('/api/campaigns/send', { method: 'POST', body: { segment: current.segment, arg: current.arg, text }, quiet: true });
      toast(r.live ? t('campSent') : t('campQueued', r.queued)); current.text = '';
      if (!r.live) { const items = await api(`/api/campaigns/${r.id}/queue`); queue = { id: r.id, items }; } else queue = null;
      CD.rerender();
    } catch (e) { toast(e.code === 'daily_limit' ? t('campLimit', data.maxPerDay) : t('error'), true); }
  };
  act.campQueue = async el => { const items = await api(`/api/campaigns/${el.dataset.id}/queue`); queue = { id: Number(el.dataset.id), items }; CD.rerender(); };
  act.campDone = async el => { const id = el.dataset.id; setTimeout(async () => { try { await api(`/api/campaigns/recipients/${id}/done`, { method: 'POST', quiet: true }); const row = document.getElementById('q' + id); if (row) row.remove(); } catch (_) {} }, 400); };
})();
