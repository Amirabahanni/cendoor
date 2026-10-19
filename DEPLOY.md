# Put Cendoor online, for free (about 20 minutes)

You will end up with a public link like `https://cendoor.onrender.com` that you can send to investors, sellers and friends. Later you can point `cendoor.com` at it.

## Which free host?

| Host | Works for Cendoor? | Notes |
|---|---|---|
| **Render (free web service)** | **Yes, recommended** | Runs the `Dockerfile`, no code changes. Per [Render's free-plan docs](https://render.com/docs/free): 750 free hours a month, the service **sleeps after 15 minutes without visits** (the next visit takes about a minute to wake it), the disk is **not kept** (so the demo data is rebuilt at every restart, which is exactly what a demo wants), custom domains and free HTTPS certificates are supported. |
| Hugging Face Spaces (Docker) | Yes, as a fallback | Free, no card. Needs a small header in the Space's `README` (`sdk: docker`, `app_port: 3000`). |
| **Vercel** | **No, not as is** | Vercel runs short-lived functions. Cendoor is a long-running server with a database file and uploaded photos on disk; on Vercel they vanish between requests. Making it work means replacing the database and the uploads: a rewrite, not a setting. |

## Step 0: check the project (2 minutes)

In the `cendoor-mvp` folder:

```bash
npm install
```

```bash
npm run preflight
```

It checks the Node version, looks for passwords or keys in your files, starts the server the way the host will, and tries the main pages, the demo photos and the demo login. Fix anything marked `FAIL` before going on. A `warn` about uncommitted changes means: run `git add -A` and `git commit -m "ready"` first.

## Step 1: a neutral GitHub account (optional but recommended)

Everything on GitHub shows the account name. To keep your personal name out of it, create a free GitHub account just for this (for example `cendoor-demo`, with an email address you do not mind sharing). The code already carries a neutral author name (`Cendoor Demo`).

## Step 2: push the code to GitHub

1. On github.com, signed in to that account: **+ > New repository**. Name it `cendoor`. Choose **Public** (simplest for Render) or **Private**. Do **not** tick "Add a README". Click **Create repository** and copy the address it shows, like `https://github.com/cendoor-demo/cendoor.git`.
2. In a terminal in the `cendoor-mvp` folder, one command at a time (replace the address with yours):

```bash
git branch -M main
```

```bash
git remote add origin https://github.com/cendoor-demo/cendoor.git
```

```bash
git push -u origin main
```

A sign-in window opens (Git Credential Manager). Sign in as the demo account and approve. GitHub does not accept your password in the terminal; this window is the normal way.

## Step 3: start it on Render

1. Go to **render.com** and **sign up with GitHub** (use the demo account).
2. **New > Blueprint**, choose the `cendoor` repository, click **Apply**. The file `render.yaml` sets up everything (Docker, health check, demo mode, a random secret). If Render asks for a payment card for Blueprints, cancel and use **New > Web Service** instead: pick the repository, **Runtime: Docker**, **Instance type: Free**, and add the environment variables `CENDOOR_DEMO` = `1` and `CENDOOR_NETWORK_SECRET` = any long random text.
3. Wait for the first build (about 5 minutes). Render shows your address, for example `https://cendoor.onrender.com`.
4. In the service's **Environment** tab, add **`PUBLIC_URL`** = that address, then save (Render redeploys). This makes the links inside messages, campaigns and ads point to the right place.

## Step 4: check it

Open these (replace the address):

| Address | You should see |
|---|---|
| `/api/health` | `{"ok":true,...}` |
| `/` | the landing page |
| `/s/atlas-boutique` | the demo shop with photos |
| `/app` | the dashboard. Press **Try the demo** |
| `/how-it-works` | the full description of the platform, with screenshots |
| `/s/atlas-boutique` on your phone | the same shop, laid out for a phone |

Demo logins (password `demo1234` for all): `demo@cendoor.com` (owner), `manager@`, `operator@`, `viewer@cendoor.com`.

## Step 5: use your own address (cendoor.com)

1. In Render: your service > **Settings > Custom Domains > Add Custom Domain**, enter `cendoor.com` and `www.cendoor.com`.
2. Render then shows the DNS records to add at the place where you bought the domain (usually a `CNAME` for `www` and an `ALIAS`/`A` record for the bare domain). Add exactly what Render shows, then click **Verify**.
3. Wait for the certificate (HTTPS) to appear, often a few minutes, sometimes up to a few hours.
4. Change **`PUBLIC_URL`** to `https://cendoor.com`.

## Sharing it with investors or sellers

- **Open it yourself a minute before** the call: after 15 minutes of quiet the free service is asleep and the first visit is slow.
- The demo data **resets** whenever the service restarts. In demo mode, *Settings > Reset demo data* cleans up after a visitor. Anyone with the link can log in as the demo owner and change things; that is why the demo contains only fictional records. **Never put real customer data on the free demo.**
- A good 5-minute path: landing page (`/`), the demo shop (`/s/atlas-boutique`), press **Try the demo** (`/app`), show Home, an order, the Studio chat ("make it dark with gold"), Campaigns, Ads. See `docs/investor/demo-script.md`.
- Send the poster `docs/poster/cendoor-journey-en.pdf` with the link.

## What changes for real customers

The free setup is a **demo**. For real sellers you need:
- a **paid instance with a persistent disk** mounted at `/data`, and `CENDOOR_DEMO=0` (so the database survives restarts and nobody can log in as the demo owner);
- a fixed `CENDOOR_NETWORK_SECRET` and a `CENDOOR_TOKEN_KEY` (encrypts stored ad-account tokens);
- daily backups of the `/data` folder (database and uploads) and a tested restore;
- your registered business, terms and privacy policy, and the data-protection (CNDP) steps (see `docs/investor/legal/`);
- billing, WhatsApp access and carriers, which are not connected yet (see the README).

## Updating the site later

Change the files, then:

```bash
git add -A
```

```bash
git commit -m "update"
```

```bash
git push
```

Render redeploys by itself.

## If something goes wrong

| Problem | What to do |
|---|---|
| Build fails on Render | Open the build log. The `Dockerfile` uses Node 22; the app needs Node 22.13 or newer. If it says `node:sqlite` is missing, the base image is too old. |
| The page loads forever the first time | The free service was asleep; wait about a minute. |
| Images are missing | Check `/demo/caftan.jpg` loads. If not, `public/demo` was not pushed (`git status`, then `git add -A`). |
| "Cannot GET /something" | You opened a path that does not exist; try the addresses in Step 4. |
| Links in messages point to `localhost` | `PUBLIC_URL` is not set (Step 3.4). |
| Everything resets | Expected on the free plan (no disk). |
| Render asks for a card | Use **New > Web Service** with the **Free** instance type (Step 3.2). If it still asks, use Hugging Face Spaces, below. |

## Fallback: Hugging Face Spaces

Create a free account, **New Space > Docker**, and push the same code to the Space's git address. Add a header at the top of the Space's `README.md`:

```
---
title: Cendoor
sdk: docker
app_port: 3000
---
```

Set `CENDOOR_DEMO=1` in the Space settings.

## Optional: the AI features

The Claude features (free-form Studio requests, bespoke pages) need `ANTHROPIC_API_KEY` as an environment variable. The demo works fully without it.
