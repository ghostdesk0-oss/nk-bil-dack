"""End-to-end smoke test. Builds nothing itself: run `npm run build` first.

    pip install playwright && playwright install chromium
    python3 tests/smoke.py

Walks the customer flow (reg scan, season switch, booking, shop checkout)
and the workshop view at phone size, and fails on any page error.
"""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / "dist" / "index.html").as_uri()
SHOTS = ROOT / "tests" / "shots"
GL = ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]


async def main():
    SHOTS.mkdir(exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(args=GL)
        pg = await b.new_page(viewport={"width": 390, "height": 760}, has_touch=True, is_mobile=True)
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        js = pg.evaluate
        await pg.goto(URL)
        await pg.wait_for_timeout(3500)
        await pg.screenshot(path=SHOTS / "01-hero.png")

        # reg-nummer scan -> result card -> booking with the plate prefilled
        await pg.fill("#heroReg", "abc123")
        await js("document.querySelector('#plateform button').click()")
        await pg.wait_for_selector("#gcard.on", timeout=60000)
        await pg.screenshot(path=SHOTS / "02-scan.png")
        await js("document.querySelector('[data-act=scanbook]').click()")
        await pg.wait_for_selector(".slot:not([disabled])")
        await js("document.querySelector('.slot:not([disabled])').click()")
        await pg.wait_for_selector(".picked")
        await pg.click("[data-act=next]")
        await pg.fill("#fName", "Test Person")
        await pg.fill("#fPhone", "0701740699")
        await pg.click("[data-act=next]")
        await pg.wait_for_selector("[data-act=toadmin]")
        assert await js("document.querySelectorAll('.nut').length") == 5
        await pg.screenshot(path=SHOTS / "03-booked.png")

        # workshop view shows the new booking
        await pg.click("[data-act=toadmin]")
        await pg.wait_for_selector("#tabs button", timeout=60000)
        await js("document.querySelector('[data-act=tab][data-v=idag]').click()")
        await pg.wait_for_selector("#amain .brief", timeout=60000)
        assert await js("document.querySelectorAll('.blk').length") >= 1
        # error log: an uncaught error shows up in Verkstaden -> Logg with an issue link
        await js("setTimeout(function(){throw new Error('smoke-test-error')},0)")
        await pg.wait_for_timeout(200)
        for tab in ["idag", "kunder", "hotell", "ordrar", "lager", "logg", "bokningar"]:
            if tab == "logg":
                await js("document.querySelector('[data-act=tab][data-v=logg]').click()")
                await pg.wait_for_selector("#amain a[href*='issues/new?template=bug.yml']", timeout=60000)
                continue
            await js(f"document.querySelector('[data-act=tab][data-v={tab}]').click()")
            await pg.wait_for_timeout(350)
        await pg.screenshot(path=SHOTS / "04-workshop.png")

        # season switch drives the shop, then checkout with fitting
        await pg.click("[data-view=site]")
        await pg.wait_for_function("!document.getElementById('site').hidden", timeout=60000)
        await pg.wait_for_timeout(500)
        await js("document.querySelector('#dack [data-act=season][data-v=dubb]').click()")
        await pg.wait_for_timeout(400)
        assert await js("document.querySelectorAll('#tyres .tcard').length") >= 1
        await js("document.querySelector('[data-act=add]').click()")
        assert await js("document.getElementById('cartn').textContent") == "4"
        await js("document.getElementById('barMain').click()")
        await pg.wait_for_selector("#fFit")
        await pg.click("[data-act=next]")
        await pg.wait_for_selector(".slot:not([disabled])")
        await js("document.querySelector('.slot:not([disabled])').click()")
        await pg.click("[data-act=next]")
        await pg.fill("#fName", "Annan Person")
        await pg.fill("#fPhone", "0701740698")
        await pg.click("[data-act=next]")
        await pg.wait_for_selector("[data-act=toadmin]")
        await pg.click("#sheet .x")
        await pg.wait_for_timeout(400)
        assert await js("document.documentElement.style.overflow") == ""

        # car configurator: swap rim and paint, book from the action bar
        await js("document.querySelector('[data-act=ccat][data-v=falg]').click()")
        await js("document.querySelector('[data-act=copt][data-v=black]').click()")
        assert "Black Edition" in await js("document.getElementById('csel').textContent")
        await js("document.querySelector('[data-act=cfgbook]').click()")
        await pg.wait_for_selector(".cfgsum")
        await pg.fill("#fReg", "xyz12a")
        await pg.click("[data-act=next]")
        await pg.wait_for_selector(".slot:not([disabled])")
        await js("document.querySelector('.slot:not([disabled])').click()")
        await pg.click("[data-act=next]")
        await pg.fill("#fName", "Tredje Person")
        await pg.fill("#fPhone", "0701740697")
        await pg.click("[data-act=next]")
        await pg.wait_for_selector("[data-act=toadmin]")
        await pg.click("#sheet .x")
        await pg.wait_for_timeout(400)

        # tyre-hotel builder
        await js("document.querySelector('#hotelOpts input[data-x=wash]').click()")
        await pg.wait_for_timeout(700)
        assert "1 045" in (await js("document.getElementById('hotelPrice').textContent")).replace(" ", " ")

        await b.close()
        errs = [e for e in errs if "smoke-test-error" not in e]
        if errs:
            print("PAGE ERRORS:", *errs, sep="\n  ")
            sys.exit(1)
        print("smoke test passed")


asyncio.run(main())
