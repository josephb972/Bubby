// Store images from the real extension: screenshots of the actual popup, nothing redrawn.
// Usage: node tools/store-images.mjs   (needs Playwright with Chromium) → store/
//   screenshot-1..4.png 1280×800 · promo-small.png 440×280 · promo-marquee.png 1400×560
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const ext = join(repo, 'extension'), out = join(repo, 'store');
await mkdir(out, { recursive: true });

// Capture in a time zone where it is early afternoon, so Bubby is awake with its usual 22:00 bedtime.
let off = (14 - new Date().getUTCHours() + 24) % 24; if (off > 14) off -= 24;
const TZ = off >= 0 ? `Etc/GMT-${off}` : `Etc/GMT+${-off}`;
const ctx = await chromium.launchPersistentContext('', {
  channel: 'chromium', headless: true, viewport: { width: 468, height: 600 }, deviceScaleFactor: 2, env: { ...process.env, TZ },
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
});
let [sw] = ctx.serviceWorkers();
if (!sw) sw = await ctx.waitForEvent('serviceworker');
const base = `chrome-extension://${new URL(sw.url()).host}/`;
await sw.evaluate(async () => { for (let i = 0; i < 50 && !(await chrome.storage.local.get('bubby')).bubby; i++) await new Promise(r => setTimeout(r, 100)); });

async function capture(state, { look = 'toy', size = [468, 600], then } = {}) {
  await sw.evaluate(async ({ state, look }) => {
    const S = (await chrome.storage.local.get('bubby')).bubby, now = Date.now();
    Object.assign(S, { hunger: 4, happy: 4, poops: [], sick: false, call: null, asleep: false, lights: true, paused: false, ended: null, mistakes: 0, discipline: 100, awakeT: 3600 }, state);
    Object.assign(S.cfg, { look, bed: 22 * 60, wake: 8 * 60 });
    S.lastT = now; S.lastSeenAt = now; S.seenSeq = S.evSeq; S.notifiedSeq = S.evSeq; // nothing "while you were away"
    await chrome.storage.local.set({ bubby: S });
  }, { state, look });
  const p = await ctx.newPage();
  await p.setViewportSize({ width: size[0], height: size[1] });
  await p.goto(base + 'popup/popup.html');
  await p.waitForSelector('#app');
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(700);
  if (then) await then(p);
  await p.evaluate(() => document.activeElement && document.activeElement.blur());
  await p.waitForTimeout(100);
  const png = await p.locator(look === 'toy' ? '.pdev' : '#app').screenshot();
  await p.close();
  return 'data:image/png;base64,' + png.toString('base64');
}

