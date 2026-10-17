// Frame-by-frame renderer: node tools/render.mjs --fmt 16x9 [--from 0 --to 1200 | --frames 0,60,120] [--workers 4] [--out out/frames_16x9]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const fmt = args.fmt || '16x9';
const [W, H] = fmt === '9x16' ? [1080, 1920] : [1920, 1080];
const timing = JSON.parse(fs.readFileSync(path.join(ROOT, 'timing.json'), 'utf8'));
const out = path.resolve(ROOT, args.out || `out/frames_${fmt}`);
fs.mkdirSync(out, { recursive: true });

// shared data for the page: timing + themify icon paths (pinned local files)
const SVG = path.resolve(ROOT, '../assets/font/themify-icons-font/themify-icons/SVG');
const icons = {};
for (const n of ['wallet', 'cloud-up', 'cloud', 'tag']) icons[n] = [...fs.readFileSync(path.join(SVG, n + '.svg'), 'utf8').matchAll(/ d="([^"]+)"/g)].map(m => m[1]).join(' ');
fs.writeFileSync(path.join(ROOT, 'src/timing.js'), `window.TIMING=${JSON.stringify(timing)};\nwindow.ICONS=${JSON.stringify(icons)};\n`);

let frames;
if (args.frames) frames = args.frames.split(',').map(Number);
else { const a = Number(args.from ?? 0), b = Number(args.to ?? timing.frames); frames = Array.from({ length: b - a }, (_, i) => a + i); }
const workers = Number(args.workers || 4);

const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--force-color-profile=srgb', '--font-render-hinting=none'] });
const t0 = Date.now();
const chunks = Array.from({ length: workers }, (_, w) => frames.filter((_, i) => i % workers === w));
await Promise.all(chunks.map(async list => {
  if (!list.length) return;
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('pageerror', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('console', m.text()); });
  await page.goto(`file://${ROOT}/src/film.html?fmt=${fmt}`);
  await page.evaluate(() => window.renderReady);
  for (const f of list) {
    await page.evaluate(f => window.renderFrame(f), f);
    await page.screenshot({ path: path.join(out, `${String(f).padStart(5, '0')}.png`), clip: { x: 0, y: 0, width: W, height: H } });
  }
  await page.close();
}));
await browser.close();
console.log(`rendered ${frames.length} frames (${fmt}) in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${out}`);
