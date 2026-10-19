'use strict';
// "Launch an ad" from Cendoor. The seller connects their OWN Meta ad account, picks a product, reviews the generated ad and
// the budget, confirms, and Cendoor creates the campaign in their account. The seller pays Meta directly; Cendoor never holds
// ad money. Hard limits protect the seller: a daily budget range, a maximum number of days, a total cap, a limit on running ads,
// and nothing is created without an explicit confirmation.
//
// HONEST STATUS: the calls below follow Meta's documented Marketing API (campaign -> ad set -> creative -> ad), but they have
// never run against Meta's live servers. Creating ads for accounts other than your own needs Meta's Advanced Access (app review
// + business verification); before that only people with a role on your Meta app can connect. Until a real connection exists,
// the flow runs as a DRY RUN: everything is validated and recorded, nothing is sent.
const crypto = require('crypto');
const { get, all, run, tx } = require('./db');

const GRAPH = 'https://graph.facebook.com/v21.0';
const LIMITS = { dailyMin: 20, dailyMax: 300, daysMax: 14, totalMax: 2000, activeMax: 3, perDayMax: 5 };
const RATES = { MAD: 1, USD: Number(process.env.ADS_MAD_PER_USD) || 10, EUR: Number(process.env.ADS_MAD_PER_EUR) || 10.8 };
const META_SCOPES = 'ads_management,ads_read,business_management,pages_show_list';

const configured = () => !!(process.env.META_APP_ID && process.env.META_APP_SECRET);

// ---------- token storage (encrypted at rest; the key must be set in production) ----------
const key = () => crypto.createHash('sha256').update(String(process.env.CENDOOR_TOKEN_KEY || process.env.CENDOOR_NETWORK_SECRET || 'cendoor-dev-only-key')).digest();
function seal(text) {
  const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(String(text), 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), enc].map(b => b.toString('base64')).join('.');
}
function unseal(blob) {
  try { const [iv, tag, enc] = String(blob).split('.').map(x => Buffer.from(x, 'base64')); const d = crypto.createDecipheriv('aes-256-gcm', key(), iv); d.setAuthTag(tag); return Buffer.concat([d.update(enc), d.final()]).toString('utf8'); } catch (_) { return ''; }
}

// ---------- connection ----------
function connection(shopId) {
  const r = get("SELECT id, ad_account_id, page_id, currency, name, mode, connected_at FROM ad_accounts WHERE shop_id=? AND channel='meta'", shopId);
  return r || null;
}
function connectDemo(shopId) {
  run("INSERT INTO ad_accounts (shop_id, channel, ad_account_id, page_id, currency, name, mode) VALUES (?, 'meta', 'act_demo', 'page_demo', 'MAD', 'Demo ad account (nothing is sent)', 'demo') ON CONFLICT(shop_id, channel) DO UPDATE SET mode='demo', ad_account_id='act_demo', page_id='page_demo', currency='MAD', name='Demo ad account (nothing is sent)', token_enc=''", shopId);
}
function connectLive(shopId, { token, adAccountId, pageId, currency, name }) {
  const acct = String(adAccountId).startsWith('act_') ? String(adAccountId) : 'act_' + String(adAccountId).replace(/\D/g, '');
  run("INSERT INTO ad_accounts (shop_id, channel, ad_account_id, page_id, currency, name, token_enc, mode) VALUES (?, 'meta', ?, ?, ?, ?, ?, 'live') ON CONFLICT(shop_id, channel) DO UPDATE SET ad_account_id=excluded.ad_account_id, page_id=excluded.page_id, currency=excluded.currency, name=excluded.name, token_enc=excluded.token_enc, mode='live', connected_at=CURRENT_TIMESTAMP",
    shopId, acct, String(pageId), String(currency || 'MAD').toUpperCase(), String(name || '').slice(0, 80), seal(token));
}
const disconnect = shopId => run("DELETE FROM ad_accounts WHERE shop_id=? AND channel='meta'", shopId);

