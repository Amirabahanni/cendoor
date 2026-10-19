# Security and data overview

What is built, what is not, and what an investor's technical or legal adviser will ask. Facts below come from the code in this repository. **This is a self-description, not an audit.** No external security review or penetration test has been done.

## What the product stores

| Data | Where | Notes |
|---|---|---|
| Seller accounts (email, name, role, password hash) | SQLite file in `CENDOOR_DATA_DIR` | Passwords are hashed with scrypt and a per-user random salt. |
| Shop, products, photos | SQLite file and `uploads/` folder | Photos are checked (png, jpeg or webp only, max 1.5 MB) and saved under random names. |
| The seller's customers: name, phone, city, address, order history | SQLite file | Personal data under Moroccan Law 09-08. The seller is the data controller; Cendoor is the processor (see `legal/data-processing-agreement.md`). |
| Conversations with customers | SQLite file | Stored so the seller can read and take over chats. |
| Cross-seller fraud signal ("Cendoor Shield") | `phone_rep` table | Only a **keyed hash** of the phone number and delivered/failed counters. No names, addresses or seller identities. Only useful with many sellers. |
| Ad-account access tokens (when a seller connects Meta ads) | `ad_accounts` table | **Encrypted at rest** (AES-256-GCM) with `CENDOOR_TOKEN_KEY`. Set a long random key in production. |
| Customers who asked to stop | `customers.opted_out` | "STOP" is honoured immediately and excludes them from campaigns. |

## Access control

- Four roles (admin, manager, operator, viewer) with a permission per action. Checked by hand: a viewer can read the ads page but gets 403 on connecting or launching.
- Sessions are random 256-bit tokens, stored server-side, 14-day expiry, sent in an `HttpOnly`, `SameSite=Lax` cookie (and `Secure` when served over HTTPS).
- Rate limits on login (15 per 5 minutes per address), signup, customer chat, orders, tracking lookups, Studio, campaigns and ad launches.
- Public order tracking needs **both** the order number and the phone used on the order.

## Content safety

- The generated storefront HTML and CSS pass a strict **allow-list sanitizer** (tags, attributes, CSS properties); scripts, event handlers, iframes, forms, remote images and `javascript:` links are removed; CSS is scoped to the page; ids and anchors are namespaced. This is covered by automated tests.
- All dashboard text is escaped by a tagged template (no raw HTML from user data).
- Security headers on every response: `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`.

## Messaging safeguards

- Campaigns always show the audience and the exact message and need an explicit confirmation; there is a daily limit (3 campaigns), a recipient limit (500) and a "Reply STOP" line.
- Ads: nothing is created without confirmation; budget range, day limit and total cap; everything is created paused and activated only when all parts exist; the seller pays Meta directly, Cendoor never holds ad money.

## What is NOT in place (be direct about these)

| Gap | Risk | Planned fix |
|---|---|---|
| No external security audit or penetration test | Unknown vulnerabilities | Commission a basic review before real customers |
| Single small server, SQLite file | Data loss if the disk is lost; limited scale | Daily backups and a tested restore now; managed database when sellers grow |
| No backup automation in the repository | Same | Add scheduled backups to object storage |
| Database not encrypted at rest (only ad tokens are) | Disk theft exposes customer data | Host-level disk encryption; field encryption for phone and address if required |
| No two-factor authentication | Account takeover | Add TOTP for owners |
| No audit log for who changed what (only an undo log for the AI studio) | Hard to investigate incidents | Add an activity log |
| WhatsApp, Instagram and TikTok connections never run against the real services | Integration bugs | Pilot with approved test numbers and accounts |
| Moroccan data-protection (CNDP) declaration not filed; terms and privacy policy are drafts | Legal exposure | Lawyer review and CNDP declaration before real customer data (see `legal/`) |
| No incident-response plan | Slow reaction | Write one (who, how to notify the CNDP, the seller and customers) |

## Practical rules for the demo

The public demo uses **only fictional records**. Never put real customer data on the free demo (it resets on every restart and anyone with the link can log in as the demo owner).
