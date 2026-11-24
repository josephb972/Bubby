// Bubby's passive behaviours: little things it does on its own while you watch. Pure data and logic, no DOM.
// Behaviours never change hunger, happiness or anything else; personality only changes how often each one shows.
// The animations live in popup/behave.js (same ids).
import { STAGE, pace, minutesToBed, dayNumber } from './rules.js';

// Boost tokens: temperament poles, quirk ids, races (content.js).
export const POLES = {
  P: ['energy', 1], S: ['energy', -1], F: ['appetite', 1], K: ['appetite', -1], B: ['manners', 1], W: ['manners', -1],
  V: ['nerve', 1], T: ['nerve', -1], H: ['health', 1], D: ['health', -1],
};
export const RARITY = { C: 10, U: 4, R: 1, L: 0.25 };
export const CATS = { play: 'Play', food: 'Food', garden: 'Garden', clean: 'Clean', calm: 'Calm', joke: 'Jokes', diva: 'Sass',
  brat: 'Bratty', nerve: 'Timid & brave', feel: 'Feelings', stage: 'Bulb & Elder', season: 'Special' };

// [id, category, rarity, boosts, what Bubby did (for "while you were away" and the journal), options]
// options: gate (only when a condition holds), st (stages it can happen in)
const LIST = [
  ['ball', 'play', 'C', 'P emberling', 'kicked a ball around'],
  ['headball', 'play', 'U', 'P showoff', 'bounced a ball on its head'],
  ['butterfly', 'play', 'C', 'P explorer', 'chased a butterfly'],
  ['rope', 'play', 'U', 'P', 'skipped with a jump rope'],
  ['dizzy', 'play', 'C', 'P jokester', 'spun around until it got dizzy'],
  ['bubbles', 'play', 'C', 'P dreamer', 'blew bubbles and popped them'],
  ['kite', 'play', 'R', 'P leafling', 'flew a kite'],
  ['peekaboo', 'play', 'U', 'P cuddle', 'played peekaboo behind a leaf'],
  ['cartwheel', 'play', 'U', 'P showoff', 'did a cartwheel'],
  ['yoyo', 'play', 'U', 'P jokester', 'got tangled up in a yo-yo'],

  ['apple', 'food', 'C', 'F leafling', 'munched an apple'],
  ['cookie', 'food', 'U', 'F B', 'sneaked a cookie when nobody was looking'],
  ['lolly', 'food', 'C', 'F', 'licked a lollipop'],
  ['cakedream', 'food', 'C', 'F dreamer', 'daydreamed about cake'],
  ['rumble', 'food', 'C', 'F', 'heard its tummy rumble', { gate: 'hungry' }],
  ['juice', 'food', 'C', 'F puddle', 'sipped a juice box'],
  ['berry', 'food', 'R', 'F P', 'caught a falling berry in its mouth'],
  ['sniff', 'food', 'U', 'F explorer', 'sniffed the air for something tasty'],
  ['veggie', 'food', 'C', 'K', 'poked at a veggie and pushed it away'],

  ['flower', 'garden', 'C', 'W leafling', 'picked a flower and smelled it'],
  ['water', 'garden', 'U', 'H neat puddle', 'watered itself with a watering can'],
  ['sunbathe', 'garden', 'C', 'leafling S', 'sunbathed with its leaves spread out'],
  ['ladybug', 'garden', 'C', 'explorer dreamer', 'watched a ladybug crawl by'],
  ['dig', 'garden', 'C', 'mudpie V mossback', 'dug a little hole'],
  ['plant', 'garden', 'U', 'W S', 'planted a tiny seed of its own'],
  ['dandelion', 'garden', 'U', 'dreamer', 'blew on a dandelion'],
  ['roll', 'garden', 'C', 'P mudpie', 'rolled around in the grass'],
  ['bird', 'garden', 'R', 'W cuddle', 'had a little bird land on its head'],
  ['clouds', 'garden', 'C', 'dreamer S', 'watched the clouds drift by'],

  ['bath', 'clean', 'U', 'neat puddle', 'took a bubble bath'],
  ['shower', 'clean', 'U', 'neat H puddle', 'showered under its own rain cloud'],
  ['teeth', 'clean', 'C', 'neat S', 'brushed its teeth'],
  ['sweep', 'clean', 'C', 'neat S', 'swept the garden'],
  ['comb', 'clean', 'C', 'diva neat', 'combed its leaves'],
  ['shake', 'clean', 'U', 'P mudpie', 'shook itself off like a puppy'],

  ['read', 'calm', 'C', 'S bookworm shroomling', 'read a book'],
  ['meditate', 'calm', 'U', 'S mossback', 'meditated and floated a little'],
  ['stretch', 'calm', 'C', 'S H', 'did some stretches'],
  ['diary', 'calm', 'U', 'S bookworm', 'wrote in its diary'],
  ['pushups', 'calm', 'C', 'H V', 'did push-ups'],
  ['ponder', 'calm', 'C', 'S bookworm', 'pondered something very deep'],
  ['telescope', 'calm', 'R', 'nightowl shroomling', 'looked at the sky through a telescope', { gate: 'evening' }],

  ['joke', 'joke', 'C', 'jokester', 'told itself a joke and laughed'],
  ['fakesneeze', 'joke', 'U', 'jokester B', 'faked a sneeze, then grinned'],
  ['silly', 'joke', 'C', 'jokester P', 'made a silly face at you'],
  ['disguise', 'joke', 'R', 'jokester', 'put on a fake moustache'],
  ['juggle', 'joke', 'U', 'jokester showoff', 'juggled seeds (and dropped them)'],
  ['statue', 'joke', 'U', 'jokester P', 'pretended to be a statue'],

  ['petalflip', 'diva', 'C', 'diva', 'flipped its leaves like hair'],
  ['shades', 'diva', 'U', 'diva showoff', 'posed in sunglasses'],
  ['mirror', 'diva', 'C', 'diva', 'admired itself in a mirror'],
  ['hmph', 'diva', 'C', 'diva B', 'said “hmph!” and turned its back on you'],
  ['foottap', 'diva', 'C', 'diva B', 'tapped its foot impatiently'],
  ['eyeroll', 'diva', 'U', 'diva emberling', 'rolled its eyes'],

  ['stomp', 'brat', 'C', 'B emberling', 'stomped around'],
  ['kickdirt', 'brat', 'C', 'B', 'kicked the dirt'],
  ['raspberry', 'brat', 'U', 'B jokester', 'blew a raspberry'],
  ['sulk', 'brat', 'C', 'B', 'sulked for no reason'],
  ['throwtoy', 'brat', 'U', 'B P', 'threw its toy, then wanted it back'],

  ['startle', 'nerve', 'C', 'T shroomling', 'got startled by a falling leaf'],
  ['hidebug', 'nerve', 'C', 'T', 'hid from a tiny bug'],
  ['shiver', 'nerve', 'U', 'T D', 'shivered at a cloud’s shadow'],
  ['tiptoe', 'nerve', 'C', 'T', 'tiptoed across the garden'],
  ['plush', 'nerve', 'U', 'T cuddle', 'hugged its plushie'],
  ['sword', 'nerve', 'C', 'V emberling', 'marched around with a stick sword'],
  ['magnify', 'nerve', 'U', 'V explorer', 'inspected things with a magnifying glass'],

  ['cry', 'feel', 'C', 'D W', 'cried a little', { gate: 'sad' }],
  ['yawn', 'feel', 'C', 'sleepy', 'yawned and nodded off standing up', { gate: 'sleepy' }],
  ['hiccup', 'feel', 'U', 'F jokester', 'got the hiccups'],
  ['sing', 'feel', 'C', 'songbird', 'sang a little song'],
  ['dance', 'feel', 'C', 'P songbird', 'did a happy dance', { gate: 'joy' }],
  ['wave', 'feel', 'C', 'W cuddle', 'waved at you'],
  ['sneeze', 'feel', 'C', 'D', 'sneezed', { gate: 'sniffles' }],

  ['wobble', 'stage', 'C', 'P', 'wobbled and fell on its bottom', { st: ['baby'] }],
  ['crawl', 'stage', 'C', '', 'crawled around', { st: ['baby'] }],
  ['knit', 'stage', 'C', 'S', 'knitted a little scarf', { st: ['senior'] }],
  ['tea', 'stage', 'C', 'S', 'sipped a cup of tea', { st: ['senior'] }],
  ['doze', 'stage', 'C', 'sleepy', 'dozed off in the sun', { st: ['senior'] }],
  ['backache', 'stage', 'U', 'H', 'stretched its sore back', { st: ['senior'] }],

  ['snow', 'season', 'L', '', 'caught snowflakes on its tongue', { gate: 'winter' }],
  ['pumpkin', 'season', 'L', '', 'wore a pumpkin hat', { gate: 'halloween' }],
  ['party', 'season', 'L', '', 'wore a party hat for its big day', { gate: 'milestone' }],
];

