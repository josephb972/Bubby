// Loads extension/ into Chromium with Playwright and checks the launch fixes on the real extension.
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

let [sw] = ctx.serviceWorkers();
if (!sw) sw = await ctx.waitForEvent('serviceworker');
const base = `chrome-extension://${new URL(sw.url()).host}/`;
try {
  check((await sw.evaluate(() => chrome.runtime.getManifest().version)) === '1.0.0', 'manifest version 1.0.0');

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
