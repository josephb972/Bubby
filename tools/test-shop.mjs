// Unit tests for clothes and garden decor (extension/core/shop.js) and how the wardrobe lives in the save.
// Usage: node tools/test-shop.mjs
import * as Shop from '../extension/core/shop.js';
import * as Rules from '../extension/core/rules.js';

let failed = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}`); if (!ok) failed++; };
const T0 = new Date('2026-11-24T10:00:00').getTime();

// A new Bubby
let S = Rules.fresh(1, undefined, T0);
check(Shop.SIZES.every(s => Shop.owns(S, 'petalbow', s)) && S.wardrobe.equip.head === 'petalbow', 'every new Bubby owns the gift bow in all four sizes, and wears it');
check(Rules.META_KEYS.includes('wardrobe'), 'the wardrobe is kept across lives (META_KEYS)');
check(Shop.outfitFor(S.wardrobe, 'seed').head === null && Shop.outfitFor(S.wardrobe, 'senior').head === 'petalbow', 'the egg wears nothing; the bow fits an Elder');

// Prices in points, by size
check(Shop.priceOf(S, 'beanie', 'S') === 24 && Shop.priceOf(S, 'beanie', 'M') === 39 && Shop.priceOf(S, 'beanie', 'L') === 60 && Shop.priceOf(S, 'beanie', 'XL') === 60, 'common clothes: 24 / 39 / 60 / 60 points');
check(Shop.priceOf(S, 'wizard', 'L') === 200 && Shop.priceOf(S, 'lantern') === 120, 'epic hat and decor prices');

// Buying, sizes, outgrowing
S.points = 100;
let r = Shop.buyCosmetic(S, 'beanie', 'M', T0);
check(r.ok && S.points === 61 && Shop.owns(S, 'beanie', 'M') && !Shop.owns(S, 'beanie', 'L'), 'buy the Bud size only, paid with points');
check(!Shop.buyCosmetic(S, 'beanie', 'M', T0).ok, 'the same size can’t be bought twice');
check(Shop.canBuy(S, 'wizard', 'L').short === 139, 'not enough points: says how many more');
check(!Shop.buyCosmetic(S, 'beanie', 'XXL', T0).ok, 'an unknown size is refused');
Shop.wear(S, 'beanie');
check(Shop.outfitFor(S.wardrobe, 'child').head === 'beanie' && Shop.outfitFor(S.wardrobe, 'adult').head === null, 'the Bud wears it; a Blossom has no size of it (nothing broken or stretched)');
check(Shop.outgrown(S.wardrobe, 'child', 'adult').join() === 'beanie' && Shop.missingFor(S.wardrobe, 'adult').join() === 'beanie', 'growing up: the beanie pops off and is flagged');
check(!Shop.wear(S, 'crown'), 'can’t wear what isn’t owned');

// Undo
S.points = 200;
const before = S.points;
Shop.buyCosmetic(S, 'shades', 'M', T0); Shop.wear(S, 'shades');
check(Shop.undoBuy(S, T0 + 9000).ok && S.points === before && !Shop.ownsAny(S, 'shades') && S.wardrobe.equip.face === null, 'undo within 10 s: points back, nothing left worn');
Shop.buyCosmetic(S, 'shades', 'M', T0);
check(!Shop.undoBuy(S, T0 + 11000).ok && Shop.owns(S, 'shades', 'M'), 'no undo after 10 s');

// Decor
S.points = 500;
check(Shop.buyCosmetic(S, 'lantern', 'L', T0).ok && Shop.owns(S, 'lantern') && Shop.place(S, 'lantern') && S.wardrobe.home.centre === 'lantern', 'decor has no sizes; bought and placed');
Shop.clearSlot(S, 'centre');
check(S.wardrobe.home.centre === 'pot', 'removing it brings back the flower pot');
check(!Shop.place(S, 'pond'), 'can’t place what isn’t owned');

// The wardrobe survives a new seed and "Start over", and old or damaged saves
S.points = 500; Shop.buyCosmetic(S, 'crown', 'L', T0); Shop.wear(S, 'crown');
const next = Rules.nextLife(S, 2, T0 + 1000);
check(next.wardrobe.equip.head === 'crown' && Shop.owns(next, 'crown', 'L') && next.points === S.points, 'a new seed keeps the clothes, the decor and the points');
const over = Rules.startOver(S, T0 + 2000);
check(Shop.owns(over, 'crown', 'L'), '"Start over" keeps the clothes');
const old = JSON.parse(JSON.stringify(Rules.fresh(1, undefined, T0))); delete old.wardrobe; old.points = 77;
const mig = Rules.migrate(old, T0);
check(mig && mig.wardrobe && mig.wardrobe.equip.head === 'petalbow' && mig.wardrobe.news.gift === true && mig.points === 77, 'a 1.2.0 save gets a wardrobe with the welcome gift, points untouched');
const junk = Shop.fixWardrobe({ owned: { future_hat: ['L'], pond: 'x' }, equip: { head: 'future_hat' }, home: { centre: 'pond', ground: 'snow' } });
check(junk.owned.future_hat && junk.home.centre === 'pot' && junk.home.ground === 'meadow' && Shop.outfitFor(junk, 'adult').head === null, 'damaged wardrobe repaired: unknown items kept but never drawn, unowned decor reset');
check(Shop.fixWardrobe('nonsense').equip.head === 'petalbow', 'an unreadable wardrobe becomes a fresh one');

console.log(failed ? `\n${failed} check(s) failed` : '\nAll shop checks passed');
process.exit(failed ? 1 : 0);
