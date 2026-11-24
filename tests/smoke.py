"""Browser stress test. Builds nothing itself: run `npm run build` first (npm test does).

    pip install playwright && playwright install chromium
    python3 tests/smoke.py            all suites
    python3 tests/smoke.py workshop   one suite

The shop clock is pinned to Monday 23 November 2026, 10:00 in Gävle, so the example week is the same
on every run. Each suite drives the real UI and then checks the saved state, not just the screen.
Audits on every main screen: no horizontal overflow, no undefined/NaN on screen, no English UI words,
44 px tap targets, and an empty error log.
"""
import asyncio, json, pathlib, re, sys
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / "dist" / "index.html").as_uri()
SHOTS = ROOT / "tests" / "shots"
GL = ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
KEY = "nk-demo-v7"
MON_10 = "2026-11-23T09:00:00Z"   # Monday 10:00 Stockholm
TUE_07 = "2026-11-24T06:00:00Z"   # Tuesday 07:00 Stockholm
PHONE = {"viewport": {"width": 390, "height": 844}, "has_touch": True, "is_mobile": True, "accept_downloads": True}
DESK = {"viewport": {"width": 1440, "height": 900}, "accept_downloads": True}
ENGLISH = re.compile(r"\b(Submit|Cancel|Next|Back|Close|Loading|Error|Search|Cart|Total|Checkout|Continue|Remove|Book now|Add to|Settings|undefined|NaN|null|\[object)\b")
T = 20000
# software WebGL is slow; suites that test data flows across several pages run without it
NOGL = "const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, o) { return /webgl/.test(t) ? null : g.call(this, t, o); };"


def ok(cond, msg):
    if not cond:
        raise AssertionError(msg)


async def page(ctx, when=MON_10, errors=None):
    pg = await ctx.new_page()
    errs = errors if errors is not None else []
    pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
    pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" else None)
    await pg.clock.set_fixed_time(when)
    await pg.goto(URL)
    await pg.wait_for_function("!!window.NK && !!window.NKAdmin")
    pg.errs = errs
    return pg


async def state(pg):
    return await pg.evaluate(f"JSON.parse(localStorage.getItem('{KEY}'))")


async def engine(pg, js):
    """Run engine code against the latest saved state and save it, like another tab would."""
    return await pg.evaluate("(() => { const E = NK.E, now = NK.now(); NK.store.fresh(); const S = NK.S; const out = (() => { " + js + " })(); NK.store.save(); return JSON.parse(JSON.stringify(out || null)); })()")


async def audit(pg, label):
    r = await pg.evaluate("""() => {
      const W = document.documentElement.clientWidth, vis = (el) => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.opacity !== '0' && !el.closest('[hidden],[inert]'); };
      const txt = document.body.innerText;
      const small = [];
      document.querySelectorAll('button, a.btn, input:not([type=checkbox]), select, .ck').forEach((el) => {
        if (!vis(el) || el.closest('p') || el.matches('.nm, .hs, [disabled]')) return;
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        const w = el.offsetWidth || r.width, h = el.offsetHeight || r.height;  // layout size: a press animation may be scaling it
        if (h < 43.5 || (w < 43.5 && !el.matches('.linkb'))) small.push((el.className || el.tagName) + ' "' + (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().slice(0, 24) + '" ' + Math.round(w) + 'x' + Math.round(h));
      });
      return { sw: document.documentElement.scrollWidth, W, txt, small, errs: (window.NKErr ? NKErr.list() : []).map((e) => e.m) };
    }""")
    ok(r["sw"] <= r["W"], f"[{label}] horizontal overflow: {r['sw']} > {r['W']}")
    m = ENGLISH.search(r["txt"])
    ok(not m, f"[{label}] English or broken text on screen: '{m.group(0) if m else ''}'")
    ok(not r["small"], f"[{label}] tap targets under 44 px: {r['small'][:6]}")
    ok(not r["errs"], f"[{label}] error log: {r['errs']}")
    ok(not pg.errs, f"[{label}] page errors: {pg.errs}")


async def settle(pg):
    """Before a screenshot: let finite animations and view transitions finish (looping pings are ignored)."""
    await pg.wait_for_function("document.getAnimations().every((a) => a.playState !== 'running' || (a.effect && a.effect.getComputedTiming().iterations === Infinity))", timeout=T)


async def sheet_closed(pg):
    await pg.wait_for_function("!document.querySelector('#scrim').classList.contains('on')", timeout=T)


async def pick_first(pg):
    """In the time step: take the 'first free' shortcut, or the first open slot."""
    if await pg.locator(".sbody [data-act=first]").count():
        await pg.click(".sbody [data-act=first]")
    else:
        await pg.click(".slot:not([disabled])")
    await pg.wait_for_selector(".slot[aria-pressed=true]", timeout=T)


