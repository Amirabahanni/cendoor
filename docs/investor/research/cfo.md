# Unit economics: Cendoor (all money in MAD; the tool prints a $ sign but the numbers are dirhams)

## The CFO's note (read this first)

**All money is MAD even though the tool prints "$". One "seller-day" is one paying seller for one day, so "a day" figures mean paying sellers. Nearly every cost is a labelled estimate with no quote (see `cfo-sources.md`). Not financial, tax or legal advice: an accountant should check the structure, payroll and tax before money moves.** This version includes a **WhatsApp provider platform fee (290 MAD/month)** found while researching `ops.md`; the first run left it out.

- **The margin:** each paying seller leaves **about 126 MAD a month** after its own costs (4.21 x 30, an 85% contribution on 149 MAD). At the plan of 100 paying sellers the profit margin is **65%**. Break-even is **24 paying sellers** (at 149 MAD).
- **The line to watch: the number of paying sellers (the ramp), then the 2,000 MAD/month marketing line.** Sellers 20% below plan turns year 1 from **+3,494 to -4,261**. A price 10% lower: **-1,083**.
- **Cash:** you need about **29,820 MAD** before it pays for itself. At the plan ramp the monthly profit turns positive in month 7 and the 19,000 MAD startup is **not** earned back in year 1 (year 1 after startup: **-15,506**).
- **Not in these numbers: any pay for the founder.** With a 6,000 MAD/month salary, break-even becomes **71 paying sellers**, year 1 is **-68,506** and the cash needed is **87,506**. That is the honest picture if the founder needs an income.
- **Three ways to improve the margin (each from a run, not a guess):**
  1. Cut marketing from 2,000 to 1,000 MAD/month: break-even 24 -> **16**, year 1 **+15,494**, startup nearly earned back (-3,506). Cost: fewer sellers unless pull comes from free channels.
  2. Raise the price: 199 MAD (6.63 a day) gives break-even **17** and year 1 **+18,783**.
  3. Do not discount without volume: at 99 MAD with the same ramp year 1 is **-11,887** (break-even 39). Even with **50% more sellers** (150 at plan) it is **-228**. 99 only pays if it brings far more sellers than the plan.
- **Board's money conditions** ([board.md](board.md)): not met yet. There is no real cost quote, no real seller and no founder salary; the guarantee and per-order plan are not in the model (the 30-day guarantee costs about 30 MAD per new seller at a 30% claim rate; the 4 MAD per-order plan needs a seller to confirm about 25 orders a month to match 99 MAD).
- **The thing these numbers cannot tell you:** whether 60 sellers can be found. The panel's 25% is an upper bound: 60 paying sellers in year 1 needs on the order of 240 or more real trials.

---

Every number below comes from the input file. Nothing is looked up or guessed.

## One seller-day

| line | per seller-day |
| --- | ---: |
| Price | $4.97 |
| WhatsApp messages (about 12 MAD per seller-month, estimate) | -$0.40 |
| Claude API / AI credits (about 5 MAD per seller-month, estimate) | -$0.17 |
| Payment processing (about 2.5% of 149 MAD, estimate) | -$0.12 |
| Storage and bandwidth per seller (estimate) | -$0.07 |
| **Contribution** (what each seller-day leaves to pay the fixed costs) | **$4.21** (85%) |

## The margin that matters

Fixed costs: $2,940 a month (Hosting with headroom (Render Starter + disk is about 95 MAD; 150 budgeted) $150, Domain, email, tools (estimate) $100, Accountant and data-protection (CNDP) reserve (estimate) $400, WhatsApp provider platform fee (one provider lists about 290 MAD/month for its entry plan; vendor source, unverified) $290, Marketing: ads and creators (estimate) $2,000).

- **Break-even: 24 seller-days a day.** Below that you lose money every month.
- **Profit margin at your plan** (100 a day): **65%** of every sale, after every cost.

## Year 1, month by month

| month | seller-days a day | revenue | profit | cumulative (after $19,000 startup) |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 0 | $0 | -$2,940 | -$21,940 |
| 2 | 3 | $447 | -$2,561 | -$24,501 |
| 3 | 6 | $895 | -$2,182 | -$26,683 |
| 4 | 10 | $1,491 | -$1,677 | -$28,360 |
| 5 | 15 | $2,236 | -$1,046 | -$29,406 |
| 6 | 20 | $2,982 | -$414 | -$29,820 |
| 7 | 26 | $3,877 | $344 | -$29,476 |
| 8 | 32 | $4,771 | $1,102 | -$28,374 |
| 9 | 38 | $5,666 | $1,859 | -$26,515 |
| 10 | 45 | $6,710 | $2,744 | -$23,772 |
| 11 | 52 | $7,753 | $3,628 | -$20,144 |
| 12 | 60 | $8,946 | $4,638 | -$15,506 |

- **Year 1 operating profit: $3,494** on $45,774 of revenue.
- After the $19,000 startup spend: -$15,506.
- Startup money earned back: not within year 1.
- Cash you need before it pays for itself: **$29,820**.

## What if

| scenario | margin at plan | break-even a day | year 1 profit |
| --- | ---: | ---: | ---: |
| Base plan | 65% | 24 | $3,494 |
| Price -10% | 61% | 27 | -$1,083 |
| Volume -20% | 60% | 24 | -$4,261 |
| Unit costs +15% | 63% | 24 | $2,444 |

## Red flags

- The startup spend is not earned back within year 1.
