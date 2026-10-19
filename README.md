# Cendoor

**You post. Cendoor does the rest.** (FR: *Vous postez. Cendoor fait le reste.* · AR: *أنت تنشر، وسندوور تتكفل بالباقي.*)

Cendoor is an AI shop builder and order-automation platform for Moroccan sellers who sell on Instagram, TikTok and WhatsApp. The seller describes the business; the AI designs the website, answers customers, takes and confirms the orders, keeps one stock, prepares labels, follows deliveries on WhatsApp, reconciles the cash and sends announcements. Website and dashboard are in **Arabic, French and English** (the AI also understands customers who write Darija).

Brand: the wordmark `cendoor` (no icon next to it); `public/logo.svg` (a chat bubble shaped like an open door) is used only as the browser-tab icon.

## What is in it

| | |
|---|---|
| **Websites generated from a description** | "A luxurious website for my abayas, black and gold." The generator composes the page from independent parts (9 header/hero/section families with 3 to 6 layouts each), a palette derived from the colours and mood, one of 14 self-hosted font pairings (Latin and Arabic), a shape language and seeded SVG artwork. Another description or "another version" gives a genuinely different site, not a re-skinned template. Moods: elegant, luxury, minimal, bold, playful, futuristic, natural, warm. Right-to-left for Arabic. |
| **Change it by talking** | "Make it dark", "use gold and green", "serif font", "use a carousel for products", "big banner", "hero title: …", "add an About section: …", "add FAQ: question? answer", "add my Instagram", photos ("use it as my main photo / for About / as my logo", or a photo with "this is the black belt, 120 dirham"), prices and stock. Every change has an Undo. |
| **Edit text and photos by hand** | Studio > *Edit text & photos*: name, tagline, announcement bar, hero text, About, footer, contact links and three photo slots. Free. |
| **Advanced AI design (paid tier)** | With `ANTHROPIC_API_KEY`, requests the generator cannot express are handled by Claude, which can write a bespoke page (HTML + CSS + palette + fonts) through a sanitising contract. This uses AI credits: 10 on the trial, 0 on Solo, 100 a month on Growth. Basic customisation above never uses credits. |
| **Automation** | Customer chat in Arabic/French/English/Darija with voice; order creation; **AI confirmation agent** (quick-form orders wait for the customer to reply YES to the AI's WhatsApp message); delivery updates with tracking link; failed-delivery recovery; reviews; cash reconciliation. |
| **Ads** | Products > Ads. Connect your own Meta ad account, pick a product, get the ad written in your language, see the exact budget (20 to 300 MAD a day, up to 14 days, 2,000 MAD total, 3 running ads), confirm, and Cendoor creates the campaign, ad set, creative and ad in *your* account (created paused, switched on only when all four exist; you pay Meta directly). Each ad gets a tracked link; the report counts **delivered** orders against the budget that has run. Runs as a dry run on a demo account. **Not yet tested against Meta's live servers** (see below). |
| **Announcements** | Studio ("send a message to customers who haven't ordered in 2 months") or Customers > Campaigns. **Targeting**: combine city, product or category bought, total spent, number of orders, last order date, order channel and delivery reliability; save audiences; personalise with {name}, {city}, {last_product}; every campaign gets a tracked link and a results line (visits, orders, revenue). Drafts in 3 languages, preview, explicit confirmation, STOP opt-out, daily limit. Without a WhatsApp connection every message is queued with a one-tap link. |
| **Cendoor Shield / Copilot** | Cross-seller delivery signal (anonymous counters) and advice from the seller's own orders (best carrier per city, stock run-out, best post). |
| **Free trial** | New shops get 14 days; paid plans are Solo (149 MAD/month) and Growth (299 MAD/month). |

The dashboard has seven entries (Home, Studio, Orders, Messages, Products, Customers, Settings); Cash & delivery, Post links, Campaigns and Team are tabs inside them.

## Run it on your computer

Requires Node.js 22.13 or newer (built-in SQLite). Dependencies: Express and open-licence font packages.

```bash
npm install
npm start
```

| What | URL |
|---|---|
| Landing page | http://localhost:3000/ |
| How it works (the full description) | http://localhost:3000/how-it-works |
| Demo shop + AI chat | http://localhost:3000/s/atlas-boutique |
| Seller dashboard | http://localhost:3000/app |

Demo logins (password `demo1234`): `demo@cendoor.com` (owner), `manager@`, `operator@`, `viewer@cendoor.com`. First start seeds a fictional boutique with a generated site.

```bash
npm run preflight   # before pushing/deploying: Node version, secrets scan, files, server smoke test
npm test      # 114 checks: chat engine, orders, generated sites, sanitiser security, photos, credits, campaigns, confirmation agent
```

See `DEPLOY.md` for the full step-by-step guide (GitHub, then Render, and why Vercel does not fit).

## Put it online

The full step-by-step guide (GitHub, Render, your own domain, what to check, what to do if something fails) is in **[DEPLOY.md](DEPLOY.md)**. Run `npm run preflight` first. In short: you need a GitHub account and a free Render account; the code is committed locally in this folder.

1. Create an empty GitHub repository, then in this folder:
   ```bash
   git remote add origin https://github.com/<you>/cendoor.git
   git push -u origin main
   ```
2. On render.com: **New > Blueprint**, pick the repository (`render.yaml` configures the Docker build, health check and demo mode).
3. Copy the service URL into `PUBLIC_URL` and redeploy (HTTPS is required for the microphone).
4. Share the URL; the landing page links to `/how-it-works`.

Free plan: the service sleeps after about 15 minutes idle and the demo data is rebuilt after each restart (Settings has "Reset demo data" in demo mode). For real customers use a paid plan with a persistent disk at `/data`, `CENDOOR_DEMO=0` and a stable `CENDOOR_NETWORK_SECRET`.

## Photos

The demo shop and the starter pack for new shops use free Pexels photos (`public/demo/`, `public/stock/`; credits in each `CREDITS.md`). A new seller who accepts the sample products gets matching sample photos; their own uploads are never replaced.

## Documents

- `docs/poster/` the seller journey as an A3 poster (English, French, Arabic; PDF and PNG)
- `docs/investor/` the investor pack and data room: pitch deck, financial model, market sizing, FAQ, demo script, roadmap, metrics, use of funds, cap-table template, security overview and legal drafts (see its `README.md` for the status of each item)

## Configuration

See `.env.example`: `PORT`, `PUBLIC_URL`, `CENDOOR_DEMO`, `CENDOOR_SEED`, `CENDOOR_NETWORK_SECRET`, `CENDOOR_DATA_DIR`, `ANTHROPIC_API_KEY`, `WHATSAPP_*`, `META_APP_SECRET`.

## Security of generated pages

Whatever produced a page (the generator or Claude), it passes `lib/sanitize.js` before it is stored: allowlisted tags and attributes only, no scripts, forms, iframes, event handlers, `javascript:` links or remote images; CSS is parsed, filtered (no `@import`, `@font-face`, remote `url()`, fixed overlays, large z-index) and scoped under `#site`; ids and anchors are namespaced. Dynamic content (products, reviews, FAQ, contact) is injected by the storefront from placeholders, with escaping. The tests include hostile inputs.

## What is real, and what is not

Working and tested: everything in the table, with the rule-based AI and the procedural generator.

Not real yet:
- **Launching ads** follows Meta's documented Marketing API (campaign, ad set, creative, ad) and the Facebook Login flow, but has never run against Meta's live servers. Connecting other people's ad accounts needs a Meta app with Advanced Access (app review and business verification); before that only people with a role on the app can connect, which is enough for a pilot. Ad accounts in MAD, USD and EUR are supported (conversion rates are settings); Click-to-WhatsApp ads and TikTok ads are not built. Set `META_APP_ID`, `META_APP_SECRET` and `CENDOOR_TOKEN_KEY` (encrypts stored tokens) in production.
- **Claude modes** (customer chat, free-form Studio requests, bespoke `write_site` pages) were written against the Messages API tool-calling format but could not be run without an API key. Generated sites do not need it.
- **WhatsApp two-way** follows Meta's documented format but never ran against Meta; it needs a verified Meta business. Until then confirmations and campaigns are recorded and queued with one-tap WhatsApp links, not sent automatically. Meta also requires approved templates for business-started messages and opt-in for marketing messages.
- **Instagram DMs / TikTok messages** are not connected (links work). **Carrier tracking** is simulated by a button. **Billing** stores the plan and credits; nothing is charged, and the trial does not lock the account.
- **Voice** uses the browser's speech recognition (Chrome/Edge); accuracy on Moroccan Arabic is untested.
- **Cendoor Shield needs many sellers** (the demo contains clearly fictional records). Customer data and announcements fall under Moroccan Law 09-08 (CNDP): get legal advice before launch.
- The rules were tested on the scenarios in `test.js`, not on real customers: run a pilot with human review first.

## Code map

```
server.js              routes
lib/sitegen.js         procedural website generator (parts, palettes, fonts, art)   lib/sanitize.js  HTML/CSS sanitiser
lib/site.js            stores generated sites                                     lib/fonts.js     self-hosted fonts
lib/design.js          content document (hero, About, FAQ, social, photos) + content packs
lib/assistant.js       Studio: interpreter, safe actions, undo log, credits, optional Claude tools
lib/broadcast.js       announcements / campaigns    lib/chat.js  customer conversation engine (+ confirmation agent)
lib/orders.js, network.js, insights.js, whatsapp.js, db.js, nlp.js
public/                landing, how-it-works page, storefront (shop.js), dashboard (core.js, views-a..d.js, i18n*.js)
seed.js, test.js, Dockerfile, render.yaml
```
