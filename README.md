# Cendoor

**You post. Cendoor does the rest.** (FR: *Vous postez. Cendoor fait le reste.* · AR: *أنت تنشر، وسندوور تتكفل بالباقي.*)

Cendoor is an AI shop builder and order automation platform for Moroccan sellers who sell on Instagram, TikTok and WhatsApp. The seller tells the AI what they sell; it builds the shop, answers customers (Arabic, French, English, and Darija when customers write it), takes the orders, keeps one stock, prepares labels, updates the customer and tracks the cash. Website and dashboard are available in **Arabic, French and English**.

Logo: `public/logo.svg` (a chat bubble shaped like an open arched door, teal gradient with an orange handle).

## What is in it

| | |
|---|---|
| **Studio (AI builds the site)** | The seller talks, types or sends a photo. "Build my shop" asks four questions and creates the whole site (look, hero, About, FAQ, delivery, contact, optional sample products). After that: "make it futuristic with dark mode", "use gold and black", "add an About section: …", "add FAQ: question? answer", "add my Instagram", "hero title: …", "move the FAQ to the top", "this is the black belt, 120 dirham, 15 pieces" + photo, "use it as my logo", prices and stock. Live preview, undo for every change. Rules always work; with `ANTHROPIC_API_KEY` Claude handles free-form requests through the same safe actions. |
| **Design system** | One validated JSON document per shop: preset (minimal, elegant, bold, playful, futuristic, natural, luxury), dark/light/auto, two colours, font, corner radius, card style, columns, hero (banner/split/minimal), reorderable sections, logo, social links. The storefront renders it; nothing a seller or an AI types can inject markup or remote images. |
| **Customer side** | Storefront with AI chat (voice in and read-aloud), quick COD form, public order tracking page. |
| **Orders** | Chat or form creates the order, atomic stock, COD risk score, approval for risky orders, labels with barcode, delivery updates with tracking link, reviews, failed-delivery recovery, cash reconciliation. |
| **Cendoor Shield** | Delivery outcomes pooled across sellers as anonymous counters (hashed phone, delivered/failed). A number that refused parcels elsewhere is flagged before a label is printed. |
| **Copilot** | Reads the seller's own orders: stock run-out, best/worst carrier per city (can auto-pick), best post, win-back list, value created. |
| **Free trial** | New shops get 14 days free; paid plans are Solo (149 MAD/month) and Growth (299 MAD/month). |

The dashboard has seven entries (Home, Studio, Orders, Messages, Products, Customers, Settings); Cash & delivery, Post links and Team are tabs inside Orders, Products and Settings.

## Run it on your computer

Requires Node.js 22.13 or newer (built-in SQLite; the only dependency is Express).

```bash
npm install
npm start
```

| What | URL |
|---|---|
| Landing page | http://localhost:3000/ |
| Investor guide | http://localhost:3000/investor |
| Demo shop + AI chat | http://localhost:3000/s/amina-boutique |
| Seller dashboard | http://localhost:3000/app |

Demo logins (password `demo1234`): `demo@cendoor.com` (owner), `manager@`, `operator@`, `viewer@cendoor.com`. First start seeds a fictional boutique. `CENDOOR_SEED=0` starts empty.

```bash
npm test      # 66 checks: chat engine, orders, Studio (incl. building a whole shop), design validation, Shield, Copilot
```

## Put it online

You need a GitHub account and a free Render account. The code is already committed locally in this folder.

1. Create an empty GitHub repository, then in this folder:
   ```bash
   git remote add origin https://github.com/<you>/cendoor.git
   git push -u origin main
   ```
2. On render.com: **New > Blueprint**, pick the repository. `render.yaml` sets up the Docker build, health check and demo mode.
3. Copy the service URL into the `PUBLIC_URL` variable and redeploy (HTTPS is required for the microphone).
4. Send the investor the URL. The landing page links to `/investor`.

Free plan: the service sleeps after about 15 minutes idle (first visit takes up to a minute) and the demo data is rebuilt after each restart; Settings has a "Reset demo data" button in demo mode. For real customers use a paid plan with a persistent disk at `/data` (see `Dockerfile`), `CENDOOR_DEMO=0` and a strong, never-changing `CENDOOR_NETWORK_SECRET`.

Quick temporary link without accounts: `npm start`, then a tunnel (`cloudflared tunnel --url http://localhost:3000` or `ngrok http 3000`).

## Configuration

See `.env.example`: `PORT`, `PUBLIC_URL`, `CENDOOR_DEMO`, `CENDOOR_SEED`, `CENDOOR_NETWORK_SECRET`, `CENDOOR_DATA_DIR`, `ANTHROPIC_API_KEY`, `WHATSAPP_*`, `META_APP_SECRET`.

## What is real, and what is not

Working and tested here: everything in the table above, with the rule-based AI.

Not real yet:
- **Claude modes** (customer chat and Studio) were written against the Messages API tool-calling format but could not be run without an API key. Studio's rules are what has been tested; free-form design requests ("make it feel like a Marrakech riad") need the key.
- **WhatsApp two-way** follows Meta's documented format but never ran against Meta; it needs a verified Meta business. **Instagram DMs and TikTok messages** are not connected (links work).
- **Carrier tracking** is simulated by a button; real carrier APIs plug into `advanceShipment` in `lib/orders.js`.
- **Billing**: the trial and plan are stored; nothing is charged and the trial does not lock the account.
- **Voice** uses the browser's speech recognition (Chrome/Edge, accuracy on Moroccan Arabic untested; audio goes to the browser vendor). WhatsApp voice notes are flagged, not transcribed.
- **Cendoor Shield needs many sellers.** The demo includes a few clearly fictional records "from other sellers" (phone 0670000099). Moroccan Law 09-08 (CNDP) applies to customer data: get legal advice before launch.
- The rules were tested on the scenarios in `test.js`, not on real customers. Run a pilot with human review first.

## Code map

```
server.js            routes
lib/design.js        design document: presets, validation, "build my shop" content packs
lib/assistant.js     Studio interpreter, safe actions, undo log, optional Claude tools
lib/chat.js          customer conversation engine        lib/nlp.js  Arabic/French/English/Darija language handling
lib/orders.js        catalogue, shipping, COD risk, orders, status machine, recovery
lib/network.js      Cendoor Shield                       lib/insights.js  Copilot
lib/whatsapp.js      WhatsApp Cloud API adapter          lib/db.js  SQLite schema + migrations
public/index.html, investor.html, site.css, logo.svg     marketing site
public/shop.js, shop.css                                 storefront (renders the design document)
public/core.js, views-a/b/c.js, i18n*.js                 dashboard
seed.js, test.js, Dockerfile, render.yaml
```
