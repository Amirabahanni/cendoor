# Offer: Cendoor

Method: the Offers lens in `founder-board/lenses.md` (a summary of a published framework, not anyone's words). Raw material: the panel's objections ([panel-v1/results.md](panel-v1/results.md)), the board's conditions ([board.md](board.md)) and the CFO numbers ([cfo.md](cfo.md)).

## 1. The problem list (in the seller's words, ranked by how often the panel raised it)
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

## 2. Solutions, scored (value to buyer 1-5, cost to deliver 1-5)
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

## 3. The stack
- **The core (described by the outcome):** "Orders confirmed for you, in your customer's language, before you ship."
- **Bonuses (each kills one objection):** (1) Approve-before-send for 14 days (kills "it will say something wrong"); (2) We set it up with you (kills "I have to figure it out"); (3) Export your customers any time (kills "who owns my data").
- **The guarantee:** first 30 days, full refund of the month if it confirms no real order or you are not satisfied. **Cost at a 30% claim rate:** 0.3 × 99 MAD ≈ 30 MAD per new seller, about 1,800 MAD for 60 sellers in year 1 (the ramp in numbers.json), against 45,774 MAD of year 1 revenue. Affordable.
- **Urgency (true):** the first 50 founding sellers lock 99 MAD for 12 months; closes 2026-12-31 or at 50 sellers.
- **The name:** **"Cendoor Founding 50."**

## 4. Value equation, before and after (1-10, simulated judgement, not measured)
| element | now | after | which part moves it |
|---|---:|---:|---|
| Dream outcome (orders arrive confirmed, no phone calls) | 7 | 7 | unchanged: the promise was already clear |
| Perceived likelihood | 3 | 6 | approve-before-send, setup with the founder, guarantee |
| Time to the result | 5 | 7 | done-with-you setup, ready storefront |
| Effort and sacrifice | 4 | 7 | seller keeps channels; approve mode lowers risk; no monthly lock-in via guarantee |
The biggest honest gap is still **likelihood**: until real sellers show real results, the panel's "I have not seen it work" is true.

## 5. Re-test
The new pitch is in `pitch.md` (old one saved as `pitch-v1.md`). Result of the 20-buyer re-run with the same seed: see the bottom of this file after the run.

## 6. Limits
- Approve-before-send and customer export are not built yet; the pitch describes them as part of the offer, so build them before showing the offer to real sellers.
- Real WhatsApp sending needs Meta approval; until then "approve and send" means the seller taps a prepared WhatsApp link (as in the current campaign queue). Say so to the seller.
- Done-with-you setup is the founder's time for 50 sellers (roughly 25 hours at 30 minutes each; estimate), not counted in the CFO numbers.
- Follow Moroccan consumer-protection and advertising rules for guarantees; not legal advice.

## 7. Re-test result (20 simulated sellers, same seed 7, new offer)
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
