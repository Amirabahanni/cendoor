# Cendoor brand

One brand, used everywhere: the landing page, the "How it works" page, the dashboard and sign-in, the customer tracking page, the poster, the pitch deck and the favicon. The look is the landing page's: a deep navy world with a teal-to-violet gradient.

## The wordmark

**cen** + **door**, one word, lowercase, extra-bold (800), tight spacing (-0.04em). "cen" is the text colour; "door" carries the gradient. **Wordmark only: no icon, no emoji, no second colour scheme.** The only symbol is the favicon, a gradient "c" on navy.

```html
<a class="logo"><span>cen<b>door</b></span></a>
```
```css
.logo { font-weight: 800; letter-spacing: -.04em; color: var(--text); }
.logo b { background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
```
Keep the `<span>` wrapper: without it, flex layouts put a gap between "cen" and "door".

## Colours

| Token | Value | Use |
|---|---|---|
| Background | `#04070d` | pages, slides, poster |
| Surface | `#0b1220` (cards are a faint white glass: `rgba(255,255,255,.04..07)` with a `rgba(255,255,255,.1)` border) | cards, inputs |
| Text | `#eef6f7` | headings, body |
| Muted | `#93a8ad` | secondary text |
| Teal | `#2dd4bf` | primary accent, links, success |
| Cyan | `#22d3ee` | gradient middle |
| Violet | `#8b5cf6` | gradient end, "Cendoor (AI)" |
| Orange | `#f28c28` | attention, warnings, the "needs approval" tag |
| **Gradient** | `linear-gradient(120deg, #2dd4bf, #22d3ee 45%, #8b5cf6)` | the "door" in the wordmark, primary buttons, headline emphasis, progress bars |
| Status | green `#4cc38a`, red `#f07167`, amber `#f2b24f`, blue `#7ab3ec` | order and risk states |

Primary buttons: gradient fill, dark text (`#04121a`), soft teal glow. Secondary buttons: glass with a hairline border.

## Type

System UI stack (Segoe UI, Roboto, Noto Sans Arabic for Arabic). Headlines 800 weight, tight tracking.

## Backgrounds

A soft teal glow at the top left, violet at the top right, a little orange at the bottom, and a faint grid fading out. Calm motion only (slow drift, gentle reveals), switched off for "reduce motion".

## Light mode

The dashboard has an optional light mode (cream background, deep teal accent) chosen in the sidebar. It is a convenience for sellers who prefer it, not part of the brand; the public pages, the poster and the deck are always the dark brand.

## Sellers' shops

Each seller's shop has its own generated look (that is the product). Only the small "powered by cendoor" line and the customer tracking page carry the Cendoor brand.

## Where it is defined

`public/site.css` (landing and how-it-works), `public/app.css` (dashboard), `public/track.html`, `public/logo.svg` (favicon), `docs/poster/journey.html`, `docs/investor/deck/pitch-deck.html`. Change the tokens in all of them together.
