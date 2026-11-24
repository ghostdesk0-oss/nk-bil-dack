// Unit and fuzz tests for the booking engine. Run: node --test tests/engine.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code = fs.readFileSync(new URL('../src/engine.js', import.meta.url), 'utf8');
// same realm as the test, so deepEqual compares plain arrays and objects
vm.runInThisContext(code, { filename: 'src/engine.js' });
const E = globalThis.NKEngine;

// Monday 23 November 2026, in Swedish time
const at = (date, hhmm) => ({ date, hour: +hhmm.slice(0, 2), minute: +hhmm.slice(3), mins: E.toMin(hhmm), dow: E.dow(date) });
const MON = '2026-11-23', TUE = '2026-11-24', FRI = '2026-11-27', SAT = '2026-11-28', SUN = '2026-11-29', NEXTMON = '2026-11-30';
const empty = (now) => { const S = E.seed(now); S.bookings = []; return S; };
const who = { name: 'Test Testsson', phone: '070-123 45 67' };
const req = (o) => Object.assign({ svc: 'skifte', reg: 'ABC 123', date: TUE, time: '10:00' }, who, o);
const clone = (x) => JSON.parse(JSON.stringify(x));

// invariants every state must keep, whatever happened to it
function invariants(S) {
  const live = S.bookings.filter((b) => b.status !== 'Avbokad');
  for (const b of live) {
    const s = E.toMin(b.time);
    assert.ok(s >= E.OPEN, `${b.id} starts before opening`);
    assert.ok(s + b.mins <= E.closeMin(b.date), `${b.id} ends after closing (${b.date} ${b.time} +${b.mins})`);
  }
  const byDay = {};
  live.forEach((b) => (byDay[b.date] = byDay[b.date] || []).push(b));
  for (const day in byDay) {
    const c = {};
    byDay[day].forEach((b) => { for (let m = E.toMin(b.time); m < E.toMin(b.time) + b.mins; m += 30) c[m] = (c[m] || 0) + 1; });
    for (const m in c) assert.ok(c[m] <= E.LIFTS || byDay[day].some((b) => b.lift === 0), `${day} ${E.toT(+m)} has ${c[m]} cars for ${E.LIFTS} lifts`);
    for (const L of [1, 2]) {
      const on = byDay[day].filter((b) => b.lift === L).sort(E.byTime);
      for (let i = 1; i < on.length; i++) assert.ok(E.toMin(on[i - 1].time) + on[i - 1].mins <= E.toMin(on[i].time), `lift ${L} double-booked ${day}: ${on[i - 1].id} and ${on[i].id}`);
    }
  }
  const ids = S.bookings.map((b) => b.id);
  assert.equal(new Set(ids).size, ids.length, 'booking ids are unique');
}

test('shop clock follows Stockholm, not the device', () => {
  assert.deepEqual([E.sweNow(new Date('2026-11-23T09:15:00Z')).date, E.sweNow(new Date('2026-11-23T09:15:00Z')).mins], [MON, 615]);
  assert.equal(E.sweNow(new Date('2026-07-01T09:15:00Z')).mins, 675, 'summer time is UTC+2');
  const late = E.sweNow(new Date('2026-11-23T23:30:00Z'));
  assert.deepEqual([late.date, late.mins], [TUE, 30], 'after 23:00 UTC it is already tomorrow in Gävle');
  assert.equal(E.sweNow(new Date('2026-11-23T23:30:00Z')).dow, 2);
});

test('calendar times convert to UTC across daylight saving', () => {
  assert.equal(E.stockholmUTC(TUE, 600).toISOString(), '2026-11-24T09:00:00.000Z');
  assert.equal(E.stockholmUTC('2026-07-01', 600).toISOString(), '2026-07-01T08:00:00.000Z');
  assert.equal(E.stockholmUTC('2026-03-29', 600).toISOString(), '2026-03-29T08:00:00.000Z', 'DST starts 29 March 2026');
  assert.equal(E.stockholmUTC('2026-10-25', 600).toISOString(), '2026-10-25T09:00:00.000Z', 'DST ends 25 October 2026');
});

