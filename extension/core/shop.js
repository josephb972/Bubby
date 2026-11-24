// Bubby's shop: catalogue, prices, the Petal wallet and what Bubby wears. Pure logic, no DOM, no storage
// (core/meta.js saves it). Everything here is cosmetic: nothing changes the care game in core/rules.js.
//
// The wardrobe lives in its own save ("meta"), separate from Bubby's, so it survives a new seed and "Start over".
// Clothes come in four sizes, one per body. A size is bought once and fits every future Bubby at that stage.

export const SIZES = ['S', 'M', 'L', 'XL'];
export const SIZE_OF = { baby: 'S', child: 'M', adult: 'L', senior: 'XL' };
export const SIZE_STAGE = { S: 'baby', M: 'child', L: 'adult', XL: 'senior' };
export const SIZE_NAME = { S: 'Bulb', M: 'Bud', L: 'Blossom', XL: 'Elder' };
export const SIZE_MULT = { S: .4, M: .65, L: 1, XL: 1 };
// Optional (plan D7): fraction off a size when you already own the same item in another size. 0 = off.
export const SIZE_UP_DISCOUNT = 0;
export const RARITY = { gift: { label: 'Gift', base: 0 }, common: { label: 'Common', base: 40 }, rare: { label: 'Rare', base: 80 }, epic: { label: 'Epic', base: 150 } };
export const WEAR_SLOTS = ['head', 'face', 'neck', 'body'];
export const HOME_SLOTS = ['ground', 'sky', 'back', 'centre', 'floor', 'path', 'ambient'];
export const SLOT_NAME = { head: 'Head', face: 'Face', neck: 'Neck', body: 'Body', ground: 'Ground', sky: 'Sky', back: 'Back', centre: 'Centrepiece', floor: 'Corner', path: 'Path', ambient: 'Ambience' };

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
  { id: 'clover', kind: 'home', slot: 'ground', price: 100, name: 'Clover lawn', blurb: 'Deep green, dotted with clover.' },
  { id: 'snow', kind: 'home', slot: 'ground', price: 100, name: 'Snowy lawn', blurb: 'Fresh snow, still soft.' },
  { id: 'autumn', kind: 'home', slot: 'ground', price: 100, name: 'Autumn lawn', blurb: 'Golden grass and fallen leaves.' },
  { id: 'bunting', kind: 'home', slot: 'sky', price: 50, name: 'Bunting', blurb: 'Party flags across the garden.' },
  { id: 'tree', kind: 'home', slot: 'back', price: 120, name: 'Apple tree', blurb: 'Shady, with red apples.' },
  { id: 'sunflowers', kind: 'home', slot: 'back', price: 80, name: 'Sunflowers', blurb: 'Three tall friends.' },
  { id: 'mushroom', kind: 'home', slot: 'back', price: 80, name: 'Mushroom house', blurb: 'Someone tiny lives here.' },
  { id: 'pot', kind: 'home', slot: 'centre', price: 0, name: 'Flower pot', blurb: 'The daisy that was always there.' },
  { id: 'lantern', kind: 'home', slot: 'centre', price: 80, name: 'Lantern', blurb: 'Glows when the lights are off.' },
  { id: 'gnome', kind: 'home', slot: 'centre', price: 80, name: 'Garden gnome', blurb: 'Keeps an eye on things.' },
  { id: 'birdbath', kind: 'home', slot: 'centre', price: 80, name: 'Birdbath', blurb: 'A splash for passing birds.' },
  { id: 'flowerbed', kind: 'home', slot: 'floor', price: 50, name: 'Flower patch', blurb: 'Tulips in the corner.' },
  { id: 'pond', kind: 'home', slot: 'floor', price: 90, name: 'Lily pond', blurb: 'A little pond with a lily pad.' },
  { id: 'stones', kind: 'home', slot: 'path', price: 50, name: 'Stepping stones', blurb: 'A path along the front.' },
  { id: 'butterflies', kind: 'home', slot: 'ambient', price: 120, name: 'Butterflies', blurb: 'Two butterflies drift by.' },
  { id: 'fireflies', kind: 'home', slot: 'ambient', price: 120, name: 'Fireflies', blurb: 'Twinkle when the lights are off.' },
  { id: 'petals', kind: 'home', slot: 'ambient', price: 120, name: 'Petal breeze', blurb: 'Pink petals floating down.' },
];
export const ITEM = Object.fromEntries(CATALOG.map(i => [i.id, i]));
export const FREE_HOME = { ground: 'meadow', centre: 'pot' };

