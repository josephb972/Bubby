// Loads extension/ into Chromium with Playwright and checks the launch fixes and the shop on the real extension.
// Usage: node tools/check-extension.mjs   (needs Playwright with Chromium)
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const ext = join(dirname(fileURLToPath(import.meta.url)), '..', 'extension');
// viewport: null keeps real window sizes, so the notification fallback window can be measured.
const ctx = await chromium.launchPersistentContext('', {
  channel: 'chromium', headless: true, viewport: null,
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
});
let failed = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}`); if (!ok) failed++; };
const errors = [];
const listen = (page, name) => {
  page.on('pageerror', e => errors.push(`${name}: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`${name}: ${m.text()}`); });
};
const saved = () => sw.evaluate(async () => (await chrome.storage.local.get('bubby')).bubby);
const wardrobe = () => sw.evaluate(async () => (await chrome.storage.local.get('bubby-meta'))['bubby-meta']);
const patch = (key, obj) => sw.evaluate(async ([key, obj]) => {
  const v = (await chrome.storage.local.get(key))[key];
  for (const [k, x] of Object.entries(obj)) v[k] = x && typeof x === 'object' && !Array.isArray(x) && v[k] && typeof v[k] === 'object' ? { ...v[k], ...x } : x;
  if (key === 'bubby-meta') v.rev = (v.rev || 0) + 100;
  await chrome.storage.local.set({ [key]: v });
}, [key, obj]);