test('opening hours and the open-now line', () => {
  assert.deepEqual([MON, FRI, SAT, SUN].map(E.closeMin), [1020, 960, 0, 0]);
  assert.equal(E.openState(at(MON, '10:00')).text, 'Öppet nu, till 17');
  assert.equal(E.openState(at(FRI, '15:59')).text, 'Öppet nu, till 16');
  assert.equal(E.openState(at(MON, '06:30')).text, 'Stängt nu. Öppnar idag kl. 7');
  assert.equal(E.openState(at('2026-11-26', '17:00')).text, 'Stängt nu. Öppnar i morgon kl. 7');
  assert.equal(E.openState(at(FRI, '16:00')).text, 'Stängt nu. Öppnar på måndag kl. 7');
  assert.equal(E.openState(at(SAT, '12:00')).text, 'Stängt nu. Öppnar på måndag kl. 7');
  assert.equal(E.openState(at(SUN, '23:59')).text, 'Stängt nu. Öppnar i morgon kl. 7');
  assert.deepEqual(E.workdays(FRI, 3), [FRI, NEXTMON, '2026-12-01']);
});

test('registration numbers', () => {
  assert.equal(E.normReg('abc123').reg, 'ABC 123');
  assert.equal(E.normReg(' abc 12a ').reg, 'ABC 12A');
  assert.equal(E.normReg('AB-C 123').reg, 'ABC 123');
  assert.deepEqual([E.normReg('NKBIL1').ok, E.normReg('NKBIL1').std], [true, false], 'personalised plates are allowed');
  for (const bad of ['', '1', '123', '12345', 'ABCDEFGH', 'AB<12', 'ABC 12 345']) assert.equal(E.normReg(bad).ok, false, bad);
});

test('phone numbers', () => {
  for (const ok of ['0701234567', '070-123 45 67', '+46 70 123 45 67', '0046701234567', '46701234567', '073 123 45 67'])
    assert.equal(E.normPhone(ok).phone, ok.includes('73') && !ok.includes('70') ? '073-123 45 67' : '070-123 45 67', ok);
  for (const bad of ['', '070123456', '07012345678', '0801234567', '026-18 05 01', '0751234567', 'abc']) assert.equal(E.normPhone(bad).ok, false, bad);
  assert.equal(E.normPhone('026-18 05 01', true).ok, true, 'staff can take landline numbers');
  assert.equal(E.normEmail('').ok, true); assert.equal(E.normEmail('a@b.se').ok, true); assert.equal(E.normEmail('a@b').ok, false); assert.equal(E.normEmail('a b@c.se').ok, false);
});

test('slot grid respects closing time, Fridays, weekends and same-day notice', () => {
  const now = at(MON, '10:00'), S = empty(now);
  assert.equal(E.daySlots(TUE).length, 20);
  assert.equal(E.daySlots(FRI).at(-1), '15:30');
  assert.equal(E.daySlots(SAT).length, 0);
  const st = (d, t, m) => E.slotState(S, d, t, m, now);
  assert.equal(st(TUE, '16:30', 30), 'free'); assert.equal(st(TUE, '16:30', 60), 'closed'); assert.equal(st(TUE, '15:00', 120), 'free'); assert.equal(st(TUE, '15:30', 120), 'closed');
  assert.equal(st(FRI, '15:30', 30), 'free'); assert.equal(st(FRI, '15:30', 60), 'closed'); assert.equal(st(FRI, '16:00', 30), 'closed');
  assert.equal(st(SAT, '10:00', 30), 'closed'); assert.equal(st('2026-11-20', '10:00', 30), 'closed', 'a past day');
  assert.equal(st(MON, '10:00', 30), 'past'); assert.equal(st(MON, '10:30', 30), 'free', '30 minutes notice');
  assert.equal(st(MON, '10:15', 30), 'closed', 'off the 30-minute grid');
  assert.equal(st(TUE, '06:30', 30), 'closed');
  assert.deepEqual(E.nextFree(S, 30, now), { date: MON, time: '10:30' });
  assert.deepEqual(E.nextFree(S, 30, at(FRI, '15:10')), { date: NEXTMON, time: '07:00' }, 'late Friday rolls to Monday');
});

