# Cendoor · Business plan

> **Every "$" in the tool-generated tables below means Moroccan dirhams (MAD).** "Seller-day" = one paying seller for one day. The verdict is computed from estimates and simulated buyers; read `summary.md` for what it does and does not mean.

**Verdict: Profitable**

- ✓ Each seller-day earns $4.21 before fixed costs (85% contribution).
- ✓ Year 1 operating profit: $3,494.
- ✓ 5 of 20 simulated buyers buy (25%, the bar is 25%).

| key number | |
| --- | ---: |
| Price | $4.97 a seller-day |
| Profit margin at plan | 65% per seller-day |
| Break-even | 24 seller-days a day |
| Year 1 operating profit | $3,494 |
| Startup spend | $19,000 |
| Cash needed before it pays for itself | $29,820 |
| Startup money earned back | not in year 1 |
| Buyer panel | 5 buy · 15 pass |

## The idea

- What it is: an AI shop-builder and order-automation platform. The seller describes the business in chat; the AI generates a unique website, answers customers, takes and confirms orders, tracks deliveries and cash, and sends targeted offers to past customers. Slogan: "You post. Cendoor does the rest."
- Who it is for: small Moroccan sellers (often one person, 1-5 staff) who sell on Instagram, TikTok and WhatsApp (fashion, beauty, perfume, food, home, accessories), take orders by DM, mostly cash on delivery, and spend their day replying to messages, writing down orders, phoning to confirm, and chasing carriers. Interface in Arabic, French, English; the AI also understands Darija.
- What it sells, at what price: monthly software subscription. 14-day free trial, then Solo 149 MAD/month and Growth 299 MAD/month. Basic site customization is unlimited; advanced AI (bespoke pages written by Claude) uses credits (trial 10, Solo 0, Growth 100, extra credits to be sold).
- Where and how: online, Morocco first. Sellers found through Instagram/TikTok/WhatsApp content and referrals; each seller gets a storefront link to put in their bio; customers order through the link, a chat, or WhatsApp.
- Budget and constraints: solo founder, budget not stated. A working MVP already exists (demo with fictional shop "Atlas Boutique": site generator, Studio chat, customer chat that takes orders, AI confirmation agent, tracking page, cash/COD tracking, shared risky-number counters, Copilot insights, post links, targeted WhatsApp campaigns with a one-tap queue). Company not yet registered. Not yet working for real: Meta WhatsApp Business API (needs verified business and approved templates), Instagram/TikTok inboxes (need platform approval), real carrier APIs (tracking is simulated), billing, voice notes in Darija. The Claude-written pages mode has never run with a real API key. No paying customers or real sellers tested yet.

## Summary

**What it is:** Cendoor is an AI service for small Moroccan sellers on Instagram, TikTok and WhatsApp that confirms each cash-on-delivery order with the customer in their language before the seller ships, and builds the seller's store link from a chat. The board's recommended focus is the **order-confirmation assistant** (store builder second).

**The verdict, computed by the tool: Profitable. Read what that means before you act on it.**
- It means: each paying seller earns money before fixed costs (126 MAD a month, 85%), year 1 makes an operating profit (**+3,494 MAD**) and at least 25% of simulated sellers buy (**5 of 20, exactly the 25% bar**).
- It does **not** mean the business has been shown to work. Year 1 is **-15,506 MAD after the 19,000 MAD startup spend**, there is **no pay for the founder** in the numbers (with a 6,000 MAD salary year 1 is -68,506 and break-even is 71 paying sellers), almost every cost is an **estimate**, and the buy rate comes from **simulated** sellers that lean agreeable. Cash needed before it pays for itself: **about 29,820 MAD**.
- Margin at the plan of 100 paying sellers: **65%**. Break-even: **24 paying sellers** at 149 MAD (39 at 99 MAD).
- **The result flips if sellers come in 20% below plan** (year 1 becomes -4,261) **or if the price drops 10%** (-1,083).

**Where the board and the panel agreed:** the pain is real (silent and refused cash-on-delivery orders), and the store builder is not a reason to buy. **The panel's main blocker is trust**: 8 of 15 who passed will not let a bot speak in their name for an unknown company; no pricing or wording fixed that. What moved buyers: **approve-before-send, a free trial with no card, a refund, and a pay-per-confirmed-order option** (buy rate 10% -> 25%).
**Where they disagreed:** the board's Monopoly lens scored 4/10 (no moat), Offers and Product 5/10. The panel and the board disagree on pricing weight: the panel mostly wants pay-per-order, the board wants a result-based price too, and the CFO shows a 99 MAD plan **loses money in year 1** unless it brings far more sellers.

**The biggest risk and what to do about it:** **no real seller has used it**, and the core promise depends on WhatsApp access that is unapproved and may cost more per seller than modelled. Plan: a free **30-day pilot with 3 to 10 real sellers** found by direct message, with approve-before-send, results measured before vs after, then written 99 MAD commitments (see `launch.md`).

**Competition (public sources, vendor-biased):** eGrow (from $59/month, 200+ stores claimed), YouCan Confirm (human agents), and **Babliy** (Darija AI on WhatsApp, launched June 2026). The open lane is the seller who only has an Instagram or TikTok account and no store; this is an inference to test with sellers, not a verified gap.

**What you need to start:** about **29,820 MAD** of cash plus an income for yourself, a registered business status, a lawyer for the customer-data law (09-08, CNDP), a billing method, and a WhatsApp access decision. All open.

**The one thing to do this week:** message 10 real sellers on Instagram, one by one, and ask how they confirm cash-on-delivery orders today (marketing hook 1). Do not build more features until three of them say they would try it.

## What the board said

**Vote: 3 fund if, 0 fund, 0 pass. Average score 4.7/10** (Offers 5, Monopoly 4, Product 5).

The board does not say pass. It says: not yet, and here is what has to be true.

### Risks raised by more than one member (read these first)
1. **No proof anyone pays or that it works.** Zero real sellers, zero real orders, Claude pages mode never run with a real key. (All three.)
2. **The core promise rests on integrations that are not real.** WhatsApp Business API, Instagram/TikTok inboxes and carrier tracking are unapproved or simulated; "Cendoor does the rest" is not deliverable today. (All three.)
3. **Positioning is blurry and drifts toward a commodity.** A site builder is generic; the 99 MAD cheapest-site idea sells the weakest part and invites price comparison. The one sharp thing is cash-on-delivery order confirmation and recovery. (All three.)
4. **No moat against a copycat.** Site generation and chatbots are commodities; the shared bad-number counters are the only network effect and only matter at scale. (Monopoly, Product.)
5. **Too many products in one.** Five products in one pitch; it needs more than one sentence. (Product, Offers.)

### Conditions (checklist for the rest of the pack)
- [ ] Reposition to one sentence: COD order confirmation and delivery for Moroccan social sellers; demote site builder and Claude pages to supporting features. (all three) -> brand, marketing, offer
- [ ] Drop the 99 MAD cheapest-site tier; price on value recovered. (all three) -> pricing, cfo
- [ ] Put 5-20 real sellers through real orders, with a manual or semi-manual fallback (human-checked WhatsApp, one carrier) where APIs are not approved. (all three) -> launch
- [ ] Measure a real result: fewer failed deliveries or hours saved, before vs after. (all three) -> launch, cfo
- [ ] Get paid or written pre-commitments at the stated price before more building. (Offers) -> launch, pricing
- [ ] Make one seam fully real: order -> confirmation message -> delivery status. (Product) -> launch, ops
- [ ] Run the Claude pages mode with a real key and review output before selling credits. (Offers, Product) -> cfo, ops
- [ ] Prove the shared counters improve with each added seller using real data. (Monopoly) -> consumer, launch
- [ ] Register the company, start WhatsApp Business verification, settle the CNDP 09-08 position before billing or messaging real customers. (Offers, Monopoly) -> ops, launch
- [ ] Offer a guarantee, and consider charging per confirmed/delivered order instead of a flat fee. (Offers) -> offer, pricing
- [ ] Open questions that other skills must answer: market size in reachable sellers, who already sells COD automation in Morocco, cost to acquire 100 sellers, what a seller loses today per month. -> competitors, consumer, cfo, marketing

