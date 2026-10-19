# Cendoor: full project context (give this to any AI to continue the work)

Paste this whole file to the AI, then say what you want next. Everything below is the state of the project as of 2026-10-18 (last commit `f5bb3ad`).

---

## 1. The idea in one paragraph

**Cendoor** (cendoor.com, domain chosen and available) is an AI shop-builder and order-automation platform for **Moroccan sellers who sell on Instagram, TikTok and WhatsApp**. The seller only posts and ships; Cendoor does the rest: it designs the seller's website from a description, answers customers, takes orders, confirms them with an AI agent, tracks deliveries and cash, and sends targeted offers to customers. Slogan: **"You post. Cendoor does the rest."** Brand: wordmark only (no icon beside it), futuristic, good looking.

Founder context: a solo founder; the company is not registered yet (someone else is working out registration). The founder wants real, working, honest product work that helps launch the business, not flattery. The founder is not a developer; explain how to do things simply.

## 2. Product decisions already made (do not re-litigate)

- **Languages:** dashboard and storefront in **Arabic, French, English** only. Darija is *not* a site language, but the AI chat must still *understand* Darija (and Arabizi).
- **Websites are generated per description, not templates.** A procedural generator makes a different site each time; the owner can edit text and photos by hand, or change the site by chatting with the AI.
- **Pricing:** no 0 MAD plan. **Free trial 14 days**, then **Solo 149 MAD/month** and **Growth 299 MAD/month**. Basic customization is unlimited and free. **Advanced AI (Claude-written bespoke pages) costs credits:** trial 10, Solo 0 (must buy more), Growth 100.
- **Simple dashboard, 7 menu entries:** Home, Studio, Orders, Messages, Products, Customers, Settings. Sub-tabs: Orders > Cash & delivery, Products > Post links, Customers > Campaigns, Settings > Team.
- **Automation scope:** reply to customers, take orders, AI confirmation agent, WhatsApp tracking updates, announcements and targeted mass messages.
- Telegram dropped. Public description page is `/platform` (the word "investor" must not appear anywhere). Landing page has an animated demo in EN/FR/AR.
- Demo must be neutral: shop **Atlas Boutique** (slug `atlas-boutique`), owner "Demo Owner", no personal names. Git author is "Cendoor Demo".

## 3. What is built (all in `cendoor-mvp/`)

**Stack:** Node >= 22.13, Express, built-in `node:sqlite` (WAL), vanilla JS single-page dashboard, `@fontsource/*` fonts served locally. 114 automated checks (`npm test`), all passing.

**Run:** `npm install`, `npm start` (port 3000). Demo mode `CENDOOR_DEMO=1`. Demo logins: `demo@cendoor.com`, `manager@`, `operator@`, `viewer@cendoor.com` (all `demo1234`). URLs: `/` landing, `/platform` full description, `/app` dashboard, `/s/atlas-boutique` demo storefront, `/api/health`.