test('two lifts: a third car at the same time is refused', () => {
  const now = at(MON, '08:00'), S = empty(now);
  const a = E.book(S, req({ reg: 'AAA 111' }), now), b = E.book(S, req({ reg: 'BBB 222', phone: '0702222222' }), now);
  assert.ok(a.ok && b.ok);
  assert.deepEqual([a.booking.lift, b.booking.lift], [1, 2]);
  const c = E.book(S, req({ reg: 'CCC 333', phone: '0703333333' }), now);
  assert.deepEqual([c.ok, c.field, c.err], [false, 'time', E.MSG.taken]);
  assert.equal(E.slotState(S, TUE, '09:30', 60, now), 'full', 'a 60-minute job overlapping 10:00 does not fit either');
  assert.equal(E.slotState(S, TUE, '09:30', 30, now), 'free');
  assert.ok(E.cancel(S, a.booking.id).ok);
  assert.equal(E.cancel(S, a.booking.id).ok, false, 'cannot cancel twice');
  assert.ok(E.book(S, req({ reg: 'CCC 333', phone: '0703333333' }), now).ok, 'a cancellation frees the slot');
  const forced = E.book(S, req({ reg: 'DDD 444', phone: '026-123456' }), now, { staff: true, force: true });
  assert.ok(forced.ok && forced.over); assert.equal(forced.booking.lift, 0, 'overbooked drop-in waits in the queue');
  // staff may book a time that has just passed (a car rolling in now), but full lifts still need force
  const nine = at(TUE, '10:10');
  assert.equal(E.book(S, req({ reg: 'EEE 555', phone: '0705555555' }), nine, { staff: true }).err, E.MSG.taken, 'past and full');
  const late = E.book(S, req({ reg: 'EEE 555', phone: '0705555555' }), nine, { staff: true, force: true });
  assert.ok(late.ok && late.over && late.booking.lift === 0, 'past and full, forced: queued and flagged');
  invariants(S);
});

test('booking validation reports the first problem with a Swedish message', () => {
  const now = at(MON, '08:00'), S = empty(now);
  const cases = [[{ svc: 'x' }, 'svc'], [{ reg: '12' }, 'reg'], [{ time: null }, 'time'], [{ date: SAT }, 'time'], [{ time: '16:45' }, 'time'],
    [{ name: ' ' }, 'name'], [{ name: 'x'.repeat(61) }, 'name'], [{ phone: '123' }, 'phone'], [{ email: 'nope' }, 'email']];
  for (const [o, field] of cases) { const r = E.book(S, req(o), now); assert.equal(r.ok, false, JSON.stringify(o)); assert.equal(r.field, field, JSON.stringify(o)); assert.match(r.err, /[a-zåäö]/); }
  assert.equal(S.bookings.length, 0, 'failed bookings change nothing');
  assert.equal(E.book(S, req({ date: MON, time: '07:30' }), now).err, E.MSG.past);
});

test('a returning customer is recognised by phone in any format', () => {
  const now = at(MON, '08:00'), S = empty(now), n0 = S.customers.length;
  E.book(S, req({ phone: '0701234567' }), now);
  E.book(S, req({ phone: '+46 70-123 45 67', time: '11:00', reg: 'XYZ 99A' }), now);
  assert.equal(S.customers.length, n0 + 1);
  assert.deepEqual(S.customers[0].cars.map((c) => c.reg), ['ABC 123', 'XYZ 99A']);
  assert.equal(E.mine(S, '070 123 45 67', now).length, 2);
  E.cancel(S, S.bookings[0].id);
  assert.equal(E.mine(S, '0701234567', now).length, 1, 'cancelled bookings are hidden');
  assert.equal(E.mine(S, '0709999999', now).length, 0);
  assert.equal(E.mine(S, 'abc', now), null);
});

test('moving a booking re-checks capacity and keeps its own slot', () => {
  const now = at(MON, '08:00'), S = empty(now);
  const a = E.book(S, req(), now).booking;
  E.book(S, req({ time: '13:00', phone: '0702222222' }), now); E.book(S, req({ time: '13:00', phone: '0703333333' }), now);
  assert.equal(E.move(S, a.id, TUE, '13:00', now).ok, false);
  assert.ok(E.move(S, a.id, TUE, '10:00', now).ok, 'moving onto itself is fine');
  assert.ok(E.move(S, a.id, FRI, '15:30', now).ok);
  assert.equal(E.move(S, a.id, SAT, '10:00', now).ok, false);
  assert.equal(a.date, FRI);
  invariants(S);
});

test('status flow and lifts in the workshop', () => {
  const now = at(MON, '08:00'), S = empty(now);
  const b = E.book(S, req(), now).booking;
  assert.equal(b.status, 'Ny');
  assert.deepEqual([1, 2, 3, 4].map(() => E.advance(S, b.id) && b.status), ['Bekräftad', 'Pågår', 'Klar', 'Hämtad']);
  assert.ok(b.sms, 'finishing a job sends the text'); assert.equal(E.advance(S, b.id), null);
  S.auto = true; assert.equal(E.book(S, req({ time: '12:00' }), now).booking.status, 'Bekräftad', 'auto-confirm');
  const x = E.book(S, req({ time: '14:00', phone: '0702222222' }), now).booking, y = E.book(S, req({ time: '14:00', phone: '0703333333' }), now).booking;
  assert.equal(E.setLift(S, x.id, 2).ok, false, 'lift 2 is taken by the other car');
  assert.ok(E.setLift(S, x.id, 0).ok); assert.ok(E.setLift(S, y.id, 1).ok); assert.ok(E.setLift(S, x.id, 2).ok);
  invariants(S);
});