export const BEHAVIORS = LIST.map(([id, cat, r, boosts, did, opt = {}]) => ({ id, cat, r, boosts: boosts.split(' ').filter(Boolean), did, ...opt }));
export const BY_ID = Object.fromEntries(BEHAVIORS.map(b => [b.id, b]));
export const TOTAL = BEHAVIORS.length;

// Gates: [is it true now?, weight while true]
const GATES = {
  hungry: [S => S.hunger < 1.5, 30],
  sad: [S => S.happy < 1.5, 30],
  joy: [S => S.hunger >= 3 && S.happy >= 3, 12],
  sniffles: [S => S.sick || S.poops.some(p => p.warned) || (S.persona && S.persona.axes.health <= -2 && S.poops.length > 0), 20],
  sleepy: [(S, now) => pace(S).clock ? minutesToBed(S, now) <= 60 : S.awakeT >= STAGE[S.stage].awake * 0.75, 25],
  evening: [(S, now) => { const h = new Date(now).getHours(); return h >= 18 || h < 6 || (S.persona && S.persona.quirks.includes('nightowl')); }, 1],
  winter: [(S, now) => [11, 0, 1].includes(new Date(now).getMonth()), 6],
  halloween: [(S, now) => { const d = new Date(now), m = d.getMonth(), day = d.getDate(); return (m === 9 && day >= 20) || (m === 10 && day <= 2); }, 6],
  milestone: [S => pace(S).clock && [3, 7].includes(dayNumber(S)), 8],
};
const FORM_CATS = { radiant: ['play', 'joke'], daisy: ['garden', 'calm'], thistle: ['diva', 'brat'] };

