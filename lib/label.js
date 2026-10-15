'use strict';
// Printable shipping label (A6-ish) with a Code 39 barcode of the tracking number.
const CODE39 = {
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw', '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw', '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn', F: 'nnwnwwnnn', G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn',
  K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww', O: 'wnnnwnnwn', P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn',
  U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn', Z: 'nwwnwnnnn', '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '*': 'nwnnwnwnn',
};
function code39Svg(text, { narrow = 2, wide = 5, height = 60 } = {}) {
  const chars = ('*' + String(text).toUpperCase().replace(/[^0-9A-Z.\- ]/g, '') + '*').split('');
  let x = 0, bars = '';
  for (const ch of chars) {
    const pat = CODE39[ch];
    for (let i = 0; i < 9; i++) {
      const w = pat[i] === 'w' ? wide : narrow;
      if (i % 2 === 0) bars += `<rect x="${x}" y="0" width="${w}" height="${height}" fill="#000"/>`;
      x += w;
    }
    x += narrow; // gap between characters
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x} ${height}" width="${Math.min(x, 300)}" height="${height}" preserveAspectRatio="none" role="img" aria-label="barcode">${bars}</svg>`;
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function labelHtml(order, shop) {
  const items = (order.items || []).map(i => `${i.qty}× ${esc(i.name)}${i.label && i.label !== 'Standard' ? ' (' + esc(i.label) + ')' : ''}`).join(', ');
  const cod = Math.round(order.total * 100) / 100;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Label ${esc(order.number)}</title>
<style>
  *{box-sizing:border-box} body{margin:0;background:#e9eef0;font-family:system-ui,Segoe UI,Roboto,sans-serif;color:#000}
  .bar{display:flex;gap:8px;justify-content:center;padding:12px}
  .bar button{padding:10px 18px;border:0;border-radius:8px;background:#0F5C5C;color:#fff;font-weight:600;cursor:pointer}
  .label{width:105mm;min-height:148mm;margin:0 auto 16px;background:#fff;border:2px solid #000;padding:5mm;display:flex;flex-direction:column;gap:3mm}
  .row{display:flex;justify-content:space-between;gap:6mm}
  .small{font-size:9pt;color:#222} .k{font-size:8pt;text-transform:uppercase;letter-spacing:.06em;color:#444}
  .to{border:2px solid #000;padding:3mm} .to .name{font-size:16pt;font-weight:700} .to .city{font-size:18pt;font-weight:800;margin-top:1mm}
  .cod{border:3px solid #000;text-align:center;padding:3mm} .cod b{font-size:22pt;display:block}
  .code{text-align:center} .code .num{font-family:ui-monospace,Consolas,monospace;letter-spacing:.12em;font-size:11pt}
  .brand{font-weight:800;font-size:12pt}
  @media print{body{background:#fff}.bar{display:none}.label{margin:0;border:2px solid #000;page-break-after:always}}
</style></head><body>
<div class="bar"><button onclick="window.print()">Print</button><button onclick="window.close()" style="background:#555">Close</button></div>
<div class="label">
  <div class="row"><div><div class="k">From</div><div class="brand">${esc(shop.name)}</div><div class="small">${esc(shop.city)} · ${esc(shop.phone)}</div></div>
  <div style="text-align:right"><div class="k">Carrier</div><div class="brand">${esc(order.carrier || '—')}</div><div class="small">${esc(order.number)}</div></div></div>
  <div class="to"><div class="k">Deliver to</div><div class="name">${esc(order.name)}</div>
    <div>${esc(order.address)}</div><div class="city">${esc(order.city)}</div><div style="font-size:13pt;margin-top:1mm">☎ ${esc(order.phone)}</div></div>
  <div class="cod"><div class="k">Cash on delivery</div><b>${cod} MAD</b></div>
  <div class="small"><span class="k">Contents</span><br>${items}</div>
  <div class="code">${code39Svg(order.tracking || order.number)}<div class="num">${esc(order.tracking || order.number)}</div></div>
  <div class="small" style="margin-top:auto;text-align:center">Prepared with Cendoor · ${new Date().toISOString().slice(0, 10)}</div>
</div></body></html>`;
}

module.exports = { labelHtml, code39Svg };
