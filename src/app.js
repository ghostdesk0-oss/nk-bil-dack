/* NK Bil & Däck: the customer site. The 3D wheel glue, the price board, the tyre shop, the tyre hotel,
   and the booking sheet (book, cart, my bookings). All data goes through NKEngine (engine.js);
   Verkstaden (admin.js) reads and writes the same state. */
(function () {
'use strict';
const E = window.NKEngine;
const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = E.esc, kr = E.kr, ic = (n) => '<svg class="i"><use href="#i-' + n + '"/></svg>';
const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const NOW = () => E.sweNow();

/* ---------- state: one saved object shared by the site, Verkstaden and every open tab ---------- */
let S = null;
const read = () => { try { return localStorage.getItem(E.KEY); } catch (e) { return null; } };
const store = {
  load() { S = E.restore(read(), NOW()); store.save(); },
  save() { try { localStorage.setItem(E.KEY, JSON.stringify(S)); } catch (e) { /* private mode: the demo still works for this page view */ } },
  // re-read before every change, so a booking made in another tab is never overwritten
  fresh() { const raw = read(); if (raw) S = E.restore(raw, NOW()); }
};
['nk-demo-v5', 'nk-verkstad-os-v1', 'nk-verkstad-tour-v1'].forEach((k) => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } });
store.load();
const me = { get() { try { return JSON.parse(localStorage.getItem('nk-me')) || {}; } catch (e) { return {}; } }, set(v) { try { localStorage.setItem('nk-me', JSON.stringify(v)); } catch (e) { /* ignore */ } } };

let tT = 0;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.remove('on'); void t.offsetWidth; t.classList.add('on'); clearTimeout(tT); tT = setTimeout(() => t.classList.remove('on'), 3200); }
function vt(fn) { if (document.startViewTransition && !RM) { try { const t = document.startViewTransition(fn), no = () => {}; t.ready.catch(no); t.finished.catch(no); t.updateCallbackDone.catch(no); return; } catch (e) { /* fall through */ } } fn(); }

/* ---------- 3D wheel: the page decides where it is (pose), wheel.js eases toward it ---------- */
let wheel = null, G = {}, FOCUS = null, SCAN = null, SEASON = 'friktion', REG = '', typing = 0, typeY = 0;
const onScroll = [];
const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x), smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }, mix = (a, b, t) => a + (b - a) * t;
function measure() {
  const dm = document.documentElement.classList.contains('nodemo') ? 0 : $('.demo').offsetHeight;
  document.documentElement.style.setProperty('--demo-h', dm + 'px');
  const st = $('.stage').getBoundingClientRect(), sy = window.scrollY, story = $('#story'), pin = $('.pin');
  G = { dm, sTop: st.top + sy, sH: st.height, sL: st.left, sW: st.width, S0: story.offsetTop - dm, L: Math.max(1, story.offsetHeight - pin.offsetHeight), pinH: pin.offsetHeight };
}
function prog() { const y = window.scrollY; return { q: smooth((y - G.S0 * 0.12) / (G.S0 * 0.88)), p: clamp((y - G.S0) / G.L), y }; }
const FOC = { tread: { yaw: -1.28, s: 1.3, dx: 0.16, dy: 0, cam: 0.1 }, sidewall: { yaw: -0.36, s: 1.5, dx: 0, dy: 0.42, cam: 0.04 }, rim: { yaw: -0.22, s: 1.28, dx: 0, dy: 0.03, cam: 0.1 } };
function pose() {
  if ($('#site').hidden) return null;
  const vw = window.innerWidth, m = vw < 900, g = prog(), p = g.p, q = g.q;
  if (g.y > G.S0 + G.L + window.innerHeight) return null;
  let hx = m ? vw * 0.6 : G.sL + G.sW * 0.5, hy = G.sTop + G.sH * 0.46 - g.y, hd = m ? Math.min(G.sH * 0.98, vw * 0.78) : Math.min(G.sH * 0.72, G.sW * 0.8);
  if (vw <= 520) { hx = vw * 0.5; hd = Math.min(hd, vw * 0.66); }
  if (m && (FOCUS || SCAN === 'done') && q < 0.25) { const ch = ($('#gcard').offsetHeight || 220) + 96, ah = window.innerHeight - G.dm - ch; hx = vw * 0.5; hy = G.dm + ah * 0.52; hd = Math.min(vw * 0.74, ah * 0.8); }
  if (FOCUS && q < 0.25) { const fo = FOC[FOCUS]; return { active: true, lock: true, x: hx + hd * fo.dx, y: hy + hd * fo.dy, d: hd * fo.s, yaw: fo.yaw, pitch: 0, cam: fo.cam, floor: 1, temp: 0, snow: 0, spin: 0.06, e: 0, f: 1 }; }
  if (SCAN && q < 0.25) return { active: true, lock: true, x: hx, y: hy, d: hd * (SCAN === 'done' ? 0.92 : 1.04), yaw: -1.08, pitch: 0, cam: 0.15, floor: 1, temp: 0, snow: 0, spin: 0.25, e: 0, f: 1 };
  const sx = m ? vw * 0.5 : vw * 0.66, sy = G.dm + G.pinH * (m ? 0.33 : 0.5), sd0 = m ? Math.min(vw * 0.6, G.pinH * 0.3) : G.pinH * 0.44;
  const e = smooth((p - 0.37) / 0.1) * (1 - smooth((p - 0.93) / 0.07)) * (q > 0.98 ? 1 : 0), f = 1 + smooth((p - 0.65) / 0.07);
  const sd = sd0 * (1 + 0.4 * clamp(f - 1) * (1 - smooth((p - 0.93) / 0.07)));
  const c = 1 - smooth((p - 0.27) / 0.1), cx = m ? vw * 0.5 : vw * 0.66, cy = G.dm + G.pinH * (m ? 0.34 : 0.5), cd = G.pinH * (m ? 1.85 : 2.1);
  const win = SEASON === 'sommar' ? 0 : SEASON === 'dubb' ? 1 : 0.5, tS = mix(0.45, SEASON === 'sommar' ? 0.1 : SEASON === 'dubb' ? 1 : 0.82, c);
  if (typing && m) return { active: true, x: vw * 0.5, y: typeY, d: Math.min(190, vw * 0.5), yaw: -0.25, pitch: 0.1, e: 0, f: 1, spin: 0.5, floor: 0, temp: 0.45 };
  return { active: true, x: mix(hx, mix(sx, cx, c), q), y: mix(hy, mix(sy, cy, c), q), d: mix(hd, mix(sd, cd, c), q),
    yaw: mix(-0.62, mix(m ? 0.35 : mix(0.95, 0.8, clamp(f - 1)), -1.5, c), q), pitch: mix(0, mix(m ? -0.95 : 0.14, 0, c), q), e, f,
    spin: mix(0.3, mix(0.12, 0.2, c), q), temp: tS * q, snow: q * c * win, floor: 1 - smooth(q / 0.45), cam: 0.15 * (1 - q) };
}
/* hotspots and spec badges follow points on the wheel */
const HS = $$('.hs'), BG = $$('.badge'); let BADGES = false, hotOn = false; const bornAt = performance.now();
function hotLoop() {
  if (hotOn || !wheel) return; hotOn = true;
  (function run() {
    const y = window.scrollY, near = y < G.S0 * 0.5 && !$('#site').hidden && !W;
    const show = near && y < 30 && !FOCUS && !SCAN && performance.now() - bornAt > 2600;
    for (let i = 0; i < 3; i++) {
      const nm = HS[i].dataset.v, pt = near ? wheel.project(nm) : null, on = !!(show && pt);
      HS[i].classList.toggle('on', on);
      if (on) { HS[i].removeAttribute('inert'); HS[i].removeAttribute('tabindex'); } else { HS[i].setAttribute('inert', ''); HS[i].setAttribute('tabindex', '-1'); }
      if (pt) {
        const cx = Math.max(28, Math.min(window.innerWidth - 28, pt.x)), cy = Math.max(G.dm + 34, Math.min(window.innerHeight - 116, pt.y));
        HS[i].style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
        const off = nm === 'tread' ? [-18, -44] : nm === 'sidewall' ? [14, -40] : [18, 6];
        const bx = Math.max(8, Math.min(window.innerWidth - BG[i].offsetWidth - 8, cx + off[0] - (nm === 'tread' ? BG[i].offsetWidth * 0.5 : 0)));
        const by = Math.max(G.dm + 8, Math.min(window.innerHeight - BG[i].offsetHeight - 96, cy + off[1]));
        BG[i].style.transform = 'translate3d(' + bx.toFixed(1) + 'px,' + by.toFixed(1) + 'px,0)';
      }
      BG[i].classList.toggle('on', !!(BADGES && near && pt && y < 30));
    }
    if (near) requestAnimationFrame(run);
    else { hotOn = false; HS.forEach((h) => { h.classList.remove('on'); h.setAttribute('inert', ''); h.setAttribute('tabindex', '-1'); }); BG.forEach((b) => b.classList.remove('on')); }
  })();
}
onScroll.push(() => { if (window.scrollY > 40 && (FOCUS || SCAN)) closeCard(); if (!hotOn && window.scrollY < 10) hotLoop(); });
function card(html) { if (wheel) document.body.classList.add('inspect'); const g = $('#gcard'); g.hidden = false; g.innerHTML = html + '<button class="x" data-act="cardx" aria-label="Stäng">' + ic('x') + '</button>'; requestAnimationFrame(() => g.classList.add('on')); }
function closeCard() { FOCUS = null; SCAN = null; BADGES = false; document.body.classList.remove('inspect'); const g = $('#gcard'); g.classList.remove('on'); g.hidden = true; }
const HOT = { tread: ['Hjulskifte', 'Vi skiftar till dina egna hjul, kollar lufttrycket och mäter mönsterdjupet.', 'skifte'],
  sidewall: ['Montering och balansering', 'Nya däck på dina fälgar, balanserade så att ratten ligger still i alla farter.', 'montering'],
  rim: ['Däckhotell', 'Vi förvarar dina hjul över säsongen och säger till när det är dags att byta.', 'hotell'] };
