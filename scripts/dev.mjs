// Local preview: rebuilds on every change in src/ and serves dist/ on http://localhost:5173
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSite } from './build.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT) || 5173;

let timer;
const rebuild = async () => {
  try { const b = await buildSite(); console.log(`built ${(b / 1024).toFixed(0)} KB  ${new Date().toLocaleTimeString()}`); }
  catch (e) { console.error('build failed:', e.message); }
};
await rebuild();
fs.watch(path.join(root, 'src'), { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(rebuild, 120); });

http.createServer((req, res) => {
  fs.readFile(path.join(root, 'dist/index.html'), (err, data) => {
    if (err) { res.writeHead(500); res.end('Build first'); return; }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(data);
  });
}).listen(port, () => console.log(`http://localhost:${port}`));