// Earning rules (plan section 4.1). Tuned with tools/sim-economy.mjs.
export const EARN = {
  welcome: 30,                       // every new wardrobe
  perPastWin: 3, pastWinCap: 150,    // existing players: thanks for the games already played
  paidGamesPerDay: 3, catchMax: 12, guessWin: 3,
  newBest: 5, firstCare: 5,
  evolve: 20, garden: 60, away: 15,
};
export const UNDO_MS = 10000;
const CLOCK_SLACK = 5 * 60 * 1000;

/* ---------- The meta save ---------- */
export function freshMeta(now = Date.now(), S = null) {
  const wins = S && S.stats ? S.stats.wins || 0 : 0;
  const grant = EARN.welcome + Math.min(EARN.pastWinCap, wins * EARN.perPastWin);
  return {
    v: 1, rev: 0, petals: grant, lifetime: grant,
    owned: { petalbow: [...SIZES], meadow: ['*'], pot: ['*'] },
    equip: { head: 'petalbow', face: null, neck: null, body: null },
    home: { ground: 'meadow', sky: null, back: null, centre: 'pot', floor: null, path: null, ambient: null },
    // Events of the current life already paid out (so reopening never pays twice, and old events never pay).
    claim: { born: S ? S.born : 0, seq: S ? S.evSeq : 0 },
    earned: { day: '', games: 0, care: false },
    lastEarnAt: 0, undo: null, news: { gift: true, returning: wins > 0 ? grant : 0 }, seen: {},
  };
}

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
// Accepts anything (an old save, a corrupt one, a backup code) and returns a valid meta, or null if unusable.
// Unknown item ids are kept, so a newer version's items come back after a downgrade and an update.
export function migrateMeta(o) {
  if (!isObj(o) || o.v !== 1) return null;
  const m = freshMeta(0);
  // Whole numbers ≥ 0. Petals are capped; timestamps and counters are not (a cap there would break claims and the clock guard).
  const int = (v, d) => Number.isFinite(v) && v >= 0 ? Math.floor(v) : d;
  const coins = (v, d) => Math.min(1e7, int(v, d));
  m.rev = int(o.rev, 0); m.petals = coins(o.petals, 0); m.lifetime = coins(o.lifetime, m.petals);
  if (isObj(o.owned)) for (const [id, sz] of Object.entries(o.owned)) {
    if (Array.isArray(sz)) m.owned[id] = [...new Set([...(m.owned[id] || []), ...sz.filter(s => typeof s === 'string')])];
  }
  for (const k of WEAR_SLOTS) m.equip[k] = isObj(o.equip) && typeof o.equip[k] === 'string' ? o.equip[k] : (isObj(o.equip) ? null : m.equip[k]);
  for (const k of HOME_SLOTS) {
    const v = isObj(o.home) ? o.home[k] : undefined;
    m.home[k] = typeof v === 'string' && (m.owned[v] || []).length ? v : (FREE_HOME[k] || null);
  }
  if (isObj(o.claim)) m.claim = { born: int(o.claim.born, 0), seq: int(o.claim.seq, 0) };
  if (isObj(o.earned)) m.earned = { day: typeof o.earned.day === 'string' ? o.earned.day : '', games: int(o.earned.games, 0), care: !!o.earned.care };
  m.lastEarnAt = int(o.lastEarnAt, 0);
  m.undo = isObj(o.undo) && typeof o.undo.id === 'string' ? o.undo : null;
  m.news = isObj(o.news) ? o.news : {};
  m.seen = isObj(o.seen) ? o.seen : {};
  return m;
}