export function weight(b, S, now = Date.now()) {
  if (b.st && !b.st.includes(S.stage)) return 0;
  let w = RARITY[b.r] || 1;
  if (b.gate) {
    const [ok, gw] = GATES[b.gate];
    if (!ok(S, now)) return 0;
    if (b.gate !== 'evening') w = gw;
  }
  const p = S.persona;
  if (p) {
    for (const t of b.boosts) {
      if (POLES[t]) { const [axis, sign] = POLES[t]; w *= 1 + 0.35 * sign * (p.axes[axis] || 0); }
      else if (p.quirks.includes(t)) w *= 2.5;
      else if ((S.race || S.seedRace) === t) w *= 1.5;
    }
    if (S.race === 'starling' && (b.r === 'R' || b.r === 'L')) w *= 2;
  }
  if (S.variant && FORM_CATS[S.variant] && FORM_CATS[S.variant].includes(b.cat)) w *= 1.3;
  if (S.stage === 'senior' && b.cat === 'play') w *= 0.4;
  if (S.sick && ['play', 'joke', 'brat', 'diva'].includes(b.cat)) w *= 0.15;
  if (S.journal && !S.journal.includes(b.id)) w *= 1.5;
  return Math.max(0, w);
}

// Pick the next behaviour. recent: ids to avoid repeating.
export function pickBehavior(S, recent = [], now = Date.now(), r = Math.random) {
  const pool = BEHAVIORS.map(b => [b, recent.includes(b.id) ? 0 : weight(b, S, now)]).filter(([, w]) => w > 0);
  const total = pool.reduce((s, [, w]) => s + w, 0);
  if (!total) return null;
  let x = r() * total;
  for (const [b, w] of pool) { if ((x -= w) < 0) return b; }
  return pool[pool.length - 1][0];
}

// The temperament slider a behaviour shows off, if it shows one (used to reveal the personality).
export function telltale(b, S) {
  const p = S.persona; if (!p) return null;
  for (const t of b.boosts) {
    if (!POLES[t]) continue;
    const [axis, sign] = POLES[t];
    if (Math.sign(p.axes[axis]) === sign && !p.known.axes.includes(axis)) return axis;
  }
  return null;
}

// "While you were away": a few things Bubby did on its own, picked with the same weights (moods excluded).
export function diary(S, ms, now = Date.now()) {
  if (S.ended || S.stage === 'seed') return [];
  const n = ms > 8 * 3600e3 ? 3 : ms > 3 * 3600e3 ? 2 : ms > 30 * 60e3 ? 1 : 0;
  const out = [], seen = [];
  for (let i = 0; i < n * 3 && out.length < n; i++) {
    const b = pickBehavior(S, seen, now);
    if (!b) break;
    seen.push(b.id);
    if (b.gate && b.gate !== 'evening') continue;
    out.push(`Bubby ${b.did}.`);
  }
  return out;
}

