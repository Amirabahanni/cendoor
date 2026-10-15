'use strict';
// Curated, self-hosted fonts (open licences, served from node_modules so no third-party request is made).
// A generated shop can pick any of these by name; anything else falls back to the system font.
const fs = require('fs');
const path = require('path');
const BASE = path.join(__dirname, '..', 'node_modules', '@fontsource');

const FONTS = {
  'Playfair Display': { pkg: 'playfair-display', weights: [400, 600, 700, 800], kind: 'serif', moods: ['elegant', 'luxury', 'editorial'] },
  'Cormorant Garamond': { pkg: 'cormorant-garamond', weights: [400, 500, 600, 700], kind: 'serif', moods: ['luxury', 'elegant', 'editorial'] },
  'DM Serif Display': { pkg: 'dm-serif-display', weights: [400], kind: 'serif', moods: ['natural', 'warm', 'editorial'] },
  'Lora': { pkg: 'lora', weights: [400, 500, 600, 700], kind: 'serif', moods: ['natural', 'warm', 'classic'] },
  'Inter': { pkg: 'inter', weights: [400, 500, 600, 700], kind: 'sans', moods: ['minimal', 'clean', 'modern'] },
  'Poppins': { pkg: 'poppins', weights: [400, 500, 600, 700], kind: 'sans', moods: ['playful', 'friendly', 'modern'] },
  'Montserrat': { pkg: 'montserrat', weights: [400, 500, 600, 700, 800], kind: 'sans', moods: ['bold', 'modern', 'sport'] },
  'Space Grotesk': { pkg: 'space-grotesk', weights: [400, 500, 600, 700], kind: 'sans', moods: ['futuristic', 'tech', 'bold'] },
  'Syne': { pkg: 'syne', weights: [400, 600, 700, 800], kind: 'sans', moods: ['futuristic', 'artistic', 'bold'] },
  'Outfit': { pkg: 'outfit', weights: [400, 500, 600, 700], kind: 'sans', moods: ['playful', 'friendly', 'natural'] },
  'Jost': { pkg: 'jost', weights: [400, 500, 600, 700], kind: 'sans', moods: ['minimal', 'elegant', 'clean'] },
  'Cairo': { pkg: 'cairo', weights: [400, 600, 700, 800], kind: 'sans', arabic: true, moods: ['modern', 'bold', 'friendly'] },
  'Tajawal': { pkg: 'tajawal', weights: [400, 500, 700, 800], kind: 'sans', arabic: true, moods: ['minimal', 'clean', 'modern'] },
  'Amiri': { pkg: 'amiri', weights: [400, 700], kind: 'serif', arabic: true, moods: ['elegant', 'luxury', 'classic'] },
};
const FALLBACK = { serif: 'Georgia, "Times New Roman", serif', sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' };
const RANGES = {
  latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  arabic: 'U+0600-06FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FEFF',
};
const names = () => Object.keys(FONTS);
const stack = family => (FONTS[family] ? `"${family}", ${FALLBACK[FONTS[family].kind]}` : FALLBACK.sans);

const cache = new Map();
// @font-face rules for the requested families (unknown names ignored).
function css(list) {
  const fam = [...new Set(String(list || '').split(',').map(s => s.trim()).filter(f => FONTS[f]))].slice(0, 4);
  const key = fam.join('|'); if (cache.has(key)) return cache.get(key);
  let out = '';
  for (const f of fam) {
    const m = FONTS[f];
    for (const subset of ['latin', 'arabic']) for (const w of m.weights) {
      const file = `${m.pkg}-${subset}-${w}-normal.woff2`;
      if (!fs.existsSync(path.join(BASE, m.pkg, 'files', file))) continue;
      out += `@font-face{font-family:"${f}";font-style:normal;font-display:swap;font-weight:${w};src:url(/fonts/${m.pkg}/files/${file}) format("woff2");unicode-range:${RANGES[subset]}}\n`;
    }
  }
  cache.set(key, out); return out;
}
// Only .woff2 files inside the curated packages can be requested.
function filePath(pkg, file) {
  if (!/^[a-z0-9-]+$/.test(pkg) || !/^[a-z0-9-]+\.woff2$/.test(file)) return null;
  if (!Object.values(FONTS).some(f => f.pkg === pkg)) return null;
  const p = path.join(BASE, pkg, 'files', file);
  return fs.existsSync(p) ? p : null;
}
module.exports = { FONTS, names, stack, css, filePath, FALLBACK };