function openHot(v) {
  const h = HOT[v], sv = E.svc(h[2]), nf = E.nextFree(S, sv.mins, NOW());
  FOCUS = v; SCAN = null; BADGES = false;
  card('<h3 class="d" id="gcardTitle">' + h[0] + '</h3><p>' + h[1] + '</p><dl class="facts"><dt>Pris</dt><dd>' + E.pTxt(sv) + (sv.unit ? ' ' + sv.unit : '') + ', exempel</dd><dt>Första lediga</dt><dd>' + (nf ? E.when(nf.date, nf.time, NOW()) : 'ring oss') + '</dd></dl>' +
    '<div class="acts"><button class="btn sm" data-act="book" data-svc="' + sv.id + '"' + (nf ? ' data-date="' + nf.date + '" data-time="' + nf.time + '"' : '') + '><span>Boka ' + sv.name.toLowerCase() + '</span></button></div>');
}
/* registration number: laser scan, spec badges, then a result card that books in one tap */
function runScan() {
  const inp = $('#heroReg'), pl = $('#regPlate'), r = E.normReg(inp.value), err = $('#heroErr');
  if (!r.ok) { err.textContent = E.MSG.reg; pl.classList.remove('bad'); void pl.offsetWidth; pl.classList.add('bad'); inp.focus(); return; }
  err.textContent = ''; REG = r.reg; inp.value = REG; inp.blur(); closeCard();
  const d = E.dimForReg(REG);
  const done = () => {
    pl.classList.remove('scanning');
    F.w = d[0]; F.p = d[1]; F.r = d[2]; renderSize(); renderTyres();
    const dim = dimStr(), n = E.PRODUCTS.filter((p) => p.type === SEASON && E.stockOf(S, p.id + '|' + dim) >= 4).length, nf = E.nextFree(S, 30, NOW());
    const note = $('#sizeNote'); note.innerHTML = 'Förifyllt från <b>' + esc(REG) + '</b>. Dimensionen är ett exempel i förhandsvisningen.'; note.hidden = false;
    if ($('#fReg') && W) $('#fReg').value = REG;
    BG[0].firstChild.innerHTML = 'Dimension <b>' + dim + '</b>'; BG[1].firstChild.innerHTML = 'I lager <b>' + n + ' ' + (n === 1 ? 'modell' : 'modeller') + '</b>';
    BG[2].firstChild.innerHTML = 'Första lediga <b>' + (nf ? E.when(nf.date, nf.time, NOW()) : 'ring oss') + '</b>';
    BADGES = true; SCAN = 'done'; hotLoop();
    card('<h3 class="d" id="gcardTitle">' + esc(REG) + '</h3><dl class="facts"><dt>Däck</dt><dd>' + dim + '</dd><dt>Hjulskifte</dt><dd>' + (nf ? E.when(nf.date, nf.time, NOW()) : 'ring oss på 026-18 05 01') + '</dd></dl>' +
      '<p>I förhandsvisningen är dimensionen ett exempel. Skarpt hämtas den från fordonsregistret.</p>' +
      '<div class="acts">' + (nf ? '<button class="btn sm" data-act="book" data-svc="skifte" data-date="' + nf.date + '" data-time="' + nf.time + '"><span>Boka hjulskifte ' + E.when(nf.date, nf.time, NOW()) + '</span></button>' : '') +
      '<a class="btn sm line" href="#dack" data-act="cardx"><span>Se däck i ' + dim + '</span></a></div>');
  };
  if (!wheel || RM) { done(); return; }
  SCAN = 'run'; pl.classList.remove('scanning'); void pl.offsetWidth; pl.classList.add('scanning'); window.scrollTo({ top: 0, behavior: 'smooth' }); wheel.scan(done);
}
$('#plateform').addEventListener('submit', (e) => { e.preventDefault(); runScan(); });
$('#heroReg').addEventListener('input', () => { $('#heroErr').textContent = ''; });

const CAPS = $$('.cap'), GH = $$('.ghost span'), TK = $$('.ticks i');
function storyUI() {
  const g = prog(), on = g.q > 0.9 && g.p < 0.999, i = g.p < 0.32 ? 0 : g.p < 0.66 ? 1 : 2, cuts = [0.02, 0.32, 0.66, 0.96];
  CAPS.forEach((c, k) => c.classList.toggle('on', on && k === i));
  GH.forEach((c, k) => c.classList.toggle('on', on && k === i && g.p > 0.03));
  TK.forEach((c, k) => c.style.setProperty('--v', clamp((g.p - cuts[k]) / (cuts[k + 1] - cuts[k])).toFixed(3)));
}
let revving = false;
function startWheel() {
  measure();
  // ask first, so devices without WebGL get the flat page quietly instead of a renderer error
  let gl = null; try { const c = document.createElement('canvas'); gl = c.getContext('webgl2') || c.getContext('webgl'); const x = gl && gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } catch (e) { gl = null; }
  try { wheel = gl && window.NKWheel && window.NKWheel.mount($('#wheel'), { pose, season: SEASON }); } catch (e) { wheel = null; }
  if (!wheel) { document.documentElement.classList.add('nogl'); return; }
  wheel.bindDrag($('#dragHero')); wheel.bindDrag($('#dragStory'));
  // the canvas is fixed, so observe the sections it belongs to (L-010)
  if ('IntersectionObserver' in window && wheel.setVisible) {
    const vis = { hero: true, story: true };
    const io = new IntersectionObserver((es) => { es.forEach((en) => { vis[en.target.id === 'story' ? 'story' : 'hero'] = en.isIntersecting; }); if (wheel) wheel.setVisible(vis.hero || vis.story); }, { rootMargin: '150px 0px' });
    io.observe($('.hero')); io.observe($('#story'));
  }
  const dh = $('#dragHero'), off = () => { revving = false; wheel.rev(false); humStop(); };
  dh.addEventListener('pointerdown', () => { revving = true; wheel.rev(true); humStart(); if (navigator.vibrate) try { navigator.vibrate(25); } catch (x) { /* ignore */ } smokeLoop(); $('#hint').classList.add('gone'); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((n) => dh.addEventListener(n, off));
  const tt = $('#tyreText'), pin = $('.pin');
  tt.addEventListener('focus', () => { if (window.innerWidth >= 900) return; pin.classList.add('typing'); document.documentElement.classList.add('tw'); requestAnimationFrame(() => { typeY = CAPS[1].getBoundingClientRect().bottom + 112; typing = 1; }); });
  let tyT = 0; tt.addEventListener('blur', () => { clearTimeout(tyT); tyT = setTimeout(() => { if (document.activeElement === tt) return; typing = 0; pin.classList.remove('typing'); document.documentElement.classList.remove('tw'); }, 320); });
  tt.addEventListener('keydown', (e) => { if (e.key === 'Enter') tt.blur(); });
  onScroll.push(storyUI); hotLoop(); storyUI();
}
if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('italic 900 64px Archivo'), document.fonts.load('700 40px Archivo')]).then(startWheel, startWheel); else startWheel();
window.addEventListener('resize', () => { measure(); storyUI(); });

