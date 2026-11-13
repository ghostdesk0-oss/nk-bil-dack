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
  if (n !== 1 || !/function vt\(fn\)\{[^\n]*\.finished\.catch/.test(app)) fail('L-003', 'call document.startViewTransition only inside vt(), and keep its .catch handlers');
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
  const car = read('src/car/car.js');
  if (/S\.swap\s*=\s*\{\s*t:\s*clock/.test(car)) fail('L-007', 'rim swap timed on the frame clock; use performance.now()');
}
// Syntax of every source file.
for (const f of ['src/app.js', 'src/car/car.js', 'src/wheel/wheel.js', 'scripts/build.mjs']) {
  try { execFileSync(process.execPath, ['--check', path.join(root, f)], { stdio: 'pipe' }); }
  catch (e) { fail('syntax', `${f}: ${String(e.stderr).split('\n').slice(0, 4).join(' ')}`); }
}
// L-008 Size budget: the whole site ships as one file and must stay quick on 4G.
if (!quick && fs.existsSync(path.join(root, 'dist/index.html'))) {
  const kb = fs.statSync(path.join(root, 'dist/index.html')).size / 1024;
  if (kb > 1300) fail('L-008', `dist/index.html is ${kb.toFixed(0)} KB, budget is 1300 KB`);
}

if (fails.length) { console.error(fails.join('\n')); console.error(`\n${fails.length} rule(s) failed. See docs/LESSONS.md for why each rule exists.`); process.exit(1); }
console.log('check passed');