async def suite_customer(b):
    """Phone: plate scan, book in one tap, validation, double submit, calendar file, move, cancel, back button."""
    ctx = await b.new_context(**PHONE)
    pg = await page(ctx)
    await pg.wait_for_selector(".hero h1")
    ok(await pg.locator('meta[name=robots][content*=noindex]').count() == 1, "noindex is missing")
    ok("Förhandsvisning" in await pg.inner_text(".demo"), "preview strip is missing")
    ok(await pg.locator("#car, .cfg-sec").count() == 0, "the car configurator is still on the page")
    await settle(pg)
    await pg.screenshot(path=SHOTS / "01-hero.png")
    await audit(pg, "hero")

    # plate: bad input explains itself, good input scans and fills the shop
    await pg.fill("#heroReg", "1")
    await pg.press("#heroReg", "Enter")
    await pg.wait_for_function("document.querySelector('#heroErr').textContent.includes('ABC 123')", timeout=T)
    await pg.fill("#heroReg", "abc123")
    await pg.click("#plateform button")
    await pg.wait_for_selector("#gcard.on", timeout=60000)
    card = await pg.inner_text("#gcard")
    ok("ABC 123" in card and re.search(r"\d{3}/\d{2} R\d{2}", card), f"scan card: {card}")
    ok(await pg.is_visible("#sizeNote"), "the shop does not show the size from the plate")
    await settle(pg)
    await pg.screenshot(path=SHOTS / "02-scan.png")

    # one tap from the scan card straight to the last step
    await pg.click("#gcard [data-act=book]")
    await pg.wait_for_selector("#fName")
    ok(await pg.inner_text("#sheetSub") == "Steg 3 av 3", "scan booking should open at the details step")
    summary = await pg.inner_text(".sum")
    ok("ABC 123" in summary and "idag 10:30" in summary, f"summary: {summary}")
    await pg.click(".sfoot [data-act=next]")
    await pg.wait_for_selector("#err-name")
    ok(await pg.evaluate("document.activeElement.id") == "fName", "focus should move to the first bad field")
    await pg.fill("#fName", "Testa Testsson")
    await pg.fill("#fPhone", "123")
    await pg.click(".sfoot [data-act=next]")
    await pg.wait_for_selector("#err-phone")
    await pg.fill("#fPhone", "+46 70 123 45 67")
    await pg.fill("#fEmail", "fel@")
    await pg.click(".sfoot [data-act=next]")
    await pg.wait_for_selector("#err-email")
    await pg.fill("#fEmail", "")
    await audit(pg, "details step")
    n0 = len((await state(pg))["bookings"])
    await pg.evaluate("() => { const b = document.querySelector('.sfoot [data-act=next]'); b.click(); b.click(); b.click(); }")
    await pg.wait_for_selector(".sbody .done")
    s = await state(pg)
    ok(len(s["bookings"]) == n0 + 1, f"triple tap made {len(s['bookings']) - n0} bookings")
    mine = s["bookings"][-1]
    ok(mine["reg"] == "ABC 123" and mine["time"] == "10:30" and mine["date"] == "2026-11-23" and mine["status"] == "Ny", f"saved booking: {mine}")
    ok(next(c for c in s["customers"] if c["id"] == mine["custId"])["phone"] == "070-123 45 67", "phone was not normalised")
    ok(await pg.inner_text(".ref") == mine["id"], "reference on screen differs from the saved one")
    await settle(pg)
    await pg.screenshot(path=SHOTS / "03-booked.png")

    async with pg.expect_download() as dl:
        await pg.click("[data-act=ics]")
    d = await dl.value
    raw = pathlib.Path(await d.path()).read_bytes()
    ics = raw.decode("utf-8")
    ok(d.suggested_filename == f"NK-bokning-{mine['id']}.ics", d.suggested_filename)
    ok("DTSTART:20261123T093000Z" in ics and "Brynäsgatan 67" in ics and raw.count(b"\r\n") == raw.count(b"\n"), "calendar file content: " + repr(ics[:500]))

    # my bookings: move it, then cancel it
    await pg.click(".dacts [data-act=mine]")
    await pg.wait_for_selector(".mcard")
    ok(mine["id"] in await pg.inner_text(".mlist"), "my booking is not listed")
    await pg.click(".mcard [data-act=move]")
    await pg.wait_for_selector(".slots")
    await pg.click('.day[data-v="2026-11-25"]')
    await pg.click('.slot[data-v="13:00"]:not([disabled]), .slot:not([disabled])')
    await pg.click(".sfoot [data-act=next]")
    await pg.wait_for_selector(".sbody .done")
    moved = next(x for x in (await state(pg))["bookings"] if x["id"] == mine["id"])
    ok(moved["date"] == "2026-11-25", f"move did not save: {moved}")
    await pg.click(".dacts [data-act=mine]")
    await pg.wait_for_selector(".mcard [data-act=askcancel]")
    await pg.click(".mcard [data-act=askcancel]")
    await pg.wait_for_selector(".confirm")
    await audit(pg, "cancel confirm")
    await pg.click("[data-act=docancel]")
    await pg.wait_for_function(f"!document.querySelector('.mlist') || !document.querySelector('.mlist').innerText.includes('{mine['id']}')", timeout=T)
    ok(next(x for x in (await state(pg))["bookings"] if x["id"] == mine["id"])["status"] == "Avbokad", "cancel did not save")

    # the phone's back button closes the sheet instead of leaving the page; Escape too
    await pg.click(".sfoot [data-act=close]")
    await sheet_closed(pg)
    await pg.evaluate("document.querySelector('#board .row').click()")
    await pg.wait_for_selector("#scrim.on")
    await pg.go_back()
    await sheet_closed(pg)
    ok(pg.url.startswith(URL), "back left the page")
    await pg.click("#barMain")
    await pg.wait_for_selector("#scrim.on")
    await pg.keyboard.press("Escape")
    await sheet_closed(pg)

    # every row on the price board opens its own service; today never offers a passed time
    for sid in ["skifte", "punktering", "montering", "hotell", "hjulinst", "lyktor", "ac", "olja", "nyadack", "verkstad"]:
        await pg.evaluate(f"document.querySelector('#board [data-svc={sid}]').click()")
        await pg.wait_for_selector("#scrim.on .sbody")
        if await pg.locator(".sbody .opt").count():
            ok(await pg.get_attribute(f".opt[data-v={sid}]", "aria-checked") == "true", f"{sid} not preselected")
        else:
            await pg.click(".sfoot [data-act=back]")
            await pg.wait_for_selector(f".opt[data-v={sid}][aria-checked=true]")
        await pg.keyboard.press("Escape")
        await sheet_closed(pg)
    await pg.evaluate("document.querySelector('#board [data-svc=skifte]').click()")
    await pg.wait_for_selector(".slots")
    await pg.click('.day[data-v="2026-11-23"]')
    times = await pg.eval_on_selector_all(".slot", "els => els.map((e) => e.dataset.v)")
    ok(times and min(times) >= "10:30", f"passed times offered today: {times[:3]}")
    await pg.click('.day[data-v="2026-11-24"]')
    await pick_first(pg)
    await audit(pg, "time step")
    await pg.keyboard.press("Escape")
    await sheet_closed(pg)
    await pg.close()
    await ctx.close()


