// Clothes and garden decor (1.3.0): the catalogue, sizes, prices in points, and what Bubby wears. Pure logic, no DOM.
// Cosmetic only: nothing here changes hunger, happiness, illness or growing up (the care rules are in core/rules.js).
//
// Saved in S.wardrobe, which is in META_KEYS, so it carries over to every new seed like the points and the Bubbydex.
// Clothes come in four sizes, one per body. A size is bought once and fits every future Bubby at that stage, of any race.

export const SIZES = ['S', 'M', 'L', 'XL'];
export const SIZE_OF = { baby: 'S', child: 'M', adult: 'L', senior: 'XL' };
export const SIZE_STAGE = { S: 'baby', M: 'child', L: 'adult', XL: 'senior' };
export const SIZE_NAME = { S: 'Bulb', M: 'Bud', L: 'Blossom', XL: 'Elder' };
export const SIZE_MULT = { S: .4, M: .65, L: 1, XL: 1 };
// Optional: a fraction off a size when you already own the same item in another size. 0 = off.
export const SIZE_UP_DISCOUNT = 0;
export const RARITY = { gift: { label: 'Gift', base: 0 }, common: { label: 'Common', base: 60 }, rare: { label: 'Rare', base: 120 }, epic: { label: 'Epic', base: 200 } };
export const WEAR_SLOTS = ['head', 'face', 'neck', 'body'];
export const HOME_SLOTS = ['ground', 'sky', 'back', 'centre', 'floor', 'path', 'ambient'];
export const SLOT_NAME = { head: 'Head', face: 'Face', neck: 'Neck', body: 'Body', ground: 'Lawn', sky: 'Sky', back: 'Back corner', centre: 'Centrepiece', floor: 'Front corner', path: 'Path', ambient: 'Ambience' };

export const CATALOG = [
  // Clothes (art: art/wardrobe.js)
  { id: 'petalbow', kind: 'wear', slot: 'head', rarity: 'gift', name: 'Petal bow', blurb: 'A welcome gift, in every size.' },
  { id: 'beanie', kind: 'wear', slot: 'head', rarity: 'common', name: 'Beanie', blurb: 'Striped knit cap with a pompom.' },
  { id: 'crown', kind: 'wear', slot: 'head', rarity: 'rare', name: 'Little crown', blurb: 'For garden royalty.' },
  { id: 'wizard', kind: 'wear', slot: 'head', rarity: 'epic', name: 'Wizard hat', blurb: 'Tall, starry and a bit bendy.' },
  { id: 'shades', kind: 'wear', slot: 'face', rarity: 'common', name: 'Sunglasses', blurb: 'Too cool for the garden.' },
  { id: 'hearts', kind: 'wear', slot: 'face', rarity: 'rare', name: 'Heart glasses', blurb: 'Everything looks lovely.' },
  { id: 'bowtie', kind: 'wear', slot: 'neck', rarity: 'common', name: 'Bow tie', blurb: 'Dapper for any occasion.' },
  { id: 'scarf', kind: 'wear', slot: 'neck', rarity: 'common', name: 'Cosy scarf', blurb: 'Striped, with a loose end.' },
  { id: 'tee', kind: 'wear', slot: 'body', rarity: 'common', name: 'Striped tee', blurb: 'A classic for every day.' },
  { id: 'overalls', kind: 'wear', slot: 'body', rarity: 'rare', name: 'Overalls', blurb: 'Ready for garden work.' },
  { id: 'sweater', kind: 'wear', slot: 'body', rarity: 'rare', name: 'Heart sweater', blurb: 'Soft knit with a heart.' },
  // Garden (art: art/decor.js). One item per slot.
  { id: 'meadow', kind: 'home', slot: 'ground', price: 0, name: 'Meadow', blurb: 'Bubby’s usual lawn.' },
  { id: 'clover', kind: 'home', slot: 'ground', price: 150, name: 'Clover lawn', blurb: 'Deep green, dotted with clover.' },
  { id: 'snow', kind: 'home', slot: 'ground', price: 150, name: 'Snowy lawn', blurb: 'Fresh snow, still soft.' },
  { id: 'autumn', kind: 'home', slot: 'ground', price: 150, name: 'Autumn lawn', blurb: 'Golden grass and fallen leaves.' },
  { id: 'bunting', kind: 'home', slot: 'sky', price: 80, name: 'Bunting', blurb: 'Party flags across the garden.' },
  { id: 'tree', kind: 'home', slot: 'back', price: 180, name: 'Apple tree', blurb: 'Shady, with red apples.' },
  { id: 'sunflowers', kind: 'home', slot: 'back', price: 120, name: 'Sunflowers', blurb: 'Three tall friends.' },
  { id: 'mushroom', kind: 'home', slot: 'back', price: 120, name: 'Mushroom house', blurb: 'Someone tiny lives here.' },
  { id: 'pot', kind: 'home', slot: 'centre', price: 0, name: 'Flower pot', blurb: 'The daisy that was always there.' },
  { id: 'lantern', kind: 'home', slot: 'centre', price: 120, name: 'Lantern', blurb: 'Glows when the lights are off.' },
  { id: 'gnome', kind: 'home', slot: 'centre', price: 120, name: 'Garden gnome', blurb: 'Keeps an eye on things.' },
  { id: 'birdbath', kind: 'home', slot: 'centre', price: 120, name: 'Birdbath', blurb: 'A splash for passing birds.' },
  { id: 'flowerbed', kind: 'home', slot: 'floor', price: 80, name: 'Flower patch', blurb: 'Tulips in the corner.' },
  { id: 'pond', kind: 'home', slot: 'floor', price: 140, name: 'Lily pond', blurb: 'A little pond with a lily pad.' },
  { id: 'stones', kind: 'home', slot: 'path', price: 80, name: 'Stepping stones', blurb: 'A path along the front.' },
  { id: 'butterflies', kind: 'home', slot: 'ambient', price: 180, name: 'Butterflies', blurb: 'Two butterflies drift by.' },
  { id: 'fireflies', kind: 'home', slot: 'ambient', price: 180, name: 'Fireflies', blurb: 'Twinkle when the lights are off.' },
  { id: 'petals', kind: 'home', slot: 'ambient', price: 180, name: 'Petal breeze', blurb: 'Pink petals floating down.' },
];
export const ITEM = Object.fromEntries(CATALOG.map(i => [i.id, i]));
export const FREE_HOME = { ground: 'meadow', centre: 'pot' };
export const UNDO_MS = 10000;