const bud = { stage: 'child', weight: 12, age: 2 * 86400, stageT: 3600 };
const img = {
  blossom: await capture({ stage: 'adult', variant: 'radiant', weight: 24, age: 5 * 86400, stageT: 3600 }),
  status: await capture({ ...bud, hunger: 1, happy: 3, call: { reason: 'hungry', t: 0, counted: false } }, { then: p => p.keyboard.press('s') }),
  game: await capture(bud, { then: async p => {
    await p.keyboard.press('p'); await p.waitForTimeout(200); await p.keyboard.press('2');
    await p.keyboard.down('ArrowRight'); await p.waitForTimeout(900); await p.keyboard.up('ArrowRight');
    await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(1400); await p.keyboard.up('ArrowLeft');
    await p.waitForTimeout(1200);
  } }),
  compact: await capture({ stage: 'baby', weight: 6, age: 5 * 3600, stageT: 3600, hunger: 3, happy: 2 }, { look: 'compact', size: [360, 600] }),
};
const page0 = await ctx.newPage();
await page0.goto(base + 'welcome/welcome.html');
// The logo: the egg (seed) with no background, cropped to its outline, 14 screen pixels per sprite pixel.
img.egg = await page0.evaluate(async () => {
  const { petSprite } = await import('/art/sprites.js');
  const spr = petSprite('seed', {});
  const d = spr.getContext('2d').getImageData(0, 0, 48, 48).data;
  let x0 = 48, y0 = 48, x1 = -1, y1 = -1;
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (d[(y * 48 + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, k = 14;
  const c = document.createElement('canvas'); c.width = bw * k; c.height = bh * k;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(spr, x0, y0, bw, bh, 0, 0, bw * k, bh * k);
  return c.toDataURL();
});
await ctx.close();

// Lay out at exact store sizes, in the popup's own fonts and colours.
const font = async (fam, w, f) => `@font-face{font-family:"${fam}";font-weight:${w};src:url(data:font/woff2;base64,${(await readFile(join(ext, 'fonts', f))).toString('base64')})}`;
const css = [await font('Fredoka', 600, 'fredoka-latin-600-normal.woff2'), await font('Nunito', 400, 'nunito-latin-400-normal.woff2')].join('') + `
*{box-sizing:border-box;margin:0} body{overflow:hidden;color:#3b2f4a;font-family:Nunito,sans-serif;
  background:radial-gradient(ellipse at 30% 0%,#dcf4ed,transparent 60%),#bfe6db}
h1{font:600 50px/1.1 Fredoka,sans-serif;text-align:center} h1 em{font-style:normal;color:#d9504a}
p{font-size:23px;color:#5d5070;text-align:center;margin-top:8px}
.page{height:100%;display:flex;flex-direction:column;align-items:center;padding-top:34px}
.row{display:flex;align-items:center;gap:56px;margin-top:22px}
.pod{width:468px;height:600px;border-radius:24px;box-shadow:0 16px 36px rgba(40,60,70,.25)}
.zoom{border-radius:14px;border:6px solid #fffcf3;box-shadow:0 0 0 2px #5e978c,0 16px 36px rgba(40,60,70,.25)}
.pix{image-rendering:pixelated}`;
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
async function render(file, w, h, body) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>${css} body{width:${w}px;height:${h}px}</style>${body}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(out, file) });
  console.log('store/' + file);
}
// The live screen inside the toy pod (same numbers as popup.css), shown again 2.4× larger beside the pod.
const Z = 2.4, S = { x: 106.5, y: 252.9, w: 147.8, h: 166.7 };
const zoom = src => `<div class="zoom" style="width:${S.w * Z + 12}px;height:${S.h * Z + 12}px;background:url(${src}) -${S.x * Z}px -${S.y * Z}px/${468 * Z}px ${600 * Z}px no-repeat;background-origin:content-box"></div>`;
const shot = (title, line, src) => `<div class="page"><h1>${title}</h1><p>${line}</p><div class="row"><img class="pod" src="${src}">${zoom(src)}</div></div>`;

await render('screenshot-1.png', 1280, 800, shot('A tiny pixel pet for your <em>toolbar</em>', 'Feed it, play with it, clean up after it, and watch it grow.', img.blossom));
await render('screenshot-2.png', 1280, 800, shot('See what Bubby <em>needs</em>', 'Hearts, weight and discipline, plus one button that does what it needs now.', img.status));
await render('screenshot-3.png', 1280, 800, shot('Play <em>Seed catch</em>', 'Catch falling seeds for 20 seconds. Gold seeds are worth 3, pebbles cost 2.', img.game));
await render('screenshot-4.png', 1280, 800, `<div class="page"><h1>Prefer it simple? Try the <em>compact</em> look</h1><p>Bigger hearts, one big "what to do now" button, and every action one click away.</p>
  <div class="row"><img class="pod" style="width:450px;height:auto" src="${img.compact}"></div></div>`);
const promo = (w, h, s, t, l) => `<div style="height:100%;display:flex;align-items:center;justify-content:center;gap:${w * .03}px">
  <img class="pix" src="${img.egg}" style="width:${s}px;height:auto"><div><h1 style="font-size:${t}px;text-align:left">Bub<em>by</em></h1>
  <p style="font-size:${l}px;text-align:left">A tiny pixel pet<br>for your toolbar</p></div></div>`;
await render('promo-small.png', 440, 280, promo(440, 280, 180, 64, 22));      // egg at 6 screen pixels per sprite pixel
await render('promo-marquee.png', 1400, 560, promo(1400, 560, 420, 128, 40)); // 14 per sprite pixel
await browser.close();