async def suite_shop(b):
    """Phone: size picker, seasons, cart limits, order with and without fitting, tyre hotel extras, reload."""
    ctx = await b.new_context(**PHONE)
    pg = await page(ctx)
    await pg.evaluate("document.querySelector('#dack').scrollIntoView()")
    await pg.click("[data-act=step][data-k=w][data-d='1']")
    await pg.wait_for_function("document.querySelector('#size').innerText.replace(/\\s/g,'').startsWith('215/55R16')", timeout=T)
    await pg.click("#dack [data-act=season][data-v=dubb]")
    await pg.wait_for_function("[...document.querySelectorAll('#tyres .tcard')].every((c) => c.innerText.includes('dubbat'))", timeout=T)
    ok(await pg.get_attribute("#story [data-act=season][data-v=dubb]", "aria-pressed") == "true", "season switches are not in sync")
    await settle(pg)
    await pg.screenshot(path=SHOTS / "04-shop.png")
    await audit(pg, "shop")
    add = "#tyres .tcard:first-child [data-act=add]"
    for want in ["4", "8", "8"]:
        await pg.click(add)
        await pg.wait_for_function(f"document.querySelector('#cartn').textContent === '{want}'", timeout=T)
    await pg.wait_for_function("document.querySelector('#toast').textContent.includes('Max 8')", timeout=T)
    await pg.click("#barMain")
    await pg.wait_for_selector(".citem")
    await pg.click(".citem [data-act=qty][data-d='-1']")
    await pg.wait_for_function("document.querySelector('#cartn').textContent === '7'", timeout=T)
    await pg.click(".citem [data-act=rm]")
    await pg.wait_for_selector(".sbody .empty")
    await pg.click("[data-act=toshop]")
    await sheet_closed(pg)

    # order with fitting: time and plate are required, stock goes down, the workshop gets a booking
    await pg.click("#dack [data-act=season][data-v=friktion]")
    await pg.click(add)
    await pg.wait_for_function("document.querySelector('#cartn').textContent === '4'", timeout=T)
    item = (await state(pg))["cart"][0]
    key = item["pid"] + "|" + item["dim"]
    stock0 = await pg.evaluate(f"NK.E.stockOf(NK.S, {json.dumps(key)})")  # stock is generated lazily per size
    await pg.click("#barMain")
    await pg.click(".sfoot [data-act=next]")
    await pg.wait_for_selector(".slots")
    await pg.click(".sfoot [data-act=next]")
    await pg.wait_for_selector("#err-time")
    await pick_first(pg)
    await pg.click(".sfoot [data-act=next]")
    # payment step: pay on site is preselected, Swish is an example that moves no money
    await pg.wait_for_selector(".pays")
    ok(await pg.get_attribute(".pays [data-v=plats]", "aria-checked") == "true", "pay on site is not the default")
    await audit(pg, "payment step")
    await pg.click(".pays [data-v=swish]")
    await pg.wait_for_selector(".pays [data-v=swish][aria-checked=true]")
    await pg.click(".sfoot [data-act=next]")
    await pg.wait_for_selector("#fReg")
    ok("Betala" in await pg.inner_text(".sfoot [data-act=next]"), "pay button label")
    await pg.fill("#fReg", "")
    await pg.fill("#fName", "Order Testsson")
    await pg.fill("#fPhone", "0731234567")
    await pg.click(".sfoot [data-act=next]")
    await pg.wait_for_selector("#err-reg")
    await pg.fill("#fReg", "kpl 12a")
    await pg.click(".sfoot [data-act=next]")
    await pg.wait_for_selector(".sbody .paybox")
    await audit(pg, "swish approval")
    ok((await state(pg))["orders"][0]["paid"] is False, "order paid before approval")
    await pg.click("[data-act=paynow]")
    await pg.wait_for_selector(".sbody .done .paid")
    s = await state(pg)
    order = s["orders"][0]
    ok(order["pay"] == "swish" and order["paid"] is True, f"payment not recorded: {order}")
    ok(order["id"].startswith("W-") and order["fit"] and order["bookingId"], f"order: {order}")
    bk = next(x for x in s["bookings"] if x["id"] == order["bookingId"])
    ok(bk["svc"] == "montering" and bk["reg"] == "KPL 12A" and bk["note"].startswith("Webborder"), f"fitting booking: {bk}")
    ok(s["stock"][key] == max(0, stock0 - 4) and s["cart"] == [], "stock or cart not updated")
    await pg.click(".sfoot [data-act=close]")
    await sheet_closed(pg)

    # order without fitting skips the time step and asks for no plate
    await pg.click(add)
    await pg.click("#barMain")
    await pg.uncheck("#fFit")
    await pg.click(".sfoot [data-act=next]")
    await pg.wait_for_selector(".pays")
    await pg.click(".sfoot [data-act=next]")
    await pg.wait_for_selector("#fName")
    ok(await pg.locator("#fReg").count() == 0, "pickup order asks for a plate")
    await pg.click(".sfoot [data-act=next]")
    await pg.wait_for_selector(".sbody .done")
    ok("hör av oss" in await pg.inner_text(".sbody .done"), "pickup confirmation text")
    await pg.click(".sfoot [data-act=close]")
    await sheet_closed(pg)

    # tyre hotel: extras change the price and travel into the booking
    await pg.evaluate("document.querySelector('#hotell').scrollIntoView()")
    await pg.click("#hotelOpts label:nth-child(2)")
    await pg.click("#hotelOpts label:nth-child(3)")
    await pg.wait_for_function("document.querySelector('#hotelPrice').textContent.replace(/\\s/g,'') === '1345kr'", timeout=T)
    await audit(pg, "tyre hotel")
    await pg.click("[data-act=bookhotel]")
    await pg.wait_for_selector("#scrim.on .sbody")
    if await pg.locator(".slots").count():
        await pick_first(pg)
        await pg.click(".sfoot [data-act=next]")
    await pg.wait_for_selector(".sum")
    summ = await pg.inner_text(".sum")
    ok("Hjultvätt" in summ and "Balansering" in summ and "1 345" in summ.replace(" ", " "), f"hotel summary: {summ}")
    await pg.click(".sfoot [data-act=next]")
    await pg.wait_for_selector(".sbody .done")
    hb = [x for x in (await state(pg))["bookings"] if x["svc"] == "hotell" and x.get("own")][-1]
    ok(len(hb["extras"]) == 2, f"extras not saved: {hb}")
    await pg.click(".sfoot [data-act=close]")
    await sheet_closed(pg)

    # everything survives a reload; my bookings finds them by phone
    await pg.click(add)
    await pg.reload()
    await pg.wait_for_function("!!window.NK")
    ok(await pg.inner_text("#cartn") == "4", "cart lost on reload")
    await pg.click(".top [data-act=mine]")
    await pg.wait_for_selector("#mineForm")
    await pg.fill("#fPhone", "073-123 45 67")
    await pg.click("#mineForm button")
    await pg.wait_for_selector(".mcard")
    ok(await pg.locator(".mcard").count() >= 2, "my bookings misses the fitting and the hotel booking")
    await pg.fill("#fPhone", "0709999999")
    await pg.click("#mineForm button")
    await pg.wait_for_selector(".sbody .empty")
    await pg.keyboard.press("Escape")
    await sheet_closed(pg)
    await pg.close()
    await ctx.close()