// Facebook Login for Business: the seller approves the permissions on Meta's own screen.
const stateSig = (shopId, exp) => crypto.createHmac('sha256', key()).update(`${shopId}.${exp}`).digest('hex').slice(0, 32);
function oauthUrl(shopId, redirectUri) {
  const exp = Date.now() + 10 * 60 * 1000;
  const state = `${shopId}.${exp}.${stateSig(shopId, exp)}`;
  const q = new URLSearchParams({ client_id: process.env.META_APP_ID, redirect_uri: redirectUri, scope: META_SCOPES, state, response_type: 'code' });
  return `https://www.facebook.com/v21.0/dialog/oauth?${q}`;
}
function checkState(shopId, state) {
  const [sid, exp, sig] = String(state || '').split('.');
  return Number(sid) === Number(shopId) && Number(exp) > Date.now() && sig === stateSig(sid, exp);
}
async function graph(method, path, params, token) {
  const url = new URL(`${GRAPH}/${path}`); const init = { method, headers: {}, signal: AbortSignal.timeout(20000) };
  if (method === 'GET') { for (const [k, v] of Object.entries(params || {})) url.searchParams.set(k, typeof v === 'string' ? v : JSON.stringify(v)); if (token) url.searchParams.set('access_token', token); }
  else { const body = new URLSearchParams(); for (const [k, v] of Object.entries(params || {})) body.set(k, typeof v === 'string' ? v : JSON.stringify(v)); if (token) body.set('access_token', token); init.body = body; init.headers['content-type'] = 'application/x-www-form-urlencoded'; }
  const res = await fetch(url, init); const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(`Meta ${res.status}: ${String((json.error && json.error.message) || 'request failed').slice(0, 220)}`);
  return json;
}
// Called from the OAuth callback: exchanges the code, lists the seller's ad accounts and pages, and stores the first of each.
async function finishOauth(shopId, code, redirectUri) {
  const t = await graph('GET', 'oauth/access_token', { client_id: process.env.META_APP_ID, client_secret: process.env.META_APP_SECRET, redirect_uri: redirectUri, code });
  const long = await graph('GET', 'oauth/access_token', { grant_type: 'fb_exchange_token', client_id: process.env.META_APP_ID, client_secret: process.env.META_APP_SECRET, fb_exchange_token: t.access_token }).catch(() => t);
  const accts = await graph('GET', 'me/adaccounts', { fields: 'account_id,name,currency,account_status' }, long.access_token);
  const pages = await graph('GET', 'me/accounts', { fields: 'id,name' }, long.access_token);
  const acct = (accts.data || []).find(a => Number(a.account_status) === 1) || (accts.data || [])[0];
  const page = (pages.data || [])[0];
  if (!acct) return { error: 'no_ad_account' }; if (!page) return { error: 'no_page' };
  connectLive(shopId, { token: long.access_token, adAccountId: acct.account_id, pageId: page.id, currency: acct.currency, name: `${acct.name} / ${page.name}` });
  return { ok: true };
}

// Pilot path: a seller (or you, for them) pastes a token for an ad account that already works. It is verified with Meta before it is stored.
async function connectManual(shopId, { token, adAccountId, pageId }) {
  const acct = String(adAccountId || '').startsWith('act_') ? String(adAccountId) : 'act_' + String(adAccountId || '').replace(/\D/g, '');
  if (acct === 'act_' || !token || !/^\d{5,}$/.test(String(pageId || ''))) return { error: 'missing_fields' };
  try {
    const info = await graph('GET', acct, { fields: 'name,currency,account_status' }, String(token).trim());
    if (Number(info.account_status) !== 1) return { error: 'account_not_active' };
    connectLive(shopId, { token: String(token).trim(), adAccountId: acct, pageId, currency: info.currency, name: info.name });
    return { ok: true, currency: info.currency };
  } catch (e) { return { error: 'meta_error', message: String(e.message).slice(0, 200) }; }
}

