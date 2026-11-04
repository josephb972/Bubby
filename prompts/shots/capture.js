// Screenshot harness for the Bubby visual audit.
// Usage: node prompts/shots/capture.js <label> <outDir>
// Serves index.html locally, injects crafted saves, freezes time with page.clock and drives
// transient states through the ?debug hook. Writes one PNG per state × viewport × scheme,
// a full-page shot per viewport × scheme, and report.json (console errors, scroll, overlaps).
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const label = process.argv[2] || 'shots';
const out = path.resolve(process.argv[3] || `./${label}`);
const only = process.argv[4] ? new RegExp(process.argv[4]) : null;
const root = path.resolve(__dirname, '../..');

const VIEWPORTS = { phone: { width: 390, height: 844 }, desk: { width: 1280, height: 900 } };
const SCHEMES = ['light', 'dark'];

function base(over = {}) {
  return Object.assign({
    v: 1, gen: 2, speed: 1, stage: 'baby', stageT: 40, age: 160,
    hunger: 3, happy: 3, discipline: 50, weight: 5,
    poops: [], sick: false, doses: 0, sickT: 0, sickCounted: false, sickMeter: 0, neglectT: 0, starveT: 0,
    asleep: false, lights: true, awakeT: 5, sleepT: 0,
    call: null, mistakes: 1, snacks: [], variant: null, chubby: false,
    ended: null, paused: false, nextPoop: 9999, nextTantrum: 9999,
    stats: { meals: 3, snacks: 1, games: 1, wins: 1, cleans: 1, meds: 0, scolds: 0, sick: 0, bestCatch: 14 },
    soundOn: false,
  }, over);
}
const adult = (v, o = {}) => base({ stage: 'adult', variant: v, weight: 20, age: 600, stageT: 30, ...o });
const senior = (v, o = {}) => base({ stage: 'senior', variant: v, weight: 22, age: 1200, stageT: 30, ...o });