### Features (all working in the demo)
1. **AI website generator** (`lib/sitegen.js`): seeded randomness, moods, palette derivation, font pairings, SVG shapes, many layout variants (thousands of combinations). Output is sanitized (`lib/sanitize.js`: tag/attribute allowlist, CSS scoped under `#site`, ids prefixed `g-`, remote resources/fixed/z-index blocked). Content is separated from design: `design` JSON (texts, About, FAQ, social, logo, photos) vs `site` JSON (html, css, vars, fonts, seed).
2. **Studio** (`lib/assistant.js`, `public/views-c.js`): chat that changes the shop in plain words ("make it dark with gold", "add an About section", "price of oud perfume 250", "send an offer to customers in Rabat who spent over 500"). Rule-based engine in EN/FR/AR/Darija, with undo (`assistant_log`). Optional Claude tool-calling (`write_site`, `restyle_site`, `build_site`, `prepare_broadcast`...) only when rules do not understand AND credits > 0. A failed AI call falls back to rules and costs nothing. Tabs: Chat / Edit text & photos / Preview. Photo upload for logo, hero, about, products.
3. **Customer chat engine** (`lib/chat.js`, `lib/nlp.js`, `lib/chat-text.js`): the storefront chat and WhatsApp conversations take orders end to end (product, variant, city, address, phone), understand EN/FR/AR/Darija, Moroccan cities, phone formats.
4. **AI confirmation agent** (`lib/orders.js`): orders from the quick form wait as `pending_confirmation`, a WhatsApp conversation is created, the agent asks the customer to confirm; "YES" confirms automatically. Toggle in Settings (`shops.confirm_agent`).
5. **Tracking and cash:** auto carrier choice, carrier performance table, tracking page `track.html` (needs order number + phone), automatic status updates to customers, failed-delivery recovery flow, COD remittance tracking.
6. **Cendoor Shield** (`lib/network.js`): hashed phone counters across sellers (delivered/failed) to flag risky numbers. Needs many sellers to be useful.
7. **Copilot** (`lib/insights.js`): stock runway, best post, win-back customers, carrier gaps, failure rate.
8. **Post links** (`post_links`): one tracked link per reel/story; captions generator (`lib/caption.js`); per-link visits and revenue.
9. **Roles:** admin / manager / operator / viewer. Inbox with takeover (bot pause), voice notes flagged.
10. **Campaigns with targeting (newest feature)** in `lib/broadcast.js`, `server.js` (`/api/campaigns*`), `public/views-d.js`:
    - Filters (all must match): cities, products bought, categories bought, total spend min/max, number of orders min/max, last order within or older than N days, order channel (instagram/tiktok/whatsapp/web), only customers with no failed delivery.
    - Quick audiences: all, vip (>=1500 MAD), recent (30 days), winback (60+ days), new (<=1 order).
    - Saved audiences (`audiences` table). Live audience count with plain-language summary (EN/FR/AR) and sample recipients. Message preview rendered for a real customer.
    - Personalization: `{name}`, `{city}`, `{last_product}`, `{shop}`, `{link}`. Each campaign creates its own tracked link (`cp-<id>` in `post_links`); history shows visits, orders and revenue (link orders or recipients' orders within 7 days).
    - Drafts for purposes: promo, arrivals, delivery, restock, thanks, winback, in EN/FR/AR.
    - Safety: preview and explicit confirmation before sending, STOP opt-out (`customers.opted_out`), max 3 campaigns/day, max 500 recipients, 5 sends/hour rate limit, input sanitized (filters are normalized and parameterized).
    - Sending: through WhatsApp Cloud API if configured, otherwise every recipient is **queued** with a one-tap `wa.me` link.
    - Studio chat can build the audience from one sentence (`targetingOf` in `lib/assistant.js`), previews it, and sends only after "send".

11. **Launching ads (newest)** in `lib/ads.js`, `/api/ads*`, `public/views-e.js` (Products > Ads): connect the seller's OWN Meta ad account (Facebook Login, or a pasted token verified with Meta for pilot sellers; a demo account for dry runs), pick a product, get generated ad copy, set a budget (20-300 MAD/day, up to 14 days, 2,000 MAD total, 3 running ads, 5 launches a day), confirm, and Cendoor creates campaign, ad set, creative and ad (created paused, activated only when all four exist; Morocco targeting, traffic objective). The seller pays Meta directly. Tokens are stored encrypted. Each ad has a tracked link; the report counts delivered orders against the budget that has run. **Never run against Meta's live servers**; other sellers' accounts need Meta Advanced Access (app review + business verification); Click-to-WhatsApp and TikTok ads are not built.

### Key files
`server.js` (routes), `lib/db.js` (schema + `ensureColumn` migrations), `lib/broadcast.js`, `lib/assistant.js`, `lib/sitegen.js`, `lib/sanitize.js`, `lib/site.js`, `lib/design.js`, `lib/orders.js`, `lib/chat.js`, `lib/convo.js`, `lib/whatsapp.js`, `lib/network.js`, `lib/insights.js`, `lib/analytics.js`, `lib/fonts.js`, `seed.js` (demo data: Atlas Boutique, 45 days of history), `test.js`, `public/` (`index.html` landing, `platform.html`, `shop.js` storefront, `core.js`, `views-a..d.js`, `i18n*.js`, `app.css`, `site.css`, `track.html`), `README.md`, `DEPLOY.md`, `Dockerfile`, `render.yaml`.

## 4. Honest limits (what is NOT real yet)

- **WhatsApp two-way, and Instagram/TikTok inbox access** need Meta (verified business, approved templates) and platform partnerships. The WhatsApp code follows Meta's documented format but has never run against Meta's live servers. Until connected, messages are queued with one-tap links.
- **Carrier tracking is simulated**; real carriers need API contracts.
- **Billing/payments are not connected.**
- **Claude features never ran live** (no API key set); they are tested only with a disabled network. Needs `ANTHROPIC_API_KEY`.
- **Shield** is only valuable with many sellers.
- **Voice/speech in Darija:** not built; the founder asked how to build a good Darija speech recognizer (open topic).
- **Legal:** customer data and mass messaging fall under Moroccan Law 09-08 (CNDP); get legal advice before launch. Company not yet registered.
- Campaign attribution is approximate (link visits/orders and 7-day recipient orders).

## 5. Hosting / next operational step

- **Vercel is not suitable** (needs long-running server, SQLite file and disk uploads).
- Recommended: **Render free web service via Dockerfile**; fallback Hugging Face Spaces (Docker). Steps are in `DEPLOY.md`: neutral GitHub account, push repo, Render Blueprint (or Web Service with `CENDOOR_DEMO=1`, `CENDOOR_NETWORK_SECRET`), then set `PUBLIC_URL`.
- Free tier sleeps after ~15 min and resets demo data on restart. Real customers need a paid instance with a persistent disk at `/data`.
- The user must create/sign in to GitHub and Render themselves; the AI cannot create accounts or enter credentials.

## 6. Environment notes for whoever continues

- Windows 11, PowerShell/Git Bash. Files may have CRLF endings; patch scripts should normalize line endings and read/write as UTF-8 (Python default on Windows breaks on non-ASCII).
- Git commits use author "Cendoor Demo <demo@cendoor.com>".
- Server stop: kill only `node ... server.js` processes. Reset demo data with `rm data/*.db*` (re-seeds on start) or Settings > Reset demo data in demo mode.
- Tests: `node test.js` (must stay green).

## 7. Suggested next steps (in rough priority)

1. Put the demo online (follow `DEPLOY.md`) and test on a phone.
2. Get a `ANTHROPIC_API_KEY` and test the Claude modes for real (bespoke site writing, free-form Studio).
3. Start the Meta WhatsApp Business verification (needs the registered company) so confirmations and campaigns can send for real; design approved message templates for offers.
4. Darija speech-to-text for voice notes (evaluate Whisper fine-tuning or an API; measure on real Moroccan voice notes).
5. Real carrier integrations (pick 1-2 Moroccan carriers, get API access).
6. Billing (Moroccan payment options, CMI/Stripe alternatives) and the credits purchase flow.
7. Campaign improvements: scheduled sends, A/B text, coupon codes tied to campaigns, auto "win-back" triggers, reply handling.
8. Legal and compliance: CNDP declaration, consent wording at checkout for marketing messages.
9. Onboard 3-5 real sellers as pilots; the Shield and Copilot only get valuable with real data.

## 8. How the founder wants the AI to work

Do real work, verify it, and tell the truth about limits. Keep explanations short and plain. Do not waste tokens on long chat; deliver working things. Do not add features that only please; prefer what helps launch the business.
