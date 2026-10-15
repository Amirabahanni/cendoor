'use strict';
// Language handling for Moroccan commerce chat: Darija (Latin + Arabic script), French, English.
// Everything here is deterministic so the product works with or without an LLM key.

// ---------- normalisation ---------------------------------------------------
const AR_DIGITS = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9' };

function norm(s) {
  s = String(s || '').toLowerCase();
  s = s.replace(/[٠-٩۰-۹]/g, c => AR_DIGITS[c] || c);
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');           // latin accents
  s = s.replace(/[ً-ٰٟـ]/g, '');                // arabic diacritics + tatweel
  s = s.replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي');
  return s;
}
// Normalised, punctuation -> spaces, padded so phrase lookup is a plain includes().
function spaced(s) { return ' ' + norm(s).replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim() + ' '; }
function tokens(s) { return spaced(s).trim().split(' ').filter(Boolean); }
const hasPhrase = (sp, phrase) => sp.includes(' ' + norm(phrase).replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim() + ' ');
const hasAny = (sp, list) => list.some(p => hasPhrase(sp, p));

function lev(a, b) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 3;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

// ---------- language detection ---------------------------------------------
const DAR_MARKERS = ['bghit', 'bghina', 'baghi', 'kayn', 'kayna', 'kaynin', 'wach', 'chhal', 'ch7al', 'shhal', 'sh7al', 'ch7el', '3afak', 'afak',
  'labas', 'mzyan', 'mzian', 'wakha', 'daba', 'bzaf', 'dyal', 'dyali', 'dyalk', 'ghadi', 'tawsil', 'twsil', 'smiti', 'smitni', 'ismi', 'fin', 'mnin',
  'zwin', 'zwina', '7ta', 'ana', 'nta', 'nti', 'chi', 'hadchi', 'hada', 'hadi', 'lyoum', 'ghda', 'taman', 'ta9', 'salam', 'slm', 'iyeh', 'ayeh', 'yeh',
  'hamdullah', 'hamdulillah', 'mchi', 'machi', 'ma3endekch', 'kifach', 'wasl', 'lcommande', 'lcolis', 'colis', 'n7ebb', 'bghiti', 'nchri', 'nshri', 'nakhod', 'jouj', 'joj', 'zouj'];
const FR_MARKERS = ['je', 'veux', 'voudrais', 'bonjour', 'bonsoir', 'combien', 'prix', 'livraison', 'disponible', 'merci', 'svp', 'commande', 'oui', 'non',
  'avez', 'vous', 'quelle', 'quel', 'taille', 'couleur', 'pour', 'une', 'des', 'les', 'est', 'sont', "c", 'ça', 'ca', 'adresse', 'ville', 'numero', 'nom', 'bon', 'stp', 'salut'];
const EN_MARKERS = ['want', 'price', 'how', 'much', 'do', 'you', 'have', 'hello', 'hi', 'order', 'yes', 'no', 'thanks', 'thank', 'the', 'is', 'are', 'size', 'color',
  'colour', 'delivery', 'shipping', 'address', 'city', 'phone', 'name', 'please', 'available', 'buy', 'can', 'my', 'send', 'what'];

function detectLang(text, fallback) {
  if (/[؀-ۿ]/.test(text || '')) return 'ar';
  const t = tokens(text);
  let d = 0, f = 0, e = 0;
  for (const w of t) {
    if (DAR_MARKERS.includes(w)) d += 2;
    if (FR_MARKERS.includes(w)) f += 1;
    if (EN_MARKERS.includes(w)) e += 1;
  }
  const best = Math.max(d, f, e);
  if (best === 0) return fallback || 'dar';
  if (d === best) return 'dar';
  if (f === best) return 'fr';
  return 'en';
}