/* burnout smoke and optional sound (off until the speaker button is pressed) */
let smokeOn = false; const PT = []; let acc = 0;
function smokeLoop() {
  if (smokeOn || RM || !wheel) return; smokeOn = true;
  const c = $('#smoke'), g = c.getContext('2d'), col = getComputedStyle(document.documentElement).getPropertyValue('--smokec').trim() || 'rgba(210,200,198,.5)';
  const spr = document.createElement('canvas'); spr.width = spr.height = 128;
  { const sg = spr.getContext('2d'), gr = sg.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(210,200,198,0)'); sg.fillStyle = gr; sg.fillRect(0, 0, 128, 128); }
  const dpr = Math.min(window.devicePixelRatio || 1, 2); c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
  let prev = performance.now();
  (function run(n) {
    const dt = Math.min(0.05, (n - prev) / 1000); prev = n; const sp = Math.abs(wheel.speed()), P = wheel.where(); humTick(sp);
    if (sp > 12 && window.scrollY < G.S0 * 0.4) { acc += Math.min(140, (sp - 12) * 6) * dt; for (; acc >= 1; acc--) if (PT.length < 180) PT.push({ x: P.x - P.d * 0.04 + (Math.random() - 0.5) * P.d * 0.16, y: P.y + P.d * 0.47, vx: -(50 + Math.random() * 230), vy: -(10 + Math.random() * 64), r: P.d * 0.05 + Math.random() * P.d * 0.06, a: 0.2 + Math.random() * 0.18, l: 0 }); }
    g.clearRect(0, 0, c.clientWidth, c.clientHeight);
    for (let j = PT.length - 1; j >= 0; j--) { const p = PT[j]; p.l += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.985; p.vy *= 0.985; p.r += dt * P.d * 0.12; const al = p.a * (1 - p.l / 2.1); if (al <= 0) { PT.splice(j, 1); continue; } g.globalAlpha = al; g.drawImage(spr, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); }
    g.globalAlpha = 1;
    if (PT.length || sp > 12 || revving) requestAnimationFrame(run); else { smokeOn = false; g.clearRect(0, 0, c.clientWidth, c.clientHeight); }
  })(prev);
}
const SND = { ctx: null, on: false }; let HUM = null;
function audio() { if (!SND.ctx) { try { const AC = window.AudioContext || window.webkitAudioContext; SND.ctx = AC ? new AC() : null; } catch (e) { SND.ctx = null; } } if (SND.ctx && SND.ctx.state === 'suspended') SND.ctx.resume(); return SND.ctx; }
function burst() {
  const c = SND.on && audio(); if (!c) return; const t = c.currentTime, len = 0.16;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * len), c.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 2);
  const src = c.createBufferSource(); src.buffer = buf; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1700; f.Q.value = 0.9;
  const g = c.createGain(); g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.001, t + len); src.connect(f); f.connect(g); g.connect(c.destination); src.start(t);
}
function humStart() { const c = SND.on && audio(); if (!c || HUM) return; const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 36; const o2 = c.createOscillator(); o2.type = 'triangle'; o2.frequency.value = 72;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260; f.Q.value = 2; const g = c.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(0.06, c.currentTime + 0.3);
  o.connect(f); o2.connect(f); f.connect(g); g.connect(c.destination); o.start(); o2.start(); HUM = { o, o2, g, c }; }
function humTick(sp) { if (!HUM) return; const s = Math.min(1, Math.abs(sp) / 48), t = HUM.c.currentTime; HUM.o.frequency.setTargetAtTime(36 + s * 52, t, 0.06); HUM.o2.frequency.setTargetAtTime(72 + s * 104, t, 0.06); HUM.g.gain.setTargetAtTime(0.03 + 0.08 * s, t, 0.08); }
function humStop() { if (!HUM) return; const h = HUM; HUM = null; const t = h.c.currentTime; h.g.gain.cancelScheduledValues(t); h.g.gain.setTargetAtTime(0, t, 0.14); setTimeout(() => { try { h.o.stop(); h.o2.stop(); } catch (e) { /* ignore */ } }, 700); }

/* ---------- price board ---------- */
function renderBoard() {
  const now = NOW();
  $('#board').innerHTML = E.SERVICES.map((s) => {
    const nf = E.nextFree(S, s.mins, now, 6);
    return '<li><button class="row" data-act="book" data-svc="' + s.id + '"><span class="n">' + s.name + '</span><span class="p">' + E.pTxt(s) + (s.unit ? '<small> ' + s.unit + '</small>' : '') + '</span><span class="s">' + s.short + '</span>' +
      '<span class="meta"><span class="free' + (nf ? '' : ' none') + '">' + (nf ? 'Ledigt ' + E.when(nf.date, nf.time, now) : 'Fullbokat närmaste veckan') + '</span><span>Cirka ' + s.mins + ' min</span>' + (s.real ? '<span class="tag">NK:s pris</span>' : '') + '<span class="go">Boka' + ic('go') + '</span></span></button></li>';
  }).join('');
}

