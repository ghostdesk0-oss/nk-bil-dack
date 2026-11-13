# NK Bil & Däck

Konceptdemo för NK Bil & Däck AB på Brynäs i Gävle: kundsida med 3D-hjul, bokning,
däckshop och en verkstadsvy. Allt byggs till **en enda HTML-fil** utan server.

> Det här är en demo. Kunder, bokningar, lagersaldon och priser är exempeldata
> (utom lyktpolering 1 500 kr, som är NK:s eget pris). Inget skickas någonstans.

## Kom igång

```bash
npm install
npm run dev      # bygger om vid ändring, http://localhost:5173
npm run build    # skriver dist/index.html
npm test         # röktest i headless Chromium (kräver Python + Playwright)
```

Röktestet behöver `pip install playwright && playwright install chromium`.

## Struktur

| Sökväg | Innehåll |
| --- | --- |
| `src/index.html` | Sidans markup, med platshållare för stil och script |
| `src/styles.css` | All CSS. Färger och rörelse ligger som variabler överst i `:root` |
| `src/app.js` | Sidlogik: bokning, varukorg, verkstadsvy, scroll-berättelsen, hotspots, regskanning |
| `src/wheel/wheel.js` | 3D-hjulet i hero och scroll-berättelsen: golv med spegling, dimma, snö, dubbar, laser |
| `src/car/car.js` | Bilkonfiguratorn: bil, fyra hjul, fälg- och lackbyten, fjädring, 100 km/h-läge |
| `scripts/build.mjs` | Bäddar in typsnitt, CSS, 3D-bundle och app-script i `dist/index.html` |
| `scripts/dev.mjs` | Lokal förhandsvisning med ombyggnad vid ändring |
| `tests/smoke.py` | Går igenom regskanning, bokning, köp och verkstadsvyn |
| `docs/PROJECT.md` | Kunden, problemet, målet och öppna frågor |
| `docs/ROADMAP.md` | Faserna från demo till skarp drift |

## Så hänger 3D-scenen ihop med sidan

`app.js` äger *var* hjulet ska vara. Varje bildruta frågar `wheel.js` efter en
**pose** via `pose()`: position och storlek i skärmpixlar, vinkel, hur isärplockat
hjulet är, ljustemperatur, snö och golv. `wheel.js` glider mjukt mot den posen.
Vill du ändra en kameraåkning ändrar du alltså siffror i `pose()`, inte i 3D-koden.

Det `wheel.js` exponerar:

| Anrop | Gör |
| --- | --- |
| `setFinish(namn)` | Byter fälgfärg: `silver`, `black`, `red`, `orange` |
| `setSeason(namn)` | Byter mönster: `sommar`, `friktion`, `dubb` (dubbarna poppar ut) |
| `setText(text)` | Skriver text på däcksidan |
| `scan(callback)` | Lasersvep över däcket, anropar callback när det är klart |
| `project(namn)` | Skärmposition för `tread`, `sidewall` eller `rim` (hotspots och brickor) |
| `rev(true/false)` | Burnout medan man håller in |

## Data

All data ligger i `app.js` (`SERVICES`, `PRODUCTS`, `seed()`), och sparas per
webbläsare i `localStorage`. Det finns ingen backend. Se `docs/ROADMAP.md`.

## Publicera

`dist/index.html` är hela sajten. Den kan läggas på vilken statisk värd som helst.
Workflowen *Deploy to GitHub Pages* körs manuellt under Actions när Pages är
påslaget för repot (Settings → Pages → Source: GitHub Actions).

Sidan har `noindex` så att demon inte dyker upp som NK:s riktiga sajt i Google.
Ta bort den raden i `src/index.html` först när sajten är skarp.

## Rättigheter

Byggd för NK Bil & Däck AB. Alla rättigheter förbehållna.
