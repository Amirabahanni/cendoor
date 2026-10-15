'use strict';
// Studio: talk to your shop, watch the storefront change.
(() => {
  const { t, html, raw, icon, api, toast, act, views } = CD;
  const $ = (s, r = document) => r.querySelector(s);
  Object.assign(I18N.en, { studio: 'Studio', studioSub: 'Talk to your shop. Type or speak: the preview on the right updates instantly, and every change can be undone.', studioPlaceholder: 'Tell me what to change…', undo: 'Undo', previewTitle: 'Live preview of your shop', openShop: 'Open shop', thinking: 'Working…', speak: 'Speak', studioPreviewToggle: 'Preview', studioChatToggle: 'Chat', studioNoAccess: 'Studio is available to admins and managers.' });
  Object.assign(I18N.fr, { studio: 'Studio', studioSub: "Parlez à votre boutique. Écrivez ou dictez : l'aperçu à droite se met à jour tout de suite, et chaque changement peut être annulé.", studioPlaceholder: 'Dites-moi quoi changer…', undo: 'Annuler', previewTitle: 'Aperçu en direct de votre boutique', openShop: 'Ouvrir la boutique', thinking: 'En cours…', speak: 'Parler', studioPreviewToggle: 'Aperçu', studioChatToggle: 'Chat', studioNoAccess: 'Le Studio est réservé aux admins et managers.' });
  Object.assign(I18N.ar, { studio: 'الاستوديو', studioSub: 'تحدّث مع متجرك. اكتب أو تكلّم: المعاينة على اليمين تتحدث فورا، ويمكن التراجع عن كل تغيير.', studioPlaceholder: 'قل لي ماذا أغيّر…', undo: 'تراجع', previewTitle: 'معاينة مباشرة لمتجرك', openShop: 'فتح المتجر', thinking: 'جارٍ العمل…', speak: 'تكلم', studioPreviewToggle: 'معاينة', studioChatToggle: 'محادثة', studioNoAccess: 'الاستوديو متاح للمدراء والمسؤولين.' });

  let hist = [], rec = null, busy = false, tab = 'chat';
  const previewUrl = () => `/s/${CD.state.me.shop.slug}?pv=${Date.now()}`;

  views.studio = async main => {
    if (!CD.can('studio')) { main.innerHTML = html`${CD.topbar(t('studio'))}<div class="card empty">${t('studioNoAccess')}</div>`.s; return; }
    hist = [];
    main.innerHTML = html`${CD.topbar(html`${icon('zap')} ${t('studio')}`, html`<a class="btn" href="/s/${CD.state.me.shop.slug}" target="_blank" rel="noopener">${icon('ext')} ${t('openShop')}</a>`)}
      <p class="muted" style="margin-top:-8px">${t('studioSub')}</p>
      <div class="chips mb studio-tabs"><button class="chip ${tab === 'chat' ? 'on' : ''}" data-act="studioTab" data-v="chat">${t('studioChatToggle')}</button><button class="chip ${tab === 'preview' ? 'on' : ''}" data-act="studioTab" data-v="preview">${t('studioPreviewToggle')}</button></div>
      <div class="studio tab-${tab}"><div class="card studio-chat"><div class="msgs" id="smsgs"></div><div class="quick-row" id="schips"></div>
        <div class="composer"><button class="btn mic" id="smic" data-act="studioMic" aria-label="${t('speak')}">${icon('mic')}</button><input class="inp grow" id="sinput" placeholder="${t('studioPlaceholder')}" autocomplete="off" maxlength="600"><button class="btn primary" data-act="studioSend" aria-label="send">${icon('send')}</button></div></div>
        <div class="card studio-prev"><div class="row between" style="margin-bottom:8px"><b>${t('previewTitle')}</b><span class="tiny muted">${CD.state.me.integrations.llm ? 'Claude' : 'Cendoor'}</span></div><iframe id="spreview" title="${t('previewTitle')}" src="${previewUrl()}"></iframe></div></div>`.s;
    $('#sinput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); send($('#sinput').value); } });
    await send('help', true);
  };
  act.studioTab = el => { tab = el.dataset.v; document.querySelector('.studio').className = 'studio tab-' + tab; document.querySelectorAll('.studio-tabs .chip').forEach(c => c.classList.toggle('on', c.dataset.v === tab)); };

  function bubble(role, text, extra = {}) {
    const box = $('#smsgs'); if (!box) return;
    const d = document.createElement('div'); d.className = 'bub ' + (role === 'user' ? 'me' : 'ai'); d.textContent = text; box.appendChild(d);
    if (extra.changes && extra.changes.length) {
      const c = document.createElement('div'); c.className = 'chg';
      c.innerHTML = `<span>✓</span><span class="grow">${CD.esc(extra.changes.map(x => x.label).join(' · '))}</span><button class="btn sm" data-act="studioUndo">${CD.esc(t('undo'))}</button>`;
      box.appendChild(c);
    }
    box.scrollTop = box.scrollHeight;
  }
  function chips(list) {
    const el = $('#schips'); if (!el) return; el.innerHTML = '';
    for (const c of list || []) { const b = document.createElement('button'); b.className = 'chip'; b.textContent = c; b.dataset.act = 'studioChip'; b.dataset.v = c; el.appendChild(b); }
  }
  act.studioChip = el => send(el.dataset.v);
  act.studioSend = () => send($('#sinput').value);
  async function send(text, silent) {
    text = (text || '').trim(); if (!text || busy) return;
    busy = true; const input = $('#sinput'); if (input && !silent) input.value = '';
    if (!silent) { bubble('user', text); hist.push({ role: 'user', text }); }
    const th = document.createElement('div'); th.className = 'bub ai'; th.id = 'sthink'; th.textContent = t('thinking'); $('#smsgs').appendChild(th);
    try {
      const r = await api('/api/studio', { method: 'POST', body: { text, history: hist.slice(-8), lang: CD.lang() } });
      th.remove();
      if (r.reply) { bubble('ai', r.reply, { changes: r.changes }); hist.push({ role: 'assistant', text: r.reply }); }
      chips(r.chips && r.chips.length ? r.chips : null);
      if (r.changed) { const f = $('#spreview'); if (f) f.src = previewUrl(); CD.reloadMe().catch(() => {}); }
    } catch (_) { th.remove(); }
    busy = false;
  }
  act.studioUndo = async () => {
    try {
      const r = await api('/api/studio/undo', { method: 'POST' });
      bubble('ai', r.ok ? `↩ ${r.label}` : '—'); const f = $('#spreview'); if (f) f.src = previewUrl(); CD.reloadMe().catch(() => {});
    } catch (_) {}
  };
  act.studioMic = el => {
    if (!CD.speechSupported) { toast(t('voiceUnsupported'), true); return; }
    if (rec) { rec.stop(); return; }
    el.classList.add('rec'); const input = $('#sinput');
    rec = CD.listen(CD.speechLang(), { onInterim: s => { input.value = s; }, onFinal: s => { input.value = ''; send(s); }, onEnd: () => { rec = null; el.classList.remove('rec'); } });
    if (!rec) el.classList.remove('rec');
  };
})();