// ---------- intents ---------------------------------------------------------
const INTENT = {
  greet: ['salam', 'slm', 'salamo 3alaykom', 'assalam', 'bonjour', 'bonsoir', 'salut', 'hello', 'hi', 'hey', 'marhba', 'marhaba', 'ahlan', 'sba7 lkhir', 'msa lkhir', 'سلام', 'السلام', 'مرحبا', 'اهلا', 'صباح الخير', 'مساء الخير'],
  price: ['chhal', 'ch7al', 'shhal', 'sh7al', 'ch7el', 'chhal taman', 'taman', 'prix', 'tarif', 'price', 'cost', 'combien', 'how much', 'bch7al', 'bchhal', 'بشحال', 'شحال', 'ثمن', 'الثمن', 'بكم', 'كم', 'سعر', 'السعر'],
  avail: ['kayn', 'kayna', 'kaynin', 'wach kayn', 'wach kayna', 'disponible', 'dispo', 'available', 'in stock', 'en stock', 'stock', 'do you have', 'avez vous', 'avez-vous', 'كاين', 'كاينه', 'كاينين', 'واش كاين', 'متوفر', 'متاح', 'موجود'],
  order: ['bghit', 'bghina', 'baghi', 'bghiti', 'n7ebb', 'nebghi', 'nchri', 'nshri', 'nakhod', 'ghadi nakhod', 'ndir commande', 'je veux', 'je voudrais', 'je prends', 'je le prends', 'commander', 'acheter', 'i want', 'i would like', "i'd like", 'i ll take', 'i will take', 'order it', 'buy', 'take it', 'passer commande', 'بغيت', 'بغينا', 'نشري', 'نطلب', 'كوموند', 'نخذ', 'غادي ناخذ', 'طلب'],
  delivery: ['livraison', 'livrer', 'tawsil', 'twsil', 'tawsile', 'tawsil l', 'shipping', 'delivery', 'deliver', 'frais de port', 'frais', 'expedition', 'توصيل', 'التوصيل', 'لفراي', 'الشحن'],
  yes: ['yes', 'yeah', 'yep', 'ok', 'okay', 'oui', 'ouais', 'dac', "d'accord", 'daccord', 'd accord', 'confirm', 'confirmer', 'confirme', 'correct', 'exactly', 'sure', 'ah', 'aah', 'ayeh', 'iyeh', 'iyyeh', 'yeh', 'wah', 'wakha', 'wakkha', 'mzyan', 'safi', 'tamam', 'nam', 'na3am', 'akid', 'sa7i7', 'sah', 'اه', 'ايه', 'واه', 'واخا', 'نعم', 'اكيد', 'مزيان', 'صافي', 'تمام', 'موافق', 'اوكي', 'صحيح'],
  no: ['no', 'non', 'nope', 'la', 'lla', 'laa', 'mchi', 'machi', 'cancel', 'annuler', 'annule', 'stop', 'ma bghitch', 'ma3ndi', 'bla', 'لا', 'ماشي', 'الغاء', 'الغي', 'بلا'],
  thanks: ['merci', 'shukran', 'choukran', 'chokran', 'thanks', 'thank you', 'thx', 'barakllahou fik', 'baraka llahou fik', 'allah ybarek', 'شكرا', 'بارك الله فيك', 'الله يبارك'],
  human: ['vendeur', 'vendeuse', 'proprietaire', 'seller', 'owner', 'human', 'real person', 'une personne', 'agent', 'parler a quelqu', 'moul', 'sa7eb lboutique', 'bayi3', 'بائع', 'صاحب', 'البائع', 'صاحب المحل'],
  complaint: ['probleme', 'problem', 'complaint', 'reclamation', 'remboursement', 'refund', 'retour', 'return', 'echange', 'exchange', 'casse', 'broken', 'abime', 'damaged', 'wrong', 'erreur', 'mauvais', 'ma3jbnich', 'ma3jebnich', 'machi mzyan', 'khayb', 'khaib', 'kharb', 'ghalat', 'ghalet', 'sghir', 'kbir', 'ma9ass', 'ma9asch', 'doesn t fit', "doesn't fit", 'trop petit', 'trop grand', 'too small', 'too big', 'mochkil', 'mouchkil', 'machakil', 'مشكل', 'مشكله', 'خايب', 'ما عجبنيش', 'استرجاع', 'ارجاع', 'استبدال', 'فلوسي'],
  recovRetry: ['retry', 'demain', 'tomorrow', 'ghda', 'ghedda', 'reessayer', 'reessayez', 'again', 'encore', 'عاود', 'غدا', 'غدا', 'بكرا'],
  recovPickup: ['pickup', 'pick up', 'retrait', 'relais', 'agence', 'point', 'nji', 'nakhodha', 'bureau', 'استلام', 'الوكاله', 'نجي'],
};
INTENT.recovCancel = ['cancel', 'annuler', 'annule', 'refund', 'rembours', 'cancella', 'la', 'no', 'non', 'لا', 'الغاء', 'استرجاع'];

