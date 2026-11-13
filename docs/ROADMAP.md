# Roadmap

Order is set by what sells the idea to Nicklas first, then what makes it safe to run for real.
Each phase ends with something he can see and use.

## Phase 1 – Design, visuals and the selling flow (now)

The demo has to make him say yes, and make customers book.

- [x] 3D tyre hero, reg-nummer scan, hotspots, scroll story
- [x] 3D car and rim configurator with booking drawer
- [x] Quick quote, service cards, rating strip, hours, map, click to call
- [x] Tyre shop with cart and fitting time
- [x] Workshop dashboard: daily brief, lift timeline, confirm, auto-confirm
- [ ] Real photos of the workshop, van and team (shoot day)
- [ ] Real prices and service list from Nicklas
- [ ] Customer page: "Mina bokningar" by phone number, reschedule and cancel
- [ ] Dashboard: drag a booking to another time or lift
- [ ] Dashboard: day and week print view for the workshop wall
- [ ] Test on real phones (iPhone and a mid-range Android), fix what stutters

## Phase 2 – Simple backend and real booking

Goal: bookings survive a page reload and reach the workshop on any device.

- Proposed stack: **Supabase** (Postgres, auth, EU region, row-level security) behind the
  existing page, or **PocketBase** if we want one small server we host ourselves. Decide with
  Nicklas based on who maintains it.
- Tables: customers, vehicles, bookings, services, lifts, tyre_hotel, products, stock, orders.
- Slot logic moves to the server so two customers cannot take the same time.
- Login for the workshop (Nicklas and staff). The customer side stays login-free.
- SMS confirmation and reminder the day before (e.g. 46elks or Twilio).
- Daily brief sent as SMS or email at 06:30.
- Reg-nummer lookup for make, model and tyre size from a vehicle-data provider.

## Phase 3 – Security, consent and data

- Consent on every form: what we store, why, for how long. Link to a privacy page.
- Privacy policy and cookie notice in plain Swedish.
- Data retention: delete or anonymise old customers on a schedule.
- Export and delete a customer's data on request.
- Backups, audit log of who changed what in the dashboard.
- Remove `noindex` and the demo strip only when this phase is done.

## Phase 4 – Found on Google, then ads

- Google Business Profile: claim, real photos, hours, booking link, ask happy customers for reviews.
- Local SEO: one page per service and "däckbyte Gävle", "däckhotell Gävle" etc.
  `LocalBusiness` / `AutoRepair` structured data, fast pages, real text.
- Seasonal pushes: April and October tyre change reminders to existing customers.
- Meta and Google ads around the two tyre seasons, tracked to bookings, not clicks.
- Simple analytics without personal tracking (e.g. Plausible).

## Phase 5 – AI

- Booking assistant on the site: "jag har punktering, kan ni ta mig idag?" answered with real free times.
- Tyre advisor: size from reg-nummer, recommend from stock, explain the choice.
- Dashboard assistant: the daily brief written in natural language, flags on no-shows and overbooking.
- Draft replies to customer messages for Nicklas to approve.

## Not decided

- Payments online (Swish, Klarna) or keep paying in the workshop.
- Whether the shop shows live supplier stock or only what is on the shelf.
