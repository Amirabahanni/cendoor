'use strict';
// Views: overview, orders, products
(() => {
  const { t, html, raw, icon, api, money, num, fmtDate, fmtDay, toast, act, views, esc } = CD;
  const $ = (s, r = document) => r.querySelector(s);
  const pill = s => html`<span class="pill ${s}">${t(s)}</span>`;
  const riskDot = l => html`<span class="dot ${l}" title="${t(l === 'green' ? 'riskGreen' : l === 'yellow' ? 'riskYellow' : 'riskRed')}"></span>`;
  CD.pill = pill; CD.riskDot = riskDot;
  const shopUrl = () => `${location.origin}/s/${CD.state.me.shop.slug}`;
  CD.shopUrl = shopUrl;
  const CONFIRM = {
    dar: (o, shop) => `Salam ${o.name.split(' ')[0]}, hadi ${shop}. Wach t2kd l-commande ${o.number} (${Math.round(o.total)} DH) l ${o.city}? Jaweb "iyeh" bach nsifto-ha 👍`,
    fr: (o, shop) => `Bonjour ${o.name.split(' ')[0]}, c'est ${shop}. Confirmez-vous la commande ${o.number} (${Math.round(o.total)} DH) pour ${o.city} ? Répondez "oui" et nous l'expédions 👍`,
    en: (o, shop) => `Hello ${o.name.split(' ')[0]}, this is ${shop}. Do you confirm order ${o.number} (${Math.round(o.total)} MAD) to ${o.city}? Reply "yes" and we ship it 👍`,
    ar: (o, shop) => `السلام ${o.name.split(' ')[0]}، معك ${shop}. واش كتأكد الطلب ${o.number} (${Math.round(o.total)} درهم) ل ${o.city}؟ جاوب "إيه" باش نصيفطوه 👍`,
  };
  const waConfirmLink = o => `https://wa.me/212${String(o.phone).replace(/^0/, '')}?text=${encodeURIComponent((CONFIRM[CD.state.me.shop.lang] || CONFIRM.dar)(o, CD.state.me.shop.name))}`;
  async function copyText(s) { try { await navigator.clipboard.writeText(s); toast(t('copied')); } catch (_) { window.prompt('', s); } }
  CD.copyText = copyText;

  // ======================= OVERVIEW =======================
  views.overview = async main => {
    const [a, ords, prods, ins] = await Promise.all([api('/api/analytics?days=14'), api('/api/orders?limit=200'), api('/api/products'), api('/api/insights')]);
    const v = ins.value;
    const me = CD.state.me;
    const toShip = ords.filter(o => o.status === 'confirmed').length;
    const toApprove = ords.filter(o => o.status === 'pending_confirmation').length;
    const hours = Math.round(a.month.orders * 6 / 60 * 10) / 10;
    const max = Math.max(1, ...a.series.map(s => s.sales));
    const alerts = [
      toApprove && { n: toApprove, k: 'toConfirm', href: '#/orders', cls: 'amber' },
      toShip && { n: toShip, k: 'toShip', href: '#/orders', cls: 'teal' },
      a.attention && { n: a.attention, k: 'chatsFlag', href: '#/inbox', cls: 'red' },
      a.lowStock.length && { n: a.lowStock.length, k: 'lowStockN', href: '#/products', cls: 'amber' },
      a.failedOpen && { n: a.failedOpen, k: 'failedOpen', href: '#/orders', cls: 'red' },
    ].filter(Boolean);
    const showStart = !prods.length || (a.month.orders === 0 && !ords.length);
    const chMax = Math.max(1, ...a.channels.map(c => c.n));
    main.innerHTML = html`
      ${CD.topbar(html`${t('hello')}, ${(me.user.name || '').split(' ')[0] || me.shop.name}`, html`<a class="btn primary" href="${shopUrl()}" target="_blank" rel="noopener">${icon('ext')} ${t('viewStore')}</a>`)}
      ${me.trial ? html`<div class="alert teal mb">${icon('zap')}<div class="grow"><b>${t('trialLeft', me.trial.daysLeft)}</b> · ${t('trialThen')}</div><a class="btn sm primary" href="#/settings">${t('choosePlan')}</a></div>` : ''}
      <div class="card ask mb"><div class="row wrap"><div class="grow" style="min-width:240px"><b>${t('askTitle')}</b><input class="inp" id="askInput" placeholder="${t('askPlaceholder')}" style="margin-top:8px"></div><button class="btn primary" data-act="askGo">${icon('send')} ${t('askBtn')}</button></div>
        <div class="chips" style="margin-top:10px">${[t('askChip1'), t('askChip2'), t('askChip3')].map(c => html`<button class="chip" data-act="askChip" data-v="${c}">${c}</button>`)}</div></div>
      ${showStart ? html`<div class="card mb"><h3>${t('getStarted')}</h3>
        <div class="check ${prods.length ? 'done' : ''}"><span class="box">${prods.length ? icon('check') : ''}</span><span class="t grow">${t('stepProduct')}</span><a class="btn sm" href="#/products">${t('add')}</a></div>
        <div class="check"><span class="box"></span><span class="t grow">${t('stepShipping')}</span><a class="btn sm" href="#/settings">${t('settings')}</a></div>
        <div class="check"><span class="box"></span><span class="t grow">${t('stepShare')}</span><button class="btn sm" data-act="copyShop">${icon('copy')} ${t('copy')}</button></div>
        <div class="check"><span class="box"></span><span class="t grow">${t('stepTest')}</span><a class="btn sm" href="${shopUrl()}" target="_blank" rel="noopener">${icon('ext')}</a></div></div>` : ''}
      <div class="grid k4 mb">
        <div class="card stat"><div class="lbl">${t('salesToday')}</div><div class="val">${money(a.today.sales)}</div><div class="sub">${a.today.orders} ${t('ordersWord')}</div></div>
        <div class="card stat"><div class="lbl">${t('salesMonth')}</div><div class="val">${money(a.month.sales)}</div><div class="sub">${a.month.orders} ${t('ordersWord')}</div></div>
        <div class="card stat"><div class="lbl">${t('successRate')}</div><div class="val">${a.successRate == null ? '—' : a.successRate + '%'}</div><div class="sub">${a.delivered} ✓ · ${a.failed} ✗ · ${a.recovered} ↺</div></div>
        <div class="card stat"><div class="lbl">${t('rating')}</div><div class="val">${a.rating.avg == null ? '—' : '★ ' + a.rating.avg}</div><div class="sub">${a.rating.count} ${t('reviewsWord')}</div></div>
      </div>
      <div class="grid k2 mb">
        <div class="card"><h3>${t('needsAttention')}</h3>
          ${alerts.length ? html`<div class="stack">${alerts.map(x => html`<a class="alert ${x.cls}" href="${x.href}" style="text-decoration:none;color:inherit">${icon(x.cls === 'teal' ? 'box' : 'alert')}<div class="grow"><b>${x.n}</b> ${t(x.k)}</div></a>`)}</div>` : html`<div class="alert teal">${icon('check')}<div>${t('allClear')}</div></div>`}
        </div>
        <div class="card"><h3>${icon('zap')} ${t('valueTitle')}</h3>
          <div class="hbar" style="grid-template-columns:1fr auto"><span>${t('valueHours')}</span><b>${v.hours} ${t('hours')}</b></div>
          <div class="hbar" style="grid-template-columns:1fr auto"><span>${t('valueChat')}</span><b>${v.viaChat}</b></div>
          <div class="hbar" style="grid-template-columns:1fr auto"><span>${t('valueRecovered')}</span><b>${v.recovered.n} · ${money(v.recovered.amount)}</b></div>
          <div class="hbar" style="grid-template-columns:1fr auto"><span>${t('valueHeld')}</span><b>${v.held.n} · ${money(v.held.amount)}</b></div>
          <p class="tiny muted" style="margin-bottom:0">${t('valueNote')}</p>
        </div>
      </div>
      ${ins.insights.length ? html`<div class="card mb"><h3>${icon('zap')} ${t('copilot')}</h3><p class="small muted" style="margin-top:-6px">${t('copilotSub')}</p><div class="stack">${ins.insights.slice(0, 3).map(i => html`<a class="alert teal" href="${i.href}" style="text-decoration:none;color:inherit">${icon('zap')}<div class="grow">${t('ins_' + i.k, i)}</div></a>`)}</div></div>` : ''}
      <div class="card mb"><h3>${t('salesChart')}</h3>
        <div class="bars">${a.series.map(s => html`<div class="b" title="${fmtDay(s.date)}: ${money(s.sales)} · ${s.orders}"><div class="bar" style="height:${Math.max(2, s.sales / max * 100)}%"></div><div class="x">${s.date.slice(8)}</div></div>`)}</div>
      </div>
      <div class="grid k2">
        <div class="card"><h3>${t('topProducts')}</h3>${a.top.length ? a.top.map(p => html`<div class="hbar"><span class="nowrap" style="overflow:hidden;text-overflow:ellipsis">${p.name}</span><span class="track"><span class="fill" style="width:${p.revenue / a.top[0].revenue * 100}%;display:block"></span></span><b class="small">${money(p.revenue)}</b></div>`) : html`<div class="empty">—</div>`}</div>
      </div>`.s;
  };
  act.copyShop = () => copyText(shopUrl());
  act.askGo = () => { const v = ($('#askInput').value || '').trim(); CD.pendingStudio = v || null; location.hash = '#/studio'; };
  act.askChip = el => { CD.pendingStudio = el.dataset.v; location.hash = '#/studio'; };

  // ======================= ORDERS =======================
  const OSTATUS = ['all', 'pending_confirmation', 'confirmed', 'shipped', 'delivered', 'failed', 'cancelled'];
  let oFilter = 'all', oQuery = '', oCache = [];
  views.orders = async main => {
    oCache = await api('/api/orders?limit=300');
    paintOrders(main);
  };
  function paintOrders(main) {
    main = main || $('#main');
    const counts = Object.fromEntries(OSTATUS.map(s => [s, s === 'all' ? oCache.length : oCache.filter(o => o.status === s).length]));
    const q = oQuery.trim().toLowerCase();
    const rows = oCache.filter(o => (oFilter === 'all' || o.status === oFilter) && (!q || [o.name, o.phone, o.number, o.city].some(x => String(x).toLowerCase().includes(q))));
    main.innerHTML = html`
      ${CD.topbar(t('orders'), html`${CD.can('orders') ? html`<button class="btn primary" data-act="newOrder">${icon('plus')} ${t('newOrder')}</button>` : ''}<a class="btn" href="/api/orders.csv">${icon('download')} ${t('exportCsv')}</a>`)}
      <div class="row wrap mb"><div class="chips grow">${OSTATUS.map(s => html`<button class="chip ${oFilter === s ? 'on' : ''}" data-act="oFilter" data-v="${s}">${s === 'all' ? t('all') : t(s)}<span class="n">${counts[s]}</span></button>`)}</div>
        <input class="inp" style="max-width:240px" placeholder="${t('search')}" value="${oQuery}" data-type="oq" id="oq"></div>
      <div class="card" style="padding:0"><div class="tbl-wrap">${rows.length ? html`<table class="tbl cards"><thead><tr><th>#</th><th>${t('customer')}</th><th>${t('items')}</th><th>${t('total')}</th><th>${t('carrier')}</th><th>${t('risk')}</th><th>${t('status')}</th><th>${t('date')}</th></tr></thead><tbody>
        ${rows.map(o => html`<tr class="click" data-act="openOrder" data-id="${o.id}"><td data-l="#"><b>${o.number}</b></td><td data-l="${t('customer')}">${o.name}<div class="small muted">${o.city}</div></td><td data-l="${t('items')}" class="small">${o.summary}</td><td data-l="${t('total')}" class="nowrap bold">${money(o.total)}</td><td data-l="${t('carrier')}">${o.carrier}</td><td data-l="${t('risk')}">${riskDot(o.risk_level)}</td><td data-l="${t('status')}">${pill(o.status)}</td><td data-l="${t('date')}" class="small muted nowrap">${fmtDate(o.created_at)}</td></tr>`)}
        </tbody></table>` : html`<div class="empty">${t('noOrders')}</div>`}</div></div>`.s;
    const inp = $('#oq'); if (inp && oQuery) { inp.focus(); inp.setSelectionRange(oQuery.length, oQuery.length); }
  }
  act.oFilter = el => { oFilter = el.dataset.v; paintOrders(); };
  act.type_oq = el => { oQuery = el.value; paintOrders(); };

  async function openOrder(id) {
    const o = await api(`/api/orders/${id}`);
    const can = CD.can('orders');
    const rec = ['pending_confirmation', 'confirmed'].includes(o.status) ? (await api('/api/carriers/recommend?city=' + encodeURIComponent(o.city), { quiet: true }).catch(() => null)) : null;
    const open = !['delivered', 'cancelled'].includes(o.status);
    const sel = $('.drawer'); // reuse the drawer when already open
    const body = html`
      <div class="row between"><div><h2>${o.number}</h2><div class="muted small">${fmtDate(o.created_at)} · ${CD.chanLabel(o.channel)}</div></div><div class="row">${pill(o.status)}<button class="btn ghost sm" data-act="closeOv" aria-label="${t('close')}">${icon('x')}</button></div></div>
      <div class="sep"></div>
      <dl class="kv"><dt>${t('customer')}</dt><dd><b>${o.name}</b><br>${o.phone}</dd><dt>${t('address')}</dt><dd>${o.address}, ${o.city}</dd>
        <dt>${t('carrier')}</dt><dd>${can && ['pending_confirmation', 'confirmed'].includes(o.status) ? html`<select class="inp" data-in="orderCarrier" data-id="${o.id}" style="max-width:200px;min-height:34px">${['Amana', 'CTM', 'Aramex', 'CashPlus'].map(c => html`<option ${c === o.carrier ? raw('selected') : ''}>${c}</option>`)}</select>` : o.carrier}</dd>
        ${rec && rec.recommendation ? html`<dt>${t('bestCarrier')}</dt><dd>${rec.recommendation.carrier} · ${rec.recommendation.rate}% <span class="muted small">(${t('sinceN', rec.recommendation.n)})</span></dd>` : ''}
        ${o.tracking ? html`<dt>${t('tracking')}</dt><dd><code>${o.tracking}</code></dd>` : ''}</dl>
      <div class="sep"></div>
      <table class="tbl"><tbody>${o.items.map(i => html`<tr><td>${i.qty} × ${i.name}${i.label && i.label !== 'Standard' ? ` (${i.label})` : ''}</td><td class="nowrap" style="text-align:end">${money(i.price * i.qty)}</td></tr>`)}
        <tr><td class="muted">${t('shipping')}</td><td style="text-align:end">${money(o.shipping_fee)}</td></tr><tr><td class="bold">${t('total')} (COD)</td><td class="bold" style="text-align:end">${money(o.total)}</td></tr></tbody></table>
      <div class="sep"></div>
      <div class="row">${riskDot(o.risk_level)} <b>${t('risk')}: ${t(o.risk_level === 'green' ? 'riskGreen' : o.risk_level === 'yellow' ? 'riskYellow' : 'riskRed')}</b> <span class="muted small">(${o.risk_score}/100)</span></div>
      <ul class="small" style="margin:8px 0 0;padding-inline-start:18px">${o.risk_reasons.map(r => html`<li>${t('r_' + r)}</li>`)}</ul>
      ${o.status === 'pending_confirmation' ? html`<p class="small muted">${t('riskExplain')}</p>` : ''}
      ${can ? html`<div class="sep"></div><div class="row wrap">
        ${o.status === 'pending_confirmation' ? html`<button class="btn primary" data-act="ostatus" data-id="${o.id}" data-v="confirmed">${icon('check')} ${t('approve')}</button>` : ''}
        ${['pending_confirmation', 'confirmed'].includes(o.status) ? html`<a class="btn" href="${waConfirmLink(o)}" target="_blank" rel="noopener">${icon('chat')} ${t('askWhatsApp')}</a>` : ''}
        ${['confirmed', 'shipped', 'failed', 'delivered'].includes(o.status) ? html`<a class="btn" href="/api/orders/${o.id}/label" target="_blank" rel="noopener">${icon('print')} ${t('printLabel')}</a>` : ''}
        ${o.status === 'confirmed' ? html`<button class="btn accent" data-act="ostatus" data-id="${o.id}" data-v="shipped">${icon('box')} ${t('handToCarrier')}</button>` : ''}
        ${o.status === 'failed' ? html`<button class="btn" data-act="ostatus" data-id="${o.id}" data-v="shipped">${t('handToCarrier')}</button>` : ''}
        ${open ? html`<button class="btn danger" data-act="ostatus" data-id="${o.id}" data-v="cancelled">${t('cancelOrder')}</button>` : ''}</div>
        ${['confirmed', 'shipped'].includes(o.status) ? html`<div class="alert teal mt"><div class="grow small">${t('simNote')}</div></div><div class="row wrap" style="margin-top:8px"><button class="btn sm" data-act="advance" data-id="${o.id}">${t('simulateStep')}</button>${o.status === 'shipped' ? html`<button class="btn sm" data-act="advance" data-id="${o.id}" data-fail="1">${t('simulateFail')}</button>` : ''}</div>` : ''}` : ''}
      <div class="sep"></div><h3 style="margin:0 0 6px;font-size:15px">${t('timeline')}</h3>
      <ul class="timeline">${o.events.slice().reverse().map(e => html`<li><span><b>${e.status.replace(/_/g, ' ')}</b> <span class="muted">${fmtDate(e.created_at)}${e.note ? ' · ' + e.note : ''}</span></span></li>`)}</ul>`;
    if (sel) sel.innerHTML = body.s; else CD.drawer(body);
  }
  act.openOrder = el => openOrder(el.dataset.id);
  act.closeOv = () => CD.closeOverlay();
  act.ostatus = async el => {
    try { await api(`/api/orders/${el.dataset.id}/status`, { method: 'PATCH', body: { status: el.dataset.v } }); toast(t('statusUpdated')); await openOrder(el.dataset.id); refreshOrdersList(); } catch (_) {}
  };
  act.advance = async el => {
    try { await api(`/api/orders/${el.dataset.id}/advance`, { method: 'POST', body: { fail: !!el.dataset.fail } }); toast(t('statusUpdated')); await openOrder(el.dataset.id); refreshOrdersList(); } catch (_) {}
  };
  act.in_orderCarrier = async el => { try { await api(`/api/orders/${el.dataset.id}`, { method: 'PATCH', body: { carrier: el.value } }); toast(t('saved')); await openOrder(el.dataset.id); refreshOrdersList(); } catch (_) {} };
  async function refreshOrdersList() { if (CD.state.route === 'orders') { oCache = await api('/api/orders?limit=300'); paintOrders(); } else CD.rerender(); CD.refreshBadges(); }

  // ---- manual order ----
  act.newOrder = async () => {
    const prods = await api('/api/products');
    const opts = prods.flatMap(p => p.variants.filter(v => v.stock > 0).map(v => ({ id: v.id, text: `${p.name}${v.label !== 'Standard' ? ' — ' + v.label : ''} (${v.stock})` })));
    const line = () => html`<div class="row nl" style="margin-bottom:8px"><select class="inp grow" data-f="v">${opts.map(o => html`<option value="${o.id}">${o.text}</option>`)}</select><input class="inp" style="width:70px" type="number" min="1" value="1" data-f="q"></div>`;
    CD.modal(html`<h2>${t('manualOrder')}</h2><div id="nlines" style="margin-top:12px">${line()}</div>
      <button class="btn sm" data-act="addLine">${icon('plus')} ${t('addLine')}</button><div class="sep"></div>
      <div class="grid k2" style="gap:8px"><div><label class="f">${t('name')}</label><input class="inp" id="no_name"></div><div><label class="f">${t('phone')}</label><input class="inp" id="no_phone" inputmode="tel" placeholder="06…"></div>
      <div><label class="f">${t('city')}</label><input class="inp" id="no_city" list="cities"></div><div><label class="f">${t('channel')}</label><select class="inp" id="no_channel"><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option><option value="tiktok">TikTok</option></select></div></div>
      <label class="f">${t('address')}</label><input class="inp" id="no_addr"><div class="err" id="noErr"></div>
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-act="closeOv">${t('cancel')}</button><button class="btn primary" data-act="saveOrder">${t('create')}</button></div>`);
    CD._lineTpl = line().s;
  };
  act.addLine = () => { $('#nlines').insertAdjacentHTML('beforeend', CD._lineTpl); };
  act.saveOrder = async () => {
    const items = [...document.querySelectorAll('.nl')].map(r => ({ variantId: Number(r.querySelector('[data-f=v]').value), qty: Number(r.querySelector('[data-f=q]').value) || 1 }));
    const body = { items, name: $('#no_name').value, phone: $('#no_phone').value, city: $('#no_city').value, address: $('#no_addr').value, channel: $('#no_channel').value };
    try { await api('/api/orders', { method: 'POST', body, quiet: true }); CD.closeOverlay(); toast(t('orderCreated')); refreshOrdersList(); }
    catch (e) { $('#noErr').textContent = e.code === 'bad_phone' ? t('phoneWrong') : e.code === 'out_of_stock' ? t('soldOut') : e.code === 'missing_details' ? t('error') : t('error'); }
  };

  // ======================= PRODUCTS =======================
  const EMOJIS = ['👗', '🥻', '🧥', '👟', '🧴', '👜', '👕', '👖', '🧣', '⌚', '💍', '🧸', '🎧', '🍯', '🕯️', '📦'];
  let pCache = [];
  views.products = async main => { pCache = await api('/api/products'); paintProducts(main); };
  function paintProducts(main) {
    main = main || $('#main');
    const can = CD.can('products');
    main.innerHTML = html`
      ${CD.topbar(t('products'), can ? html`<button class="btn" data-act="importCsv">${icon('upload')} ${t('importCsv')}</button><button class="btn primary" data-act="editProduct" data-id="0">${icon('plus')} ${t('addProduct')}</button>` : '')}
      ${pCache.length ? html`<div class="pgrid">${pCache.map(p => html`<div class="pcard" data-act="editProduct" data-id="${p.id}"><div class="pimg">${p.image ? html`<img src="${p.image}" alt="">` : p.emoji || '📦'}</div>
        <div class="pbody"><div class="nm">${p.name}</div><div class="row between"><b>${money(p.price)}</b><span class="small ${p.stock === 0 ? '' : 'muted'}">${p.stock === 0 ? html`<span class="pill failed">${t('soldOut')}</span>` : html`${p.stock} ${t('left')}`}</span></div>
        <div class="small muted" style="margin-top:4px">${p.variants.length > 1 ? p.variants.map(v => `${v.label}: ${v.stock}`).join(' · ') : ''}</div></div></div>`)}</div>` : html`<div class="card empty">${icon('tag')}<p>${t('stepProduct')}</p>${can ? html`<button class="btn primary" data-act="editProduct" data-id="0">${icon('plus')} ${t('addProduct')}</button>` : ''}</div>`}`.s;
  }

  function vrowHtml(v = {}) {
    return html`<div class="vrow" data-vid="${v.id || ''}"><input class="inp" data-f="label" placeholder="${t('variantLabel')}" value="${v.label && v.label !== 'Standard' ? v.label : ''}"><div class="row" style="gap:6px"><input class="inp" data-f="color" placeholder="${t('color')}" value="${v.color || ''}"><input class="inp" data-f="size" placeholder="${t('size')}" value="${v.size || ''}" style="max-width:70px"></div>
      <input class="inp" data-f="stock" type="number" min="0" value="${v.stock == null ? 0 : v.stock}" aria-label="${t('stock')}"><input class="inp" data-f="po" type="number" min="0" placeholder="${t('price')}" value="${v.price_override == null ? '' : v.price_override}"><button class="btn ghost sm" data-act="rmVariant" aria-label="${t('remove')}">${icon('x')}</button></div>`;
  }
  act.editProduct = el => {
    const id = Number(el.dataset.id); const p = id ? pCache.find(x => x.id === id) : { name: '', price: '', emoji: '👗', category: '', description: '', keywords: '', low_stock_alert: 3, variants: [{ stock: 10 }] };
    const can = CD.can('products');
    CD._img = p.image || ''; CD._emoji = p.emoji || '📦';
    CD.drawer(html`<div class="row between"><h2>${id ? p.name : t('addProduct')}</h2><button class="btn ghost sm" data-act="closeOv">${icon('x')}</button></div>
      <fieldset id="pform" style="border:0;padding:0;margin:0" ${can ? '' : raw('disabled')}>
      <div class="row wrap" style="margin:10px 0"><button class="btn mic" id="micBtn" data-act="dictate" type="button">${icon('mic')} ${t('dictate')}</button><span class="small muted" id="heard">${t('dictateHint')}</span></div>
      <label class="f">${t('name')}</label><input class="inp" id="p_name" value="${p.name}" maxlength="80">
      <div class="grid k2" style="gap:10px"><div><label class="f">${t('price')} (MAD)</label><input class="inp" id="p_price" type="number" min="1" value="${p.price}"></div><div><label class="f">${t('category')}</label><input class="inp" id="p_cat" value="${p.category || ''}"></div></div>
      <label class="f">${t('description')}</label><textarea class="inp" id="p_desc" maxlength="500">${p.description || ''}</textarea>
      <label class="f">${t('keywords')}</label><input class="inp" id="p_kw" value="${p.keywords || ''}" placeholder="robe, dress, فستان, fostan"><div class="tiny muted">${t('keywordsHint')}</div>
      <label class="f">${t('photo')}</label><div class="row"><div class="pimg" id="p_prev" style="width:84px;aspect-ratio:1;border-radius:12px;font-size:36px">${p.image ? html`<img src="${p.image}" alt="">` : p.emoji || '📦'}</div><label class="btn sm">${icon('upload')} ${t('uploadPhoto')}<input type="file" accept="image/*" id="p_file" data-in="pfile" hidden></label></div>
      <label class="f">${t('emoji')}</label><div class="emojis" id="p_emojis">${EMOJIS.map(e => html`<button type="button" class="${e === (p.emoji || '📦') ? 'on' : ''}" data-act="pickEmoji" data-e="${e}">${e}</button>`)}</div>
      <label class="f">${t('variants')}</label><div id="vrows">${(p.variants || []).map(vrowHtml)}</div>
      <button class="btn sm" type="button" data-act="addVariant">${icon('plus')} ${t('addVariant')}</button>
      <label class="f">${t('lowAlert')}</label><input class="inp" id="p_low" type="number" min="0" value="${p.low_stock_alert == null ? 3 : p.low_stock_alert}" style="max-width:120px"></fieldset>
      ${id ? html`<div class="sep"></div><h3 style="margin:0 0 6px;font-size:15px">${icon('zap')} ${t('postKit')}</h3><p class="small muted" style="margin-top:0">${t('postKitHint')}</p>
        <div class="row wrap"><select class="inp" id="pk_lang" style="max-width:150px">${[['fr', 'Français'], ['en', 'English'], ['ar', 'العربية']].map(([k, n]) => html`<option value="${k}" ${k === CD.state.me.shop.lang ? raw('selected') : ''}>${n}</option>`)}</select><select class="inp" id="pk_ch" style="max-width:150px"><option value="instagram">Instagram</option><option value="tiktok">TikTok</option></select><button class="btn accent" type="button" data-act="postKit" data-id="${id}">${t('generate')}</button></div>
        <textarea class="inp" id="pk_text" rows="7" readonly style="margin-top:10px"></textarea><div class="row wrap" style="margin-top:8px"><button class="btn sm" type="button" data-act="pkCopy">${icon('copy')} ${t('copyCaption')}</button></div>` : ''}
      <div class="err" id="pErr"></div>
      ${can ? html`<div class="row" style="justify-content:space-between;margin-top:16px">${id ? html`<button class="btn danger" data-act="delProduct" data-id="${id}">${icon('trash')} ${t('delete')}</button>` : '<span></span>'}<button class="btn primary" data-act="saveProduct" data-id="${id}">${t('save')}</button></div>` : html`<p class="muted small">${t('readOnly')}</p>`}`);
    CD._vTpl = vrowHtml({}).s;
  };
  act.postKit = async el => {
    try {
      const { code } = await api(`/api/products/${el.dataset.id}/postlink`, { method: 'POST', body: { channel: $('#pk_ch').value } });
      const r = await api(`/api/products/${el.dataset.id}/caption?lang=${$('#pk_lang').value}&code=${encodeURIComponent(code)}`);
      $('#pk_text').value = r.caption;
    } catch (_) {}
  };
  act.pkCopy = () => { const v = $('#pk_text').value; if (v) copyText(v); };
  act.addVariant = () => $('#vrows').insertAdjacentHTML('beforeend', CD._vTpl);
  act.rmVariant = el => { if (document.querySelectorAll('#vrows .vrow').length > 1) el.closest('.vrow').remove(); };
  act.pickEmoji = el => { CD._emoji = el.dataset.e; document.querySelectorAll('#p_emojis button').forEach(b => b.classList.toggle('on', b === el)); if (!CD._img) $('#p_prev').textContent = CD._emoji; };
  function resizeImage(file, max = 800) {
    return new Promise((resolve, reject) => {
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => { const r = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', 0.82)); };
      img.onerror = reject; img.src = url;
    });
  }
  act.in_pfile = async el => { const f = el.files[0]; if (!f) return; try { CD._img = await resizeImage(f); $('#p_prev').innerHTML = `<img src="${CD._img}" alt="">`; } catch (_) { toast(t('error'), true); } };
  act.saveProduct = async el => {
    const id = Number(el.dataset.id);
    const variants = [...document.querySelectorAll('#vrows .vrow')].map(r => ({ id: r.dataset.vid ? Number(r.dataset.vid) : undefined, label: r.querySelector('[data-f=label]').value, color: r.querySelector('[data-f=color]').value, size: r.querySelector('[data-f=size]').value, stock: r.querySelector('[data-f=stock]').value, price_override: r.querySelector('[data-f=po]').value }));
    const body = { name: $('#p_name').value, price: $('#p_price').value, category: $('#p_cat').value, description: $('#p_desc').value, keywords: $('#p_kw').value, low_stock_alert: $('#p_low').value, emoji: CD._emoji, variants };
    if (CD._img !== undefined) body.image = CD._img;
    try { await api(id ? `/api/products/${id}` : '/api/products', { method: id ? 'PUT' : 'POST', body, quiet: true }); CD.closeOverlay(); toast(t('saved')); CD.rerender(); }
    catch (e) { $('#pErr').textContent = e.code === 'name_and_price_required' ? `${t('name')} + ${t('price')}` : t('error'); }
  };
  act.delProduct = async el => { if (!confirm(t('confirmDelete'))) return; await api(`/api/products/${el.dataset.id}`, { method: 'DELETE' }); CD.closeOverlay(); CD.rerender(); };

  // voice -> product (seller dictates; server parses Darija/FR/EN/AR phrasing)
  let rec = null;
  act.dictate = el => {
    if (!CD.speechSupported) { toast(t('voiceUnsupported'), true); return; }
    if (rec) { rec.stop(); return; }
    el.classList.add('rec'); $('#heard').textContent = t('listening');
    rec = CD.listen(CD.speechLang(), {
      onInterim: s => { $('#heard').textContent = s; },
      onFinal: async s => {
        $('#heard').textContent = `${t('heard')}: “${s}”`;
        try {
          const r = await api('/api/products/voice-parse', { method: 'POST', body: { text: s } });
          if (r.name) $('#p_name').value = r.name; if (r.price) $('#p_price').value = r.price;
          const row = document.querySelector('#vrows .vrow');
          if (row) { if (r.color) row.querySelector('[data-f=color]').value = r.color; if (r.size) row.querySelector('[data-f=size]').value = r.size; if (r.stock != null) row.querySelector('[data-f=stock]').value = r.stock; }
        } catch (_) {}
      },
      onEnd: () => { rec = null; el.classList.remove('rec'); },
    });
    if (!rec) el.classList.remove('rec');
  };

  // CSV import
  function parseCsv(text) {
    const rows = []; let cur = [], f = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
      else if (c === '"') q = true; else if (c === ',' || c === ';') { cur.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; cur.push(f); f = ''; if (cur.some(x => x.trim())) rows.push(cur); cur = []; }
      else f += c;
    }
    cur.push(f); if (cur.some(x => x.trim())) rows.push(cur);
    return rows;
  }
  act.importCsv = () => {
    CD.modal(html`<h2>${t('importCsv')}</h2><p class="small muted">${t('csvHint')}</p><p><a href="#" data-act="csvTemplate">${t('downloadTemplate')}</a></p>
      <input type="file" accept=".csv,text/csv" id="csvFile" data-in="csvfile"><div class="err" id="csvErr"></div><div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-act="closeOv">${t('close')}</button></div>`);
  };
  act.csvTemplate = () => {
    const csv = 'name,price,stock,color,size,category,description\nRobe Satin,220,20,Blue,M,Robes,Robe satinée\nRobe Satin,220,15,Red,M,Robes,Robe satinée\n';
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'cendoor-products-template.csv'; a.click();
  };
  act.in_csvfile = async el => {
    const f = el.files[0]; if (!f) return;
    const rows = parseCsv(await f.text()); const head = rows.shift().map(h => h.trim().toLowerCase());
    const out = rows.map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
    try { const r = await api('/api/products/import', { method: 'POST', body: { rows: out }, quiet: true }); CD.closeOverlay(); toast(`${t('imported')}: ${r.created}`); CD.rerender(); }
    catch (_) { $('#csvErr').textContent = t('error'); }
  };
})();