/* ---------- The wardrobe (S.wardrobe) ---------- */
export function freshWardrobe() {
  return {
    owned: { petalbow: [...SIZES], meadow: ['*'], pot: ['*'] },
    equip: { head: 'petalbow', face: null, neck: null, body: null },
    home: { ground: 'meadow', sky: null, back: null, centre: 'pot', floor: null, path: null, ambient: null },
    undo: null, news: { gift: true },
  };
}
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
// Accepts anything (a missing or damaged wardrobe) and returns a valid one. Unknown item ids are kept (a newer
// version's items come back after a downgrade and an update) but never drawn.
export function fixWardrobe(o) {
  const w = freshWardrobe();
  if (!isObj(o)) return w;
  w.news = isObj(o.news) ? o.news : {};
  if (isObj(o.owned)) for (const [id, sz] of Object.entries(o.owned)) {
    if (Array.isArray(sz)) w.owned[id] = [...new Set([...(w.owned[id] || []), ...sz.filter(s => typeof s === 'string')])];
  }
  for (const k of WEAR_SLOTS) w.equip[k] = isObj(o.equip) ? (typeof o.equip[k] === 'string' ? o.equip[k] : null) : w.equip[k];
  for (const k of HOME_SLOTS) {
    const v = isObj(o.home) ? o.home[k] : undefined;
    w.home[k] = typeof v === 'string' && (w.owned[v] || []).length ? v : (FREE_HOME[k] || null);
  }
  w.undo = isObj(o.undo) && typeof o.undo.id === 'string' ? o.undo : null;
  return w;
}
const W = S => (S.wardrobe = S.wardrobe && S.wardrobe.owned ? S.wardrobe : fixWardrobe(S.wardrobe));

