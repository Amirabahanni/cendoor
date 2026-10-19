'use strict';
// Cendoor dashboard core: i18n, safe templating, API client, shell, auth, routing.
(() => {
  const CD = window.CD = { views: {}, act: {}, timers: [], state: { me: null, badges: {}, route: 'overview' } };

  // ---------- storage (never throws) ----------
  const store = {
    get(k, d) { try { return localStorage.getItem(k) ?? d; } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} },
  };
  CD.store = store;

  // ---------- i18n ----------
  let LANG = store.get('cd_lang', null) || ((navigator.language || 'en').startsWith('fr') ? 'fr' : (navigator.language || '').startsWith('ar') ? 'ar' : 'en');
  if (!I18N[LANG]) LANG = 'en';
  const t = CD.t = (k, ...a) => { const v = (I18N[LANG] && I18N[LANG][k] !== undefined) ? I18N[LANG][k] : (I18N.en[k] !== undefined ? I18N.en[k] : k); return typeof v === 'function' ? v(...a) : v; };
  CD.lang = () => LANG;
  CD.setLang = l => { LANG = l; store.set('cd_lang', l); applyDir(); render(); };
  function applyDir() { document.documentElement.lang = LANG; document.documentElement.dir = I18N[LANG].dir; }
  const LOCALE = () => ({ en: 'en-GB', fr: 'fr-FR', ar: 'ar-MA-u-nu-latn' }[LANG]);

  // ---------- safe templating ----------
  const esc = CD.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
  const raw = CD.raw = s => new Raw(s);
  const val = v => (v instanceof Raw ? v.s : Array.isArray(v) ? v.map(val).join('') : v === false || v == null ? '' : esc(v));
  const html = CD.html = (strs, ...vals) => new Raw(strs.reduce((a, s, i) => a + s + (i < vals.length ? val(vals[i]) : ''), ''));

  // ---------- icons ----------
  const ICONS = {
    home: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z', box: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
    tag: 'M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01', chat: 'M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 20l1.1-4.9A8.4 8.4 0 0 1 3 11.5 8.5 8.5 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z',
    users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
    link: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7', cash: 'M2 7h18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zM2 7l14-4v4M17 14h.01',
    sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6', mic: 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8',
    plus: 'M12 5v14M5 12h14', x: 'M18 6L6 18M6 6l12 12', check: 'M20 6L9 17l-5-5', send: 'M22 2L11 13M22 2l-7 20-4-9-9-4z',
    print: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z', ext: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3',
    alert: 'M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01', menu: 'M3 12h18M3 6h18M3 18h18',
    copy: 'M9 9h11v11H9zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1', trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6', zap: 'M13 2L3 14h9l-1 8 10-12h-9z',
    download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3', upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  };
  const icon = CD.icon = (n, cls = '') => raw(`<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n] || ''}"/></svg>`);

  // ---------- formatting ----------
  CD.money = n => `${Math.round(Number(n) || 0).toLocaleString(LOCALE())} MAD`;
  CD.num = n => (Number(n) || 0).toLocaleString(LOCALE());
  const parseDate = s => (s ? new Date(String(s).replace(' ', 'T') + (String(s).includes('Z') ? '' : 'Z')) : null);
  CD.fmtDate = s => { const d = parseDate(s); return d ? d.toLocaleString(LOCALE(), { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'; };
  CD.fmtDay = s => { const d = parseDate(s); return d ? d.toLocaleDateString(LOCALE(), { day: '2-digit', month: 'short' }) : '—'; };
  CD.ago = s => {
    const d = parseDate(s); if (!d) return ''; const m = Math.max(0, Math.round((Date.now() - d) / 60000));
    if (m < 1) return '·'; if (m < 60) return m + 'm'; if (m < 1440) return Math.round(m / 60) + 'h'; return Math.round(m / 1440) + 'd';
  };
  CD.chanLabel = c => t(c) || c;

  // ---------- toast ----------
  CD.toast = (msg, isErr) => {
    const w = document.getElementById('toasts'); if (!w) return;
    const d = document.createElement('div'); d.className = 'toast' + (isErr ? ' err' : ''); d.textContent = msg; w.appendChild(d);
    setTimeout(() => d.remove(), isErr ? 5000 : 2600);
  };

  // ---------- API ----------
  CD.api = async (path, opts = {}) => {
    const o = { method: opts.method || 'GET', headers: {}, credentials: 'same-origin' };
    if (opts.body !== undefined) { o.headers['content-type'] = 'application/json'; o.body = JSON.stringify(opts.body); }
    let res;
    try { res = await fetch(path, o); } catch (e) { CD.toast(t('connectionLost'), true); throw e; }
    let data = null; try { data = await res.json(); } catch (_) {}
    if (res.status === 401 && path !== '/api/auth/login') { CD.state.me = null; render(); throw Object.assign(new Error('auth'), { code: 'auth' }); }
    if (!res.ok) { const err = Object.assign(new Error((data && data.error) || 'error'), { code: data && data.error, status: res.status, data }); if (!opts.quiet) CD.toast(res.status === 403 ? t('forbidden') : (t('err_' + err.code) !== 'err_' + err.code ? t('err_' + err.code) : t('error') + (err.code ? ` (${err.code})` : '')), true); throw err; }
    return data;
  };

  // ---------- overlays ----------
  CD.closeOverlay = () => { document.querySelectorAll('.overlay').forEach(o => o.remove()); document.body.style.overflow = ''; };
  function overlay(inner, modal) {
    const o = document.createElement('div'); o.className = 'overlay' + (modal ? ' modal-wrap' : '');
    o.innerHTML = `<div class="${modal ? 'modal' : 'drawer'}" role="dialog" aria-modal="true">${inner.s}</div>`;
    o.addEventListener('mousedown', e => { if (e.target === o) CD.closeOverlay(); });
    document.body.appendChild(o); document.body.style.overflow = 'hidden';
    const f = o.querySelector('input,select,textarea'); if (f && !modal) { /* leave focus */ }
    return o.firstChild;
  }
  CD.drawer = inner => overlay(inner, false);
  CD.modal = inner => overlay(inner, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') CD.closeOverlay(); });

  // ---------- speech (Web Speech API) ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  CD.speechSupported = !!SR;
  CD.listen = (lang, { onInterim, onFinal, onEnd }) => {
    if (!SR) return null;
    const r = new SR(); r.lang = lang; r.interimResults = true; r.maxAlternatives = 1; r.continuous = false;
    r.onresult = e => { let fin = '', int = ''; for (const res of e.results) (res.isFinal ? (fin += res[0].transcript) : (int += res[0].transcript)); if (int && onInterim) onInterim(int); if (fin && onFinal) onFinal(fin); };
    r.onend = () => onEnd && onEnd(); r.onerror = () => onEnd && onEnd();
    try { r.start(); } catch (_) { return null; }
    return r;
  };
  CD.speechLang = () => ({ en: 'en-US', fr: 'fr-FR', ar: 'ar-MA' }[LANG]);

  // ---------- auth screen ----------
  function langPicker() {
    return html`<select class="inp" style="width:auto;min-height:34px;padding:4px 8px" data-in="lang" aria-label="${t('langName')}">${Object.keys(I18N).map(k => html`<option value="${k}" ${k === LANG ? raw('selected') : ''}>${I18N[k].langLabel}</option>`)}</select>`;
  }
  let authTab = 'login';
  function authView() {
    return html`<div class="auth"><div class="auth-card">
      <div class="row between"><div class="logo">cendoor</div>${langPicker()}</div>
      <p class="muted small" style="margin:10px 0 0">${t('slogan')}</p>
      <div class="tabs"><button class="${authTab === 'login' ? 'on' : ''}" data-act="authTab" data-v="login">${t('login')}</button><button class="${authTab === 'signup' ? 'on' : ''}" data-act="authTab" data-v="signup">${t('signup')}</button></div>
      <form id="authForm" autocomplete="on">
        ${authTab === 'signup' ? html`<label class="f">${t('shopName')}</label><input class="inp" name="shopName" required maxlength="60"><label class="f">${t('yourName')}</label><input class="inp" name="name" maxlength="60">` : ''}
        <label class="f">${t('email')}</label><input class="inp" type="email" name="email" required autocomplete="username">
        <label class="f">${t('password')}</label><input class="inp" type="password" name="password" required minlength="8" autocomplete="${authTab === 'login' ? 'current-password' : 'new-password'}">
        <div class="err" id="authErr"></div>
        <button class="btn primary block" type="submit">${authTab === 'login' ? t('login') : t('signup')}</button>
      </form>
      <div class="demo-box"><b>${t('demoHint')}</b><br><span class="muted">demo@cendoor.com / demo1234</span><br><button class="btn sm mt" data-act="fillDemo">${t('tryDemo')}</button></div>
    </div></div>`;
  }
  CD.act.authTab = el => { authTab = el.dataset.v; render(); };
  CD.act.fillDemo = async () => { await doAuth('login', { email: 'demo@cendoor.com', password: 'demo1234' }); };
  async function doAuth(kind, body) {
    try { await CD.api(kind === 'login' ? '/api/auth/login' : '/api/auth/signup', { method: 'POST', body, quiet: true }); await boot(); }
    catch (e) { const el = document.getElementById('authErr'); if (el) el.textContent = ({ bad_credentials: 'Wrong email or password', email_taken: 'This email is already registered', weak_password: 'Password must be at least 8 characters', bad_email: 'Invalid email', slow_down: 'Too many attempts, wait a minute' }[e.code]) || t('error'); }
  }
  document.addEventListener('submit', e => {
    if (e.target.id === 'authForm') { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); doAuth(authTab, f); }
  });

  // ---------- shell ----------
  const NAV = [['overview', 'home'], ['studio', 'zap'], ['orders', 'box'], ['inbox', 'chat'], ['products', 'tag'], ['customers', 'users'], ['settings', 'sliders']];
  // pages that live under another menu entry, shown as tabs at the top of the page
  const GROUPS = { orders: ['orders', 'money'], products: ['products', 'links', 'ads'], customers: ['customers', 'campaigns'], settings: ['settings', 'team'] };
  const groupOf = r => Object.keys(GROUPS).find(g => GROUPS[g].includes(r)) || r;
  function shell(inner) {
    const { me, badges } = CD.state; const r = CD.state.route;
    const b = { orders: badges.toApprove, inbox: badges.attention };
    return html`<div class="shell">
      <aside class="side" id="side">
        <div class="logo">cendoor</div>
        <nav class="nav">${NAV.filter(([k]) => k !== 'team' || me.can.team || true).map(([k, ic]) => html`<a href="#/${k}" class="${groupOf(r) === k ? 'on' : ''}" data-act="closeMenu">${icon(ic)}<span>${t(k)}</span>${b[k] ? html`<span class="badge">${b[k]}</span>` : ''}</a>`)}</nav>
        <div class="spacer"></div>
        <a class="btn sm" href="/s/${me.shop.slug}" target="_blank" rel="noopener">${icon('ext')} ${t('viewStore')}</a>
        <div class="userbox">
          <div class="bold">${me.shop.name}</div><div class="small muted">${me.user.name || me.user.email}</div>
          <div class="row mt" style="margin-top:8px;justify-content:space-between"><span class="role">${t(me.user.role)}</span>${langPicker()}</div>
          <button class="btn ghost sm block" style="margin-top:4px" data-act="theme">${document.documentElement.dataset.theme === 'dark' ? '☀' : '☾'} ${t('themeBtn')}</button>
          <button class="btn ghost sm block" style="margin-top:8px" data-act="logout">${t('logout')}</button>
        </div>
      </aside>
      <div class="scrim hidden" id="scrim" data-act="closeMenu"></div>
      <main class="main" id="main">${inner || ''}</main>
    </div>`;
  }
  CD.act.theme = () => { const d = document.documentElement; const next = d.dataset.theme === 'dark' ? 'light' : 'dark'; d.dataset.theme = next; try { localStorage.setItem('cd_theme', next); } catch (_) {} CD.rerender ? (CD.state.me && render()) : 0; };
  CD.act.closeMenu = () => { document.getElementById('side')?.classList.remove('open'); document.getElementById('scrim')?.classList.add('hidden'); };
  CD.act.openMenu = () => { document.getElementById('side')?.classList.add('open'); document.getElementById('scrim')?.classList.remove('hidden'); };
  CD.act.logout = async () => { await CD.api('/api/auth/logout', { method: 'POST' }).catch(() => {}); CD.state.me = null; render(); };
  const subnav = () => { const g = GROUPS[groupOf(CD.state.route)]; return g && g.length > 1 ? html`<div class="chips mb subnav">${g.map(k => html`<a class="chip ${k === CD.state.route ? 'on' : ''}" href="#/${k}">${t(k)}</a>`)}</div>` : ''; };
  CD.topbar = (title, actions) => html`<div class="topbar"><button class="btn ghost menu-btn" data-act="openMenu" aria-label="Menu">${icon('menu')}</button><h1>${title}</h1>${actions || ''}</div>${subnav()}`;
  CD.can = k => !!(CD.state.me && CD.state.me.can[k]);

  // ---------- routing ----------
  function currentRoute() { const r = (location.hash.replace(/^#\/?/, '') || 'overview').split(/[/?]/)[0]; return CD.views[r] ? r : 'overview'; }
  async function render() {
    applyDir();
    const root = document.getElementById('root');
    CD.timers.forEach(clearInterval); CD.timers = [];
    if (!CD.state.me) { root.innerHTML = authView().s; return; }
    CD.state.route = currentRoute();
    root.innerHTML = shell(html`<div class="stack"><div class="skeleton"></div><div class="skeleton"></div></div>`).s;
    const main = document.getElementById('main');
    try { await CD.views[CD.state.route](main); } catch (e) { if (e.code !== 'auth') { console.error(e); main.innerHTML = `<div class="empty">${esc(t('error'))}</div>`; } }
    refreshBadges();
  }
  CD.render = render;
  CD.rerender = async () => { const main = document.getElementById('main'); if (main && CD.state.me) { try { await CD.views[CD.state.route](main); } catch (_) {} refreshBadges(); } };
  async function refreshBadges() {
    try {
      const [a, o] = await Promise.all([CD.api('/api/analytics?days=7', { quiet: true }), CD.api('/api/orders?status=pending_confirmation&limit=100', { quiet: true })]);
      CD.state.badges = { attention: a.attention, toApprove: o.length };
      document.querySelectorAll('.nav a').forEach(a2 => { const k = a2.getAttribute('href').slice(2); const n = k === 'orders' ? CD.state.badges.toApprove : k === 'inbox' ? CD.state.badges.attention : 0; let b = a2.querySelector('.badge'); if (n) { if (!b) { b = document.createElement('span'); b.className = 'badge'; a2.appendChild(b); } b.textContent = n; } else if (b) b.remove(); });
    } catch (_) {}
  }
  CD.refreshBadges = refreshBadges;

  // ---------- global event delegation ----------
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const fn = CD.act[el.dataset.act]; if (fn) { e.preventDefault && el.tagName === 'A' && el.getAttribute('href') === '#' ; fn(el, e); }
  });
  document.addEventListener('change', e => {
    const el = e.target.closest('[data-in]'); if (!el) return;
    if (el.dataset.in === 'lang') CD.setLang(el.value);
    else if (CD.act['in_' + el.dataset.in]) CD.act['in_' + el.dataset.in](el, e);
  });
  document.addEventListener('input', e => { const el = e.target.closest('[data-type]'); if (el && CD.act['type_' + el.dataset.type]) CD.act['type_' + el.dataset.type](el, e); });
  window.addEventListener('hashchange', () => { if (CD.state.me) { CD.closeOverlay(); render(); } });

  // ---------- boot ----------
  async function boot() {
    try { CD.state.me = await CD.api('/api/me', { quiet: true }); } catch (_) { CD.state.me = null; }
    render();
  }
  CD.reloadMe = async () => { CD.state.me = await CD.api('/api/me'); };
  window.addEventListener('DOMContentLoaded', boot);
  if (document.readyState !== 'loading') boot();
})();