test('cart limits and orders are all-or-nothing', () => {
  const now = at(MON, '08:00'), S = empty(now), dim = '205/55 R16';
  assert.equal(E.cartAdd(S, 'nope', dim).ok, false);
  E.cartAdd(S, 'p3', dim); E.cartAdd(S, 'p3', dim);
  assert.equal(E.cartAdd(S, 'p3', dim).capped, true); assert.equal(E.cartCount(S), 8);
  E.cartSet(S, 0, 3); assert.equal(E.cartCount(S), 3); E.cartSet(S, 0, 99); assert.equal(E.cartCount(S), 8);
  E.cartSet(S, 0, 0); assert.equal(S.cart.length, 0);
  assert.equal(E.order(S, Object.assign({ fit: false }, who), now).field, 'cart');

  E.cartAdd(S, 'p3', dim); const stock0 = E.stockOf(S, 'p3|' + dim), cart0 = clone(S.cart);
  const bad = E.order(S, Object.assign({ fit: true, reg: 'ABC 123', date: SAT, time: '10:00' }, who), now);
  assert.equal(bad.ok, false); assert.deepEqual(S.cart, cart0); assert.equal(E.stockOf(S, 'p3|' + dim), stock0); assert.equal(S.bookings.length, 0);

  const ok = E.order(S, Object.assign({ fit: true, reg: 'abc123', date: TUE, time: '10:00' }, who), now);
  assert.ok(ok.ok); assert.equal(S.cart.length, 0); assert.equal(ok.booking.svc, 'montering'); assert.match(ok.booking.note, /^Webborder W-/);
  assert.equal(ok.order.total, 4 * E.price(E.prod('p3'), dim) + E.FIT);
  assert.equal(E.stockOf(S, 'p3|' + dim), Math.max(0, stock0 - 4));

  // a dimension with no stock is accepted as a backorder
  const empty0 = Object.keys(S.stock).length; let k = null;
  for (const w of E.WS) for (const p of E.PS) for (const r of E.RS) { const d = E.dim(w, p, r); if (!k && E.stockOf(S, 'p5|' + d) === 0) k = d; }
  assert.ok(k && Object.keys(S.stock).length > empty0);
  E.cartAdd(S, 'p5', k);
  const back = E.order(S, Object.assign({ fit: false, email: 'test@exempel.se' }, who), now);
  assert.equal(back.order.pay, 'plats'); assert.equal(back.order.paid, false); assert.equal(E.payOrder(S, back.order.id, now).ok, false);
  assert.ok(back.ok && back.order.backorder); assert.equal(back.order.status, 'Beställd hos leverantör');
  assert.ok(!back.customer.cars.some((c) => !c.reg), 'no empty car rows');
  invariants(S);
});

test('calendar file', () => {
  const now = at(MON, '08:00'), S = empty(now), b = E.book(S, req(), now).booking, ics = E.ics(b);
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/); assert.match(ics, /\r\nEND:VCALENDAR\r\n$/);
  assert.match(ics, /DTSTART:20261124T090000Z/); assert.match(ics, /DTEND:20261124T093000Z/);
  assert.match(ics, /LOCATION:NK Bil & Däck\\, Brynäsgatan 67\\, 802 88 Gävle/);
  assert.ok(!/\n(?!\r)/.test(ics.replace(/\r\n/g, '')), 'CRLF only');
});

test('example data is deterministic per day and keeps every rule', () => {
  for (const [d, t] of [[MON, '06:00'], [MON, '12:00'], [FRI, '16:30'], [SAT, '10:00']]) {
    const now = at(d, t), A = E.seed(now), B = E.seed(now);
    assert.deepEqual(A.bookings, B.bookings); invariants(A);
    assert.ok(A.bookings.length >= 20, 'a believable week');
    assert.ok(A.bookings.filter((b) => b.date === now.date && b.status === 'Pågår').every((b) => E.toMin(b.time) <= now.mins));
  }
});

