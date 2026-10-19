# Brand: Cendoor

Reads `idea.md`, [marketing.md](marketing.md) (positioning: the order-confirmation assistant), [competitors.md](competitors.md) and the panel's reasons ([panel/results.md](panel/results.md)). The panel's biggest blocker is **trust** (8 of 15 who passed), so the brand has to feel like a **reliable, accountable person**, not a futuristic bot. The built landing page leans "futuristic"; that is fine for attracting attention, but the voice and promise below should lead with reliability.

## 1. The name (already chosen: Cendoor, cendoor.com)
The founder chose it and reports the .com is available (not checked by me; I have no registrar access). I did not generate other names. **Checks to finish yourself before spending on branding:**
- **Trademark (Morocco):** search the OMPIC trademark register ([ompic.ma](https://www.ompic.ma), check the current search page) for "Cendoor" and close spellings in classes **9** (software), **35** (advertising, online business services), **42** (software as a service), **38** (messaging). If you expand, repeat at EUIPO, USPTO, UKIPO. A trademark lawyer confirms; nothing is registered until you register it.
- **Domain:** confirm cendoor.com is registered in your name (not just "available"), and check **cendoor.ma**, a typo domain and the main social handles.
- **Handles:** Instagram, TikTok, Facebook, YouTube, X: reserve "cendoor" or the closest consistent handle everywhere.
- **Confusion:** none of eGrow, YouCan, Storeino, Babliy, Shopify or WooCommerce is close in sound or spelling. "Cendoor" reads like "sender" or "send door"; say it aloud in Darija and French with three sellers and check how they pronounce and spell it (a typo risk is "Sendoor").
- **Wordmark only, no icon** (founder's decision).

## 2. The promise, tagline and voice
- **The one-line promise (what the seller can count on every time):** "Every order confirmed before you ship, in your customer's own language, and nothing sent without your say."
- **Taglines (three options):**
  1. **You post. Cendoor does the rest.** (existing; keep for the product, but it over-promises until the integrations are real; pair it with the promise above on the offer page)
  2. Confirmed orders, not silent ones.
  3. Post. Confirm. Ship.
- **Voice in three adjectives:**
  - **Straightforward:** do say "we confirm the order with your customer"; don't say "AI-powered synergy".
  - **Accountable:** do say "you can read every message and take over"; don't say "fully automated, no work".
  - **Local:** do write the way sellers talk in Darija, French and Arabic, simple words; don't translate English slogans word by word.
- **Before/after rewrite of one pitch line** (from `pitch-v1.md`): *Before:* "Cendoor builds your online store from a chat, answers your customers in Darija, French or Arabic, takes the orders, confirms each order." *After:* "You add one link to your bio. When someone orders, we ask them to confirm, you see it, and you ship only confirmed orders."

## 3. The look, as a brief
What is already built (from `cendoor-mvp/public/app.css`): a warm light dashboard with a deep teal **#0F5C5C**, background **#F6F3EE**, text **#1B2A2A**, muted text **#62767A**, border **#E4DFD5**; a dark mode with teal **#43B0AC**; a darker, more futuristic landing page. A wordmark only, no icon.

| colour | hex | job | contrast (text) |
|---|---|---|---|
| Deep teal | #0F5C5C | primary buttons, links, the wordmark on light | 7.8:1 on white, 7.0:1 on #F6F3EE (passes AA and AAA) |
| Warm paper | #F6F3EE | page background | text #1B2A2A on it 13.4:1 |
| Ink | #1B2A2A | body text | see above |
| Night teal (dark mode background) | #0B1F1F | dark pages | #F6F3EE on it 15.4:1; #43B0AC on it 6.5:1 |
| Signal teal | #43B0AC | links and highlights on dark | 6.5:1 on #0B1F1F |
| Gold accent (optional, warmth) | #C9A24A | small accents on dark only | 7.1:1 on #0B1F1F; **2.4:1 on white, so never use it for text on light** |

- **Contrast problem found in the current build:** the muted text colour **#62767A on #F6F3EE is 4.32:1**, just under the WCAG AA minimum of **4.5:1** for normal-size text. Darken it (for example to about #566A6E, recheck) or use it only for large text.
- **Type:** the dashboard uses the system and bundled fonts; keep one display and one text face with full Arabic support. Free options with a permissive licence: **Cairo** (Arabic + Latin) or **IBM Plex Sans Arabic**, from Google Fonts or `@fontsource`; check each licence file before use. Do not use any font without a licence.
- **Logo brief:** a **wordmark only**: "cendoor" in lowercase, a clean geometric sans, teal on light, light on dark, with a custom touch on the "o"s if the designer wants one (no icon, founder's call). It must work on a phone screen at 32 px tall, on a WhatsApp profile picture (square crop of the wordmark), in right-to-left layouts next to Arabic text, and in one colour. Avoid chat bubbles, robots and glowing brains (generic AI look and a trust risk). No generated concept has been made; if you generate concepts with an image tool, mark them as concepts, not a finished logo.
- **The first five touchpoints:**
  1. **The offer page / homepage:** the promise line, the Founding 50 offer, a real person's name and WhatsApp number (trust), and no fake counters.
  2. **The seller's storefront:** already generated per seller; footer "powered by Cendoor", small.
  3. **The confirmation message the customer receives:** short, in the customer's language, names the seller's shop first and Cendoor second ("Hi Salma, this is Atlas Boutique. Please confirm your order #CD-0109...").
  4. **The first social post:** the "order that goes silent" story (marketing hook 2), plain, no logo animation.
  5. **The reply to the first complaint:** the founder answers within hours, names the problem, says what changes. Draft: "You are right, that confirmation went out wrong. I turned it off for your shop, and here is what I changed."

## 4. Rules followed
No competitor's name, logo, colours or tagline copied. No font, image or icon without a licence. Not legal advice on trademarks.