// Each state: save (object), setup(page) run after load, ms of game time to advance before the shot.
const idle = `__bubby.PET.x = 40; __bubby.PET.tx = 40; __bubby.PET.wait = 999;`;
const STATES = [
  ['seed', base({ stage: 'seed', stageT: 3, age: 3, weight: 1 }), '', 300],
  ['seed-wobble', base({ stage: 'seed', stageT: 10, age: 10, weight: 1 }), '', 300],
  ['seed-crack', base({ stage: 'seed', stageT: 15.5, age: 15.5, weight: 1 }), '', 300],
  ['hatch-flash', base({ stage: 'seed', stageT: 17.9, age: 17.9, weight: 1 }), '', 200],
  ['hatch-mid', base({ stage: 'seed', stageT: 17.9, age: 17.9, weight: 1 }), '', 900],
  ['evolve-bud-mid', base({ stage: 'baby', stageT: 179.9, age: 220 }), idle, 800],
  ['evolve-blossom-mid', base({ stage: 'child', stageT: 299.9, age: 520, weight: 10, mistakes: 0, discipline: 100 }), idle, 800],
  ['evolve-blossom-end', base({ stage: 'child', stageT: 299.9, age: 520, weight: 10, mistakes: 0, discipline: 100 }), idle, 1700],
  ['evolve-elder-mid', adult('daisy', { stageT: 419.9 }), idle, 800],
  ['bulb', base(), idle, 400],
  ['bud', base({ stage: 'child', weight: 10 }), idle, 400],
  ['radiant', adult('radiant'), idle, 400],
  ['daisy', adult('daisy'), idle, 400],
  ['thistle', adult('thistle'), idle, 400],
  ['daisy-chubby', adult('daisy', { chubby: true, weight: 34 }), idle, 400],
  ['elder-radiant', senior('radiant'), idle, 400],
  ['elder-thistle', senior('thistle'), idle, 400],
  ['walk-bulb', base(), `__bubby.PET.x = 30; __bubby.PET.tx = 70; __bubby.PET.wait = 0;`, 900],
  ['walk-blossom', adult('radiant'), `__bubby.PET.x = 30; __bubby.PET.tx = 70; __bubby.PET.wait = 0;`, 900],
  ['blink', adult('daisy'), idle + `__bubby.blinkNow && __bubby.blinkNow();`, 'blink'],
  ['happy', adult('radiant'), idle + `__bubby.A = { type: 'happy', t: 0, dur: 9 };`, 400],
  ['sad', base({ stage: 'child', weight: 10, hunger: .5, happy: .5 }), idle, 400],
  ['tantrum', adult('daisy', { call: { reason: 'tantrum', t: 2, counted: false } }), idle, 700],
  ['call-hungry', base({ hunger: 0, call: { reason: 'hungry', t: 2, counted: false } }), idle, 700],
  ['sick', base({ stage: 'child', weight: 10, sick: true, doses: 2 }), idle, 400],
  ['sick-adult', adult('radiant', { sick: true, doses: 2 }), idle, 400],
  ['asleep-lights-on', adult('radiant', { asleep: true, lights: true, call: { reason: 'sleep', t: 2, counted: false } }), idle, 500],
  ['asleep-lights-off', adult('radiant', { asleep: true, lights: false }), idle, 500],
  ['asleep-bulb-dark', base({ asleep: true, lights: false }), idle, 500],
  ['poop-1', base({ poops: [{ t: 1 }] }), idle, 400],
  ['poop-2', base({ poops: [{ t: 1 }, { t: 1 }] }), idle, 400],
  ['poop-3', base({ poops: [{ t: 1 }, { t: 1 }, { t: 1 }] }), idle, 400],
  ['poop-4-adult', adult('daisy', { poops: [{ t: 1 }, { t: 1 }, { t: 1 }, { t: 1 }] }), idle, 400],
  ['clean-wave', adult('daisy', { poops: [{ t: 1 }, { t: 1 }, { t: 1 }] }), idle + `__bubby.act('clean');`, 550],
  ['clean-done', adult('daisy', { poops: [{ t: 1 }, { t: 1 }, { t: 1 }] }), idle + `__bubby.act('clean');`, 1500],
  ['eat-meal', base({ hunger: 1 }), idle + `__bubby.feed('meal');`, 700],
  ['eat-snack', adult('radiant', { happy: 1 }), idle + `__bubby.feed('snack');`, 700],
  ['refuse', base({ hunger: 4 }), idle + `__bubby.feed('meal');`, 350],
  ['medicine', base({ stage: 'child', weight: 10, sick: true, doses: 2 }), idle + `__bubby.act('med');`, 500],
  ['scold', adult('daisy', { call: { reason: 'tantrum', t: 2, counted: false } }), idle + `__bubby.act('discipline');`, 300],
  ['menu-status', adult('radiant', { hunger: 2.5, happy: 3.5, discipline: 75 }), idle + `__bubby.act('status');`, 300],
  ['menu-status-call', base({ hunger: 0, call: { reason: 'hungry', t: 2, counted: false } }), idle + `__bubby.act('status');`, 300],
  ['menu-feed', base(), idle + `__bubby.act('feed');`, 300],
  ['menu-play', adult('daisy'), idle + `__bubby.act('play');`, 300],
  ['guess-ask', adult('radiant'), idle + `__bubby.startGame('guess');`, 300],
  ['guess-right', adult('radiant'), idle + `__bubby.startGame('guess'); Math.random = () => .9; __bubby.guess(1);`, 400],
  ['guess-wrong', base(), idle + `__bubby.startGame('guess'); Math.random = () => .9; __bubby.guess(-1);`, 400],
  ['guess-done', adult('radiant'), idle + `__bubby.startGame('guess'); Object.assign(__bubby.G, { round: 5, score: 4, phase: 'done', t: 0 }); __bubby.renderGame();`, 300],
  ['catch-play', adult('daisy'), idle + `__bubby.startGame('catch');`, 3200],
  ['catch-bulb', base(), idle + `__bubby.startGame('catch');`, 3200],
  ['catch-stun', adult('daisy'), idle + `__bubby.startGame('catch'); __bubby.G.items.push({ x: 50, y: 20, vy: 30, kind: 'pebble', fx: 0 }); __bubby.G.spawn = 99;`, 950],
  ['catch-gold', adult('daisy'), idle + `__bubby.startGame('catch'); __bubby.G.items.push({ x: 50, y: 22, vy: 30, kind: 'gold', fx: 0 }); __bubby.G.spawn = 99;`, 900],
  ['catch-done', adult('daisy'), idle + `__bubby.startGame('catch'); Object.assign(__bubby.G, { left: .01, score: 22 });`, 400],
  ['pause', adult('radiant', { paused: true }), idle, 300],
  ['end-away', base({ ended: { kind: 'away', age: 400, stage: 'child', name: 'Bud', mistakes: 7, gen: 2 } }), '', 400],
  ['end-garden', base({ ended: { kind: 'garden', age: 1500, stage: 'senior', name: 'Elder Radiant', mistakes: 1, gen: 2 } }), '', 400],
  ['toast-long', adult('radiant'), idle + `__bubby.toast('Bubby blossomed into a Radiant Blossom!');`, 300],
  ['toast-bulb', base(), idle + `__bubby.toast('Bubby is calling: its tummy is empty');`, 300],
];

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(root, decodeURIComponent(req.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
      fs.readFile(p, (e, d) => { if (e) { rsp.writeHead(404); rsp.end(); return; } rsp.writeHead(200, { 'content-type': p.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); rsp.end(d); });
    }).listen(0, () => res(srv));
  });
}

