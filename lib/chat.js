'use strict';
// Conversation engine. Rule-based core (always works) + optional Claude tool-calling mode
// when ANTHROPIC_API_KEY is set. Both use the same tools: catalogue, stock, shipping, order creation.
const { get, run } = require('./db');
const nlp = require('./nlp');
const convo = require('./convo');
const orders = require('./orders');
const { T, money } = require('./chat-text');

const MAX_QTY = 20;

function productLabel(p, v) { return v && v.label !== 'Standard' ? `${p.name} (${v.label})` : p.name; }
function stockLeft(p) { return p.variants.reduce((s, v) => s + v.stock, 0); }

function chipsForProducts(catalog, lang) {
  return catalog.filter(p => stockLeft(p) > 0).slice(0, 5).map(p => p.name);
}

// ---------- cart helpers ----------------------------------------------------
function cartLines(state, catalog) {
  const out = [];
  for (const l of state.cart || []) {
    const p = catalog.find(x => x.id === l.productId);
    const v = p && p.variants.find(x => x.id === l.variantId);
    if (p && v) out.push({ p, v, qty: l.qty, name: p.name, label: v.label, price: orders.variantPrice(p, v) });
  }
  return out;
}

function missingField(state) {
  if (!state.cart || !state.cart.length) return 'item';
  if (state.pendingProduct) return 'variant';
  if (!state.qtyConfirmed && state.cart.some(l => !l.qty)) return 'qty';
  if (!state.name) return 'name';
  if (!state.phone) return 'phone';
  if (!state.city) return 'city';
  if (!state.address) return 'address';
  return null;
}