### Where the members disagreed
- **Weight of the site builder:** the Product lens treats it as a free extra to cut; the Offers lens would keep it only as support; the Monopoly lens asks whether a narrow paid COD-confirmation service should come first, before any shop builder.
- **Pricing shape:** Offers raised pricing per confirmed or delivered order and a doubled price for the COD stack; Monopoly and Product only say "do not compete on price" and let real sellers decide.
- **Score spread:** Monopoly scores lowest (4) because nothing yet defends the position; the other two give 5 because the problem and the demo are real.

### The strongest version of this business
The board sees a **cash-on-delivery automation service for Moroccan social sellers**, not an AI website builder: the seller posts, the order arrives confirmed by an AI agent in the customer's language (Darija, Arabic, French), failed deliveries are recovered, cash is tracked, and bad phone numbers are flagged across sellers. The generated storefront is the way orders enter, not the product being sold. It could even begin as a semi-manual, human-checked service for 5-10 sellers to prove the failure-rate drop before any approval-dependent integration is built. This differs from what was pitched (an all-in-one AI shop builder) and the board says so plainly.

## The competition

Research date 2026-10-19, public pages only. Almost all COD-failure figures and many competitor claims come from vendors selling a product (mainly eGrow's own blog and YouCan's service page), so they are marketing-influenced. No independent complaints or reviews were found, so **the complaint section below is thin and unverified.** USD to MAD is approximated at about 10 MAD per USD (an assumption, not a quote).

### 1. The table, most direct first

