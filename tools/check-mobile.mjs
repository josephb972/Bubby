// Checks the Android app's web layer in a phone-sized Chromium (no phone or emulator needed):
// the toy pod fits the screen, settings scroll, saves work, and the notification forecast is sensible.
// Usage: node mobile/build-web.mjs && node tools/check-mobile.mjs [screenshot-dir]
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium, devices } = createRequire(import.meta.url)('playwright');
const www = join(dirname(fileURLToPath(import.meta.url)), '..', 'mobile', 'www');
const shots = process.argv[2];
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
let failed = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failed++; };

const browser = await chromium.launch();
async function phone(name, setup) {
  const ctx = await browser.newContext({ ...devices[name] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('http://bubby.local/**', async route => {
    const path = new URL(route.request().url()).pathname;
    try { await route.fulfill({ contentType: types[extname(path)] || 'application/octet-stream', body: await readFile(join(www, path)) }); }
    catch { await route.fulfill({ status: 404, body: '' }); }
  });
  if (setup) await page.addInitScript(setup);
  await page.goto('http://bubby.local/index.html');
  await page.waitForSelector('#app.toy');
  await page.waitForTimeout(500);
  return { ctx, page, errors };
}

for (const name of ['Pixel 7', 'Galaxy S9+']) {
  const { ctx, page, errors } = await phone(name);
  const vp = page.viewportSize();
  const box = await page.locator('.pdev').boundingBox();
  check(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= vp.width + 1 && box.y + box.height <= vp.height + 1,
    `${name}: toy pod fits the screen (${box && `${Math.round(box.width)}×${Math.round(box.height)}`} in ${vp.width}×${vp.height})`);
  check(box && box.width > vp.width * 0.85, `${name}: toy pod fills the width`);
  if (shots) await page.screenshot({ path: join(shots, `${name.replace(/\W/g, '')}-toy.png`) });

  await page.tap('.hot[data-act="feed"]');
  await page.waitForTimeout(300);
  // A brand-new seed can't eat yet: then the screen says so instead of opening the food menu.
  const fed = await page.locator('#ovFeed').isVisible() || /sprouting/.test(await page.locator('#toast').textContent());
  check(fed, `${name}: tapping FEED responds`);
  if (shots) await page.screenshot({ path: join(shots, `${name.replace(/\W/g, '')}-feed.png`) });
  await page.tap('#ovFeed [data-close], body', { force: true }).catch(() => {});

  await page.tap('#btnSettingsPhoto');
  await page.waitForTimeout(300);
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  check(w <= vp.width + 1, `${name}: settings have no sideways scroll`);
  if (shots) await page.screenshot({ path: join(shots, `${name.replace(/\W/g, '')}-settings.png`), fullPage: true });

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bubby') || 'null'));
  check(saved && saved.v, `${name}: game saved to localStorage`);
  check(!errors.length, `${name}: no page errors ${errors.join(' | ')}`);
  await ctx.close();
}

// Notification forecast: a Bubby left alone for a day and a half.
{
  const { ctx, page } = await phone('Pixel 7');
  const r = await page.evaluate(async () => {
    const { plan } = await import('/mobile/mobile.js');
    const S = JSON.parse(localStorage.getItem('bubby'));
    S.cfg.notify = true;
    const now = Date.now();
    const list = plan(S, now);
    const paused = plan({ ...S, paused: true }, now);
    const off = plan({ ...S, cfg: { ...S.cfg, notify: false } }, now);
    const quick = plan({ ...S, cfg: { ...S.cfg, pace: 'quick' } }, now);
    return { list: list.map(n => ({ h: +((n.at - now) / 3600000).toFixed(1), title: n.title })), paused: paused.length, off: off.length, quick: quick.length };
  });
  console.log('     forecast:', r.list.map(n => `${n.h}h ${n.title}`).join(' · '));
  check(r.list.length > 0, 'forecast has notifications for a Bubby left alone');
  check(r.list.every((n, i, a) => !i || n.h >= a[i - 1].h), 'forecast is in time order');
  check(r.paused === 0 && r.off === 0 && r.quick === 0, 'no forecast when paused, notifications off, or on Quick pace');
  await ctx.close();
}

await browser.close();
console.log(failed ? `${failed} check(s) failed` : 'All mobile checks passed');
process.exit(failed ? 1 : 0);