// ---------- the ad itself ----------
const cut = (s, n) => { s = String(s).trim(); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'; };
const COPY = {
  en: (p, o, shop) => ({ headline: cut(p.name, 40), text: cut(`${p.name}${o ? ' — ' + o : ''}. Order in a minute and pay on delivery. ${shop}`, 125) }),
  fr: (p, o, shop) => ({ headline: cut(p.name, 40), text: cut(`${p.name}${o ? ' — ' + o : ''}. Commandez en une minute et payez à la livraison. ${shop}`, 125) }),
  ar: (p, o, shop) => ({ headline: cut(p.name, 40), text: cut(`${p.name}${o ? ' — ' + o : ''}. اطلب في دقيقة وادفع عند الاستلام. ${shop}`, 125) }),
};
function draft(shop, product, lang = 'fr', offer = '') {
  const L = COPY[lang] ? lang : 'fr';
  const c = COPY[L](product, String(offer || '').trim().slice(0, 60), shop.name);
  return { ...c, cta: 'SHOP_NOW', product_id: product.id, image: product.image || '' };
}
function validate({ daily, days, headline, text }) {
  daily = Number(daily); days = Math.floor(Number(days));
  if (!Number.isFinite(daily) || daily < LIMITS.dailyMin || daily > LIMITS.dailyMax) return { error: 'budget_range', min: LIMITS.dailyMin, max: LIMITS.dailyMax };
  if (!Number.isFinite(days) || days < 1 || days > LIMITS.daysMax) return { error: 'days_range', max: LIMITS.daysMax };
  if (daily * days > LIMITS.totalMax) return { error: 'total_cap', max: LIMITS.totalMax };
  if (String(headline || '').trim().length < 3 || String(text || '').trim().length < 10) return { error: 'copy_too_short' };
  return { daily, days };
}
function toMinor(mad, currency) {
  const rate = RATES[currency]; if (!rate) return null;
  return Math.max(1, Math.round((mad / rate) * 100));
}
const abs = (base, path) => (/^https?:/.test(path) ? path : base ? base.replace(/\/$/, '') + path : '');

// The seller has seen the ad and the budget and confirmed: only then is anything created.
async function launch(shopId, { productId, headline, text, daily, days, createdBy = null, baseUrl = '', confirmed = false }) {
  if (confirmed !== true) return { error: 'confirm_required' };
  const v = validate({ daily, days, headline, text }); if (v.error) return v;
  const conn = connection(shopId); if (!conn) return { error: 'not_connected' };
  const product = get('SELECT * FROM products WHERE id=? AND shop_id=? AND active=1', productId, shopId); if (!product) return { error: 'product_not_found' };
  if (get("SELECT COUNT(*) n FROM ads WHERE shop_id=? AND status IN ('active','dry_run') AND date(end_date) >= date('now')", shopId).n >= LIMITS.activeMax) return { error: 'too_many_active', max: LIMITS.activeMax };
  if (get("SELECT COUNT(*) n FROM ads WHERE shop_id=? AND date(created_at)=date('now')", shopId).n >= LIMITS.perDayMax) return { error: 'daily_limit', max: LIMITS.perDayMax };
  const minor = toMinor(v.daily, conn.currency);
  if (conn.mode === 'live' && minor == null) return { error: 'currency_unsupported', currency: conn.currency };
  const shop = get('SELECT * FROM shops WHERE id=?', shopId);
  const base = String(baseUrl || process.env.PUBLIC_URL || '').replace(/\/$/, '');
  const start = new Date(Date.now() + 5 * 60 * 1000), end = new Date(start.getTime() + v.days * 86400000);
  const live = conn.mode === 'live';
  let id, code;
  tx(() => {
    const r = run('INSERT INTO ads (shop_id, product_id, name, headline, text, cta, image, daily_budget, days, start_date, end_date, status, mode, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      shopId, product.id, `${shop.name}: ${product.name}`.slice(0, 80), String(headline).trim().slice(0, 40), String(text).trim().slice(0, 300), 'SHOP_NOW', product.image || '', v.daily, v.days, start.toISOString(), end.toISOString(), live ? 'creating' : 'dry_run', live ? 'live' : 'dry_run', createdBy);
    id = Number(r.lastInsertRowid); code = `ad-${id.toString(36)}`;
    run('INSERT INTO post_links (shop_id, code, label, channel, product_id) VALUES (?,?,?,?,?)', shopId, code, `Ad: ${product.name}`.slice(0, 80), 'instagram', product.id);
    run('UPDATE ads SET link_code=? WHERE id=?', code, id);
  });
  const link = base ? `${base}/s/${shop.slug}?p=${code}` : '';
  if (!live) return { ok: true, id, mode: 'dry_run', link: link || null, note: 'Dry run: nothing was sent to Meta.' };
  if (!link) { run("UPDATE ads SET status='failed', error=? WHERE id=?", 'PUBLIC_URL is not set, so the ad would have no working link.', id); return { error: 'public_url_required', id }; }

  // Live: everything is created PAUSED first and switched on only when all four objects exist.
  const token = unseal(get('SELECT token_enc FROM ad_accounts WHERE shop_id=?', shopId).token_enc);
  if (!token) { run("UPDATE ads SET status='failed', error='Connection token missing; reconnect the ad account.' WHERE id=?", id); return { error: 'token_missing', id }; }
  const acct = conn.ad_account_id; const made = {};
  try {
    const camp = await graph('POST', `${acct}/campaigns`, { name: `Cendoor ${product.name}`.slice(0, 100), objective: 'OUTCOME_TRAFFIC', status: 'PAUSED', special_ad_categories: [] }, token); made.campaign_id = camp.id;
    const set = await graph('POST', `${acct}/adsets`, { name: `Cendoor ${product.name} Morocco`.slice(0, 100), campaign_id: camp.id, daily_budget: String(minor), billing_event: 'IMPRESSIONS', optimization_goal: 'LINK_CLICKS', bid_strategy: 'LOWEST_COST_WITHOUT_CAP', start_time: start.toISOString(), end_time: end.toISOString(), targeting: { geo_locations: { countries: ['MA'] }, age_min: 18, age_max: 55, publisher_platforms: ['facebook', 'instagram'] }, status: 'PAUSED' }, token); made.adset_id = set.id;
    const link_data = { link, message: String(text).trim().slice(0, 300), name: String(headline).trim().slice(0, 40), call_to_action: { type: 'SHOP_NOW', value: { link } } };
    const pic = abs(base, product.image || ''); if (pic) link_data.picture = pic;
    const cr = await graph('POST', `${acct}/adcreatives`, { name: `Cendoor ${product.name}`.slice(0, 100), object_story_spec: { page_id: conn.page_id, link_data } }, token); made.creative_id = cr.id;
    const ad = await graph('POST', `${acct}/ads`, { name: `Cendoor ${product.name}`.slice(0, 100), adset_id: set.id, creative: { creative_id: cr.id }, status: 'PAUSED' }, token); made.ad_id = ad.id;
    for (const objId of [camp.id, set.id, ad.id]) await graph('POST', objId, { status: 'ACTIVE' }, token);
    run("UPDATE ads SET status='active', campaign_id=?, adset_id=?, creative_id=?, ad_id=? WHERE id=?", made.campaign_id, made.adset_id, made.creative_id, made.ad_id, id);
    return { ok: true, id, mode: 'live', link };
  } catch (e) {
    run("UPDATE ads SET status='failed', error=?, campaign_id=?, adset_id=?, creative_id=?, ad_id=? WHERE id=?", String(e.message).slice(0, 300), made.campaign_id || '', made.adset_id || '', made.creative_id || '', made.ad_id || '', id);
    return { error: 'meta_error', id, message: String(e.message).slice(0, 300), note: 'Anything already created is still PAUSED in the ad account; no ad is running.' };
  }
}

async function pause(shopId, adId) {
  const ad = get('SELECT * FROM ads WHERE id=? AND shop_id=?', adId, shopId); if (!ad) return { error: 'not_found' };
  if (ad.mode === 'live' && ad.campaign_id) {
    const row = get('SELECT token_enc FROM ad_accounts WHERE shop_id=?', shopId); const token = row && unseal(row.token_enc);
    if (!token) return { error: 'token_missing' };
    try { for (const objId of [ad.ad_id, ad.adset_id, ad.campaign_id].filter(Boolean)) await graph('POST', objId, { status: 'PAUSED' }, token); }
    catch (e) { return { error: 'meta_error', message: String(e.message).slice(0, 300) }; }
  }
  run("UPDATE ads SET status='paused' WHERE id=?", adId); return { ok: true };
}

// ---------- results: what the ad really brought, counted on DELIVERED orders ----------
function list(shopId) {
  return all('SELECT a.*, p.name product_name FROM ads a LEFT JOIN products p ON p.id=a.product_id WHERE a.shop_id=? ORDER BY a.id DESC LIMIT 30', shopId).map(a => {
    const visits = (get('SELECT visits FROM post_links WHERE shop_id=? AND code=?', shopId, a.link_code) || { visits: 0 }).visits;
    const o = get(`SELECT COUNT(*) orders, COALESCE(SUM(status='delivered'),0) delivered, COALESCE(SUM(CASE WHEN status='delivered' THEN total END),0) delivered_revenue,
      COALESCE(SUM(CASE WHEN status NOT IN ('cancelled','failed') THEN total END),0) open_revenue FROM orders WHERE shop_id=? AND source_code=?`, shopId, a.link_code);
    const elapsed = a.status === 'failed' ? 0 : Math.max(0, Math.min(a.days, Math.ceil((Date.now() - new Date(a.start_date).getTime()) / 86400000)));
    const budgetSoFar = a.mode === 'dry_run' || a.status === 'paused' ? 0 : a.daily_budget * elapsed;
    return { ...a, visits, orders: o.orders, delivered: o.delivered, delivered_revenue: o.delivered_revenue, open_revenue: o.open_revenue, budget_so_far: budgetSoFar,
      real_return: budgetSoFar > 0 ? Math.round((o.delivered_revenue / budgetSoFar) * 100) / 100 : null };
  });
}

module.exports = { configured, connection, connectDemo, connectLive, connectManual, disconnect, oauthUrl, checkState, finishOauth, draft, validate, launch, pause, list, LIMITS, META_SCOPES, toMinor };