async def suite_two_tabs(b):
    """Two tabs on one device: a slot taken in one tab can never be booked twice in the other."""
    ctx = await b.new_context(**PHONE)
    await ctx.add_init_script(NOGL)
    a = await page(ctx)
    bb = await page(ctx)
    slot = await engine(a, "const d = '2026-11-24'; const f = E.slots(S, d, 30, now).find((x) => x.state === 'free' && !E.load(S, d)[E.toMin(x.t)]); return f.t;")
    # tab A gets to the last step with that slot
    await a.evaluate("document.querySelector('#board [data-svc=skifte]').click()")
    await a.wait_for_selector(".sbody")
    if await a.locator("#fReg").count():
        await a.fill("#fReg", "TAB 001")
        await a.click(".sfoot [data-act=next]")
    await a.wait_for_selector(".slots")
    await a.click('.day[data-v="2026-11-24"]')
    await a.click(f'.slot[data-v="{slot}"]')
    await a.click(".sfoot [data-act=next]")
    await a.wait_for_selector("#fName")
    await a.fill("#fName", "Flik A")
    await a.fill("#fPhone", "0701111111")
    # tab B fills both lifts at that time
    await engine(bb, f"['0702222222','0703333333'].forEach((p, i) => E.book(S, {{ svc: 'skifte', reg: 'TAB 00' + (i + 2), date: '2026-11-24', time: '{slot}', name: 'Flik B', phone: p }}, now));")
    await a.click(".sfoot [data-act=next]")
    await a.wait_for_selector("#err-time")
    ok("hann bli tagen" in await a.inner_text("#err-time"), "no 'taken' message")
    ok(await a.locator(f'.slot[data-v="{slot}"][disabled]').count() == 1, "the taken slot is still offered")
    s = await state(a)
    ok(sum(1 for x in s["bookings"] if x["date"] == "2026-11-24" and x["time"] == slot and x["status"] != "Avbokad") == 2, "slot was double-booked")
    # while A looks at the time grid, a slot B fills goes grey without a reload
    other = await a.evaluate("[...document.querySelectorAll('.slot:not([disabled])')].map((e) => e.dataset.v).find((t) => t !== '" + slot + "')")
    await engine(bb, f"['0704444444','0705555555'].forEach((p, i) => E.book(S, {{ svc: 'skifte', reg: 'TAB 01' + i, date: '2026-11-24', time: '{other}', name: 'Flik B', phone: p }}, now));")
    await a.wait_for_selector(f'.slot[data-v="{other}"][disabled]', timeout=T)
    # Verkstaden in tab B sees tab A's booking without a reload
    await bb.evaluate("NK.setView('admin')")
    await bb.wait_for_selector("#admin .brief")
    await bb.click("#admin [data-a=tab][data-v=bokningar]")
    await bb.click("#admin [data-a=filter][data-v=kommande]")
    await a.click(".slot:not([disabled])")
    await a.click(".sfoot [data-act=next]")
    await a.wait_for_selector("#fName")
    await a.click(".sfoot [data-act=next]")
    try:
        await a.wait_for_selector(".sbody .done")
    except Exception:
        raise AssertionError("no confirmation: " + (await a.inner_text("#sheet")).replace("\n", " | ")[:400])
    await bb.wait_for_function("document.querySelector('#admin').innerText.includes('Flik A')", timeout=T)
    # staff half-way through a phone booking keep their text when a web booking lands (L-016)
    await bb.click("#admin [data-a=new]")
    await bb.fill("#staffForm [name=name]", "Halvskriven")
    await bb.focus("#staffForm [name=phone]")
    await bb.keyboard.type("070")
    r = await engine(a, "const f = E.slots(S, '2026-11-25', 30, now).find((x) => x.state === 'free'); return E.book(S, { svc: 'skifte', reg: 'TAB 099', date: '2026-11-25', time: f.t, name: 'Sen Webbkund', phone: '0709999990' }, now).ok;")
    ok(r, "could not book TAB 099")
    await bb.wait_for_function("document.querySelector('#admin').innerText.includes('TAB 099')", timeout=T)
    ok(await bb.input_value("#staffForm [name=name]") == "Halvskriven", "a live update wiped the staff form")
    ok(await bb.evaluate("document.activeElement.name") == "phone", "a live update stole focus")
    await bb.keyboard.type("1234567")
    ok(await bb.input_value("#staffForm [name=phone]") == "0701234567", "caret moved during the live update")
    await a.close(); await bb.close(); await ctx.close()


