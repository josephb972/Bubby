// Unit tests for the shop logic (extension/core/shop.js). Usage: node tools/test-shop.mjs
import * as Shop from '../extension/core/shop.js';
import * as Rules from '../extension/core/rules.js';

let failed = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}`); if (!ok) failed++; };
const T0 = new Date('2026-11-24T10:00:00').getTime(), H = 3600e3;

// New wardrobe
let m = Shop.freshMeta(T0);
check(m.petals === Shop.EARN.welcome, `new player gets the welcome grant (${m.petals})`);
check(Shop.SIZES.every(s => Shop.owns(m, 'petalbow', s)) && m.equip.head === 'petalbow', 'starter bow owned in all four sizes and worn');
check(Shop.outfitFor(m, 'seed').head === null, 'the seed wears nothing');
check(Shop.outfitFor(m, 'senior').head === 'petalbow', 'the bow fits an Elder too');
const vet = Rules.fresh(); vet.stats.wins = 80;
check(Shop.freshMeta(T0, vet).petals === Shop.EARN.welcome + Shop.EARN.pastWinCap, 'returning player grant is capped');

// Prices by size
check(Shop.priceOf(m, 'beanie', 'S') === 16 && Shop.priceOf(m, 'beanie', 'M') === 26 && Shop.priceOf(m, 'beanie', 'L') === 40 && Shop.priceOf(m, 'beanie', 'XL') === 40, 'common prices 16 / 26 / 40 / 40');
check(Shop.priceOf(m, 'wizard', 'L') === 150 && Shop.priceOf(m, 'lantern') === 80, 'epic and decor prices');

// Buying a size, wearing, outgrowing
let r = Shop.buy(m, 'beanie', 'S', T0);
check(r.ok && m.petals === 14 && Shop.owns(m, 'beanie', 'S') && !Shop.owns(m, 'beanie', 'M'), 'buy the Bulb-size beanie (only that size)');
check(!Shop.buy(m, 'beanie', 'S', T0).ok, 'can’t buy the same size twice');
check(!Shop.buy(m, 'wizard', 'L', T0).ok && Shop.canBuy(m, 'wizard', 'L').short === 136, 'can’t afford: says how many more Petals');
check(!Shop.buy(m, 'beanie', 'XXL', T0).ok, 'unknown size refused');
Shop.wear(m, 'beanie');
check(Shop.outfitFor(m, 'baby').head === 'beanie', 'Bulb wears the beanie');
check(Shop.outfitFor(m, 'child').head === null && Shop.missingFor(m, 'child')[0] === 'beanie', 'Bud has outgrown it (no broken clothes, just flagged)');
check(!Shop.wear(m, 'crown'), 'can’t wear what you don’t own');

// Undo
m.petals += 50;
const before = m.petals;
Shop.buy(m, 'shades', 'S', T0); Shop.wear(m, 'shades');
check(Shop.undoBuy(m, T0 + 9000).ok && m.petals === before && !Shop.ownsAny(m, 'shades') && m.equip.face === null, 'undo within 10 s: refund and nothing left worn');
Shop.buy(m, 'shades', 'S', T0);
check(!Shop.undoBuy(m, T0 + 11000).ok && Shop.owns(m, 'shades', 'S'), 'no undo after 10 s');

// Decor
m.petals += 200;
check(Shop.buy(m, 'lantern', 'L', T0).ok && Shop.owns(m, 'lantern'), 'decor has no sizes');
check(Shop.place(m, 'lantern') && m.home.centre === 'lantern', 'place the lantern');
Shop.clearSlot(m, 'centre');
check(m.home.centre === 'pot', 'clearing a slot brings back the free default');
check(!Shop.place(m, 'pond'), 'can’t place what you don’t own');

// Earning: daily caps and clock guard
m = Shop.freshMeta(T0);
const g = [1, 2, 3, 4].map(() => Shop.earnGame(m, 'catch', 30, true, false, T0).petals);
check(g.join() === '12,12,12,0', `3 paid games a day, capped at 12 (${g.join()})`);
check(Shop.earnGame(m, 'catch', 4, true, true, T0).petals === Shop.EARN.newBest, 'a new best still pays after the cap');
check(Shop.earnGame(m, 'guess', 2, false, false, T0 + 24 * H).petals === 0 && m.earned.games === 1, 'a lost Which way? pays nothing but uses a play');
check(Shop.earnCare(m, T0 + 24 * H) === 5 && Shop.earnCare(m, T0 + 25 * H) === 0, 'first care of the day pays once');
check(Shop.earnGame(m, 'catch', 20, true, false, T0 - 48 * H).petals === 0, 'clock set backwards: no Petals');
check(Shop.earnGame(m, 'catch', 2, true, false, T0 + 48 * H).petals === 1, 'a poor catch still pays 1');

// Life milestones, claimed once
const S = Rules.fresh(1, { pace: 'quick' }, T0);
m = Shop.freshMeta(T0, S);
Rules.evolve(S, 'baby', T0); Rules.evolve(S, 'child', T0);
let c = Shop.claimLife(m, S, T0);
check(c.petals === 2 * Shop.EARN.evolve, `two evolutions pay ${c.petals}`);
check(Shop.claimLife(m, S, T0).petals === 0, 'claiming again pays nothing');
const S2 = Rules.fresh(2, { pace: 'quick' }, T0 + 1000);
check(Shop.claimLife(m, S2, T0).petals === 0 && m.claim.born === S2.born, 'a new life starts a new claim');
S2.ended = {}; S2.evSeq++; S2.events.push({ id: S2.evSeq, type: 'end', kind: 'garden' });
check(Shop.claimLife(m, S2, T0).petals === Shop.EARN.garden, 'a full life pays the garden bonus');

// A save that went through storage (JSON + migrate) must keep its claim marker and clock guard
{
  const S3 = Rules.fresh(1, { pace: 'quick' }, Date.now());
  const m3 = Shop.freshMeta(Date.now(), S3);
  Rules.evolve(S3, 'baby', Date.now());
  Shop.claimLife(m3, S3); Shop.earnCare(m3, Date.now());
  const again = Shop.migrateMeta(JSON.parse(JSON.stringify(m3)));
  check(again.claim.born === S3.born && again.lastEarnAt === m3.lastEarnAt, 'timestamps survive saving and loading');
  check(Shop.claimLife(again, S3).petals === 0, 'reloading never pays a milestone twice');
}

// Migration and backup codes
check(Shop.migrateMeta(null) === null && Shop.migrateMeta({ v: 9 }) === null && Shop.migrateMeta('junk') === null, 'unusable saves are rejected');
const odd = Shop.migrateMeta({ v: 1, petals: -5, owned: { future_hat: ['L'], pond: 'x' }, equip: { head: 'future_hat' }, home: { centre: 'pond', ground: 'snow' } });
check(odd.petals === 0 && Shop.owns(odd, 'future_hat', 'L') && odd.home.centre === 'pot' && odd.home.ground === 'meadow', 'bad values fixed, unknown items kept, unowned decor reset');
check(Shop.outfitFor(odd, 'adult').head === null, 'unknown items are never drawn');
m = Shop.freshMeta(T0); Shop.buy(m, 'tee', 'M', T0); Shop.wear(m, 'tee');
const code = Shop.exportCode(m), back = Shop.importCode(code, Shop.freshMeta(T0));
check(back.ok && back.meta.petals === m.petals && Shop.owns(back.meta, 'tee', 'M') && back.meta.equip.body === 'tee', 'backup code round-trips');
check(!Shop.importCode(code.slice(0, -3) + 'zzz').ok && !Shop.importCode('hello').ok, 'damaged codes are refused');

console.log(failed ? `\n${failed} check(s) failed` : '\nAll shop checks passed');
process.exit(failed ? 1 : 0);