| Competitor | Type | What it sells | Price for the comparable thing | Positioning (their words) | Source |
|---|---|---|---|---|---|
| **eGrow** | Direct | COD confirmation on WhatsApp, carrier dispatch (60 carriers claimed), tracking, cash reconciliation, AI agent for WhatsApp/Instagram replies. Connects to existing stores; **no store builder**. Claims 200+ stores, 3.2M COD orders, confirmation "60% to 90%+" (self-reported). | from $59/month (about 590 MAD); setup $149 shown as free | "The COD management tool built for cash-on-delivery selling." | [egrow.com](https://www.egrow.com/en/cod-management-tool) |
| **YouCan Confirm** | Direct | Human agents phone customers before packing; upsell on the call. Only for sellers on YouCan. | not found | "The Order Confirmation Service that secures your Sales in Morocco" | [youcan.shop](https://youcan.shop/en/help/blog/confirm) |
| **Babliy** | Direct (newest) | AI sales agent on the shop's WhatsApp number in Darija, French and Arabic; catalog-aware; confirms orders; one inbox; human takeover. Launched June 2026 per Product Hunt. | not found (setup free) | AI sales agent on your WhatsApp number (paraphrased, not verified verbatim) | [hunted.space listing](https://hunted.space/product/babliy) |
| **YouCan** | Indirect | Moroccan store builder with COD. | $29/mo Solopreneur (1 user, up to 3.5K orders/mo), $49, $89, $187; COD fee 0.5% then 0.25% | "We're aligning our business model with your success" | [youcan.shop/en/pricing](https://youcan.shop/en/pricing) |
| **Storeino** | Indirect | Store builder aimed at COD markets. | $16.9 / $39 / $89 per month (undated, may be old) | n/a | [blog.storeino.com](https://blog.storeino.com/en/storeino-pricing-how-much-does-it-cost-to-create-your-online-store) |
| **Shopify** | Indirect | General store builder plus COD apps. | Basic $32/month on the UAE page (secondary source; Morocco not verified) | n/a | [dzbuild.com](https://dzbuild.com/blog/shopify-cost-algeria-2026) |
| **WooCommerce** | Indirect | Self-hosted; 61.6% of Moroccan stores in a 2026 ranking. | software free, hosting extra | n/a | [wmtips.com](https://www.wmtips.com/technologies/e-commerce/country/ma) |
| Freelancer stores and n8n/AI bots | Substitute | One-off store builds ($10 to $50 in the listings seen); custom WhatsApp confirmation bots in Darija. | $10 to $50 one-off (store); bot price not stated | n/a | [Khamsat](https://khamsat.com/programming/ecommerce-development-services/1659821), [Fiverr](https://www.fiverr.com/amkaitir/do-qa-testing-for-your-website-and-app) |
| Doing it by hand | Substitute | The seller replies, phones and chases carriers. | free, costs hours | n/a | n/a |

### 2. Price range for the comparable thing (monthly software)
Only prices with a source: Storeino $16.9 (about 170 MAD), YouCan $29 (about 290 MAD), Shopify $32 (about 320 MAD), eGrow from $59 (about 590 MAD). Lowest about 170 MAD, median about 305 MAD, highest about 590 MAD. **Cendoor Solo at 149 MAD is below the cheapest store builder; Growth at 299 MAD matches a basic builder and is about half of eGrow's entry price.** Confirmation-only competitors (YouCan Confirm, Babliy) have no public price in what I found.

### 3. Positioning map (text)
Axes: **what it does** (build a store -> automate COD operations) and **who does the work** (human agents -> AI).
- Store builders: YouCan, Storeino, Shopify, WooCommerce (build, little confirmation; YouCan adds a human service).
- COD operations, mostly automated: **eGrow** (heavy on carriers and reconciliation, for owners who already have a store).
- Human confirmation: YouCan Confirm.
- AI chat on WhatsApp: **Babliy** (new, Darija; no builder or carriers seen).
- **Cendoor sits across all of them:** builder + AI chat + confirmation + tracking + campaigns for the Instagram/TikTok seller. That breadth is its claim and, per the board, its focus problem.

### 4. What their customers complain about (thin)
No independent reviews with complaints were found. eGrow's Shopify listing shows 4 positive reviews ([source](https://apps.shopify.com/egrow-1/reviews)); the Trustpilot rating on eGrow's own page could not be verified. **So there is no evidence-based complaint list yet; it must come from interviewing sellers.** What vendors say sellers suffer from (vendor-sourced, not competitor complaints): customers who stop answering after ordering, wrong contact details, refusals without explanation, changed minds, fake orders, ordering from several sellers and keeping one ([YouCan](https://youcan.shop/en/help/blog/confirm), [eGrow](https://www.egrow.com/en/blog/cod-ecommerce-morocco-complete-guide-2026)). Failure-rate claims range from 20-40% (eGrow) to "over 50% in some cases" (YouCan); none is independent.

### 5. The gap
- **There is real direct competition in COD confirmation.** eGrow is established (200+ stores claimed, 60 carriers claimed), YouCan sells confirmation to its own users, and Babliy launched in June 2026 with Darija AI on WhatsApp. The board's "nothing special" worry is justified: a Darija chatbot is **not** a gap.
- **What the evidence suggests nobody sells together:** none of eGrow, YouCan Confirm or Babliy was seen to **generate the shop itself from a chat** for a seller who only has an Instagram/TikTok account. eGrow says it connects to existing stores and lists no builder; Babliy sits on WhatsApp. Cendoor's open lane is the **seller with no real store yet**, who sells by DM. This is an inference from the pages read, not a verified fact, and needs seller interviews.
- **Price lane:** 149 MAD is under every priced competitor; eGrow starts about four times higher. The risk: sellers who need confirmation pay for eGrow's carrier depth, and sellers who only need a link use free tools.
- **Still unknown:** whether Instagram-DM sellers really use eGrow or Babliy today, the prices of Babliy and YouCan Confirm, and whether any of them already offer a site builder. Each would change this verdict.

### 6. The threat
**Babliy or eGrow could add a storefront generator fastest** (eGrow already connects to stores; Babliy already speaks Darija). **YouCan** could bundle AI confirmation into its builder for its existing base. Cendoor's shared counters only help at scale. The fastest defence is a narrow, proven result for one seller type, which is what the board asked for.

## The buyer panel

**5 buy · 15 pass** (25% buy) out of 20 simulated buyers. Seed 7, so the same cards can be dealt again.

These are simulated buyers, not customers. Use this to find objections and weak spots, then confirm the big ones with real people before you spend.

### By segment

| group | buyers | buy rate |
| --- | ---: | ---: |
| Small shop with 2 to 5 staff | 5 | 40%  (thin) |
| Full-time solo seller | 8 | 25% |
| Side-hustle seller (part-time, still has a job or studies) | 7 | 14%  (thin) |

### By buying behaviour

| group | buyers | buy rate |
| --- | ---: | ---: |
| Hates failed deliveries | 2 | 50%  (thin) |
| Growth minded | 2 | 50%  (thin) |
| Phones to confirm orders | 3 | 33%  (thin) |
| Price sensitive | 4 | 25%  (thin) |
| Answers every DM by hand | 5 | 20%  (thin) |
| Suspicious of automation | 2 | 0%  (thin) |
| Already pays for a tool | 2 | 0%  (thin) |

### By income

| group | buyers | buy rate |
| --- | ---: | ---: |
| $109,000 and up | 7 | 43%  (thin) |
| under $58,000 | 6 | 17%  (thin) |
| $58,000 to $109,000 | 7 | 14%  (thin) |

### Why they pass

| reason | buyers | in their words |
| --- | ---: | --- |
| trust | 8 | "I do not know this company and it would talk to my customers on my own WhatsApp. I already call people to confirm orders, it is slow but it is mine, and I do not give that to a stranger." (P001) · "I do not know this company and I am not giving a new unknown outfit access to my WhatsApp, my customers and my cash on delivery orders. If a bot says something wrong to a client in my name, it is my reputation, not theirs." (P003) |
| price | 4 | "I only sell a few orders a week and I answer every DM myself, so 99 or 149 MAD a month is real money for me. I might look at the 4 MAD per order option, but I would not commit to a monthly fee for something I have never seen work in Darija with my customers." (P005) · "149 MAD a month is a lot when I only sell a few orders, and even 99 is a subscription I'd have to cover before I know it brings me anything. I already take orders in my DMs and WhatsApp for free." (P010) |
| habit | 3 | "I already have my store on a tool like YouCan and my staff already call and confirm orders. I am not going to move my shop and my customers' WhatsApp to a new AI I have never seen work." (P013) · "I already answer every DM myself on WhatsApp and Instagram, that's how my customers know me. I don't see why I'd put a bot between me and them for a side hustle." (P016) |

### Why they buy

| reason | buyers | in their words |
| --- | ---: | --- |
| need | 3 | "Customers who order and then go silent cost me real money, so order confirmation before shipping is the one part I care about. With no card, a free trial and a refund, I would try it, probably on the 4 MAD per order plan first." (P002) · "I lose orders every day because I answer DMs late, and 99 MAD is less than one or two lost orders. The 14-day approval, free trial with no card and refund mean I can test it without real risk." (P007) |
| price | 1 | "Only because of the 4 MAD per confirmed order option with no monthly fee and no card for the trial. I would never take 99 or 149 a month, but paying per order I only pay when I actually sell." (P008) |
| trust | 1 | "Calling every customer to confirm eats my evenings, and the 14 days where nothing goes out without my tap plus the refund means I can test it with almost no risk. I would probably start on the 4 MAD per order option or the 14-day trial before paying 99." (P009) |

### What would flip a no

- A seller I know personally, in my own line of work, showing me it really confirmed his orders for a month, or a founder I can call and talk to before I give any access.
- Seeing two or three real Moroccan sellers I can message and verify, who have used it for months, plus a trial where nothing is ever sent without my tap.
- A seller I know and trust, who sells like me, showing me their real confirmed orders and cash collected with Cendoor for a few months, plus a real person in Morocco I can call.
- Only the pay-per-order option with no monthly fee, and a quick demo showing it chasing a customer who stopped answering after ordering, in real Darija.
- A seller I know, selling the same kind of thing, showing me her real confirmed orders after a few weeks, with the per-order 4 MAD option and no monthly fee.
- Only the 4 MAD per confirmed order with no monthly fee, and a first month where I clearly see it confirms real orders before I pay anything.
- Seeing a seller I already know and trust use it for a few months and show me real orders, plus a way to try it on a few chats first without handing over my whole WhatsApp.
- A pay-per-order-only plan with no monthly fee that works alongside my current tool, plus a demo showing it confirming real Darija COD orders correctly.
- Proof from sellers like me that it cuts refused and fake COD orders, working on top of my existing YouCan store with no migration, and only the 4 MAD per confirmed order option.
- Seeing 2-3 Moroccan sellers like me showing real Darija conversations and real confirmed orders, plus pay-per-order only with the bot never sending anything without my tap.
- Seeing it handle real Darija conversations from a seller I know personally, with no wrong confirmations, and a permanent option to approve every message before it is sent.
- Seeing another seller like me, with real orders, showing it working on their own WhatsApp, with the pay-only-4-MAD-per-confirmed-order option so I risk nothing.

Buyers say they would buy **1.0 times** in the first month on average.

20 buyers gave all four price answers. Run founder-pricing's van_westendorp.py on the answers folder.

## Pricing

All prices MAD per month. The curve tool printed "$" but the answers were in MAD. **These are 20 simulated sellers: use this to choose what to test with real sellers, not as proof.**

### 1. The price

**Recommendation: do not decide the final price yet. Test 99 and 149 MAD for Solo with real sellers, and launch with a founding-member price of 99 MAD.** Reasons:

- **Acceptable range from the panel: 40 to 199 MAD** (cheap-side limit 40, least resistance 40, indifference 90, expensive-side limit 199). 149 is inside it but **above the indifference price of about 90**.
- **At 149, 6 of 20 sellers call it "too expensive" and 10 of 20 call it "expensive or worse".** At 99, none call it too expensive and 6 of 20 call it expensive. (Counted from `founder/panel-v1/answers`.)
- **Price is not the main blocker.** Of 18 sellers who pass: 8 say trust, 5 say habit (they already have a way of working), 5 say price. A cheaper plan alone does not fix trust. Only 2 of 20 buy at 149 (10%, an upper bound), below the 25% bar `founder-plan` uses.
- **Against competitors** ([competitors.md](competitors.md)): 149 MAD is under every priced competitor (Storeino about 170, YouCan about 290, Shopify about 320, eGrow from about 590 MAD). Price is not what separates Cendoor from them. Proof is.
- **The margin at each price** (from the CFO tool, same ramp, same costs): 99 MAD gives break-even at 39 paying sellers, a 47% margin at 100 sellers and a **year 1 loss** (-11,887). 149 gives break-even at 24, 65%, year 1 profit +3,494. 199 gives break-even at 17, 74%, year 1 profit +18,783. If a lower price does not raise the number of paying sellers by well over half, 99 loses money in year 1 (with 50% more sellers it is still -228). The panel cannot tell us whether it would.

**Second run (the Founding 50 offer, `panel/`):** acceptable range **30 to 150 MAD**, least resistance 30, indifference about **80 MAD**, medians: too cheap 25, bargain 60, getting expensive 149, too expensive 250. The first run above (`panel-v1/`, plain 149 MAD pitch) gave 40 to 199 and 90. The curve moved down a little once the offer included a refund, approve mode and a per-order option, which fits the panel's repeated ask for pay-per-order. The tables and counts in this file come from the first run unless marked.

### 2. The ladder
| rung | price | for | reason to step up |
| --- | --- | --- | --- |
| Trial | 14 days free, no card | everyone | see it confirm real orders |
| Solo | 99 founding / 149 standard | one seller | the core: confirmation, replies, tracking, storefront |
| Growth | 299 | small shop with staff | team access, credits for bespoke pages, campaigns |
| Per confirmed order (to test) | e.g. 3 to 5 MAD per confirmed order, no monthly fee | small and uncertain sellers | pay only when it works |

**Pay-per-confirmed-order is the most repeated flip in the panel** (a free plan, pay-per-order or a much cheaper plan: roughly 10 of the 18 who passed mention one of these in what would change their mind; counted by keyword, so approximate). It also matches the board's Offers lens (charge by result). It is a hypothesis: model it with the CFO tool before offering it, and it needs real confirmation data to price.

### 3. The opening offer
**Founding sellers: the first 50 sellers lock 99 MAD/month for 12 months, closing 2026-12-31 or at 50 sellers, whichever comes first, and keep the 14-day free trial.** The 12-month lock is a real commitment the company can keep, not a "was 149" anchor. After 12 months it moves to the standard price with 30 days notice. Do not discount it again, or buyers learn to wait.

### 4. What to test with real buyers (the next two weeks)
1. **Two landing pages**, one at 99 and one at 149, each with a "start free trial" or "reserve my place" button. Count sign-ups per page. About 50 visits each from the same sellers' groups is enough to see a big gap, not a small one.
2. **Five real sellers, interviewed and shown the 99/149/per-order options.** Ask which one they would sign and what stops them.
3. **A pre-sale or pilot letter**: ask 10 sellers for a written commitment to pay 99 MAD after the trial if it works. The board asked for paid or written pre-commitments.

### 5. The panel's price objections, verbatim (top three)
- "149 MAD a month is a lot when I only sell a few orders, and I already answer every DM myself." (P005)
- "149 MAD a month is too much when I only sell a few orders, and I avoid monthly subscriptions. I already take orders on WhatsApp for free..." (P008)
- "I would not move them to a link and pay 149 MAD a month on a promise, especially for a thing I have not seen work with real Moroccan buyers." (P002)

These are simulated. They are research, never testimonials.

### 6. Open items
- `founder/numbers.json` was **not** changed: the price stays 149 until real sellers choose. If 99 wins, update the price to 3.30 per seller-day and re-run `/founder-cfo`.
- The **margin on a per-order plan is unmodeled**: needs average confirmed orders per seller.
- The panel's side-hustle sellers (7 of 20, 0 buyers) show the lowest willingness. The price for them is a separate question from the price for full-time and small-shop sellers.

## The offer

Method: the Offers lens in `founder-board/lenses.md` (a summary of a published framework, not anyone's words). Raw material: the panel's objections ([panel-v1/results.md](panel-v1/results.md)), the board's conditions ([board.md](board.md)) and the CFO numbers ([cfo.md](cfo.md)).

### 1. The problem list (in the seller's words, ranked by how often the panel raised it)
Before buying:
1. "I do not trust a new company with my customers and my money" (trust, 8 of 18 who passed).
2. "A bot could say something wrong to my customer in my name and I lose the sale."
3. "I have not seen it work with real Moroccan sellers."
4. "149 MAD a month while I only sell a few orders" (price, 5).
5. "I already take orders in DMs and WhatsApp, and I already have a store or a tool" (habit, 5).
6. "Will it understand Darija, including voice notes?"
7. "Do I need a company or a Meta business account?"
During:
8. "I have to set it up myself."
9. "What if it confirms an order wrongly?"
10. "I cannot fix its mistakes quickly."
After:
11. "Customers still refuse the parcel or ghost me."
12. "If I stop, do I lose my customers' data?"

### 2. Solutions, scored (value to buyer 1-5, cost to deliver 1-5)
| # | solution | value | cost | keep? |
|---|---|---:|---:|---|
| 1,2,9 | **Approve-before-send mode**: for the first 14 days every message to a customer waits for the seller's tap; the seller switches to automatic when ready. (Built: inbox with takeover; the draft-and-approve mode needs building.) | 5 | 2 | yes, core |
| 3 | **Done-with-you setup** by the founder for the first 50 sellers, on the seller's own WhatsApp: loading products, testing orders together. | 4 | 4 (founder time, unpriced) | yes, limited to 50 |
| 4 | **Founding price**: 99 MAD locked for 12 months (the first 50). Optional per-confirmed-order plan, no monthly fee (to be tested). | 5 | 3 | yes |
| 3,11 | **Guarantee**: if in the first 30 days Cendoor does not confirm a single real order, or the seller is not satisfied, the month is refunded. | 5 | 2 | yes |
| 6 | **Darija check**: the seller can read every conversation and correct the AI; wrong answers feed a fix list. | 4 | 2 | yes |
| 5 | **Keep your channels**: nothing changes for customers; the seller keeps WhatsApp and Instagram and just puts a link in the bio. | 4 | 1 | yes, wording |
| 8 | Ready-made storefront in 10 minutes from a chat (built). | 3 | 1 | keep as supporting |
| 12 | **Export your customers any time** (CSV). Not built; small to build. | 3 | 1 | keep, build |
| 7 | "No company or Meta account needed to start": **cannot promise yet**; WhatsApp sending needs approval (see limits). | | | dropped from the pitch |
| 11 | Shared bad-number counters | 4 | 1 | **not promised**: needs many sellers; mentioned only as "coming" |

### 3. The stack
- **The core (described by the outcome):** "Orders confirmed for you, in your customer's language, before you ship."
- **Bonuses (each kills one objection):** (1) Approve-before-send for 14 days (kills "it will say something wrong"); (2) We set it up with you (kills "I have to figure it out"); (3) Export your customers any time (kills "who owns my data").
- **The guarantee:** first 30 days, full refund of the month if it confirms no real order or you are not satisfied. **Cost at a 30% claim rate:** 0.3 × 99 MAD ≈ 30 MAD per new seller, about 1,800 MAD for 60 sellers in year 1 (the ramp in numbers.json), against 45,774 MAD of year 1 revenue. Affordable.
- **Urgency (true):** the first 50 founding sellers lock 99 MAD for 12 months; closes 2026-12-31 or at 50 sellers.
- **The name:** **"Cendoor Founding 50."**

### 4. Value equation, before and after (1-10, simulated judgement, not measured)
| element | now | after | which part moves it |
|---|---:|---:|---|
| Dream outcome (orders arrive confirmed, no phone calls) | 7 | 7 | unchanged: the promise was already clear |
| Perceived likelihood | 3 | 6 | approve-before-send, setup with the founder, guarantee |
| Time to the result | 5 | 7 | done-with-you setup, ready storefront |
| Effort and sacrifice | 4 | 7 | seller keeps channels; approve mode lowers risk; no monthly lock-in via guarantee |
The biggest honest gap is still **likelihood**: until real sellers show real results, the panel's "I have not seen it work" is true.

### 5. Re-test
The new pitch is in `pitch.md` (old one saved as `pitch-v1.md`). Result of the 20-buyer re-run with the same seed: see the bottom of this file after the run.

### 6. Limits
- Approve-before-send and customer export are not built yet; the pitch describes them as part of the offer, so build them before showing the offer to real sellers.
- Real WhatsApp sending needs Meta approval; until then "approve and send" means the seller taps a prepared WhatsApp link (as in the current campaign queue). Say so to the seller.
- Done-with-you setup is the founder's time for 50 sellers (roughly 25 hours at 30 minutes each; estimate), not counted in the CFO numbers.
- Follow Moroccan consumer-protection and advertising rules for guarantees; not legal advice.

### 7. Re-test result (20 simulated sellers, same seed 7, new offer)
| | before (pitch-v1) | after (Founding 50 offer) |
|---|---:|---:|
| Would buy | 2 of 20 (10%) | **5 of 20 (25%)** |
| Full-time solo sellers | 12% | 25% |
| Small shops (2-5 staff) | 20% | 40% (thin) |
| Side-hustle sellers | 0% | 14% (thin) |
| Passed because of trust | 8 | 8 (unchanged) |
| Passed because of price | 5 | 4 |
| Passed because of habit | 5 | 3 |

- **Three buyers flipped to yes** (P002, P008, P020). P002 said approve-before-send, the free trial with no card and the refund made it risk-free. **P008 only buys on the 4 MAD per confirmed order plan** and would never take a monthly fee. P020 said a demo on her own real WhatsApp chats would do it.
- **Trust did not move:** the same 8 sellers still pass because they do not know the company and will not let a bot speak in their name. No wording fixes that. What they ask for: **a real seller they know using it for months, a real person in Morocco they can call, and a permanent approve-every-message option.**
- **Read it carefully:** 25% is exactly the plan bar, simulated buyers lean agreeable (an upper bound), and the gain came partly from an option, **per-order pricing, that is not in the CFO model yet**, and from features (approve-before-send, export) that are not built.
- New condition from this re-test: show a real person and real early results (see `launch.md`), and keep an **always-approve** setting available after the first 14 days.

## The numbers

### The CFO's note (read this first)

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

### One seller-day

| line | per seller-day |
| --- | ---: |
| Price | $4.97 |
| WhatsApp messages (about 12 MAD per seller-month, estimate) | -$0.40 |
| Claude API / AI credits (about 5 MAD per seller-month, estimate) | -$0.17 |
| Payment processing (about 2.5% of 149 MAD, estimate) | -$0.12 |
| Storage and bandwidth per seller (estimate) | -$0.07 |
| **Contribution** (what each seller-day leaves to pay the fixed costs) | **$4.21** (85%) |

### The margin that matters

Fixed costs: $2,940 a month (Hosting with headroom (Render Starter + disk is about 95 MAD; 150 budgeted) $150, Domain, email, tools (estimate) $100, Accountant and data-protection (CNDP) reserve (estimate) $400, WhatsApp provider platform fee (one provider lists about 290 MAD/month for its entry plan; vendor source, unverified) $290, Marketing: ads and creators (estimate) $2,000).

- **Break-even: 24 seller-days a day.** Below that you lose money every month.
- **Profit margin at your plan** (100 a day): **65%** of every sale, after every cost.

### Year 1, month by month

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

### What if

| scenario | margin at plan | break-even a day | year 1 profit |
| --- | ---: | ---: | ---: |
| Base plan | 65% | 24 | $3,494 |
| Price -10% | 61% | 27 | -$1,083 |
| Volume -20% | 60% | 24 | -$4,261 |
| Unit costs +15% | 63% | 24 | $2,444 |

### Red flags

- The startup spend is not earned back within year 1.

## Marketing

Evidence used: [panel-v1/results.md](panel-v1/results.md) and [panel/results.md](panel/results.md) (simulated sellers, upper-bound), [competitors.md](competitors.md), [offer.md](offer.md), [pricing.md](pricing.md), [cfo.md](cfo.md). **Launch day is assumed to be Monday 2026-11-30** (no date was given; change it and shift the calendar). Darija lines are drafts: **have a native speaker check every one before posting.**

### 1. Who to reach first (from the panel)
The re-test buy rates: small shops with 2 to 5 staff 40%, full-time solo sellers 25%, side-hustle sellers 14% (thin samples). By behaviour: sellers who **hate failed deliveries** (50%), **growth minded** (50%) and **phone every customer to confirm** (33%) buy most. **Start with full-time solo sellers and small shops who phone customers to confirm orders.** Side-hustle sellers, sellers who already pay for a tool (0 buyers) and sellers who answer every DM themselves out of pride come later.

### 2. Positioning (three versions, one recommended)
Template: for <segment>, who <problem>, <business> is the <category> that <gap>, unlike <alternative>.

1. **(Recommended)** For Moroccan sellers who sell on Instagram and WhatsApp and lose money on orders that go silent or get refused, Cendoor is the **order-confirmation assistant** that confirms each order with your customer in Darija before you ship and builds your store link from a chat, unlike eGrow and store builders that need an existing store and a team. *Evidence:* the panel's strongest need is "customers who order and then go silent"; the competitor scan found no tool that builds the store and confirms orders for a seller who only has Instagram. This is the board's focus: confirmation first, store second.
2. For sellers who spend evenings phoning customers: Cendoor does the confirming and you keep control by tapping to approve. *Evidence:* 5 of 18 first-run passers asked to approve every message.
3. For small shops that want one price for everything: your link, your replies, your confirmations for 99 MAD, not 590. *Evidence:* price-only positioning invites comparison with free tools; use sparingly.

### 3. Channels (pick two or three, say what is skipped)
| channel | why it fits | rough cost | how you will know |
|---|---|---|---|
| **Direct messages to sellers on Instagram and TikTok** (the founder finds shops that post orders in DMs and writes to them personally) | Sellers are public and answer DMs; the panel wants a person they can talk to | founder time | replies, trials started |
| **Facebook groups and WhatsApp communities where Moroccan online sellers ask for tools** (to be found by search; I have not verified any group) | Sellers ask "who confirms my COD orders?" there | free (follow each group's rules; no spam) | trials from the group link |
| **Short videos in Darija on Instagram Reels/TikTok**: "the order that goes silent" stories, a 30-second demo of the confirmation | Same place the buyers already spend time | phone, founder time | video views to link clicks to trials |
| Local creators who teach selling online (paid, disclosed) | Trust comes from people sellers already follow | to be quoted; budget below | trials per creator code |
| **Not doing now:** paid ads, SEO, email, any cold mass messaging, buying lists | Trust is the blocker, ads do not fix it; cold messages break WhatsApp rules and Moroccan data law | | |

### 4. The 30-day calendar (launch minus 14 days to launch plus 16)
Offer in all posts: **Cendoor Founding 50**: 99 MAD a month locked 12 months, 14-day free trial, refund if no real order confirmed in 30 days, closes 2026-12-31 or at 50 sellers. Do not post it before the approve-before-send mode, the export button and a working confirmation exist.

| date | channel | what goes out |
|---|---|---|
| Mon 2026-11-16 | DMs | Message 10 sellers a day, written one by one (see hook 1). Goal: 5 interviews and 3 pilot sellers. |
| Tue 11-17 | Reels | Story video: "A customer ordered, then went silent. Here is what it costs." No product yet, hook 2. |
| Wed 11-18 | Groups | One honest question: how do you confirm COD orders today? (no pitch). Collect answers. |
| Thu 11-19 | DMs | Follow up with sellers who replied. |
| Fri 11-20 | Reels | Behind the scenes: the founder building it. |
| Sat 11-21 | DMs | Offer pilot places to 3 sellers (free for 30 days, in exchange for honest feedback and permission to quote real results). |
| Sun 11-22 | none | Review answers, adjust hooks. |
| Mon 11-23 | Reels | Hook 3 (the evening spent phoning). |
| Tue 11-24 | DMs | 10 more sellers. |
| Wed 11-25 | Groups | Share what you learned from the answers (numbers only, no names). |
| Thu 11-26 | Reels | Demo of approve-before-send, hook 4. |
| Fri 11-27 | Reels | Pilot seller story **only if a real pilot seller agrees**. |
| Sat 11-28 | DMs | Final pilot check. |
| Sun 11-29 | none | Prepare launch assets, test the trial signup on a phone. |
| **Mon 11-30 LAUNCH** | Reels, groups, DMs | "Cendoor Founding 50 is open." Post hook 5 and the offer page link. Reply to everyone the same day. |
| Tue 12-01 | DMs | Message the 20 sellers who showed interest. |
| Wed 12-02 | Reels | Hook 6 (price vs competitors, factual). |
| Thu 12-03 | Groups | Answer questions publicly. |
| Fri 12-04 | Reels | How an order is confirmed, step by step. |
| Sat 12-05 | DMs | Ask first trials for feedback. |
| Sun 12-06 | none | Review numbers. |
| Mon 12-07 | Reels | Hook 7 (Darija understanding, with an honest "we still miss some words"). |
| Tue 12-08 | Creators | Contact two creators with a disclosed trial offer. |
| Wed 12-09 | Groups | Counter: how many places are left (true number only). |
| Thu 12-10 | Reels | Hook 8. |
| Fri 12-11 | Reels | Real numbers from the first trials, **only real ones**. |
| Sat 12-12 | DMs | Ask satisfied trials for an introduction to a seller they know. |
| Sun 12-13 | none | Review. |
| Mon 12-14 | Reels | Hook 9. |
| Tue 12-15 | Groups | Hook 10. |
| Wed 12-16 | all | Report: what worked, what did not, new targets. |

**When there is nothing new:** show how the founder tests with a real seller, answer a seller's question on camera, or share a lesson from a failed confirmation.

### 5. Ten hooks (each answers a panel objection or reason)
Darija is a **draft to be checked**.
1. (DM, trust) "Salam, I am [name], I am building a tool to confirm COD orders. Can I ask how you confirm yours today? No pitch." *Darija draft:* "Salam, ana [smiya], kandir tool kaconfirmi les commandes COD. Wach t9der tjaweb-ni kifach kat-confirmi nta? Bla pitch."
2. (Reel opening, need) "A customer orders, then never answers. You already packed it. Who pays?" *Darija draft:* "Zbouna tlab, mn b3d ma kayjawbch. Nta 9ad-diti l-colis. Chkoun ka-ykhles?"
3. (need) "How many evenings did you spend phoning customers to confirm?" 
4. (trust, approve-before-send) "Nothing goes out to your customer without your tap, for 14 days." 
5. (offer) "Cendoor Founding 50: 99 MAD a month for 12 months, refund if no order is confirmed in 30 days."
6. (price) "Store builders 290 to 320 MAD, eGrow from 590 MAD (their public price pages). Cendoor founding: 99." Facts must be re-checked on launch day.
7. (Darija) "Does it understand Darija? Test it with your own messages in the trial."
8. (habit) "Keep your Instagram and WhatsApp. Only add one link to your bio."
9. (price, per order) "Sell little? Pay 4 MAD only for each confirmed order." **Only if the per-order plan exists.**
10. (trust) "You can call me. I am a real person in Morocco." **Only if true and the founder agrees to be named and reachable.**

### 6. Budget and the numbers to watch
- **Budget:** the CFO plans **2,000 MAD a month** on marketing (an estimate, not a budget the founder set). Suggested split: 1,000 for creators (disclosed paid trials), 500 for video tools and small boosts for the best reel, 500 reserve. The rest is the founder's own time.
- **The most you can pay to win a seller:** contribution is about **126 MAD a month at 149 MAD** and **about 76 MAD a month at 99 MAD** ([cfo.md](cfo.md) variable costs 23 MAD). If you want the seller to pay back within 3 months: **3 x 126 = 378 MAD at 149, 3 x 76 = 228 MAD at 99.** With 2,000 MAD a month that buys about 9 sellers a month at 228 MAD each, enough for the plan ramp's first months (3 to 6 new a month) but not for 150 sellers.
- **Three numbers to watch each week and the level that says change something:**
  1. Replies per 10 DMs sent. Below 2 of 10: change the message.
  2. Free trials started per 100 link clicks. Below 5: change the page or the offer.
  3. Trials that confirm at least one real order in 7 days. Below half: fix the product before spending more.

### 7. Rules followed
No fake reviews, follower counts, testimonials, before/afters or "as seen on". Panel quotes are research only and are never used in ads. Disclose paid creators. No messages to people who have not been contacted lawfully (Law 09-08, see `ops.md`). Not legal advice.

## Brand

Reads `idea.md`, [marketing.md](marketing.md) (positioning: the order-confirmation assistant), [competitors.md](competitors.md) and the panel's reasons ([panel/results.md](panel/results.md)). The panel's biggest blocker is **trust** (8 of 15 who passed), so the brand has to feel like a **reliable, accountable person**, not a futuristic bot. The built landing page leans "futuristic"; that is fine for attracting attention, but the voice and promise below should lead with reliability.

### 1. The name (already chosen: Cendoor, cendoor.com)
The founder chose it and reports the .com is available (not checked by me; I have no registrar access). I did not generate other names. **Checks to finish yourself before spending on branding:**
- **Trademark (Morocco):** search the OMPIC trademark register ([ompic.ma](https://www.ompic.ma), check the current search page) for "Cendoor" and close spellings in classes **9** (software), **35** (advertising, online business services), **42** (software as a service), **38** (messaging). If you expand, repeat at EUIPO, USPTO, UKIPO. A trademark lawyer confirms; nothing is registered until you register it.
- **Domain:** confirm cendoor.com is registered in your name (not just "available"), and check **cendoor.ma**, a typo domain and the main social handles.
- **Handles:** Instagram, TikTok, Facebook, YouTube, X: reserve "cendoor" or the closest consistent handle everywhere.
- **Confusion:** none of eGrow, YouCan, Storeino, Babliy, Shopify or WooCommerce is close in sound or spelling. "Cendoor" reads like "sender" or "send door"; say it aloud in Darija and French with three sellers and check how they pronounce and spell it (a typo risk is "Sendoor").
- **Wordmark only, no icon** (founder's decision).

### 2. The promise, tagline and voice
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

### 3. The look, as a brief
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

### 4. Rules followed
No competitor's name, logo, colours or tagline copied. No font, image or icon without a licence. Not legal advice on trademarks.

## Operations

How the business runs on day one, week one and month one. Reads `idea.md`, [offer.md](offer.md), [numbers.json](numbers.json), [brand.md](brand.md). Cendoor is software sold by subscription, so "operations" means: onboarding sellers, keeping the service running, handling mistakes and staying legal. Sources are public pages; where only a quote can answer, it is listed as an open question. **Not legal advice: confirm every item below with the authority or a professional.**

### 1. The daily cycle (what must happen every day)
Mark (C) where a seller or customer sees it.
1. Check the service is up and the queue is moving (health page, errors, failed messages).
2. Read the "needs attention" list: conversations the AI flagged (voice notes, unclear Darija, wrong confirmations) (C).
3. Answer new seller messages and trial questions within hours (C).
4. Onboard today's new sellers: set up the shop, import products, run a test order, switch on approve-before-send (C).
5. Review one day of real confirmations for wrong or rude messages, fix rules, note Darija words the AI missed.
6. Backup check (data copy ran) and cost check (WhatsApp and AI usage per seller).
7. Weekly: invoice/refund review, the three marketing numbers, a review with each pilot seller.

### 2. "Suppliers" (the services Cendoor depends on)
| need | candidates with public prices | status |
|---|---|---|
| Hosting | **Render**: Starter web service $7/month, persistent disk $0.25/GB/month ([Render pricing](https://render.com/pricing.md)); the free tier sleeps and cannot hold real data. Alternatives not researched. | Real customers need the paid instance plus a disk mounted at `/data`. |
| WhatsApp access | A WhatsApp Business solution provider or Meta's own Cloud API. One provider's (vendor-written) blog lists ChatDaddy about 290 / 790 / 1,990 MAD per month, WATI about $49, AiSensy about $20, Respond.io about $79, 360dialog API-only ([source](https://chatdaddy.tech/blog/whatsapp-business-api-morocco)). Per-conversation fees in the same article: utility about 0.03 to 0.05 MAD, marketing about 0.10 to 0.15 MAD (approximate). Meta says Morocco's rates are changing ([Meta pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)). | **Open: get quotes from two providers.** |
| AI model | Anthropic API (the code already supports it); third-party listings show $2-3 input and $10-15 output per million tokens (unconfirmed). | Needs the founder's own API key and a monthly cap. |
| Payments | A Moroccan card processor or bank transfer; none chosen. | **Open.** |
| Carriers | Not a Cendoor supplier today (tracking is simulated); sellers use their own. | Real integration needs carrier API access. |
| Domain and email | cendoor.com (the founder says it is available), a business email. | To register. |

**Open question that can break the plan:** does each seller need **their own** WhatsApp Business account and verification (RC extract, CNSS or auto-entrepreneur documents, per the provider's article), or can Cendoor act as a provider for all sellers? This decides cost per seller, the onboarding effort and the approval time (the article claims 24 to 72 hours for Meta verification of Moroccan entities, a vendor claim). **Resolve this before promising "done in a day" to any seller.** Until it is solved, the honest fallback is the prepared-message flow (the seller taps to send from their own phone), which the app already has.

### 3. People
- **Founder:** product, onboarding, support, sales (all of it). Not paid in the CFO numbers.
- **Weeks 1-4 (pilot, up to 10 sellers):** the founder alone, about 2 hours of onboarding per seller plus 1 hour a day of review. Hours are an estimate.
- **From about 20 paying sellers:** a part-time support person, ideally a native Darija speaker, to check Darija conversations and answer sellers (hours and wage to be decided; use a public source for local minimum wage and have an accountant check payroll costs). Not in the CFO numbers.
- A Darija-speaking reviewer is needed from day one for the Darija drafts in `marketing.md` and for checking the AI's replies.

### 4. Routines (one page each, to write out for a new helper)
1. **Onboard a seller (target 30 to 45 minutes):** sign the pilot note (consent to review conversations for support); add shop name and products; connect the seller's WhatsApp number or set up the prepared-message flow; place 3 test orders in Darija, French and Arabic; switch on approve-before-send; show the seller how to read and take over a chat; write down the seller's first-week goal.
2. **Core service: a confirmation:** the order arrives; the AI sends the confirm message in the customer's language; it waits for the seller's tap while in approve mode; on YES it marks confirmed; on NO or silence for the set time it flags the order for the seller's own call; customers who write STOP are never contacted again.
3. **Handle a complaint (target: answer within hours):** acknowledge, say what happened, switch the feature off for that shop if needed, fix, tell the seller what changed (draft in `brand.md`).
4. **Close the day:** read the day's flagged items, record wrong confirmations, send each seller a two-line summary (orders confirmed, orders needing a call).
5. **Weekly reorder-equivalent:** review costs per seller (messages, AI usage) against the 23 MAD estimate in the CFO model and adjust.

### 5. Tools (smallest stack)
- The Cendoor app itself (inbox, takeover, campaigns, export), Render for hosting, a bookkeeping tool or accountant, a shared spreadsheet for the pilot sellers' results (orders confirmed, refused, hours saved, before vs after), a status page. Prices not researched beyond the table above.

### 6. Licences, permits and legal (checklist, each to confirm)
| item | what the sources say | where to confirm |
|---|---|---|
| **Business status and registration** | Options include **auto-entrepreneur** (a simplified status) or a company. Most guides list an annual revenue cap of **200,000 MAD for services** and a flat **1% rate** for services, but guides **contradict each other** (two say 500,000 for services, one says 2,000,000 for commerce). Not verified in law: check Law 114-13 article 4 and the CGI, or the DGI. | The tax authority (DGI), the National Register for auto-entrepreneurs (find the official page), an accountant. A company (SARL) has other costs not researched. |
| **Personal data (Law 09-08, CNDP)** | The CNDP's own page says commercial messaging is lawful only with the recipient's **prior consent** and a **declaration of the processing to the CNDP before it starts** ([CNDP, "Prospection"](https://www.cndp.ma/wp-content/uploads/2025/07/fiche_CNDP_Prospection_RT_fr.pdf)); article 10 forbids prospecting without consent, article 9 gives a right to object. The page mentions an exception for SMS and email when the contact was collected from the person directly, but the passage was cut off in the results, so its conditions are **unconfirmed**. Penalties include fines and, for some offences, prison (secondary source). | [cndp.ma](https://www.cndp.ma), a lawyer. Cendoor is processing sellers' customers' data and sending messages in a seller's name: **decide who is the "data controller" (likely the seller) and who is the processor (Cendoor), and declare accordingly.** |
| **WhatsApp business verification and templates** | Meta verifies the business entity; a provider's article says Moroccan documents in French are accepted and templates are submitted per language (French and Arabic separately). | Meta Business Manager and the chosen provider. |
| **Terms for sellers and customers** | Needed: seller terms (who is responsible for messages, refunds, data), privacy policy, consent wording at checkout for confirmation and marketing messages, a STOP path (built). | A lawyer; copy only what the lawyer approves. |
| **Taxes and invoices** | VAT or exemption depends on status; unresolved. | Accountant. |
| **Insurance** | Professional liability for software errors is worth asking about; not researched. | Broker. |

### 7. Risk register (ten things most likely to go wrong)
| # | risk | likelihood | impact | plan |
|---|---|---|---|---|
| 1 | AI confirms an order wrongly or sends a bad message in a seller's name | high | high | Approve-before-send for 14 days; permanent always-approve option; a kill switch per shop; apologise and fix within hours. |
| 2 | WhatsApp per-seller approval takes weeks, or costs more than planned | high | high | Resolve the open question above; fallback is the prepared-message flow; quote two providers. |
| 3 | No real seller trusts an unknown founder | high | high | Pilot with 3 to 10 sellers found one by one; the founder's name and number on the page; real results only. |
| 4 | Data-protection (CNDP) problem: no declaration or consent | medium | high | Lawyer before billing; consent wording; STOP is built; do not message anyone without consent. |
| 5 | The paid hosting fails or loses data (single small server, SQLite file) | medium | high | Daily backup of the database and uploads; test a restore; move to a managed database if sellers grow. |
| 6 | The AI model cost per seller is higher than 5 MAD | medium | medium | Monthly cap, usage per seller shown, rules-first design (already). |
| 7 | A competitor (eGrow, Babliy, YouCan) adds a store builder or Darija AI | medium | medium | Focus on proven results for one seller type; keep the 99 MAD founding price lock. |
| 8 | The founder cannot be paid and burns out | high | high | Set the founder's minimum income and break-even sellers (CFO note: 71 sellers with a 6,000 MAD salary). |
| 9 | Meta or the provider changes rates (Morocco's rates are announced as changing) | medium | medium | Re-check Meta's rate card before launch; pass through message costs if needed. |
| 10 | A pilot seller's customer complains about unwanted messages | medium | high | Confirmation only after a real order; STOP honoured at once; no marketing without consent. |

### 8. What changed in the numbers
The WhatsApp provider fee (290 MAD a month) was missing from the CFO model and has been added: `numbers.json` and `cfo.md` are updated, break-even went from 21 to 24 paying sellers. **If providers charge per seller number, the cost per seller is higher than modelled; re-run `/founder-cfo` after the quotes.**

## Launch plan

Today is **2026-10-19**. Target public launch: **Monday 2026-11-30** (my assumption; no date was given). Reads [ops.md](ops.md) lead times, [marketing.md](marketing.md), [brand.md](brand.md), [offer.md](offer.md) and the board's conditions ([board.md](board.md)). Task owners are "Founder" unless a role is named, because the business has one person today.

**Be honest about the date:** the public paid launch on 11-30 needs a registered business status, a lawyer's OK on customer data (CNDP), a billing method and a decision on WhatsApp access. None of those exists today. **If any is not done by 2026-11-20, move the paid launch and keep the free pilot going.** The pilot does not need any of them (it is free, uses the seller's own phone for prepared messages, and the seller consents in writing).

### 1. Test before you spend: the real-seller pilot
**The test:** find 40 real sellers by direct message (marketing hook 1), interview the ones who reply, and offer **3 to 10 of them a free 30-day pilot** on their real orders, with approve-before-send on and the prepared-message flow (no WhatsApp approval needed). Each pilot seller signs a short note: Cendoor may read their conversations to fix problems, and they may quit any time. Measure **their own numbers, before vs after**: orders confirmed, orders refused or lost, hours spent confirming.

**Success line (written before the test):**
- At least **10 of 40** contacted sellers (25%, the panel's re-test rate) reply and agree to a talk. If under 5 of 40: the message or the targeting is wrong, change it before going on.
- At least **5 sellers start the pilot**, and **at least 3 confirm 10 or more real orders** through Cendoor in 30 days.
- At least **2 refuse-to-lose results**: for example a seller's confirmation rate or hours saved clearly better than their own "before".
- At least **3 written commitments** to pay 99 MAD after the pilot if it works (the board asked for pre-commitments at the stated price).
- **No serious incident** (no wrong confirmation that cost a customer without a fix the same day).

**Compare with the panel:** the simulated 25% buy rate is an upper bound. If real sellers fall well short (for example fewer than 3 of 40 start a pilot), **trust the real sellers and go back to `/founder-offer` and `/founder-pricing`** before launching. The panel's 8 trust-blocked sellers say real sellers they know, and a real person they can call, matter most.

### 2. The countdown (weeks of 2026, Monday dates)
**Critical path (these move the launch date if they slip):** approve-before-send built, a seller-consent note, the business status registered, the CNDP/lawyer OK, the WhatsApp access decision.

| week | Legal and money | Build | Brand | Marketing | Team and pilot |
|---|---|---|---|---|---|
| **Oct 19** | Ask an accountant which status fits (auto-entrepreneur vs company) and what it costs; book a lawyer for CNDP. | Decide the build list below. | Check trademark and handles ([brand.md](brand.md)). | Build the target list of 100 sellers to message (public shops only). | Fix the pilot note (consent). |
| **Oct 26** | Start registration. | Build approve-before-send, always-approve option, export of customers. | Fix the muted text colour contrast. | Begin DMs (10 a day, one by one). | Interviews. |
| **Nov 2** | Get quotes from two WhatsApp providers; settle whether each seller needs their own number. | Make the demo work with a real Moroccan phone; test Darija with real messages. | Reserve handles. | DMs, 5 interviews done. | **Start the pilot with 3 sellers.** |
| **Nov 9** | Lawyer drafts seller terms, privacy policy, consent wording. | Fix what the first pilot orders break. | Draft the offer page. | Marketing calendar starts Nov 16: prepare videos. | Pilot week 2, daily review; add up to 7 more sellers. |
| **Nov 16** | Business registered (target). | Run the real Claude pages mode with the key; review its output. | Final offer page, wordmark, profile pictures. | **Marketing calendar begins** ([marketing.md](marketing.md)). | Pilot week 3; ask sellers for permission to quote results. |
| **Nov 23** | Billing method chosen and tested; CNDP declaration filed (or lawyer-approved plan). | Freeze features; test signup on a phone. | Offer page live. | Last prep for launch. | Review pilot against the success line. **Go / no-go on Nov 24.** |
| **Nov 30** | | | | **LAUNCH** | Soft open day before: Sunday Nov 29 with the pilot sellers and friends. |

**Build list (kept short, in order):** (1) approve-before-send with an always-approve setting, (2) customer export, (3) one real path from order to confirmation message (the board's "one seam"), (4) kill switch per shop, (5) Claude pages mode tested with a real key. Everything else is out until pilot feedback.

**Soft open:** Sunday 2026-11-29, with the pilot sellers and two friends placing real orders on a real shop. Fix what breaks before Monday.

### 3. Launch day: Monday 2026-11-30 (run sheet)
| time | what |
|---|---|
| 08:00 | Final check: service up, billing works, the trial signup works on two phones, the offer page loads fast on mobile data. |
| 09:00 | Post the launch reel and "Cendoor Founding 50 is open" in the groups and on both channels ([marketing.md](marketing.md) hook 5). |
| 09:30 | DM the 20 sellers who showed interest; answer replies within minutes. |
| 12:00 | Check the first trials: help each seller finish setup; keep approve-before-send on. |
| 15:00 | Read every conversation from the day for wrong or rude messages. |
| 18:00 | Post a short update (real numbers only, e.g. "7 shops started today"; do not post anything inflated). |
| 20:00 | Thank each new seller personally; note questions for the FAQ. |
**If something breaks** (from the risk register): wrong or rude message -> switch that shop to approve-only, apologise, fix, tell the seller what changed; service down -> post a plain status update and restore from backup; WhatsApp access fails -> switch to the prepared-message flow and say so.

### 4. The first 30 days (2026-11-30 to 2026-12-30)
Track weekly (from [cfo.md](cfo.md) and [marketing.md](marketing.md)):
- **Paying or committed sellers against break-even (24 paying sellers at 149 MAD, 39 at 99).** Plan ramp: 3 sellers in month 2 and 60 by month 12.
- **Replies per 10 DMs, trials per 100 link clicks, trials that confirm one real order in 7 days.**
- **Wrong confirmations** per 100 confirmations (target: zero customer-visible errors that cost a sale).
- **Cost per seller** against the 23 MAD variable estimate.

| review | questions to answer | change something if |
|---|---|---|
| **Day 7 (Dec 7)** | How many started a trial, how many confirmed a real order, what broke? | under 5 trials, or under half confirm an order |
| **Day 14 (Dec 14)** | Do trial sellers keep approve mode on? Are they asking for per-order pricing? Any complaint? | any wrong confirmation without a same-day fix; 99 vs 149 shows a clear winner |
| **Day 30 (Dec 30)** | Founding offer closes Dec 31: how many sellers, how many paying? Is the plan ramp on track? Cash left? | fewer than 10 paying sellers: re-run the pricing test and the offer before spending more on marketing |

**Cash rule:** the CFO note says about **29,820 MAD** is needed before it pays for itself, with no founder salary. If cash left in the bank is lower than three months of fixed costs (about 8,800 MAD), cut marketing first.

### 5. Open items for the founder (cannot be decided from here)
Launch date, who pays for the first 30 days, the business status, the lawyer, the WhatsApp provider, the billing method, and whether the founder's name and number go on the offer page (the panel's trust blockers ask for this).

_The panel is simulated buyers and the numbers are projections from your inputs. Confirm demand with real customers and costs with real quotes before you spend. Not financial, legal or tax advice._