async def suite_night(b):
    """Overnight: example data is regenerated around the new day, what customers booked is kept."""
    ctx = await b.new_context(**PHONE)
    await ctx.add_init_script(NOGL)
    pg = await page(ctx)
    r = await engine(pg, "return E.book(S, { svc: 'hjulinst', reg: 'NAT 777', date: '2026-11-25', time: '09:00', name: 'Natt Test', phone: '0767777777' }, now).booking.id;")
    await pg.close()
    pg = await page(ctx, TUE_07)
    s = await state(pg)
    ok(s["seedDay"] == "2026-11-24", "no new example day")
    ok(any(x["id"] == r for x in s["bookings"]), "customer booking lost overnight")
    ok(not any(x["date"] < "2026-11-24" and not x.get("own") for x in s["bookings"]), "yesterday's example bookings remain")
    ok("Öppet nu" in await pg.inner_text("#openNow"), "07:00 Tuesday should read open")
    await pg.close(); await ctx.close()


async def suite_workshop(b, opts, tag):
    """Verkstaden: brief, confirm, lifts, tread warning, checklist, sms, phone booking, drop-in queue, move,
    cancel, tyre hotel, customers, orders, stock, auto-confirm, guide, reset."""
    ctx = await b.new_context(**opts)
    pg = await page(ctx)
    web = await engine(pg, "return E.book(S, { svc: 'skifte', reg: 'WEB 123', date: now.date, time: '15:00', name: 'Webb Kund', phone: '0761234567' }, now).booking.id;")
    await pg.click(".demo [data-view=admin]")
    await pg.wait_for_selector("#admin .brief")
    brief = await pg.inner_text("#brief")
    ok("nicklas" in brief.lower() and "bokningar" in brief, "brief: " + brief[:160].replace("\n", " | "))
    ok(await pg.locator("#lifts .blk").count() >= 5, "lift timeline is empty")
    ok("Ny från webben" in await pg.inner_text("#confirm"), "web booking is not flagged")
    await settle(pg)
    await pg.screenshot(path=SHOTS / f"10-workshop-{tag}.png")
    await audit(pg, f"workshop {tag}")

    await pg.click(f"#confirm .job[data-id='{web}'] [data-a=adv]")
    await pg.wait_for_function(f"!document.querySelector('#confirm .job[data-id=\"{web}\"]')", timeout=T)
    ok(next(x for x in (await state(pg))["bookings"] if x["id"] == web)["status"] == "Bekräftad", "confirm did not save")

    # job details: lifts, tread depth warning, checklist, finish with sms
    j = f"#jobs .job[data-id='{web}']"
    await pg.click(f"{j} [data-a=toggle]")
    await pg.wait_for_selector(f"{j} .jx")
    # make sure the other lift is busy at the same time, then try to move the job onto it
    clash = await engine(pg, f"""const w = E.byId(S, '{web}'), other = w.lift === 1 ? 2 : 1, s0 = E.toMin(w.time), e0 = s0 + w.mins;
      const busy = S.bookings.some((o) => o.id !== w.id && o.status !== 'Avbokad' && o.date === w.date && o.lift === other && E.toMin(o.time) < e0 && E.toMin(o.time) + o.mins > s0);
      if (!busy) {{ const r = E.book(S, {{ svc: 'skifte', reg: 'LFT 222', date: w.date, time: w.time, name: 'Lyft Test', phone: '0762222222' }}, now, {{ staff: true, force: true }}); E.setLift(S, r.booking.id, 0); E.setLift(S, r.booking.id, other); }}
      return other;""")
    await pg.evaluate("NKAdmin.render(true)")
    await pg.click(f"{j} [data-a=lift][data-v='{clash}']")
    await pg.wait_for_function("document.querySelector('#toast').textContent.includes('upptagen')", timeout=T)
    for _ in range(7):
        await pg.click(f"{j} [data-a=tread][data-d='-0.5']")
    await pg.wait_for_selector(f"{j} .flag.bad")
    await pg.click(f"{j} [data-a=chk][data-v=bal]")
    await pg.wait_for_selector(f"{j} [data-a=chk][data-v=bal][aria-pressed=true]")
    await pg.fill(f"{j} textarea", "Spik i vänster bak")
    await audit(pg, f"job details {tag}")
    await pg.click(f"{j} [data-a=adv]")
    await pg.wait_for_selector(f"{j} .pill.s-Pågår")
    await pg.click(f"{j} [data-a=adv]")
    await pg.wait_for_function("document.querySelector('#toast').textContent.startsWith('Sms till')", timeout=T)
    saved = next(x for x in (await state(pg))["bookings"] if x["id"] == web)
    ok(saved["status"] == "Klar" and saved["sms"] and saved["tread"] == 2.5 and saved["checks"]["bal"] and saved.get("wnote") == "Spik i vänster bak", f"job not saved: {saved}")

    # phone booking: validation, then saved with a lift
    await pg.click("#brief [data-a=new]")
    await pg.wait_for_selector("#staffForm")
    await pg.click("#staffForm [type=submit]")
    await pg.wait_for_selector(".aerr")
    await pg.fill("#staffForm [name=reg]", "tel 555")
    await pg.fill("#staffForm [name=name]", "Telefon Kund")
    await pg.fill("#staffForm [name=phone]", "026-12 34 56")
    await pg.select_option("#staffForm [name=date]", "2026-11-26")
    await pg.select_option("#staffForm [name=svc]", "hjulinst")
    await pg.wait_for_selector("#staffForm [name=time] option[value='08:00']", state="attached")
    await pg.select_option("#staffForm [name=time]", "08:00")
    await audit(pg, f"staff form {tag}")
    await pg.click("#staffForm [type=submit]")
    await pg.wait_for_function("document.querySelector('#toast').textContent.includes('TEL 555')", timeout=T)
    tb = [x for x in (await state(pg))["bookings"] if x["reg"] == "TEL 555"][0]
    ok(tb["status"] == "Bekräftad" and tb["svc"] == "hjulinst" and tb["date"] == "2026-11-26" and tb["lift"] in (1, 2) and tb["src"] == "Telefon", f"phone booking: {tb}")

    # drop-in when both lifts are busy goes to the queue
    await engine(pg, "['0763000001','0763000002'].forEach((p, i) => E.book(S, { svc: 'verkstad', reg: 'FUL 00' + i, date: now.date, time: '10:00', name: 'Full', phone: p }, now, { staff: true, force: true }));")
    await pg.evaluate("NKAdmin.render(true)")
    await pg.click("#brief [data-a=new]")
    await pg.click("#staffForm [data-a=msrc][data-v='Drop-in']")
    await pg.fill("#staffForm [name=reg]", "drp 001")
    await pg.fill("#staffForm [name=name]", "Drop In")
    await pg.fill("#staffForm [name=phone]", "0708888888")
    await pg.select_option("#staffForm [name=svc]", "punktering")
    await pg.click("#staffForm [type=submit]")
    await pg.wait_for_function("document.querySelector('#toast').textContent.includes('upptagna')", timeout=T)
    ok([x for x in (await state(pg))["bookings"] if x["reg"] == "DRP 001"][0]["lift"] == 0, "drop-in should wait in the queue")
    ok(await pg.locator("#lifts .lane").count() == 3, "queue lane missing")

    # move and cancel from the bookings tab
    await pg.click("#admin [data-a=tab][data-v=bokningar]")
    await pg.click("#admin [data-a=filter][data-v=kommande]")
    await pg.fill("#aq", "tel555")
    await pg.wait_for_selector(f".job[data-id='{tb['id']}']")
    if not await pg.locator(f".job[data-id='{tb['id']}'] [data-a=moveb]").count():  # a fresh staff booking opens with details shown
        await pg.click(f".job[data-id='{tb['id']}'] [data-a=toggle]")
    await pg.click(f".job[data-id='{tb['id']}'] [data-a=moveb]")
    await pg.select_option("#staffForm [name=date]", "2026-11-27")
    await pg.wait_for_selector("#staffForm [name=time] option[value='13:00']", state="attached")
    await pg.select_option("#staffForm [name=time]", "13:00")
    await pg.click("#staffForm [type=submit]")
    await pg.wait_for_function("document.querySelector('#toast').textContent.includes('flyttad')", timeout=T)
    await pg.click(f".job[data-id='{tb['id']}'] [data-a=askcancel]")
    await pg.click(f".job[data-id='{tb['id']}'] [data-a=cancel]")
    await pg.wait_for_function("document.querySelector('#toast').textContent.includes('avbokad')", timeout=T)
    tb2 = [x for x in (await state(pg))["bookings"] if x["reg"] == "TEL 555"][0]
    ok(tb2["date"] == "2026-11-27" and tb2["time"] == "13:00" and tb2["status"] == "Avbokad", f"move/cancel: {tb2}")

    # tyre hotel: validation, next free shelf, low tread flag, book a swap
    await pg.fill("#aq", "")
    await pg.click("#admin [data-a=tab][data-v=hotell]")
    await pg.click("[data-a=newhotel]")
    await pg.fill("#hotelForm [name=reg]", "hot 101")
    await pg.fill("#hotelForm [name=name]", "Hotell Gäst")
    await pg.fill("#hotelForm [name=phone]", "0709090909")
    await pg.fill("#hotelForm [name=depth]", "20")
    await pg.click("#hotelForm [type=submit]")
    await pg.wait_for_selector(".aerr")
    await pg.fill("#hotelForm [name=depth]", "2,5")
    await pg.click("#hotelForm [type=submit]")
    await pg.wait_for_function("document.querySelector('#toast').textContent.includes('hylla')", timeout=T)
    row = pg.locator(".lrow", has_text="Hotell Gäst")
    ok("Byt" in await row.inner_text(), "2.5 mm should be flagged")
    await row.locator("[data-a=hotelbook]").click()
    await pg.wait_for_selector("#staffForm")
    ok(await pg.input_value("#staffForm [name=name]") == "Hotell Gäst", "swap form not prefilled")
    await pg.click("#staffForm [type=submit]")
    await pg.wait_for_function("document.querySelector('#toast').textContent.includes('HOT 101')", timeout=T)
    await audit(pg, f"tyre hotel tab {tag}")

    # customers, orders, stock, log
    await pg.click("#admin [data-a=tab][data-v=kunder]")
    await pg.fill("#aq", "hot101")
    await pg.wait_for_function("document.querySelectorAll('#custList .lrow').length === 1", timeout=T)
    await pg.click("#custList [data-a=cust]")
    await pg.wait_for_selector(".kv")
    ok("Hylla" in await pg.inner_text(".kv"), "customer card misses the hotel")
    await pg.click("#admin [data-a=tab][data-v=ordrar]")
    st0 = await pg.inner_text("#admin .panel .lrow:first-child .pill")
    await pg.click("#admin .panel .lrow:first-child [data-a=ostep]")
    await pg.wait_for_function(f"document.querySelector('#admin .panel .lrow:first-child .pill').textContent !== {json.dumps(st0)}", timeout=T)
    await pg.click("#admin [data-a=tab][data-v=lager]")
    k = await pg.get_attribute("#admin [data-a=stock][data-d='1']", "data-k")
    n0 = await pg.evaluate(f"NK.E.stockOf(NK.S, {json.dumps(k)})")
    await pg.click("#admin [data-a=stock][data-d='1']")
    await pg.wait_for_function(f"JSON.parse(localStorage.getItem('{KEY}')).stock[{json.dumps(k)}] === {n0 + 1}", timeout=T)
    await pg.click("#admin [data-a=tab][data-v=logg]")
    await audit(pg, f"log tab {tag}")

    # auto-confirm changes how new web bookings arrive
    await pg.click("#admin [data-a=tab][data-v=idag]")
    await pg.click("#admin .auto")
    await pg.wait_for_function(f"JSON.parse(localStorage.getItem('{KEY}')).auto === true", timeout=T)
    st = await engine(pg, "return E.book(S, { svc: 'skifte', reg: 'AUT 001', date: '2026-11-26', time: '16:00', name: 'Auto', phone: '0761010101' }, now).booking.status;")
    ok(st == "Bekräftad", "auto-confirm ignored")

    # guide walks four steps and closes
    await pg.click("#brief [data-a=tour]")
    for _ in range(4):
        await pg.wait_for_selector(".tour")
        await pg.click(".tour [data-a=tnext]")
    await pg.wait_for_function("!document.querySelector('.tour')", timeout=T)

    # reset needs two presses
    await pg.click("#admin [data-a=reset]") if tag == "desktop" else await pg.evaluate("document.querySelector('#admin [data-a=reset]').click()")
    ok(any(x["reg"] == "AUT 001" for x in (await state(pg))["bookings"]), "one press must not reset")
    await pg.evaluate("document.querySelector('#admin [data-a=reset]').click()")
    await pg.wait_for_function(f"!JSON.parse(localStorage.getItem('{KEY}')).bookings.some((b) => b.own)", timeout=T)

    # shortcuts: Shift+V, the footer wordmark, and a hidden preview strip
    await pg.keyboard.press("Shift+V")
    await pg.wait_for_selector("#site:not([hidden])")
    await pg.click(".demo [data-act=demox]")
    await pg.wait_for_function("document.documentElement.classList.contains('nodemo')")
    await pg.keyboard.press("Shift+V")
    await pg.wait_for_selector("#admin:not([hidden])")
    await pg.keyboard.press("Shift+V")
    await pg.wait_for_selector("#site:not([hidden])")
    await pg.evaluate("document.querySelector('.mega').click()")
    await pg.wait_for_selector("#admin:not([hidden])")
    await pg.close(); await ctx.close()


