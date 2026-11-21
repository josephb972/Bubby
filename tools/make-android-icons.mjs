// Renders the Android app's launcher icons and splash screens from Bubby's pixel art (the egg logo, like the
// extension icons). Usage: node tools/make-android-icons.mjs   (needs Playwright with Chromium; run after `npx cap add android`)
import { createRequire } from 'node:module';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const ext = join(repo, 'extension');
const res = join(repo, 'mobile', 'android', 'app', 'src', 'main', 'res');
const DENSITY = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const MINT = '#bfe6db', LINE = '#5e978c', SKY = '#85c3d0';

const pngSize = buf => [buf.readUInt32BE(16), buf.readUInt32BE(20)];
const splashes = [];
for (const d of await readdir(res)) {
  if (!d.startsWith('drawable')) continue;
  try { const f = join(res, d, 'splash.png'); splashes.push([f, pngSize(await readFile(f))]); } catch {}
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('http://bubby.local/**', async route => {
  const path = new URL(route.request().url()).pathname;
  if (path === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><body></body>' });
  try { await route.fulfill({ contentType: extname(path) === '.js' ? 'text/javascript' : 'application/octet-stream', body: await readFile(join(ext, path)) }); }
  catch { await route.fulfill({ status: 404, body: '' }); }
});
await page.goto('http://bubby.local/');
const out = await page.evaluate(async ({ DENSITY, splashes, MINT, LINE, SKY }) => {
  const { petSprite } = await import('/art/sprites.js');
  // The logo is the egg (Bubby as a seed), like the extension's icons. Cropped to its pixels, drawn at the largest
  // whole-pixel scale that fits, so the pixel art stays crisp.
  const spr = petSprite('seed', {});
  const d = spr.getContext('2d').getImageData(0, 0, 48, 48).data;
  let x0 = 48, y0 = 48, x1 = -1, y1 = -1;
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (d[(y * 48 + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };
  const pet = (x, cx, cy, size) => {
    const k = Math.max(1, Math.floor(size / Math.max(bw, bh)));
    x.drawImage(spr, x0, y0, bw, bh, Math.round(cx - bw * k / 2), Math.round(cy - bh * k / 2), bw * k, bh * k);
  };
  const files = {};
  for (const [name, k] of Object.entries(DENSITY)) {
    // Legacy icons (48dp): Bubby on a mint disc, like the extension's 128px icon.
    for (const round of [false, true]) {
      const s = Math.round(48 * k); const [c, x] = canvas(s, s);
      x.fillStyle = MINT; x.strokeStyle = LINE; x.lineWidth = s / 32;
      x.beginPath();
      if (round) x.arc(s / 2, s / 2, s / 2 - x.lineWidth, 0, Math.PI * 2);
      else x.roundRect(x.lineWidth, x.lineWidth, s - 2 * x.lineWidth, s - 2 * x.lineWidth, s * 0.22);
      x.fill(); x.stroke();
      pet(x, s / 2, s / 2, s * 0.62);
      files[`mipmap-${name}/ic_launcher${round ? '_round' : ''}.png`] = c.toDataURL('image/png');
    }
    // Adaptive icon foreground (108dp, the middle 66dp is always visible); the background colour is mint.
    const s = Math.round(108 * k); const [c, x] = canvas(s, s);
    pet(x, s / 2, s / 2, s * 0.44);
    files[`mipmap-${name}/ic_launcher_foreground.png`] = c.toDataURL('image/png');
  }
  for (const [file, [w, h]] of splashes) {
    const [c, x] = canvas(w, h);
    x.fillStyle = SKY; x.fillRect(0, 0, w, h);
    const m = Math.min(w, h);
    x.fillStyle = MINT; x.strokeStyle = LINE; x.lineWidth = m / 90;
    x.beginPath(); x.arc(w / 2, h / 2, m * 0.2, 0, Math.PI * 2); x.fill(); x.stroke();
    pet(x, w / 2, h / 2, m * 0.26);
    files[file] = c.toDataURL('image/png');
  }
  return files;
}, { DENSITY, splashes: splashes.map(([f, s]) => [f.slice(res.length + 1), s]), MINT, LINE, SKY });
await browser.close();

for (const [file, url] of Object.entries(out)) await writeFile(join(res, file), Buffer.from(url.split(',')[1], 'base64'));
await writeFile(join(res, 'values', 'ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${MINT.toUpperCase()}</color>\n</resources>\n`);
console.log(`Wrote ${Object.keys(out).length} images to mobile/android/app/src/main/res`);
