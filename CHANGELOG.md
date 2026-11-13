# Changelog

What changed, in words Nicklas would understand where it is visible to him.
Newest first. Add to Unreleased as you go; cut a version when the demo link is republished.

## Unreleased
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