async def suite_degraded(b):
    """No WebGL and reduced motion: everything still works, nothing throws."""
    ctx = await b.new_context(**PHONE)
    await ctx.add_init_script(NOGL)
    pg = await page(ctx)
    await pg.wait_for_function("document.documentElement.classList.contains('nogl')", timeout=T)
    await pg.fill("#heroReg", "nkbil1")
    await pg.press("#heroReg", "Enter")
    await pg.wait_for_selector("#gcard.on")
    ok("NKBIL1" in await pg.inner_text("#gcard"), "personalised plate")
    ok(await pg.locator(".cap").nth(0).is_visible(), "story text hidden without WebGL")
    await audit(pg, "no webgl")
    await settle(pg)
    await pg.screenshot(path=SHOTS / "05-nowebgl.png", full_page=True)
    await pg.close(); await ctx.close()

    ctx = await b.new_context(reduced_motion="reduce", **PHONE)
    pg = await page(ctx)
    await pg.fill("#heroReg", "abc123")
    await pg.press("#heroReg", "Enter")
    await pg.wait_for_selector("#gcard.on", timeout=5000)
    await pg.click("#gcard [data-act=book]")
    await pg.fill("#fName", "Lugn Rörelse")
    await pg.fill("#fPhone", "0701231231")
    await pg.click(".sfoot [data-act=next]")
    await pg.wait_for_selector(".sbody .done")
    await audit(pg, "reduced motion")
    await pg.close(); await ctx.close()


