# CFO sources: where each number comes from

**Modelling trick:** the tool counts units per day. One *seller-day* = one paying seller for one day. So "units per day" means paying sellers, price 4.97 = 149 MAD / 30, and variable costs are the per-seller monthly cost divided by 30. Everything is in MAD although the tool prints "$".

| number | value | source / status |
| --- | --- | --- |
| Price | 149 MAD/month (Solo) | The founder's plan. Growth is 299. |
| WhatsApp per seller | about 12 MAD/month | **Estimate.** One third-party calculator lists Morocco at $0.0040 per utility message and $0.0225 per marketing message (date and basis unclear, unverified). Assumes about 100 utility + 15 marketing messages a seller a month at about 10 MAD per $. [Meta pricing page](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing) says Morocco rates are changing and that to-be rates are announced no later than 2026-09-01: **re-check before launch.** |
| Claude per seller | about 5 MAD/month | **Estimate.** Chat is rule-based first; Claude is used only when rules fail and only if credits remain. Third-party listings show roughly $2-3 per million input tokens and $10-15 per million output tokens (unconfirmed). |
| Payment fees | about 2.5% | **Estimate;** no Moroccan processor chosen yet. |
| Hosting | 150 MAD | Render Starter web service is $7/month and disk $0.25 per GB/month (see [Render pricing](https://render.com/pricing.md)); about 95 MAD for 10 GB, rounded up for headroom. Needs checking when real sellers load it. |
| Marketing 2,000 MAD/month | estimate | The founder has not given a budget. |
| Accountant and CNDP reserve 400 MAD/month | estimate | Not a quote. |
| Startup 19,000 MAD | estimate | No quote for any item. Registration, legal and WhatsApp onboarding costs in Morocco are unknown to me. |
| **Founder pay** | **0 (not included)** | The plan counts no salary for the founder. Add one for the real picture. |
| Ramp 0, 3, 6 ... 60 paying sellers by month 12 | estimate | Sanity-checked against the panel: only 10% of simulated sellers would start (an upper bound), so 60 paying sellers needs at least 600 trials in year 1 if the 10% holds. That is the number to test with real sellers. |
| Plan volume 100 paying sellers | estimate | Not a forecast. |
| WhatsApp provider platform fee | 290 MAD/month | Added after `ops.md` research. A WhatsApp Business solution provider's blog ([ChatDaddy](https://chatdaddy.tech/blog/whatsapp-business-api-morocco)) lists about 290 MAD/month for its entry plan, 790 and 1,990 above; **vendor-written and unverified**, other providers quote in USD. It may also be paid per seller number rather than once: unresolved (see `ops.md`). |