/* ---------- tyre shop ---------- */
const F = { w: 205, p: 55, r: 16 };
const dimStr = () => E.dim(F.w, F.p, F.r);
function renderSize(dir, which) {
  const dg = (k, label) => '<div class="digit"><button data-act="step" data-k="' + k + '" data-d="1" aria-label="Öka ' + label + '">' + ic('up') + '</button><span class="v" aria-live="polite" aria-label="' + label + ' ' + F[k] + '"><b class="' + (which === k || which === '*' ? (dir > 0 ? 'up' : 'dn') : '') + '">' + F[k] + '</b></span><button data-act="step" data-k="' + k + '" data-d="-1" aria-label="Minska ' + label + '">' + ic('dn') + '</button></div>';
  $('#size').innerHTML = dg('w', 'bredd') + '<span class="sep">/</span>' + dg('p', 'profil') + '<span class="sep">R</span>' + dg('r', 'fälgdiameter');
}
function renderSeason() {
  const i = E.TYPES.map((t) => t[0]).indexOf(SEASON);
  $$('[data-season]').forEach((el) => {
    if (!el.firstChild) el.innerHTML = '<i></i>' + E.TYPES.map((t) => '<button data-act="season" data-v="' + t[0] + '">' + t[1] + '</button>').join('');
    el.setAttribute('role', 'group'); el.setAttribute('aria-label', 'Säsong');
    el.style.setProperty('--i', i); $$('button', el).forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === SEASON));
  });
}
function setSeason(v) { if (v === SEASON) return; SEASON = v; if (wheel) wheel.setSeason(v); renderSeason(); renderTyres(); }
function renderTyres() {
  const dim = dimStr();
  $('#tyres').innerHTML = E.PRODUCTS.filter((p) => p.type === SEASON).map((p) => {
    const st = E.stockOf(S, p.id + '|' + dim), pr = E.price(p, dim), inCart = S.cart.find((i) => i.pid === p.id && i.dim === dim);
    const sTxt = st >= 8 ? st + ' i lager' : st >= 4 ? 'Bara ' + st + ' kvar i lager' : st > 0 ? st + ' i lager, resten beställs hem på 2–3 dagar' : 'Beställs hem på 2–3 dagar';
    return '<article class="tcard"><div><div class="k">' + esc(p.brand) + ', ' + E.typeName(p.type).toLowerCase() + '</div><div class="m">' + esc(p.model) + '</div></div>' +
      '<div class="pr">' + kr(pr) + '<small>4 st ' + kr(pr * 4) + '</small></div><div class="s ' + (st >= 8 ? 'ok' : st > 0 ? 'low' : 'back') + '">' + dim + '. ' + sTxt + '</div>' +
      '<button class="btn sm ink" data-act="add" data-pid="' + p.id + '"><span>' + (inCart ? ic('check') + inCart.qty + ' i varukorgen, lägg till 4' : 'Lägg 4 i varukorgen') + '</span></button></article>';
  }).join('');
  setCart();
}
function setCart() {
  const n = E.cartCount(S), e = $('#cartn'), bm = $('#barMain');
  e.textContent = n; e.setAttribute('data-n', n); e.parentNode.setAttribute('aria-label', n ? 'Varukorgen, ' + n + ' däck' : 'Varukorgen är tom');
  bm.dataset.act = n ? 'cart' : 'book'; bm.innerHTML = '<span>' + (n ? ic('cart') + 'Varukorg, ' + n + ' däck' : 'Boka tid') + '</span>';
}

/* ---------- tyre hotel ---------- */
let hpNow = 895, hpRaf = 0;
function renderHotel() {
  const sv = E.svc('hotell');
  $('#hotelOpts').innerHTML = '<label class="ck fixed"><input type="checkbox" checked disabled><span class="box"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span>Förvaring och skifte<small>Vår och höst, mönsterdjupet mäts</small></span><em>' + kr(sv.price) + '</em></label>' +
    E.HOTEL_X.map((x) => '<label class="ck"><input type="checkbox" data-x="' + x.id + '"><span class="box"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span>' + x.n + '<small>' + (x.id === 'wash' ? 'Rena hjul innan de ställs undan' : 'Inför varje säsong, så slipper du vibrationer') + '</small></span><em>+' + kr(x.p) + '</em></label>').join('');
}
const hotelExtras = () => E.HOTEL_X.filter((x) => { const i = $('#hotelOpts input[data-x="' + x.id + '"]'); return i && i.checked; });
function tweenHotel() {
  const to = E.svc('hotell').price + hotelExtras().reduce((a, x) => a + x.p, 0), from = hpNow, t0 = performance.now(), el = $('#hotelPrice');
  cancelAnimationFrame(hpRaf);
  (function run(n) { const t = Math.min(1, (n - t0) / (RM ? 1 : 420)), k = 1 - Math.pow(1 - t, 3); hpNow = Math.round(from + (to - from) * k); el.textContent = kr(hpNow); if (t < 1) hpRaf = requestAnimationFrame(run); })(t0);
}

/* ---------- find us ---------- */
function renderVisit() {
  const now = NOW(), os = E.openState(now), el = $('#openNow');
  el.textContent = os.text; el.className = 'status' + (os.open ? ' open' : '');
  const hrs = [['Måndag', 1], ['Tisdag', 2], ['Onsdag', 3], ['Torsdag', 4], ['Fredag', 5], ['Lördag', 6], ['Söndag', 0]];
  $('#hours').innerHTML = hrs.map((h) => { const c = h[1] === 0 || h[1] === 6 ? 0 : h[1] === 5 ? 16 : 17; return '<tr class="' + (h[1] === now.dow ? 'today' : '') + '"><td>' + h[0] + '</td><td>' + (c ? '07–' + c : 'Stängt') + '</td></tr>'; }).join('');
}
function renderSite() { renderBoard(); renderTyres(); renderVisit(); }

