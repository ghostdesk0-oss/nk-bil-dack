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
npm run check    # projektets regler, snabbt
npm run test:engine  # bokningsmotorn, en sekund
npm test         # bygg, regler, motorn och stresstestet i headless Chromium (kräver Python + Playwright)
```

Röktestet behöver `pip install playwright && playwright install chromium`.

## Struktur

| Sökväg | Innehåll |
| --- | --- |
| `src/index.html` | Sidans markup, med platshållare för stil och script |
| `src/styles.css` | All CSS. Färger och rörelse ligger som variabler överst i `:root` |
| `src/engine.js` | Bokningsmotorn: öppettider, lediga tider, två lyftar, validering, bokningar, varukorg, ordrar, sparad data |
| `src/app.js` | Kundsidan: regskanning, 3D-hjulets rörelser, prislista, däckshop, däckhotell, bokningsfönstret |
| `src/admin.js` | Verkstaden: dagens läge, lyftarna, jobbkort, bokningar, däckhotell, kunder, ordrar, lager, logg |
| `src/wheel/wheel.js` | 3D-hjulet i hero och scroll-berättelsen: golv med spegling, dimma, snö, dubbar, laser |
| `scripts/build.mjs` | Bäddar in typsnitt, CSS, 3D-bundle och app-script i `dist/index.html` |
| `scripts/dev.mjs` | Lokal förhandsvisning med ombyggnad vid ändring |
| `tests/engine.test.mjs` | Enhetstester och slumptest av bokningsmotorn (krockar, stängning, natten) |
| `tests/smoke.py` | Stresstest i webbläsaren: alla flöden, två flikar, utan WebGL, mobil och desktop |
| `AGENTS.md` | Regler för AI-agenter (Claude, Codex, Cursor). `CLAUDE.md` importerar den |
| `docs/AI-WORKFLOW.md` | Hur projektet lär sig av fel, feedback och granskningar |
| `docs/LESSONS.md` | Misstag som redan gjorts, och hur de stoppas |
| `docs/decisions/` | Varför saker är som de är |
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

Katalog, öppettider och exempeldata ligger i `src/engine.js` (`SERVICES`, `PRODUCTS`, `seed()`).
Allt sparas per webbläsare i `localStorage` under `nk-demo-v7`. Kundernas bokningar finns kvar
över natten; bara exempelveckan ritas om. Det finns ingen backend. Se `docs/ROADMAP.md`.

## Publicera

`dist/index.html` är hela sajten. Den kan läggas på vilken statisk värd som helst.
Workflowen *Deploy to GitHub Pages* publicerar automatiskt vid varje push till `main`.

Sidan har `noindex` så att demon inte dyker upp som NK:s riktiga sajt i Google.
Ta bort den raden i `src/index.html` först när sajten är skarp.

## Rättigheter

Byggd för NK Bil & Däck AB. Alla rättigheter förbehållna.
