'use strict';
// Studio: talk to your shop (or send a photo) and watch the website build itself.
(() => {
  const { t, html, raw, icon, api, toast, act, views } = CD;
  const $ = (s, r = document) => r.querySelector(s);
  Object.assign(I18N.en, { studio: 'Studio', studioSub: 'Tell the AI what you want: it builds and changes your website. Type, speak, or send a photo.', studioPlaceholder: 'Tell me what to change…', undo: 'Undo', previewTitle: 'Your shop, live', openShop: 'Open shop', thinking: 'Working…', speak: 'Speak', attach: 'Add a photo', studioPreviewToggle: 'Preview', studioChatToggle: 'Chat', studioNoAccess: 'Studio is available to admins and managers.', photoReady: 'Photo ready to send' });
  Object.assign(I18N.fr, { studio: 'Studio', studioSub: "Dites à l'IA ce que vous voulez : elle construit et modifie votre site. Écrivez, parlez ou envoyez une photo.", studioPlaceholder: 'Dites-moi quoi changer…', undo: 'Annuler', previewTitle: 'Votre boutique en direct', openShop: 'Ouvrir la boutique', thinking: 'En cours…', speak: 'Parler', attach: 'Ajouter une photo', studioPreviewToggle: 'Aperçu', studioChatToggle: 'Chat', studioNoAccess: 'Le Studio est réservé aux admins et managers.', photoReady: 'Photo prête à envoyer' });
  Object.assign(I18N.ar, { studio: 'الاستوديو', studioSub: 'قل للذكاء الاصطناعي ما تريد: يبني موقعك ويعدّله. اكتب أو تكلّم أو أرسل صورة.', studioPlaceholder: 'قل لي ماذا أغيّر…', undo: 'تراجع', previewTitle: 'متجرك مباشرة', openShop: 'فتح المتجر', thinking: 'جارٍ العمل…', speak: 'تكلم', attach: 'أضف صورة', studioPreviewToggle: 'معاينة', studioChatToggle: 'محادثة', studioNoAccess: 'الاستوديو متاح للمدراء والمسؤولين.', photoReady: 'الصورة جاهزة للإرسال' });

  let hist = [], rec = null, busy = false, tab = 'chat', state = {}, image = null;
  const previewUrl = () => `/s/${CD.state.me.shop.slug}?pv=${Date.now()}`;

  function resizeImage(file, max = 1000) {
    return new Promise((resolve, reject) => {
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => { const r = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', 0.82)); };
      img.onerror = reject; img.src = url;
    });
  }

  views.studio = async main => {
    if (!CD.can('studio')) { main.innerHTML = html`${CD.topbar(t('studio'))}<div class="card empty">${t('studioNoAccess')}</div>`.s; return; }
    hist = []; state = {}; image = null;
    main.innerHTML = html`${CD.topbar(html`${icon('zap')} ${t('studio')}`, html`<a class="btn" href="/s/${CD.state.me.shop.slug}" target="_blank" rel="noopener">${icon('ext')} ${t('openShop')}</a>`)}
      <p class="muted" style="margin-top:-8px">${t('studioSub')}</p>
      <div class="chips mb studio-tabs"><button class="chip ${tab === 'chat' ? 'on' : ''}" data-act="studioTab" data-v="chat">${t('studioChatToggle')}</button><button class="chip ${tab === 'preview' ? 'on' : ''}" data-act="studioTab" data-v="preview">${t('studioPreviewToggle')}</button></div>
      <div class="studio tab-${tab}"><div class="card studio-chat"><div class="msgs" id="smsgs"></div><div class="quick-row" id="schips"></div><div class="attach-row hidden" id="sattach"><span>📷 ${t('photoReady')}</span><button class="btn sm ghost" data-act="studioDropImage" aria-label="remove">${icon('x')}</button></div>
        <div class="composer"><label class="btn" title="${t('attach')}" aria-label="${t('attach')}" style="cursor:pointer">${icon('upload')}<input type="file" accept="image/*" id="sfile" data-in="studioFile" hidden></label><button class="btn mic" id="smic" data-act="studioMic" aria-label="${t('speak')}">${icon('mic')}</button><input class="inp grow" id="sinput" placeholder="${t('studioPlaceholder')}" autocomplete="off" maxlength="600"><button class="btn primary" data-act="studioSend" aria-label="send">${icon('send')}</button></div></div>
        <div class="card studio-prev"><div class="row between" style="margin-bottom:8px"><b>${t('previewTitle')}</b><span class="tiny muted">${CD.state.me.integrations.llm ? 'Claude' : 'Cendoor'}</span></div><iframe id="spreview" title="${t('previewTitle')}" src="${previewUrl()}"></iframe></div></div>`.s;
    $('#sinput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); send($('#sinput').value); } });
    const first = CD.pendingStudio; CD.pendingStudio = null;
    await send('help', true);
    if (first) send(first);
  };
  act.studioTab = el => { tab = el.dataset.v; document.querySelector('.studio').className = 'studio tab-' + tab; document.querySelectorAll('.studio-tabs .chip').forEach(c => c.classList.toggle('on', c.dataset.v === tab)); };
  act.in_studioFile = async el => { const f = el.files[0]; el.value = ''; if (!f) return; try { image = await resizeImage(f); $('#sattach').classList.remove('hidden'); $('#sinput').focus(); } catch (_) { toast(t('error'), true); } };
  act.studioDropImage = () => { image = null; $('#sattach').classList.add('hidden'); };

  function bubble(role, text, extra = {}) {
    const box = $('#smsgs'); if (!box) return;
    const d = document.createElement('div'); d.className = 'bub ' + (role === 'user' ? 'me' : 'ai');
    if (extra.image) { const im = document.createElement('img'); im.src = extra.image; im.className = 'bub-img'; im.alt = ''; d.appendChild(im); }
    if (text) d.appendChild(document.createTextNode(text)); box.appendChild(d);
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
    text = (text || '').trim(); if ((!text && !image) || busy) return;
    busy = true; const input = $('#sinput'); if (input && !silent) input.value = '';
    const sentImage = image; if (sentImage) { image = null; $('#sattach').classList.add('hidden'); }
    if (!silent) { bubble('user', text, { image: sentImage }); hist.push({ role: 'user', text: text || '(photo)' }); }
    const th = document.createElement('div'); th.className = 'bub ai'; th.id = 'sthink'; th.textContent = t('thinking'); $('#smsgs').appendChild(th);
    try {
      const r = await api('/api/studio', { method: 'POST', body: { text, image: sentImage || undefined, state, history: hist.slice(-8), lang: CD.lang() } });
      th.remove(); state = r.state || {};
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
