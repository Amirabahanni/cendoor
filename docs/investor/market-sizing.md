# Market sizing

**Read this first.** There is no official count of Moroccan sellers who sell through Instagram, TikTok and WhatsApp. The sizing below is built from sourced anchors plus **assumptions that are clearly marked and must be tested with a seller survey** before anyone relies on it. Where a figure comes from a vendor or an unverified page, it says so.

## 1. Sourced anchors

| Anchor | Figure | Source and caveat |
|---|---|---|
| Internet users in Morocco | 35.5 million, 92.2% of the population (end 2025) | [DataReportal, Digital 2026: Morocco](https://datareportal.com/reports/digital-2026-morocco) |
| Social media user identities | 22.8 million (October 2025) | same report |
| TikTok and Instagram audiences | TikTok 16.7M adults, Instagram 15.1M | [Morocco World News summary](https://www.moroccoworldnews.com/2025/11/267078/morocco-2026-digital-report-92-of-the-population-now-online/) of the same report; not verified against DataReportal directly. NapoleonCat estimates about 17.0M Instagram users in September 2026 on Meta's ad-audience data ([source](https://stats.napoleoncat.com/instagram-users-in-morocco/)), which is not directly comparable. |
| Card payments, 2024 | 215 million transactions, 90 billion MAD, of which 44 million e-commerce transactions | CMI (the Moroccan card switch), as reported in the search results; the most reliable official figure found |
| E-commerce revenue | about $1.6 to 1.7 billion (2024 to 2025) | Statista projection reported by [FNH](https://www.fnh.ma/article/actualite-economique/e-commerce-defis-marche-croissance) and [MEA Tech Watch](https://meatechwatch.com/2025/12/15/moroccos-e-commerce-market-approaches-1-7-billion-in-2025-as-fashion-electronics-and-beauty-drive-growth/); a third-party projection, not a payments statistic |
| Registered auto-entrepreneurs | 463,383 at the end of 2025, +5% on 2024 | DGI figure reported by [TelQuel](https://telquel.ma/instant-t/2026/06/29/le-nombre-dauto-entrepreneurs-au-maroc-depasse-les-460-000_1996444/); not all sell online |
| Cash on delivery share | 70 to 90% of orders, depending on the source | **Vendor claims** (eGrow and YouCan marketing pages), not independent data |
| COD failure / return rate | 20 to 40%, "over 50% in some cases" | **Vendor claims** (eGrow, YouCan) selling confirmation tools |
| An official count of social-media sellers | **not found** | no government or independent source located |

## 2. A bottom-up estimate (assumptions, not facts)

Customer = a Moroccan seller who takes orders by DM or link on Instagram, TikTok or WhatsApp, mostly cash on delivery, 10+ orders a month.

| Level | Definition | Low | Base | High | Basis |
|---|---|---:|---:|---:|---|
| **TAM** | Sellers who sell through social media or messaging in Morocco | 50,000 | 100,000 | 150,000 | **Assumption.** Anchored loosely on 463k auto-entrepreneurs (a minority sell online) plus unregistered sellers. To be replaced by survey data. |
| **SAM** | Of those, sellers who sell regularly (10+ orders a month), take cash on delivery and would pay for software | 15,000 | 30,000 | 45,000 | **Assumption:** 30% of TAM. The simulated panel (an upper bound) said 25% would try the offer. |
| **SOM (3 years)** | The share Cendoor could win | 450 | 1,200 | 2,250 | **Assumption:** 3% / 4% / 5% of SAM |

At 149 MAD a month (1,788 MAD a year, about $179 at 10 MAD per dollar), per paying seller:

| | Low | Base | High |
|---|---:|---:|---:|
| Paying sellers in year 3 (SOM) | 450 | 1,200 | 2,250 |
| Annual revenue (MAD) | 0.80 M | 2.15 M | 4.02 M |
| Annual revenue (USD, 10 MAD = $1) | $80 k | $215 k | $402 k |
| SAM as annual revenue (MAD) | 26.8 M | 53.6 M | 80.5 M |

## 3. What this says, honestly

- **Morocco alone is a small market for subscription software at 149 MAD.** Even the high case is about $400k a year in year 3. That supports a real small business and a small seed round, not a large venture round on its own.
- **To be an investor-scale business, one of these must be true and shown:**
  1. **Higher revenue per seller** than the subscription alone (a payment or cash-on-delivery float, an ad-spend margin, carrier commissions, per-order fees), which needs partners and licences not in place today.
  2. **Expansion to similar cash-on-delivery markets** (the vendor sources mention MENA; no figures were verified here).
  3. **A much larger seller base** than assumed, proven by a survey.
- **The numbers that decide this are unknown today:** how many sellers exist, how many would pay, and the real conversion. The fastest way to find out is the seller interviews and the pilot in `research/launch.md`.

## 4. How to improve this section (in order)

1. Ask 100 sellers (DMs and groups): do you take orders by DM, how many a month, what share is cash on delivery, how many are refused, what do you use today, what would you pay.
2. Ask carriers or the CMI/Bank Al-Maghrib for the number of online merchants and cash-on-delivery volumes (official sources).
3. Check the DGI and Maroc PME for auto-entrepreneurs registered in commerce and trade activities that sell online.
4. Replace the assumptions above with those figures and re-run `financial-model.xlsx`.
