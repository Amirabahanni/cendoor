# Questions an investor will ask, and honest answers

Answers use only what is true today. Where the honest answer is "not yet", say it plainly and say what you will do and by when. Investors forgive gaps; they do not forgive being surprised.

**1. What exactly is Cendoor, in one sentence?**
An AI service for small Moroccan sellers on Instagram, TikTok and WhatsApp that confirms each cash-on-delivery order with the customer in their language before the seller ships, and builds the seller's store link from a chat.

**2. Do you have customers or revenue?**
No. There are no paying customers and no revenue. The product is built and demonstrable; the next 30 days are a free pilot with 3 to 10 real sellers (see `research/launch.md`). The first evidence will be their before/after numbers.

**3. How do you know sellers want this?**
Evidence so far is indirect: public vendor sources describe cash-on-delivery failure as a major problem (20 to 40%, vendor figures), three funded competitors sell confirmation, and a panel of 20 simulated sellers said 25% would try the offer (an upper bound; simulated buyers are agreeable). No real seller has been interviewed. That is the first task.

**4. Isn't this already done by eGrow, YouCan Confirm and Babliy?**
Parts of it, yes: eGrow ($59/month and up, 200+ stores claimed), YouCan Confirm (human agents) and Babliy (Darija AI on WhatsApp, launched June 2026). We did not find one that also builds the shop from a chat for a seller who only has an Instagram or TikTok account; that is an inference from their public pages, not a verified fact. Cendoor's price (149 MAD) is below every priced competitor.

**5. What is your moat?**
Today, none that is proven. Candidates: Darija-quality conversations tuned on real orders, delivered-order data, cross-seller risk signals (only useful at scale), speed of onboarding, and local presence. The honest plan is to build the data and the relationships through the pilot.

**6. Why would a seller trust an AI to talk to their customers?**
They shouldn't by default. That is why the first 14 days require the seller's tap on every message, the seller can read and take over any chat, and there is a per-shop kill switch (some still to be built; see roadmap). This was the top objection in the simulated panel.

**7. What works today and what doesn't?**
Works (built and tested, 114 automated checks): the shop builder, the customer chat and ordering, order confirmation logic, tracking page, cash tracking, campaigns, ad launching flow (dry run), roles. Does not work yet: sending through the real WhatsApp, Instagram or TikTok (needs Meta/TikTok approval), real carrier tracking (needs carrier access), billing, and the Claude-written pages mode (never run with a real key).

**8. How do you get WhatsApp access?**
Through the WhatsApp Business Platform: a verified business plus approved message templates, directly or via a provider. It needs a registered company. Open question: whether each seller needs their own verified number or Cendoor can operate as a provider for all. This decides cost and onboarding time (see `research/ops.md`).

**9. How big is the market?**
See `market-sizing.md`. Honest summary: there is no official count of social sellers; the bottom-up estimate puts year-3 subscription revenue at roughly $80k to $400k a year in Morocco alone. It is an attractive small business; investor-scale needs higher revenue per seller or expansion, both unproven.

**10. What are the unit economics?**
Each paying seller leaves about 126 MAD a month after direct costs (85% of 149 MAD) (estimates, no quotes). Break-even is 24 paying sellers with no founder pay and 71 with a 6,000 MAD salary. A 99 MAD price loses money in year 1 unless it brings far more sellers. See `financial-model.xlsx`.

**11. Why 149 MAD?**
It is below competitors, and the simulated panel's acceptable range was 30 to 150 MAD. It is a hypothesis to test against 99 MAD and a per-confirmed-order option with real sellers.

**12. What does the legal side look like?**
The company is not registered; the terms and privacy policy are drafts; the Moroccan data-protection (CNDP) declaration is not filed. Customer data is the sellers' (controller) and Cendoor processes it. Nothing involving real customers goes live before a lawyer has reviewed this. See `legal/`.

**13. What about security?**
Passwords hashed with scrypt, role-based permissions, rate limits, HTML/CSS sanitisation of generated sites, encrypted ad tokens, hashed phone numbers in the shared risk signal. No external audit yet, no two-factor authentication, single server with backups to be added. See `security-and-data.md`.

**14. Who is on the team?**
(Founder to complete.) The product was built by the founder with AI assistance. Missing skills to name: Darija language review, sales, legal/accounting support.

**15. What do you need the money for?**
See `use-of-funds-and-ask.md`: registration and legal, a modest founder income, a part-time Darija support hire, a marketing and ad test budget, and a buffer. The company can reach its first milestones on about 30,000 MAD of cash if the founder takes no income.

**16. What are the milestones?**
(1) 3 to 10 pilot sellers with before/after numbers and 3 written commitments to pay; (2) registered company and legal basics; (3) WhatsApp approved; (4) 25 paying sellers; (5) positive monthly contribution after fixed costs.

**17. What could kill the business?**
Real sellers don't trust or pay; WhatsApp approval takes months or is refused; a competitor adds a shop builder; data-protection problems; the founder can't fund a living while building. The risk register is in `research/ops.md`.

**18. How did you use AI to build it, and who owns the code?**
The code was written with AI assistance and should be assigned to the company on incorporation (see `company-and-cap-table.md`). Third-party packages and fonts are open-source; demo photos are from Pexels.

**19. What is the exit?**
It is too early to answer honestly. Plausible paths are acquisition by a regional commerce or logistics platform, or growth into a profitable regional business. Do not promise a multiple.

**20. Why now?**
Cash on delivery dominates, social commerce is growing (Instagram and TikTok audiences grew about 20% in a year, per a Morocco World News summary of DataReportal that I could not verify at the source), WhatsApp is the main customer channel, and AI can now handle Darija conversations at an acceptable cost. Babliy's 2026 launch shows others see the same window.
