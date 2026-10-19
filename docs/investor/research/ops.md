# Operations: Cendoor

How the business runs on day one, week one and month one. Reads `idea.md`, [offer.md](offer.md), [numbers.json](numbers.json), [brand.md](brand.md). Cendoor is software sold by subscription, so "operations" means: onboarding sellers, keeping the service running, handling mistakes and staying legal. Sources are public pages; where only a quote can answer, it is listed as an open question. **Not legal advice: confirm every item below with the authority or a professional.**

## 1. The daily cycle (what must happen every day)
Mark (C) where a seller or customer sees it.
1. Check the service is up and the queue is moving (health page, errors, failed messages).
2. Read the "needs attention" list: conversations the AI flagged (voice notes, unclear Darija, wrong confirmations) (C).
3. Answer new seller messages and trial questions within hours (C).
4. Onboard today's new sellers: set up the shop, import products, run a test order, switch on approve-before-send (C).
5. Review one day of real confirmations for wrong or rude messages, fix rules, note Darija words the AI missed.
6. Backup check (data copy ran) and cost check (WhatsApp and AI usage per seller).
7. Weekly: invoice/refund review, the three marketing numbers, a review with each pilot seller.

## 2. "Suppliers" (the services Cendoor depends on)
| need | candidates with public prices | status |
|---|---|---|
| Hosting | **Render**: Starter web service $7/month, persistent disk $0.25/GB/month ([Render pricing](https://render.com/pricing.md)); the free tier sleeps and cannot hold real data. Alternatives not researched. | Real customers need the paid instance plus a disk mounted at `/data`. |
| WhatsApp access | A WhatsApp Business solution provider or Meta's own Cloud API. One provider's (vendor-written) blog lists ChatDaddy about 290 / 790 / 1,990 MAD per month, WATI about $49, AiSensy about $20, Respond.io about $79, 360dialog API-only ([source](https://chatdaddy.tech/blog/whatsapp-business-api-morocco)). Per-conversation fees in the same article: utility about 0.03 to 0.05 MAD, marketing about 0.10 to 0.15 MAD (approximate). Meta says Morocco's rates are changing ([Meta pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)). | **Open: get quotes from two providers.** |
| AI model | Anthropic API (the code already supports it); third-party listings show $2-3 input and $10-15 output per million tokens (unconfirmed). | Needs the founder's own API key and a monthly cap. |
| Payments | A Moroccan card processor or bank transfer; none chosen. | **Open.** |
| Carriers | Not a Cendoor supplier today (tracking is simulated); sellers use their own. | Real integration needs carrier API access. |
| Domain and email | cendoor.com (the founder says it is available), a business email. | To register. |

**Open question that can break the plan:** does each seller need **their own** WhatsApp Business account and verification (RC extract, CNSS or auto-entrepreneur documents, per the provider's article), or can Cendoor act as a provider for all sellers? This decides cost per seller, the onboarding effort and the approval time (the article claims 24 to 72 hours for Meta verification of Moroccan entities, a vendor claim). **Resolve this before promising "done in a day" to any seller.** Until it is solved, the honest fallback is the prepared-message flow (the seller taps to send from their own phone), which the app already has.

## 3. People
- **Founder:** product, onboarding, support, sales (all of it). Not paid in the CFO numbers.
- **Weeks 1-4 (pilot, up to 10 sellers):** the founder alone, about 2 hours of onboarding per seller plus 1 hour a day of review. Hours are an estimate.
- **From about 20 paying sellers:** a part-time support person, ideally a native Darija speaker, to check Darija conversations and answer sellers (hours and wage to be decided; use a public source for local minimum wage and have an accountant check payroll costs). Not in the CFO numbers.
- A Darija-speaking reviewer is needed from day one for the Darija drafts in `marketing.md` and for checking the AI's replies.

## 4. Routines (one page each, to write out for a new helper)
1. **Onboard a seller (target 30 to 45 minutes):** sign the pilot note (consent to review conversations for support); add shop name and products; connect the seller's WhatsApp number or set up the prepared-message flow; place 3 test orders in Darija, French and Arabic; switch on approve-before-send; show the seller how to read and take over a chat; write down the seller's first-week goal.
2. **Core service: a confirmation:** the order arrives; the AI sends the confirm message in the customer's language; it waits for the seller's tap while in approve mode; on YES it marks confirmed; on NO or silence for the set time it flags the order for the seller's own call; customers who write STOP are never contacted again.
3. **Handle a complaint (target: answer within hours):** acknowledge, say what happened, switch the feature off for that shop if needed, fix, tell the seller what changed (draft in `brand.md`).
4. **Close the day:** read the day's flagged items, record wrong confirmations, send each seller a two-line summary (orders confirmed, orders needing a call).
5. **Weekly reorder-equivalent:** review costs per seller (messages, AI usage) against the 23 MAD estimate in the CFO model and adjust.

## 5. Tools (smallest stack)
- The Cendoor app itself (inbox, takeover, campaigns, export), Render for hosting, a bookkeeping tool or accountant, a shared spreadsheet for the pilot sellers' results (orders confirmed, refused, hours saved, before vs after), a status page. Prices not researched beyond the table above.

## 6. Licences, permits and legal (checklist, each to confirm)
| item | what the sources say | where to confirm |
|---|---|---|
| **Business status and registration** | Options include **auto-entrepreneur** (a simplified status) or a company. Most guides list an annual revenue cap of **200,000 MAD for services** and a flat **1% rate** for services, but guides **contradict each other** (two say 500,000 for services, one says 2,000,000 for commerce). Not verified in law: check Law 114-13 article 4 and the CGI, or the DGI. | The tax authority (DGI), the National Register for auto-entrepreneurs (find the official page), an accountant. A company (SARL) has other costs not researched. |
| **Personal data (Law 09-08, CNDP)** | The CNDP's own page says commercial messaging is lawful only with the recipient's **prior consent** and a **declaration of the processing to the CNDP before it starts** ([CNDP, "Prospection"](https://www.cndp.ma/wp-content/uploads/2025/07/fiche_CNDP_Prospection_RT_fr.pdf)); article 10 forbids prospecting without consent, article 9 gives a right to object. The page mentions an exception for SMS and email when the contact was collected from the person directly, but the passage was cut off in the results, so its conditions are **unconfirmed**. Penalties include fines and, for some offences, prison (secondary source). | [cndp.ma](https://www.cndp.ma), a lawyer. Cendoor is processing sellers' customers' data and sending messages in a seller's name: **decide who is the "data controller" (likely the seller) and who is the processor (Cendoor), and declare accordingly.** |
| **WhatsApp business verification and templates** | Meta verifies the business entity; a provider's article says Moroccan documents in French are accepted and templates are submitted per language (French and Arabic separately). | Meta Business Manager and the chosen provider. |
| **Terms for sellers and customers** | Needed: seller terms (who is responsible for messages, refunds, data), privacy policy, consent wording at checkout for confirmation and marketing messages, a STOP path (built). | A lawyer; copy only what the lawyer approves. |
| **Taxes and invoices** | VAT or exemption depends on status; unresolved. | Accountant. |
| **Insurance** | Professional liability for software errors is worth asking about; not researched. | Broker. |

## 7. Risk register (ten things most likely to go wrong)
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

## 8. What changed in the numbers
The WhatsApp provider fee (290 MAD a month) was missing from the CFO model and has been added: `numbers.json` and `cfo.md` are updated, break-even went from 21 to 24 paying sellers. **If providers charge per seller number, the cost per seller is higher than modelled; re-run `/founder-cfo` after the quotes.**
