// Renders the extension's static PNG icons (the egg, no background) from the same pixel-art code the game uses.
// Usage: node tools/make-icons.mjs   (needs Playwright with Chromium)
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'extension');
const types = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png' };

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('http://bubby.local/**', async route => {
  const path = new URL(route.request().url()).pathname;
  if (path === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><body></body>' });
  try { route.fulfill({ contentType: types[extname(path)] || 'application/octet-stream', body: await readFile(join(root, path)) }); }
  catch { route.fulfill({ status: 404, body: '' }); }
});
await page.goto('http://bubby.local/');
const pngs = await page.evaluate(async () => {
  const { petSprite } = await import('/art/sprites.js');
  const { iconCanvas } = await import('/art/icon.js');
  const out = {};
  // The logo is the egg (the seed), with no background: the same picture the toolbar shows while Bubby is a seed.
  for (const s of [16, 32]) out[s] = iconCanvas('seed', {}, s).toDataURL('image/png');
  // 48 and 128: the whole egg, centred, at the largest whole-pixel scale that fits (keeps the pixel art crisp)
  const spr = petSprite('seed', {});
  const d = spr.getContext('2d').getImageData(0, 0, 48, 48).data;
  let x0 = 48, y0 = 48, x1 = -1, y1 = -1;
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (d[(y * 48 + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  for (const s of [48, 128]) {
    const scale = Math.max(1, Math.floor((s - Math.round(s / 16) * 2) / Math.max(bw, bh)));
    const c = document.createElement('canvas'); c.width = c.height = s;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.drawImage(spr, x0, y0, bw, bh, Math.round((s - bw * scale) / 2), Math.round((s - bh * scale) / 2), bw * scale, bh * scale);
    out[s] = c.toDataURL('image/png');
  }
  return out;
});
await mkdir(join(root, 'icons'), { recursive: true });
for (const [s, url] of Object.entries(pngs)) {
  await writeFile(join(root, 'icons', `icon-${s}.png`), Buffer.from(url.split(',')[1], 'base64'));
  console.log(`icons/icon-${s}.png`);
}
await browser.close();
