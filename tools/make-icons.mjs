// Renders the extension's static PNG icons from the same pixel-art code the game uses.
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
  const face = { stage: 'baby', o: { mood: 'happy' } };
  for (const s of [16, 32]) out[s] = iconCanvas(face.stage, face.o, s).toDataURL('image/png');
  // 48 and 128: the whole Bulb on a soft mint disc
  for (const [s, scale] of [[48, 1], [128, 2]]) {
    const c = document.createElement('canvas'); c.width = c.height = s;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.fillStyle = '#bfe6db'; x.strokeStyle = '#5e978c'; x.lineWidth = s / 32;
    x.beginPath(); x.arc(s / 2, s / 2, s / 2 - x.lineWidth, 0, Math.PI * 2); x.fill(); x.stroke();
    const spr = petSprite('baby', { mood: 'happy' }), w = 48 * scale;
    x.drawImage(spr, (s - w) / 2, (s - w) / 2 - scale * 2, w, w);
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
