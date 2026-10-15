'use strict';
// Storage and safety for generated storefronts. Whatever produced the HTML/CSS (the procedural generator or an AI
// tool call), it goes through the same sanitizer before it is saved, so a stored site is always safe to render.
const { get, run } = require('./db');
const gen = require('./sitegen');
const san = require('./sanitize');
const FONTS = require('./fonts');
const D = require('./design');

const HEX = /^#[0-9a-fA-F]{6}$/;
const lang3 = l => (['ar', 'fr', 'en'].includes(l) ? l : 'fr');

function getSite(shopId) {
  const row = get('SELECT site FROM shops WHERE id=?', shopId);
  if (!row || !row.site) return null;
  try { const s = JSON.parse(row.site); return s && s.v === 2 ? s : null; } catch (_) { return null; }
}

function varsFrom(palette, fonts, radius) {
  const p = palette || {}; const ok = (v, d) => (HEX.test(String(v || '')) ? String(v).toLowerCase() : d);
  const a = ok(p.a, '#0f5c5c'), a2 = ok(p.a2, '#f28c28');
  return {
    a, a2, bg: ok(p.bg, '#faf7f2'), sf: ok(p.sf, '#ffffff'), tx: ok(p.tx, '#1b2a2a'), mu: ok(p.mu, '#62767a'), ln: ok(p.ln, '#e6e0d5'),
    'on-a': ok(p.onA || p['on-a'], '#ffffff'), 'on-a2': ok(p.onA2 || p['on-a2'], '#ffffff'),
    r: `${Math.max(0, Math.min(32, Math.round(Number(radius) || 0)))}px`, hf: FONTS.stack(fonts.h), bf: FONTS.stack(fonts.b),
  };
}

// site: { html, css, palette, fonts:{h,b}, radius, source, seed, input }
function saveSite(shopId, site) {
  const warnings = [];
  const fonts = { h: FONTS.FONTS[site.fonts && site.fonts.h] ? site.fonts.h : 'Inter', b: FONTS.FONTS[site.fonts && site.fonts.b] ? site.fonts.b : 'Inter' };
  const clean = {
    v: 2, source: site.source === 'ai' ? 'ai' : 'procedural', seed: Number(site.seed) || 1, input: site.input || null,
    fonts, palette: site.palette || null, radius: site.radius, vars: varsFrom(site.palette, fonts, site.radius),
    html: san.sanitizeHtml(site.html, warnings), css: san.scopeCss(site.css, '#site', warnings),
  };
  if (clean.html.length < 40) return { error: 'empty_page', warnings };
  run('UPDATE shops SET site=?, theme_color=? WHERE id=?', JSON.stringify(clean), clean.vars.a, shopId);
  return { site: clean, warnings };
}

// Generate (or regenerate) from an input description. `bump` moves to another layout seed.
function build(shopId, input, { seed, bump, fresh } = {}) {
  const cur = getSite(shopId); const shop = get('SELECT * FROM shops WHERE id=?', shopId);
  const prev = !fresh && cur && cur.input ? cur.input : {};
  const merged = { ...prev, ...input, variants: { ...(prev.variants || {}), ...((input && input.variants) || {}) }, lang: lang3(shop.lang) };
  const s = seed !== undefined ? seed : (cur ? cur.seed + (bump ? 1 : 0) : 1 + Math.floor(Math.random() * 900));
  const g = gen.generate(merged, s);
  const saved = saveSite(shopId, { ...g, input: merged, fonts: g.params.fonts, radius: g.params.radius });
  return { ...saved, params: g.params, seed: s };
}

function clearSite(shopId) { run("UPDATE shops SET site='' WHERE id=?", shopId); }

// What the browser needs to draw the page (the raw record minus internals).
function publicSite(shopId) {
  const s = getSite(shopId); if (!s) return null;
  const fam = [s.fonts.h, s.fonts.b].filter((f, i, a) => a.indexOf(f) === i).join(',');
  return { html: s.html, css: s.css, vars: s.vars, fontsHref: `/fonts.css?f=${encodeURIComponent(fam)}`, source: s.source };
}

module.exports = { getSite, saveSite, build, clearSite, publicSite, varsFrom, lang3 };
