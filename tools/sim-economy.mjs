// Economy check: simulated players earn Petals with the real rules (core/shop.js) and buy from the real catalogue.
// Usage: node tools/sim-economy.mjs
// Targets (docs/SHOP-PLAN.md 4.3): first purchase in the first session, something new every 0.5–3.5 days early on for a
// casual player who buys the cheapest thing first,
// nobody completes the catalogue in under 60 days, and an idle player still earns something.
import * as Shop from '../extension/core/shop.js';
import * as Rules from '../extension/core/rules.js';

const DAY = 86400e3, START = new Date('2026-11-02T09:00:00').getTime();
const LIFE = Rules.PACES.chill.dur, lifeDays = Object.values(LIFE).reduce((a, b) => a + b, 0) / 86400;

const fullCost = (() => { const m = Shop.freshMeta(0); let t = 0;
  for (const it of Shop.CATALOG) {
    if (it.kind === 'home') t += Shop.owns(m, it.id) ? 0 : it.price;
    else for (const s of Shop.SIZES) t += Shop.owns(m, it.id, s) ? 0 : Shop.priceOf(m, it.id, s);
  }
  return t; })();

function run(name, { games, score, care, days = 120 }) {
  const m = Shop.freshMeta(START);
  const buys = [];
  const shopping = now => {
    // A sensible shopper: the cheapest thing they don't have yet, as long as they can afford it.
    for (;;) {
      const opts = [];
      for (const it of Shop.CATALOG) {
        if (it.kind === 'home') { if (!Shop.owns(m, it.id)) opts.push([it.id, '*']); }
        else for (const s of Shop.SIZES) if (!Shop.owns(m, it.id, s)) opts.push([it.id, s]);
      }
      opts.sort((a, b) => Shop.priceOf(m, ...a) - Shop.priceOf(m, ...b));
      if (!opts.length || !Shop.buy(m, opts[0][0], opts[0][1], now).ok) return;
      m.undo = null;
      buys.push((now - START) / DAY);
    }
  };
  shopping(START); // the first session: the welcome grant
  for (let d = 0; d < days; d++) {
    const now = START + d * DAY + 10 * 3600e3;
    if (care) Shop.earnCare(m, now);
    for (let g = 0; g < games; g++) Shop.earnGame(m, 'catch', score, true, false, now + g * 60e3);
    // life milestones: 4 evolutions and a full life every ~10 days
    const inLife = d % Math.round(lifeDays);
    if ([0, 1, 3, 8].includes(inLife)) { m.petals += Shop.EARN.evolve; m.lifetime += Shop.EARN.evolve; }
    if (inLife === Math.round(lifeDays) - 1) { m.petals += Shop.EARN.garden; m.lifetime += Shop.EARN.garden; }
    shopping(now + 3600e3);
  }
  const done = buys.length && Shop.CATALOG.every(it => it.kind === 'home' ? Shop.owns(m, it.id) : Shop.SIZES.every(s => Shop.owns(m, it.id, s)));
  const perDay = m.lifetime / days, first = buys[0];
  const finished = done ? buys[buys.length - 1] : null;
  const gap = buys.length > 1 ? (buys[Math.min(buys.length - 1, 20)] - buys[0]) / Math.min(buys.length - 1, 20) : Infinity;
  console.log(`${name.padEnd(9)} ${perDay.toFixed(0).padStart(3)} Petals/day · first buy day ${first ?? '–'} · ${buys.length} buys in ${days} days · first 20 buys every ${gap.toFixed(1)} days · catalogue ${finished != null ? 'complete on day ' + finished.toFixed(0) : 'not complete'}`);
  return { perDay, first, gap, finished };
}

console.log(`Catalogue: ${Shop.CATALOG.length} items, ${fullCost} Petals for everything (every size of every garment)\n`);
const casual = run('casual', { games: 2, score: 12, care: true });
const hard = run('hardcore', { games: 5, score: 24, care: true });
const idle = run('idle', { games: 0, score: 0, care: false });
let failed = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}`); if (!ok) failed++; };
console.log('');
check(casual.first === 0 && hard.first === 0, 'first purchase is possible in the first session');
check(casual.gap >= .5 && casual.gap <= 3.5, `casual player can buy something new every 0.5–3.5 days early on (${casual.gap.toFixed(1)})`);
check(hard.finished == null || hard.finished >= 60, `nobody completes the catalogue in under 60 days (hardcore: ${hard.finished ? hard.finished.toFixed(0) : 'not yet'})`);
check(idle.perDay > 5, `an idle player still earns (${idle.perDay.toFixed(1)}/day from Bubby growing up)`);
process.exit(failed ? 1 : 0);
