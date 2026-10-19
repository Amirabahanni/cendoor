'use strict';
// Views: inbox, customers, links, money, team, settings
(() => {
  const { t, html, raw, icon, api, money, fmtDate, fmtDay, toast, act, views } = CD;
  const $ = (s, r = document) => r.querySelector(s);
  const initial = s => (String(s || '?').trim()[0] || '?').toUpperCase();

  // ======================= INBOX =======================
  let iActive = null, iFilter = 'all', iLastMsg = 0;
  views.inbox = async main => {
    await paintInbox(main);
    CD.timers.push(setInterval(async () => { if (CD.state.route !== 'inbox' || $('#composer:focus')) return; await refreshList(); if (iActive) await loadThread(iActive, true); }, 5000));
  };
  function listHtml(list) {
    // always an html object, so both the first paint and the 5-second refresh (which reads .s) work
    return html`${list.length ? list.map(c => html`<div class="cv ${c.id === iActive ? 'on' : ''}" data-act="openConv" data-id="${c.id}"><div class="avatar">${initial(c.name)}</div>
      <div class="grow"><div class="row between"><b class="t">${c.name}</b><span class="tiny muted">${CD.ago(c.updated_at)}</span></div>
      <div class="small muted t">${c.last_role === 'customer' ? '' : '↩ '}${c.last_text || ''}</div>
      <div class="row wrap" style="gap:6px;margin-top:4px"><span class="pill gray">${CD.chanLabel(c.channel)}</span>${c.needs_attention ? html`<span class="pill red">${t('needsYou')}</span>` : ''}${c.bot_paused ? html`<span class="pill amber">${t('aiPaused')}</span>` : ''}${c.unread ? html`<span class="pill blue">${c.unread}</span>` : ''}</div></div></div>`) : html`<div class="empty">${t('noConvos')}</div>`}`;
  }
  async function refreshList() { const list = await api('/api/conversations' + (iFilter === 'attention' ? '?filter=attention' : ''), { quiet: true }); const el = $('#ilist'); if (el) el.innerHTML = listHtml(list).s; CD.refreshBadges(); }
  async function paintInbox(main) {
    const list = await api('/api/conversations' + (iFilter === 'attention' ? '?filter=attention' : ''));
    main.innerHTML = html`${CD.topbar(t('inbox'))}
      <div class="chips mb"><button class="chip ${iFilter === 'all' ? 'on' : ''}" data-act="iFilter" data-v="all">${t('all')}</button><button class="chip ${iFilter === 'attention' ? 'on' : ''}" data-act="iFilter" data-v="attention">${t('needsYou')}</button></div>
      <div class="inbox"><div class="list ${iActive ? 'mobile-hide' : ''}" id="ilist" style="overflow-y:auto">${listHtml(list)}</div><div class="thread ${iActive ? '' : 'mobile-hide'}" id="ithread"><div class="empty">${icon('chat')}<p>${t('conversations')}</p></div></div></div>`.s;
    if (iActive) loadThread(iActive);
  }
  act.iFilter = el => { iFilter = el.dataset.v; paintInbox($('#main')); };
  act.openConv = el => { iActive = Number(el.dataset.id); iLastMsg = 0; document.querySelectorAll('.cv').forEach(c => c.classList.toggle('on', c.dataset.id == iActive)); $('#ilist').classList.add('mobile-hide'); $('#ithread').classList.remove('mobile-hide'); loadThread(iActive); };
  act.convBack = () => { iActive = null; $('#ilist').classList.remove('mobile-hide'); $('#ithread').classList.add('mobile-hide'); };
  const WHO = { customer: null, bot: 'ai', seller: 'you', system: 'auto' };
  async function loadThread(id, quiet) {
    const d = await api(`/api/conversations/${id}`, { quiet: true });
    const last = d.messages.length ? d.messages[d.messages.length - 1].id : 0;
    if (quiet && last === iLastMsg && $('#ithread .msgs')) return;
    iLastMsg = last;
    const c = d.conversation; const can = CD.can('conversations');
    const nm = c.customer_name || (c.channel === 'whatsapp' ? '+' + c.customer_key : t('visitor'));
    const prev = $('#ithread #composer'); const draft = prev ? prev.value : '';
    $('#ithread').innerHTML = html`
      <div class="row between" style="padding:12px 14px;border-bottom:1px solid var(--border)"><div class="row"><button class="btn ghost sm" data-act="convBack" style="display:none" id="backBtn">${icon('x')}</button><div class="avatar">${initial(nm)}</div><div><b>${nm}</b><div class="small muted">${CD.chanLabel(c.channel)}${c.attention_reason ? ' · ' + c.attention_reason.replace(/_/g, ' ') : ''}</div></div></div>
        <div class="row wrap">${c.bot_paused && can ? html`<button class="btn sm" data-act="resumeAI" data-id="${c.id}">${t('resumeAI')}</button>` : ''}${c.needs_attention && can ? html`<button class="btn sm" data-act="resolveConv" data-id="${c.id}">${icon('check')} ${t('markResolved')}</button>` : ''}</div></div>
      ${d.orders.length ? html`<div class="row wrap small" style="padding:8px 14px;border-bottom:1px solid var(--border)">${d.orders.map(o => html`<button class="chip" data-act="openOrder" data-id="${o.id}">${o.number} · ${t(o.status)} · ${money(o.total)}</button>`)}</div>` : ''}
      <div class="msgs" id="msgs">${d.messages.map(m => html`<div class="bub ${m.role}"><div class="who">${m.role === 'customer' ? nm : t(WHO[m.role])}</div>${m.text}</div>`)}</div>
      ${can ? html`<div class="composer"><input class="inp grow" id="composer" placeholder="${t('typeReply')}" data-act="" value="${draft}"><button class="btn primary" data-act="sendReply" data-id="${c.id}">${icon('send')}</button></div>` : html`<div class="composer small muted">${t('readOnly')}</div>`}`.s;
    const m = $('#msgs'); if (m) m.scrollTop = m.scrollHeight;
    if (window.innerWidth <= 900) { const b = $('#backBtn'); if (b) b.style.display = ''; }
    const comp = $('#composer'); if (comp) comp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); act.sendReply({ dataset: { id: c.id } }); } });
    refreshList();
  }
  act.sendReply = async el => { const i = $('#composer'); const text = i.value.trim(); if (!text) return; i.value = ''; try { await api(`/api/conversations/${el.dataset.id}/reply`, { method: 'POST', body: { text } }); loadThread(Number(el.dataset.id)); } catch (_) { i.value = text; } };
  act.resumeAI = async el => { await api(`/api/conversations/${el.dataset.id}/resume-ai`, { method: 'POST' }); loadThread(Number(el.dataset.id)); };
  act.resolveConv = async el => { await api(`/api/conversations/${el.dataset.id}/resolve`, { method: 'POST' }); loadThread(Number(el.dataset.id)); };

  // ======================= CUSTOMERS =======================
  let cTab = 'customers';
  views.customers = async main => {
    const [cs, rv] = await Promise.all([api('/api/customers'), api('/api/reviews')]);
    const win = cs.filter(c => c.reengage).slice(0, 6);
    main.innerHTML = html`${CD.topbar(t('customers'))}
      <div class="chips mb"><button class="chip ${cTab === 'customers' ? 'on' : ''}" data-act="cTab" data-v="customers">${t('customers')}<span class="n">${cs.length}</span></button><button class="chip ${cTab === 'reviews' ? 'on' : ''}" data-act="cTab" data-v="reviews">${t('reviews')}<span class="n">${rv.length}</span></button></div>
      ${cTab === 'customers' ? html`
        ${win.length ? html`<div class="card mb"><h3>${t('reengageTitle')}</h3><p class="small muted" style="margin-top:-6px">${t('reengageHint')}</p><div class="stack">${win.map(c => html`<div class="row"><div class="avatar">${initial(c.name)}</div><div class="grow"><b>${c.name}</b><div class="small muted">${c.days_since} ${t('daysAgo')} · ${money(c.ltv)}</div></div><a class="btn sm accent" href="${c.waLink}" target="_blank" rel="noopener">${icon('ext')} ${t('reengage')}</a></div>`)}</div></div>` : ''}
        <div class="card" style="padding:0"><div class="tbl-wrap"><table class="tbl cards"><thead><tr><th>${t('customer')}</th><th>${t('city')}</th><th>${t('ordersN')}</th><th>${t('ltv')}</th><th>${t('lastOrder')}</th><th></th></tr></thead><tbody>
          ${cs.map(c => html`<tr><td data-l="${t('customer')}"><b>${c.name}</b><div class="small muted">${c.phone}</div></td><td data-l="${t('city')}">${c.city}</td><td data-l="${t('ordersN')}">${c.orders_count}${c.failed_count ? html` <span class="pill failed">${c.failed_count} ✗</span>` : ''}</td><td data-l="${t('ltv')}" class="bold">${money(c.ltv)}</td><td data-l="${t('lastOrder')}" class="small muted">${c.last_order_at ? c.days_since + ' ' + t('daysAgo') : '—'}</td><td><span class="pill ${c.tier === 'vip' ? 'amber' : c.tier === 'regular' ? 'blue' : 'gray'}">${t(c.tier === 'new' ? 'newC' : c.tier)}</span></td></tr>`)}</tbody></table></div></div>`
      : html`<div class="card">${rv.length ? html`<div class="stack">${rv.map(r => html`<div class="row"><div class="avatar">${'★'}</div><div class="grow"><b>${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</b> <span class="muted small">${r.number || ''} · ${r.name || ''}</span>${r.comment ? html`<div class="small">${r.comment}</div>` : ''}</div><span class="small muted">${fmtDay(r.created_at)}</span></div>`)}</div>` : html`<div class="empty">${t('noReviews')}</div>`}</div>`}`.s;
  };
  act.cTab = el => { cTab = el.dataset.v; CD.rerender(); };

  // ======================= POST LINKS =======================
  function waLink(link, productName) {
    const me = CD.state.me; const wa = me.shop.wa_number; if (!wa) return '';
    const ref = `ref: ${me.shop.slug}${link ? '~' + link.code : ''}`;
    return `https://wa.me/${wa}?text=${encodeURIComponent(`Salam, bghit ${productName || ''} (${ref})`.replace('  ', ' '))}`;
  }
  views.links = async main => {
    const [ls, prods] = await Promise.all([api('/api/links'), api('/api/products')]);
    const me = CD.state.me; const can = CD.can('links');
    CD._links = ls; CD._prods = prods;
    const pname = id => (prods.find(p => p.id === id) || {}).name || t('wholeShop');
    main.innerHTML = html`${CD.topbar(t('links'), can ? html`<button class="btn primary" data-act="newLink">${icon('plus')} ${t('newLink')}</button>` : '')}
      <p class="muted" style="margin-top:-8px">${t('linksIntro')}</p>
      <div class="card mb"><div class="row wrap"><div class="grow"><div class="small muted">${t('shopLink')}</div><code>${CD.shopUrl()}</code></div><button class="btn" data-act="copyShop">${icon('copy')} ${t('copy')}</button>${me.shop.wa_number ? html`<button class="btn" data-act="copyText" data-v="${waLink(null, '')}">${icon('copy')} WhatsApp</button>` : ''}</div></div>
      <div class="card" style="padding:0"><div class="tbl-wrap"><table class="tbl cards"><thead><tr><th>${t('label')}</th><th>${t('channel')}</th><th>${t('products')}</th><th>${t('visits')}</th><th>${t('ordersN')}</th><th>${t('convRate')}</th><th>${t('revenue')}</th><th></th></tr></thead><tbody>
      ${ls.map(l => html`<tr><td data-l="${t('label')}"><b>${l.label}</b><div class="tiny muted">?p=${l.code}</div></td><td data-l="${t('channel')}"><span class="pill gray">${CD.chanLabel(l.channel)}</span></td><td data-l="${t('products')}" class="small">${pname(l.product_id)}</td><td data-l="${t('visits')}">${CD.num(l.visits)}</td><td data-l="${t('ordersN')}">${l.orders}</td><td data-l="${t('convRate')}">${l.visits ? Math.round(l.orders / l.visits * 1000) / 10 + '%' : '—'}</td><td data-l="${t('revenue')}" class="bold">${money(l.revenue)}</td>
        <td class="nowrap"><button class="btn sm" data-act="copyText" data-v="${CD.shopUrl()}?p=${l.code}">${icon('copy')}</button>${me.shop.wa_number ? html` <button class="btn sm" data-act="copyText" data-v="${waLink(l, l.product_id ? pname(l.product_id) : '')}" title="WhatsApp">WA</button>` : ''}${can ? html` <button class="btn sm ghost" data-act="delLink" data-id="${l.id}">${icon('trash')}</button>` : ''}</td></tr>`)}</tbody></table></div></div>`.s;
  };
  act.copyText = el => CD.copyText(el.dataset.v);
  act.newLink = () => {
    CD.modal(html`<h2>${t('newLink')}</h2><label class="f">${t('label')}</label><input class="inp" id="l_label" placeholder="Reel: Robe Satin bleue"><label class="f">${t('channel')}</label><select class="inp" id="l_ch"><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="whatsapp">WhatsApp</option></select>
      <label class="f">${t('products')}</label><select class="inp" id="l_prod"><option value="">${t('wholeShop')}</option>${CD._prods.map(p => html`<option value="${p.id}">${p.name}</option>`)}</select>
      <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn" data-act="closeOv">${t('cancel')}</button><button class="btn primary" data-act="saveLink">${t('create')}</button></div>`);
  };
  act.saveLink = async () => { try { await api('/api/links', { method: 'POST', body: { label: $('#l_label').value, channel: $('#l_ch').value, product_id: $('#l_prod').value || null } }); CD.closeOverlay(); CD.rerender(); } catch (_) {} };
  act.delLink = async el => { if (!confirm(t('confirmDelete'))) return; await api(`/api/links/${el.dataset.id}`, { method: 'DELETE' }); CD.rerender(); };

  // ======================= MONEY =======================
  views.money = async main => {
    const r = await api('/api/reconciliation');
    const can = CD.can('orders');
    const report = t('reportLine', r.deliveredToday.n, Math.round(r.deliveredToday.s), r.failedToday);
    main.innerHTML = html`${CD.topbar(t('money'))}
      <div class="grid k4 mb">
        <div class="card stat"><div class="lbl">${t('deliveredToday')}</div><div class="val">${r.deliveredToday.n}</div><div class="sub">${money(r.deliveredToday.s)} ${t('collectedToday')}</div></div>
        <div class="card stat"><div class="lbl">${t('awaitingCash')}</div><div class="val">${money(r.pending.s)}</div><div class="sub">${r.pending.n} ${t('ordersWord')}</div></div>
        <div class="card stat"><div class="lbl">${t('remitted30')}</div><div class="val">${money(r.remitted30.s)}</div><div class="sub">${r.remitted30.n} ${t('ordersWord')}</div></div>
        <div class="card stat"><div class="lbl">${t('failed')}</div><div class="val">${r.failedToday}</div><div class="sub">${t('today')}</div></div></div>
      <div class="card mb"><div class="row between wrap"><div><h3 style="margin-bottom:4px">${t('dailyReport')}</h3><div>${report}</div></div><button class="btn" data-act="copyText" data-v="${report}">${icon('copy')} ${t('copyReport')}</button></div></div>
      ${r.byCarrier.length ? html`<div class="chips mb">${r.byCarrier.map(c => html`<span class="chip">${c.carrier}: ${money(c.s)} <span class="n">(${c.n})</span></span>`)}</div>` : ''}
      <div class="card" style="padding:0"><div class="tbl-wrap">${r.pendingList.length ? html`<table class="tbl cards"><thead><tr><th>#</th><th>${t('customer')}</th><th>${t('carrier')}</th><th>${t('total')}</th><th>${t('date')}</th><th></th></tr></thead><tbody>
        ${r.pendingList.map(o => html`<tr><td data-l="#"><b>${o.number}</b></td><td data-l="${t('customer')}">${o.name}<div class="small muted">${o.city}</div></td><td data-l="${t('carrier')}">${o.carrier}</td><td data-l="${t('total')}" class="bold">${money(o.total)}</td><td data-l="${t('date')}" class="small muted">${fmtDate(o.delivered_at)}</td><td>${can ? html`<button class="btn sm" data-act="remit" data-id="${o.id}">${icon('check')} ${t('markReceived')}</button>` : ''}</td></tr>`)}</tbody></table>` : html`<div class="empty">${t('noPending')}</div>`}</div></div>`.s;
  };
  act.remit = async el => { await api(`/api/orders/${el.dataset.id}/remit`, { method: 'POST', body: { remitted: true } }); CD.rerender(); };

  // ======================= TEAM =======================
  views.team = async main => {
    const list = await api('/api/team'); const can = CD.can('team'); const me = CD.state.me.user;
    main.innerHTML = html`${CD.topbar(t('team'), can ? html`<button class="btn primary" data-act="inviteMember">${icon('plus')} ${t('inviteMember')}</button>` : '')}
      <div class="grid k2"><div class="card" style="padding:0"><table class="tbl"><tbody>${list.map(u => html`<tr><td><div class="row"><div class="avatar">${initial(u.name || u.email)}</div><div><b>${u.name || '—'}</b><div class="small muted">${u.email}</div></div></div></td><td>${can && u.id !== me.id ? html`<select class="inp" style="min-height:34px" data-in="teamRole" data-id="${u.id}">${['admin', 'manager', 'operator', 'viewer'].map(r => html`<option value="${r}" ${r === u.role ? raw('selected') : ''}>${t(r)}</option>`)}</select>` : html`<span class="role">${t(u.role)}</span>`}</td><td>${can && u.id !== me.id ? html`<button class="btn ghost sm" data-act="rmMember" data-id="${u.id}">${icon('trash')}</button>` : ''}</td></tr>`)}</tbody></table></div>
      <div class="card"><h3>${t('role')}</h3>${['admin', 'manager', 'operator', 'viewer'].map(r => html`<div class="row" style="margin:8px 0"><span class="role" style="min-width:80px;text-align:center">${t(r)}</span><span class="small">${t('role' + r[0].toUpperCase() + r.slice(1))}</span></div>`)}</div></div>`.s;
  };
  act.inviteMember = () => {
    CD.modal(html`<h2>${t('inviteMember')}</h2><label class="f">${t('name')}</label><input class="inp" id="m_name"><label class="f">${t('email')}</label><input class="inp" id="m_email" type="email"><label class="f">${t('temporaryPassword')}</label><input class="inp" id="m_pw" type="password" autocomplete="new-password">
      <label class="f">${t('role')}</label><select class="inp" id="m_role">${['manager', 'operator', 'viewer', 'admin'].map(r => html`<option value="${r}">${t(r)}</option>`)}</select><div class="err" id="mErr"></div>
      <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn" data-act="closeOv">${t('cancel')}</button><button class="btn primary" data-act="saveMember">${t('add')}</button></div>`);
  };
  act.saveMember = async () => { try { await api('/api/team', { method: 'POST', quiet: true, body: { name: $('#m_name').value, email: $('#m_email').value, password: $('#m_pw').value, role: $('#m_role').value } }); CD.closeOverlay(); CD.rerender(); } catch (e) { $('#mErr').textContent = ({ email_taken: 'Email already used', weak_password: t('temporaryPassword'), bad_email: t('email') })[e.code] || t('error'); } };
  act.in_teamRole = async el => { await api(`/api/team/${el.dataset.id}`, { method: 'PATCH', body: { role: el.value } }); toast(t('saved')); };
  act.rmMember = async el => { if (!confirm(t('confirmDelete'))) return; await api(`/api/team/${el.dataset.id}`, { method: 'DELETE' }); CD.rerender(); };

  // ======================= SETTINGS =======================
  async function saveShop(patch) {
    const s = { ...CD.state.me.shop, ...patch };
    await api('/api/settings', { method: 'PUT', body: s });
    await CD.reloadMe();
  }
  views.settings = async main => {
    const [carriers, ins] = await Promise.all([api('/api/carriers'), api('/api/insights'), CD.reloadMe()]);
    CD._carriers = carriers;
    const { shop, integrations: ig, usage, can } = CD.state.me; const ed = can.settings; const dis = ed ? '' : raw('disabled');
    const plans = [['solo', 149, 'soloF'], ['growth', 299, 'growthF']];
    main.innerHTML = html`${CD.topbar(t('settings'), ed ? html`<button class="btn primary" data-act="saveSettings">${icon('check')} ${t('save')}</button>` : '')}
      ${ed ? '' : html`<div class="alert mb">${icon('alert')}<div>${t('readOnly')}</div></div>`}
      <div class="grid k2 mb">
        <div class="card"><h3>${t('shopProfile')}</h3><fieldset style="border:0;padding:0;margin:0" ${dis}>
          <label class="f">${t('shopName')}</label><input class="inp" id="s_name" value="${shop.name}"><label class="f">${t('tagline')}</label><input class="inp" id="s_tag" value="${shop.tagline || ''}">
          <div class="grid k2" style="gap:10px"><div><label class="f">${t('city')}</label><input class="inp" id="s_city" value="${shop.city || ''}"></div><div><label class="f">${t('phone')}</label><input class="inp" id="s_phone" value="${shop.phone || ''}"></div></div></fieldset></div>
        <div class="card"><h3>${icon('zap')} ${t('aiSettings')}</h3><fieldset style="border:0;padding:0;margin:0" ${dis}>
          <label class="row" style="margin:6px 0"><input type="checkbox" id="s_ai" ${shop.ai_enabled ? raw('checked') : ''}> ${t('aiOn')}</label>
          <label class="row" style="margin:6px 0"><input type="checkbox" id="s_confirm" ${shop.confirm_agent ? raw('checked') : ''}> ${t('confirmAgent')}</label><div class="tiny muted">${t('confirmAgentHint')}</div>
          <div class="grid k2" style="gap:10px"><div><label class="f">${t('defaultLang')}</label><select class="inp" id="s_lang">${[['fr', 'Français'], ['en', 'English'], ['ar', 'العربية']].map(([k, n]) => html`<option value="${k}" ${k === (shop.lang === 'dar' ? 'ar' : shop.lang) ? raw('selected') : ''}>${n}</option>`)}</select></div>
          <div><label class="f">${t('tone')}</label><select class="inp" id="s_tone"><option value="friendly" ${shop.tone === 'friendly' ? raw('selected') : ''}>${t('friendly')}</option><option value="formal" ${shop.tone === 'formal' ? raw('selected') : ''}>${t('formal')}</option></select></div></div></fieldset>
          <div class="small muted" style="margin-top:10px">${t('llmState')}: <b>${ig.llm ? t('llmOn') : t('llmOff')}</b></div></div></div>
      <div class="card mb"><h3>${t('shipping')}</h3><fieldset style="border:0;padding:0;margin:0" ${dis}><div class="grid k2" style="gap:10px"><div><label class="f">${t('freeOver')}</label><input class="inp" id="s_free" type="number" min="0" value="${shop.free_shipping_over}"></div>
        <div><label class="f">${t('defaultCarrier')}</label><select class="inp" id="s_car">${carriers.map(c => html`<option ${c.name === shop.default_carrier ? raw('selected') : ''}>${c.name}</option>`)}</select></div></div></fieldset>
        <label class="row" style="margin:14px 0 2px"><input type="checkbox" id="s_auto" ${shop.auto_carrier ? raw('checked') : ''} ${dis}> <b>${t('autoCarrier')}</b></label><div class="tiny muted">${t('autoCarrierHint')}</div>
        ${ins.carriers.length ? html`<div class="small muted" style="margin-top:12px">${t('carrierPerf')}</div><div class="chips" style="margin-top:6px">${ins.carriers.map(c => html`<span class="chip">${c.carrier}: ${c.rate == null ? '—' : c.rate + '%'} <span class="n">(${c.n})</span></span>`)}</div>` : ''}
        <div class="tbl-wrap mt"><table class="tbl"><thead><tr><th>${t('carrier')}</th><th>${t('baseFee')}</th><th>${t('eta')}</th><th>${t('enabled')}</th><th></th></tr></thead><tbody>${carriers.map(c => html`<tr><td><b>${c.name}</b></td><td>${money(c.base_price)}</td><td>${c.eta_days}</td><td>${c.enabled ? '✓' : '—'}</td><td>${ed ? html`<button class="btn sm" data-act="editCarrier" data-id="${c.id}">${t('edit')}</button>` : ''}</td></tr>`)}</tbody></table></div></div>
      <div class="card mb"><h3>${t('channels')}</h3><div class="grid k3">
        ${[['chWaTitle', 'chWaLive', ig.whatsapp], ['chIgTitle', 'chIgLive', false], ['chTtTitle', 'chTtLive', false]].map(([ti, de, live]) => html`<div class="card" style="box-shadow:none;background:var(--surface-2)"><div class="row between"><b>${t(ti)}</b><span class="pill ${live ? 'green' : 'amber'}">${live ? t('connected') : t('pendingApproval')}</span></div><div class="row" style="margin:8px 0"><span class="pill green">${t('active')}</span></div><div class="small muted">${t(de)}</div></div>`)}</div>
        <fieldset style="border:0;padding:0;margin:14px 0 0" ${dis}><label class="f">${t('waNumber')}</label><input class="inp" id="s_wa" value="${shop.wa_number || ''}" inputmode="numeric" style="max-width:320px"></fieldset>
        <div class="small muted" style="margin-top:8px">${t('apiState')}: <b>${ig.whatsapp ? t('connected') : t('notConnected')}</b> · Webhook: <code>/webhooks/whatsapp</code></div></div>
      <div class="card mb"><h3>${t('plan')}</h3>${CD.state.me.trial ? html`<div class="alert teal mb">${icon('zap')}<div><b>${t('trialLeft', CD.state.me.trial.daysLeft)}</b> · ${t('trialThen')}</div></div>` : ''}<div class="grid k2">${plans.map(([k, p, f]) => html`<div class="plan ${shop.plan === k ? 'on' : ''}"><b>${t(k)}</b><div class="price">${p} MAD<span class="small muted"> ${t('perMonth')}</span></div><ul>${t(f).map(x => html`<li>${x}</li>`)}</ul>${shop.plan === k ? html`<span class="pill green">${t('current')}</span>` : ed ? html`<button class="btn sm block" data-act="setPlan" data-v="${k}">${shop.plan === 'trial' ? t('choosePlan') : t('choose')}</button>` : ''}</div>`)}</div>
        <p class="small muted" style="margin-bottom:0">${t('billingNote')}</p></div>
      ${CD.state.me.demo ? html`<div class="card mb"><h3>${t('demoTools')}</h3><p class="small muted">${t('demoHint2')}</p><button class="btn danger" data-act="resetDemo">${t('resetDemo')}</button></div>` : ''}
      <a class="btn" href="/api/orders.csv">${icon('download')} ${t('exportData')}</a>`.s;
  };
  act.resetDemo = async () => { if (!confirm(t('resetDemo') + '?')) return; try { await api('/api/demo/reset', { method: 'POST' }); toast(t('resetDone')); setTimeout(() => location.assign('/app'), 600); } catch (_) {} };
  act.saveSettings = async () => {
    try {
      await saveShop({ name: $('#s_name').value, tagline: $('#s_tag').value, city: $('#s_city').value, phone: $('#s_phone').value, ai_enabled: $('#s_ai').checked ? 1 : 0, confirm_agent: $('#s_confirm').checked ? 1 : 0, lang: $('#s_lang').value, tone: $('#s_tone').value, free_shipping_over: $('#s_free').value, default_carrier: $('#s_car').value, wa_number: $('#s_wa').value, auto_carrier: $('#s_auto').checked ? 1 : 0 });
      toast(t('saved')); CD.render();
    } catch (_) {}
  };
  act.setPlan = async el => { try { await saveShop({ plan: el.dataset.v }); toast(t('saved')); CD.render(); } catch (_) {} };
  act.editCarrier = el => {
    const c = CD._carriers.find(x => x.id === Number(el.dataset.id));
    const lines = Object.entries(c.city_prices || {}).map(([k, v]) => `${k}=${v}`).join('\n');
    CD.modal(html`<h2>${c.name}</h2><label class="row" style="margin:10px 0"><input type="checkbox" id="c_en" ${c.enabled ? raw('checked') : ''}> ${t('enabled')}</label>
      <div class="grid k2" style="gap:10px"><div><label class="f">${t('baseFee')} (MAD)</label><input class="inp" id="c_base" type="number" min="0" value="${c.base_price}"></div><div><label class="f">${t('eta')}</label><input class="inp" id="c_eta" value="${c.eta_days}"></div></div>
      <label class="f">${t('cityPrices')} (City=Price)</label><textarea class="inp" id="c_city" rows="5" placeholder="Casablanca=25&#10;Tanger=30">${lines}</textarea>
      <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn" data-act="closeOv">${t('cancel')}</button><button class="btn primary" data-act="saveCarrier" data-id="${c.id}">${t('save')}</button></div>`);
  };
  act.saveCarrier = async el => {
    const city_prices = {};
    for (const line of $('#c_city').value.split('\n')) { const [k, v] = line.split('='); if (k && v && !isNaN(Number(v))) city_prices[k.trim()] = Number(v); }
    try { await api(`/api/carriers/${el.dataset.id}`, { method: 'PUT', body: { enabled: $('#c_en').checked, base_price: $('#c_base').value, eta_days: $('#c_eta').value, city_prices } }); CD.closeOverlay(); toast(t('saved')); CD.rerender(); } catch (_) {}
  };
})();
