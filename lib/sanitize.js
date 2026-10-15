'use strict';
// Sanitizer for AI-written storefront markup. An AI (or a seller) can write any layout, but only through an
// allowlist: no scripts, forms, iframes, event handlers, external resources or javascript: links. CSS is parsed,
// filtered and scoped under #site so it can never restyle the dashboard or the chat widget.

const HTML_TAGS = new Set('section header footer nav main article aside div span p h1 h2 h3 h4 h5 h6 a ul ol li strong em b i u s small mark sub sup br hr img figure figcaption blockquote cite q details summary button table thead tbody tr th td caption address time abbr svg g path circle ellipse rect line polyline polygon defs lineargradient radialgradient stop pattern text tspan clippath mask filter fegaussianblur'.split(' '));
const SVG_TAGS = { svg: 'svg', g: 'g', path: 'path', circle: 'circle', ellipse: 'ellipse', rect: 'rect', line: 'line', polyline: 'polyline', polygon: 'polygon', defs: 'defs', lineargradient: 'linearGradient', radialgradient: 'radialGradient', stop: 'stop', pattern: 'pattern', text: 'text', tspan: 'tspan', clippath: 'clipPath', mask: 'mask', filter: 'filter', fegaussianblur: 'feGaussianBlur' };
const VOID = new Set(['br', 'hr', 'img', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon', 'stop', 'fegaussianblur']);
const DROP_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template', 'textarea', 'title', 'head', 'form', 'select', 'option', 'audio', 'video', 'canvas', 'math', 'foreignobject', 'link', 'meta', 'base']);
const GLOBAL_ATTRS = new Set(['class', 'id', 'style', 'title', 'lang', 'dir', 'role', 'aria-label', 'aria-hidden', 'aria-labelledby']);
const SVG_ATTRS = { viewbox: 'viewBox', width: 'width', height: 'height', fill: 'fill', stroke: 'stroke', 'stroke-width': 'stroke-width', 'stroke-linecap': 'stroke-linecap', 'stroke-linejoin': 'stroke-linejoin', 'stroke-dasharray': 'stroke-dasharray', opacity: 'opacity', 'fill-opacity': 'fill-opacity', 'stroke-opacity': 'stroke-opacity', d: 'd', cx: 'cx', cy: 'cy', r: 'r', rx: 'rx', ry: 'ry', x: 'x', y: 'y', x1: 'x1', x2: 'x2', y1: 'y1', y2: 'y2', points: 'points', transform: 'transform', offset: 'offset', 'stop-color': 'stop-color', 'stop-opacity': 'stop-opacity', gradientunits: 'gradientUnits', gradienttransform: 'gradientTransform', preserveaspectratio: 'preserveAspectRatio', xmlns: 'xmlns', patternunits: 'patternUnits', 'fill-rule': 'fill-rule', 'clip-rule': 'clip-rule', 'font-size': 'font-size', 'text-anchor': 'text-anchor', 'clip-path': 'clip-path', mask: 'mask', filter: 'filter', stddeviation: 'stdDeviation', 'font-weight': 'font-weight', 'font-family': 'font-family', 'letter-spacing': 'letter-spacing' };
const DATA_ATTR = /^data-(cd|act|limit|cols|layout|category|target|variant|reveal|delay|if)$/;
const MAX_HTML = 120000, MAX_NODES = 4000, MAX_DEPTH = 28, MAX_CSS = 80000;

const escText = s => s.replace(/&(?!#?[A-Za-z0-9]{1,10};)/g, '&amp;').replace(/>/g, '&gt;');
const escAttr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const decodeBasic = s => String(s).replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/&#(\d+);?/g, (_, d) => String.fromCharCode(Number(d))).replace(/&(colon|newline|tab|amp|lt|gt|quot|apos);/gi, (_, n) => ({ colon: ':', newline: '', tab: '', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[n.toLowerCase()]));

function safeUrl(v, kind) {
  const raw = decodeBasic(v).replace(/[\u0000- \u007f-\u009f]+/g, '').slice(0, 800);
  if (!raw) return null;
  if (kind === 'img') {
    if (/^\/uploads\/[A-Za-z0-9._-]+$/.test(raw)) return raw;
    if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(raw) && raw.length < 150000) return raw;
    return null;
  }
  if (raw.startsWith('#')) return /^#[A-Za-z][A-Za-z0-9_-]{0,40}$/.test(raw) ? '#g-' + raw.slice(1) : null;
  if (/^\/uploads\/[A-Za-z0-9._-]+$/.test(raw)) return raw;
  if (/^https?:\/\/[^\s<>"']+$/i.test(raw)) return raw;
  if (/^tel:\+?[0-9]{5,16}$/i.test(raw)) return raw;
  if (/^mailto:[^\s<>"'?&]+@[^\s<>"'?&]+$/i.test(raw)) return raw;
  return null;
}

// ---------- CSS ----------------------------------------------------------------
const BAD_VALUE = /expression\s*\(|javascript:|vbscript:|behavior\s*:|-moz-binding|@import|\\|<|\/\*|\*\/|image-set\s*\(|element\s*\(|attr\s*\(/i;
function cleanValue(prop, value, keyframes, warn) {
  let v = String(value).trim();
  if (!v || v.length > 600 || BAD_VALUE.test(v)) return null;
  // url(): only our own uploads, or fragment references to SVG ids inside the page
  let ok = true;
  v = v.replace(/url\(\s*(["']?)([^)"']*)\1\s*\)/gi, (m, q, u) => {
    u = u.trim();
    if (/^\/uploads\/[A-Za-z0-9._-]+$/.test(u)) return `url(${u})`;
    if (/^#[A-Za-z][A-Za-z0-9_-]{0,40}$/.test(u)) return `url(#g-${u.slice(1)})`;
    ok = false; return m;
  });
  if (!ok || /url\(/i.test(v.replace(/url\((?:\/uploads\/[A-Za-z0-9._-]+|#g-[A-Za-z0-9_-]+)\)/g, ''))) { warn && warn(`removed ${prop}: only /uploads images are allowed in url()`); return null; }
  if (prop === 'position') v = v.replace(/\bfixed\b/i, 'absolute');
  if (prop === 'z-index') { const n = parseInt(v, 10); if (!Number.isFinite(n)) return null; v = String(Math.max(-5, Math.min(20, n))); }
  if ((prop === 'animation' || prop === 'animation-name') && keyframes.size) v = v.replace(/[A-Za-z_][\w-]*/g, w => (keyframes.has(w) ? 'g-' + w : w));
  return v;
}
function cleanDecls(block, keyframes, warn) {
  const out = [];
  let depth = 0, cur = '', quote = '';
  const parts = [];
  for (const ch of block) {
    if (quote) { cur += ch; if (ch === quote) quote = ''; continue; }
    if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
    if (ch === '(') depth++; if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ';' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
  }
  parts.push(cur);
  for (const p of parts) {
    const i = p.indexOf(':'); if (i < 1) continue;
    const prop = p.slice(0, i).trim().toLowerCase();
    if (!/^(--[a-z0-9-]{1,40}|-webkit-[a-z-]{2,40}|[a-z-]{2,40})$/.test(prop)) continue;
    if (/^(behavior|-moz-binding|filter-expression)$/.test(prop)) continue;
    const v = cleanValue(prop, p.slice(i + 1), keyframes, warn);
    if (v !== null) out.push(`${prop}:${v}`);
  }
  return out.join(';');
}
function splitTop(css) { // [{pre, body}] for top-level `prelude { body }` and `prelude;`
  const items = []; let i = 0; const n = css.length;
  while (i < n) {
    let j = i, quote = '', paren = 0;
    while (j < n) { const c = css[j]; if (quote) { if (c === quote) quote = ''; } else if (c === '"' || c === "'") quote = c; else if (c === '(') paren++; else if (c === ')') paren = Math.max(0, paren - 1); else if ((c === '{' || c === ';') && paren === 0) break; j++; }
    if (j >= n) break;
    const pre = css.slice(i, j).trim();
    if (css[j] === ';') { if (pre) items.push({ pre, body: null }); i = j + 1; continue; }
    let depth = 1, k = j + 1; quote = '';
    while (k < n && depth) { const c = css[k]; if (quote) { if (c === quote) quote = ''; } else if (c === '"' || c === "'") quote = c; else if (c === '{') depth++; else if (c === '}') depth--; k++; }
    items.push({ pre, body: css.slice(j + 1, depth ? n : k - 1) }); i = k;
  }
  return items;
}
function scopeSelector(sel, scope) {
  const s = sel.trim(); if (!s || /[@{}\\<]/.test(s) || !/^[A-Za-z0-9_\-\s.#:>+~*,()[\]="'^$|%]+$/.test(s)) return null;
  if (/\b(?:body|html|:root)\b/.test(s) === false && /^\s*(?:\*)\s*$/.test(s)) return `${scope} *`;
  const P = '\u0001';
  let t = s.split(scope).join(P);
  t = t.replace(/#([A-Za-z][\w-]*)/g, '#g-$1');
  t = t.replace(/(^|[\s>+~,(])(?:html|body|:root)(?![\w-])/g, (m, pre) => pre + P);
  t = t.split(P).join(scope);
  return t.startsWith(scope) ? t : `${scope} ${t}`;
}
function scopeCss(input, scope = '#site', warnings = []) {
  const warn = m => { if (warnings.length < 20) warnings.push(m); };
  let css = String(input || '').replace(/\/\*[\s\S]*?\*\//g, '').slice(0, MAX_CSS);
  const keyframes = new Set(); for (const m of css.matchAll(/@(?:-webkit-)?keyframes\s+([A-Za-z_][\w-]*)/g)) keyframes.add(m[1]);
  let rules = 0;
  const run = (src, top) => {
    let out = '';
    for (const { pre, body } of splitTop(src)) {
      if (++rules > 900) { warn('too many CSS rules, the rest was ignored'); break; }
      if (pre.startsWith('@')) {
        const name = (/^@([\w-]+)/.exec(pre) || [])[1] || '';
        if (/^(media|supports)$/i.test(name) && body !== null) {
          if (!/^@[\w-]+\s*[\w\s:(),.\-<>=%/]+$/.test(pre)) { warn(`skipped @${name}: unsupported condition`); continue; }
          const inner = run(body, false); if (inner) out += `${pre}{${inner}}`;
        } else if (/^(-webkit-)?keyframes$/i.test(name) && body !== null) {
          const kn = /^@[\w-]+\s+([A-Za-z_][\w-]*)/.exec(pre); if (!kn) continue;
          let frames = '';
          for (const f of splitTop(body)) { if (/^(from|to|[\d.]+%)(\s*,\s*(from|to|[\d.]+%))*$/.test(f.pre) && f.body !== null) { const d = cleanDecls(f.body, keyframes, warn); if (d) frames += `${f.pre}{${d}}`; } }
          if (frames) out += `@keyframes g-${kn[1]}{${frames}}`;
        } else warn(`removed @${name}: not allowed (fonts are provided by Cendoor)`);
        continue;
      }
      if (body === null) continue;
      const sels = pre.split(',').map(s => scopeSelector(s, scope)).filter(Boolean);
      if (!sels.length) { warn(`removed rule "${pre.slice(0, 40)}"`); continue; }
      const d = cleanDecls(body, keyframes, warn); if (d) out += `${sels.join(',')}{${d}}`;
    }
    return out;
  };
  return run(css, true);
}

// ---------- HTML ---------------------------------------------------------------
const TAG_AT = /<(\/?)([A-Za-z][A-Za-z0-9:-]*)((?:\s+[^\s"'<>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/y;
const ATTR_RE = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function sanitizeHtml(input, warnings = []) {
  const warn = m => { if (warnings.length < 20) warnings.push(m); };
  const src = String(input || '').slice(0, MAX_HTML);
  let out = '', i = 0, nodes = 0; const stack = [];
  const closeAll = () => { while (stack.length) out += `</${stack.pop()}>`; };
  while (i < src.length) {
    const lt = src.indexOf('<', i);
    if (lt < 0) { out += escText(src.slice(i)); break; }
    if (lt > i) out += escText(src.slice(i, lt));
    if (src.startsWith('<!--', lt)) { const e = src.indexOf('-->', lt + 4); i = e < 0 ? src.length : e + 3; continue; }
    TAG_AT.lastIndex = lt; const m = TAG_AT.exec(src);
    if (!m) { out += '&lt;'; i = lt + 1; continue; }
    i = lt + m[0].length;
    const closing = m[1] === '/', lname = m[2].toLowerCase(); const selfClose = m[4] === '/';
    if (DROP_WITH_CONTENT.has(lname)) {
      if (!closing && !selfClose) { const re = new RegExp(`</${lname}\\s*>`, 'ig'); re.lastIndex = i; const e = re.exec(src); i = e ? e.index + e[0].length : src.length; }
      warn(`removed <${lname}>`); continue;
    }
    if (!HTML_TAGS.has(lname)) { warn(`removed <${lname}>`); continue; }
    const tag = SVG_TAGS[lname] || lname;
    if (closing) { const k = stack.lastIndexOf(tag); if (k >= 0) { while (stack.length > k) out += `</${stack.pop()}>`; } continue; }
    if (++nodes > MAX_NODES || stack.length >= MAX_DEPTH) { warn('page is too large or too deeply nested; the rest was ignored'); break; }
    const isSvg = !!SVG_TAGS[lname]; let attrs = ''; let target = false; let hasDataAct = false;
    for (const a of m[3].matchAll(ATTR_RE)) {
      const name = a[1].toLowerCase(); const val = a[2] !== undefined ? a[2] : a[3] !== undefined ? a[3] : a[4] !== undefined ? a[4] : '';
      if (name.startsWith('on')) continue;
      if (name === 'style') { const d = cleanDecls(decodeBasic(val), new Set(), warn); if (d) attrs += ` style="${escAttr(d)}"`; continue; }
      if (name === 'id') { const v = decodeBasic(val); if (/^[A-Za-z][A-Za-z0-9_-]{0,40}$/.test(v)) attrs += ` id="g-${v}"`; continue; }
      if (name === 'class') { const v = decodeBasic(val).replace(/[^A-Za-z0-9_\- ]/g, '').trim().slice(0, 200); if (v) attrs += ` class="${v}"`; continue; }
      if (GLOBAL_ATTRS.has(name)) { attrs += ` ${name}="${escAttr(decodeBasic(val).slice(0, 200))}"`; continue; }
      if (DATA_ATTR.test(name)) { const v = decodeBasic(val).replace(/[^A-Za-z0-9_\-, ]/g, '').slice(0, 60); attrs += ` ${name}="${v}"`; if (name === 'data-act') hasDataAct = true; continue; }
      if (lname === 'a' && name === 'href') { const u = safeUrl(val, 'a'); if (u) { attrs += ` href="${escAttr(u)}"`; if (/^https?:/i.test(u)) target = true; } else warn('removed an unsafe link'); continue; }
      if (lname === 'img' && name === 'src') { const u = safeUrl(val, 'img'); if (u) attrs += ` src="${escAttr(u)}"`; else warn('removed an image: only uploaded photos are allowed'); continue; }
      if (lname === 'img' && (name === 'alt' || name === 'width' || name === 'height')) { attrs += ` ${name}="${escAttr(decodeBasic(val).slice(0, 160))}"`; continue; }
      if (lname === 'img' && name === 'loading') { attrs += ' loading="lazy"'; continue; }
      if (lname === 'button' && name === 'type') continue;
      if (lname === 'td' || lname === 'th') { if (name === 'colspan' || name === 'rowspan') { attrs += ` ${name}="${parseInt(val, 10) || 1}"`; continue; } }
      if (isSvg && SVG_ATTRS[name]) {
        let v = decodeBasic(val).slice(0, 2000);
        v = v.replace(/url\(\s*#([A-Za-z][\w-]*)\s*\)/g, 'url(#g-$1)');
        if (/url\(|javascript:|<|expression/i.test(v.replace(/url\(#g-[\w-]+\)/g, ''))) continue;
        attrs += ` ${SVG_ATTRS[name]}="${escAttr(v)}"`; continue;
      }
    }
    if (lname === 'a' && target) attrs += ' target="_blank" rel="noopener noreferrer"';
    if (lname === 'button') { if (!hasDataAct && !/data-cd/.test(attrs)) { /* decorative button: inert */ } attrs += ' type="button"'; }
    if (tag === 'svg' && !/ xmlns=/.test(attrs)) attrs += ' xmlns="http://www.w3.org/2000/svg"';
    if (VOID.has(lname) || (isSvg && selfClose)) out += `<${tag}${attrs}${isSvg ? '/' : ''}>`;
    else { out += `<${tag}${attrs}>`; stack.push(tag); }
  }
  closeAll();
  return out;
}

module.exports = { sanitizeHtml, scopeCss, safeUrl, cleanDecls, HTML_TAGS };
