# Demo script: 5 minutes, and what to say about what is real

Open the app a minute before: the free host sleeps after 15 minutes. Have the poster ready (`docs/poster/cendoor-journey-en.pdf`). Use a laptop and, if you can, your phone for the shop link.

## Before you start (say this in one sentence)
"This is a working demo with fictional data. The shop builder, chat and order flow are real; sending through WhatsApp, Instagram and Meta ads needs Meta's approval, so those run as a dry run today."

## The path

| Time | Show | Say | Where |
|---|---|---|---|
| 0:00 | The poster, step 1 to 8 | "A seller posts. Cendoor builds the shop, answers customers, confirms the order, tracks delivery and cash." | poster |
| 0:40 | Landing page animation | "You describe the shop in a sentence; the AI builds a different website each time, not a template." | `/` |
| 1:10 | The demo shop on a phone | "This is what a customer sees: real photos, cash on delivery, chat to order. The seller uploads their own photos." | `/s/atlas-boutique` |
| 1:40 | Place an order in the shop chat in French or Darija | "The AI takes the order: product, size, city, address, phone, in the customer's language." | shop chat button |
| 2:30 | Dashboard, press **Try the demo**, Home | "Today's tasks: one order waiting for approval, eight to ship. The seller's link and setup checklist are here." | `/app` |
| 3:00 | Orders: open the new order | "The AI asks the customer to confirm. The seller approves with one tap. Risky orders are flagged." | Orders |
| 3:30 | Studio: type "make it dark with gold" | "The shop changes by chatting. Every change can be undone." | Studio |
| 4:00 | Customers > Campaigns | "Pick who gets an offer in three steps: all customers, or fine-tune by city, product, spend. Preview, confirm, send." | Campaigns |
| 4:30 | Products > Ads | "One click to turn a product into an ad in the seller's own Meta account; the seller pays Meta directly. Here it is a dry run." | Ads |
| 4:50 | Close | "We start with 3 to 10 real sellers next week. The numbers we will report: confirmed rate, failed deliveries, hours saved." | |

## If the network fails
Run locally: `npm start` in `cendoor-mvp`, then open `http://localhost:3000`. The demo works offline (the photos are in the project).

## Straight answers to likely interruptions
- *"Is this live with WhatsApp?"* No. Real WhatsApp needs a verified business and approved templates. Today the messages are prepared and shown, with one-tap links.
- *"Does the AI understand Darija?"* The built-in rules understand common Darija and Arabizi ordering phrases; quality on real, messy conversations is exactly what the pilot measures. Voice notes are flagged for the seller, not transcribed.
- *"Do you have users?"* Not yet. The pilot starts after registration basics; see `research/launch.md`.
- *"What is the Claude part?"* Optional: free-form requests and bespoke pages use a Claude key and credits. It has not run against a real key yet; the rest of the product does not need it.

## After the demo
Send the one-pager (`research/one-pager.md`), the poster, the link, and `README.md` of this folder as the index of everything available. Offer a call with the pilot sellers once there are some.

## Demo accounts
`demo@cendoor.com` (owner), `manager@`, `operator@`, `viewer@cendoor.com`; password `demo1234`. The data is fictional and resets on restart; anyone with the link can log in.