/* ---------- Owning, prices, buying ---------- */
export const owns = (m, id, size = '*') => !!(m.owned[id] && m.owned[id].includes(size));
export const ownsAny = (m, id) => !!(m.owned[id] && m.owned[id].length);
export function priceOf(m, id, size) {
  const it = ITEM[id]; if (!it) return Infinity;
  if (it.kind === 'home') return it.price;
  let p = Math.round(RARITY[it.rarity].base * SIZE_MULT[size]);
  if (SIZE_UP_DISCOUNT && ownsAny(m, id)) p = Math.round(p * (1 - SIZE_UP_DISCOUNT));
  return p;
}
export function canBuy(m, id, size = '*') {
  const it = ITEM[id];
  if (!it) return { ok: false, msg: 'Unknown item' };
  if (it.kind === 'wear' && !SIZES.includes(size)) return { ok: false, msg: 'Pick a size' };
  if (it.kind === 'home') size = '*';
  if (owns(m, id, size)) return { ok: false, msg: 'Already yours' };
  const p = priceOf(m, id, size);
  if (m.petals < p) return { ok: false, short: p - m.petals, msg: `${p - m.petals} more Petals needed` };
  return { ok: true, price: p };
}
export function buy(m, id, size = '*', now = Date.now()) {
  const it = ITEM[id];
  if (it && it.kind === 'home') size = '*';
  const c = canBuy(m, id, size);
  if (!c.ok) return c;
  m.petals -= c.price;
  (m.owned[id] = m.owned[id] || []).push(size);
  m.undo = { id, size, price: c.price, until: now + UNDO_MS, equipBefore: { ...m.equip }, homeBefore: { ...m.home } };
  return { ok: true, price: c.price, msg: `Bought ${it.name}${it.kind === 'wear' ? ` (${SIZE_NAME[size]} size)` : ''}` };
}
// Full refund within UNDO_MS of buying, and whatever was worn or placed before comes back.
export function undoBuy(m, now = Date.now()) {
  const u = m.undo;
  if (!u || now > u.until) { m.undo = null; return { ok: false, msg: 'Too late to undo' }; }
  m.owned[u.id] = (m.owned[u.id] || []).filter(s => s !== u.size);
  if (!m.owned[u.id].length) delete m.owned[u.id];
  m.petals += u.price;
  m.equip = { ...u.equipBefore }; m.home = { ...u.homeBefore };
  m.undo = null;
  return { ok: true, msg: 'Purchase undone, Petals back' };
}

/* ---------- Wearing and placing ---------- */
export function wear(m, id) {
  const it = ITEM[id];
  if (!it || it.kind !== 'wear' || !ownsAny(m, id)) return false;
  m.equip[it.slot] = id; return true;
}
export function takeOff(m, slot) { if (slot in m.equip) m.equip[slot] = null; }
export function place(m, id) {
  const it = ITEM[id];
  if (!it || it.kind !== 'home' || !owns(m, id)) return false;
  m.home[it.slot] = id; return true;
}
export function clearSlot(m, slot) { if (slot in m.home) m.home[slot] = FREE_HOME[slot] || null; }

// What Bubby actually wears at a stage: equipped items it owns in that size. The seed wears nothing.
export function outfitFor(m, stage) {
  const size = SIZE_OF[stage], f = { head: null, face: null, neck: null, body: null };
  if (!m || !size) return f;
  for (const k of WEAR_SLOTS) { const id = m.equip[k]; if (id && ITEM[id] && owns(m, id, size)) f[k] = id; }
  return f;
}
// Equipped items Bubby can't wear at this stage because that size isn't owned.
export function missingFor(m, stage) {
  const size = SIZE_OF[stage];
  if (!m || !size) return [];
  return WEAR_SLOTS.map(k => m.equip[k]).filter(id => id && ITEM[id] && !owns(m, id, size));
}

