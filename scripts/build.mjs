// Builds dist/index.html: one self-contained file (fonts, styles, 3D bundle and app script inlined).
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = (...p) => path.join(root, ...p);
const b64 = (p) => fs.readFileSync(r(p)).toString('base64');

export async function buildSite() {
  const archivo = 'node_modules/@fontsource-variable/archivo/files/';
  const face = (family, style, weight, stretch, file) =>
    `@font-face{font-family:${family};font-style:${style};font-weight:${weight};${stretch ? `font-stretch:${stretch};` : ''}font-display:swap;src:url(data:font/woff2;base64,${b64(file)}) format('woff2')}`;
  const fonts =
    face('Archivo', 'normal', '100 900', '62% 125%', archivo + 'archivo-latin-standard-normal.woff2') +
    face('Archivo', 'italic', '100 900', '62% 125%', archivo + 'archivo-latin-standard-italic.woff2') +
    face('Yellowtail', 'normal', '400', '', 'node_modules/@fontsource/yellowtail/files/yellowtail-latin-400-normal.woff2');

  const wheel = (await build({
    entryPoints: [r('src/wheel/entry.js')], bundle: true, minify: true, format: 'iife', write: false, logLevel: 'warning',
  })).outputFiles[0].text;

  const inline = (code) => code.replace(/<\/script/g, '<\\/script');
  const version = JSON.parse(fs.readFileSync(r('package.json'), 'utf8')).version;
  const html = fs.readFileSync(r('src/index.html'), 'utf8')
    .replace(/__VERSION__/g, version)
    .replace('/*FONTS*/', () => fonts)
    .replace('/*STYLES*/', () => fs.readFileSync(r('src/styles.css'), 'utf8'))
    .replace('/*WHEEL*/', () => inline(wheel))
    .replace('/*APP*/', () => inline(fs.readFileSync(r('src/app.js'), 'utf8')));

  fs.mkdirSync(r('dist'), { recursive: true });
  fs.writeFileSync(r('dist/index.html'), html);
  return html.length;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const bytes = await buildSite();
  console.log(`dist/index.html  ${(bytes / 1024).toFixed(0)} KB`);
}
