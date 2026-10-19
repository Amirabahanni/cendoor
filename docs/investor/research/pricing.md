# Pricing: Cendoor

All prices MAD per month. The curve tool printed "$" but the answers were in MAD. **These are 20 simulated sellers: use this to choose what to test with real sellers, not as proof.**

## 1. The price

**Recommendation: do not decide the final price yet. Test 99 and 149 MAD for Solo with real sellers, and launch with a founding-member price of 99 MAD.** Reasons:

- **Acceptable range from the panel: 40 to 199 MAD** (cheap-side limit 40, least resistance 40, indifference 90, expensive-side limit 199). 149 is inside it but **above the indifference price of about 90**.
- **At 149, 6 of 20 sellers call it "too expensive" and 10 of 20 call it "expensive or worse".** At 99, none call it too expensive and 6 of 20 call it expensive. (Counted from `founder/panel-v1/answers`.)
- **Price is not the main blocker.** Of 18 sellers who pass: 8 say trust, 5 say habit (they already have a way of working), 5 say price. A cheaper plan alone does not fix trust. Only 2 of 20 buy at 149 (10%, an upper bound), below the 25% bar `founder-plan` uses.
- **Against competitors** ([competitors.md](competitors.md)): 149 MAD is under every priced competitor (Storeino about 170, YouCan about 290, Shopify about 320, eGrow from about 590 MAD). Price is not what separates Cendoor from them. Proof is.
- **The margin at each price** (from the CFO tool, same ramp, same costs): 99 MAD gives break-even at 39 paying sellers, a 47% margin at 100 sellers and a **year 1 loss** (-11,887). 149 gives break-even at 24, 65%, year 1 profit +3,494. 199 gives break-even at 17, 74%, year 1 profit +18,783. If a lower price does not raise the number of paying sellers by well over half, 99 loses money in year 1 (with 50% more sellers it is still -228). The panel cannot tell us whether it would.

**Second run (the Founding 50 offer, `panel/`):** acceptable range **30 to 150 MAD**, least resistance 30, indifference about **80 MAD**, medians: too cheap 25, bargain 60, getting expensive 149, too expensive 250. The first run above (`panel-v1/`, plain 149 MAD pitch) gave 40 to 199 and 90. The curve moved down a little once the offer included a refund, approve mode and a per-order option, which fits the panel's repeated ask for pay-per-order. The tables and counts in this file come from the first run unless marked.

## 2. The ladder
| rung | price | for | reason to step up |
| --- | --- | --- | --- |
| Trial | 14 days free, no card | everyone | see it confirm real orders |
| Solo | 99 founding / 149 standard | one seller | the core: confirmation, replies, tracking, storefront |
| Growth | 299 | small shop with staff | team access, credits for bespoke pages, campaigns |
| Per confirmed order (to test) | e.g. 3 to 5 MAD per confirmed order, no monthly fee | small and uncertain sellers | pay only when it works |

**Pay-per-confirmed-order is the most repeated flip in the panel** (a free plan, pay-per-order or a much cheaper plan: roughly 10 of the 18 who passed mention one of these in what would change their mind; counted by keyword, so approximate). It also matches the board's Offers lens (charge by result). It is a hypothesis: model it with the CFO tool before offering it, and it needs real confirmation data to price.

## 3. The opening offer
**Founding sellers: the first 50 sellers lock 99 MAD/month for 12 months, closing 2026-12-31 or at 50 sellers, whichever comes first, and keep the 14-day free trial.** The 12-month lock is a real commitment the company can keep, not a "was 149" anchor. After 12 months it moves to the standard price with 30 days notice. Do not discount it again, or buyers learn to wait.

## 4. What to test with real buyers (the next two weeks)
1. **Two landing pages**, one at 99 and one at 149, each with a "start free trial" or "reserve my place" button. Count sign-ups per page. About 50 visits each from the same sellers' groups is enough to see a big gap, not a small one.
2. **Five real sellers, interviewed and shown the 99/149/per-order options.** Ask which one they would sign and what stops them.
3. **A pre-sale or pilot letter**: ask 10 sellers for a written commitment to pay 99 MAD after the trial if it works. The board asked for paid or written pre-commitments.

## 5. The panel's price objections, verbatim (top three)
- "149 MAD a month is a lot when I only sell a few orders, and I already answer every DM myself." (P005)
- "149 MAD a month is too much when I only sell a few orders, and I avoid monthly subscriptions. I already take orders on WhatsApp for free..." (P008)
- "I would not move them to a link and pay 149 MAD a month on a promise, especially for a thing I have not seen work with real Moroccan buyers." (P002)

These are simulated. They are research, never testimonials.

## 6. Open items
- `founder/numbers.json` was **not** changed: the price stays 149 until real sellers choose. If 99 wins, update the price to 3.30 per seller-day and re-run `/founder-cfo`.
- The **margin on a per-order plan is unmodeled**: needs average confirmed orders per seller.
- The panel's side-hustle sellers (7 of 20, 0 buyers) show the lowest willingness. The price for them is a separate question from the price for full-time and small-shop sellers.