// ---------- the rule-based brain -------------------------------------------
function ruleReply({ shop, convoRow, text, catalog }) {
  const state = convo.stateOf(convoRow);
  const known = nlp.detectLang(text, state.lang || convoRow.lang || shop.lang);
  // answers to "name / phone / city / address" questions must not flip the language (e.g. "Rue des Fleurs")
  const answeringField = ['name', 'phone', 'city', 'address'].includes(state.asked) && (state.cart || []).length;
  const lang = state.lang && (answeringField || nlp.tokens(text).length < 2) ? state.lang : known;
  state.lang = lang;
  const t = T(lang);
  const tone = shop.tone;
  const it = nlp.intents(text);
  const replies = [];
  const say = (msg, quick) => { if (msg) replies.push({ text: msg, quick: quick || [] }); };
  const yn = [t.yes, t.no];
  let sp = nlp.spaced(text);

  // --- pending review / recovery answers -----------------------------------
  if (state.awaiting && state.awaiting.type === 'review') {
    const m = /([1-5])/.exec(text) || (/⭐/.test(text) ? [null, String(Math.min(5, (text.match(/⭐/g) || []).length))] : null);
    if (m) {
      const rating = Number(m[1]);
      orders.addReview(shop.id, state.awaiting.orderId, rating, text.replace(/[1-5⭐]/g, '').trim());
      state.awaiting = null;
      say(t.reviewThanks(rating));
      return { replies, state, lang };
    }
    state.awaiting = null;
  }
  if (state.awaiting && state.awaiting.type === 'confirm') {
    const ord = orders.getOrder(state.awaiting.orderId);
    if (ord && (it.yes || it.no)) {
      state.awaiting = null;
      if (it.yes) { if (ord.status === 'pending_confirmation') orders.setOrderStatus(ord.id, 'confirmed', { note: 'Confirmed by the customer' }); say(t.confirmYes(ord)); }
      else { if (!['cancelled', 'delivered', 'shipped'].includes(ord.status)) orders.setOrderStatus(ord.id, 'cancelled', { note: 'Cancelled by the customer' }); say(t.confirmNo(ord)); }
      return { replies, state, lang };
    }
    if (ord && ord.status === 'pending_confirmation' && !it.order && !it.price) { say(t.confirmAgain(), yn); return { replies, state, lang }; }
    state.awaiting = null;
  }
  if (nlp.tokens(text).length <= 3 && nlp.hasAny(sp, ['stop', 'unsubscribe', 'desabonner', 'se desabonner', 'arret', 'stop pub', 'ايقاف', 'توقف', 'الغاء الاشتراك'])) {
    const phone = /^212\d{9}$/.test(convoRow.customer_key) ? '0' + convoRow.customer_key.slice(3) : null;
    const cid = convoRow.customer_id || (phone && (get('SELECT id FROM customers WHERE shop_id=? AND phone=?', shop.id, phone) || {}).id);
    if (cid) { run('UPDATE customers SET opted_out=1 WHERE id=?', cid); say(t.optOut()); return { replies, state, lang }; }
  }
  if (state.awaiting && state.awaiting.type === 'recovery') {
    const choice = /\b1\b/.test(text) || it.recovRetry ? 'retry' : /\b2\b/.test(text) || it.recovPickup ? 'pickup' : /\b3\b/.test(text) || it.recovCancel ? 'cancel' : null;
    if (choice) {
      orders.applyRecovery(state.awaiting.orderId, choice);
      state.awaiting = null;
      say(choice === 'retry' ? t.recRetry() : choice === 'pickup' ? t.recPickup() : t.recCancel());
    } else say(t.recAsk(), ['1', '2', '3']);
    return { replies, state, lang };
  }

  // --- global intents ------------------------------------------------------
  if (it.human) {
    convo.flag(convoRow.id, 'customer_asked_for_seller');
    say(t.handoff());
    return { replies, state, lang, handoff: true };
  }
  const hasPastOrder = !!get("SELECT id FROM orders WHERE conversation_id=? AND status != 'cancelled'", convoRow.id);
  const buying = nlp.hasAny(sp, ['bghit', 'bghina', 'baghi', 'je veux', 'je voudrais', 'je prends', 'i want', 'i would like', 'i ll take', 'بغيت', 'بغينا']);
  if (it.complaint && (hasPastOrder || !state.cart || !state.cart.length) && !buying) {
    convo.flag(convoRow.id, 'complaint');
    say(t.complaint());
    return { replies, state, lang, handoff: true };
  }

  const step = state.step || 'browse';
  const short = nlp.tokens(text).length <= 3;

  // --- confirmation step -----------------------------------------------------
  if (step === 'confirm') {
    const phoneBit = nlp.extractPhone(text);
    const cityBit = nlp.extractCity(text);
    const edited = (phoneBit.phone && phoneBit.phone !== state.phone) || (cityBit && cityBit !== state.city) || nlp.matchProducts(text, catalog).length;
    if (it.yes && !edited) return finalize({ shop, convoRow, state, catalog, lang, t, say, replies });
    if (it.no && short) { state.step = 'browse'; say(t.changed()); return { replies, state, lang }; }
    if (!edited && !it.yes) { say(t.summary(summaryOf(state, catalog, shop), lang), yn); return { replies, state, lang }; }
    state.step = 'browse'; // fall through: treat as an edit of the order
  }

  // --- extract everything we can from the message -----------------------------
  const phoneBit = nlp.extractPhone(text);
  if (phoneBit.phone) state.phone = phoneBit.phone;
  let cityBit = nlp.extractCity(phoneBit.rest);
  if (cityBit) state.city = cityBit;
  const nameBit = nlp.extractName(text);
  if (nameBit && (!state.name || step === 'ask_name' || step === 'browse')) state.name = nameBit;

  const matches = nlp.matchProducts(phoneBit.rest, catalog);
  const top = matches[0];
  const ambiguous = matches.length > 1 && top.score - matches[1].score < 1 && !state.pendingProduct;

  // product mention
  let handledItem = false;
  if (top && !ambiguous) {
    handledItem = true;
    const p = top.product;
    const pv = nlp.pickVariant(phoneBit.rest, p);
    const qty = nlp.extractQty(phoneBit.rest, { sizes: p.variants.map(v => v.size) });
    const inStock = pv.candidates.filter(v => v.stock > 0);
    if (pv.colorMiss || pv.sizeMiss) {
      const avail = p.variants.filter(v => v.stock > 0).map(v => v.label);
      say(`${t.colorMiss(p, pv.colorMiss || pv.sizeMiss)} ${avail.join(', ') || '—'}`, avail.map(l => `${p.name} ${l}`));
      return { replies, state, lang };
    }
    if (!inStock.length) {
      say(t.outOfStock(productLabel(p, pv.candidates.length === 1 ? pv.candidates[0] : null)));
      const alts = p.variants.filter(v => v.stock > 0).map(v => productLabel(p, v));
      const other = catalog.filter(x => x.id !== p.id && stockLeft(x) > 0).slice(0, 2).map(x => x.name);
      const list = alts.length ? alts : other;
      if (list.length) say(t.alts(list.join(', ')), list);
      return { replies, state, lang };
    }
    if (inStock.length > 1 && !(pv.narrowed && inStock.length === 1)) {
      // several variants possible: if the customer only asks price/availability, answer generally
      if (!it.order && (it.price || it.avail) && step === 'browse') {
        say(t.price(p, null, lang) + ' ' + t.askVariant(p), inStock.map(v => `${p.name} ${v.label}`));
        state.pendingProduct = p.id; state.pendingQty = qty || 1;
        return { replies, state, lang };
      }
      state.pendingProduct = p.id; state.pendingQty = qty || 1;
      say(t.askVariant(p), inStock.map(v => v.label));
    } else {
      const v = inStock[0];
      const want = qty || state.pendingQty || 1;
      state.pendingProduct = null; state.pendingQty = null;
      if (want > v.stock) { say(t.qtyTooMany(v.stock, productLabel(p, v))); state.pendingProduct = null; state.cart = [{ productId: p.id, variantId: v.id, qty: 0 }]; state.qtyConfirmed = false; return { replies, state, lang }; }
      // price/availability question without order intent
      if (!it.order && step === 'browse' && (it.price || it.avail || it.delivery === false) && !(state.cart || []).length) {
        say(t.price(p, v, lang) + ' ' + t.stockOk(v.stock) + ' ' + t.wantOrder(), [t.yes, t.no]);
        state.offer = { productId: p.id, variantId: v.id, qty: want };
        return { replies, state, lang };
      }
      state.cart = (state.cart || []).filter(l => l.variantId !== v.id && l.qty > 0);
      state.cart.push({ productId: p.id, variantId: v.id, qty: want });
      state.qtyConfirmed = true; state.offer = null;
      state.step = 'ordering';
    }
  } else if (ambiguous) {
    handledItem = true;
    say(t.askItem(), matches.slice(0, 4).map(m => m.product.name));
    return { replies, state, lang };
  }

  // pending variant answer (customer replied with just a colour/size/label)
  if (state.pendingProduct && !handledItem) {
    const p = catalog.find(x => x.id === state.pendingProduct);
    if (p) {
      const pv = nlp.pickVariant(text, p);
      const inStock = pv.candidates.filter(v => v.stock > 0);
      if (pv.narrowed && inStock.length === 1) {
        const v = inStock[0];
        const want = state.pendingQty || 1;
        state.pendingProduct = null; state.pendingQty = null;
        if (want > v.stock) { say(t.qtyTooMany(v.stock, productLabel(p, v))); state.cart = [{ productId: p.id, variantId: v.id, qty: 0 }]; state.qtyConfirmed = false; return { replies, state, lang }; }
        state.cart = (state.cart || []).filter(l => l.variantId !== v.id && l.qty > 0);
        state.cart.push({ productId: p.id, variantId: v.id, qty: want });
        state.qtyConfirmed = true; state.step = 'ordering'; handledItem = true;
      } else if (pv.narrowed && !inStock.length) {
        say(t.outOfStock(p.name)); return { replies, state, lang };
      } else if (!it.yes && !it.no) {
        say(t.askVariant(p), p.variants.filter(v => v.stock > 0).map(v => v.label)); return { replies, state, lang };
      }
    }
  }

  // quantity answer
  if (step === 'ordering' && (state.cart || []).some(l => !l.qty) && !handledItem) {
    const q = nlp.extractQty(text);
    if (q) {
      const l = state.cart.find(x => !x.qty);
      const p = catalog.find(x => x.id === l.productId), v = p.variants.find(x => x.id === l.variantId);
      if (q > v.stock) { say(t.qtyTooMany(v.stock, productLabel(p, v))); return { replies, state, lang }; }
      l.qty = q; state.qtyConfirmed = true;
    } else { say(t.askQty()); return { replies, state, lang }; }
  }

  // "yes" to an offer ("do you want to order it?")
  if (state.offer && it.yes && !handledItem) {
    state.cart = [{ productId: state.offer.productId, variantId: state.offer.variantId, qty: state.offer.qty }];
    state.qtyConfirmed = true; state.offer = null; state.step = 'ordering';
  } else if (state.offer && it.no && short) { state.offer = null; say(t.askItem(), chipsForProducts(catalog, lang)); return { replies, state, lang }; }

  // delivery question
  if (it.delivery && !(state.cart || []).length) {
    if (state.city) {
      const lines = cartLines(state, catalog);
      const q = orders.quoteShipping(shop, state.city, lines.reduce((s, l) => s + l.price * l.qty, 0));
      say(t.delivery(state.city, q.fee, q.eta, q.carrier, lang, shop.free_shipping_over));
    } else say(t.askCityDelivery());
    return { replies, state, lang };
  }

  // field being asked right now
  const need = missingField(state);
  if (state.step === 'ordering' || (state.cart || []).length) {
    state.step = state.step === 'confirm' ? 'ordering' : (state.step || 'ordering');
    // free-text answers to the question we just asked
    const asked = state.asked;
    const raw = phoneBit.rest.replace(/^[\s,.\-:]+|[\s,.\-:]+$/g, '');
    // "iyeh" / "yes" / "thanks" are chatter, not a name or an address
    const chatter = (it.yes || it.no || it.thanks || it.greet || it.price || it.avail || it.order) && nlp.tokens(raw).length <= 3;
    if (asked === 'name' && !state.name && raw.length >= 2 && !chatter && !/\d/.test(raw) && !handledItem) state.name = nlp.titleCase(raw.replace(NAME_PREFIX, '').slice(0, 60));
    if (asked === 'address' && !state.address && raw.length >= 5 && !chatter && !handledItem) state.address = raw.slice(0, 160);
    if (!state.address && !handledItem) {
      const rest = nlp.stripCity(nlp.stripName(raw, nameBit), cityBit);
      const addr = nlp.extractAddress(rest);
      if (addr && addr.length >= 6) state.address = addr;
    }
    if (asked === 'phone' && !phoneBit.phone && /\d/.test(text)) { say(t.badPhone()); return { replies, state, lang }; }
    if (asked === 'city' && !state.city && raw.length >= 3) {
      say(t.askCity()); return { replies, state, lang };
    }
  } else if (!handledItem) {
    // plain chit-chat
    if (it.thanks) { say(t.thanks(tone)); return { replies, state, lang }; }
    if (it.greet || !text.trim()) { say(t.greet(shop, tone), chipsForProducts(catalog, lang)); return { replies, state, lang }; }
    if (it.price || it.avail || it.order) { say(t.askItem(), chipsForProducts(catalog, lang)); return { replies, state, lang }; }
    if (it.delivery) { say(t.askCityDelivery()); return { replies, state, lang }; }
    state.unclearCount = (state.unclearCount || 0) + 1;
    if (state.unclearCount >= 2) { convo.flag(convoRow.id, 'ai_unsure'); say(t.handoff()); state.unclearCount = 0; return { replies, state, lang, handoff: true }; }
    say(t.unclear(), chipsForProducts(catalog, lang));
    return { replies, state, lang };
  }

  // --- advance the order flow -------------------------------------------------
  if (handledItem && (state.cart || []).length && !it.order && !state.name && step === 'browse') { /* continue to ask details */ }
  return advance({ shop, convoRow, state, catalog, lang, t, say, replies });
}
const NAME_PREFIX = /^(?:je\s+m['’]?appelle|je\s+suis|my\s+name\s+is|i['’]?m|i\s+am|ismi|smiti|ana|اسمي|سميتي|انا)\s+/i;

