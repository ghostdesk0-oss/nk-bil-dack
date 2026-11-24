# Changelog

What changed, in words Nicklas would understand where it is visible to him.
Newest first. Add to Unreleased as you go; cut a version when the demo link is republished.

## Unreleased
Revamp. The 3D car is gone; the page is built around booking.
- Shorter page: hero with the plate and the 3D tyre, the tyre story, a price board, the tyre shop, the tyre hotel, and one block with address, hours, phone and the Google rating. About half the length on a phone.
- The plate scan now ends with one button: "Boka hjulskifte idag 10:30". It opens the booking at the last step, so a booking takes a name, a mobile number and one tap.
- Every service on the price board shows its next free time and books in one tap.
- Booking checks the time again at the moment you confirm. Two people (or two tabs) can no longer get the same slot; the second one is told it was just taken and picks another.
- Times that have already passed today can no longer be booked, and there is 30 minutes' notice for same-day bookings.
- Bookings no longer vanish at midnight. Customers' bookings, orders and the cart are kept; only the example week is redrawn.
- After booking: "Lägg i kalendern" downloads a calendar file with a reminder two hours before, plus "Visa vägen".
- "Mina bokningar": find your bookings by mobile number, move to another time or cancel.
- Plates and mobile numbers are understood however they are typed (abc123, +46 70…), personalised plates included. Errors appear under the right field.
- The cart: max 8 of one tyre, change the number or remove, and tyres not in stock are ordered home instead of refused.
- One Verkstaden instead of two. It sees web bookings live, gives each car a lift, warns when both lifts are busy, logs tread depth (warns under 3 mm), a checklist and a note per job, "Klar, skicka sms", phone bookings and drop-ins, moves and cancellations, the tyre hotel with next free shelf, customers, orders and stock. A short guide explains it.
- The phone's back button closes the booking sheet instead of leaving the page.
- Without WebGL (old phones) the page shows a flat version quietly.
- The 3D tyre stops drawing when it is scrolled away or Verkstaden is open.
- Tooling: two design skills in `.claude/skills/` (an anti-slop audit and the tasteskill build kit).
- The preview strip reads "Förhandsvisning, ej publicerad" and can be hidden; Verkstaden stays on Shift+V and the footer wordmark.

## 0.2.1 – 2026-11-14 to 2026-11-22
Items about the car configurator were removed again in the revamp above.
- Sidewall text (incl. your own) reads left-to-right again; the arc drawing mirrored each letter.
- Shop clock and open/closed status always follow Swedish time, whatever the visitor's device timezone.
- Story drag layer no longer swallows taps on rim colours and the tyre-text input.
- Hero: trust pill (Brynäsgatan 67, Gävle • Sedan 1993 • 4,6 ★ på Google), "Punktering? Kom direkt" quick link, scroll hint; the wheel is centred and capped on narrow phones.
- Configurator: whole car fits at 390 px, dock can no longer overflow, vertical swipes scroll instead of orbiting, phone-call FAB stays reachable, mirrored car clone removed (~50% fewer triangles), shaders pre-warm on idle, both scenes skip rendering when settled and recover after GPU context loss.
- Burnout: hold survives thumb drift, phone vibrates on ignition, smoke uses a pre-rendered sprite at device pixel ratio with a denser plume.
- Booking drawer has an optional email field; quick-quote plate follows the hero input; configurator bookings note the paint; open tabs stay in sync via storage events; inline SVG favicon; a11y: tablist roles, hidden callout card, labelled stars, cart count in the aria-label, inert hotspots.
- Verkstaden stays reachable after the demo strip is dismissed: Shift+V on desktop, the footer wordmark (or the NK plate in Verkstaden) on touch.
- Verkstaden owner pitch: KPI strip (dagens bokningar, lediga tider, däckhotell-beläggning, akuta drop-in), booking rows with Swedish reg-plate badge, lift and hotel-shelf assignment, "Markera klar & skicka SMS" with toast confirmation, and a NY BOKNING pill on fresh web bookings.
- Optional sound (off until toggled in the header): synthesized wheel-gun burst on rim swaps and an rpm-following hum while the burnout is held.
- Hero callout dots and badges are clamped inside the viewport on phone screens.
- The demo strip can be dismissed with an × (stays hidden for the session) for clean fullscreen demos.
- Camera preset buttons (3/4 Front, Sidoprofil, Närbild Hjul) always visible in Prova på bilen.
- Burnout release spins down with real inertia, the brake disc glows hot and cools, and the camera trembles with the revs.
- Polestar-style studio light: cool rear rim light and a soft contact shadow under each tyre; the car settles on its suspension (stiffer spring) when rims or tyres are swapped.
- Sidewall text follows a circular arc and is molded into the rubber via bump and roughness maps.
- Both 3D scenes pause rendering when offscreen (IntersectionObserver, 150 px margin); the wheel scene is gated on the hero/story sections since its canvas is fixed.
- The configurator's booking button now reads "Boka tid med detta val".
- The demo deploys to GitHub Pages automatically on every push to main.
- Error log and feedback links in Verkstaden (Logg tab), so problems become GitHub issues.
- Project rules checked on every build; agent instructions, lessons and decision records.

## 0.2.0 – 2026-11-13
- 3D car configurator: rims, tyres, paint, lights, camera views, 100 km/h test.
- Booking drawer prefilled from the configurator. Quick quote, service cards, rating strip.
- Dark workshop dashboard with daily brief, lift timeline and auto-confirm.

## 0.1.0 – 2026-11-13
- First version: 3D tyre hero, reg-nummer scan, scroll story, tyre shop, booking, workshop view.
