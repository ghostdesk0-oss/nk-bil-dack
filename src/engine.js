/* NK booking engine: catalogue, opening hours, slot capacity, validation, bookings, cart, orders,
   persistence across days and calendar files. Pure logic: no DOM. The page (app.js) and Verkstaden
   (admin.js) both go through it, and tests/engine.test.mjs runs it under Node. */
(function (root) {
  'use strict';
  const E = {};

  /* ---------- small helpers ---------- */
  const pad = (n) => (n < 10 ? '0' : '') + n;
  E.pad = pad;
  E.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  E.kr = (n) => Math.round(n).toLocaleString('sv-SE').replace(/\s/g, ' ') + ' kr';
  E.iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  E.D = (s) => { const p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
  E.addDays = (s, n) => { const d = E.D(s); d.setDate(d.getDate() + n); return E.iso(d); };
  E.dow = (s) => E.D(s).getDay();
  E.WD = ['sön', 'mån', 'tis', 'ons', 'tors', 'fre', 'lör'];
  E.WDL = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];
  E.MON = ['jan', 'feb', 'mars', 'april', 'maj', 'juni', 'juli', 'aug', 'sep', 'okt', 'nov', 'dec'];
  E.nice = (s) => { const d = E.D(s); return E.WD[d.getDay()] + ' ' + d.getDate() + ' ' + E.MON[d.getMonth()]; };
  E.toMin = (t) => +t.slice(0, 2) * 60 + +t.slice(3, 5);
  E.toT = (m) => pad(Math.floor(m / 60)) + ':' + pad(m % 60);

  /* ---------- the shop clock: always Swedish time, whatever the visitor's device says ---------- */
  const TZF = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  E.sweNow = (d) => {
    const o = {};
    TZF.formatToParts(d || new Date()).forEach((p) => { o[p.type] = p.value; });
    const hour = +o.hour % 24, minute = +o.minute;
    const date = o.year + '-' + o.month + '-' + o.day;
    return { date, hour, minute, mins: hour * 60 + minute, dow: E.dow(date) };
  };
  // the UTC instant of a Swedish wall-clock time (DST-safe), for calendar files
  E.stockholmUTC = (date, mins) => {
    const p = date.split('-').map(Number), want = Date.UTC(p[0], p[1] - 1, p[2], 0, mins);
    let t = want - 3600e3;
    for (let i = 0; i < 3; i++) {
      const n = E.sweNow(new Date(t)), q = n.date.split('-').map(Number);
      const got = Date.UTC(q[0], q[1] - 1, q[2], 0, n.mins);
      if (got === want) break;
      t += want - got;
    }
    return new Date(t);
  };

  /* ---------- catalogue. Lyktpolering 1 500 kr is NK's own price; the rest are examples. ---------- */
  E.SERVICES = [
    { id: 'skifte', name: 'Hjulskifte', short: 'Byte till dina egna hjul, lufttryck och mönsterdjup.', mins: 30, price: 250, tyre: true },
    { id: 'punktering', name: 'Punktering', short: 'Lagas om det går, annars nytt däck direkt. Drop-in går bra.', mins: 30, price: 300, tyre: true },
    { id: 'montering', name: 'Montering och balansering', short: 'Nya däck på dina fälgar, balanserade.', mins: 60, price: 600, tyre: true },
    { id: 'hotell', name: 'Däckhotell', short: 'Förvaring en säsong och skifte vår och höst.', mins: 30, price: 895, unit: 'per säsong', tyre: true },
    { id: 'hjulinst', name: 'Hjulinställning', short: 'Rätt vinklar, jämnt slitage och en bil som går rakt.', mins: 60, price: 1195, tyre: true },
    { id: 'lyktor', name: 'Lyktpolering', short: 'Slipade och polerade strålkastare, bättre sikt i mörkret.', mins: 60, price: 1500, real: true },
    { id: 'ac', name: 'AC-service', short: 'Påfyllning och kontroll av kyla och avfuktning.', mins: 60, price: 995 },
    { id: 'olja', name: 'Oljebyte', short: 'Ny olja och nytt filter efter din motor.', mins: 60, price: 1295, from: true },
    { id: 'nyadack', name: 'Nya däck och fälgar', short: 'Vi tar fram det som passar bilen och ger dig ett pris först.', mins: 60, price: null },
    { id: 'verkstad', name: 'Service och reparation', short: 'Felsökning och reparationer. Pris innan vi börjar.', mins: 120, price: null }
  ];
  E.svc = (id) => E.SERVICES.find((s) => s.id === id) || null;
  E.pTxt = (s) => (s.price ? (s.from ? 'från ' : '') + E.kr(s.price) : 'Offert');
  E.HOTEL_X = [{ id: 'wash', n: 'Hjultvätt', p: 150 }, { id: 'bal', n: 'Balansering', p: 300 }];
  E.WS = [185, 195, 205, 215, 225, 235]; E.PS = [40, 45, 50, 55, 60, 65]; E.RS = [15, 16, 17, 18];
  E.TYPES = [['sommar', 'Sommar'], ['friktion', 'Dubbfritt'], ['dubb', 'Dubbat']];
  E.typeName = (t) => (E.TYPES.find((x) => x[0] === t) || [0, t])[1];
  E.PRODUCTS = [
    { id: 'p1', brand: 'Kumho', model: 'WinterCraft Ice Wi32', type: 'dubb', base: 1095 },
    { id: 'p2', brand: 'Vredestein', model: 'Wintrac Ice', type: 'dubb', base: 1345 },
    { id: 'p3', brand: 'Kumho', model: 'WinterCraft Ice Wi52', type: 'friktion', base: 1045 },
    { id: 'p4', brand: 'Vredestein', model: 'Wintrac Pro', type: 'friktion', base: 1395 },
    { id: 'p5', brand: 'Kumho', model: 'Ecsta HS52', type: 'sommar', base: 945 },
    { id: 'p6', brand: 'Kumho', model: 'Ecowing ES31', type: 'sommar', base: 845 },
    { id: 'p7', brand: 'Vredestein', model: 'Ultrac', type: 'sommar', base: 1195 }
  ];
  E.prod = (id) => E.PRODUCTS.find((p) => p.id === id) || null;
  E.dim = (w, p, r) => w + '/' + p + ' R' + r;
  E.price = (p, dim) => { const m = dim.match(/(\d+)\/\d+ R(\d+)/); return Math.round(p.base * (1 + (+m[2] - 16) * 0.11 + (+m[1] - 205) * 0.004) / 5) * 5; };
  E.FIT = 600; E.MAXQ = 8;
  // example dimensions a plate lookup can return; real lookups come from the vehicle register later
  E.DL = [[205, 55, 16], [195, 65, 15], [225, 45, 17], [215, 55, 17], [215, 60, 16], [225, 50, 17], [235, 45, 18]];
  E.dimForReg = (reg) => { const raw = reg.replace(/\s/g, ''); let h = 0; for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) % 9973; return E.DL[h % E.DL.length]; };

  /* ---------- opening hours (real): Mon-Thu 07-17, Fri 07-16, weekends closed ---------- */
  E.OPEN = 420;
  E.closeMin = (date) => { const g = E.dow(date); return g === 0 || g === 6 ? 0 : g === 5 ? 960 : 1020; };
  E.isOpenDay = (date) => E.closeMin(date) > 0;
  E.openState = (now) => {
    const c = E.closeMin(now.date);
    if (c && now.mins >= E.OPEN && now.mins < c) return { open: true, text: 'Öppet nu, till ' + c / 60 };
    let d = now.date;
    if (!(c && now.mins < E.OPEN)) do { d = E.addDays(d, 1); } while (!E.isOpenDay(d));
    return { open: false, text: 'Stängt nu. Öppnar ' + (d === now.date ? 'idag' : d === E.addDays(now.date, 1) ? 'i morgon' : 'på ' + E.WDL[E.dow(d)]) + ' kl. 7' };
  };
  E.workdays = (from, n) => { const out = []; let d = from; while (out.length < n) { if (E.isOpenDay(d)) out.push(d); d = E.addDays(d, 1); } return out; };

  /* ---------- slots: two lifts, 30-minute grid, 30 minutes notice for same-day bookings ---------- */
  E.LIFTS = 2; E.STEP = 30; E.LEAD = 30;
  const live = (b) => b.status !== 'Avbokad';
  E.daySlots = (date) => { const o = []; for (let m = E.OPEN; m < E.closeMin(date); m += E.STEP) o.push(E.toT(m)); return o; };
  E.load = (S, date, except) => {
    const c = {};
    S.bookings.forEach((b) => {
      if (b.date !== date || !live(b) || b.id === except) return;
      for (let m = E.toMin(b.time); m < E.toMin(b.time) + b.mins; m += E.STEP) c[m] = (c[m] || 0) + 1;
    });
    return c;
  };
  E.slotState = (S, date, t, mins, now, except, c) => {
    if (!E.isOpenDay(date) || date < now.date) return 'closed';
    const s = E.toMin(t);
    if (s < E.OPEN || s % E.STEP || s + mins > E.closeMin(date)) return 'closed';
    if (date === now.date && s < now.mins + E.LEAD) return 'past';
    c = c || E.load(S, date, except);
    for (let m = s; m < s + mins; m += E.STEP) if ((c[m] || 0) >= E.LIFTS) return 'full';
    return 'free';
  };
  // capacity alone, ignoring the clock: staff can put a car in right now, but not onto two full lifts by accident
  E.isFull = (S, date, t, mins, except) => { const c = E.load(S, date, except), s = E.toMin(t); for (let m = s; m < s + mins; m += E.STEP) if ((c[m] || 0) >= E.LIFTS) return true; return false; };
  E.slots = (S, date, mins, now, except) => { const c = E.load(S, date, except); return E.daySlots(date).map((t) => ({ t, state: E.slotState(S, date, t, mins, now, except, c) })); };
  E.nextFree = (S, mins, now, days) => {
    for (const d of E.workdays(now.date, days || 10)) { const f = E.slots(S, d, mins, now).find((x) => x.state === 'free'); if (f) return { date: d, time: f.t }; }
    return null;
  };
  E.when = (date, time, now) => (date === now.date ? 'idag' : date === E.addDays(now.date, 1) ? 'i morgon' : E.nice(date)) + ' ' + time;

  // first lift that is free for the whole job; tyre jobs prefer lift 1, workshop jobs lift 2. 0 = queue.
  E.assignLift = (S, b) => {
    const s = E.toMin(b.time), e = s + b.mins, sv = E.svc(b.svc), order = sv && sv.tyre ? [1, 2] : [2, 1];
    for (const L of order) {
      const clash = S.bookings.some((o) => o !== b && o.id !== b.id && live(o) && o.date === b.date && o.lift === L && E.toMin(o.time) < e && E.toMin(o.time) + o.mins > s);
      if (!clash) return L;
    }
    return 0;
  };

  /* ---------- validation ---------- */
  E.normReg = (str) => {
    const up = String(str || '').toUpperCase().replace(/[\s-]/g, '');
    if (!/^[A-ZÅÄÖ0-9]{2,7}$/.test(up) || !/[A-ZÅÄÖ]/.test(up)) return { ok: false };
    const std = /^[A-Z]{3}\d{2}[A-Z0-9]$/.test(up);
    return { ok: true, std, reg: std ? up.slice(0, 3) + ' ' + up.slice(3) : up };
  };
  E.normPhone = (str, staff) => {
    let d = String(str || '').replace(/[^\d+]/g, '');
    if (d.startsWith('+46')) d = '0' + d.slice(3); else if (d.startsWith('0046')) d = '0' + d.slice(4); else if (d.startsWith('46') && d.length === 11) d = '0' + d.slice(2);
    d = d.replace(/\D/g, '');
    const mobile = /^07[02369]\d{7}$/.test(d);
    if (!mobile && !(staff && /^0\d{6,9}$/.test(d))) return { ok: false };
    const phone = mobile ? d.slice(0, 3) + '-' + d.slice(3, 6) + ' ' + d.slice(6, 8) + ' ' + d.slice(8) : d.slice(0, 3) + '-' + d.slice(3);
    return { ok: true, digits: d, phone, mobile };
  };
  E.normEmail = (s) => { s = String(s || '').trim(); return !s ? { ok: true, email: '' } : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? { ok: true, email: s } : { ok: false }; };
  E.MSG = {
    svc: 'Välj vad du vill ha hjälp med.',
    reg: 'Skriv regnumret som det står på skylten, till exempel ABC 123.',
    time: 'Välj en ledig tid.',
    taken: 'Tiden hann bli tagen. Välj en annan.',
    past: 'Den tiden har redan passerat. Välj en senare.',
    closed: 'Vi har stängt då. Välj en annan tid.',
    name: 'Skriv ditt namn så vi vet vem som kommer.',
    phone: 'Skriv ett svenskt mobilnummer, till exempel 070-123 45 67.',
    phoneStaff: 'Skriv ett telefonnummer, till exempel 026-12 34 56.',
    email: 'Mejladressen ser inte riktig ut. Rätta den eller lämna fältet tomt.',
    cart: 'Varukorgen är tom.',
    pay: 'Välj hur du vill betala.'
  };
  const fail = (field, key) => ({ ok: false, field, err: E.MSG[key || field] });

  /* ---------- bookings ---------- */
  E.STATUS = ['Ny', 'Bekräftad', 'Pågår', 'Klar', 'Hämtad', 'Avbokad'];
  E.NEXT = { Ny: 'Bekräftad', Bekräftad: 'Pågår', Pågår: 'Klar', Klar: 'Hämtad' };
  E.LABEL = { Ny: 'Ny', Bekräftad: 'Bekräftad', Pågår: 'På lyft', Klar: 'Klar', Hämtad: 'Hämtad', Avbokad: 'Avbokad' };

  // check a booking request without changing anything; returns normalised fields or the first error
  E.check = (S, q, now, o) => {
    o = o || {};
    const sv = E.svc(q.svc); if (!sv) return fail('svc');
    const r = E.normReg(q.reg); if (!r.ok) return fail('reg');
    if (!q.date || !q.time) return fail('time');
    const mins = q.mins || sv.mins, st = E.slotState(S, q.date, q.time, mins, now, q.except);
    if (st === 'closed') return fail('time', 'closed');
    if (st === 'past' && !o.staff) return fail('time', 'past');
    const full = st === 'full' || (st === 'past' && E.isFull(S, q.date, q.time, mins, q.except));
    if (full && !o.force) return fail('time', 'taken');
    const name = String(q.name || '').trim().replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 60) return fail('name');
    const ph = E.normPhone(q.phone, o.staff); if (!ph.ok) return fail('phone', o.staff ? 'phoneStaff' : 'phone');
    const em = E.normEmail(q.email); if (!em.ok) return fail('email');
    return { ok: true, sv, reg: r.reg, mins, name, phone: ph.phone, digits: ph.digits, email: em.email, over: full };
  };
  E.customer = (S, v, model) => {
    let c = S.customers.find((x) => x.digits === v.digits);
    if (!c) { c = { id: 'u' + S.useq++, name: v.name, phone: v.phone, digits: v.digits, since: +String(S.today || '').slice(0, 4) || new Date().getFullYear(), cars: [], hotel: null, own: true }; S.customers.unshift(c); }
    if (v.reg && !c.cars.some((x) => x.reg === v.reg)) c.cars.push({ reg: v.reg, model: model || '' });
    if (v.email) c.email = v.email;
    return c;
  };
  E.book = (S, q, now, o) => {
    o = o || {};
    const v = E.check(S, q, now, o); if (!v.ok) return v;
    const c = E.customer(S, v, q.model);
    const extras = (q.extras || []).map((x) => ({ n: x.n, p: x.p }));
    const b = { id: 'NK-' + S.seq++, custId: c.id, reg: v.reg, model: q.model || '', svc: v.sv.id, mins: v.mins, date: q.date, time: q.time,
      status: o.staff || S.auto ? 'Bekräftad' : 'Ny', note: String(q.note || '').trim().slice(0, 300), extras, src: q.src || 'Webben',
      created: new Date().toISOString(), own: true, fresh: true, lift: 0, tread: null, checks: {}, sms: null };
    S.bookings.push(b); b.lift = E.assignLift(S, b);
    return { ok: true, booking: b, customer: c, over: v.over };
  };
  E.total = (b) => { const sv = E.svc(b.svc); return sv && sv.price ? sv.price + (b.extras || []).reduce((a, x) => a + x.p, 0) : null; };
  E.byId = (S, id) => S.bookings.find((b) => b.id === id) || null;
  E.cancel = (S, id) => { const b = E.byId(S, id); if (!b || !live(b)) return { ok: false }; b.status = 'Avbokad'; b.cancelled = new Date().toISOString(); b.lift = 0; return { ok: true, booking: b }; };
  E.move = (S, id, date, time, now, o) => {
    const b = E.byId(S, id); if (!b || !live(b)) return { ok: false, err: 'Bokningen finns inte längre.' };
    const st = E.slotState(S, date, time, b.mins, now, id);
    if (st !== 'free' && !(o && o.force && st === 'full')) return fail('time', st === 'full' ? 'taken' : st === 'past' ? 'past' : 'closed');
    b.date = date; b.time = time; b.lift = 0; b.lift = E.assignLift(S, b); b.moved = true;
    return { ok: true, booking: b };
  };
  E.advance = (S, id) => { const b = E.byId(S, id); if (!b || !E.NEXT[b.status]) return null; b.status = E.NEXT[b.status]; b.fresh = false; if (b.status === 'Klar') b.sms = new Date().toISOString(); return b; };
  E.setLift = (S, id, L) => {
    const b = E.byId(S, id); if (!b) return { ok: false };
    const s = E.toMin(b.time), e = s + b.mins;
    const clash = L && S.bookings.some((o) => o.id !== id && live(o) && o.date === b.date && o.lift === L && E.toMin(o.time) < e && E.toMin(o.time) + o.mins > s);
    if (clash) return { ok: false, err: 'Lyft ' + L + ' är upptagen då.' };
    b.lift = L; return { ok: true, booking: b };
  };
  E.mine = (S, phone, now) => {
    const ph = E.normPhone(phone); if (!ph.ok) return null;
    const c = S.customers.find((x) => x.digits === ph.digits);
    const list = c ? S.bookings.filter((b) => b.custId === c.id && b.date >= now.date && live(b) && b.status !== 'Hämtad') : [];
    return list.sort(E.byTime);
  };
  E.byTime = (a, b) => (a.date + a.time).localeCompare(b.date + b.time);

  /* ---------- stock, cart, orders ---------- */
  E.stockOf = (S, k) => {
    if (S.stock[k] == null) { let h = 0; for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) % 97; S.stock[k] = [12, 8, 4, 16, 0, 20, 6, 8][h % 8]; }
    return S.stock[k];
  };
  E.cartCount = (S) => S.cart.reduce((a, i) => a + i.qty, 0);
  E.cartTotal = (S) => S.cart.reduce((a, i) => a + E.price(E.prod(i.pid), i.dim) * i.qty, 0);
  E.cartAdd = (S, pid, dim, qty) => {
    if (!E.prod(pid)) return { ok: false };
    let it = S.cart.find((i) => i.pid === pid && i.dim === dim), capped = false;
    if (!it) { it = { pid, dim, qty: 0 }; S.cart.push(it); }
    const want = it.qty + (qty || 4); it.qty = Math.min(E.MAXQ, want); capped = want > E.MAXQ;
    return { ok: true, line: it, capped };
  };
  E.cartSet = (S, idx, qty) => { const it = S.cart[idx]; if (!it) return; if (qty < 1) S.cart.splice(idx, 1); else it.qty = Math.min(E.MAXQ, qty); };
  // Ways to pay for a web order. Online ones are simulated in the demo: no money moves, no card data is asked for.
  E.PAY = [
    { id: 'plats', name: 'Betala i verkstaden', sub: 'Kort eller Swish när du hämtar eller vi monterar', online: false },
    { id: 'swish', name: 'Swish', sub: 'Betala nu med Swish-appen', online: true },
    { id: 'kort', name: 'Kort', sub: 'Visa eller Mastercard, godkänn med BankID eller kod', online: true }
  ];
  E.payOf = (id) => E.PAY.find((x) => x.id === id) || null;
  E.payWord = (p) => (p.id === 'swish' ? 'Swish' : p.name.toLowerCase());  // Swish is a brand name
  E.payText = (o) => { const p = E.payOf(o.pay || 'plats'); return !p.online ? 'Betalas i verkstaden' : (o.paid ? 'Betald med ' : 'Väntar på ') + E.payWord(p); };
  E.payOrder = (S, id, now) => {
    const o = S.orders.find((x) => x.id === id);
    if (!o || !E.payOf(o.pay || 'plats').online) return { ok: false };
    if (!o.paid) { o.paid = true; o.paidAt = now ? now.date + ' ' + E.toT(now.mins) : ''; o.fresh = true; }
    return { ok: true, order: o };
  };
  E.order = (S, q, now) => {
    if (!S.cart.length) return fail('cart');
    const pay = q.pay || 'plats'; if (!E.payOf(pay)) return fail('pay');
    let v, b = null;
    if (q.fit) {
      v = E.check(S, Object.assign({}, q, { svc: 'montering' }), now);
      if (!v.ok) return v;
    } else {
      const name = String(q.name || '').trim(); if (name.length < 2) return fail('name');
      const ph = E.normPhone(q.phone); if (!ph.ok) return fail('phone');
      const em = E.normEmail(q.email); if (!em.ok) return fail('email');
      v = { ok: true, name, phone: ph.phone, digits: ph.digits, email: em.email, reg: (E.normReg(q.reg).reg || '') };
    }
    if (q.fit) { const r = E.book(S, Object.assign({}, q, { svc: 'montering', src: 'Webshop' }), now); if (!r.ok) return r; b = r.booking; }
    const c = q.fit ? S.customers.find((x) => x.id === b.custId) : E.customer(S, v, '');
    const items = S.cart.map((i) => ({ pid: i.pid, dim: i.dim, qty: i.qty, each: E.price(E.prod(i.pid), i.dim), back: Math.max(0, i.qty - E.stockOf(S, i.pid + '|' + i.dim)) }));
    const backorder = items.some((i) => i.back > 0);
    const o = { id: 'W-' + S.oseq++, custId: c.id, date: now.date, items, fit: !!q.fit, bookingId: b ? b.id : null, total: E.cartTotal(S) + (q.fit ? E.FIT : 0),
      status: backorder ? 'Beställd hos leverantör' : q.fit ? 'Väntar på montering' : 'Plockas', backorder, pay, paid: false, own: true, fresh: true };
    if (b) b.note = ('Webborder ' + o.id + ': ' + items.map((i) => i.qty + ' st ' + E.prod(i.pid).brand + ' ' + E.prod(i.pid).model + ' ' + i.dim).join(', ') + '. ' + b.note).trim();
    S.orders.unshift(o);
    items.forEach((i) => { const k = i.pid + '|' + i.dim; S.stock[k] = Math.max(0, E.stockOf(S, k) - i.qty); });
    S.cart = [];
    return { ok: true, order: o, booking: b, customer: c };
  };

  /* ---------- calendar file for the customer's own calendar ---------- */
  E.ics = (b) => {
    const sv = E.svc(b.svc), st = E.stockholmUTC(b.date, E.toMin(b.time)), en = new Date(st.getTime() + b.mins * 60e3);
    const f = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const t = (s) => String(s).replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NK Bil och Dack//Bokning//SV', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
      'UID:' + b.id + '@nkbilochdack.se', 'DTSTAMP:' + f(new Date()), 'DTSTART:' + f(st), 'DTEND:' + f(en),
      'SUMMARY:' + t(sv.name + ', NK Bil & Däck'), 'LOCATION:' + t('NK Bil & Däck, Brynäsgatan 67, 802 88 Gävle'),
      'DESCRIPTION:' + t('Bokning ' + b.id + ', regnummer ' + b.reg + '. Frågor: 026-18 05 01.'),
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + t(sv.name + ' hos NK Bil & Däck'), 'TRIGGER:-PT2H', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n') + '\r\n';
  };

  /* ---------- day figures for Verkstaden ---------- */
  E.dayStats = (S, date, now) => {
    const bs = S.bookings.filter((b) => b.date === date && live(b)).sort(E.byTime);
    const cap = E.LIFTS * Math.max(1, E.closeMin(date) - E.OPEN), booked = bs.reduce((a, b) => a + b.mins, 0);
    const perH = {}; bs.forEach((b) => { for (let m = E.toMin(b.time); m < E.toMin(b.time) + b.mins; m += 60) perH[Math.floor(m / 60)] = (perH[Math.floor(m / 60)] || 0) + 1; });
    const busiest = Object.keys(perH).sort((a, b) => perH[b] - perH[a] || a - b)[0];
    const free = E.slots(S, date, 30, now).filter((x) => x.state === 'free').length;
    return { list: bs, count: bs.length, occ: Math.round(booked / cap * 100), busiest: busiest ? +busiest : null, free,
      value: bs.reduce((a, b) => a + (E.total(b) || 0), 0), drop: bs.filter((b) => b.svc === 'punktering').length };
  };

  /* ---------- example data and persistence ---------- */
  E.VERSION = 7; E.KEY = 'nk-demo-v7';
  const NAMES = ['Exempel Andersson', 'Exempel Bergström', 'Exempel Carlsson', 'Exempel Dahl', 'Exempel Eriksson', 'Exempel Forsberg', 'Exempel Gustavsson', 'Exempel Holm', 'Exempel Isaksson', 'Exempel Jonsson', 'Exempel Karlberg', 'Exempel Lindh'];
  const CARS = ['Volvo V60', 'Volkswagen Golf', 'Toyota RAV4', 'Kia Ceed', 'Volvo XC60', 'Skoda Octavia', 'Tesla Model 3', 'Saab 9-3', 'Audi A4', 'Ford Transit', 'Volvo V70', 'Volkswagen Caddy'];
  const L = 'ABCDEFGHJKLMNPRSTUWXYZ';
  function exampleCustomers() {
    return NAMES.map((n, i) => {
      const digits = '0701740' + pad(10 + i) + String(i % 10);
      const reg = L[(i * 5) % 22] + L[(i * 3 + 7) % 22] + L[(i * 11 + 2) % 22] + ' ' + pad((10 + i * 7) % 100) + L[(i * 2 + 4) % 22];
      const dim = E.dim.apply(null, E.DL[i % E.DL.length]);
      return { id: 'c' + (i + 1), name: n, phone: digits.slice(0, 3) + '-' + digits.slice(3, 6) + ' ' + digits.slice(6, 8) + ' ' + digits.slice(8), digits, since: 2012 + i % 13,
        cars: [{ reg, model: CARS[i] }],
        hotel: i % 3 === 0 ? null : { shelf: 'ABCD'[i % 4] + '-' + pad(4 + i * 3), tyres: i % 2 ? 'Sommarhjul' : 'Vinterhjul', dim, depth: +(3.1 + ((i * 7) % 40) / 10).toFixed(1) } };
    });
  }
  E.seed = (now, keep) => {
    keep = keep || {};
    let r = +now.date.replace(/-/g, '') % 2147483647 || 1;
    const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
    const S = { v: E.VERSION, seedDay: now.date, today: now.date, customers: exampleCustomers().concat(keep.customers || []), bookings: (keep.bookings || []).slice(),
      orders: (keep.orders || []).slice(), stock: keep.stock || {}, cart: keep.cart || [], auto: !!keep.auto, seq: keep.seq || 2412, oseq: keep.oseq || 1088, useq: keep.useq || 1 };
    const days = E.workdays(now.date, 6), tyre = E.SERVICES.filter((s) => s.price && s.id !== 'lyktor');
    days.forEach((day, di) => {
      const n = di === 0 ? 7 : 4 + Math.floor(rnd() * 3);
      for (let k = 0, tries = 0; k < n && tries < 40; tries++) {
        const c = S.customers[Math.floor(rnd() * 12)], s = rnd() < 0.75 ? tyre[Math.floor(rnd() * tyre.length)] : E.SERVICES[Math.floor(rnd() * E.SERVICES.length)];
        const sl = E.daySlots(day), t = sl[Math.floor(rnd() * sl.length)], m0 = E.toMin(t);
        if (m0 + s.mins > E.closeMin(day)) continue;
        const cnt = E.load(S, day); let ok = true;
        for (let m = m0; m < m0 + s.mins; m += E.STEP) if ((cnt[m] || 0) >= E.LIFTS) ok = false;
        if (!ok) continue;
        let st = 'Bekräftad';
        if (day === now.date) st = m0 + s.mins <= now.mins ? 'Klar' : m0 <= now.mins ? 'Pågår' : 'Bekräftad';
        else if (rnd() < 0.2) st = 'Ny';
        const b = { id: 'NK-' + (2000 + di * 20 + k), custId: c.id, reg: c.cars[0].reg, model: c.cars[0].model, svc: s.id, mins: s.mins, date: day, time: t, status: st,
          note: '', extras: [], src: rnd() < 0.6 ? 'Telefon' : 'Webben', lift: 0, tread: st === 'Klar' ? +(4 + rnd() * 4).toFixed(1) : null, checks: st === 'Klar' ? { bal: true, torque: true, air: true } : {}, sms: null };
        S.bookings.push(b); b.lift = E.assignLift(S, b); k++;
      }
    });
    {
      const d1 = '205/55 R16', d2 = '225/45 R17';
      S.orders.push({ id: 'W-' + S.oseq++, custId: 'c4', date: now.date, items: [{ pid: 'p1', dim: d1, qty: 4, each: E.price(E.prod('p1'), d1), back: 0 }], fit: true, total: 4 * E.price(E.prod('p1'), d1) + E.FIT, status: 'Väntar på montering' });
      S.orders.push({ id: 'W-' + S.oseq++, custId: 'c9', date: now.date, items: [{ pid: 'p4', dim: d2, qty: 4, each: E.price(E.prod('p4'), d2), back: 0 }], fit: false, total: 4 * E.price(E.prod('p4'), d2), status: 'Klar att hämta' });
    }
    return S;
  };
  // Load saved state. On a new day the example bookings are regenerated around today, but everything a
  // visitor or the staff created (bookings, customers, orders, stock, cart, settings) is carried over.
  E.restore = (raw, now) => {
    let j = null;
    try { j = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { j = null; }
    if (!j || j.v !== E.VERSION || !Array.isArray(j.bookings) || !Array.isArray(j.customers)) return E.seed(now);
    if (j.seedDay === now.date) { j.today = now.date; return j; }
    const since = E.addDays(now.date, -30);
    const keep = { customers: j.customers.filter((c) => c.own), bookings: j.bookings.filter((b) => b.own && b.date >= since), orders: j.orders.filter((o) => o.own),
      stock: j.stock, cart: j.cart, auto: j.auto, seq: j.seq, oseq: j.oseq, useq: j.useq };
    keep.bookings.forEach((b) => { b.fresh = false; });
    return E.seed(now, keep);
  };

  root.NKEngine = E;
})(typeof window !== 'undefined' ? window : globalThis);