function summaryOf(state, catalog, shop) {
  const items = cartLines(state, catalog);
  const subtotal = items.reduce((s, l) => s + l.price * l.qty, 0);
  const q = orders.quoteShipping(shop, state.city, subtotal);
  return { items, fee: q.fee, total: subtotal + q.fee, name: state.name, phone: state.phone, city: state.city, address: state.address, eta: q.eta, carrier: q.carrier };
}

function advance({ shop, convoRow, state, catalog, lang, t, say, replies }) {
  const need = missingField(state);
  state.asked = need;
  if (need === 'item') { say(t.askItem(), chipsForProducts(catalog, lang)); return { replies, state, lang }; }
  if (need === 'qty') { say(t.askQty(), ['1', '2', '3']); return { replies, state, lang }; }
  if (need === 'name') {
    // acknowledge price & shipping once the cart has something
    const lines = cartLines(state, catalog);
    if (lines.length && !state.shownCart) {
      const l = lines[0];
      say(`${t.price(l.p, l.v, lang)} ${t.stockOk(l.v.stock)}`.trim());
      state.shownCart = true;
    }
    say(t.askName()); return { replies, state, lang };
  }
  if (need === 'phone') { say(t.askPhone()); return { replies, state, lang }; }
  if (need === 'city') { say(t.askCity(), ['Casablanca', 'Rabat', 'Marrakech', 'Tanger']); return { replies, state, lang }; }
  if (need === 'address') {
    const lines = cartLines(state, catalog);
    const q = orders.quoteShipping(shop, state.city, lines.reduce((s, l) => s + l.price * l.qty, 0));
    say(t.delivery(state.city, q.fee, q.eta, q.carrier, lang, shop.free_shipping_over));
    say(t.askAddress()); return { replies, state, lang };
  }
  state.step = 'confirm';
  say(t.summary(summaryOf(state, catalog, shop), lang), [t.yes, t.no]);
  return { replies, state, lang };
}

