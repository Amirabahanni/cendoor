# Cendoor MVP

Chat-native order automation for Moroccan sellers. The seller posts and ships; Cendoor answers customers (Darija, French, English, Arabic; text and voice), creates the order, keeps one shared stock, prepares the label, updates the customer, recovers failed deliveries and reconciles the cash.

What makes it different from a store builder or a COD app:

| | What it does | Why a competitor does not have it |
|---|---|---|
| **Studio** | The seller changes the shop by talking to it ("make my shop green", "announce free delivery", "lower the caftan to 600"); live preview, undo for every change | Store builders need a dashboard; COD apps have no storefront |
| **Cendoor Shield** | Delivery outcomes are pooled across sellers as anonymous counters (hashed phone, delivered/failed). A number that refused parcels elsewhere is flagged before a label is printed | Blacklist apps are manual and per-store; this is automatic and works for sellers with no website |
| **Copilot** | Reads the seller's own orders: stock run-out dates, best/worst carrier per city (can auto-pick), best-converting post, win-back list | Needs the order, delivery and post data in one place |
| **Post kit + tracked links** | One link and a ready-to-paste Darija caption per post; per-post revenue | |
| **Public tracking page** | `/t/<shop>/<order>` with the phone as proof | Cuts "where is my order?" messages |

## Run it on your computer

Requires Node.js 22.13 or newer (built-in SQLite; the only dependency is Express).

```bash
npm install
npm start
```

| What | URL |
|---|---|
| Landing page + investor walkthrough | http://localhost:3000/ |
| Customer shop + AI chat (demo shop) | http://localhost:3000/s/amina-boutique |
| Seller dashboard | http://localhost:3000/app |

Demo logins (password `demo1234`): `demo@cendoor.com` (admin), `manager@cendoor.com`, `operator@cendoor.com`, `viewer@cendoor.com`. First start seeds a fictional boutique. `CENDOOR_SEED=0` starts empty; deleting `data/cendoor.db` resets.

```bash
npm test      # 45 checks: chat engine, orders, Studio, Shield, Copilot
```

## Put it online for your investor

You need a GitHub account and a free Render account (or any host that runs Docker). Nothing here is deployed for you: it needs your accounts.

**Option A: Render, free (recommended for a demo)**
1. Put this folder in its own GitHub repository (only `cendoor-mvp`, not the rest of your documents):
   ```bash
   cd cendoor-mvp
   git init && git add . && git commit -m "Cendoor MVP"
   git branch -M main
   git remote add origin https://github.com/<you>/cendoor.git
   git push -u origin main
   ```
2. On render.com: **New > Blueprint**, pick the repository. `render.yaml` sets everything up (Docker build, health check, demo mode).
3. When the first deploy finishes, copy the service URL (for example `https://cendoor.onrender.com`) into the `PUBLIC_URL` environment variable and redeploy. Render gives you HTTPS, which the microphone needs.
4. Send the investor the URL. The landing page contains a 6-minute walkthrough with the demo login.

Free-plan behaviour you should know: the service sleeps after about 15 minutes without visits (the first open then takes up to a minute), and the data is re-created from the demo seed on every restart. That is fine for a demo; Settings has a "Reset demo data" button (demo mode only) to clean up after each investor.

**Option B: your own laptop, temporary link (5 minutes, no account)**
Run `npm start`, then in another terminal use a tunnel such as Cloudflare Quick Tunnel (`cloudflared tunnel --url http://localhost:3000`) or ngrok (`ngrok http 3000`). You get a public https link that works while your computer is on. Good for a call, not for leaving with the investor.

**Option C: real use (paid)**
Railway, Fly.io, Render (paid plan) or a small VPS, with a persistent volume mounted at `/data` (the Dockerfile sets `CENDOOR_DATA_DIR=/data`). Use a custom domain (cendoor.com), set `CENDOOR_DEMO=0`, a strong `CENDOOR_NETWORK_SECRET` that you never change, and back up `/data/cendoor.db`.

## Configuration

See `.env.example`. Main variables: `PORT`, `PUBLIC_URL`, `CENDOOR_DEMO`, `CENDOOR_SEED`, `CENDOOR_NETWORK_SECRET`, `CENDOOR_DATA_DIR`, `ANTHROPIC_API_KEY` (chat and Studio use Claude with tool calling; falls back to the built-in rules on error), `WHATSAPP_*` and `META_APP_SECRET` (after Meta business verification; webhook at `/webhooks/whatsapp`).

## What is real, and what is not

Working and tested here:
- Storefront with theme colour, announcement bar and welcome message set from Studio; per-post tracking links; quick COD form; AI chat with browser voice input and read-aloud
- Conversation engine in Darija (Latin and Arabic script), French, English; order creation, atomic stock, COD risk score (including Cendoor Shield), approval for risky orders, restock on cancel
- Studio (rules always; Claude when a key is set), Copilot, automatic best-carrier choice, post kit captions
- Labels with barcode, status flow, customer updates with a tracking link, reviews, failed-delivery recovery, cash reconciliation, team roles enforced on the server, dashboard in English/French/Arabic (RTL)

Not real yet:
- **Cendoor Shield needs many sellers.** The demo includes a few clearly fictional records "from other sellers" so you can see it work (phone 0670000099). With one seller it only knows that seller's own history. Customer data sharing falls under Moroccan Law 09-08 (CNDP): counters are hashed and anonymous here, but get legal advice before launch.
- **WhatsApp two-way** is written to Meta's documented format but never run against Meta; it needs a verified Meta business. **Instagram DMs and TikTok messages** are not connected (links work).
- **Carrier tracking** is simulated by a button; real carrier APIs plug into `advanceShipment` in `lib/orders.js`.
- **Billing** stores the plan; nothing is charged.
- **Voice** uses the browser's speech recognition (Chrome/Edge; Darija accuracy untested; audio goes to the browser vendor). WhatsApp voice notes are flagged for the seller, not transcribed.
- **The Claude modes** (chat and Studio) were written against the Messages API tool-calling format but could not be run without an API key; the rule-based modes are what has been tested.
- The built-in rules were tested on the scenarios in `test.js`, not on real customer conversations. Run a pilot with human review first.

## Code map

```
server.js            routes (shop, auth, products, orders, inbox, analytics, Studio, tracking, team, WhatsApp webhook, demo reset)
lib/db.js            SQLite schema + light migrations
lib/nlp.js           Darija/French/English/Arabic language handling
lib/chat.js          customer conversation engine (rules + optional Claude)
lib/assistant.js     Studio: talk to your shop (rules + optional Claude), undo log
lib/orders.js        catalogue, shipping, COD risk, orders, status machine, recovery
lib/network.js       Cendoor Shield (hashed phone counters)
lib/insights.js      Copilot: run-out, carrier performance, best post, value created
lib/caption.js       post kit captions
lib/whatsapp.js      WhatsApp Cloud API adapter
public/              landing, storefront (shop.*), dashboard (core.js, views-a/b/c.js, i18n*.js), tracking page
seed.js, test.js     demo data, tests
Dockerfile, render.yaml, .env.example
```
