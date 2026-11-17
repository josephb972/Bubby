// Loads extension/ into Chromium with Playwright and checks the version 1.1 features on the real extension:
// races and the rare reveal, illnesses with a medicine picker, the pantry, points, daily quests, goals, the shop and the Bubbydex.
// Usage: node tools/check-v11.mjs [screenshot-folder]   (needs Playwright with Chromium)
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const ext = join(dirname(fileURLToPath(import.meta.url)), '..', 'extension');
const shots = process.argv[2];
if (shots) mkdirSync(shots, { recursive: true });
const shot = (page, name, opts = {}) => shots ? page.screenshot({ path: join(shots, name + '.png'), ...opts }) : null;

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

let [sw] = ctx.serviceWorkers();
if (!sw) sw = await ctx.waitForEvent('serviceworker');
const base = `chrome-extension://${new URL(sw.url()).host}/`;
const saved = () => sw.evaluate(async () => (await chrome.storage.local.get('bubby')).bubby);

// A plain extension page: unlike the service worker it may import() modules, which we need to build test states.
const helper = await ctx.newPage();
listen(helper, 'helper');
await helper.goto(base + 'welcome/welcome.html');

// Replace the saved Bubby with a fresh Quick-pace one plus `patch` (so nothing depends on the clock).
async function setState(patch) {
  await helper.evaluate(async patch => {
    const R = await import(chrome.runtime.getURL('core/rules.js'));
    const now = Date.now();
    const S = R.fresh(1, { pace: 'quick', look: 'toy', bedAsked: true }, now);
    const day = R.dayKey(now);
    Object.assign(S, { stage: 'child', race: 'puddle', dex: ['puddle'], hunger: 3, happy: 3, lastCheckIn: day, streak: 1, quests: null, lastSeenAt: now, seenSeq: 0 }, patch);
    S.cfg = { ...S.cfg, ...(patch.cfg || {}) };
    S.lastT = now;
    await chrome.storage.local.set({ bubby: S });
  }, patch);
}
async function openPopup(name, { init } = {}) {
  const page = await ctx.newPage();
  listen(page, name);
  if (init) await page.addInitScript(init);
  await page.setViewportSize({ width: 468, height: 600 });
  await page.goto(base + 'popup/popup.html');
  await page.waitForSelector('#app.toy');
  await page.waitForTimeout(500);
  return page;
}

