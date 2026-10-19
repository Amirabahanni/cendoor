'use strict';
// Ads: connect your own Meta ad account, review an ad, launch it with one confirmed click, see what it really brought in.
(() => {
  const { t, html, raw, icon, api, toast, act, views } = CD;
  const $ = (s, r = document) => r.querySelector(s);
  Object.assign(I18N.en, {
    ads: 'Ads', adsSub: 'Turn a product into an ad in a minute. You see the ad and the exact budget before anything is sent, and you pay Meta directly from your own ad account.',
    adsConnect: 'Your Meta ad account', adsNotConnected: 'Not connected yet. Connect the ad account you already use (or a demo one to try the flow).', adsConnectMeta: 'Connect with Facebook', adsConnectDemo: 'Try with a demo account', adsDisconnect: 'Disconnect',
    adsDemoMode: 'Demo mode: nothing is sent to Meta', adsLiveMode: 'Live', adsAdvanced: 'Connect with an access token (pilot sellers)', adsToken: 'Access token', adsAcct: 'Ad account ID', adsPage: 'Facebook Page ID', adsSaveConn: 'Verify and connect',
    adsMetaNote: 'Connecting needs a Meta app approved by Meta for other people’s accounts. Until then only people added to the app can connect.', adsConnected: 'Connected.', adsConnFail: 'Could not connect. Check the details.',
    adsNew: 'Launch an ad', adsProduct: 'Product', adsOffer: 'Offer (optional)', adsOfferHint: 'For example: free delivery this weekend. Only write what is true.', adsWrite: 'Write the ad', adsHeadline: 'Headline', adsText: 'Ad text', adsDaily: 'Daily budget (MAD)', adsDays: 'Days',
    adsSpend: (d, n, t2) => `You will spend up to ${t2} MAD (${d} MAD a day for ${n} days), paid to Meta from your own ad account.`, adsPreview: 'How it looks', adsLaunch: 'Launch ad', adsLaunchConfirm: (t2, d, n) => `Launch this ad?\n\nUp to ${t2} MAD (${d} MAD a day for ${n} days), charged by Meta to your ad account.`,
    adsLaunched: 'Ad sent to Meta. Meta reviews every ad before it runs, usually within hours.', adsDry: 'Dry run saved. Nothing was sent to Meta.', adsPause: 'Pause', adsPaused: 'Paused.', adsResults: 'Your ads and what they brought in',
    adsNone: 'No ad yet.', adsVisits: n => `${n} visits`, adsOrders: n => `${n} orders`, adsDelivered: n => `${n} delivered`, adsRevenue: 'Delivered revenue', adsBudgetSoFar: 'Budget used so far', adsReturn: 'Return on budget', adsReturnHint: 'Counts only delivered orders, against the budget that has run so far (not Meta’s billed spend).',
    st_active: 'Running', st_dry_run: 'Demo', st_paused: 'Paused', st_failed: 'Failed', st_creating: 'Creating',
    adsRules: 'Limits: 20 to 300 MAD a day, up to 14 days, up to 2,000 MAD in total, up to 3 running ads. Meta reviews every ad and can reject it. Do not promise what you cannot deliver.',
    e_budget_range: 'The daily budget must be between 20 and 300 MAD.', e_days_range: 'Choose between 1 and 14 days.', e_total_cap: 'The total budget cannot be more than 2,000 MAD.', e_copy_too_short: 'Write a headline and a longer ad text first.', e_not_connected: 'Connect your ad account first.', e_too_many_active: 'You already have 3 running ads.', e_daily_limit: 'Daily limit reached. Try again tomorrow.', e_public_url_required: 'The shop link is not public yet, so the ad has nowhere to send people.', e_meta_error: 'Meta refused it. Nothing is running; see the ad for details.', e_currency_unsupported: 'This ad account currency is not supported yet.',
  });
  Object.assign(I18N.fr, {
    ads: 'Pubs', adsSub: 'Transformez un produit en pub en une minute. Vous voyez la pub et le budget exact avant tout envoi, et vous payez Meta directement depuis votre propre compte publicitaire.',
    adsConnect: 'Votre compte publicitaire Meta', adsNotConnected: "Pas encore connecté. Connectez le compte publicitaire que vous utilisez déjà (ou un compte de démonstration pour essayer).", adsConnectMeta: 'Se connecter avec Facebook', adsConnectDemo: 'Essayer avec un compte démo', adsDisconnect: 'Déconnecter',
    adsDemoMode: "Mode démo : rien n'est envoyé à Meta", adsLiveMode: 'Réel', adsAdvanced: "Connexion par jeton d'accès (vendeurs pilotes)", adsToken: "Jeton d'accès", adsAcct: 'ID du compte publicitaire', adsPage: 'ID de la Page Facebook', adsSaveConn: 'Vérifier et connecter',
    adsMetaNote: "La connexion de comptes tiers demande une app Meta approuvée par Meta. D'ici là, seules les personnes ajoutées à l'app peuvent se connecter.", adsConnected: 'Connecté.', adsConnFail: 'Connexion impossible. Vérifiez les informations.',
    adsNew: 'Lancer une pub', adsProduct: 'Produit', adsOffer: 'Offre (facultatif)', adsOfferHint: "Par exemple : livraison gratuite ce week-end. N'écrivez que ce qui est vrai.", adsWrite: 'Écrire la pub', adsHeadline: 'Titre', adsText: 'Texte de la pub', adsDaily: 'Budget par jour (MAD)', adsDays: 'Jours',
    adsSpend: (d, n, t2) => `Vous dépenserez jusqu'à ${t2} MAD (${d} MAD par jour pendant ${n} jours), payés à Meta depuis votre compte publicitaire.`, adsPreview: 'Aperçu', adsLaunch: 'Lancer la pub', adsLaunchConfirm: (t2, d, n) => `Lancer cette pub ?\n\nJusqu'à ${t2} MAD (${d} MAD par jour pendant ${n} jours), facturés par Meta à votre compte publicitaire.`,
    adsLaunched: "Pub envoyée à Meta. Meta examine chaque pub avant diffusion, en général en quelques heures.", adsDry: "Simulation enregistrée. Rien n'a été envoyé à Meta.", adsPause: 'Pause', adsPaused: 'En pause.', adsResults: 'Vos pubs et ce qu\'elles ont rapporté',
    adsNone: 'Aucune pub.', adsVisits: n => `${n} visites`, adsOrders: n => `${n} commandes`, adsDelivered: n => `${n} livrées`, adsRevenue: 'Chiffre livré', adsBudgetSoFar: 'Budget consommé', adsReturn: 'Retour sur budget', adsReturnHint: "Ne compte que les commandes livrées, face au budget déjà écoulé (pas les dépenses facturées par Meta).",
    st_active: 'En cours', st_dry_run: 'Démo', st_paused: 'En pause', st_failed: 'Échec', st_creating: 'Création',
    adsRules: "Limites : 20 à 300 MAD par jour, 14 jours maximum, 2 000 MAD au total, 3 pubs actives. Meta examine chaque pub et peut la refuser. Ne promettez que ce que vous pouvez tenir.",
    e_budget_range: 'Le budget quotidien doit être entre 20 et 300 MAD.', e_days_range: 'Choisissez entre 1 et 14 jours.', e_total_cap: 'Le budget total ne peut pas dépasser 2 000 MAD.', e_copy_too_short: "Écrivez d'abord un titre et un texte plus long.", e_not_connected: "Connectez d'abord votre compte publicitaire.", e_too_many_active: 'Vous avez déjà 3 pubs en cours.', e_daily_limit: "Limite du jour atteinte. Réessayez demain.", e_public_url_required: "Le lien de la boutique n'est pas encore public, la pub n'aurait nulle part où envoyer les gens.", e_meta_error: "Meta a refusé. Rien ne tourne ; voyez le détail sur la pub.", e_currency_unsupported: "La devise de ce compte publicitaire n'est pas encore prise en charge.",
  });
  Object.assign(I18N.ar, {
    ads: 'الإعلانات', adsSub: 'حوّل منتجا إلى إعلان في دقيقة. ترى الإعلان والميزانية بالضبط قبل أي إرسال، وتدفع لـ Meta مباشرة من حسابك الإعلاني.',
    adsConnect: 'حسابك الإعلاني على Meta', adsNotConnected: 'غير مربوط بعد. اربط الحساب الإعلاني الذي تستعمله (أو حساب تجريبي لتجربة الخطوات).', adsConnectMeta: 'الربط عبر فيسبوك', adsConnectDemo: 'جرّب بحساب تجريبي', adsDisconnect: 'فصل',
    adsDemoMode: 'وضع تجريبي: لا يُرسل شيء إلى Meta', adsLiveMode: 'حقيقي', adsAdvanced: 'الربط برمز الوصول (للبائعين التجريبيين)', adsToken: 'رمز الوصول', adsAcct: 'معرّف الحساب الإعلاني', adsPage: 'معرّف صفحة فيسبوك', adsSaveConn: 'تحقق واربط',
    adsMetaNote: 'ربط حسابات الآخرين يحتاج تطبيقا موافقا عليه من Meta. إلى ذلك الحين يستطيع الربط فقط من أُضيفوا إلى التطبيق.', adsConnected: 'تم الربط.', adsConnFail: 'تعذر الربط. تحقق من المعلومات.',
    adsNew: 'أطلق إعلانا', adsProduct: 'المنتج', adsOffer: 'العرض (اختياري)', adsOfferHint: 'مثلا: توصيل مجاني نهاية الأسبوع. اكتب فقط ما هو صحيح.', adsWrite: 'اكتب الإعلان', adsHeadline: 'العنوان', adsText: 'نص الإعلان', adsDaily: 'الميزانية اليومية (درهم)', adsDays: 'الأيام',
    adsSpend: (d, n, t2) => `ستنفق حتى ${t2} درهم (${d} درهم يوميا لمدة ${n} أيام)، تدفعها لـ Meta من حسابك الإعلاني.`, adsPreview: 'المعاينة', adsLaunch: 'أطلق الإعلان', adsLaunchConfirm: (t2, d, n) => `إطلاق هذا الإعلان؟\n\nحتى ${t2} درهم (${d} درهم يوميا لمدة ${n} أيام)، تخصمها Meta من حسابك الإعلاني.`,
    adsLaunched: 'أُرسل الإعلان إلى Meta. تراجع Meta كل إعلان قبل عرضه، عادة خلال ساعات.', adsDry: 'تم حفظ تجربة. لم يُرسل شيء إلى Meta.', adsPause: 'إيقاف مؤقت', adsPaused: 'تم الإيقاف.', adsResults: 'إعلاناتك وما حققته',
    adsNone: 'لا توجد إعلانات.', adsVisits: n => `${n} زيارة`, adsOrders: n => `${n} طلب`, adsDelivered: n => `${n} مُسلّم`, adsRevenue: 'المبيعات المُسلّمة', adsBudgetSoFar: 'الميزانية المستهلكة', adsReturn: 'العائد على الميزانية', adsReturnHint: 'يحسب فقط الطلبات المُسلّمة مقابل الميزانية التي مرّت (وليس ما تحاسبك عليه Meta).',
    st_active: 'يعمل', st_dry_run: 'تجريبي', st_paused: 'متوقف', st_failed: 'فشل', st_creating: 'قيد الإنشاء',
    adsRules: 'الحدود: من 20 إلى 300 درهم يوميا، حتى 14 يوما، حتى 2000 درهم إجمالا، حتى 3 إعلانات نشطة. تراجع Meta كل إعلان وقد ترفضه. لا تعد بما لا تستطيع تقديمه.',
    e_budget_range: 'يجب أن تكون الميزانية اليومية بين 20 و300 درهم.', e_days_range: 'اختر بين 1 و14 يوما.', e_total_cap: 'لا يمكن أن تتجاوز الميزانية الإجمالية 2000 درهم.', e_copy_too_short: 'اكتب عنوانا ونصا أطول أولا.', e_not_connected: 'اربط حسابك الإعلاني أولا.', e_too_many_active: 'لديك 3 إعلانات نشطة بالفعل.', e_daily_limit: 'بلغت الحد اليومي. حاول غدا.', e_public_url_required: 'رابط المتجر ليس عاما بعد، فلا وجهة للإعلان.', e_meta_error: 'رفضت Meta الطلب. لا شيء يعمل؛ راجع تفاصيل الإعلان.', e_currency_unsupported: 'عملة هذا الحساب الإعلاني غير مدعومة بعد.',
  });

  let data = null, form = { product_id: '', offer: '', headline: '', text: '', daily: 50, days: 3 };
  const query = () => new URLSearchParams((location.hash.split('?')[1]) || '');
  views.ads = async main => {
    data = await api('/api/ads'); const can = CD.can('studio'); const c = data.connection; const q = query();
    if (!form.product_id && data.products[0]) form.product_id = String(data.products[0].id);
    const prod = data.products.find(p => String(p.id) === String(form.product_id));
    main.innerHTML = html`${CD.topbar(t('ads'))}<p class="muted" style="margin-top:-8px">${t('adsSub')}</p>
      <div class="camp">
        <div class="stack">
          <div class="card"><h3 style="margin-top:0">${t('adsConnect')}</h3>
            ${c ? html`<div><b>${c.name || c.ad_account_id}</b><div class="small muted">${c.ad_account_id} · ${c.currency}</div><div style="margin-top:6px"><span class="pill ${c.mode === 'demo' ? '' : 'green'}">${c.mode === 'demo' ? t('adsDemoMode') : t('adsLiveMode')}</span></div></div>
              ${can ? html`<div class="row" style="margin-top:10px"><button class="btn sm" data-act="adsDisconnect">${t('adsDisconnect')}</button></div>` : ''}`
        : html`<p class="small muted">${t('adsNotConnected')}</p>
              ${can ? html`<div class="row wrap" style="margin-top:8px">${data.oauth ? html`<a class="btn primary" href="/api/ads/connect/meta">${t('adsConnectMeta')}</a>` : ''}<button class="btn ${data.oauth ? '' : 'primary'}" data-act="adsDemo">${t('adsConnectDemo')}</button></div>
              <details class="pickbox" style="margin-top:12px"><summary>${t('adsAdvanced')}</summary>
                <label class="f">${t('adsAcct')}</label><input class="inp" id="a_acct" placeholder="act_123456789" autocomplete="off">
                <label class="f">${t('adsPage')}</label><input class="inp" id="a_page" placeholder="123456789012345" autocomplete="off">
                <label class="f">${t('adsToken')}</label><input class="inp" id="a_token" type="password" autocomplete="off">
                <div class="row" style="margin-top:10px"><button class="btn" data-act="adsManual">${t('adsSaveConn')}</button></div></details>` : ''}
              <p class="tiny muted" style="margin-top:10px">${t('adsMetaNote')}</p>`}
            ${q.get('connect') ? html`<p class="small" style="margin-top:8px">${q.get('connect') === 'ok' ? t('adsConnected') : t('adsConnFail')}</p>` : ''}
          </div>
          <div class="card ${c ? '' : 'faded'}"><h3 style="margin-top:0">${t('adsNew')}</h3>
            <label class="f">${t('adsProduct')}</label><select class="inp" id="a_prod" data-in="adsForm">${data.products.map(p => html`<option value="${p.id}" ${String(p.id) === String(form.product_id) ? raw('selected') : ''}>${p.name}</option>`)}</select>
            <label class="f">${t('adsOffer')}</label><input class="inp" id="a_offer" maxlength="60" value="${form.offer}" data-in="adsForm"><div class="tiny muted">${t('adsOfferHint')}</div>
            <div class="row" style="margin-top:10px"><button class="btn" data-act="adsDraft">${icon('zap')} ${t('adsWrite')}</button></div>
            <label class="f">${t('adsHeadline')}</label><input class="inp" id="a_head" maxlength="40" value="${form.headline}" data-in="adsForm">
            <label class="f">${t('adsText')}</label><textarea class="inp" id="a_text" rows="4" maxlength="300" data-in="adsForm">${form.text}</textarea>
            <div class="grid2"><div><label class="f">${t('adsDaily')}</label><input class="inp" id="a_daily" type="number" min="${data.limits.dailyMin}" max="${data.limits.dailyMax}" value="${form.daily}" data-in="adsForm"></div>
              <div><label class="f">${t('adsDays')}</label><input class="inp" id="a_days" type="number" min="1" max="${data.limits.daysMax}" value="${form.days}" data-in="adsForm"></div></div>
            <div class="audbox" id="a_sum"></div>
            <label class="f">${t('adsPreview')}</label><div class="adprev" id="a_prev"></div>
            ${can ? html`<div class="row" style="margin-top:12px"><button class="btn primary" data-act="adsLaunch" ${c ? '' : raw('disabled')}>${icon('send')} ${t('adsLaunch')}</button></div>` : html`<p class="muted small">${t('readOnly')}</p>`}
            <p class="tiny muted" style="margin-top:10px">${t('adsRules')}</p>
          </div>
        </div>
        <div class="stack"><div class="card"><h3>${t('adsResults')}</h3>${data.ads.length ? data.ads.map(a => html`<div class="qrow" style="align-items:flex-start"><div class="grow"><b>${a.headline}</b> <span class="pill ${a.status === 'active' ? 'green' : ''}">${t('st_' + a.status)}</span>
          <div class="small muted">${a.product_name || ''} · ${a.daily_budget} MAD × ${a.days}</div>
          <div class="tiny" style="margin-top:2px">${t('adsVisits', a.visits)} · ${t('adsOrders', a.orders)} · ${t('adsDelivered', a.delivered)} · ${t('adsRevenue')}: ${CD.money(a.delivered_revenue)}</div>
          ${a.mode === 'live' ? html`<div class="tiny muted">${t('adsBudgetSoFar')}: ${CD.money(a.budget_so_far)}${a.real_return != null ? html` · ${t('adsReturn')}: <b>${a.real_return}×</b>` : ''}</div>` : ''}
          ${a.error ? html`<div class="tiny" style="color:var(--danger,#b42318)">${a.error}</div>` : ''}</div>
          ${can && (a.status === 'active' || a.status === 'dry_run') ? html`<button class="btn sm" data-act="adsPause" data-id="${a.id}">${t('adsPause')}</button>` : ''}</div>`) : html`<div class="empty">${t('adsNone')}</div>`}
          ${data.ads.some(a => a.mode === 'live') ? html`<p class="tiny muted">${t('adsReturnHint')}</p>` : ''}</div></div>
      </div>`.s;
    update();
  };
  function read() {
    form = { product_id: $('#a_prod').value, offer: $('#a_offer').value, headline: $('#a_head').value, text: $('#a_text').value, daily: Number($('#a_daily').value) || 0, days: Number($('#a_days').value) || 0 };
    return form;
  }
  function update() {
    const f = read(); const prod = data.products.find(p => String(p.id) === String(f.product_id)); const total = Math.round(f.daily * f.days);
    $('#a_sum').textContent = t('adsSpend', f.daily, f.days, total);
    const prev = $('#a_prev'); prev.innerHTML = '';
    if (prod && (f.headline || f.text)) {
      if (prod.image) { const im = document.createElement('img'); im.src = prod.image; im.alt = ''; prev.appendChild(im); }
      const tx = document.createElement('div'); tx.className = 'adtext'; tx.textContent = f.text; const h = document.createElement('b'); h.textContent = f.headline; const btn = document.createElement('span'); btn.className = 'adcta'; btn.textContent = 'Shop now';
      prev.append(tx, h, btn);
    }
  }
  act.in_adsForm = () => update();
  act.adsDraft = async () => {
    const f = read(); try { const r = await api('/api/ads/draft', { method: 'POST', body: { product_id: f.product_id, offer: f.offer, lang: CD.lang() } }); $('#a_head').value = r.headline; $('#a_text').value = r.text; update(); } catch (_) { toast(t('error'), true); }
  };
  act.adsDemo = async () => { await api('/api/ads/connect', { method: 'POST', body: { mode: 'demo' } }); CD.rerender(); };
  act.adsDisconnect = async () => { await api('/api/ads/connect', { method: 'DELETE' }); CD.rerender(); };
  act.adsManual = async () => {
    try { await api('/api/ads/connect', { method: 'POST', body: { ad_account_id: $('#a_acct').value, page_id: $('#a_page').value, token: $('#a_token').value }, quiet: true }); toast(t('adsConnected')); CD.rerender(); } catch (e) { toast(t('adsConnFail') + (e.message ? ' ' + e.message : ''), true); }
  };
  act.adsLaunch = async () => {
    const f = read(); const total = Math.round(f.daily * f.days);
    if (!confirm(t('adsLaunchConfirm', total, f.daily, f.days) + `\n\n“${f.headline}”\n${f.text}`)) return;
    try {
      const r = await api('/api/ads/launch', { method: 'POST', body: { product_id: f.product_id, headline: f.headline, text: f.text, daily: f.daily, days: f.days, confirmed: true }, quiet: true });
      toast(r.mode === 'live' ? t('adsLaunched') : t('adsDry')); CD.rerender();
    } catch (e) { toast(t('e_' + e.code) !== 'e_' + e.code ? t('e_' + e.code) : t('error'), true); }
  };
  act.adsPause = async el => { try { await api(`/api/ads/${el.dataset.id}/pause`, { method: 'POST', quiet: true }); toast(t('adsPaused')); CD.rerender(); } catch (_) { toast(t('error'), true); } };
})();
