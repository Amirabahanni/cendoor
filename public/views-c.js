'use strict';
// Studio: talk to the AI (or edit text and photos by hand) and watch the website change.
(() => {
  const { t, html, raw, icon, api, toast, act, views, esc } = CD;
  const $ = (s, r = document) => r.querySelector(s);
  Object.assign(I18N.en, {
    studio: 'Studio', studioSub: 'Describe the website you want and the AI builds it. Then change anything by talking, or edit text and photos yourself. Every change can be undone.', studioPlaceholder: 'Tell me what to change…', undo: 'Undo', previewTitle: 'Your shop, live', openShop: 'Open shop', thinking: 'Working…', speak: 'Speak', attach: 'Add a photo',
    tabChat: 'Chat', tabEdit: 'Edit text & photos', tabPreview: 'Preview', studioNoAccess: 'Studio is available to admins and managers.', photoReady: 'Photo ready to send',
    creditsLabel: 'Advanced AI credits', creditsHint: 'Basic customization (new layouts, colours, fonts, texts, photos) is unlimited and free. Advanced AI design (a page written for you by the AI) uses 1 credit per request.',
    eName: 'Shop name', eTagline: 'Tagline', eAnnounce: 'Announcement bar (empty = hidden)', eHero: 'Main banner', eHeroTitle: 'Title', eHeroSub: 'Subtitle', eHeroBtn: 'Button text', eAbout: 'About us', eAboutTitle: 'Title', eAboutText: 'Text', eFooter: 'Footer line', eSocial: 'Contact and social', eInsta: 'Instagram', eTikTok: 'TikTok', eWhats: 'WhatsApp (212…)', ePhone: 'Phone', eEmail: 'Email',
    ePhotos: 'Photos', eLogo: 'Logo', eMain: 'Main photo', eAboutPhoto: 'About photo', eReplace: 'Replace', eRemove: 'Remove', eSave: 'Save changes', eNoPhoto: 'No photo', eSaved: 'Saved. The preview is updated.', eHint: 'Photos are optional. Product photos are edited in Products.',
  });
  Object.assign(I18N.fr, {
    studio: 'Studio', studioSub: "Décrivez le site que vous voulez et l'IA le construit. Ensuite changez tout en parlant, ou modifiez textes et photos vous-même. Chaque changement peut être annulé.", studioPlaceholder: 'Dites-moi quoi changer…', undo: 'Annuler', previewTitle: 'Votre boutique en direct', openShop: 'Ouvrir la boutique', thinking: 'En cours…', speak: 'Parler', attach: 'Ajouter une photo',
    tabChat: 'Chat', tabEdit: 'Textes et photos', tabPreview: 'Aperçu', studioNoAccess: 'Le Studio est réservé aux admins et managers.', photoReady: 'Photo prête à envoyer',
    creditsLabel: 'Crédits IA avancés', creditsHint: "La personnalisation de base (nouvelles mises en page, couleurs, polices, textes, photos) est illimitée et gratuite. Le design IA avancé (une page écrite pour vous par l'IA) utilise 1 crédit par demande.",
    eName: 'Nom de la boutique', eTagline: 'Slogan', eAnnounce: "Bandeau d'annonce (vide = masqué)", eHero: 'Bannière principale', eHeroTitle: 'Titre', eHeroSub: 'Sous-titre', eHeroBtn: 'Texte du bouton', eAbout: 'À propos', eAboutTitle: 'Titre', eAboutText: 'Texte', eFooter: 'Ligne de pied de page', eSocial: 'Contact et réseaux', eInsta: 'Instagram', eTikTok: 'TikTok', eWhats: 'WhatsApp (212…)', ePhone: 'Téléphone', eEmail: 'E-mail',
    ePhotos: 'Photos', eLogo: 'Logo', eMain: 'Photo principale', eAboutPhoto: 'Photo « À propos »', eReplace: 'Remplacer', eRemove: 'Retirer', eSave: 'Enregistrer', eNoPhoto: 'Pas de photo', eSaved: "Enregistré. L'aperçu est à jour.", eHint: 'Les photos sont facultatives. Les photos de produits se modifient dans Produits.',
  });
  Object.assign(I18N.ar, {
    studio: 'الاستوديو', studioSub: 'صف الموقع الذي تريده ويبنيه الذكاء الاصطناعي. ثم غيّر أي شيء بالكلام، أو عدّل النصوص والصور بنفسك. يمكن التراجع عن كل تغيير.', studioPlaceholder: 'قل لي ماذا أغيّر…', undo: 'تراجع', previewTitle: 'متجرك مباشرة', openShop: 'فتح المتجر', thinking: 'جارٍ العمل…', speak: 'تكلم', attach: 'أضف صورة',
    tabChat: 'محادثة', tabEdit: 'النصوص والصور', tabPreview: 'معاينة', studioNoAccess: 'الاستوديو متاح للمدراء والمسؤولين.', photoReady: 'الصورة جاهزة للإرسال',
    creditsLabel: 'رصيد الذكاء المتقدم', creditsHint: 'التخصيص الأساسي (تخطيطات وألوان وخطوط ونصوص وصور جديدة) غير محدود ومجاني. التصميم المتقدم بالذكاء الاصطناعي (صفحة يكتبها لك الذكاء الاصطناعي) يستهلك رصيدا واحدا لكل طلب.',
    eName: 'اسم المتجر', eTagline: 'الشعار', eAnnounce: 'شريط الإعلان (فارغ = مخفي)', eHero: 'البانر الرئيسي', eHeroTitle: 'العنوان', eHeroSub: 'العنوان الفرعي', eHeroBtn: 'نص الزر', eAbout: 'من نحن', eAboutTitle: 'العنوان', eAboutText: 'النص', eFooter: 'سطر التذييل', eSocial: 'التواصل والشبكات', eInsta: 'إنستغرام', eTikTok: 'تيك توك', eWhats: 'واتساب (212…)', ePhone: 'الهاتف', eEmail: 'البريد',
    ePhotos: 'الصور', eLogo: 'الشعار', eMain: 'الصورة الرئيسية', eAboutPhoto: 'صورة من نحن', eReplace: 'استبدال', eRemove: 'إزالة', eSave: 'حفظ التغييرات', eNoPhoto: 'بدون صورة', eSaved: 'تم الحفظ. المعاينة محدّثة.', eHint: 'الصور اختيارية. صور المنتجات تُعدّل في المنتجات.',
  });

  let hist = [], rec = null, busy = false, tab = 'chat', state = {}, image = null, edits = {};
  const previewUrl = () => `/s/${CD.state.me.shop.slug}?pv=${Date.now()}`;
  const credits = () => (CD.state.me.shop && CD.state.me.shop.ai_credits) || 0;

  function resizeImage(file, max = 1000, q = 0.82) {
    return new Promise((resolve, reject) => {
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => { const r = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', q)); };
      img.onerror = reject; img.src = url;
    });
  }
  const field = (id, label, val = '', type = 'text') => html`<label class="f">${label}</label><input class="inp" id="${id}" type="${type}" value="${val}">`;

  views.studio = async main => {
    if (!CD.can('studio')) { main.innerHTML = html`${CD.topbar(t('studio'))}<div class="card empty">${t('studioNoAccess')}</div>`.s; return; }
    hist = []; state = {}; image = null; edits = {};
    main.innerHTML = html`${CD.topbar(html`${icon('zap')} ${t('studio')}`, html`<span class="credits" title="${t('creditsHint')}">⚡ ${t('creditsLabel')}: <b id="credN">${credits()}</b></span><a class="btn" href="/s/${CD.state.me.shop.slug}" target="_blank" rel="noopener">${icon('ext')} ${t('openShop')}</a>`)}
      <p class="muted" style="margin-top:-8px">${t('studioSub')}</p>
      <div class="chips mb studio-tabs"><button class="chip ${tab === 'chat' ? 'on' : ''}" data-act="studioTab" data-v="chat">${t('tabChat')}</button><button class="chip ${tab === 'edit' ? 'on' : ''}" data-act="studioTab" data-v="edit">${t('tabEdit')}</button><button class="chip prevtab ${tab === 'preview' ? 'on' : ''}" data-act="studioTab" data-v="preview">${t('tabPreview')}</button></div>
      <div class="studio tab-${tab}">
        <div class="card studio-chat"><div class="msgs" id="smsgs"></div><div class="quick-row" id="schips"></div><div class="attach-row hidden" id="sattach"><span>📷 ${t('photoReady')}</span><button class="btn sm ghost" data-act="studioDropImage" aria-label="remove">${icon('x')}</button></div>
          <div class="composer"><label class="btn" title="${t('attach')}" aria-label="${t('attach')}" style="cursor:pointer">${icon('upload')}<input type="file" accept="image/*" id="sfile" data-in="studioFile" hidden></label><button class="btn mic" id="smic" data-act="studioMic" aria-label="${t('speak')}">${icon('mic')}</button><input class="inp grow" id="sinput" placeholder="${t('studioPlaceholder')}" autocomplete="off" maxlength="600"><button class="btn primary" data-act="studioSend" aria-label="send">${icon('send')}</button></div></div>
        <div class="card studio-edit" id="sedit"><div class="skeleton"></div></div>
        <div class="card studio-prev"><div class="row between" style="margin-bottom:8px"><b>${t('previewTitle')}</b><span class="tiny muted">${CD.state.me.integrations.llm ? 'Claude' : 'Cendoor'}</span></div><iframe id="spreview" title="${t('previewTitle')}" src="${previewUrl()}"></iframe></div></div>`.s;
    $('#sinput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); send($('#sinput').value); } });
    const first = CD.pendingStudio; CD.pendingStudio = null;
    await send('help', true);
    if (first) send(first);
    if (tab === 'edit') loadEdit();
  };
  act.studioTab = el => { tab = el.dataset.v; document.querySelector('.studio').className = 'studio tab-' + tab; document.querySelectorAll('.studio-tabs .chip').forEach(c => c.classList.toggle('on', c.dataset.v === tab)); if (tab === 'edit') loadEdit(); };

  // ---------- edit text & photos by hand (free) ----------
  async function loadEdit() {
    const c = await api('/api/site/content'); edits = {};
    const slot = (key, label, url) => html`<div class="imgslot" data-slot="${key}"><div class="th">${url ? html`<img src="${url}" alt="">` : '🖼️'}</div><div class="grow"><b>${label}</b><div class="small muted slotstate">${url ? '' : t('eNoPhoto')}</div></div>
      <label class="btn sm">${t('eReplace')}<input type="file" accept="image/*" data-in="editPhoto" data-key="${key}" hidden></label><button class="btn sm ghost" data-act="editRemove" data-key="${key}">${t('eRemove')}</button></div>`;
    $('#sedit').innerHTML = html`<h4>${t('eName')}</h4>${field('e_name', t('eName'), c.name)}${field('e_tagline', t('eTagline'), c.tagline)}${field('e_announce', t('eAnnounce'), c.announcement)}
      <h4>${t('eHero')}</h4>${field('e_htitle', t('eHeroTitle'), c.hero.title)}${field('e_hsub', t('eHeroSub'), c.hero.subtitle)}${field('e_hcta', t('eHeroBtn'), c.hero.cta)}
      <h4>${t('eAbout')}</h4>${field('e_atitle', t('eAboutTitle'), c.about.title)}<label class="f">${t('eAboutText')}</label><textarea class="inp" id="e_abody" rows="4">${c.about.body}</textarea>${field('e_footer', t('eFooter'), c.footer)}
      <h4>${t('eSocial')}</h4>${field('e_ig', t('eInsta'), c.social.instagram)}${field('e_tt', t('eTikTok'), c.social.tiktok)}${field('e_wa', t('eWhats'), c.social.whatsapp)}${field('e_phone', t('ePhone'), c.social.phone)}${field('e_email', t('eEmail'), c.social.email)}
      <h4>${t('ePhotos')}</h4>${slot('logo', t('eLogo'), c.logo.image)}${slot('hero', t('eMain'), c.hero.image)}${slot('about', t('eAboutPhoto'), c.about.image)}<p class="tiny muted">${t('eHint')}</p>
      <button class="btn primary block mt" data-act="editSave">${icon('check')} ${t('eSave')}</button>`.s;
  }
  act.in_editPhoto = async el => {
    const f = el.files[0]; el.value = ''; if (!f) return; const key = el.dataset.key;
    try { const data = await resizeImage(f, key === 'logo' ? 500 : 1400); edits[key] = data; const s = document.querySelector(`.imgslot[data-slot=${key}]`); s.querySelector('.th').innerHTML = `<img src="${data}" alt="">`; s.querySelector('.slotstate').textContent = '●'; }
    catch (_) { toast(t('error'), true); }
  };
  act.editRemove = el => { const key = el.dataset.key; edits[key] = ''; const s = document.querySelector(`.imgslot[data-slot=${key}]`); s.querySelector('.th').textContent = '🖼️'; s.querySelector('.slotstate').textContent = t('eNoPhoto'); };
  act.editSave = async () => {
    const v = id => $('#' + id).value;
    const body = { name: v('e_name'), tagline: v('e_tagline'), announcement: v('e_announce'), hero: { title: v('e_htitle'), subtitle: v('e_hsub'), cta: v('e_hcta') }, about: { title: v('e_atitle'), body: v('e_abody') }, footer: v('e_footer'), social: { instagram: v('e_ig'), tiktok: v('e_tt'), whatsapp: v('e_wa'), phone: v('e_phone'), email: v('e_email') }, images: edits };
    try { await api('/api/site/content', { method: 'PUT', body }); edits = {}; toast(t('eSaved')); const f = $('#spreview'); if (f) f.src = previewUrl(); CD.reloadMe().catch(() => {}); } catch (_) {}
  };

  // ---------- chat ----------
  act.in_studioFile = async el => { const f = el.files[0]; el.value = ''; if (!f) return; try { image = await resizeImage(f); $('#sattach').classList.remove('hidden'); $('#sinput').focus(); } catch (_) { toast(t('error'), true); } };
  act.studioDropImage = () => { image = null; $('#sattach').classList.add('hidden'); };
  function bubble(role, text, extra = {}) {
    const box = $('#smsgs'); if (!box) return;
    const d = document.createElement('div'); d.className = 'bub ' + (role === 'user' ? 'me' : 'ai');
    if (extra.image) { const im = document.createElement('img'); im.src = extra.image; im.className = 'bub-img'; im.alt = ''; d.appendChild(im); }
    if (text) d.appendChild(document.createTextNode(text)); box.appendChild(d);
    if (extra.changes && extra.changes.length) {
      const c = document.createElement('div'); c.className = 'chg';
      c.innerHTML = `<span>✓</span><span class="grow">${esc(extra.changes.map(x => x.label).join(' · '))}</span><button class="btn sm" data-act="studioUndo">${esc(t('undo'))}</button>`;
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
      if (r.credits !== undefined) { const n = $('#credN'); if (n) n.textContent = r.credits; if (CD.state.me.shop) CD.state.me.shop.ai_credits = r.credits; }
      if (r.changed) { const f = $('#spreview'); if (f) f.src = previewUrl(); CD.reloadMe().catch(() => {}); if (tab === 'edit') loadEdit(); }
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
