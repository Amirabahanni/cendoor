# Put Cendoor online for free (about 15 minutes)

## Which free host?

| Host | Works for Cendoor? | Notes |
|---|---|---|
| **Render (free web service)** | **Yes, recommended** | Runs the Dockerfile. No code changes. Sleeps after ~15 min idle (first visit then takes up to a minute). Demo data is rebuilt on every restart, which is what you want for a demo. |
| Hugging Face Spaces (Docker) | Yes, as a fallback | Free, no card. Needs a small `README` header in the Space repository (`sdk: docker`, `app_port: 3000`). |
| **Vercel** | **No, not as is** | Vercel runs short-lived serverless functions. Cendoor is a long-running server that keeps a SQLite file and uploaded photos on disk; on Vercel they would vanish between requests. Making it work means replacing the database with a hosted one (for example Postgres) and the uploads with cloud storage: a rewrite, not a setting. |

## Step 1: a neutral GitHub account (optional but recommended)

Everything on GitHub shows the account name. To keep your personal name out of it, create a free GitHub account just for the demo (for example `cendoor-demo`, with an email address you do not mind sharing). The code in this folder already carries a neutral author name (`Cendoor Demo`).

## Step 2: push the code to GitHub

1. On github.com, signed in to that account: **+ > New repository**. Name it `cendoor`, choose **Public** (simplest for Render) or **Private**, and do **not** add a README. Click **Create repository** and copy the address it shows, for example `https://github.com/cendoor-demo/cendoor.git`.
2. Open a terminal in the `cendoor-mvp` folder and run these one at a time (replace the address with yours):

```bash
git remote add origin https://github.com/cendoor-demo/cendoor.git
```

```bash
git push -u origin main
```

A sign-in window opens (Git Credential Manager). Sign in as the demo account and approve. GitHub does not accept passwords in the terminal.

## Step 3: deploy on Render

1. Go to render.com and **sign up with GitHub** (use the demo account).
2. **New > Blueprint**, choose the `cendoor` repository, and click **Apply**. `render.yaml` sets up everything (Docker, health check, demo mode, a random secret). If Render asks for a payment card for Blueprints, cancel and use **New > Web Service** instead: pick the repository, Runtime **Docker**, Instance type **Free**, and add the environment variables `CENDOOR_DEMO=1` and `CENDOOR_NETWORK_SECRET=<any long random text>`.
3. Wait for the first build (about 5 minutes). Render shows your address, for example `https://cendoor.onrender.com`.
4. In the service **Environment** tab, add `PUBLIC_URL` with that address and save (Render redeploys). This makes tracking links in customer messages correct.

## Step 4: check it

Open `https://<your-address>/api/health`: it should say `{"ok":true,...}`. Then open the address itself, `/s/atlas-boutique` (demo shop), and `/app` (dashboard: `demo@cendoor.com` / `demo1234`). Share the address; the page `/platform` describes everything Cendoor does.

## Things to know

- **First visit is slow** after 15 minutes of silence (the free service is asleep). Open it yourself a minute before a call.
- **Data resets** whenever the service restarts. In demo mode, Settings has a **Reset demo data** button to clean up after each visitor.
- **Real customers** need a paid instance with a persistent disk mounted at `/data`, `CENDOOR_DEMO=0`, and a fixed `CENDOOR_NETWORK_SECRET`.
- **Updating the site later:** change the files, then `git add -A`, `git commit -m "update"`, `git push`. Render redeploys by itself.
- **The Claude features** (free-form Studio requests, bespoke pages) need `ANTHROPIC_API_KEY` as an environment variable. The demo works fully without it.