function finalize({ shop, convoRow, state, catalog, lang, t, say, replies }) {
  const lines = cartLines(state, catalog);
  try {
    const order = orders.createOrder({
      shopId: shop.id, conversationId: convoRow.id,
      customer: { name: state.name, phone: state.phone, city: state.city, address: state.address },
      items: lines.map(l => ({ variantId: l.v.id, qty: l.qty })), channel: sourceChannel(convoRow), sourceCode: convoRow.source_code || '',
    });
    state.lastOrderId = order.id;
    state.cart = []; state.step = 'browse'; state.pendingProduct = null; state.shownCart = false; state.qtyConfirmed = false; state.asked = null;
    say(t.done({ number: order.number, total: order.total, eta: order.eta, verify: order.verify }, lang, shop.tone));
    return { replies, state, lang, orderId: order.id };
  } catch (e) {
    if (e.code === 'out_of_stock') {
      state.step = 'ordering';
      say(t.qtyTooMany(e.available, e.variant.pname));
      state.cart = [{ productId: e.variant.product_id, variantId: e.variant.id, qty: 0 }]; state.qtyConfirmed = false;
      return { replies, state, lang };
    }
    if (e.code === 'bad_phone') { state.phone = null; state.step = 'ordering'; say(t.badPhone()); return { replies, state, lang }; }
    throw e;
  }
}