/* ---------- Earning ---------- */
export function dayKey(ms) { const d = new Date(ms); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
// Rolls the daily counters over; refuses to pay if the clock went backwards (so changing the date can't farm Petals).
function today(m, now) {
  if (m.lastEarnAt && now + CLOCK_SLACK < m.lastEarnAt) return false;
  const k = dayKey(now);
  if (m.earned.day !== k) m.earned = { day: k, games: 0, care: false };
  return true;
}
function pay(m, n, now) {
  if (n <= 0) return 0;
  m.petals += n; m.lifetime += n; m.lastEarnAt = Math.max(m.lastEarnAt, now);
  return n;
}
// After a minigame. Returns the Petals earned (0 once today's paid games are used up).
export function earnGame(m, kind, score, won, newBest, now = Date.now()) {
  if (!today(m, now)) return { petals: 0, capped: false };
  let n = 0, capped = false;
  if (m.earned.games < EARN.paidGamesPerDay) {
    m.earned.games++;
    n = kind === 'catch' ? Math.max(1, Math.min(EARN.catchMax, Math.round(score / 2))) : (won ? EARN.guessWin : 0);
  } else capped = true;
  if (newBest) n += EARN.newBest;
  return { petals: pay(m, n, now), capped };
}
// The first real care action of the day.
export function earnCare(m, now = Date.now()) {
  if (!today(m, now) || m.earned.care) return 0;
  m.earned.care = true;
  return pay(m, EARN.firstCare, now);
}
// Milestones from Bubby's life (evolving, a full life, or moving away). Safe to call as often as you like.
export function claimLife(m, S, now = Date.now()) {
  if (m.claim.born !== S.born) m.claim = { born: S.born, seq: 0 };
  let n = 0;
  const lines = [];
  for (const e of S.events) {
    if (e.id <= m.claim.seq) continue;
    if (e.type === 'evolve') { n += EARN.evolve; lines.push(`+${EARN.evolve} for growing up`); }
    if (e.type === 'end') {
      const v = e.kind === 'garden' ? EARN.garden : EARN.away;
      n += v; lines.push(e.kind === 'garden' ? `+${v} for a full life` : `+${v} to start again`);
    }
  }
  m.claim.seq = Math.max(m.claim.seq, S.evSeq);
  m.petals += n; m.lifetime += n;
  return { petals: n, lines };
}

/* ---------- Backup code (chrome.storage.local is cleared when the extension is uninstalled) ---------- */
const crc = s => { let c = ~0; for (let i = 0; i < s.length; i++) { c ^= s.charCodeAt(i); for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; } return (~c >>> 0).toString(36); };
const b64 = s => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = s => atob(s.replace(/-/g, '+').replace(/_/g, '/'));
export function exportCode(m) {
  const body = b64(JSON.stringify({ p: m.petals, l: m.lifetime, o: m.owned, e: m.equip, h: m.home }));
  return `BUBBY1.${body}.${crc(body)}`;
}
// Returns { ok, meta } (a full meta built from the code, keeping the current life's claim marker) or { ok: false, msg }.
export function importCode(code, current) {
  const parts = String(code || '').trim().split('.');
  if (parts.length !== 3 || parts[0] !== 'BUBBY1') return { ok: false, msg: 'That doesn’t look like a wardrobe code' };
  if (crc(parts[1]) !== parts[2]) return { ok: false, msg: 'The code is incomplete. Copy all of it' };
  let d;
  try { d = JSON.parse(unb64(parts[1])); } catch (e) { return { ok: false, msg: 'The code is damaged' }; }
  const meta = migrateMeta({ v: 1, rev: (current ? current.rev : 0) + 1, petals: d.p, lifetime: d.l, owned: d.o, equip: d.e, home: d.h,
    claim: current ? current.claim : undefined, earned: current ? current.earned : undefined, lastEarnAt: current ? current.lastEarnAt : 0, seen: current ? current.seen : {} });
  return meta ? { ok: true, meta } : { ok: false, msg: 'The code is damaged' };
}
