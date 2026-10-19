# Investor pack and data room

Everything an investor, a bank or a partner is likely to ask for, with an honest status for each item. **Ready** = written and checked against the facts we have. **Draft** = written, needs a person (lawyer, accountant, the founder) before it is used. **Needs you** = only the founder can provide it.

## Start here

| Item | Status | File |
|---|---|---|
| Pitch deck (18 slides, PDF) | **Draft:** founder name, team, ask amount and contact are blanks to fill | `cendoor-pitch-deck.pdf` (source: `deck/pitch-deck.html`) |
| The full description of the platform (19-page PDF, also the page `/how-it-works`) | Ready | `cendoor-how-it-works.pdf` |
| One-page summary | Ready | `research/one-pager.md` |
| Business plan (computed verdict, all sections) | Ready | `research/business-plan.md` |
| Live demo and how to present it | Ready | `demo-script.md` and the demo link (see `../../DEPLOY.md`) |
| The seller journey poster (A3, EN / FR / AR) | Ready | `../poster/` |
| Brand (one wordmark, one palette, used everywhere) | Ready | `../brand.md` |

## Business and market

| Item | Status | File |
|---|---|---|
| Market sizing (sourced anchors, assumptions marked) | Ready; **assumptions to replace with a seller survey** | `market-sizing.md` |
| Financial model (36 months, formulas, scenarios) | Ready; costs are estimates without quotes | `financial-model.xlsx` |
| Unit economics and CFO note | Ready | `research/cfo.md`, `research/cfo-sources.md` |
| Pricing study | Ready (simulated buyers: indicative only) | `research/pricing.md` |
| Competitor analysis | Ready (public pages, vendor-biased) | `research/competitors.md`, `research/competitors.csv` |
| Board review (3 viewpoints) | Ready | `research/board.md` |
| Customer research (simulated sellers, two runs) | Ready; **simulated, an upper bound** | `research/panel-results-first-pitch.md`, `research/panel-results-final-offer.md` |
| Go-to-market and launch plan | Ready | `research/marketing.md`, `research/launch.md` |
| Metrics and pilot targets | Ready | `metrics-and-kpis.md` |
| Product roadmap | Ready | `product-roadmap.md` |
| Use of funds and the ask | **Draft: the founder decides amount and terms** | `use-of-funds-and-ask.md` |
| Answers to the hard questions | Ready | `investor-faq.md` |

## Company, legal and risk

| Item | Status | File |
|---|---|---|
| Company details, ownership, cap table, IP | **Needs you** (company not registered yet) | `company-and-cap-table.md` |
| Terms of service, privacy policy, data processing agreement, pilot agreement | **Draft: must be reviewed by a Moroccan lawyer** | `legal/` |
| Security and data overview | Ready (self-description, no external audit) | `security-and-data.md` |
| Risk register and operations | Ready | `research/ops.md` |
| Brand: name checks, voice, look | Ready; trademark search **to be done** | `research/brand.md` |

## What an investor will notice is missing

1. **No customers, no revenue, no real orders.** The pilot (`research/launch.md`) is the first thing to do.
2. **No registered company**, so no cap table, bank account or contracts.
3. **No team page content.** Only the founder can write it.
4. **Key integrations are not live** (WhatsApp, Instagram, TikTok, Meta ads, carriers, billing).
5. **No external security review**, no CNDP declaration, legal texts in draft.

Say these first. Investors react better to a founder who names the gaps than to one who is caught on them.

## Keeping it consistent

The numbers in the deck, the model and the plan all trace to `research/numbers.json` (the CFO inputs) and `financial-model.xlsx`. If you change a price, a cost or the ramp, change them in the workbook, re-run the CFO tool, and update the deck's financial slide.