try {
  /* 1. Points button and the daily bonus */
  await setState({ lastCheckIn: '', streak: 0 });
  let pop = await openPopup('daily');
  check((await pop.textContent('#btnShopPhoto b')).trim() === '35', 'the points button shows 35 (25 starter + 10 daily bonus)');
  check(/Daily gift|Daily bonus/.test(await pop.textContent('#toast')), 'a toast announces the daily bonus: ' + (await pop.textContent('#toast')));
  let s = await saved();
  check(s.streak === 1 && s.lastCheckIn !== '' && s.points === 35, 'the streak starts and the day is remembered');
  await shot(pop, '1-toy-pod-points');
  await pop.reload(); await pop.waitForSelector('#app.toy'); await pop.waitForTimeout(400);
  s = await saved(); check(s.points === 35, 'opening Bubby again the same day pays nothing more');
  await pop.close();

  /* 2. Illness: the medicine picker starts on the right medicine, the wrong one is refused, the right one cures */
  await setState({ sick: true, disease: 'itchymoss', doses: 2, sickT: 5, inv: { salve: 2, syrup: 1 }, points: 30 });
  pop = await openPopup('medicine');
  await pop.keyboard.press('m'); await pop.waitForTimeout(300);
  check(await pop.isVisible('#ovPick'), 'Medicine opens the cabinet');
  check(/Scurvy/.test(await pop.textContent('#pickNote')), 'it says which illness: ' + (await pop.textContent('#pickNote')).trim());
  check(/Lime Juice/.test(await pop.textContent('#pickCard')) && await pop.$eval('#pickCard', e => e.classList.contains('rec')), 'it starts on Lime Juice, marked as a good fit');
  await shot(pop, '2-cabinet');
  await pop.click('[data-pick="-1"]'); await pop.waitForTimeout(150);
  check(/Cinchona Bark/.test(await pop.textContent('#pickCard')), 'the arrows browse to Cinchona Bark');
  await pop.click('#pickUse'); await pop.waitForTimeout(300);
  check(/won.t help Scurvy/.test(await pop.textContent('#toast')), 'the wrong medicine is refused: ' + (await pop.textContent('#toast')));
  s = await saved(); check(s.inv.syrup === 1 && s.sick, 'and it is not used up');
  await pop.waitForTimeout(1100);
  await pop.keyboard.press('m'); await pop.waitForTimeout(250); await pop.click('#pickUse'); await pop.waitForTimeout(300);
  check(/1 more dose/.test(await pop.textContent('#toast')), 'the right medicine: first dose: ' + (await pop.textContent('#toast')));
  await pop.waitForTimeout(1400);
  await pop.keyboard.press('m'); await pop.waitForTimeout(250); await pop.click('#pickUse'); await pop.waitForTimeout(400);
  check(/All better/.test(await pop.textContent('#toast')), 'second dose cures: ' + (await pop.textContent('#toast')));
  await pop.waitForTimeout(600);
  s = await saved(); check(!s.sick && s.disease === null && s.inv.salve === 0 && s.points >= 35 && s.tot.cure === 1, `cured, medicine used up, points paid (${s.points})`);
  await pop.close();

  /* 3. Pantry: food bought in the shop is eaten from the Feed menu */
  await setState({ hunger: 1, happy: 1, inv: { pie: 1 }, points: 0 });
  pop = await openPopup('pantry');
  await pop.keyboard.press('f'); await pop.waitForTimeout(300);
  check(await pop.isVisible('#btnPantry') && /Pantry \(1\)/.test(await pop.textContent('#btnPantry')), 'the Feed menu shows the pantry: ' + (await pop.textContent('#btnPantry')).trim());
  await shot(pop, '3-feed-pantry');
  await pop.click('#btnPantry'); await pop.waitForTimeout(250);
  check(/Sunberry Pie/.test(await pop.textContent('#pickCard')), 'the pantry shows Sunberry Pie');
  await pop.click('#pickUse'); await pop.waitForTimeout(500);
  s = await saved(); check(s.inv.pie === 0 && s.hunger > 1.9 && s.happy > 1.9 && s.points >= 2, `eaten: hunger ${s.hunger.toFixed(1)}, happy ${s.happy.toFixed(1)}, ${s.points} points`);
  await pop.close();

  /* 4. Shop, quests, goals and the Bubbydex */
  await setState({ points: 60, dex: ['puddle', 'puddle:radiant'], inv: {} });
  pop = await openPopup('shop');
  await pop.keyboard.press('b'); await pop.waitForTimeout(300);
  check(await pop.isVisible('#viewShop') && await pop.isHidden('#viewMain'), 'B opens the shop');
  check((await pop.textContent('#shopPts')).includes('60'), 'the shop shows 60 points');
  check(await pop.$eval('[data-buy="feast"]', b => !b.disabled) && await pop.$eval('[data-buy="elixir"]', b => !b.disabled), 'a Golden Feast (30) and a Theriac (45) are affordable');
  await shot(pop, '4a-shop');
  await pop.click('[data-buy="salad"]'); await pop.waitForTimeout(300);
  s = await saved(); check(s.inv.salad === 1 && s.points === 60 - 6 + 5, `bought a Garden Salad (60 - 6, then the Shopper goal +5 = ${s.points})`);
  check(/Bought Garden Salad/.test(await pop.textContent('#shopMsg')), 'the shop says so: ' + (await pop.textContent('#shopMsg')));
  await pop.click('[data-tab="today"]'); await pop.waitForTimeout(150);
  check((await pop.$$('#shopBody .quest')).length === 3, 'three daily quests today');
  await shot(pop, '4b-today');
  await pop.click('[data-tab="goals"]'); await pop.waitForTimeout(150);
  check((await pop.$$('#shopBody .quest')).length === 15, '15 goals, one already done');
  await pop.click('[data-tab="dex"]'); await pop.waitForTimeout(250);
  check((await pop.$$('#shopBody .dex-row')).length === 6, 'the Bubbydex has 6 races');
  check((await pop.$$('#shopBody .dex-row figure:not(.locked)')).length === 1, 'one adult form found (the rest are silhouettes)');
  await shot(pop, '4c-bubbydex');
  await pop.keyboard.press('Escape'); await pop.waitForTimeout(200);
  check(await pop.isVisible('#viewMain'), 'Escape closes the shop');
  await pop.close();

  /* 5. The rare reveal: a Starling plays the long special animation */
  await setState({ stage: 'baby', race: null, dex: [], points: 0, stageT: 179.2, hunger: 4, happy: 4, awakeT: 0, quests: null, cfg: { pace: 'quick' } });
  pop = await openPopup('rare', { init: () => { Math.random = () => 0.01; } });
  await pop.waitForFunction(() => /rare/i.test(document.getElementById('toast').textContent), null, { timeout: 8000 });
  check(true, 'the toast announces it: ' + (await pop.textContent('#toast')));
  const t0 = Date.now();
  for (const [ms, n] of [[400, 'a'], [1700, 'b'], [2700, 'c']]) { await pop.waitForTimeout(Math.max(0, ms - (Date.now() - t0))); await shot(pop, `5${n}-rare-reveal`); }
  await pop.waitForTimeout(2200);
  s = await saved();
  check(s.race === 'starling' && s.dex.includes('starling') && s.stage === 'child', 'Bubby is a Starling Bud and it is in the Bubbydex');
  check(s.points >= 10 + 5 + 50, `growth + new race + rare bonus paid (${s.points} points)`);
  check(s.events.some(e => e.type === 'evolve' && e.rare === true && e.race === 'starling'), 'the event carries the rare flag (so a background evolve is shown when you next open Bubby)');
  await shot(pop, '5d-starling');
  await pop.close();

  /* 5b. The rare reveal when Bubby grew up while you were away (the usual case on the real-time paces) */
  {
    const m = new Date().getHours() * 60 + new Date().getMinutes(), bed = (m + 600) % 1440, wake = (bed + 60) % 1440;   // bedtime is hours away: never asleep during the test
    await setState({ stage: 'baby', race: null, dex: [], points: 0, stageT: 11.5 * 3600, hunger: 4, happy: 4, awakeT: 3600, quests: null, lastSeenAt: Date.now() - 3 * 3600e3, cfg: { pace: 'chill', bed, wake } });
    await sw.evaluate(() => self.bubby.nextRace('starling'));
    await sw.evaluate(() => self.bubby.skip(1));
    s = await saved();
    check(s.stage === 'child' && s.race === 'starling', `grew up in the background with the popup closed: ${s.stage}, ${s.race}`);
    check(s.events.some(e => e.type === 'evolve' && e.rare && e.race === 'starling'), 'the background kept the rare flag for the next time you open Bubby');
    pop = await openPopup('rare-away');
    await shot(pop, '5e-rare-away-reveal');
    await pop.waitForSelector('#ovAway:not([hidden])', { timeout: 8000 }).catch(() => {});   // the reveal plays first, then the away card
    check(await pop.isVisible('#ovAway') && /rare Starling/.test(await pop.textContent('#awayList')), 'the reveal plays first, then the away card shows the rare news: ' + (await pop.textContent('#awayList')).replace(/\s+/g, ' ').trim().slice(0, 90));
    await pop.waitForTimeout(300); await shot(pop, '5e-rare-away');
    await pop.close();
    // Closed only a minute ago: no away card, but the reveal still plays
    await setState({ stage: 'baby', race: null, dex: [], points: 0, stageT: 11.5 * 3600, hunger: 4, happy: 4, awakeT: 3600, quests: null, cfg: { pace: 'chill', bed, wake } });
    await sw.evaluate(() => self.bubby.nextRace('starling'));
    await sw.evaluate(() => self.bubby.skip(1));
    pop = await openPopup('rare-away-short');
    check(await pop.isHidden('#ovAway') && /rare Starling/.test(await pop.textContent('#toast')), 'closed only a minute: no away card, but the rare reveal still announces itself: ' + (await pop.textContent('#toast')));
    await pop.close();
  }

  /* 6. Every race looks different (screens for review) */
  for (const r of ['leafling', 'mossback', 'puddle', 'shroomling', 'emberling', 'starling']) {
    await setState({ race: r, dex: [r], stage: 'adult', variant: 'radiant', cfg: { pace: 'quick' } });
    pop = await openPopup('race-' + r);
    await pop.waitForTimeout(500);
    await shot(pop, `6-race-${r}`, { clip: { x: 100, y: 245, width: 305, height: 180 } });
    await pop.close();
  }

  /* 7. Toolbar tooltip names the illness; the background (no popup) can still give the right medicine */
  await setState({ sick: true, disease: 'blight', doses: 3, inv: { tonic: 1 } });
  await helper.evaluate(async () => { const { loadState, updateAction } = await import(chrome.runtime.getURL('core/store.js')); await updateAction(await loadState()); });
  const title = await sw.evaluate(() => chrome.action.getTitle({}));
  check(/The Plague/.test(title) && /Four Thieves Vinegar/.test(title), 'the toolbar tooltip names the illness and its medicine: ' + title);
  await sw.evaluate(() => self.bubby.act('med'));
  s = await saved(); check(s.inv.tonic === 0 && s.doses === 2 && s.sick, 'the notification button gives the matching medicine (1 of 3 doses)');
  await setState({ sick: true, disease: 'itchymoss', doses: 2, sickT: 90, inv: {} });
  await sw.evaluate(() => self.bubby.act('med'));
  s = await saved(); check(s.sick && s.sickT < 90, 'with no medicine, the notification button soothes with Garden Tea instead');

  /* 7b. Every race has its own body shape, not just its own colours (silhouette overlap between races) */
  const overlap = await helper.evaluate(async () => {
    const { petSprite } = await import(chrome.runtime.getURL('art/sprites.js'));
    const races = ['leafling', 'mossback', 'puddle', 'shroomling', 'emberling', 'starling'], out = {};
    const mask = (stage, race) => { const d = petSprite(stage, { race, variant: 'daisy', mood: 'normal' }).getContext('2d').getImageData(0, 0, 48, 48).data; return Array.from({ length: 2304 }, (_, i) => d[i * 4 + 3] > 0); };
    for (const stage of ['child', 'adult']) {
      const m = races.map(r => mask(stage, r)); let worst = 0, pair = '';
      for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) {
        let inter = 0, uni = 0; for (let k = 0; k < 2304; k++) { if (m[i][k] && m[j][k]) inter++; if (m[i][k] || m[j][k]) uni++; }
        if (inter / uni > worst) { worst = inter / uni; pair = races[i] + ' / ' + races[j]; }
      }
      out[stage] = { worst: +worst.toFixed(2), pair, areas: m.map(x => x.filter(Boolean).length) };
    }
    return out;
  });
  check(overlap.child.worst < .8 && overlap.adult.worst < .8, `race silhouettes differ: the most alike pair overlaps ${Math.round(overlap.child.worst * 100)}% as Buds (${overlap.child.pair}) and ${Math.round(overlap.adult.worst * 100)}% as adults (${overlap.adult.pair})`);

  /* 8. The compact look (the other layout) has the same features */
  await setState({ cfg: { look: 'compact', pace: 'quick' }, sick: true, disease: 'moonflu', doses: 2, inv: { drops: 2, pie: 1 }, points: 20 });
  const cp = await ctx.newPage(); listen(cp, 'compact');
  await cp.setViewportSize({ width: 360, height: 600 });
  await cp.goto(base + 'popup/popup.html'); await cp.waitForSelector('#app:not(.toy)'); await cp.waitForTimeout(500);
  check(await cp.isVisible('#btnShop') && (await cp.textContent('#btnShop')).includes('20'), 'compact look: the points button is in the header');
  check((await cp.evaluate(() => document.documentElement.scrollWidth)) <= 360, 'compact look fits 360 px wide');
  await cp.keyboard.press('m'); await cp.waitForTimeout(300);
  check(await cp.isVisible('#ovPick') && /Valerian Root/.test(await cp.textContent('#pickCard')), 'compact look: the cabinet starts on Valerian Root for Dancing Plague');
  await shot(cp, '8a-compact-cabinet');
  await cp.keyboard.press('Escape'); await cp.waitForTimeout(150);
  await cp.click('#btnShop'); await cp.waitForTimeout(300);
  check(await cp.isVisible('#viewShop'), 'compact look: the points button opens the shop');
  await shot(cp, '8b-compact-shop');
  check((await cp.evaluate(() => document.documentElement.scrollWidth)) <= 360, 'compact look: the shop fits 360 px wide');
  await cp.close();

  /* 9. Upgrading: a Bubby saved by version 1.0.0 (none of the new fields) keeps its look and gets the starter points */
  await helper.evaluate(async () => {
    const R = await import(chrome.runtime.getURL('core/rules.js'));
    const now = Date.now(), old = JSON.parse(JSON.stringify(R.fresh(4, { pace: 'quick', look: 'toy', bedAsked: true }, now)));
    for (const k of ['race', 'dex', 'disease', 'points', 'inv', 'tot', 'ach', 'quests', 'ptsDay', 'streak', 'streakMs', 'lastCheckIn', 'rareMiss', 'immuneT', 'immuneNote', 'teaCd', 'litSleep', 'litTotal']) delete old[k];
    Object.assign(old, { stage: 'adult', variant: 'thistle', sick: true, doses: 2, hunger: 3, happy: 3, lastT: now, lastSeenAt: now });
    await chrome.storage.local.set({ bubby: old });
  });
  pop = await openPopup('upgrade');
  await pop.keyboard.press('s'); await pop.waitForTimeout(300);
  check(/Leafling Thistle/.test(await pop.textContent('#stName')), 'an old Bubby becomes a Leafling and keeps its form: ' + (await pop.textContent('#stName')));
  check(/Ague/.test(await pop.textContent('#stCall')), 'its ongoing sickness is now a Ague: ' + (await pop.textContent('#stCall')).trim());
  s = await saved(); check(s.points === 35 && s.gen === 4 && s.dex.includes('leafling:thistle'), `it keeps its generation, gets the starter points plus today's bonus (${s.points}), and its form is in the Bubbydex`);
  await pop.close();

  check(errors.length === 0, `no console errors${errors.length ? '\n      ' + errors.join('\n      ') : ''}`);
} catch (e) {
  console.error(e); failed++;
} finally {
  await ctx.close();
}
console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