async def suite_desktop(b):
    """Desktop 1440x900: hero, scan, booking drawer, shop, find us."""
    ctx = await b.new_context(**DESK)
    pg = await page(ctx)
    await pg.wait_for_selector(".hero h1")
    w = await pg.evaluate("(() => { const h = document.querySelector('.hero h1'); return [...h.querySelectorAll('i')].map((i) => i.getBoundingClientRect().right <= i.parentElement.getBoundingClientRect().right + 1) })()")
    ok(all(w), "headline is clipped")
    await settle(pg)
    await pg.screenshot(path=SHOTS / "20-desktop-hero.png")
    await audit(pg, "desktop hero")
    await pg.fill("#heroReg", "xyz 99a")
    await pg.click("#plateform button")
    await pg.wait_for_selector("#gcard.on", timeout=60000)
    await pg.click("#gcard [data-act=book]")
    await pg.wait_for_selector("#fName")
    await settle(pg)
    await pg.screenshot(path=SHOTS / "21-desktop-drawer.png")
    await audit(pg, "desktop drawer")
    await pg.keyboard.press("Escape")
    await sheet_closed(pg)
    for sec in ["#tjanster", "#dack", "#hotell", "#hitta"]:
        await pg.evaluate(f"document.querySelector('{sec}').scrollIntoView()")
        await audit(pg, "desktop " + sec)
    await settle(pg)
    await pg.screenshot(path=SHOTS / "22-desktop-visit.png")
    await pg.close(); await ctx.close()