function intents(text) {
  const sp = spaced(text);
  const out = {};
  for (const k of Object.keys(INTENT)) out[k] = hasAny(sp, INTENT[k]);
  // "safi" and "wakha" are confirmations only when the message is short.
  const tk = tokens(text);
  if (tk.length > 4) out.yes = hasAny(sp, ['yes', 'oui', 'confirm', 'confirmer', 'نعم']);
  // "la" also means "the" in French: a bare no is only a no in short replies
  if (tk.length > 2) out.no = hasAny(sp, ['non', 'no', 'cancel', 'annuler', 'annule', 'ma bghitch', 'لا', 'ماشي', 'الغاء']);
  if (/\?|؟/.test(text) && (out.price || out.avail)) out.question = true;
  return out;
}

// ---------- phone -----------------------------------------------------------
function extractPhone(text) {
  const t = String(text || '').replace(/[٠-٩۰-۹]/g, c => AR_DIGITS[c] || c);
  const re = /(\+?\d[\d\s.\-]{7,}\d)/g;
  let m;
  while ((m = re.exec(t))) {
    let d = m[1].replace(/\D/g, '');
    if (d.startsWith('00212')) d = d.slice(5);
    else if (d.startsWith('212')) d = d.slice(3);
    if (d.length === 9 && /^[5-7]/.test(d)) d = '0' + d;
    if (/^0[5-7]\d{8}$/.test(d)) return { phone: d, rest: (t.slice(0, m.index) + ' ' + t.slice(m.index + m[1].length)).replace(/\s+/g, ' ').trim() };
  }
  return { phone: null, rest: t };
}
const validPhone = p => /^0[5-7]\d{8}$/.test(String(p || ''));

// ---------- cities ----------------------------------------------------------
const CITY_DEFS = [
  ['Casablanca', 'casa', 'casablanca', 'dar lbida', 'dar elbeida', 'dar el beida', 'dar al bayda', 'kaza', 'الدار البيضاء', 'كازا', 'الدارالبيضاء', 'كازابلانكا'],
  ['Rabat', 'rabat', 'الرباط', 'ribat'],
  ['Marrakech', 'marrakech', 'marrakesh', 'marakech', 'marrakch', 'mrrakech', 'مراكش'],
  ['Fès', 'fes', 'fez', 'فاس'],
  ['Tanger', 'tanger', 'tangier', 'tanja', 'طنجه', 'طنجة'],
  ['Agadir', 'agadir', 'اكادير', 'أكادير'],
  ['Meknès', 'meknes', 'mknes', 'مكناس'],
  ['Oujda', 'oujda', 'وجده', 'وجدة'],
  ['Kénitra', 'kenitra', 'qnitra', 'القنيطره', 'القنيطرة'],
  ['Tétouan', 'tetouan', 'tetwan', 'titwan', 'تطوان'],
  ['Salé', 'sale', 'سلا'],
  ['Témara', 'temara', 'تمارة'],
  ['Safi', 'safi!', 'اسفي', 'آسفي'],
  ['El Jadida', 'el jadida', 'eljadida', 'jadida', 'الجديده', 'الجديدة'],
  ['Nador', 'nador', 'الناظور'],
  ['Béni Mellal', 'beni mellal', 'benimellal', 'بني ملال'],
  ['Laâyoune', 'laayoune', 'layoune', 'العيون'],
  ['Dakhla', 'dakhla', 'الداخله', 'الداخلة'],
  ['Essaouira', 'essaouira', 'souira', 'الصويره', 'الصويرة'],
  ['Mohammedia', 'mohammedia', 'mohamedia', 'المحمديه', 'المحمدية'],
  ['Khouribga', 'khouribga', 'خريبكه', 'خريبكة'],
  ['Settat', 'settat', 'سطات'],
  ['Taza', 'taza', 'تازه', 'تازة'],
  ['Berkane', 'berkane', 'بركان'],
  ['Larache', 'larache', 'العرائش'],
  ['Khémisset', 'khemisset', 'الخميسات'],
  ['Guelmim', 'guelmim', 'كلميم'],
  ['Errachidia', 'errachidia', 'الرشيديه', 'الرشيدية'],
  ['Ouarzazate', 'ouarzazate', 'ورزازات'],
  ['Al Hoceïma', 'al hoceima', 'alhoceima', 'hoceima', 'الحسيمه', 'الحسيمة'],
  ['Chefchaouen', 'chefchaouen', 'chaouen', 'شفشاون'],
  ['Ifrane', 'ifrane', 'افران'],
  ['Taroudant', 'taroudant', 'تارودانت'],
  ['Tiznit', 'tiznit', 'تيزنيت'],
  ['Ksar El Kébir', 'ksar el kebir', 'ksar kbir', 'القصر الكبير'],
  ['Fnideq', 'fnideq', 'الفنيدق'],
  ['Martil', 'martil', 'مرتيل'],
  ['Asilah', 'asilah', 'assila', 'أصيلة', 'اصيله'],
  ['Bouznika', 'bouznika', 'بوزنيقه'],
  ['Skhirat', 'skhirat', 'الصخيرات'],
  ['Ben Guerir', 'ben guerir', 'benguerir', 'ابن جرير'],
  ['Midelt', 'midelt', 'ميدلت'],
  ['Taourirt', 'taourirt', 'تاوريرت'],
  ['Oued Zem', 'oued zem', 'وادي زم'],
  ['Sefrou', 'sefrou', 'صفرو'],
  ['Khénifra', 'khenifra', 'خنيفره', 'خنيفرة'],
  ['Kelâa des Sraghna', 'kelaa', 'kelaat sraghna', 'قلعه السراغنه', 'قلعة السراغنة'],
  ['Sidi Slimane', 'sidi slimane', 'سيدي سليمان'],
  ['Sidi Kacem', 'sidi kacem', 'سيدي قاسم'],
  ['Tan-Tan', 'tan tan', 'tantan', 'طانطان'],
  ['Zagora', 'zagora', 'زاكوره', 'زاكورة'],
  ['Tinghir', 'tinghir', 'تنغير'],
  ['Azilal', 'azilal', 'ازيلال'],
  ['Youssoufia', 'youssoufia', 'اليوسفيه', 'اليوسفية'],
  ['Azrou', 'azrou', 'ازرو'],
];
const CITY_INDEX = [];
for (const [canon, ...aliases] of CITY_DEFS) for (const a of aliases) CITY_INDEX.push([canon, spaced(a.replace('!', '')), a.includes('!')]);
CITY_INDEX.sort((x, y) => y[1].length - x[1].length);
const CITY_NAMES = CITY_DEFS.map(d => d[0]);

