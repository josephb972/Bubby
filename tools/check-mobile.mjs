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

  await page.tap('#btnBack');
  await page.waitForTimeout(200);
  await page.tap('#btnShopPhoto');
  await page.waitForTimeout(300);
  check(await page.locator('#viewShop').isVisible(), `${name}: shop opens`);
  check(await page.evaluate(() => document.documentElement.scrollWidth) <= vp.width + 1, `${name}: shop has no sideways scroll`);
  if (shots) await page.screenshot({ path: join(shots, `${name.replace(/\W/g, '')}-shop.png`), fullPage: true });
  await page.tap('#btnShopBack');
  await page.waitForTimeout(300);
  const sheet = await page.locator('#compactWrap').boundingBox();
  const pod = await page.locator('.pdev').boundingBox();
  check(sheet && pod && pod.y + pod.height <= sheet.y + 2 && sheet.y + sheet.height <= vp.height + 1, `${name}: pod and bottom sheet don't overlap and the sheet is on screen`);

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bubby') || 'null'));
  check(saved && saved.v, `${name}: game saved to localStorage`);
  check(!errors.length, `${name}: no page errors ${errors.join(' | ')}`);
  await ctx.close();
}

// Mini-games: the arrows move out of the pod's small screen into a big pad in the bottom sheet, and back afterwards.
{
  const { ctx, page, errors } = await phone('Pixel 7');
  // A grown, healthy Bubby that can play: a day and a half later (with the game's own rules), cured and cleaned.
  await page.evaluate(async () => {
    const S = JSON.parse(localStorage.getItem('bubby'));
    const now = Date.now();
    // (an egg waits for you to hatch it, so grow it straight to a Bud)
    Object.assign(S, { stage: 'child', race: 'shroomling', seedRace: 'shroomling', stageT: 0, hatchedAt: now - 30 * 3600e3, weight: 10, lastT: now });
    Object.assign(S, { name: 'Pip', sick: false, disease: null, doses: 0, sickT: 0, sickCounted: false, sickMeter: 0, neglectT: 0, starveT: 0, litSleep: 0, call: null, poops: [], hunger: 4, happy: 2, asleep: false, lights: true, lastSeenAt: now, seenSeq: S.evSeq });
    localStorage.setItem('bubby', JSON.stringify(S));
    Storage.prototype.setItem = () => {}; // keep the live page from saving over it before the reload
  });
  await page.reload(); await page.waitForSelector('#app.toy'); await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelector('#btnAwayOk:not([hidden])')?.click());
  const vp = page.viewportSize();
  for (const game of ['guess', 'catch']) {
    await page.tap('.hot[data-act="play"]'); await page.waitForTimeout(300);
    if (!(await page.locator('#ovPlay').isVisible())) console.log('     PLAY said:', await page.locator('#toast').textContent());
    await page.tap(`[data-game="${game}"]`); await page.waitForTimeout(400);
    const inPad = await page.evaluate(() => document.getElementById('gLeft').parentElement.id === 'mPad' && document.getElementById('gRight').parentElement.id === 'mPad');
    check(inPad, `${game}: the arrows move into the game pad`);
    const L = await page.locator('#gLeft').boundingBox(), R = await page.locator('#gRight').boundingBox();
    check(L && R && L.width >= vp.width * 0.35 && L.height >= 64 && R.x > L.x + L.width && R.y + R.height <= vp.height,
      `${game}: big thumb-sized arrows at the bottom (${L && Math.round(L.width)}×${L && Math.round(L.height)})`);
    if (shots) await page.screenshot({ path: join(shots, `game-${game}.png`) });
    if (game === 'guess') {
      for (let i = 0; i < 5; i++) { await page.waitForSelector('#gLeft:not([disabled])', { timeout: 5000 }); await page.tap('#gLeft'); }
    } else {
      const b = await page.locator('#gRight').boundingBox();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up();
    }
    await page.waitForSelector('#ovGame', { state: 'hidden', timeout: 30000 });
    await page.waitForTimeout(200);
    const back = await page.evaluate(() => document.getElementById('gLeft').closest('.g-bot') && !document.getElementById('compactWrap').classList.contains('gaming'));
    check(back, `${game}: after the game the arrows go back and the sheet shows the hearts`);
    await page.evaluate(() => document.querySelector('#ovAway:not([hidden]) #btnAwayOk, .ov:not([hidden]) [data-close]')?.click());
    await page.waitForTimeout(1500);
  }
  check(!errors.length, `games: no page errors ${errors.join(' | ')}`);
  await ctx.close();
}