async def suite_perf(b):
    """The 3D scene draws only while it can be seen (guardrail: never two render loops, never offscreen)."""
    ctx = await b.new_context(**PHONE)
    await ctx.add_init_script("""(() => { window.__draws = 0; for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) { if (!C) continue;
      for (const f of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) { const o = C.prototype[f]; if (o) C.prototype[f] = function () { window.__draws++; return o.apply(this, arguments); }; } } })();""")
    pg = await page(ctx)
    count = "(ms) => new Promise((r) => { const n0 = window.__draws; setTimeout(() => r(window.__draws - n0), ms); })"
    await pg.wait_for_function("window.__draws > 0", timeout=60000)
    ok(await pg.evaluate(count, 1500) > 0, "the hero wheel does not draw")
    await pg.evaluate("document.querySelector('#hitta').scrollIntoView()")
    await pg.evaluate(count, 1000)
    idle = await pg.evaluate(count, 2000)
    ok(idle == 0, f"the wheel keeps drawing while scrolled away: {idle} draw calls in 2 s")
    await pg.evaluate("NK.setView('admin')")
    await pg.wait_for_selector("#admin .brief")
    await pg.evaluate(count, 1000)
    ok(await pg.evaluate(count, 2000) == 0, "the wheel draws behind Verkstaden")
    await pg.evaluate("NK.setView('site')")
    await pg.wait_for_function("window.__draws > 0 && (window.__mark = window.__draws)", timeout=T)
    ok(await pg.evaluate(count, 1500) > 0, "the wheel does not come back at the top")
    await pg.close(); await ctx.close()


SUITES = {
    "customer": suite_customer, "shop": suite_shop, "tabs": suite_two_tabs, "night": suite_night,
    "workshop": lambda b: suite_workshop(b, PHONE, "phone"), "workshop-desktop": lambda b: suite_workshop(b, DESK, "desktop"),
    "degraded": suite_degraded, "desktop": suite_desktop, "perf": suite_perf,
}


async def main():
    SHOTS.mkdir(exist_ok=True)
    pick = sys.argv[1:] or list(SUITES)
    failed = []
    async with async_playwright() as p:
        b = await p.chromium.launch(args=GL)
        for name in pick:
            try:
                await SUITES[name](b)
                print(f"ok   {name}")
            except Exception as e:  # noqa: BLE001 - report every suite, then fail
                failed.append(name)
                where = [f"line {t.lineno}" for t in __import__("traceback").extract_tb(e.__traceback__) if t.filename.endswith("smoke.py")][-1:]
                print(f"FAIL {name} ({', '.join(where)}): {" | ".join(str(e).splitlines()[:12])[:1400]}")
            for c in list(b.contexts):  # a failed suite must not leave WebGL pages running into the next one
                await c.close()
        await b.close()
    if failed:
        sys.exit(f"{len(failed)} suite(s) failed: {', '.join(failed)}")
    print("smoke passed: " + ", ".join(pick))


asyncio.run(main())