(async () => {
  const srv = await serve();
  const url = `http://localhost:${srv.address().port}/index.html?debug`;
  const browser = await chromium.launch();
  const report = { label, errors: [], scroll: {}, overlaps: [] };
  fs.mkdirSync(out, { recursive: true });

  for (const [vpName, vp] of Object.entries(VIEWPORTS)) for (const scheme of SCHEMES) {
    const combo = `${vpName}-${scheme}`;
    fs.mkdirSync(path.join(out, combo), { recursive: true });
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, colorScheme: scheme, reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference' });
    const run = async (name, save, setup, ms, shoot) => {
      const page = await ctx.newPage();
      page.on('pageerror', e => report.errors.push(`${combo}/${name}: ${e.message}`));
      page.on('console', m => { if (m.type() === 'error') report.errors.push(`${combo}/${name}: console ${m.text()}`); });
      await page.clock.install({ time: new Date('2026-11-04T12:00:00Z') });
      await page.addInitScript(s => {
        let seed = 12345; Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
        localStorage.clear(); if (s) localStorage.setItem('bubby.save.v1', JSON.stringify(s));
      }, save);
      await page.goto(url, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.clock.runFor(100);
      if (setup) await page.evaluate(setup);
      if (ms === 'blink') {
        const has = await page.evaluate(() => !!(window.__bubby && __bubby.blinkNow));
        if (has) { await page.evaluate(() => __bubby.blinkNow()); await page.clock.runFor(40); }
        else { const now = await page.evaluate(() => performance.now() / 1000); await page.clock.runFor(Math.ceil(((3.4 - (now % 3.4)) + .03) * 1000)); }
      } else await page.clock.runFor(ms);
      await shoot(page);
      await page.close();
    };
    for (const [name, save, setup, ms] of STATES) {
      if (only && !only.test(name)) continue;
      await run(name, save, setup, ms, async page => {
        await page.locator('#device').screenshot({ path: path.join(out, combo, `${name}.png`) });
      });
    }
    if (!only) {
      // Full page shots + layout checks
      await run('page', adult('radiant', { poops: [{ t: 1 }] }), idle, 400, async page => {
        await page.screenshot({ path: path.join(out, combo, `_page.png`), fullPage: true });
        report.scroll[combo] = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
        report.overlaps.push(...(await page.evaluate(c => {
          const res = [], q = s => [...document.querySelectorAll(s)].filter(e => e.offsetParent || e.getClientRects().length);
          const rects = q('.hw, .hw .lbl, .under > *, .brand').map(e => [e, e.getBoundingClientRect()]);
          for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
            const [a, A] = rects[i], [b, B] = rects[j];
            if (a.contains(b) || b.contains(a)) continue;
            if (A.left < B.right - 1 && B.left < A.right - 1 && A.top < B.bottom - 1 && B.top < A.bottom - 1) res.push(`${c}: ${a.className || a.tagName} × ${b.className || b.tagName}`);
          }
          const small = q('.hw, .tile, .seg button, .chip').map(e => [e, e.getBoundingClientRect()]).filter(([, r]) => r.width < 44 || r.height < 44)
            .map(([e, r]) => `${c}: small target ${e.getAttribute('aria-label') || e.textContent.trim()} ${r.width.toFixed(0)}×${r.height.toFixed(0)}`);
          return res.concat(small);
        }, combo)));
      });
    }
    await ctx.close();
  }
  await browser.close(); srv.close();
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ errors: report.errors.length, scroll: report.scroll, overlaps: report.overlaps.length }, null, 1));
})();