function sourceChannel(c) {
  if (c.channel === 'whatsapp') return 'whatsapp';
  if (c.source_code) {
    const l = get('SELECT channel FROM post_links WHERE code=?', c.source_code);
    if (l) return l.channel;
  }
  return 'web';
}

// ---------- optional LLM mode (Claude with tools) ---------------------------
const LLM_MODEL = process.env.CENDOOR_MODEL || 'claude-sonnet-5-5';
const llmEnabled = () => !!process.env.ANTHROPIC_API_KEY;

function llmTools() {
  return [
    { name: 'search_products', description: 'Search the shop catalogue. Returns products with variants (id, label, color, size, stock, price). Use it for every price or availability answer.', input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
    { name: 'quote_shipping', description: 'Delivery fee and ETA for a Moroccan city.', input_schema: { type: 'object', properties: { city: { type: 'string' }, subtotal: { type: 'number' } }, required: ['city'] } },
    { name: 'create_order', description: 'Create the order AFTER the customer confirmed the summary. Phone must be a Moroccan mobile (06/07).', input_schema: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { variant_id: { type: 'integer' }, qty: { type: 'integer' } }, required: ['variant_id', 'qty'] } }, name: { type: 'string' }, phone: { type: 'string' }, city: { type: 'string' }, address: { type: 'string' } }, required: ['items', 'name', 'phone', 'city', 'address'] } },
    { name: 'call_seller', description: 'Hand the conversation to the human seller (angry customer, discount request, anything you cannot answer).', input_schema: { type: 'object', properties: { reason: { type: 'string' } }, required: ['reason'] } },
  ];
}