/* ---------- the booking sheet: book, cart, my bookings, move ---------- */
let W = null, closeT = 0, lastFocus = null;
const STEPS = { book: ['what', 'when', 'who', 'done'], order: ['cart', 'when', 'pay', 'who', 'done'], mine: ['mine'], move: ['when', 'done'] };
const TITLES = { what: 'Vad gäller det?', when: 'Välj tid', who: 'Dina uppgifter', done: 'Klart', cart: 'Varukorgen', pay: 'Betalning', mine: 'Mina bokningar' };
function openFlow(kind, o) {
  o = o || {}; clearTimeout(closeT);
  const m = me.get(), sc = $('#scrim');
  sc.classList.remove('out'); $('#sheet').innerHTML = '';
  const reg = o.reg || REG || m.reg || '';
  W = { kind, steps: STEPS[kind].slice(), i: 0, shown: -1, svc: o.svc || null, reg, date: o.date || null, time: o.time || null, extras: o.extras || [],
    name: m.name || '', phone: o.phone || m.phone || '', email: m.email || '', note: '', fit: true, err: null, result: null, moveId: o.moveId || null, list: null, ask: null, busy: false, model: '', pay: 'plats' };
  if (kind === 'book' && W.svc) W.i = E.normReg(W.reg).ok ? (W.date && W.time && E.slotState(S, W.date, W.time, E.svc(W.svc).mins, NOW()) === 'free' ? 2 : 1) : 0;
  if (kind === 'mine' && W.phone) W.list = E.mine(S, W.phone, NOW());
  lastFocus = document.activeElement; document.documentElement.style.overflow = 'hidden'; document.body.classList.add('sheet-open');
  $('#site').inert = true; $('.demo').inert = true; sc.classList.add('on');
  try { if (!history.state || !history.state.sheet) history.pushState({ sheet: 1 }, ''); } catch (e) { /* ignore */ }
  renderSheet();
}
function closeFlow(fromPop) {
  if (!W) return; W = null; const sc = $('#scrim'); sc.classList.add('out'); document.documentElement.style.overflow = ''; document.body.classList.remove('sheet-open'); $('#site').inert = false; $('.demo').inert = false;
  closeT = setTimeout(() => { sc.classList.remove('on', 'out'); $('#sheet').innerHTML = ''; }, RM ? 0 : 190);
  if (!fromPop) { try { if (history.state && history.state.sheet) history.back(); } catch (e) { /* ignore */ } }
  if (lastFocus && lastFocus.focus && lastFocus.isConnected) try { lastFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  if (!hotOn && window.scrollY < 10) hotLoop();
}
window.addEventListener('popstate', () => { if (W) closeFlow(true); });
const flowMins = () => (W.kind === 'order' ? E.svc('montering').mins : W.kind === 'move' ? (E.byId(S, W.moveId) || { mins: 30 }).mins : E.svc(W.svc).mins);
function hubSvg() {
  let s = '<svg class="hub" viewBox="0 0 56 56" aria-hidden="true"><circle class="ring" cx="28" cy="28" r="25"/><circle cx="28" cy="28" r="5" fill="currentColor"/>';
  for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * Math.PI * 2 / 5, x = 28 + Math.cos(a) * 15, y = 28 + Math.sin(a) * 15, p = []; for (let j = 0; j < 6; j++) { const b = j * Math.PI / 3; p.push((x + Math.cos(b) * 5.4).toFixed(1) + ',' + (y + Math.sin(b) * 5.4).toFixed(1)); } s += '<polygon class="nut" points="' + p.join(' ') + '"/>'; }
  return s + '</svg>';
}
const fieldErr = (f) => (W.err && W.err.field === f ? '<p class="ferr" role="alert" id="err-' + f + '">' + W.err.err + '</p>' : '');
const bad = (f) => (W.err && W.err.field === f ? ' bad' : '');
const regField = (label) => '<label class="field' + bad('reg') + '"><span>' + label + '</span><span class="reg"><i></i><input id="fReg" value="' + esc(W.reg) + '" maxlength="8" placeholder="ABC 123" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-describedby="err-reg"></span>' + fieldErr('reg') + '</label>';
function stepWhat() {
  return '<span class="flab">Tjänst</span><div class="opts2" role="radiogroup" aria-label="Tjänst">' + E.SERVICES.map((s) => '<button class="opt" role="radio" aria-checked="' + (W.svc === s.id) + '" data-act="pick" data-v="' + s.id + '"><b>' + s.name + '</b><em>' + E.pTxt(s) + '</em><span>Cirka ' + s.mins + ' min' + (s.unit ? ', ' + s.unit : '') + '</span></button>').join('') + '</div>' +
    fieldErr('svc') + regField('Bilens regnummer');
}
function stepWhen() {
  const now = NOW(), mins = flowMins(), days = E.workdays(now.date, 10), except = W.kind === 'move' ? W.moveId : null;
  const freeOn = (d) => E.slots(S, d, mins, now, except).filter((x) => x.state === 'free');
  if (!W.date || !days.includes(W.date)) W.date = (days.find((d) => freeOn(d).length) || days[0]);
  const nf = E.nextFree(S, mins, now), list = E.slots(S, W.date, mins, now, except).filter((x) => x.state !== 'closed' && x.state !== 'past');
  if (W.time && !list.some((x) => x.t === W.time && x.state === 'free')) W.time = null;
  return (W.kind === 'move' ? '<p class="note" style="margin-bottom:12px">Du flyttar ' + esc(E.svc(E.byId(S, W.moveId).svc).name.toLowerCase()) + ' för ' + esc(E.byId(S, W.moveId).reg) + '.</p>' : '') +
    (nf ? '<div class="first"><span>Första lediga: <b>' + E.when(nf.date, nf.time, now) + '</b></span><button class="btn sm ink" data-act="first" data-date="' + nf.date + '" data-time="' + nf.time + '"><span>Välj</span></button></div>' : '') +
    '<div class="days" role="group" aria-label="Dag">' + days.map((d) => { const x = E.D(d), n = freeOn(d).length; return '<button class="day" data-act="day" data-v="' + d + '" aria-pressed="' + (W.date === d) + '" aria-label="' + E.nice(d) + ', ' + (n ? n + ' lediga tider' : 'fullbokat') + '"><span>' + (d === now.date ? 'idag' : E.WD[x.getDay()]) + '</span><b>' + x.getDate() + '</b><small class="' + (n ? '' : 'none') + '">' + (n ? n + ' lediga' : 'fullt') + '</small></button>'; }).join('') + '</div>' +
    fieldErr('time') +
    (list.length ? '<div class="slots" role="group" aria-label="Tid ' + E.nice(W.date) + '">' + list.map((x) => '<button class="slot" data-act="slot" data-v="' + x.t + '"' + (x.state === 'free' ? '' : ' disabled aria-label="' + x.t + ', upptagen"') + ' aria-pressed="' + (W.time === x.t) + '">' + x.t + '</button>').join('') + '</div>' +
      '<p class="legend">Överstrukna tider är upptagna. Jobbet tar cirka ' + mins + ' minuter.</p>'
      : '<p class="none-day">Inga lediga tider ' + (W.date === now.date ? 'idag' : 'den här dagen') + '. Välj en annan dag.</p>');
}
function summary() {
  const now = NOW(); let h = '<div class="sum">';
  if (W.kind === 'order') {
    h += '<div><span>' + E.cartCount(S) + ' däck' + (W.fit ? ' med montering' : '') + '</span><span>' + kr(E.cartTotal(S) + (W.fit ? E.FIT : 0)) + '</span></div>';
    if (W.fit && W.date) h += '<div><span>Montering</span><span>' + E.when(W.date, W.time, now) + '</span></div>';
    h += '<div><span>Betalning</span><span>' + E.payOf(W.pay).name + '</span></div>';
  } else {
    const s = E.svc(W.svc), tot = s.price ? s.price + W.extras.reduce((a, x) => a + x.p, 0) : null;
    h += '<div><span>' + s.name + '</span><span>' + E.pTxt(s) + '</span></div>' + W.extras.map((x) => '<div><span>' + esc(x.n) + '</span><span>+' + kr(x.p) + '</span></div>').join('');
    h += '<div><span>Bil</span><span>' + esc(E.normReg(W.reg).reg || W.reg) + '</span></div><div><span>Tid</span><span>' + E.when(W.date, W.time, now) + '</span></div>';
    if (W.extras.length && tot) h += '<div class="tot"><span>Summa, exempelpris</span><span>' + kr(tot) + '</span></div>';
  }
  return h + '<button class="linkb edit" data-act="goto" data-v="' + (W.kind === 'order' ? 'cart' : 'what') + '">Ändra</button></div>';
}
function stepWho() {
  return summary() +
    (W.kind === 'order' && W.fit ? regField('Regnummer på bilen som får däcken') : '') +
    '<label class="field' + bad('name') + '"><span>Namn</span><input id="fName" value="' + esc(W.name) + '" autocomplete="name" aria-describedby="err-name">' + fieldErr('name') + '</label>' +
    '<label class="field' + bad('phone') + '"><span>Mobilnummer <small>för sms om tiden</small></span><input id="fPhone" type="tel" value="' + esc(W.phone) + '" inputmode="tel" autocomplete="tel" placeholder="070-123 45 67" aria-describedby="err-phone">' + fieldErr('phone') + '</label>' +
    '<label class="field' + bad('email') + '"><span>Mejl <small>frivilligt, för bekräftelse</small></span><input id="fEmail" type="email" value="' + esc(W.email) + '" inputmode="email" autocomplete="email" aria-describedby="err-email">' + fieldErr('email') + '</label>' +
    '<label class="field"><span>Meddelande till verkstaden <small>frivilligt</small></span><textarea id="fNote" rows="2" maxlength="300">' + esc(W.note) + '</textarea></label>' +
    '<p class="note">' + payNote() + ' Vi använder uppgifterna bara för din ' + (W.kind === 'order' ? 'beställning' : 'bokning') + '.</p>';
}
const orderTotal = () => E.cartTotal(S) + (W.fit ? E.FIT : 0);
function payNote() {
  if (W.kind !== 'order' || W.pay === 'plats') return 'Du betalar på plats.';
  return W.pay === 'swish' ? 'När du trycker på Betala skickas en Swish-förfrågan till mobilnumret ovan.' : 'När du trycker på Betala öppnas kortbetalningen.';
}
function stepPay() {
  return '<span class="flab">Hur vill du betala?</span><div class="opts2 pays" role="radiogroup" aria-label="Betalning">' + E.PAY.map((p) => '<button class="opt" role="radio" aria-checked="' + (W.pay === p.id) + '" data-act="paypick" data-v="' + p.id + '"><b>' + p.name + '</b><em>' + kr(orderTotal()) + '</em><span>' + p.sub + '</span></button>').join('') + '</div>' +
    fieldErr('pay') +
    '<p class="note">Förhandsvisning: Swish och kort är exempel. Ingen betalning görs och inga kortuppgifter efterfrågas. I skarp drift visas köpvillkor och ångerrätt här.</p>';
}
function payPanel(o) {
  return '<div class="paybox" role="status"><b>' + (o.pay === 'swish' ? 'Öppna Swish och godkänn ' + kr(o.total) : 'Godkänn kortbetalningen på ' + kr(o.total)) + '</b>' +
    '<p>' + (o.pay === 'swish' ? 'Betalningen går till NK Bil &amp; Däck. Förfrågan gäller i några minuter.' : 'Här öppnas bankens ruta där du godkänner med BankID eller kod.') + '</p>' +
    '<p class="small">Förhandsvisning: ingen riktig ' + (o.pay === 'swish' ? 'Swish-betalning' : 'kortbetalning') + ' startas. Tryck på knappen för att se hur det blir.</p>' +
    '<button class="btn" data-act="paynow" data-id="' + o.id + '"><span>Godkänn betalningen, exempel</span></button></div>';
}
function stepCart() {
  if (!S.cart.length) return '<p class="empty">Varukorgen är tom. Ställ in din dimension under Köp däck och lägg till de däck du vill ha.</p>';
  return S.cart.map((it, k) => { const p = E.prod(it.pid); return '<div class="citem"><div><b>' + esc(p.brand + ' ' + p.model) + '</b><div class="small">' + it.dim + ', ' + E.typeName(p.type).toLowerCase() + ', ' + kr(E.price(p, it.dim)) + ' st</div></div><div style="text-align:right;font-weight:800">' + kr(E.price(p, it.dim) * it.qty) + '</div>' +
    '<div class="qty"><button data-act="qty" data-k="' + k + '" data-d="-1" aria-label="Ett däck färre">−</button><span aria-live="polite">' + it.qty + ' st</span><button data-act="qty" data-k="' + k + '" data-d="1" aria-label="Ett däck till"' + (it.qty >= E.MAXQ ? ' disabled' : '') + '>+</button></div><button class="linkb rm" data-act="rm" data-k="' + k + '">Ta bort</button></div>'; }).join('') +
    '<label class="check"><input type="checkbox" id="fFit"' + (W.fit ? ' checked' : '') + '><span><b>Montering och balansering, ' + kr(E.FIT) + '</b><br><span class="small">Du väljer tid i nästa steg. Utan montering hämtar du däcken hos oss.</span></span></label>' +
    '<div class="sum"><div class="tot"><span>Att betala</span><span>' + kr(E.cartTotal(S) + (W.fit ? E.FIT : 0)) + '</span></div></div>' +
    '<p class="note">Betala i verkstaden, eller direkt med Swish eller kort.</p>';
}
function stepMine() {
  let h = '<form id="mineForm" novalidate><label class="field' + bad('phone') + '"><span>Mobilnumret du bokade med</span><input id="fPhone" type="tel" value="' + esc(W.phone) + '" inputmode="tel" autocomplete="tel" placeholder="070-123 45 67">' + fieldErr('phone') + '</label><button class="btn ink" type="submit"><span>Visa mina bokningar</span></button></form>';
  if (W.list) {
    const now = NOW();
    h += W.list.length ? '<div class="mlist">' + W.list.map((b) => {
      const s = E.svc(b.svc), ask = W.ask === b.id;
      return '<div class="mcard"><b>' + s.name + ', ' + E.when(b.date, b.time, now) + '</b><div class="small">' + esc(b.reg) + ', bokning ' + b.id + ', ' + E.LABEL[b.status].toLowerCase() + '</div>' +
        (ask ? '<div class="confirm" role="alert"><span>Avboka ' + s.name.toLowerCase() + ' ' + E.when(b.date, b.time, now) + '?</span><div class="acts" style="margin:0;padding-left:5px;display:flex;gap:10px;flex-wrap:wrap"><button class="btn sm" data-act="docancel" data-id="' + b.id + '"><span>Ja, avboka</span></button><button class="btn sm line" data-act="keep"><span>Behåll</span></button></div></div>'
          : (b.status === 'Pågår' || b.status === 'Klar' ? '<p class="small" style="margin-top:8px">Bilen är redan hos oss. Ring 026-18 05 01 om något ändras.</p>' : '<div class="acts"><button class="btn sm ink" data-act="move" data-id="' + b.id + '"><span>Ändra tid</span></button><button class="btn sm line" data-act="askcancel" data-id="' + b.id + '"><span>Avboka</span></button></div>')) + '</div>';
    }).join('') + '</div>' : '<p class="empty" style="margin-top:16px">Inga kommande bokningar på det numret. Har du bokat på telefon? Ring 026-18 05 01.</p>';
  }
  return h;
}
function stepDone() {
  const r = W.result, now = NOW(), b = r.booking, first = (W.name || '').split(' ')[0];
  let h = '<div class="done"><div class="tick">' + ic('check') + '</div><h3 class="d">' + (W.kind === 'move' ? 'Tiden är flyttad' : 'Tack' + (first ? ' ' + esc(first) : '') + '!') + '</h3>';
  if (r.order && E.payOf(r.order.pay).online && !r.order.paid) return '<div class="done"><div class="ref d">' + r.order.id + '</div>' + payPanel(r.order) + '</div>';
  if (r.order) h += '<div class="ref d">' + r.order.id + '</div>' + (E.payOf(r.order.pay).online ? '<p class="paid">' + ic('check') + E.payText(r.order) + ', ' + kr(r.order.total) + ' (exempel)</p>' : '') + '<p>' + (b ? 'Vi monterar däcken <b>' + E.when(b.date, b.time, now) + '</b> på Brynäsgatan 67.' : 'Vi hör av oss när däcken är klara att hämta.') + (r.order.backorder ? ' Något av däcken beställs hem, det tar 2–3 dagar.' : '') + '</p>';
  else h += '<div class="ref d">' + b.id + '</div><p>Välkommen <b>' + E.when(b.date, b.time, now) + '</b> till Brynäsgatan 67.' + (b.status === 'Ny' ? ' Verkstaden bekräftar tiden med ett sms.' : ' Tiden är bekräftad.') + '</p>';
  h += '<div class="dacts">' + (b ? '<button class="btn" data-act="ics"><span>' + ic('cal') + 'Lägg i kalendern</span></button>' : '') +
    '<a class="btn line" href="https://www.google.com/maps/search/?api=1&amp;query=NK+Bil+%26+D%C3%A4ck+Bryn%C3%A4sgatan+67+G%C3%A4vle" target="_blank" rel="noopener"><span>' + ic('pin') + 'Visa vägen</span></a>' +
    (b ? '<button class="linkb" data-act="mine">Ändra eller avboka</button>' : '') + '</div>' +
    '<p class="note" style="margin-top:18px">Förhandsvisning: i skarp drift kommer ett sms nu och en påminnelse dagen innan. <button class="linkb" data-act="toadmin">Se hur bokningen landar i Verkstaden</button></p></div>';
  return h;
}
function renderSheet(keepScroll) {
  if (!W) return;
  const st = W.steps[W.i], sh = $('#sheet');
  const progSteps = W.steps.filter((x) => x !== 'done' && x !== 'mine'), pos = progSteps.indexOf(st);
  const sub = st === 'done' || st === 'mine' ? '' : 'Steg ' + (pos + 1) + ' av ' + progSteps.length;
  if (!sh.firstChild) sh.innerHTML = '<header class="shead">' + hubSvg() + '<div><h3 class="d" id="sheetTitle" tabindex="-1"></h3><p id="sheetSub"></p></div><button class="x" data-act="close" aria-label="Stäng">' + ic('x') + '</button></header><div class="sbody"></div><div class="sfoot"></div>';
  const body = $('.sbody', sh), same = W.shown === W.i, first = W.shown < 0, dl = $('.days', body), keep = same || keepScroll ? [body.scrollTop, dl ? dl.scrollLeft : 0] : null;
  $('#sheetTitle').textContent = st === 'done' && W.kind === 'order' ? (W.result && E.payOf(W.result.order.pay).online && !W.result.order.paid ? 'Betala' : 'Beställt') : st === 'done' ? (W.kind === 'move' ? 'Flyttad' : 'Bokat') : TITLES[st];
  $('#sheetSub').textContent = sub;
  body.className = 'sbody' + (same || first ? '' : W.i >= W.shown ? ' fwd' : ' back');
  body.innerHTML = { what: stepWhat, when: stepWhen, pay: stepPay, who: stepWho, cart: stepCart, mine: stepMine, done: stepDone }[st]();
  if (keep) { body.scrollTop = keep[0]; const d2 = $('.days', body); if (d2) d2.scrollLeft = keep[1]; }
  else { body.scrollTop = 0; const sel = $('.day[aria-pressed=true]', body); if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest', inline: 'center' }); }
  const canBack = W.i > 0 && st !== 'done';
  let next = st === 'who' ? (W.kind === 'order' ? (W.pay === 'plats' ? 'Lägg beställningen' : 'Betala ' + kr(orderTotal())) : 'Boka ' + E.svc(W.svc).name.toLowerCase()) : st === 'when' && W.kind === 'move' ? 'Flytta hit' : 'Fortsätt';
  if (st === 'cart' && !S.cart.length) next = null;
  $('.sfoot', sh).innerHTML = (canBack ? '<button class="btn line" data-act="back"><span>Tillbaka</span></button>' : '') +
    (st === 'done' ? '<button class="btn ink" data-act="close"><span>Stäng</span></button>' : st === 'mine' ? '<button class="btn line" data-act="close"><span>Stäng</span></button>' :
      next ? '<button class="btn" data-act="next"' + (W.busy ? ' disabled' : '') + '><span>' + next + '</span></button>' : '<button class="btn ink" data-act="toshop"><span>Till däcken</span></button>');
  const nuts = st === 'done' ? 5 : Math.round(Math.max(0, pos) / Math.max(1, progSteps.length) * 5);
  requestAnimationFrame(() => { if (!sh.firstChild) return; $$('.nut', sh).forEach((n, k) => { n.style.transitionDelay = (k * 70) + 'ms'; n.classList.toggle('on', k < nuts); }); const hb = $('.hub', sh); if (hb) hb.classList.toggle('done', st === 'done'); });
  const wasShown = same; W.shown = W.i;
  if (W.err && W.err.field) { const f = { reg: '#fReg', name: '#fName', phone: '#fPhone', email: '#fEmail' }[W.err.field], el = f && $(f, body); if (el) { el.focus(); return; } const er = $('.ferr', body); if (er && er.scrollIntoView) er.scrollIntoView({ block: 'nearest' }); return; }
  if (!wasShown) { try { $('#sheetTitle').focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
}
function grab() {
  if (!W) return;
  [['Reg', 'reg'], ['Name', 'name'], ['Phone', 'phone'], ['Email', 'email'], ['Note', 'note']].forEach(([k, f]) => { const e = $('#f' + k); if (e) W[f] = e.value.trim(); });
  const fit = $('#fFit'); if (fit) W.fit = fit.checked;
}
function go(stepName) { const k = W.steps.indexOf(stepName); if (k >= 0) { W.i = k; W.err = null; renderSheet(); } }
function nextStep() {
  if (!W || W.busy) return;
  grab(); W.err = null; const st = W.steps[W.i], now = NOW();
  if (st === 'what') {
    if (!W.svc) W.err = { field: 'svc', err: E.MSG.svc };
    else if (!E.normReg(W.reg).ok) W.err = { field: 'reg', err: E.MSG.reg };
    else W.reg = E.normReg(W.reg).reg;
  }
  if (st === 'cart') { if (!S.cart.length) return; if (!W.fit) { go('pay'); return; } }
  if (st === 'pay' && !E.payOf(W.pay)) W.err = { field: 'pay', err: E.MSG.pay };
  if (st === 'when') {
    if (!W.time) W.err = { field: 'time', err: E.MSG.time };
    else if (W.kind === 'move') { commitMove(); return; }
  }
  if (st === 'who') { commit(); return; }
  if (W.err) { renderSheet(true); return; }
  W.i++; renderSheet();
}
function lock(on) { W.busy = on; const b = $('.sfoot [data-act=next]'); if (b) { b.disabled = on; b.classList.toggle('busy', on); } }
function commit() {
  lock(true);
  store.fresh();  // another tab may have taken the slot since this one was drawn
  const now = NOW(), q = { svc: W.svc, reg: W.reg, model: W.model, date: W.date, time: W.time, name: W.name, phone: W.phone, email: W.email, note: W.note, extras: W.extras };
  const r = W.kind === 'order' ? E.order(S, Object.assign({}, q, { fit: W.fit, pay: W.pay }), now) : E.book(S, q, now);
  W.busy = false;
  if (!r.ok) {
    W.err = { field: r.field, err: r.err };
    if (r.field === 'time') { W.time = null; go('when'); W.err = { field: 'time', err: r.err }; renderSheet(true); }
    else if (r.field === 'cart') go('cart');
    else renderSheet(true);
    renderSite(); return;
  }
  store.save();
  me.set({ name: r.customer.name, phone: r.customer.phone, email: r.customer.email || '', reg: r.booking ? r.booking.reg : W.reg });
  W.name = r.customer.name; W.phone = r.customer.phone;
  W.result = r; W.i = W.steps.length - 1; renderSheet(); renderSite();
  if (wheel) wheel.kick(10);
  if (window.NKAdmin && !$('#admin').hidden) window.NKAdmin.render();
}
function commitMove() {
  lock(true); store.fresh();
  const r = E.move(S, W.moveId, W.date, W.time, NOW()); W.busy = false;
  if (!r.ok) { W.time = null; W.err = { field: 'time', err: r.err }; renderSheet(true); return; }
  store.save(); W.result = { booking: r.booking }; W.i = W.steps.length - 1; renderSheet(); renderSite(); toast('Tiden är flyttad till ' + E.when(r.booking.date, r.booking.time, NOW()));
}
function downloadIcs(b) {
  const blob = new Blob([E.ics(b)], { type: 'text/calendar;charset=utf-8' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'NK-bokning-' + b.id + '.ics'; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* ---------- views: customer site and Verkstaden ---------- */
function setView(v) { vt(() => setViewNow(v)); }
function setViewNow(v) {
  if (W) closeFlow();
  $('#site').hidden = v !== 'site'; $('#admin').hidden = v !== 'admin';
  document.body.classList.toggle('adm', v === 'admin');
  $$('[data-view]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.view === v));
  if (wheel && wheel.setVisible) wheel.setVisible(v === 'site');
  if (v === 'admin' && window.NKAdmin) window.NKAdmin.render();
  window.scrollTo(0, 0);
  if (v === 'site') { renderSite(); if (wheel) { measure(); storyUI(); } }
}

/* ---------- one click handler for the whole page ---------- */
const cyc = (arr, v, d) => { const i = arr.indexOf(v) + d; return arr[(i + arr.length) % arr.length]; };
document.addEventListener('click', (e) => {
  const v = e.target.closest('[data-view]'); if (v) { setView(v.dataset.view); return; }
  if (e.target.id === 'scrim') { closeFlow(); return; }
  const el = e.target.closest('[data-act]'); if (!el || el.closest('#admin')) return;
  const a = el.dataset.act, d = el.dataset;
  switch (a) {
    case 'demox': document.documentElement.classList.add('nodemo'); try { sessionStorage.setItem('nk-demox', '1'); } catch (x) { /* ignore */ } measure(); storyUI(); toast('Dold. Verkstaden når du med Shift+V eller loggan längst ner.'); break;
    case 'book': closeCard(); openFlow('book', { svc: d.svc || null, date: d.date, time: d.time }); break;
    case 'season': setSeason(d.v); break;
    case 'hot': openHot(d.v); break;
    case 'cardx': closeCard(); break;
    case 'cart': openFlow('order'); break;
    case 'mine': closeCard(); if (W) { if (W.kind !== 'mine') { Object.assign(W, { kind: 'mine', steps: STEPS.mine.slice(), i: 0, shown: -1, err: null, ask: null, list: W.phone ? E.mine(S, W.phone, NOW()) : null }); renderSheet(); } } else openFlow('mine'); break;
    case 'finish': $$('.sw').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === d.v)); burst(); if (wheel) wheel.setFinish(d.v); break;
    case 'step': { const arr = { w: E.WS, p: E.PS, r: E.RS }[d.k]; F[d.k] = cyc(arr, F[d.k], +d.d); $('#sizeNote').hidden = true; renderSize(+d.d, d.k); renderTyres(); const nb = $('[data-act=step][data-k=' + d.k + '][data-d="' + d.d + '"]'); if (nb) nb.focus({ preventScroll: true }); break; }
    case 'add': {
      store.fresh(); const r = E.cartAdd(S, d.pid, dimStr(), 4); store.save(); renderTyres();
      const cb = $('#cartn'); cb.classList.remove('pop'); void cb.offsetWidth; cb.classList.add('pop');
      toast(r.capped ? 'Max ' + E.MAXQ + ' däck av samma modell. Ring oss för fler.' : '4 däck i varukorgen');
      const btn = $('[data-act=add][data-pid=' + d.pid + ']'); if (btn) btn.classList.add('added');
      break;
    }
    case 'bookhotel': openFlow('book', { svc: 'hotell', extras: hotelExtras() }); break;
    case 'snd': SND.on = !SND.on; el.setAttribute('aria-pressed', SND.on); el.setAttribute('aria-label', SND.on ? 'Ljud av' : 'Ljud på'); if (SND.on) audio(); else humStop(); toast(SND.on ? 'Ljud på. Håll inne på hjulet.' : 'Ljud av'); break;
    case 'vadm': setView($('#site').hidden ? 'site' : 'admin'); break;
    // sheet
    case 'close': closeFlow(); break;
    case 'next': nextStep(); break;
    case 'back': grab(); W.err = null; W.i = W.steps[W.i] === 'pay' && W.kind === 'order' && !W.fit ? 0 : W.i - 1; renderSheet(); break;
    case 'goto': grab(); go(d.v); break;
    case 'pick': grab(); W.svc = d.v; W.time = null; W.err = null; renderSheet(true); break;
    case 'day': W.date = d.v; W.time = null; W.err = null; renderSheet(true); break;
    case 'paypick': grab(); W.pay = d.v; W.err = null; renderSheet(true); break;
    case 'paynow': { store.fresh(); const r = E.payOrder(S, d.id, NOW()); if (r.ok) { store.save(); W.result.order = r.order; W.shown = -1; renderSheet(); toast(E.payText(r.order) + ' (exempel)'); if (window.NKAdmin && !$('#admin').hidden) window.NKAdmin.render(); } break; }
    case 'slot': W.time = d.v; W.err = null; renderSheet(true); break;
    case 'first': W.date = d.date; W.time = d.time; W.err = null; renderSheet(true); break;
    case 'qty': grab(); store.fresh(); E.cartSet(S, +d.k, (S.cart[+d.k] || { qty: 0 }).qty + +d.d); store.save(); renderTyres(); renderSheet(true); break;
    case 'rm': grab(); store.fresh(); E.cartSet(S, +d.k, 0); store.save(); renderTyres(); renderSheet(true); toast('Borttaget ur varukorgen'); break;
    case 'toshop': closeFlow(); setTimeout(() => { const s = $('#dack'); if (s) s.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }); }, 220); break;
    case 'ics': if (W && W.result && W.result.booking) { downloadIcs(W.result.booking); toast('Kalenderfilen är nedladdad'); } break;
    case 'toadmin': closeFlow(); setView('admin'); break;
    case 'askcancel': W.ask = d.id; renderSheet(true); break;
    case 'keep': W.ask = null; renderSheet(true); break;
    case 'docancel': { store.fresh(); const r = E.cancel(S, d.id); store.save(); W.ask = null; W.list = E.mine(S, W.phone, NOW()); renderSheet(true); renderSite(); toast(r.ok ? 'Bokningen är avbokad' : 'Bokningen var redan avbokad'); break; }
    case 'move': { const ph = W.phone; W = Object.assign(W, { kind: 'move', steps: STEPS.move.slice(), i: 0, shown: -1, moveId: d.id, date: E.byId(S, d.id).date, time: null, err: null, result: null, phone: ph }); renderSheet(); break; }
    default: break;
  }
});
document.addEventListener('submit', (e) => {
  if (e.target.id !== 'mineForm') return; e.preventDefault(); grab();
  const ph = E.normPhone(W.phone); W.err = ph.ok ? null : { field: 'phone', err: E.MSG.phone };
  if (ph.ok) { store.fresh(); W.phone = ph.phone; W.list = E.mine(S, ph.phone, NOW()); }
  renderSheet(true);
});
document.addEventListener('change', (e) => {
  if (e.target.matches('#hotelOpts input')) tweenHotel();
  if (e.target.id === 'fFit' && W) { W.fit = e.target.checked; renderSheet(true); }
});
let txT = 0;
document.addEventListener('input', (e) => {
  if (e.target.id === 'tyreText') { clearTimeout(txT); const val = e.target.value.trim().toUpperCase(); txT = setTimeout(() => { if (wheel) { wheel.setText(val || 'NK BIL & DÄCK'); wheel.kick(3); } }, 140); }
  if (e.target.id === 'fReg' && W && W.err && W.err.field === 'reg') { W.err = null; const f = e.target.closest('.field'); f.classList.remove('bad'); const er = $('.ferr', f); if (er) er.remove(); }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (W) closeFlow(); else if (FOCUS || SCAN) closeCard(); }
  if (e.key === 'Enter' && W && e.target.matches && e.target.matches('.sbody input') && !e.target.closest('form')) { e.preventDefault(); nextStep(); }
  if (e.key && e.key.toLowerCase() === 'v' && e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
    const t = e.target; if (W || (t && t.closest && t.closest('input,textarea,select,[contenteditable]'))) return;
    e.preventDefault(); setView($('#site').hidden ? 'site' : 'admin');
  }
});

/* ---------- live updates: other tabs, the clock, the scroll bus ---------- */
window.addEventListener('storage', (e) => {
  if (e.key !== E.KEY || !e.newValue) return;
  S = E.restore(e.newValue, NOW());
  if (!$('#site').hidden) renderSite();
  // redraw only steps that show live data, and keep what the visitor has typed (L-016)
  if (W && !W.busy && ['when', 'cart', 'mine'].includes(W.steps[W.i])) { grab(); renderSheet(true); }
  if (window.NKAdmin && !$('#admin').hidden) window.NKAdmin.render(true);
});
let lastDay = NOW().date;
function tick() {
  const now = NOW();
  if (now.date !== lastDay) { lastDay = now.date; store.load(); }
  if (!$('#site').hidden) { renderVisit(); renderBoard(); }
  if (W && W.steps[W.i] === 'when' && !W.busy) { grab(); renderSheet(true); }
}
setInterval(tick, 60e3);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
let stick = false;
window.addEventListener('scroll', () => { if (stick) return; stick = true; requestAnimationFrame(() => { stick = false; onScroll.forEach((f) => f()); }); }, { passive: true });

renderSize(); renderSeason(); renderHotel(); renderSite();
setTimeout(() => document.documentElement.classList.add('ready'), 2200);

window.NK = { E, get S() { return S; }, set S(v) { S = v; }, store, toast, vt, setView, openFlow, renderSite, now: NOW, esc, kr, ic, $, $$ };
})();