/* ---------- Owning, prices, buying (paid with S.points) ---------- */
export const owns = (S, id, size = '*') => { const w = W(S); return !!(w.owned[id] && w.owned[id].includes(size)); };
export const ownsAny = (S, id) => { const w = W(S); return !!(w.owned[id] && w.owned[id].length); };
export function priceOf(S, id, size) {
  const it = ITEM[id]; if (!it) return Infinity;
  if (it.kind === 'home') return it.price;
  let p = Math.round(RARITY[it.rarity].base * SIZE_MULT[size]);
  if (SIZE_UP_DISCOUNT && ownsAny(S, id)) p = Math.round(p * (1 - SIZE_UP_DISCOUNT));
  return p;
}
export function canBuy(S, id, size = '*') {
  const it = ITEM[id];
  if (!it) return { ok: false, msg: 'Unknown item' };
  if (it.kind === 'home') size = '*';
  else if (!SIZES.includes(size)) return { ok: false, msg: 'Pick a size' };
  if (owns(S, id, size)) return { ok: false, msg: 'Already yours' };
  const p = priceOf(S, id, size);
  if ((S.points || 0) < p) return { ok: false, short: p - (S.points || 0), msg: `${p - (S.points || 0)} more points needed` };
  return { ok: true, price: p };
}
export function buyCosmetic(S, id, size = '*', now = Date.now()) {
  const it = ITEM[id], w = W(S);
  if (it && it.kind === 'home') size = '*';
  const c = canBuy(S, id, size);
  if (!c.ok) return c;
  S.points -= c.price;
  (w.owned[id] = w.owned[id] || []).push(size);
  w.undo = { id, size, price: c.price, until: now + UNDO_MS, equipBefore: { ...w.equip }, homeBefore: { ...w.home } };
  return { ok: true, price: c.price, msg: `Bought ${it.name}${it.kind === 'wear' ? ` (${SIZE_NAME[size]} size)` : ''}` };
}
// Full refund within UNDO_MS of buying, and whatever was worn or placed before comes back.
export function undoBuy(S, now = Date.now()) {
  const w = W(S), u = w.undo;
  if (!u || now > u.until) { w.undo = null; return { ok: false, msg: 'Too late to undo' }; }
  w.owned[u.id] = (w.owned[u.id] || []).filter(s => s !== u.size);
  if (!w.owned[u.id].length) delete w.owned[u.id];
  S.points += u.price;
  w.equip = { ...u.equipBefore }; w.home = { ...u.homeBefore };
  w.undo = null;
  return { ok: true, msg: 'Purchase undone, points back' };
}

/* ---------- Wearing and placing ---------- */
export function wear(S, id) { const it = ITEM[id]; if (!it || it.kind !== 'wear' || !ownsAny(S, id)) return false; W(S).equip[it.slot] = id; return true; }
export function takeOff(S, slot) { const w = W(S); if (slot in w.equip) w.equip[slot] = null; }
export function place(S, id) { const it = ITEM[id]; if (!it || it.kind !== 'home' || !owns(S, id)) return false; W(S).home[it.slot] = id; return true; }
export function clearSlot(S, slot) { const w = W(S); if (slot in w.home) w.home[slot] = FREE_HOME[slot] || null; }

// What Bubby actually wears at a stage: what's chosen and owned in that size. Takes a wardrobe (S.wardrobe). The seed
// wears nothing.
export function outfitFor(w, stage) {
  const size = SIZE_OF[stage], f = { head: null, face: null, neck: null, body: null };
  if (!w || !w.owned || !size) return f;
  for (const k of WEAR_SLOTS) { const id = w.equip[k]; if (id && ITEM[id] && w.owned[id] && w.owned[id].includes(size)) f[k] = id; }
  return f;
}
// Chosen items Bubby can't wear at this stage because that size isn't owned.
export function missingFor(w, stage) {
  const size = SIZE_OF[stage];
  if (!w || !w.owned || !size) return [];
  return WEAR_SLOTS.map(k => w.equip[k]).filter(id => id && ITEM[id] && !(w.owned[id] || []).includes(size));
}
// Items worn at the old stage that the new stage doesn't have in its size (they pop off when Bubby grows).
export function outgrown(w, from, to) {
  const a = outfitFor(w, from), b = outfitFor(w, to);
  return WEAR_SLOTS.filter(k => a[k] && !b[k]).map(k => a[k]);
}