// Hatching (1.1.2): the egg hatches while you watch, asks for a name (its ID card), and the newborn starts hungry and bored.
// Its card is in the album tab; starting over moves it to the photo album.
{
  const { ctx, page, errors } = await phone('Pixel 7');
  const vp = page.viewportSize();
  await page.evaluate(() => {
    const S = JSON.parse(localStorage.getItem('bubby'));
    S.seedRace = 'emberling'; S.stageT = 58; S.lastT = Date.now();
    localStorage.setItem('bubby', JSON.stringify(S));
    Storage.prototype.setItem = () => {};
  });
  await page.reload(); await page.waitForSelector('#app.toy');
  check(/Emberling Seed/.test(await page.textContent('#photoSub')), 'the race name shows on the egg: ' + await page.textContent('#photoSub'));
  await page.waitForSelector('#viewName:not([hidden])', { timeout: 10000 }).catch(() => {});
  check(await page.isVisible('#viewName'), 'when the egg hatches, the app asks for a name');
  check(await page.evaluate(() => document.documentElement.scrollWidth) <= vp.width + 1, 'the name screen fits the phone');
  await page.fill('#inName', 'Ember');
  check((await page.textContent('#nameCard .id-name')) === 'Ember' && /Emberling Bulb/.test(await page.textContent('#nameCard')), 'the ID card updates as you type, with the race');
  if (shots) await page.screenshot({ path: join(shots, 'name.png') });
  await page.tap('.name-go'); await page.waitForTimeout(500);
  check(await page.isVisible('#viewMain') && /Ember · Emberling Bulb/.test(await page.textContent('#photoSub')), 'named: ' + await page.textContent('#photoSub'));
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('bubby')));
  check(st.name === 'Ember' && st.hunger < 0.1 && st.happy < 0.1, `the newborn starts hungry and bored (hunger ${st.hunger.toFixed(2)}, happy ${st.happy.toFixed(2)})`);
  if (shots) await page.screenshot({ path: join(shots, 'newborn.png') });
  await page.tap('#btnShopPhoto'); await page.tap('[data-tab="album"]'); await page.waitForTimeout(300);
  check(/Ember/.test(await page.textContent('#shopBody .idcard')), 'the album tab shows its ID card');
  // Start over: the card moves to the photo album
  await page.tap('#btnShopBack'); await page.tap('#btnSettingsPhoto');
  await page.tap('#btnReset'); await page.tap('#btnResetYes'); await page.waitForTimeout(300);
  await page.tap('#btnShopPhoto'); await page.tap('[data-tab="album"]'); await page.waitForTimeout(300);
  const cards = await page.locator('#shopBody .album .idcard').count();
  check(cards === 1 && /Started over/.test(await page.textContent('#shopBody .album')), 'after starting over, its card is in the photo album');
  if (shots) await page.screenshot({ path: join(shots, 'album.png'), fullPage: true });
  check(!errors.length, `naming: no page errors ${errors.join(' | ')}`);
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

// Personality (1.2.0): Status → Nature opens the Personality screen, it fits, and Bubby does its own little things.
{
  const { ctx, page, errors } = await phone('Pixel 7');
  await page.evaluate(async () => {
    const S = JSON.parse(localStorage.getItem('bubby'));
    const now = Date.now();
    Object.assign(S, { stage: 'child', race: 'puddle', seedRace: 'puddle', stageT: 0, hatchedAt: now - 30 * 3600e3, weight: 10, lastT: now });
    Object.assign(S, { name: 'Pip', sick: false, disease: null, call: null, poops: [], hunger: 3, happy: 3, asleep: false, lights: true, lastSeenAt: now, seenSeq: S.evSeq });
    S.persona.known = { q: 2, axes: [] };
    localStorage.setItem('bubby', JSON.stringify(S));
    Storage.prototype.setItem = () => {};
  });
  await page.reload(); await page.waitForSelector('#app.toy'); await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelector('#btnAwayOk:not([hidden])')?.click());
  await page.tap('.tile[data-act="status"]'); await page.waitForTimeout(300);
  await page.tap('#stNature'); await page.waitForTimeout(300);
  check(await page.locator('#ovNature').isVisible(), 'Personality screen opens from Status → Nature');
  check(await page.evaluate(() => { const o = document.getElementById('ovNature'); return o.scrollHeight <= o.clientHeight + 1; }), 'Personality screen fits on the phone');
  if (shots) await page.screenshot({ path: join(shots, 'Pixel7-personality.png') });
  await page.tap('#ovNature [data-ov="status"]'); await page.waitForTimeout(200);
  await page.tap('#ovStatus [data-close]'); await page.waitForTimeout(200);
  // Behaviours start a few seconds after the screen is free; the first one goes in the journal
  await page.waitForTimeout(9500);
  if (shots) await page.screenshot({ path: join(shots, 'Pixel7-behaviour.png') });
  check(errors.length === 0, `no errors with personalities and behaviours${errors.length ? ': ' + errors.join('; ') : ''}`);
  await ctx.close();
}

await browser.close();
console.log(failed ? `${failed} check(s) failed` : 'All mobile checks passed');
process.exit(failed ? 1 : 0);