test('saved state survives reloads and the night', () => {
  const mon = at(MON, '15:00'), S = E.seed(mon);
  const mine = E.book(S, req({ date: TUE, time: '10:00' }), mon).booking; S.auto = true; E.cartAdd(S, 'p1', '205/55 R16');
  const raw = JSON.stringify(S);
  assert.deepEqual(E.restore(raw, mon), JSON.parse(raw), 'same day: unchanged');
  const tue = at(TUE, '07:30'), T = E.restore(raw, tue);
  assert.equal(T.seedDay, TUE);
  assert.ok(T.bookings.some((b) => b.id === mine.id), 'my booking is still there tomorrow');
  assert.ok(T.customers.some((c) => c.digits === '0701234567'));
  assert.equal(T.auto, true); assert.equal(T.cart.length, 1);
  assert.ok(T.seq > mine.id.slice(3), 'ids keep counting up');
  invariants(T);
  assert.equal(E.restore('{not json', tue).seedDay, TUE);
  assert.equal(E.restore(JSON.stringify({ v: 5, S: {} }), tue).v, E.VERSION, 'old versions start over');
  assert.equal(E.restore(null, tue).v, E.VERSION);
});

test('fuzz: 3000 random bookings, cancellations and moves never break the rules', () => {
  let r = 7; const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  const now = at(MON, '09:40'), S = E.seed(now), days = E.workdays(MON, 8).concat([SAT, SUN, '2026-11-20']);
  let ok = 0, refused = 0;
  for (let i = 0; i < 3000; i++) {
    const roll = rnd();
    if (roll < 0.7) {
      const s = E.SERVICES[Math.floor(rnd() * E.SERVICES.length)], d = days[Math.floor(rnd() * days.length)];
      const t = E.toT(360 + Math.floor(rnd() * 26) * 30 + (rnd() < 0.05 ? 15 : 0));
      const res = E.book(S, { svc: s.id, reg: 'FZZ ' + (100 + (i % 900)), date: d, time: t, name: 'Fuzz ' + i, phone: '070' + String(1000000 + i).slice(-7) }, now, rnd() < 0.1 ? { staff: true } : {});
      res.ok ? ok++ : refused++;
    } else if (roll < 0.85) {
      const live = S.bookings.filter((b) => b.status !== 'Avbokad'); if (live.length) E.cancel(S, live[Math.floor(rnd() * live.length)].id);
    } else {
      const live = S.bookings.filter((b) => b.status !== 'Avbokad'); if (!live.length) continue;
      E.move(S, live[Math.floor(rnd() * live.length)].id, days[Math.floor(rnd() * days.length)], E.toT(420 + Math.floor(rnd() * 20) * 30), now);
    }
    if (i % 250 === 0) invariants(S);
  }
  invariants(S);
  assert.ok(ok > 200 && refused > 200, `both outcomes exercised (${ok} booked, ${refused} refused)`);
  for (const d of E.workdays(MON, 8)) assert.equal(E.slots(S, d, 30, now).filter((x) => x.state === 'free').length >= 0, true);
  const st = E.dayStats(S, TUE, now); assert.ok(st.occ >= 0 && st.occ <= 100, 'occupancy ' + st.occ);
});

test('online payment is recorded only through payOrder, and bad methods are refused', () => {
  const now = at(MON, '08:00'), S = empty(now), dim = '205/55 R16';
  E.cartAdd(S, 'p3', dim); const cart0 = clone(S.cart), n0 = S.orders.length;
  const bad = E.order(S, Object.assign({ fit: false, pay: 'bitcoin' }, who), now);
  assert.equal(bad.ok, false); assert.equal(bad.field, 'pay'); assert.deepEqual(S.cart, cart0); assert.equal(S.orders.length, n0);
  const r = E.order(S, Object.assign({ fit: false, pay: 'swish' }, who), now);
  assert.ok(r.ok); assert.equal(r.order.pay, 'swish'); assert.equal(r.order.paid, false);
  assert.equal(E.payText(r.order), 'Väntar på Swish');
  assert.equal(E.payOrder(S, 'W-nope', now).ok, false);
  const p = E.payOrder(S, r.order.id, now);
  assert.ok(p.ok && p.order.paid); assert.equal(p.order.paidAt, MON + ' 08:00'); assert.equal(E.payText(p.order), 'Betald med Swish');
  assert.ok(E.payOrder(S, r.order.id, now).ok, 'paying twice is harmless');
  invariants(S);
});
