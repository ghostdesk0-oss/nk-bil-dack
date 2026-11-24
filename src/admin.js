/* Verkstaden: the workshop's own view of the same data the customer site writes.
   Daily brief, two-lift timeline, job cards, bookings, tyre hotel, customers, orders, stock, error log. */
(function () {
'use strict';
const NK = window.NK, E = NK.E, $ = NK.$, $$ = NK.$$, esc = E.esc, kr = E.kr, ic = NK.ic;
const REPO = 'https://github.com/ghostdesk0-oss/nk-bil-dack';
const A = { tab: 'idag', q: '', filter: 'nya', cust: null, open: new Set(), modal: null, tour: -1, confirm: null };
const TABS = [['idag', 'Idag'], ['bokningar', 'Bokningar'], ['hotell', 'Däckhotell'], ['kunder', 'Kunder'], ['ordrar', 'Ordrar'], ['lager', 'Lager'], ['logg', 'Logg']];
const S = () => NK.S, now = () => NK.now();
const cust = (id) => S().customers.find((c) => c.id === id) || { name: 'Okänd kund', phone: '', cars: [] };
const regp = (r) => '<span class="regp"><i>S</i>' + esc(r) + '</span>';
const live = (b) => b.status !== 'Avbokad';
const liftName = (L) => (L === 1 ? 'Lyft 1' : L === 2 ? 'Lyft 2' : 'Kö');
const tel = (p) => 'tel:' + String(p).replace(/[^\d+]/g, '').replace(/^0/, '+46');
// every change: read the latest saved state, change it, save it, draw again
function change(fn, msg) { NK.store.fresh(); const out = fn(S()); NK.store.save(); render(true); if (msg) NK.toast(typeof msg === 'function' ? msg(out) : msg); return out; }

/* ---------- pieces ---------- */
function pill(st) { return '<span class="pill s-' + st + '">' + E.LABEL[st] + '</span>'; }
const NEXTBTN = { Ny: 'Bekräfta', Bekräftad: 'Ta in på lyft', Pågår: 'Klar, skicka sms', Klar: 'Hämtad' };
function job(b, showDate) {
  const c = cust(b.custId), s = E.svc(b.svc), open = A.open.has(b.id), n = now(), ask = A.confirm === b.id;
  const hotel = c.hotel ? '<span>Hylla ' + esc(c.hotel.shelf) + '</span>' : '';
  let h = '<article class="job' + (b.status === 'Ny' ? ' isnew' : '') + (b.status === 'Avbokad' ? ' gone' : '') + '" data-id="' + b.id + '">' +
    '<div class="jt"><b>' + b.time + '</b><small>' + (showDate ? E.nice(b.date) : b.mins + ' min') + '</small></div>' +
    '<div class="jm"><div class="jl">' + regp(b.reg) + '<button class="linkb nm" data-a="cust" data-id="' + c.id + '">' + esc(c.name) + '</button>' + (b.fresh && b.status === 'Ny' ? '<span class="pill hot">Ny från webben</span>' : '') + '</div>' +
    '<div class="jsv">' + s.name + (b.extras && b.extras.length ? ' + ' + b.extras.map((x) => esc(x.n.toLowerCase())).join(', ') : '') + '<span>' + liftName(b.lift) + '</span>' + hotel + '<span>' + esc(b.src) + '</span></div>' +
    (b.note ? '<p class="jn">”' + esc(b.note) + '”</p>' : '') + '</div>' + pill(b.status);
  if (b.status !== 'Avbokad' && b.status !== 'Hämtad') {
    h += '<div class="ja">' + (NEXTBTN[b.status] ? '<button class="btn sm' + (b.status === 'Pågår' ? '' : ' ink') + '" data-a="adv" data-id="' + b.id + '"><span>' + NEXTBTN[b.status] + '</span></button>' : '') +
      '<button class="linkb" data-a="toggle" data-id="' + b.id + '" aria-expanded="' + open + '">' + (open ? 'Dölj detaljer' : 'Detaljer') + '</button></div>';
  }
  if (open && live(b)) {
    const t = b.tread == null ? 6 : b.tread, warn = b.tread != null && b.tread < 3, low = b.tread != null && b.tread < 4;
    h += '<div class="jx">' +
      '<div class="grp"><span>Lyft</span><div class="segs">' + [1, 2, 0].map((L) => '<button data-a="lift" data-id="' + b.id + '" data-v="' + L + '" aria-pressed="' + (b.lift === L) + '">' + liftName(L) + '</button>').join('') + '</div></div>' +
      '<div class="grp"><span>Mönsterdjup</span><div class="stepper"><button data-a="tread" data-id="' + b.id + '" data-d="-0.5" aria-label="Minska mönsterdjup">−</button><b>' + (b.tread == null ? 'ej mätt' : t.toFixed(1).replace('.', ',') + ' mm') + '</b><button data-a="tread" data-id="' + b.id + '" data-d="0.5" aria-label="Öka mönsterdjup">+</button></div>' +
        (warn ? '<em class="flag bad">Under 3 mm. Vinterdäck måste ha minst 3 mm.</em>' : low ? '<em class="flag">Under 4 mm. Tipsa om nya däck inför säsongen.</em>' : '') + '</div>' +
      '<div class="grp"><span>Checklista</span><div class="chips">' + [['bal', 'Balanserat'], ['torque', 'Momentdraget'], ['air', 'Lufttryck']].map((k) => '<button data-a="chk" data-id="' + b.id + '" data-v="' + k[0] + '" aria-pressed="' + !!(b.checks && b.checks[k[0]]) + '">' + (b.checks && b.checks[k[0]] ? ic('check') : '') + k[1] + '</button>').join('') + '</div></div>' +
      '<label class="grp"><span>Anteckning</span><textarea data-a="wnote" data-id="' + b.id + '" rows="2" placeholder="Syns bara i verkstaden">' + esc(b.wnote || '') + '</textarea></label>' +
      '<div class="jfoot"><a class="btn sm line" href="' + tel(c.phone) + '"><span>' + ic('tel') + 'Ring ' + esc(c.phone) + '</span></a>' +
      '<button class="btn sm line" data-a="moveb" data-id="' + b.id + '"><span>Flytta</span></button>' +
      (ask ? '<span class="confirm">Avboka ' + b.id + '? <button class="btn sm" data-a="cancel" data-id="' + b.id + '"><span>Ja, avboka</span></button><button class="linkb" data-a="nocancel">Nej</button></span>' : '<button class="linkb danger" data-a="askcancel" data-id="' + b.id + '">Avboka</button>') + '</div>' +
      (b.sms ? '<p class="note">Sms skickat ' + new Date(b.sms).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Stockholm' }) + '.</p>' : '') + '</div>';
  }
  return h + '</article>';
}
function timeline(date) {
  const n = now(), st = E.dayStats(S(), date, n), open = E.OPEN, close = E.closeMin(date), span = close - open, hrs = span / 60;
  const pct = (m) => ((m - open) / span * 100).toFixed(2) + '%';
  const lanes = [1, 2, 0].filter((L) => L || st.list.some((b) => b.lift === 0));
  let h = '<div class="tlg"><div class="tlh" style="grid-template-columns:repeat(' + hrs + ',1fr)">' + Array.from({ length: hrs }, (_, k) => '<span>' + E.pad(7 + k) + '</span>').join('') + '</div>' +
    lanes.map((L) => '<div class="lane"><span>' + liftName(L) + '</span><div class="track" style="--h:' + hrs + '">' + st.list.filter((b) => b.lift === L).map((b, k) =>
      '<button class="blk s-' + b.status + '" data-a="open" data-id="' + b.id + '" style="left:' + pct(E.toMin(b.time)) + ';width:calc(' + (b.mins / span * 100).toFixed(2) + '% - 3px);animation-delay:' + k * 40 + 'ms" aria-label="' + b.time + ' ' + esc(b.reg) + ', ' + E.svc(b.svc).name + ', ' + E.LABEL[b.status] + '"><b>' + esc(b.reg) + '</b><span>' + E.svc(b.svc).name + '</span></button>').join('') + '</div></div>').join('');
  if (date === n.date && n.mins > open && n.mins < close) h += '<i class="nowl" style="left:calc(64px + (100% - 64px) * ' + ((n.mins - open) / span).toFixed(4) + ')"><b>' + E.toT(n.mins) + '</b></i>';
  return h + '</div>';
}

/* ---------- tabs ---------- */
function tabIdag() {
  const s = S(), n = now(), day = E.isOpenDay(n.date) && n.mins < E.closeMin(n.date) ? n.date : E.workdays(E.addDays(n.date, 1), 1)[0];
  const st = E.dayStats(s, day, n), isT = day === n.date, dayW = isT ? 'Idag' : (day === E.addDays(n.date, 1) ? 'I morgon' : 'På ' + E.WDL[E.dow(day)]);
  const fresh = s.bookings.filter((b) => b.status === 'Ny' && b.date >= n.date).sort(E.byTime);
  const fitO = s.orders.filter((o) => o.status === 'Väntar på montering').length, back = s.orders.filter((o) => o.status === 'Beställd hos leverantör').length;
  const lowStock = Object.keys(s.stock).filter((k) => s.stock[k] < 4).length, hotelLow = s.customers.filter((c) => c.hotel && c.hotel.depth < 4).length;
  const greet = n.hour < 10 ? 'God morgon' : n.hour < 17 ? 'Hej' : 'God kväll';
  const L = [];
  L.push(['', dayW + ' har ni ' + st.count + ' ' + (st.count === 1 ? 'bokning' : 'bokningar') + (st.count ? ', den första ' + st.list[0].time + '.' : '.')]);
  L.push(fresh.length ? ['hot', fresh.length + ' ' + (fresh.length === 1 ? 'webbokning väntar' : 'webbokningar väntar') + ' på att ni bekräftar.'] : ['ok', 'Alla webbokningar är bekräftade.']);
  L.push(['', 'Lyftarna är bokade till ' + st.occ + ' procent' + (st.busiest != null ? ', mest tryck runt ' + st.busiest + '.' : '.') + ' ' + st.free + ' lediga halvtimmar kvar.']);
  if (fitO) L.push(['hot', fitO + ' ' + (fitO === 1 ? 'webborder ska' : 'webbordrar ska') + ' monteras.']);
  if (back) L.push(['', back + ' ' + (back === 1 ? 'order väntar' : 'ordrar väntar') + ' på däck från leverantören.']);
  if (lowStock) L.push(['', lowStock + (lowStock === 1 ? ' däckmodell i lagret har' : ' däckmodeller i lagret har') + ' färre än fyra kvar.']);
  if (hotelLow) L.push(['', (hotelLow === 1 ? '1 kund' : hotelLow + ' kunder') + ' i däckhotellet har under 4 mm. Bra läge att erbjuda nya däck.']);
  const jobs = st.list.filter((b) => b.status !== 'Hämtad');
  const days = E.workdays(n.date, 5), max = Math.max(1, ...days.map((d) => E.dayStats(s, d, n).count));
  return '<section class="brief" id="brief"><p class="when">' + E.WDL[n.dow].replace(/^./, (c) => c.toUpperCase()) + ' ' + E.D(n.date).getDate() + ' ' + E.MON[E.D(n.date).getMonth()] + ', ' + E.toT(n.mins) + '</p>' +
      '<h2 class="d">' + greet + ', Nicklas</h2><ul>' + L.map((l) => '<li class="' + l[0] + '">' + l[1] + '</li>').join('') + '</ul>' +
      '<div class="bacts"><button class="btn sm" data-a="new"><span>+ Ny bokning eller drop-in</span></button><button class="linkb" data-a="tour">Visa guide</button></div></section>' +
    '<div class="kpis" id="kpis"><div class="kpi"><b>' + st.count + '</b><span>' + (isT ? 'Bokningar idag' : 'Bokningar ' + E.WD[E.dow(day)]) + '</span></div><div class="kpi"><b>' + st.free + '</b><span>Lediga halvtimmar</span></div>' +
      '<div class="kpi' + (fresh.length ? ' hot' : '') + '"><b>' + fresh.length + '</b><span>Att bekräfta</span></div><div class="kpi"><b>' + kr(st.value) + '</b><span>Bokat värde, exempelpriser</span></div></div>' +
    '<section class="panel" id="lifts"><h3>Lyftarna ' + (isT ? 'idag' : E.nice(day)) + '</h3><div class="tlw">' + (st.count ? timeline(day) : '<p class="empty">Inga bokningar. Nya hamnar här så fort någon bokar.</p>') + '</div></section>' +
    (fresh.length ? '<section class="panel" id="confirm"><h3>Att bekräfta</h3>' + fresh.map((b) => job(b, true)).join('') + '</section>' : '') +
    '<section class="panel" id="jobs"><h3>Körschema ' + (isT ? 'idag' : E.nice(day)) + '</h3>' + (jobs.length ? jobs.map((b) => job(b, false)).join('') : '<p class="empty">Inget kvar att göra.</p>') + '</section>' +
    '<section class="panel"><h3>Kommande dagar</h3><div class="bars">' + days.map((d, i) => { const c = E.dayStats(s, d, n).count; return '<div><b>' + c + '</b><i style="height:' + Math.round(c / max * 100) + '%;animation-delay:' + i * 60 + 'ms"></i><span>' + E.WD[E.dow(d)] + '</span></div>'; }).join('') + '</div></section>';
}
function tabBokningar() {
  const s = S(), n = now(), q = A.q.toLowerCase().replace(/\s/g, '');
  const F = { nya: ['Att bekräfta', (b) => b.status === 'Ny' && b.date >= n.date], idag: ['Idag', (b) => b.date === n.date && live(b)], kommande: ['Kommande', (b) => b.date > n.date && live(b)], avbokade: ['Avbokade', (b) => b.status === 'Avbokad'], alla: ['Alla', () => true] };
  const match = (b) => { if (!q) return true; const c = cust(b.custId); return (b.reg + c.name + c.phone + b.id).toLowerCase().replace(/\s/g, '').includes(q); };
  const list = s.bookings.filter(F[A.filter][1]).filter(match).sort(E.byTime);
  const days = [...new Set(list.map((b) => b.date))];
  return '<div class="ahead"><h2 class="d">Bokningar</h2><button class="btn sm" data-a="new"><span>+ Ny bokning</span></button></div>' +
    '<div class="filters" role="group" aria-label="Filter">' + Object.keys(F).map((k) => '<button data-a="filter" data-v="' + k + '" aria-pressed="' + (A.filter === k) + '">' + F[k][0] + ' <b>' + s.bookings.filter(F[k][1]).length + '</b></button>').join('') + '</div>' +
    '<input class="search" id="aq" type="search" placeholder="Sök regnummer, namn, mobil eller bokningsnummer" aria-label="Sök bokning" value="' + esc(A.q) + '">' +
    (list.length ? days.map((d) => '<section class="panel"><h3>' + (d === n.date ? 'Idag' : E.nice(d)) + '</h3>' + list.filter((b) => b.date === d).map((b) => job(b, false)).join('') + '</section>').join('') : '<p class="empty">Inga bokningar här.</p>');
}
function tabHotell() {
  const s = S(), hs = s.customers.filter((c) => c.hotel).sort((a, b) => a.hotel.shelf.localeCompare(b.hotel.shelf)), cap = 360, used = 300 + hs.length;
  return '<div class="ahead"><h2 class="d">Däckhotell</h2><button class="btn sm" data-a="newhotel"><span>+ Lägg in hjul</span></button></div>' +
    '<p class="lede">' + hs.length + ' uppsättningar i demon. Under 4 mm flaggas inför nästa säsong.</p>' +
    '<div class="meter" role="img" aria-label="' + used + ' av ' + cap + ' platser, exempel"><i style="width:' + (used / cap * 100).toFixed(1) + '%"></i></div><p class="note">' + used + ' av ' + cap + ' platser, exempel.</p>' +
    '<section class="panel">' + hs.map((c) => {
      const h = c.hotel, low = h.depth < 4, bad = h.depth < 3, nb = s.bookings.find((b) => b.custId === c.id && live(b) && b.date >= now().date && (b.svc === 'skifte' || b.svc === 'hotell'));
      return '<div class="lrow"><div><b>Hylla ' + esc(h.shelf) + '</b> <button class="linkb nm" data-a="cust" data-id="' + c.id + '">' + esc(c.name) + '</button><div class="sub">' + regp((c.cars[0] || {}).reg || '') + ' ' + esc(h.tyres) + ', ' + esc(h.dim || '') + '</div></div>' +
        '<div class="r"><b class="' + (bad ? 'tbad' : low ? 'tlow' : '') + '">' + String(h.depth).replace('.', ',') + ' mm</b>' + (bad ? '<span class="pill s-Ny">Byt</span>' : low ? '<span class="pill hot">Erbjud nya</span>' : '') + '</div>' +
        '<div class="full">' + (nb ? '<span class="note">Skifte bokat ' + E.when(nb.date, nb.time, now()) + '</span>' : '<button class="btn sm ink" data-a="hotelbook" data-id="' + c.id + '"><span>Boka skifte</span></button>') + '<a class="linkb" href="' + tel(c.phone) + '">Ring</a></div></div>';
    }).join('') + '</section>';
}
function tabKunder() {
  const s = S(), q = A.q.toLowerCase().replace(/\s/g, '');
  if (A.cust) {
    const c = cust(A.cust), bs = s.bookings.filter((b) => b.custId === c.id).sort(E.byTime).reverse(), os = s.orders.filter((o) => o.custId === c.id);
    return '<button class="linkb" data-a="custback">Tillbaka till kunder</button><div class="ahead"><h2 class="d">' + esc(c.name) + '</h2><a class="btn sm line" href="' + tel(c.phone) + '"><span>' + ic('tel') + esc(c.phone) + '</span></a></div>' +
      '<div class="cols2"><section class="panel"><h3>Bokningar</h3>' + (bs.length ? bs.map((b) => job(b, true)).join('') : '<p class="empty">Inga bokningar än.</p>') + '</section>' +
      '<section class="panel"><h3>Kunduppgifter</h3><dl class="kv"><dt>Mobil</dt><dd>' + esc(c.phone) + '</dd>' + (c.email ? '<dt>Mejl</dt><dd>' + esc(c.email) + '</dd>' : '') + '<dt>Kund sedan</dt><dd>' + c.since + '</dd>' +
      c.cars.map((x) => '<dt>Bil</dt><dd>' + regp(x.reg) + ' ' + esc(x.model || '') + '</dd>').join('') +
      '<dt>Däckhotell</dt><dd>' + (c.hotel ? 'Hylla ' + esc(c.hotel.shelf) + ', ' + esc(c.hotel.tyres.toLowerCase()) + ', ' + String(c.hotel.depth).replace('.', ',') + ' mm' : 'Nej') + '</dd>' +
      '<dt>Ordrar</dt><dd>' + (os.length ? os.map((o) => o.id + ', ' + kr(o.total)).join('<br>') : 'Inga') + '</dd></dl></section></div>';
  }
  const list = s.customers.filter((c) => !q || (c.name + c.phone + c.cars.map((x) => x.reg).join('')).toLowerCase().replace(/\s/g, '').includes(q));
  return '<div class="ahead"><h2 class="d">Kunder</h2></div><input class="search" id="aq" type="search" placeholder="Sök namn, mobil eller regnummer" aria-label="Sök kund" value="' + esc(A.q) + '">' +
    '<section class="panel" id="custList">' + (list.length ? list.map((c) => '<div class="lrow"><div><button class="linkb nm" data-a="cust" data-id="' + c.id + '">' + esc(c.name) + '</button>' + (c.own ? ' <span class="pill hot">Ny</span>' : '') + '<div class="sub">' + esc(c.phone) + ' ' + c.cars.map((x) => regp(x.reg)).join(' ') + '</div></div><div class="r sub">' + (c.hotel ? 'Hylla ' + esc(c.hotel.shelf) : '') + '</div></div>').join('') : '<p class="empty">Ingen kund matchar. Prova med färre tecken.</p>') + '</section>';
}
const OSTEP = { 'Plockas': 'Klar att hämta', 'Beställd hos leverantör': 'Klar att hämta', 'Klar att hämta': 'Utlämnad', 'Väntar på montering': 'Monterad' };
function tabOrdrar() {
  const s = S();
  return '<div class="ahead"><h2 class="d">Webbordrar</h2></div><section class="panel">' + (s.orders.length ? s.orders.map((o) => {
    const c = cust(o.custId), done = o.status === 'Utlämnad' || o.status === 'Monterad';
    return '<div class="lrow' + (o.fresh && !done ? ' isnew' : '') + '"><div><b>' + o.id + '</b> <button class="linkb nm" data-a="cust" data-id="' + c.id + '">' + esc(c.name) + '</button><div class="sub">' + o.items.map((i) => { const p = E.prod(i.pid); return i.qty + ' st ' + esc(p.brand + ' ' + p.model) + ', ' + i.dim + (i.back ? ' (' + i.back + ' beställs hem)' : ''); }).join('<br>') + (o.fit ? '<br>Med montering' + (o.bookingId ? ', ' + o.bookingId : '') : '') + '</div><span class="pill' + (done ? ' s-Klar' : '') + '">' + esc(o.status) + '</span> <span class="pill' + (o.paid ? ' s-Klar' : '') + '">' + E.payText(o) + '</span></div>' +
      '<div class="r"><b>' + kr(o.total) + '</b></div>' + (OSTEP[o.status] ? '<div class="full"><button class="btn sm ink" data-a="ostep" data-id="' + o.id + '"><span>' + (OSTEP[o.status] === 'Utlämnad' ? 'Lämna ut' : OSTEP[o.status] === 'Monterad' ? 'Markera monterad' : 'Klar att hämta') + '</span></button></div>' : '') + '</div>';
  }).join('') : '<p class="empty">Inga ordrar än.</p>') + '</section>';
}
function tabLager() {
  const s = S(); E.PRODUCTS.forEach((p) => E.stockOf(s, p.id + '|205/55 R16'));
  const keys = Object.keys(s.stock).sort((a, b) => s.stock[a] - s.stock[b] || a.localeCompare(b));
  return '<div class="ahead"><h2 class="d">Lager</h2></div><p class="lede">Saldot räknas ner när någon handlar på webben. Lägst saldo överst.</p><section class="panel">' + keys.map((k) => {
    const p = E.prod(k.split('|')[0]), d = k.split('|')[1], n = s.stock[k];
    return '<div class="lrow"><div><b>' + esc(p.brand) + '</b> ' + esc(p.model) + '<div class="sub">' + d + ', ' + E.typeName(p.type).toLowerCase() + ', ' + kr(E.price(p, d)) + '</div></div><div class="r"><span class="stepper"><button data-a="stock" data-k="' + esc(k) + '" data-d="-1" aria-label="Minska saldo">−</button><b class="' + (n < 4 ? 'tbad' : '') + '">' + n + '</b><button data-a="stock" data-k="' + esc(k) + '" data-d="1" aria-label="Öka saldo">+</button></span></div></div>';
  }).join('') + '</section>';
}
function tabLogg() {
  const errs = window.NKErr ? window.NKErr.list() : [];
  const issue = (tpl, title, f) => { let q = 'template=' + tpl + '&title=' + encodeURIComponent(title); for (const k in f) q += '&' + k + '=' + encodeURIComponent(f[k]); return REPO + '/issues/new?' + q; };
  return '<div class="ahead"><h2 class="d">Logg</h2></div><p class="lede">Fel som händer på den här enheten sparas här. Ett tryck gör dem till ett ärende som rättas.</p>' +
    '<div class="cols2"><section class="panel"><h3>Fel på den här enheten</h3>' + (errs.length ? errs.map((e) => '<div class="lrow"><div><b>' + esc(e.m) + '</b><div class="sub">' + esc(e.s) + '<br>' + esc(e.t.replace('T', ' ').slice(0, 16)) + ', version ' + esc(e.v) + '</div></div><div class="r"><a class="btn sm ink" href="' + esc(issue('bug.yml', 'Fel: ' + e.m.slice(0, 70), { log: e.m + '\n' + e.s + '\n' + e.v + ' ' + e.w + '\n' + navigator.userAgent })) + '" target="_blank" rel="noopener"><span>Skapa ärende</span></a></div></div>').join('') + '<div class="lrow"><div></div><div class="r"><button class="linkb" data-a="clearerr">Rensa loggen</button></div></div>' : '<p class="empty">Inga fel loggade på den här enheten.</p>') + '</section>' +
    '<section class="panel"><h3>Tyck till</h3><div class="pad"><p class="lede">Något som borde vara annorlunda? Skriv det som du skulle säga det.</p><a class="btn sm" href="' + esc(REPO + '/issues/new?template=feedback.yml') + '" target="_blank" rel="noopener"><span>Skicka feedback</span></a></div></section></div>';
}

/* ---------- staff booking form: phone bookings, drop-ins, moves ---------- */
function modal() {
  const m = A.modal; if (!m) return '';
  const s = S(), n = now();
  if (m.kind === 'hotel') {
    return '<div class="amodal" role="dialog" aria-modal="true" aria-labelledby="amTitle"><form class="acard" id="hotelForm" novalidate><div class="ahead"><h3 id="amTitle">Lägg in hjul i däckhotellet</h3><button type="button" class="x" data-a="mclose" aria-label="Stäng">' + ic('x') + '</button></div>' +
      (m.err ? '<p class="aerr" role="alert">' + esc(m.err) + '</p>' : '') +
      '<label class="af"><span>Regnummer</span><input name="reg" value="' + esc(m.reg || '') + '" autocapitalize="characters" required></label>' +
      '<label class="af"><span>Namn</span><input name="name" value="' + esc(m.name || '') + '" required></label>' +
      '<label class="af"><span>Telefon</span><input name="phone" type="tel" inputmode="tel" value="' + esc(m.phone || '') + '" required></label>' +
      '<div class="af2"><label class="af"><span>Hjul</span><select name="tyres"><option>Sommarhjul</option><option>Vinterhjul</option></select></label><label class="af"><span>Dimension</span><input name="dim" value="205/55 R16"></label></div>' +
      '<label class="af"><span>Mönsterdjup, mm</span><input name="depth" type="text" inputmode="decimal" value="6,0" autocomplete="off"></label>' +
      '<p class="note">Hyllplats väljs automatiskt: nästa lediga är ' + nextShelf(s) + '.</p><div class="mfoot"><button type="button" class="btn sm line" data-a="mclose"><span>Avbryt</span></button><button class="btn sm" type="submit"><span>Spara</span></button></div></form></div>';
  }
  const mins = E.svc(m.svc).mins, days = E.workdays(n.date, 10), date = days.includes(m.date) ? m.date : days[0];
  const slots = E.slots(s, date, mins, n, m.moveId).filter((x) => x.state !== 'closed');
  const b = m.moveId && E.byId(s, m.moveId);
  return '<div class="amodal" role="dialog" aria-modal="true" aria-labelledby="amTitle"><form class="acard" id="staffForm" novalidate><div class="ahead"><h3 id="amTitle">' + (b ? 'Flytta ' + b.id : 'Ny bokning') + '</h3><button type="button" class="x" data-a="mclose" aria-label="Stäng">' + ic('x') + '</button></div>' +
    (m.err ? '<p class="aerr" role="alert">' + esc(m.err) + '</p>' : '') +
    (b ? '<p class="note">' + esc(cust(b.custId).name) + ', ' + regp(b.reg) + ', ' + E.svc(b.svc).name + '. Nu: ' + E.when(b.date, b.time, n) + '.</p>' :
      '<div class="segs wide" role="group" aria-label="Källa">' + ['Telefon', 'Drop-in'].map((x) => '<button type="button" data-a="msrc" data-v="' + x + '" aria-pressed="' + (m.src === x) + '">' + x + '</button>').join('') + '</div>' +
      '<label class="af"><span>Regnummer</span><input name="reg" value="' + esc(m.reg || '') + '" autocapitalize="characters" autocomplete="off"></label>' +
      '<div class="af2"><label class="af"><span>Namn</span><input name="name" value="' + esc(m.name || '') + '"></label><label class="af"><span>Telefon</span><input name="phone" type="tel" inputmode="tel" value="' + esc(m.phone || '') + '"></label></div>' +
      '<label class="af"><span>Tjänst</span><select name="svc" data-a="msvc">' + E.SERVICES.map((x) => '<option value="' + x.id + '"' + (x.id === m.svc ? ' selected' : '') + '>' + x.name + ', ' + x.mins + ' min</option>').join('') + '</select></label>') +
    (m.src === 'Drop-in' && !b ? '<p class="note">Drop-in läggs in nu, ' + E.toT(Math.ceil(n.mins / 30) * 30) + '. Är båda lyftarna upptagna hamnar bilen i kön.</p>' :
      '<div class="af2"><label class="af"><span>Dag</span><select name="date" data-a="mdate">' + days.map((d) => '<option value="' + d + '"' + (d === date ? ' selected' : '') + '>' + (d === n.date ? 'Idag, ' : '') + E.nice(d) + '</option>').join('') + '</select></label>' +
      '<label class="af"><span>Tid</span><select name="time">' + (slots.length ? slots.map((x) => '<option value="' + x.t + '"' + (x.t === m.time ? ' selected' : '') + (x.state === 'past' ? ' disabled' : '') + '>' + x.t + (x.state === 'full' ? ', fullt (kö)' : x.state === 'past' ? ', passerad' : '') + '</option>').join('') : '<option value="">Inga tider</option>') + '</select></label></div>') +
    (b ? '' : '<label class="af"><span>Anteckning</span><textarea name="note" rows="2">' + esc(m.note || '') + '</textarea></label>') +
    '<div class="mfoot"><button type="button" class="btn sm line" data-a="mclose"><span>Avbryt</span></button><button class="btn sm" type="submit"><span>' + (b ? 'Flytta' : 'Lägg in') + '</span></button></div></form></div>';
}
function nextShelf(s) {
  const used = new Set(s.customers.filter((c) => c.hotel).map((c) => c.hotel.shelf));
  for (const L of 'ABCD') for (let i = 1; i <= 40; i++) { const k = L + '-' + E.pad(i); if (!used.has(k)) return k; }
  return 'E-01';
}

/* ---------- guide ---------- */
const TOUR = [
  ['#brief', 'Dagens läge', 'Sammanfattningen räknas fram ur bokningarna, ordrarna och lagret varje gång vyn öppnas.'],
  ['#lifts', 'Två lyftar', 'Varje bokning får en lyft automatiskt. Däckjobb går till lyft 1, verkstadsjobb till lyft 2. Tryck på ett block för att se jobbet.'],
  ['#jobs', 'Körschemat', 'Ett tryck flyttar bilen vidare: bekräfta, ta in på lyft, klar. Under Detaljer loggar ni mönsterdjup, checklista och anteckning.'],
  ['[data-a=new]', 'Telefon och drop-in', 'Ringer någon eller rullar in med punktering läggs bilen in här på några sekunder, med samma krockkontroll som webben.']
];
function tourCard() {
  if (A.tour < 0) return '';
  const t = TOUR[A.tour];
  return '<div class="tour" role="dialog" aria-labelledby="tourT"><p class="note">' + (A.tour + 1) + ' av ' + TOUR.length + '</p><h3 id="tourT">' + t[1] + '</h3><p>' + t[2] + '</p><div class="mfoot">' + (A.tour ? '<button class="btn sm line" data-a="tprev"><span>Tillbaka</span></button>' : '<button class="btn sm line" data-a="tend"><span>Stäng</span></button>') + '<button class="btn sm" data-a="tnext"><span>' + (A.tour === TOUR.length - 1 ? 'Klart' : 'Nästa') + '</span></button></div></div>';
}

/* ---------- render ---------- */
function render(keep) {
  const root = $('#admin'); if (!root) return;
  // a redraw (often triggered by another tab) must not eat what staff are typing (L-016)
  flushNote(); if (A.modal) grabModal();
  const ae = document.activeElement, key = ae && root.contains(ae) ? (ae.id ? '#' + ae.id : ae.name ? '.amodal [name=' + ae.name + ']' : ae.dataset.a === 'wnote' ? '[data-a=wnote][data-id="' + ae.dataset.id + '"]' : null) : null;
  const sel = key && 'selectionStart' in ae ? (() => { try { return [ae.selectionStart, ae.selectionEnd]; } catch (e) { return null; } })() : null;
  const s = S(), n = now(), y = window.scrollY;
  const nNew = s.bookings.filter((b) => b.status === 'Ny' && b.date >= n.date).length;
  const body = { idag: tabIdag, bokningar: tabBokningar, hotell: tabHotell, kunder: tabKunder, ordrar: tabOrdrar, lager: tabLager, logg: tabLogg }[A.tab]();
  root.innerHTML = '<div class="abar"><div class="wrap"><button class="plate" data-a="site" aria-label="Till kundsidan">NK</button><div class="who"><b>Verkstaden</b><span>Brynäsgatan 67</span></div>' +
    '<label class="auto"><input type="checkbox" id="autoC"' + (s.auto ? ' checked' : '') + '><span class="sw2" aria-hidden="true"></span><span>Autobekräfta</span></label>' +
    '<button class="linkb reset" data-a="reset">Återställ demo</button></div></div>' +
    '<nav class="atabs" role="tablist" aria-label="Verkstaden">' + TABS.map((t) => '<button role="tab" data-a="tab" data-v="' + t[0] + '" aria-selected="' + (A.tab === t[0]) + '">' + t[1] + (t[0] === 'bokningar' && nNew ? '<b>' + nNew + '</b>' : '') + '</button>').join('') + '</nav>' +
    '<main class="amain"><div class="wrap">' + body + '</div></main>' + modal() + tourCard();
  if (keep) window.scrollTo(0, y);
  if (key) { const el = $(key, root); if (el) { el.focus({ preventScroll: true }); if (sel && el.setSelectionRange) try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { /* not a text field */ } } }
  if (A.tour >= 0) { $$('.tour-hl').forEach((e) => e.classList.remove('tour-hl')); const t = $(TOUR[A.tour][0], root); if (t) { t.classList.add('tour-hl'); if (!keep) t.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }
}

/* ---------- events ---------- */
let noteT = 0, noteP = null;
function flushNote() { if (!noteP) return; clearTimeout(noteT); const p = noteP; noteP = null; NK.store.fresh(); const b = E.byId(S(), p.id); if (b) { b.wnote = p.v.slice(0, 500); NK.store.save(); } }
document.addEventListener('click', (e) => {
  const el = e.target.closest('#admin [data-a]'); if (!el) return;
  const a = el.dataset.a, d = el.dataset, n = now();
  switch (a) {
    case 'site': NK.setView('site'); break;
    case 'tab': A.tab = d.v; A.cust = null; A.q = ''; A.tour = -1; NK.vt(() => { render(); window.scrollTo(0, 0); }); break;
    case 'filter': A.filter = d.v; render(true); break;
    case 'cust': A.tab = 'kunder'; A.cust = d.id; NK.vt(() => { render(); window.scrollTo(0, 0); }); break;
    case 'custback': A.cust = null; render(); break;
    case 'toggle': A.open.has(d.id) ? A.open.delete(d.id) : A.open.add(d.id); render(true); break;
    case 'open': { A.open.add(d.id); render(true); const j = $('#jobs .job[data-id="' + d.id + '"]') || $('.job[data-id="' + d.id + '"]'); if (j) j.scrollIntoView({ block: 'center', behavior: 'smooth' }); break; }
    case 'adv': change((s) => { const b = E.advance(s, d.id); if (b && b.status === 'Pågår') { A.open.add(b.id); if (!b.lift) E.setLift(s, b.id, E.assignLift(s, b)); } return b; },
      (b) => !b ? 'Bokningen har redan ändrats' : b.status === 'Klar' ? 'Sms till ' + cust(b.custId).phone + ': ”Hej! ' + b.reg + ' är klar att hämta hos NK Bil & Däck, Brynäsgatan 67.” Skickas på riktigt i skarp drift.' : b.id + ': ' + E.LABEL[b.status].toLowerCase()); break;
    case 'lift': change((s) => E.setLift(s, d.id, +d.v), (r) => (r.ok ? r.booking.id + ' står på ' + liftName(+d.v).toLowerCase() : r.err)); break;
    case 'tread': change((s) => { const b = E.byId(s, d.id); b.tread = Math.max(0, Math.min(12, Math.round(((b.tread == null ? 6 : b.tread) + +d.d) * 10) / 10)); const c = s.customers.find((x) => x.id === b.custId); if (c && c.hotel && (b.svc === 'skifte' || b.svc === 'hotell')) c.hotel.depth = b.tread; }); break;
    case 'chk': change((s) => { const b = E.byId(s, d.id); b.checks = b.checks || {}; b.checks[d.v] = !b.checks[d.v]; }); break;
    case 'askcancel': A.confirm = d.id; render(true); break;
    case 'nocancel': A.confirm = null; render(true); break;
    case 'cancel': A.confirm = null; change((s) => E.cancel(s, d.id), (r) => (r.ok ? r.booking.id + ' är avbokad' : 'Redan avbokad')); break;
    case 'moveb': { const b = E.byId(S(), d.id); openModal({ kind: 'book', moveId: b.id, svc: b.svc, date: b.date, time: b.time, src: 'Telefon' }); break; }
    case 'new': A.tour = -1; openModal({ kind: 'book', svc: 'skifte', src: 'Telefon', date: n.date }); break;
    case 'newhotel': openModal({ kind: 'hotel' }); break;
    case 'hotelbook': { const c = cust(d.id); openModal({ kind: 'book', svc: 'skifte', src: 'Telefon', reg: (c.cars[0] || {}).reg, name: c.name, phone: c.phone, note: 'Hämta från hylla ' + c.hotel.shelf + '.' }); break; }
    case 'msrc': A.modal.src = d.v; grabModal(); render(true); break;
    case 'mclose': A.modal = null; render(true); break;
    case 'ostep': change((s) => { const o = s.orders.find((x) => x.id === d.id); if (o && OSTEP[o.status]) { o.status = OSTEP[o.status]; o.fresh = false; } return o; }, (o) => o.id + ': ' + o.status.toLowerCase()); break;
    case 'stock': change((s) => { s.stock[d.k] = Math.max(0, E.stockOf(s, d.k) + +d.d); }); break;
    case 'clearerr': if (window.NKErr) window.NKErr.clear(); render(true); NK.toast('Loggen är rensad'); break;
    case 'reset':
      if (A.confirm !== 'reset') { A.confirm = 'reset'; NK.toast('Tryck igen för att återställa all demodata'); setTimeout(() => { if (A.confirm === 'reset') A.confirm = null; }, 4000); break; }
      A.confirm = null; try { localStorage.removeItem(E.KEY); localStorage.removeItem('nk-me'); } catch (x) { /* ignore */ }
      NK.store.load(); A.open.clear(); A.tab = 'idag'; render(); NK.renderSite(); NK.toast('Demon är återställd'); break;
    case 'tour': A.tour = 0; A.tab = 'idag'; render(); break;
    case 'tnext': A.tour = A.tour >= TOUR.length - 1 ? -1 : A.tour + 1; if (A.tour < 0) $$('.tour-hl').forEach((x) => x.classList.remove('tour-hl')); render(); break;
    case 'tprev': A.tour = Math.max(0, A.tour - 1); render(); break;
    case 'tend': A.tour = -1; $$('.tour-hl').forEach((x) => x.classList.remove('tour-hl')); render(true); break;
    default: break;
  }
});
function openModal(m) { A.modal = m; render(true); const f = $('.amodal select, .amodal input:not([type=hidden])'); if (f) f.focus(); }
function grabModal() { const f = $('#staffForm') || $('#hotelForm'); if (!f || !A.modal) return; new FormData(f).forEach((v, k) => { A.modal[k] = String(v); }); }
document.addEventListener('change', (e) => {
  if (e.target.id === 'autoC') { change((s) => { s.auto = e.target.checked; }, e.target.checked ? 'Nya webbokningar bekräftas automatiskt' : 'Nya webbokningar väntar på er bekräftelse'); return; }
  const a = e.target.dataset && e.target.dataset.a;
  if (a === 'mdate' || a === 'msvc') { grabModal(); A.modal.time = null; render(true); const f = $('.amodal [name=' + (a === 'mdate' ? 'date' : 'svc') + ']'); if (f) f.focus(); }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'aq') { A.q = e.target.value; render(true); }
  if (e.target.dataset && e.target.dataset.a === 'wnote') { noteP = { id: e.target.dataset.id, v: e.target.value }; clearTimeout(noteT); noteT = setTimeout(flushNote, 300); }
});
document.addEventListener('submit', (e) => {
  if (e.target.id === 'staffForm') {
    e.preventDefault(); grabModal(); const m = A.modal, n = now();
    if (m.moveId) {
      const r = change((s) => E.move(s, m.moveId, m.date || n.date, m.time, n, { force: true }));
      if (!r.ok) { m.err = r.err; render(true); return; }
      A.modal = null; render(true); NK.toast(r.booking.id + ' flyttad till ' + E.when(r.booking.date, r.booking.time, n)); return;
    }
    const drop = m.src === 'Drop-in', t = drop ? E.toT(Math.min(E.closeMin(n.date) - E.svc(m.svc).mins, Math.ceil(n.mins / 30) * 30)) : m.time;
    if (drop && (!E.isOpenDay(n.date) || n.mins >= E.closeMin(n.date))) { m.err = 'Verkstaden har stängt nu. Välj Telefon och boka en tid.'; render(true); return; }
    const r = change((s) => E.book(s, { svc: m.svc, reg: m.reg, name: m.name, phone: m.phone, date: drop ? n.date : m.date, time: t, note: m.note, src: m.src }, n, { staff: true, force: true }));
    if (!r.ok) { m.err = r.err.replace('Skriv ett telefonnummer', 'Skriv kundens telefonnummer').replace('Skriv ditt namn så vi vet vem som kommer.', 'Skriv kundens namn.'); render(true); return; }
    A.modal = null; A.open.add(r.booking.id); render(true);
    NK.toast(r.booking.reg + ' inlagd ' + E.when(r.booking.date, r.booking.time, n) + ', ' + liftName(r.booking.lift).toLowerCase() + (r.over ? '. Båda lyftarna var upptagna.' : ''));
  }
  if (e.target.id === 'hotelForm') {
    e.preventDefault(); grabModal(); const m = A.modal, r = E.normReg(m.reg), ph = E.normPhone(m.phone, true), depth = parseFloat(String(m.depth).replace(',', '.'));
    m.err = !r.ok ? E.MSG.reg : String(m.name || '').trim().length < 2 ? 'Skriv kundens namn.' : !ph.ok ? 'Skriv kundens telefonnummer.' : !(depth >= 0 && depth <= 12) ? 'Mönsterdjupet ska vara mellan 0 och 12 mm.' : null;
    if (m.err) { render(true); return; }
    const c = change((s) => { const c2 = E.customer(s, { name: String(m.name).trim(), phone: ph.phone, digits: ph.digits, reg: r.reg, email: '' }, ''); c2.hotel = { shelf: nextShelf(s), tyres: m.tyres || 'Sommarhjul', dim: m.dim || '', depth: Math.round(depth * 10) / 10 }; return c2; });
    A.modal = null; render(true); NK.toast(r.reg + ' står på hylla ' + c.hotel.shelf);
  }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#admin').hidden) { if (A.modal) { A.modal = null; render(true); } else if (A.tour >= 0) { A.tour = -1; render(true); } } });

window.NKAdmin = { render, state: A };
})();
