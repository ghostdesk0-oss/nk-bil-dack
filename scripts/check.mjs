// Project rules as code. Every rule comes from a lesson in docs/LESSONS.md.
// When a lesson repeats, it gets a rule here so no agent can repeat it again.
//   node scripts/check.mjs          all rules
//   node scripts/check.mjs --quick  skip rules that need dist/ (used by the edit hook)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const quick = process.argv.includes('--quick');
const fails = [];
const fail = (lesson, msg) => fails.push(`[${lesson}] ${msg}`);

const css = read('src/styles.css'), html = read('src/index.html'), app = read('src/app.js');
const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;

// L-001 Brand colours live in :root. Raw hex anywhere else drifts from the brand.
{
  const rootLine = lineOf(css, css.indexOf('}', css.indexOf(':root{')));
  css.split('\n').forEach((l, i) => {
    if (i + 1 <= rootLine) return;
    for (const m of l.replace(/url\([^)]*\)/g, '').matchAll(/#[0-9a-fA-F]{3,8}\b/g)) fail('L-001', `raw colour ${m[0]} on styles.css line ${i + 1}; add a variable in :root`);
  });
}
// L-002 Hover styles only inside @media(hover:hover), or they stick after a tap on phones.
css.split('\n').forEach((l, i) => { if (/:hover\b/.test(l) && !/@media\s*\(hover:\s*hover\)/.test(l)) fail('L-002', `:hover outside @media(hover:hover) on styles.css line ${i + 1}`); });
// L-003 View transitions go through vt(), which swallows the "skipped" rejection.
{
  const n = (app.match(/startViewTransition\(/g) || []).length;
  if (n !== 1 || !/function vt\(fn\)\s*\{[^\n]*\.finished\.catch/.test(app)) fail('L-003', 'call document.startViewTransition only inside vt(), and keep its .catch handlers');
}
// L-004 The demo must say it is a demo until the backend and consent exist.
if (!/name="robots" content="noindex/.test(html)) fail('L-004', 'noindex meta is missing from src/index.html');
if (!/class="demo"/.test(html)) fail('L-004', 'the demo strip is missing from src/index.html');
// L-005 No invented tyre-label or vehicle data on the site.
for (const [f, t] of [['src/index.html', html], ['src/app.js', app]]) {
  const m = t.match(/våtgrepp|ljudnivå|rullmotstånd|dB\b/i);
  if (m) fail('L-005', `"${m[0]}" in ${f}: EU tyre-label values need a real source before they go on the site`);
}
// L-006 Respect reduced motion.
if (!/prefers-reduced-motion/.test(css)) fail('L-006', 'styles.css lost its prefers-reduced-motion block');
// L-007 UI animations that must finish use wall-clock time, not the clamped frame clock.
{
  const wheel = read('src/wheel/wheel.js');
  if (!/S\.scan\s*=\s*\{\s*t:\s*performance\.now\(\)/.test(wheel)) fail('L-007', 'the plate scan must be timed on performance.now(), not the frame clock');
}
// L-013 Bookings, carts and orders change only through the engine, which checks capacity and re-reads storage.
for (const f of ['src/app.js', 'src/admin.js']) {
  const t = read(f), m = t.match(/\b(?:S|s|S\(\))\.(?:bookings|orders|cart)\.(?:push|unshift|splice)\(/);
  if (m) fail('L-013', `${f} changes ${m[0]} directly; go through NKEngine (book, cancel, move, cartAdd, cartSet, order)`);
}
// L-014 Internal links (repository, roadmap) never appear on the customer side.
for (const [f, t] of [['src/index.html', html], ['src/app.js', app]]) {
  const m = t.match(/github\.com|roadmap\.html/i);
  if (m) fail('L-014', `"${m[0]}" in ${f}: internal links belong in Verkstaden only`);
}
// L-015 Root state classes (.js, .ready, .nogl, .nodemo, .inspect, .adm, .tw) are only prefixes. A component
// class with the same name styles <html> or <body> too: '.js{display:flex}' once made the whole page a flex row.
css.split('\n').forEach((l, i) => { const m = l.match(/(?:^|[},]\s*)\.(js|ready|nogl|nodemo|inspect|adm|tw)\s*[{,:]/); if (m) fail('L-015', `styles.css line ${i + 1} styles .${m[1]} on its own; it is a state class on <html>/<body>, pick another name`); });
// Syntax of every source file.
for (const f of ['src/engine.js', 'src/app.js', 'src/admin.js', 'src/wheel/wheel.js', 'scripts/build.mjs']) {
  try { execFileSync(process.execPath, ['--check', path.join(root, f)], { stdio: 'pipe' }); }
  catch (e) { fail('syntax', `${f}: ${String(e.stderr).split('\n').slice(0, 4).join(' ')}`); }
}
// L-009 Browser tests wait for state, not for time, before asserting.
{
  const lines = read('tests/smoke.py').split('\n');
  lines.forEach((l, i) => {
    if (!/wait_for_timeout/.test(l)) return;
    const next = lines.slice(i + 1).find((x) => x.trim());
    if (next && /^\s*assert\b/.test(next)) fail('L-009', `smoke.py line ${i + 1}: fixed wait before an assert; use wait_for_selector/wait_for_function`);
  });
}
// L-018 <option> elements are never "visible": wait for them as attached.
read('tests/smoke.py').split('\n').forEach((l, i) => { if (/wait_for_selector\([^)]*option[^)]*\)/.test(l) && !/state="attached"/.test(l)) fail('L-018', `smoke.py line ${i + 1}: wait for <option> with state="attached"`); });
// L-019 type="number" refuses a decimal comma; use type="text" inputmode="decimal".
for (const f of ['src/index.html', 'src/app.js', 'src/admin.js']) if (/type=\\?["']?number/.test(read(f))) fail('L-019', `${f} has type="number"; use type="text" inputmode="decimal"`);
// L-020 Brand names in Swedish copy keep their capitals: Swish, BankID, Klarna. Ids like 'swish' are fine.
for (const f of ['src/index.html', 'src/app.js', 'src/admin.js', 'src/engine.js']) {
  read(f).split('\n').forEach((l, i) => { for (const m of l.matchAll(/[a-zåäö] (swish|bankid|klarna)\b|\b(swish|bankid|klarna)[- ][a-zåäö]/gi)) if (/[a-z]/.test(m[0].match(/swish|bankid|klarna/i)[0][0]) && !/BankID/.test(m[0])) fail('L-020', `lower-case brand "${m[0].trim()}" on ${f} line ${i + 1}`); });
}
// L-008 Size budget: the whole site ships as one file and must stay quick on 4G.
if (!quick && fs.existsSync(path.join(root, 'dist/index.html'))) {
  const kb = fs.statSync(path.join(root, 'dist/index.html')).size / 1024;
  if (kb > 1300) fail('L-008', `dist/index.html is ${kb.toFixed(0)} KB, budget is 1300 KB`);
}

if (fails.length) { console.error(fails.join('\n')); console.error(`\n${fails.length} rule(s) failed. See docs/LESSONS.md for why each rule exists.`); process.exit(1); }
console.log('check passed');