function extractCity(text) {
  const sp = spaced(text);
  for (const [canon, alias, ctxOnly] of CITY_INDEX) {
    if (!sp.includes(alias)) continue;
    // ambiguous word ("safi" also means "ok"): only a city when a preposition comes right before it
    if (ctxOnly && !/ (?:f|fi|l|a|to|in|from|de|vers|في|الى) safi /.test(sp)) continue;
    return canon;
  }
  return null;
}
function stripCity(text, city) {
  if (!city) return text;
  const def = CITY_DEFS.find(d => d[0] === city);
  let out = text;
  for (const a of def.slice(1)) out = out.replace(new RegExp(a.replace('!', '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), ' ');
  return out.replace(/\s+/g, ' ').trim();
}

// ---------- colours / sizes / quantities -----------------------------------
const COLORS = {
  Blue: ['blue', 'bleu', 'bleue', 'zerq', 'zerqa', 'zrq', 'zr9a', 'zrk', 'azraq', 'ازرق', 'زرق', 'زرقاء', 'زرقا', 'azrak'],
  Red: ['red', 'rouge', '7mer', '7mra', 'hmer', 'hmra', 'ahmar', 'احمر', 'حمر', 'حمرا', 'حمراء'],
  Black: ['black', 'noir', 'noire', 'k7el', 'k7la', 'kahl', 'aswad', 'كحل', 'كحله', 'اسود', 'سوداء'],
  White: ['white', 'blanc', 'blanche', 'byed', 'byad', 'bayda', 'abyad', 'بيض', 'بيضاء', 'بيضا', 'ابيض'],
  Green: ['green', 'vert', 'verte', 'khdar', 'khdra', 'khadra', 'akhdar', 'اخضر', 'خضر', 'خضرا', 'خضراء'],
  Yellow: ['yellow', 'jaune', 'sfer', 'safra', 'asfar', 'اصفر', 'صفر', 'صفرا', 'صفراء'],
  Pink: ['pink', 'rose', 'roz', 'wardi', 'ward', 'وردي', 'وردية'],
  Beige: ['beige', 'bij', 'بيج'],
  Gray: ['gray', 'grey', 'gris', 'grise', 'rmadi', 'rmadiya', 'ramadi', 'رمادي'],
  Brown: ['brown', 'marron', 'qhwi', 'ka7wa', 'bunni', 'قهوي', 'بني'],
  Orange: ['orange', 'برتقالي'],
  Purple: ['purple', 'violet', 'mauve', 'banafsaji', 'بنفسجي'],
  Gold: ['gold', 'dore', 'doree', 'dhabi', 'dahabi', 'ذهبي'],
  Silver: ['silver', 'argent', 'argente', 'fidi', 'fiddi', 'فضي'],
};
const COLOR_LOOKUP = {};
for (const [c, ws] of Object.entries(COLORS)) for (const w of ws) COLOR_LOOKUP[norm(w)] = c;
const colorOf = tok => COLOR_LOOKUP[norm(tok)] || null;

const NUM_WORDS = {
  1: ['wahed', 'wa7ed', 'wahd', 'wa7d', 'waahd', 'one', 'un', 'une', 'واحد', 'وحد'],
  2: ['jouj', 'joj', 'zouj', 'zoj', 'two', 'deux', 'جوج', 'زوج', 'اثنين', 'ثنين'],
  3: ['tlata', 'tlat', 'tlt', 'three', 'trois', 'ثلاثه', 'تلاتة', 'تلاته', 'ثلاثة'],
  4: ['rb3a', 'arb3a', 'rba3a', 'four', 'quatre', 'اربعه', 'ربعة', 'اربعة'],
  5: ['khamsa', 'khmsa', 'five', 'cinq', 'خمسه', 'خمسة'],
  6: ['stta', 'sitta', 'six', 'ستة'],
  7: ['sb3a', 'seven', 'sept', 'سبعة'],
  8: ['tmnya', 'tmenya', 'eight', 'huit', 'ثمانية'],
  9: ['ts3od', 'ts3a', 'nine', 'neuf', 'تسعة'],
  10: ['3chra', '3ashra', 'ten', 'dix', 'عشرة'],
};
const NUMWORD_LOOKUP = {};
for (const [n, ws] of Object.entries(NUM_WORDS)) for (const w of ws) NUMWORD_LOOKUP[norm(w)] = Number(n);

const MONEY_WORDS = ['dh', 'dhs', 'mad', 'dirham', 'dirhams', 'dr', 'درهم', 'دراهم', 'ديال', 'euro', 'eur', 'usd'];
function extractQty(text, { sizes = [] } = {}) {
  const t = tokens(text);
  for (let i = 0; i < t.length; i++) {
    const w = t[i];
    const next = t[i + 1] || '';
    if (/^\d{1,2}$/.test(w)) {
      const n = Number(w);
      if (n < 1 || n > 20) continue;
      if (MONEY_WORDS.includes(next)) continue;
      if (sizes.map(norm).includes(w)) continue;
      if (/^(h|ans|ans|years|kg|ml|cm|g)$/.test(next)) continue;
      return n;
    }
    if (NUMWORD_LOOKUP[w] != null && !(w === 'un' && /^[a-z]+$/.test(next) && next.length > 6)) return NUMWORD_LOOKUP[w];
  }
  return null;
}

// ---------- products --------------------------------------------------------
const STOP = new Set(['the', 'a', 'an', 'de', 'du', 'des', 'le', 'la', 'les', 'un', 'une', 'dyal', 'dial', 'd', 'l', 'f', 'fi', 'bghit', 'bghina', 'je', 'veux', 'i', 'want', 'to', 'for', 'pour', 'avec', 'wach', 'kayn', 'kayna', 'have', 'you', 'do', 'ana', 'chhal', 'ch7al', 'taman', 'prix', 'price', 'is', 'there', 'it', 'this', 'that', 'hadi', 'hada', 'dik', 'dak', 'mn', 'men', 'من', 'في', 'ديال', 'واش', 'كاين', 'بغيت', 'شحال', 'ثمن', 'ب', 'ل']);
function productTokens(p) {
  const base = (p.name + ' ' + (p.keywords || '') + ' ' + (p.category || '')).split(/[\s,;|]+/).map(norm).filter(x => x.length >= 2);
  return [...new Set(base)];
}
function matchProducts(text, products) {
  const tk = tokens(text).filter(t => !STOP.has(t) && !/^\d+$/.test(t) && !colorOf(t) && !(NUMWORD_LOOKUP[t] != null));
  if (!tk.length) return [];
  const scored = [];
  for (const p of products) {
    const nameTk = tokens(p.name);
    const kw = productTokens(p);
    let s = 0, hits = 0;
    for (const t of tk) {
      if (t.length < 3) continue;
      let best = 0;
      for (const n of nameTk) { if (n === t) best = Math.max(best, 3); else if (t.length >= 5 && lev(t, n) <= 1) best = Math.max(best, 2); else if (t.length >= 4 && n.startsWith(t)) best = Math.max(best, 1.5); }
      for (const k of kw) { if (k === t) best = Math.max(best, 2.5); else if (t.length >= 5 && lev(t, k) <= 1) best = Math.max(best, 1.8); else if (t.length >= 4 && k.startsWith(t)) best = Math.max(best, 1.2); }
      if (best) hits++;
      s += best;
    }
    // a whole product name appearing verbatim is the strongest signal
    if (hasPhrase(spaced(text), p.name)) s += 4;
    if (s >= 1.5 && hits) scored.push({ product: p, score: s });
  }
  return scored.sort((a, b) => b.score - a.score);
}
function pickVariant(text, product) {
  const tk = tokens(text);
  const colors = [...new Set(tk.map(colorOf).filter(Boolean))];
  const vs = product.variants || [];
  let cand = vs.slice();
  let colorMiss = null, sizeMiss = null;
  if (colors.length) {
    const byColor = cand.filter(v => colors.includes(v.color) || colors.some(c => norm(v.label).includes(norm(c))));
    if (byColor.length) cand = byColor; else colorMiss = colors[0];
  }
  const sizeSet = new Set(vs.map(v => norm(v.size)).filter(Boolean));
  const sizeTok = tk.find(t => sizeSet.has(t));
  if (sizeTok) {
    const bySize = cand.filter(v => norm(v.size) === sizeTok);
    if (bySize.length) cand = bySize; else sizeMiss = sizeTok.toUpperCase();
  }
  const labelHit = vs.filter(v => v.label && v.label !== 'Standard' && tk.includes(norm(v.label)));
  if (labelHit.length === 1 && !colors.length && !sizeTok) cand = labelHit;
  return { candidates: cand, narrowed: cand.length !== vs.length, colorMiss, sizeMiss, colors };
}

// ---------- customer details ------------------------------------------------
const NAME_RE = /(?:je\s+m['’]?\s*appelle|je\s+suis|moi\s+c['’]?\s*est|my\s+name\s+is|i['’]?\s*m|i\s+am|ismi|smiti|smitni|ana|سميتي|اسمي|انا|أنا)\s+([\p{L}][\p{L}'’\-]*(?:\s+[\p{L}][\p{L}'’\-]*)?)/iu;
const NAME_STOP = new Set(['bghit', 'bghina', 'baghi', 'ghadi', 'mn', 'men', 'min', 'from', 'de', 'd', 'f', 'fi', 'a', 'at', 'in', 'to', 'je', 'veux', 'want', 'wach', 'kayn', 'ta', 'nta', 'nti', 'ici', 'here', 'habitant', 'ساكن', 'من', 'في', 'بغيت', 'ساكنة', 'live', 'lives', 'wahed', 'chi', 'okay', 'ok', 'ready', 'sure', 'interested', 'looking', 'trying', 'going', 'not']);
function titleCase(s) { return s.replace(/\s+/g, ' ').trim().split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' '); }
function extractName(text) {
  const m = NAME_RE.exec(text || '');
  if (!m) return null;
  const parts = m[1].trim().split(/\s+/);
  const keep = [];
  for (const p of parts) { if (NAME_STOP.has(norm(p)) || colorOf(p) || extractCity(p)) break; keep.push(p); }
  if (!keep.length) return null;
  return titleCase(keep.join(' '));
}
const ADDR_WORDS = ['rue', 'avenue', 'av', 'bd', 'boulevard', 'lot', 'lotissement', 'hay', 'residence', 'appt', 'appartement', 'immeuble', 'imm', 'quartier', 'derb', 'zankat', 'zenqet', 'road', 'street', 'st', 'building', 'apt', 'n', 'no', 'num', 'numero', 'etage', 'شارع', 'حي', 'زنقه', 'زنقة', 'درب', 'رقم', 'عمارة', 'اقامة', 'إقامة', 'تجزئة'];
function extractAddress(rest, requireWord = true) {
  const clean = String(rest || '').replace(/[,;]+/g, ', ').replace(/\s+/g, ' ').trim();
  if (clean.length < 6) return null;
  const sp = spaced(clean);
  const word = hasAny(sp, ADDR_WORDS);
  if (word || (!requireWord && /\d/.test(clean))) return clean.replace(/^[,\s]+|[,\s]+$/g, '');
  return null;
}
// Remove "my name is <name>" (prefix + the extracted name) from a message.
function stripName(text, name) {
  const m = NAME_RE.exec(text || '');
  if (!m || !name) return text;
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const prefix = m[0].slice(0, m[0].length - m[1].length);
  const nameRe = esc(name).replace(/\s+/g, '\\s+');
  return text.replace(new RegExp(esc(prefix) + nameRe, 'iu'), ' ').replace(/\s+/g, ' ').trim();
}

// ---------- seller voice -> product ----------------------------------------
const UNIT_WORDS = ['pieces', 'piece', 'pcs', 'pc', 'unites', 'unite', 'units', 'unit', 'قطعه', 'قطع', 'حبه', 'حبات', 'dyal', 'stock', 'en stock', '7bba', '9tta', '9ta3', 'pieces', 'exemplaires'];
function parseProductVoice(text) {
  const raw = String(text || '').replace(/[٠-٩۰-۹]/g, c => AR_DIGITS[c] || c);
  const n = norm(raw).replace(/[^a-z0-9؀-ۿ.,]+/g, ' ');
  const out = { name: '', price: null, stock: null, color: '', size: '' };
  let rest = ' ' + n + ' ';
  // price: "200 dh", "200 dirham", "taman 200", "prix 200", "à 200"
  let m = /(\d+(?:[.,]\d+)?)\s*(?:dh|dhs|mad|dirhams?|dr|درهم|دراهم|ديال الدراهم)\b/.exec(rest) || /(?:taman|prix|price|ثمن|السعر|سعر|bi|par|a|à|ب)\s+(\d+(?:[.,]\d+)?)\b/.exec(rest);
  if (m) { out.price = Number(m[1].replace(',', '.')); rest = rest.replace(m[0], ' '); }
  // stock: "50 pieces", "stock 50", "kayn 50"
  m = /(\d+)\s*(?:pieces?|pcs?|pc|unites?|units?|exemplaires|قطعه|قطع|حبه|حبات|7bba|9tta)\b/.exec(rest) || /(?:stock|kayn|kayna|كاين|كاينه|quantite|qty|quantity|en stock)\s*:?\s*(\d+)\b/.exec(rest);
  if (m) { out.stock = Number(m[1]); rest = rest.replace(m[0], ' '); }
  // loose numbers: first = price, second = stock when not found yet
  const loose = [...rest.matchAll(/\b(\d+(?:[.,]\d+)?)\b/g)];
  for (const l of loose) {
    const v = Number(l[1].replace(',', '.'));
    if (out.price == null && v >= 5) { out.price = v; rest = rest.replace(l[0], ' '); }
    else if (out.stock == null) { out.stock = Math.round(v); rest = rest.replace(l[0], ' '); }
  }
  const words = rest.trim().split(/\s+/).filter(Boolean);
  const nameWords = [];
  const sizeWords = new Set(['xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl']);
  for (const w of words) {
    const c = colorOf(w);
    if (c) { out.color = out.color || c; continue; }
    if (sizeWords.has(w)) { out.size = out.size || w.toUpperCase(); continue; }
    if (STOP.has(w) || UNIT_WORDS.includes(w) || MONEY_WORDS.includes(w) || ['ajout', 'ajoute', 'add', 'new', 'nouveau', 'produit', 'product', 'zid', 'دير', 'زيد', 'kayn', 'bghit', 'bi', 'a', 'par', 'prix', 'taman', 'stock'].includes(w)) continue;
    nameWords.push(w);
  }
  out.name = titleCase(nameWords.join(' '));
  return out;
}

module.exports = {
  norm, spaced, tokens, hasAny, hasPhrase, lev, detectLang, intents, extractPhone, validPhone, extractCity, stripCity, CITY_NAMES,
  colorOf, COLORS, extractQty, matchProducts, pickVariant, extractName, extractAddress, stripName, parseProductVoice, titleCase, NUMWORD_LOOKUP,
};
