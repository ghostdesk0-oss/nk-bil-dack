# NK Bil & Däck – project brief

## The client

**NK Bil & Däck AB**, tyre and car workshop at Brynäsgatan 67, Gävle. Running since 1993.
Owner: Nicklas Karlsson. Phone 026-18 05 01, info@nkbilochdack.se.
Open Mon–Thu 07–17, Fri 07–16. 4.6 on Google from about 155 reviews.
Sells and fits Kumho and Vredestein, does wheel changes, balancing, alignment,
tyre hotel, service and repairs for cars and vans.

## The problem

He has close to no online presence. No real website, no online booking, no customer
register, no shop. Customers phone or drop in. Every booking is a phone call, every
reminder is manual, and nothing is found on Google except directory listings.

## The goal

Give him one place that does three jobs:

1. **Sells.** A customer-facing site that a 25-year-old in Gävle thinks is cool, and that
   turns a visit into a booking in under 30 seconds.
2. **Books itself.** Customers pick a free time, the workshop sees it, confirms it or lets
   it confirm automatically.
3. **Runs the day.** A dashboard that tells Nicklas in the morning what today looks like,
   what needs confirming, what to pick from stock, and where the gaps are.

The backend must stay simple to use. If it needs a manual, it has failed.

## What exists today (concept demo)

One self-contained HTML page, no server. All data is example data in the browser.

**Customer side**
- Hero: a 3D tyre on a reflective studio floor. Reg-nummer plate with laser scan,
  hotspots that open service cards, burnout on long press.
- Scroll story: the wheel comes apart (tread, rim, brake). Season switch with studs and snow.
- Price board: every service with its next free time; one tap opens the booking at the time step.
- Booking sheet: service, time, details, done. Calendar file, directions, "Mina bokningar" (move, cancel).
- Address, hours, open-now, map link, click to call, Google rating and what reviews mention.
- Tyre shop: size picker, seasons, cart with limits, checkout with or without fitting, backorders.
- Tyre hotel builder with add-ons.

**Workshop side ("Verkstaden")**
- Daily brief written from today's data, KPIs, lift timeline (two lifts), bookings to confirm,
  coming days.
- Job cards: confirm, on the lift, done with sms; lift choice with clash check; tread depth, checklist, note.
- Phone bookings and drop-ins (queue when both lifts are busy), move, cancel.
- Bookings, tyre hotel (next free shelf, low-tread flags, book a swap), customers, web orders, stock, error log.
- Auto-confirm switch for web bookings.

## Principles

- **Brand:** black and red from the van livery. Candy-paint red gradient, warm blacks.
- **Phone first.** He and his customers look at this on a phone.
- **No invented facts.** Only real: address, phone, hours, founding year, rating, headlight
  polishing 1 500 kr. Everything else is labelled as example data until he gives us real numbers.
- **Simple over clever** on the workshop side. Big buttons, plain Swedish, one screen per job.
- **Fast.** 3D loads only when it's about to be seen and lowers its own quality on slow phones.

## Open questions for Nicklas

- Real prices for the services, and which ones he wants bookable online.
- How many lifts, and are some jobs only done on one of them?
- Does he want web bookings confirmed automatically, or to look at each one?
- Tyre hotel today: how many sets, where is it tracked?
- Which suppliers and price lists for tyres and rims?
- Photos: workshop, van, team, finished jobs. Can we shoot them?
- Domain: nkbilochdack.se is registered. Who controls the DNS?

## Owner of this repo

Built by Viktor (Vertix Air) as a pitch and foundation for NK Bil & Däck.