async function llmReply({ shop, convoRow, text, catalog }) {
  const state = convo.stateOf(convoRow);
  const lang = nlp.detectLang(text, state.lang || shop.lang);
  state.lang = lang;
  const system = [
    `You are the sales assistant of "${shop.name}", a small Moroccan online shop. Tone: ${shop.tone}.`,
    'Reply in the language and script the customer uses: Moroccan Darija (Latin letters like "bghit", or Arabic script), French or English. Keep messages short, WhatsApp style.',
    'Rules: never invent prices, stock or delivery fees: always call the tools. Payment is cash on delivery. To create an order you need: product variant(s) and quantity, full name, Moroccan mobile phone, city, full address.',
    'Before create_order, send a summary (items, delivery fee, total, name, phone, city, address) and wait for the customer to confirm. If the customer is upset, asks for a discount, or you are unsure, call call_seller.',
    `Free delivery above ${shop.free_shipping_over || 'n/a'} MAD. Currency: MAD.`,
  ].join('\n');
  const history = convo.recentMessages(convoRow.id, 16).filter(m => m.role !== 'system').map(m => ({ role: m.role === 'customer' ? 'user' : 'assistant', text: m.text }));
  // merge consecutive same-role messages (API requires alternation)
  const msgs = [];
  for (const h of history) {
    const last = msgs[msgs.length - 1];
    if (last && last.role === h.role) last.content[0].text += '\n' + h.text;
    else msgs.push({ role: h.role, content: [{ type: 'text', text: h.text }] });
  }
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') msgs.push({ role: 'user', content: [{ type: 'text', text }] });
  if (msgs[0].role !== 'user') msgs.unshift({ role: 'user', content: [{ type: 'text', text: '(conversation start)' }] });

  let orderId = null, handoff = false;
  for (let turn = 0; turn < 6; turn++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: LLM_MODEL, max_tokens: 700, system, tools: llmTools(), messages: msgs }),
    });
    if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    const toolUses = (data.content || []).filter(b => b.type === 'tool_use');
    if (!toolUses.length || data.stop_reason !== 'tool_use') {
      const out = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
      return { replies: [{ text: out || T(lang).unclear(), quick: [] }], state, lang, orderId, handoff };
    }
    msgs.push({ role: 'assistant', content: data.content });
    const results = [];
    for (const tu of toolUses) {
      let out;
      try { out = await runTool(tu.name, tu.input || {}, { shop, convoRow, catalog, state, flags: { setOrder: id => { orderId = id; }, setHandoff: () => { handoff = true; } } }); }
      catch (e) { out = { error: e.message }; }
      results.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(out) });
    }
    msgs.push({ role: 'user', content: results });
  }
  return { replies: [{ text: T(lang).unclear(), quick: [] }], state, lang, orderId, handoff };
}