let [sw] = ctx.serviceWorkers();
if (!sw) sw = await ctx.waitForEvent('serviceworker');
const base = `chrome-extension://${new URL(sw.url()).host}/`;
try {
  check((await sw.evaluate(() => chrome.runtime.getManifest().version)) === '1.1.0', 'manifest version 1.1.0');

  // 1. Welcome page asks for bedtime and saves it as soon as a time changes
  const welcome = ctx.pages().find(p => p.url().includes('welcome'))
    || await ctx.waitForEvent('page', { predicate: p => p.url().includes('welcome'), timeout: 5000 });
  listen(welcome, 'welcome');
  await welcome.waitForFunction(() => document.getElementById('inBed').value === '22:00');
  await welcome.fill('#inBed', '23:00');
  await welcome.waitForFunction(() => document.getElementById('bedMsg').textContent.includes('Saved'));
  await welcome.fill('#inWake', '07:30');
  await welcome.waitForTimeout(300);
  const cfg = (await saved()).cfg;
  check(cfg.bed === 23 * 60 && cfg.wake === 7 * 60 + 30 && cfg.bedAsked, `welcome page saves bedtime (bed ${cfg.bed}, wake ${cfg.wake})`);

  // 2. Popup: time-skip buttons hidden; bubby.dev(true) shows them; Test notification always there
  const pop = await ctx.newPage();
  listen(pop, 'popup');
  await pop.setViewportSize({ width: 468, height: 600 });
  await pop.goto(base + 'popup/popup.html');
  await pop.waitForSelector('#app.toy');
  check((await pop.evaluate(() => document.documentElement.scrollWidth)) <= 468, 'toy pod fits the 468 px popup');
  await pop.click('#btnSettingsPhoto');
  check(await pop.isHidden('#devSkip'), 'time-skip buttons hidden');
  check(await pop.isVisible('#btnTestNote'), 'Test notification visible');
  check((await pop.inputValue('#inBed')) === '23:00', 'settings show the bedtime chosen on the welcome page');
  await sw.evaluate(() => self.bubby.dev(true));
  await pop.waitForSelector('#devSkip:not([hidden])', { timeout: 3000 }).catch(() => {});
  check(await pop.isVisible('#devSkip'), 'bubby.dev(true) shows the time-skip buttons');
  await pop.click('[data-skip="4"]');
  await pop.waitForSelector('#ovAway:not([hidden])', { timeout: 3000 }).catch(() => {});
  check(await pop.isVisible('#ovAway'), '+4 hours still works for testing');
  await sw.evaluate(() => self.bubby.dev(false));
  await pop.close();

  // 3. Notification fallback window is big enough for each look (window sizes from background.js)
  for (const [look, size] of [['toy', { width: 490, height: 650 }], ['compact', { width: 382, height: 640 }]]) {
    await sw.evaluate(async look => { const s = (await chrome.storage.local.get('bubby')).bubby; s.cfg.look = look; await chrome.storage.local.set({ bubby: s }); }, look);
    const opened = ctx.waitForEvent('page', { predicate: p => p.url().includes('win=1') });
    await sw.evaluate(size => chrome.windows.create({ url: chrome.runtime.getURL('popup/popup.html?win=1'), type: 'popup', ...size }), size);
    const w = await opened;
    listen(w, `window-${look}`);
    await w.waitForSelector('#app'); await w.waitForTimeout(300);
    const m = await w.evaluate(() => ({ iw: innerWidth, ih: innerHeight, aw: document.getElementById('app').offsetWidth, ah: document.getElementById('app').offsetHeight, sw: document.documentElement.scrollWidth }));
    check(m.sw <= m.iw && m.ah <= m.ih, `fallback window, ${look} look: ${m.aw}×${m.ah} fits in ${m.iw}×${m.ih} without scrolling`);
    await w.close();
  }

  // 5. Shop: wardrobe created once, buying with confirm and undo, sizes, decor, growing out, new seed, start over, backup
  {
    let p = await ctx.newPage();
    listen(p, 'shop');
    // The open popup owns Bubby's state (and saves it every few seconds), so close it before changing the save.
    const reopen = async edit => {
      await p.close(); await sw.evaluate(edit);
      p = await ctx.newPage(); listen(p, 'shop'); await p.setViewportSize({ width: 468, height: 600 });
      await p.goto(base + 'popup/popup.html'); await p.waitForSelector('#app.toy'); await p.waitForTimeout(600);
    };
    await sw.evaluate(async () => { const S = (await chrome.storage.local.get('bubby')).bubby, now = Date.now();
      Object.assign(S, { stage: 'child', stageT: 0, weight: 12, hunger: 4, happy: 4, poops: [], asleep: false, lights: true, call: null, sick: false, paused: false, awakeT: 3600, lastT: now, lastSeenAt: now, ended: null });
      Object.assign(S.cfg, { look: 'toy', bed: (new Date().getHours() * 60 + 300) % 1440, wake: (new Date().getHours() * 60 + 360) % 1440 }); S.seenSeq = S.evSeq; await chrome.storage.local.set({ bubby: S }); });
    await p.setViewportSize({ width: 468, height: 600 });
    await p.goto(base + 'popup/popup.html');
    await p.waitForSelector('#app.toy'); await p.waitForTimeout(400);
    let m = await wardrobe();
    check(m && m.petals >= 30 && m.equip.head === 'petalbow' && m.owned.petalbow.length === 4, `wardrobe created with the welcome gift (${m && m.petals} Petals, bow in 4 sizes)`);
    check(await p.isVisible('#btnShopPhoto') && await p.evaluate(() => document.getElementById('btnShopPhoto').classList.contains('nudge')), 'toy pod shows the shop button with a "new" dot');
    await patch('bubby-meta', { petals: 200 });
    await p.waitForTimeout(200);
    await p.click('#btnShopPhoto');
    await p.waitForSelector('#viewShop:not([hidden])');
    check((await p.textContent('#wallet')).includes('200'), 'shop shows the wallet (picked up a change saved elsewhere)');
    check((await p.evaluate(() => document.documentElement.scrollWidth)) <= 468, 'shop fits the popup width');
    const beanie = 'article[data-id="beanie"] button.buy';
    check((await p.textContent(beanie)).includes('Bud'), 'Bud-size is offered first for a Bud');
    await p.click(beanie);
    check((await p.textContent(beanie)).startsWith('Buy for 26?'), 'buying asks to confirm, showing what is left');
    await p.click(beanie); await p.waitForTimeout(150);
    m = await wardrobe();
    check(m.petals === 174 && m.owned.beanie.join() === 'M' && m.equip.head === 'beanie', `bought the Bud size only (26 Petals), and it's worn (${m.petals} left)`);
    await p.click('#btnUndo'); await p.waitForTimeout(150);
    m = await wardrobe();
    check(m.petals === 200 && !m.owned.beanie && m.equip.head === 'petalbow', 'undo refunds and puts the bow back on');
    await p.click(beanie); await p.click(beanie);
    await p.click('article[data-id="scarf"] button.size[data-size="M"]');
    await p.click('article[data-id="scarf"] button.buy'); await p.click('article[data-id="scarf"] button.buy');
    await p.click('[data-tab="home"]');
    await p.click('article[data-id="lantern"] button.buy'); await p.click('article[data-id="lantern"] button.buy'); await p.waitForTimeout(150);
    m = await wardrobe();
    check(m.home.centre === 'lantern' && m.equip.neck === 'scarf', 'decor bought and placed; scarf worn');
    await p.keyboard.press('Escape');
    check(await p.isVisible('#viewMain'), 'Escape leaves the shop');

    // Bubby grows into a Blossom: the Bud-size beanie and scarf don't fit any more
    const before = m.petals;
    await reopen(async () => { const S = (await chrome.storage.local.get('bubby')).bubby; S.stageT = 1e9; S.lastT = Date.now() - 2000; await chrome.storage.local.set({ bubby: S }); });
    let S = await saved();
    m = await wardrobe();
    check(S.stage === 'adult' && m.equip.head === 'beanie' && (m.news.outgrown || []).includes('beanie'), `grew into a Blossom: beanie still chosen, flagged as outgrown (${S.stage})`);
    check(m.petals === before + 20, `+20 Petals for growing up (${before} → ${m.petals})`);
    const shot = await p.evaluate(async () => { const { petSprite } = await import('/art/sprites.js'); const { outfitFor } = await import('/core/shop.js');
      const S = (await chrome.storage.local.get('bubby')).bubby, M = (await chrome.storage.local.get('bubby-meta'))['bubby-meta'];
      return JSON.stringify(outfitFor(M, S.stage)); });
    check(shot === JSON.stringify({ head: null, face: null, neck: null, body: null }), 'the Blossom wears nothing it doesn\'t have in its size');
    await p.click('#btnShopPhoto'); await p.waitForTimeout(200);
    check((await p.textContent('#shopList')).includes('outgrown its Beanie and Cosy scarf'), 'shop explains what was outgrown');
    await p.keyboard.press('Escape');

    // A new seed and "Start over" both keep the wardrobe
    await reopen(async () => { const S = (await chrome.storage.local.get('bubby')).bubby; S.ended = { kind: 'garden', age: 1, stage: 'senior', name: 'Elder', mistakes: 0, gen: 1, day: 9 }; await chrome.storage.local.set({ bubby: S }); });
    await p.click('#btnReplant'); await p.waitForTimeout(150);
    m = await wardrobe();
    check((await saved()).stage === 'seed' && m.owned.beanie && m.home.centre === 'lantern', 'planting a new seed keeps clothes and decor');
    await p.click('#btnSettingsPhoto'); await p.click('#btnReset'); await p.click('#btnResetYes'); await p.waitForTimeout(150);
    m = await wardrobe();
    check(m.owned.beanie && m.owned.scarf && m.home.centre === 'lantern', '"Start over" keeps clothes and decor');

    // Backup code round trip, and shop reset needs typing RESET
    const code = await p.evaluate(async () => (await import('/core/shop.js')).exportCode((await chrome.storage.local.get('bubby-meta'))['bubby-meta']));
    await p.click('#btnSettingsPhoto');
    await p.click('#btnShopReset'); await p.click('#btnShopResetYes');
    check((await wardrobe()).owned.beanie, 'reset shop refuses without typing RESET');
    await p.fill('#resetWord', 'reset'); await p.click('#btnShopResetYes'); await p.waitForTimeout(150);
    check(!(await wardrobe()).owned.beanie, 'reset shop clears the wardrobe after typing RESET');
    await p.click('#btnPasteCode'); await p.fill('#codeIn', code); await p.click('#btnRestore'); await p.waitForTimeout(150);
    m = await wardrobe();
    check(m.owned.beanie && m.home.centre === 'lantern' && (await p.textContent('#codeMsg')).includes('restored'), 'backup code restores everything');
    await p.close();
    await sw.evaluate(() => self.bubby.tick());
    check(!(await sw.evaluate(() => self.bubby.iconError())), 'toolbar icon draws with an outfit');
  }

  // 4. Background worker still catches up and acts with the popup closed
  const after = await sw.evaluate(() => self.bubby.skip(6));
  check(after && after.stage !== 'seed', `background catch-up after 6 hours (stage: ${after && after.stage})`);
  check(errors.length === 0, `no console errors${errors.length ? '\n      ' + errors.join('\n      ') : ''}`);
} catch (e) {
  console.error(e); failed++;
} finally {
  await ctx.close();
}
console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
