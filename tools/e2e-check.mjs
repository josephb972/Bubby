// End-to-end checks: loads extension/ into Chromium with Playwright and drives the real popup, welcome page and
// background worker. Usage: node tools/e2e-check.mjs   (needs Playwright with Chromium)
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const ext = join(dirname(fileURLToPath(import.meta.url)), '..', 'extension');
const profile = await mkdtemp(join(tmpdir(), 'bubby-e2e-'));
const ctx = await chromium.launchPersistentContext(profile, {
  channel: 'chromium', headless: true, viewport: null, // real window sizes, so the fallback window's fit can be checked
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
});

let failures = 0;
const ok = (cond, label) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`); if (!cond) failures++; };
const errors = [];
const watch = (page, name) => {
  page.on('pageerror', e => errors.push(`${name}: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`${name}: ${m.text()}`); });
};

try {
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const id = new URL(sw.url()).host;
  const url = p => `chrome-extension://${id}/${p}`;
  ok(!!id, `extension loaded (${id})`);
  const manifest = await sw.evaluate(() => chrome.runtime.getManifest());
  ok(manifest.version === '1.0.0', `manifest version is ${manifest.version}`);

  // Welcome page: opens on install, bedtime question saves to the game state.
  let welcome = ctx.pages().find(p => p.url().includes('welcome'));
  if (!welcome) welcome = await ctx.waitForEvent('page', { predicate: p => p.url().includes('welcome'), timeout: 5000 }).catch(() => null);
  ok(!!welcome, 'welcome page opens on install');
  if (!welcome) { welcome = await ctx.newPage(); await welcome.goto(url('welcome/welcome.html')); }
  watch(welcome, 'welcome');
  await welcome.waitForLoadState('load');
  await welcome.waitForFunction(() => document.getElementById('inBed').value === '22:00');
  await welcome.fill('#inBed', '23:30');
  await welcome.fill('#inWake', '07:15');
  await welcome.click('#btnBed');
  await welcome.waitForFunction(() => /Saved/.test(document.getElementById('bedMsg').textContent), null, { timeout: 5000 });
  const cfg = await sw.evaluate(async () => (await chrome.storage.local.get('bubby')).bubby.cfg);
  ok(cfg.bed === 23 * 60 + 30 && cfg.wake === 7 * 60 + 15 && cfg.bedAsked === true, `bedtime saved from welcome page (${cfg.bed}/${cfg.wake}, asked=${cfg.bedAsked})`);
  await welcome.fill('#inWake', '23:30');
  await welcome.click('#btnBed');
  await welcome.waitForFunction(() => document.getElementById('bedMsg').classList.contains('err'));
  ok(true, 'equal bedtime and wake time is rejected');

  // Popup (as a tab, 468 px wide like the real popup)
  const pop = await ctx.newPage();
  watch(pop, 'popup');
  await pop.setViewportSize({ width: 468, height: 600 });
  await pop.goto(url('popup/popup.html'));
  await pop.waitForSelector('#app.toy');
  const scroll = await pop.evaluate(() => document.documentElement.scrollWidth);
  ok(scroll <= 468, `toy pod fits 468 px without horizontal scroll (${scroll})`);
  await pop.click('#btnSettingsPhoto');
  ok(await pop.isHidden('#devTools'), 'time-skip buttons hidden by default');
  ok(await pop.isVisible('#btnTestNote'), 'Test notification still visible');
  ok(await pop.isHidden('#feedbackBox'), 'feedback link hidden in an unpacked install');
  for (let i = 0; i < 5; i++) await pop.click('#settingsTitle');
  ok(await pop.isVisible('#devTools'), 'five taps on the title show developer tools');
  await pop.click('[data-skip="4"]');
  await pop.waitForSelector('#ovAway:not([hidden])', { timeout: 3000 }).catch(() => {});
  ok(await pop.isVisible('#ovAway'), '+4 hours shows the "While you were away" card');
  await pop.click('#btnSettingsPhoto');
  for (let i = 0; i < 5; i++) await pop.click('#settingsTitle');
  ok(await pop.isHidden('#devTools'), 'five more taps hide developer tools again');
  await pop.click('#btnBack');

  // Console helper toggles dev tools too (popup open: background forwards it)
  await sw.evaluate(() => self.bubby.dev(true));
  await pop.waitForFunction(async () => (await chrome.storage.local.get('bubby')).bubby.cfg.dev === true);
  await pop.click('#btnSettingsPhoto');
  ok(await pop.isVisible('#devTools'), 'bubby.dev(true) in the service worker shows developer tools');
  await sw.evaluate(() => self.bubby.dev(false));
  await pop.close();

  // Fallback window (what a notification opens when the popup can't): must fit the toy pod and the compact look.
  for (const look of ['toy', 'compact']) {
    await sw.evaluate(async look => {
      const s = (await chrome.storage.local.get('bubby')).bubby; s.cfg.look = look;
      await chrome.storage.local.set({ bubby: s });
    }, look);
    const winPage = ctx.waitForEvent('page', { predicate: p => p.url().includes('win=1') });
    // Same call and sizes as openBubby() in background.js (WIN_SIZE)
    const size = look === 'toy' ? { width: 490, height: 650 } : { width: 382, height: 640 };
    await sw.evaluate(size => chrome.windows.create({ url: chrome.runtime.getURL('popup/popup.html?win=1'), type: 'popup', ...size, focused: true }), size);
    const wp = await winPage;
    watch(wp, `window-${look}`);
    await wp.waitForSelector('#app');
    await wp.waitForTimeout(400);
    const m = await wp.evaluate(() => ({ iw: innerWidth, ih: innerHeight, aw: document.getElementById('app').offsetWidth, ah: document.getElementById('app').offsetHeight, sw: document.documentElement.scrollWidth }));
    ok(Math.abs(m.iw - m.aw) <= 2 && m.sw <= m.iw, `fallback window (${look}) fits its content: window ${m.iw}×${m.ih}, content ${m.aw}×${m.ah}`);
    ok(m.ih >= m.ah - 2, `fallback window (${look}) shows the whole height`);
    await wp.close();
  }

  // Background: skip time with the popup closed, then fix a need the way a notification button does.
  const after = await sw.evaluate(() => self.bubby.skip(6));
  ok(after && after.stage && after.stage !== 'seed', `background catch-up after 6 h (stage ${after && after.stage})`);
  await sw.evaluate(() => self.bubby.act('meal'));
  ok(true, 'notification quick action ran');

  ok(errors.length === 0, `no console errors${errors.length ? ':\n      ' + errors.join('\n      ') : ''}`);
} catch (e) {
  console.error(e); failures++;
} finally {
  await ctx.close();
  await rm(profile, { recursive: true, force: true });
}
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