async function runTool(name, input, { shop, convoRow, catalog, flags }) {
  if (name === 'search_products') {
    const q = String(input.query || '');
    const m = nlp.matchProducts(q, catalog).slice(0, 4).map(x => x.product);
    const list = (m.length ? m : catalog.slice(0, 6));
    return list.map(p => ({ product: p.name, price: p.price, description: p.description, variants: p.variants.map(v => ({ variant_id: v.id, label: v.label, color: v.color, size: v.size, stock: v.stock, price: orders.variantPrice(p, v) })) }));
  }
  if (name === 'quote_shipping') {
    const city = nlp.extractCity(String(input.city || '')) || String(input.city || '');
    const q = orders.quoteShipping(shop, city, Number(input.subtotal) || 0);
    return { city, fee: q.fee, eta_days: q.eta, carrier: q.carrier, free: q.free };
  }
  if (name === 'create_order') {
    const phone = nlp.extractPhone(String(input.phone || '')).phone;
    const city = nlp.extractCity(String(input.city || '')) || String(input.city || '');
    const order = orders.createOrder({ shopId: shop.id, conversationId: convoRow.id, customer: { name: input.name, phone, city, address: input.address }, items: (input.items || []).map(i => ({ variantId: i.variant_id, qty: i.qty })), channel: sourceChannel(convoRow), sourceCode: convoRow.source_code || '' });
    flags.setOrder(order.id);
    return { ok: true, order_number: order.number, total: order.total, eta_days: order.eta, shop_will_verify_by_phone: order.verify };
  }
  if (name === 'call_seller') { convo.flag(convoRow.id, String(input.reason || 'ai_handoff').slice(0, 120)); flags.setHandoff(); return { ok: true }; }
  return { error: 'unknown tool' };
}

// ---------- entry point -----------------------------------------------------
async function handleCustomerMessage({ shop, convoRow, text }) {
  convo.addMessage(convoRow.id, 'customer', text);
  const fresh = convo.byId(convoRow.id);
  if (fresh.bot_paused || !shop.ai_enabled) return { replies: [], paused: true };
  const catalog = orders.loadCatalog(shop.id);
  let result;
  const st = convo.stateOf(fresh);
  const awaiting = st.awaiting; // review / recovery answers always use the deterministic path
  if (llmEnabled() && !awaiting && !/^\s*$/.test(text)) {
    try { result = await llmReply({ shop, convoRow: fresh, text, catalog }); }
    catch (e) { console.error('[llm] falling back to rules:', e.message); result = null; }
  }
  if (!result) result = ruleReply({ shop, convoRow: fresh, text, catalog });
  const extra = { lang: result.lang || fresh.lang };
  convo.saveState(fresh.id, result.state, extra);
  const out = [];
  for (const r of result.replies) { out.push(convo.sendToCustomer(fresh.id, 'bot', r.text, r.quick)); }
  return { replies: out, orderId: result.orderId || null, handoff: !!result.handoff };
}

module.exports = { handleCustomerMessage, ruleReply, llmEnabled };
