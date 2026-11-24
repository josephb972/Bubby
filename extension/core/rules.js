// Bubby game rules. Pure logic, no DOM: runs in the popup and in the background service worker.
//
// Time model
//   - "Quick" is the original 20-minute arcade life. Time only passes while the popup is open.
//   - "Classic" (about 4 days) and "Chill" (about 10 days) run in real time, even while the browser
//     is closed. Bubby sleeps during the bedtime you choose, and needs drain over hours instead of seconds.
//   The original game's timings are stretched by three multipliers per pace:
//     kNeed   how fast hunger and happiness drain
//     kPoop   how often Bubby poops
//     kGrace  how long you have before poop, sickness or a missed call turns into a problem
//   Real-time paces use a longer grace than a pure time-stretch would give, so checking in
//   3–5 times a day is enough for a healthy Bubby (see tools/sim-check.mjs).
//
// Version 1.1 adds races (rolled when the Bulb becomes a Bud), named illnesses with matching medicine, and a
// points economy with a shop. Content tables live in content.js. Nothing new punishes you for being away:
// illness still only comes from poop, sweets, weight or neglect, exactly as before.

import {
  RACES, COMMON_RACES, RARE_RACE, RARE_BASE, RARE_PITY, RARE_MAX, DISEASES, ITEMS, TEA, MAX_STACK, IMMUNITY_SECS,
  PTS, CAPS, STREAK_MS, QUEST_POOL, GOALS, medIds, foodIds,
} from './content.js';
import { rollPersona, mods, revealForStage } from './persona.js';
import { freshWardrobe, fixWardrobe } from './shop.js';
export * from './content.js';

export const STAGE = {
  seed:   { next: 'baby' },
  baby:   { next: 'child',  hr: 1 / 22, pr: 1 / 28, poop: [30, 45], awake: 85,  sleep: 25, base: 5,  doses: [1, 2] },
  child:  { next: 'adult',  hr: 1 / 34, pr: 1 / 40, poop: [45, 65], awake: 120, sleep: 30, base: 10, doses: [1, 2] },
  adult:  { next: 'senior', hr: 1 / 48, pr: 1 / 52, poop: [55, 85], awake: 150, sleep: 35, base: 20, doses: [1, 3] },
  senior: { next: null,     hr: 1 / 58, pr: 1 / 58, poop: [65, 95], awake: 110, sleep: 45, base: 20, doses: [2, 3] },
};

const H = 3600, D = 86400;
export const PACES = {
  quick: {
    label: 'Quick', blurb: '20 minutes. Time stops while closed.',
    kNeed: 1, kPoop: 1, kGrace: 1, clock: false, offline: false,
    dur: { seed: 18, baby: 180, child: 300, adult: 420, senior: 240 },
    awaySick: 160, awayStarve: 150, day: 60,
  },
  classic: {
    label: 'Classic', blurb: '4 days, real time. Check in every few hours.',
    kNeed: 240, kPoop: 300, kGrace: 300, clock: true, offline: true,
    dur: { seed: 60, baby: 6 * H, child: 20 * H, adult: 2 * D, senior: 1 * D },
    awaySick: 24 * H, awayStarve: 24 * H, day: D,
  },
  chill: {
    label: 'Chill', blurb: '10 days, real time. Slow, forgiving needs.',
    kNeed: 360, kPoop: 450, kGrace: 450, clock: true, offline: true,
    dur: { seed: 60, baby: 12 * H, child: 2 * D, adult: 5 * D, senior: 2.5 * D },
    awaySick: 48 * H, awayStarve: 48 * H, day: D,
  },
};

export const NAMES = { seed: 'Seed', baby: 'Bulb', child: 'Bud', adult: 'Blossom', senior: 'Elder' };
export const FORMS = { radiant: 'Radiant Blossom', daisy: 'Daisy Blossom', thistle: 'Thistle' };
export const CALL_TEXT = {
  hungry: 'Bubby is hungry. Feed it a meal.',
  sad: 'Bubby feels lonely. Play a game or give a snack.',
  sleep: 'Bubby fell asleep with the lights on. Turn them off.',
  tantrum: 'Bubby is calling, but its hearts look full. Is it acting out?',
};

export const rand = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const pace = S => PACES[S.cfg && S.cfg.pace] || PACES.chill;

export function defaultCfg() {
  // bedAsked: bedtime was chosen (welcome page or settings). dev: show the time-skip test buttons (bubby.dev(true)).
  return { pace: 'chill', bed: 22 * 60, wake: 8 * 60, notify: true, sound: true, look: 'toy', bedAsked: false, dev: false };
}

// What carries over from one Bubby to the next: the collection, the points, and what you bought.
export const META_KEYS = ['journal', 'album', 'dex', 'rareMiss', 'points', 'inv', 'tot', 'ach', 'quests', 'ptsDay', 'streak', 'streakMs', 'lastCheckIn', 'wardrobe'];

export function fresh(gen = 1, cfg = defaultCfg(), now = Date.now()) {
  const seedRace = pickCommon();
  return {
    v: 2, gen, cfg: { ...defaultCfg(), ...cfg },
    stage: 'seed', stageT: 0, age: 0, born: now, lastT: now,
    hunger: 4, happy: 4, discipline: 0, weight: 1,
    poops: [], sick: false, disease: null, doses: 0, sickT: 0, sickCounted: false, sickMeter: 0, neglectT: 0, starveT: 0,
    asleep: false, lights: true, awakeT: 0, sleepT: 0, litSleep: 0, litTotal: 0,
    immuneT: 0, immuneNote: false, teaCd: 0,
    call: null, mistakes: 0, snacks: [], variant: null, chubby: false, race: null, seedRace,
    // Personality (1.2.0, core/persona.js): rolled from the seed's race, discovered as Bubby grows
    persona: rollPersona(seedRace),
    ended: null, paused: false, nextPoop: 30, nextTantrum: 55,
    // Its name and ID card (1.1.2): named when the egg hatches; the egg waits for you to be there (eggReady)
    name: '', hatchedAt: 0, eggReady: false,
    stats: { meals: 0, snacks: 0, games: 0, wins: 0, cleans: 0, meds: 0, scolds: 0, sick: 0, bestCatch: 0 },
    // Kept across lives (see META_KEYS)
    journal: [], album: [], dex: [], rareMiss: 0, points: PTS.start, inv: {}, tot: {}, ach: {}, quests: null, ptsDay: null,
    streak: 0, streakMs: 0, lastCheckIn: '',
    // Clothes and garden decor bought in the Shop (1.3.0, core/shop.js): cosmetic only
    wardrobe: freshWardrobe(),
    events: [], evSeq: 0, notifiedSeq: 0, seenSeq: 0,
    notif: { day: '', count: 0, lastAt: 0 },
  };
}

// A new seed: a fresh Bubby that keeps the collection, points and shop stock.
export function nextLife(S, gen, now = Date.now()) {
  const N = fresh(gen, S.cfg, now);
  for (const k of META_KEYS) N[k] = S[k];
  N.stats.bestCatch = (S.stats && S.stats.bestCatch) || 0;
  return N;
}

export function stageName(S) {
  if (S.stage === 'adult') return FORMS[S.variant] || 'Blossom';
  if (S.stage === 'senior') return 'Elder ' + (FORMS[S.variant] || 'Blossom').replace(' Blossom', '');
  return NAMES[S.stage];
}
// "Puddle Radiant Blossom": the race in front of the form, once Bubby has one.
export function fullName(S) {
  const young = S.stage === 'seed' || S.stage === 'baby';
  const r = RACES[young ? S.seedRace : S.race];
  return r ? `${r.name} ${stageName(S)}` : stageName(S);
}

/* ---------- Name, ID card and photo album (1.1.2) ---------- */
export const NAME_MAX = 14;
// A safe display name: no control characters or angle brackets, trimmed, at most NAME_MAX characters.
export function cleanName(raw) {
  return [...String(raw ?? '').replace(/[\u0000-\u001f\u007f-\u009f<>]/g, '').replace(/\s+/g, ' ').trim()].slice(0, NAME_MAX).join('').trim();
}
export function setName(S, raw) {
  const n = cleanName(raw);
  if (!n) return false;
  S.name = n;
  return true;
}
// A Bubby that has hatched and still needs a name
export const needsName = S => !S.ended && S.stage !== 'seed' && !S.name;
const NAME_IDEAS = ['Pip', 'Mochi', 'Bean', 'Sprout', 'Nori', 'Pebble', 'Tofu', 'Clover', 'Biscuit', 'Fig', 'Puddin', 'Juniper',
  'Mossy', 'Button', 'Pickle', 'Sunny', 'Maple', 'Olive', 'Tater', 'Wren', 'Poppy', 'Kiwi', 'Basil', 'Dumpling'];
export function nameIdea(rng = Math.random, not = '') {
  const pool = NAME_IDEAS.filter(n => n !== not);
  return pool[Math.floor(rng() * pool.length)];
}
// What the ID card shows. Works for the living Bubby (S) and for album entries (already in this shape).
export function idCard(S, now = Date.now()) {
  const young = S.stage === 'seed' || S.stage === 'baby';
  return {
    name: S.name || 'Bubby', gen: S.gen, title: fullName(S),
    race: (young ? S.seedRace : S.race) || null, stage: S.stage, variant: S.variant, chubby: !!S.chubby,
    born: S.hatchedAt || S.born, day: dayNumber(S), left: null, kind: null,
  };
}
// The album page for a Bubby that has left: its ID card with its last form.
function albumAdd(S, kind, now) {
  if (!S.album) S.album = [];
  if (S.stage === 'seed' && !S.name) return;   // an egg that never hatched leaves no card
  const card = { ...idCard(S, now), left: now, kind, mistakes: S.mistakes };
  S.album.push(card);
  if (S.album.length > 200) S.album.splice(0, S.album.length - 200);
}
// "Start over" in settings: the current Bubby goes into the album, then a new seed (keeps points, dex and album).
export function startOver(S, now = Date.now()) {
  if (!S.ended) albumAdd(S, 'reset', now);
  return nextLife(S, 1, now);
}
export function healthyMax(stage) { return STAGE[stage].base ? Math.round(STAGE[stage].base * 1.6) : 99; }
export function dayNumber(S) { return Math.floor(S.age / pace(S).day); }
export const dosesLeft = S => Math.max(1, Math.ceil(S.doses - 1e-6));

/* ---------- Events (feed toasts, notifications and the "while you were away" summary) ---------- */
export function say(S, type, text, now, extra = {}) {
  S.evSeq++;
  S.events.push({ id: S.evSeq, t: now, type, text, ...extra });
  if (S.events.length > 40) S.events.splice(0, S.events.length - 40);
}

/* ---------- Clock helpers (real-time paces) ---------- */
function minuteOfDay(ms) { const d = new Date(ms); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; }
export function isBedtime(S, ms) {
  const m = minuteOfDay(ms), { bed, wake } = S.cfg;
  return bed > wake ? (m >= bed || m < wake) : (m >= bed && m < wake);
}
// Minutes until bedtime starts (0 if already bedtime).
export function minutesToBed(S, ms) {
  if (isBedtime(S, ms)) return 0;
  return ((S.cfg.bed - minuteOfDay(ms)) + 1440) % 1440;
}
export function dayKey(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ---------- Races and the Bubbydex ---------- */
export function dexAdd(S, key) {
  if (!S.dex) S.dex = [];
  if (S.dex.includes(key)) return false;
  S.dex.push(key);
  return true;
}
// Chance that this Bubby becomes the rare race: a base per pace, plus a little more for every miss in a row.
export function rareChance(S) {
  return Math.min(RARE_MAX, (RARE_BASE[S.cfg && S.cfg.pace] ?? RARE_BASE.chill) + RARE_PITY * (S.rareMiss || 0));
}
// A random common race. Every new seed gets one (S.seedRace): the egg and the Bulb wear its colours, so every Bubby
// looks different from the start.
export function pickCommon(rng = Math.random) { return COMMON_RACES[Math.floor(rng() * COMMON_RACES.length)]; }
// The race, decided when the Bulb grows into a Bud: the rare race by its own chance (so it stays a surprise, whatever
// colours the Bulb wore), otherwise the race the seed was planted with.
export function rollRace(S, rng = Math.random) {
  // Test helper (service worker console: bubby.nextRace('starling')): the next Bud is this race
  if (S.nextRace && RACES[S.nextRace]) { const r = S.nextRace; S.nextRace = null; if (r === RARE_RACE) S.rareMiss = 0; return r; }
  if (rng() < rareChance(S)) { S.rareMiss = 0; return RARE_RACE; }
  S.rareMiss = (S.rareMiss || 0) + 1;
  return COMMON_RACES.includes(S.seedRace) ? S.seedRace : pickCommon(rng);
}

/* ---------- Points, quests and goals ---------- */
const T = (S, k) => (S.tot && S.tot[k]) || 0;
export function ptsDay(S, now = Date.now()) {
  const k = dayKey(now);
  if (!S.ptsDay || S.ptsDay.k !== k) S.ptsDay = { k, care: 0, game: 0, noted: {} };
  return S.ptsDay;
}
// Add points. 'care' and 'game' points stop at a daily cap; 'bonus' (milestones, quests, goals) is uncapped.
export function earn(S, n, cat = 'bonus', now = Date.now()) {
  n = Math.round(n);
  if (!(n > 0)) return 0;
  if (CAPS[cat]) {
    const d = ptsDay(S, now), room = CAPS[cat] - d[cat];
    if (room <= 0) {
      if (!d.noted[cat]) { d.noted[cat] = true; say(S, 'info', `Daily ${cat} points maxed (${CAPS[cat]}). More tomorrow!`, now); }
      return 0;
    }
    n = Math.min(n, room); d[cat] += n;
  }
  S.points += n;
  S.tot.earned = T(S, 'earned') + n;
  return n;
}
export function ensureQuests(S, now = Date.now()) {
  const k = dayKey(now);
  if (S.quests && S.quests.day === k) return S.quests;
  const pool = QUEST_POOL.slice(), list = [];
  while (list.length < 3 && pool.length) {
    const q = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    list.push({ id: q.id, ev: q.ev, need: q.need, text: q.text, have: 0, done: false });
  }
  return (S.quests = { day: k, list, all: false });
}
// Count something that happened (a meal, a win, a cure): moves today's quests and the lifetime totals along.
export function bump(S, ev, now = Date.now(), n = 1) {
  S.tot[ev] = T(S, ev) + n;
  const Q = ensureQuests(S, now);
  for (const q of Q.list) {
    if (q.done || q.ev !== ev) continue;
    q.have = Math.min(q.need, q.have + n);
    if (q.have >= q.need) { q.done = true; say(S, 'pts', `Daily quest done! +${earn(S, PTS.quest, 'bonus', now)} pts`, now); }
  }
  if (!Q.all && Q.list.every(q => q.done)) { Q.all = true; say(S, 'pts', `All daily quests done! +${earn(S, PTS.questAll, 'bonus', now)} bonus pts`, now); }
}
export function checkGoals(S, now = Date.now()) {
  if (!S.ach) S.ach = {};
  const got = [];
  for (const g of GOALS) {
    if (S.ach[g.id] || g.val(S) < g.of) continue;
    S.ach[g.id] = true;
    got.push(`${g.name} +${earn(S, g.pts, 'bonus', now)}`);
  }
  if (got.length) say(S, 'pts', 'Goal reached: ' + got.join(', '), now);
  return got.length;
}
// Opening Bubby on a new calendar day pays points and keeps the streak going. Called by the popup, never the background.
export function checkIn(S, now = Date.now()) {
  const out = { newDay: false, daily: 0, mile: 0, milePts: 0, gift: false };
  const today = dayKey(now);
  if (S.lastCheckIn === today) return out;
  out.newDay = true;
  const continued = S.lastCheckIn === dayKey(now - 86400000);
  S.streak = continued ? (S.streak || 0) + 1 : 1;
  if (!continued) S.streakMs = 0;
  S.lastCheckIn = today;
  out.daily = earn(S, PTS.daily + PTS.streakStep * Math.min(PTS.streakSteps, S.streak - 1), 'bonus', now);
  for (const [d, p] of STREAK_MS) {
    if (S.streak >= d && (S.streakMs || 0) < d) { S.streakMs = d; out.mile = d; out.milePts = earn(S, p, 'bonus', now); }
  }
  if (!S.ended && S.stage !== 'seed' && !S.paused) {
    S.hunger = Math.min(4, S.hunger + 1); S.happy = Math.min(4, S.happy + 1); out.gift = true;
  }
  ensureQuests(S, now);
  return out;
}

/* ---------- Life events ---------- */
function mistake(S) { S.mistakes++; }
function startCall(S, reason, now) {
  S.call = { reason, t: 0, counted: false };
  say(S, 'call', CALL_TEXT[reason], now, { reason });
}
// What makes Bubby ill: a dirty garden gives Ague (sometimes Scurvy), sweets and extra weight give Scurvy,
// sleeping with the lights on while you watch gives the Dancing Plague, and neglect gives The Plague.
export function pickDisease(cause, rng = Math.random) {
  if (cause === 'poop') return rng() < .7 ? 'sporecough' : 'itchymoss';
  if (cause === 'sweets' || cause === 'weight') return 'itchymoss';
  if (cause === 'light') return 'moonflu';
  if (cause === 'neglect') return 'blight';
  return 'sporecough';
}
export function getSick(S, cause, now, forced) {
  if (S.sick) return;
  if (S.immuneT > 0) {
    S.sickMeter = 0; S.neglectT = 0; S.litSleep = 0;
    if (!S.immuneNote) { S.immuneNote = true; say(S, 'info', `${ITEMS.shield.name} kept Bubby well!`, now); }
    return;
  }
  const id = DISEASES[forced] ? forced : pickDisease(cause), d = DISEASES[id];
  S.sick = true; S.disease = id; S.sickT = 0; S.sickCounted = false; S.sickMeter = 0;
  S.doses = Math.max(1, d.doses + mods(S).doses);
  S.stats.sick++;
  say(S, 'sick', `${d.name}! Bubby ${d.sign}.`, now, { disease: id });
}
// Entry point for visiting (a later update): a visit can pass an illness on.
export function catchDisease(S, id, now = Date.now()) { getSick(S, 'visit', now, id); }

function fallAsleep(S, now) {
  S.asleep = true; S.sleepT = 0; S.litSleep = 0; S.litTotal = 0;
  if (S.call && S.call.reason === 'tantrum') S.call = null;
  say(S, 'sleep', S.lights ? 'Bubby fell asleep. Lights off, please.' : 'Bubby fell asleep.', now);
}
function wake(S, now) {
  const slept = S.litTotal < 10 * pace(S).kGrace;   // lights were off for (almost) the whole night
  S.asleep = false; S.awakeT = 0; S.lights = true;
  if (slept) { earn(S, PTS.sleep, 'care', now); bump(S, 'sleep', now); }
  say(S, 'wake', 'Good morning, Bubby!', now);
}

export function evolve(S, to, now) {
  const from = S.stage;
  let newForm = false, newRace = false, rare = false;
  if (to === 'baby') S.weight = STAGE.baby.base;
  else S.weight += STAGE[to].base - STAGE[from].base;
  if (to === 'adult') {
    let tier = S.mistakes <= 2 && S.discipline >= 75 ? 0 : (S.mistakes <= 6 && S.discipline >= 25 ? 1 : 2);
    if (S.weight - (STAGE.adult.base - STAGE.child.base) > healthyMax('child')) { S.chubby = true; tier = Math.min(2, tier + 1); }
    S.variant = ['radiant', 'daisy', 'thistle'][tier];
    if (!S.race) S.race = 'leafling';
    newForm = dexAdd(S, `${S.race}:${S.variant}`);
  }
  if (to === 'child') { S.race = rollRace(S); rare = !!RACES[S.race].rare; newRace = dexAdd(S, S.race); }
  S.stage = to; S.stageT = 0;
  S.nextPoop = rand(...STAGE[to].poop) * pace(S).kPoop * mods(S).poopGap;
  if (to === 'baby') {
    S.awakeT = 0; S.nextTantrum = pace(S).clock ? rand(10, 25) : 55;
    // A newborn is hungry and wants to play: the first thing you do is feed it and play with it.
    S.hunger = 0; S.happy = 0; S.neglectT = 0; S.starveT = 0; S.hatchedAt = now; S.eggReady = false;
  }
  const rn = (RACES[S.race] || RACES.leafling).name, art = /^[AEIOU]/i.test(rn) ? 'an' : 'a';
  const msg = to === 'baby' ? `The egg hatched! Meet your ${fullName(S)}.`
    : to === 'child' ? (rare ? `A rare ${rn}! Very few Bubbies become one.` : `Bubby grew into ${art} ${rn} Bud!`)
    : to === 'adult' ? `Bubby blossomed into ${art} ${rn} ${FORMS[S.variant]}!${newForm ? ' New in the Bubbydex!' : ''}`
    : 'Bubby is an Elder now. Take it easy.';
  say(S, 'evolve', msg, now, { from, to, race: S.race, rare });
  const learned = revealForStage(S, to);
  if (learned) say(S, 'learn', learned, now);
  // Points for growing up, and for filling the Bubbydex
  earn(S, { child: PTS.bud, adult: PTS.blossom, senior: PTS.elder }[to] || 0, 'bonus', now);
  if (rare) earn(S, PTS.rare, 'bonus', now);
  if (newRace) earn(S, PTS.dexRace, 'bonus', now);
  if (newForm) earn(S, PTS.dexForm, 'bonus', now);
  if (to === 'senior') bump(S, 'elder', now);
  checkGoals(S, now);
}

function end(S, kind, now) {
  S.ended = { kind, age: S.age, stage: S.stage, name: fullName(S), pet: S.name || 'Bubby', mistakes: S.mistakes, gen: S.gen, day: dayNumber(S) };
  albumAdd(S, kind, now);
  S.call = null;
  if (kind === 'garden') earn(S, PTS.garden, 'bonus', now);
  const who = S.name || 'Bubby';
  say(S, 'end', kind === 'garden' ? `${who} returned to the garden after a full life.` : `${who} packed up and moved away.`, now, { kind });
}

/* ---------- Simulation ----------
   step(S, dt, now, live)
     dt   seconds to simulate
     now  wall-clock ms at the end of this step (drives bedtime in real-time paces)
     live null when simulating in the background, or { game, busy } while the popup is open */
export function step(S, dt, now, live) {
  if (S.ended || S.paused) return;
  const P = pace(S), kN = P.kNeed, kG = P.kGrace;
  S.age += dt; S.stageT += dt;
  if (S.stage === 'seed') {
    if (S.stageT < P.dur.seed) return;
    // Real time: the egg only hatches while you're watching, so a newborn (which starts hungry and bored) is never alone.
    if (live || !P.clock) evolve(S, 'baby', now);
    else if (!S.eggReady) { S.eggReady = true; say(S, 'ready', 'Your egg is ready to hatch! Open Bubby to meet it.', now); }
    return;
  }
  const st = STAGE[S.stage];
  const inGame = !!(live && live.game);
  const M = mods(S);
  if (S.immuneT > 0) { S.immuneT = Math.max(0, S.immuneT - dt); if (S.immuneT === 0) S.immuneNote = false; }
  if (S.teaCd > 0) S.teaCd = Math.max(0, S.teaCd - dt);

  // Day and night
  if (S.asleep) {
    S.sleepT += dt;
    if (S.lights) {
      S.happy -= dt / (40 * kG);
      S.litTotal += dt;
      // The Dancing Plague from sleeping with the lights on only happens while you are watching (or on Quick), never overnight.
      if (!P.clock || live) {
        S.litSleep += dt;
        if (S.litSleep >= 18 && !S.sick) { S.litSleep = 10; getSick(S, 'light', now); }
      }
    }
    if (P.clock ? !isBedtime(S, now) : S.sleepT >= st.sleep) wake(S, now);
  } else {
    S.awakeT += dt;
    if (!S.lights) S.happy -= dt / (70 * kG) * M.dark;
    // Real time: a newborn stays up for 30 minutes even if it is born at bedtime.
    const sleepy = P.clock ? (isBedtime(S, now) && S.awakeT >= 1800) : S.awakeT >= st.awake * M.awake;
    if (sleepy && !inGame) fallAsleep(S, now);
  }

  // Meters
  let m = S.asleep ? 0.15 : 1;
  const dis = S.sick ? (DISEASES[S.disease] || DISEASES.sporecough) : null;
  if (dis) m *= dis.decay;
  S.hunger = clamp(S.hunger - st.hr / kN * m * M.hunger * dt, 0, 4);
  S.happy = clamp(S.happy - st.pr / kN * m * M.happy * dt - 0.004 / kN * S.poops.length * M.poopMood * dt, 0, 4);

  // Poop
  if (!S.asleep) {
    S.nextPoop -= dt;
    if (S.nextPoop <= 0) {
      if (S.poops.length < 4) { S.poops.push({ t: 0 }); say(S, 'poop', 'Bubby pooped.', now); }
      S.nextPoop = rand(...st.poop) * P.kPoop * M.poopGap;
    }
  }
  let old = 0, newlyOld = false;
  for (const p of S.poops) {
    p.t += dt;
    if (p.t > 12 * kG) { old++; if (!p.warned) { p.warned = true; newlyOld = true; } }
  }
  if (newlyOld && P.clock) say(S, 'dirty', 'The garden is getting dirty. Clean it before Bubby gets sick.', now);
  S.sickMeter += dt * old * M.sick;
  if (S.weight > st.base * 2) S.sickMeter += dt * 0.3 * M.sick;
  if (!S.sick && S.sickMeter >= 45 * kG) getSick(S, 'poop', now);

  // Neglect
  if (S.hunger <= 0 && S.happy <= 0) S.neglectT += dt; else S.neglectT = Math.max(0, S.neglectT - dt);
  if (!S.sick && S.neglectT > 30 * kG) getSick(S, 'neglect', now);
  S.starveT = S.hunger <= 0 ? S.starveT + dt : 0;
  if (S.sick) {
    S.sickT += dt;
    if (S.sickT >= 60 * kG && !S.sickCounted) { S.sickCounted = true; mistake(S); say(S, 'mistake', 'Bubby stayed sick too long.', now); }
  }
  const sickLimit = P.awaySick * (S.sick ? (DISEASES[S.disease] || DISEASES.sporecough).limitK : 1);
  if ((S.sick && S.sickT >= sickLimit) || S.starveT >= P.awayStarve) { end(S, 'away', now); return; }

  // Tantrums. In real-time paces they only happen while you are looking (popup open), never as a
  // notification: a fake-out call is fun to catch, but annoying to be woken up by.
  if (P.clock && !live && S.call && S.call.reason === 'tantrum') S.call = null;
  const tantrumClock = P.clock ? !!live : true;
  if (tantrumClock && !S.asleep && S.lights && !S.call && S.stage !== 'senior' && !inGame) {
    S.nextTantrum -= dt;
    if (S.nextTantrum <= 0) {
      if (S.hunger >= 2 && S.happy >= 2 && !S.sick && S.discipline < 100) startCall(S, 'tantrum', now);
      S.nextTantrum = (P.clock ? rand(25, 50) + S.discipline * 0.4 : rand(45, 80) + S.discipline * 0.8) * M.tantrum;
    }
  }

  // Calls for real needs
  const want = S.asleep ? (S.lights ? 'sleep' : null) : (S.hunger <= 0 ? 'hungry' : (S.happy <= 0 ? 'sad' : null));
  if (want) { if (!S.call || S.call.reason !== want) startCall(S, want, now); }
  else if (S.call && S.call.reason !== 'tantrum') S.call = null;

  if (S.call) {
    S.call.t += dt;
    const limit = S.call.reason === 'tantrum' ? 30 : 30 * kG;
    // Real time: lights left on at bedtime cost happiness overnight, not a care mistake.
    const forgiven = P.clock && S.call.reason === 'sleep';
    if (S.call.t >= limit && !S.call.counted && !forgiven) {
      S.call.counted = true; mistake(S);
      if (S.call.reason === 'tantrum') { S.call = null; say(S, 'info', 'Bubby sulked and got away with it.', now); }
      else say(S, 'mistake', 'Bubby waited a long time for you.', now);
    }
  }

  // Growing up (waits until Bubby is awake and not busy)
  if (S.stageT >= P.dur[S.stage]) {
    if (st.next) { if (!S.asleep && !inGame && !(live && live.busy)) evolve(S, st.next, now); }
    else end(S, 'garden', now);
  }
}

// Bring the state up to `now`. Safe to call as often as you like.
export function advance(S, now = Date.now(), live = null) {
  const P = pace(S);
  if (!S.lastT || S.lastT > now) S.lastT = now;
  let dt = (now - S.lastT) / 1000;
  if (S.paused || S.ended || (!P.offline && !live)) { S.lastT = now; return; }
  dt = Math.min(dt, 60 * D);
  const h = live ? 0.25 : (P.clock ? 5 : 0.25);
  let t = S.lastT;
  while (dt > 1e-6 && !S.ended) {
    const d = Math.min(h, dt);
    t += d * 1000; dt -= d;
    step(S, d, t, live);
  }
  S.lastT = now;
}

/* ---------- Player actions ----------
   Each returns { ok, msg, anim } and changes the state right away, so the background can apply
   them from a notification button. The popup uses `anim` to play the matching animation. */
export function canCare(S) {
  if (S.ended) return 'Plant the new seed first';
  if (S.paused) return 'Paused. Press pause again to resume';
  if (S.stage === 'seed') return 'The seed is still sprouting';
  if (S.asleep) return 'Shh… Bubby is asleep';
  if (!S.lights) return 'Too dark! Turn the lights on';
  return null;
}

// The medicine the Medicine button (and the notification button) gives: the one that fits the illness if you have it,
// then Theriac (the cure-all), then Garden Tea.
export function bestMed(S) {
  const d = S.sick && DISEASES[S.disease];
  if (!d) return 'tea';
  if ((S.inv[d.med] || 0) > 0) return d.med;
  if ((S.inv.elixir || 0) > 0) return 'elixir';
  return 'tea';
}

// Use something from the pantry or the cabinet: shop food, medicine, Garden Tea or the Plague Doctor’s Posy.
export function useItem(S, id, now = Date.now()) {
  const r = useItemRaw(S, id, now);
  if (r.ok) checkGoals(S, now);
  return r;
}
function useItemRaw(S, id, now) {
  const it = id === 'tea' ? TEA : ITEMS[id];
  if (!it) return { ok: false, msg: '' };
  const no = canCare(S);
  if (no) return { ok: false, msg: no };
  const P = pace(S), kG = P.kGrace;
  if (id !== 'tea' && !(S.inv[id] > 0)) return { ok: false, msg: 'None left. Buy more in the Shop', anim: 'no' };

  if (it.kind === 'food') {
    if (S.hunger >= 3.999 && (it.happy <= 0 || S.happy >= 3.999)) return { ok: false, msg: 'Bubby is full', anim: 'no' };
    S.inv[id]--;
    S.hunger = clamp(S.hunger + it.hunger, 0, 4); S.happy = clamp(S.happy + it.happy, 0, 4);
    S.weight += it.weight; S.stats.meals++; S.nextPoop -= 4 * P.kPoop;
    earn(S, PTS.premium, 'care', now); bump(S, 'feed', now);
    return { ok: true, msg: `Yum! ${it.name}`, anim: 'eat', food: id };
  }
  if (id === 'shield') {
    if (S.sick) return { ok: false, msg: 'The tonic only prevents illness', anim: 'no' };
    if (S.immuneT > 0) return { ok: false, msg: 'Bubby is already protected', anim: 'no' };
    S.inv[id]--; S.immuneT = IMMUNITY_SECS * kG; S.immuneNote = false;
    return { ok: true, msg: 'Protected from illness for a while', anim: 'happy' };
  }
  if (!S.sick) return { ok: false, msg: 'Bubby isn’t sick', anim: 'no' };
  const d = DISEASES[S.disease] || DISEASES.sporecough;
  const works = it.cures === 'all' || it.cures.includes(S.disease);
  if (!works) {
    if (it.soothes && S.teaCd <= 0) {
      S.teaCd = 40 * kG; S.sickT = Math.max(0, S.sickT - 30 * kG);
      return { ok: true, msg: `The tea soothes Bubby for now. ${d.name} needs ${ITEMS[d.med].name}`, anim: 'med' };
    }
    return { ok: false, msg: it.soothes ? 'Bubby needs a moment before more tea' : `That won’t help ${d.name}. Try ${ITEMS[d.med].name}`, anim: 'no' };
  }
  if (id !== 'tea') S.inv[id]--;
  S.doses = it.cures === 'all' ? 0 : Math.max(0, S.doses - it.dose);
  S.stats.meds++;
  if (S.doses > 0.001) return { ok: true, msg: `Gulp. ${dosesLeft(S)} more dose${dosesLeft(S) > 1 ? 's' : ''} needed`, anim: 'med' };
  // Cured
  S.sick = false; S.disease = null; S.sickT = 0; S.sickCounted = false; S.neglectT = 0; S.sickMeter = 0; S.doses = 0;
  S.happy = clamp(S.happy + mods(S).cure, 0, 4);
  const got = earn(S, PTS.cure, 'bonus', now);
  bump(S, 'cure', now);
  return { ok: true, msg: `All better!${got ? ` +${got} pts` : ''}`, anim: 'med', cured: true };
}

export function doAction(S, a, now = Date.now()) {
  const r = doActionRaw(S, a, now);
  if (r.ok) checkGoals(S, now);
  return r;
}
function doActionRaw(S, a, now) {
  if (a === 'lights') return toggleLights(S, now);
  const no = canCare(S);
  if (no) return { ok: false, msg: no };
  const M = mods(S);
  switch (a) {
    case 'meal': {
      if (S.hunger >= 3.999) return { ok: false, msg: 'Bubby is full', anim: 'no' };
      // A picky eater sometimes pushes the plate away (never when it's really hungry). No cost: try again.
      if (S.hunger >= 1 && Math.random() < M.refuse) return { ok: false, msg: 'Bubby pushed the plate away. Picky! Try again', anim: 'no' };
      S.hunger = clamp(S.hunger + 1, 0, 4); S.happy = clamp(S.happy + M.mealHappy, 0, 4); S.weight += 1; S.stats.meals++; S.nextPoop -= 4 * pace(S).kPoop;
      earn(S, PTS.meal, 'care', now); bump(S, 'feed', now);
      return { ok: true, msg: 'Yum! A good meal', anim: 'eat-meal' };
    }
    case 'snack': {
      const kG = pace(S).kGrace;
      S.happy = clamp(S.happy + M.snack, 0, 4); S.weight += 2; S.stats.snacks++;
      S.snacks = S.snacks.filter(t => S.age - t < 45 * kG); S.snacks.push(S.age);
      earn(S, PTS.snack, 'care', now); bump(S, 'feed', now);
      const r = { ok: true, msg: 'Sweet! Bubby loves snacks', anim: 'eat-snack' };
      if (S.snacks.length >= 3 && Math.random() < 0.6) { S.snacks = []; getSick(S, 'sweets', now); if (S.sick) r.msg = `Too many sweets! Bubby has ${DISEASES[S.disease].name}`; }
      return r;
    }
    case 'clean': {
      if (!S.poops.length) return { ok: false, msg: 'The garden is already clean', anim: 'sparkle' };
      const n = S.poops.length;
      S.poops = []; S.sickMeter = 0; S.happy = clamp(S.happy + 0.25 + M.cleanBonus, 0, 4); S.stats.cleans++;
      earn(S, n * PTS.clean, 'care', now); bump(S, 'clean', now);
      return { ok: true, msg: 'All clean!', anim: 'clean' };
    }
    case 'med': return useItem(S, bestMed(S), now);
    case 'scold': {
      if (S.call && S.call.reason === 'tantrum') {
        S.discipline = clamp(S.discipline + M.disc, 0, 100); S.call = null; S.stats.scolds++;
        earn(S, PTS.scold, 'care', now); bump(S, 'scold', now);
        return { ok: true, msg: `Bubby behaves now. Discipline ${S.discipline}%`, anim: 'scold' };
      }
      S.happy = clamp(S.happy - M.unfair, 0, 4);
      return { ok: true, msg: 'That wasn’t fair. Bubby is upset', anim: 'scold' };
    }
  }
  return { ok: false, msg: '' };
}

export function toggleLights(S, now = Date.now()) {
  if (S.ended) return { ok: false, msg: 'Plant the new seed first' };
  if (S.paused) return { ok: false, msg: 'Paused. Press pause again to resume' };
  const P = pace(S), st = STAGE[S.stage];
  S.lights = !S.lights;
  if (!S.lights) {
    if (!S.asleep && S.stage !== 'seed') {
      const early = P.clock ? minutesToBed(S, now) <= 90 : S.awakeT >= st.awake * 0.6;
      if (early) { S.asleep = true; S.sleepT = 0; S.litSleep = 0; S.litTotal = 0; if (S.call && S.call.reason === 'tantrum') S.call = null; return { ok: true, msg: 'Bubby went to bed. Sweet dreams' }; }
    }
    return { ok: true, msg: S.asleep ? 'Lights off. Sweet dreams' : 'Lights off' };
  }
  return { ok: true, msg: S.asleep ? 'Lights on. Bubby is still sleeping' : 'Lights on' };
}

// Minigame results (the games themselves run in the popup). `res` is { kind: 'guess' | 'catch', score } and
// pays points; without it only Bubby's hearts and weight change. Returns the points earned.
export function finishGame(S, happyGain, res = null, now = Date.now()) {
  S.stats.games++;
  S.weight = Math.max(Math.round(STAGE[S.stage].base * 0.8), S.weight - 1);
  if (happyGain) { S.happy = clamp(S.happy + happyGain * mods(S).game, 0, 4); S.stats.wins++; }
  if (!res) return 0;
  let pts = 0, won = false;
  if (res.kind === 'guess') { pts = res.score * PTS.guess + (res.score >= 5 ? PTS.guessPerfect : 0); won = res.score >= 3; }
  else if (res.kind === 'catch') {
    const prev = S.stats.bestCatch || 0, best = res.score > prev;
    if (best) S.stats.bestCatch = res.score;
    S.tot.bestCatch = Math.max(T(S, 'bestCatch'), res.score);
    pts = Math.floor(res.score / PTS.catchDiv) + (best && prev > 0 ? PTS.catchBest : 0);
    won = res.score >= 10;
    if (res.score >= 10) bump(S, 'catch10', now);
  }
  bump(S, 'game', now); if (won) bump(S, 'win', now);
  const got = earn(S, pts, 'game', now);
  checkGoals(S, now);
  return got;
}

/* ---------- Shop ---------- */
export function buy(S, id, now = Date.now()) {
  const it = ITEMS[id];
  if (!it) return { ok: false, msg: '' };
  if ((S.inv[id] || 0) >= MAX_STACK) return { ok: false, msg: `You already have ${MAX_STACK} ${it.name}.` };
  if (S.points < it.price) return { ok: false, msg: `Not enough points for ${it.name}.` };
  S.points -= it.price;
  S.inv[id] = (S.inv[id] || 0) + 1;
  bump(S, 'buy', now);
  checkGoals(S, now);
  return { ok: true, msg: `Bought ${it.name}. ${S.inv[id]} in stock.` };
}
// What the one-item picker on the screen can browse: owned shop food, or Garden Tea plus owned medicine.
export function pickIds(S, mode) {
  if (mode === 'food') return foodIds().filter(k => (S.inv[k] || 0) > 0);
  return ['tea', ...medIds().filter(k => (S.inv[k] || 0) > 0)];
}

/* ---------- What does Bubby need most right now? (drives the smart button, badge and tooltip) ---------- */
export function topNeed(S) {
  if (S.ended) return { act: 'replant', label: 'Plant the new seed', tone: 'calm' };
  if (S.paused) return { act: 'resume', label: 'Resume', tone: 'calm' };
  if (S.stage === 'seed') return { act: null, label: 'The seed is sprouting…', tone: 'calm' };
  if (S.asleep) return S.lights ? { act: 'lights', label: 'Turn the lights off', tone: 'urgent' } : { act: null, label: 'Bubby is sleeping', tone: 'calm' };
  if (!S.lights) return { act: 'lights', label: 'Turn the lights on', tone: 'urgent' };
  // A tantrum is a test: the button doesn't give the answer away. Check the hearts, then decide.
  if (S.call && S.call.reason === 'tantrum') return { act: null, label: 'Calling… but its hearts look full', tone: 'urgent' };
  if (S.sick) return { act: 'med', label: `Give medicine (${dosesLeft(S)} dose${dosesLeft(S) > 1 ? 's' : ''})`, tone: 'urgent' };
  if (S.hunger <= 1) return { act: 'meal', label: 'Feed a meal', tone: S.hunger <= 0 ? 'urgent' : 'warn' };
  if (S.poops.length) return { act: 'clean', label: 'Clean up the poop', tone: S.poops.some(p => p.t > 12 * pace(S).kGrace) ? 'urgent' : 'warn' };
  if (S.happy <= 1) return { act: 'play', label: 'Play with Bubby', tone: S.happy <= 0 ? 'urgent' : 'warn' };
  if (S.hunger < 3) return { act: 'meal', label: 'Feed a meal', tone: 'ok' };
  if (S.happy < 3) return { act: 'play', label: 'Play with Bubby', tone: 'ok' };
  return { act: 'play', label: 'Play with Bubby', tone: 'ok', happy: true };
}

// The need a notification would be about right now (tantrums never notify).
export function needKey(S) {
  if (S.ended || S.paused) return null;
  if (S.call && S.call.reason !== 'tantrum') return S.call.reason;
  if (S.sick) return 'sick';
  if (S.poops.some(p => p.warned)) return 'dirty';
  return null;
}

// Change pace mid-life: keep how far Bubby is through its current stage.
export function setPace(S, p) {
  if (!PACES[p] || S.cfg.pace === p) return;
  const from = pace(S), to = PACES[p];
  const rP = to.kPoop / from.kPoop, rG = to.kGrace / from.kGrace;
  S.stageT = S.stageT / from.dur[S.stage] * to.dur[S.stage];
  S.age = S.age / from.day * to.day;
  S.nextPoop *= rP;
  for (const x of S.poops) x.t *= rG;
  S.sickMeter *= rG; S.sickT *= rG; S.neglectT *= rG; S.starveT *= rG;
  S.immuneT *= rG; S.teaCd *= rG; S.litTotal *= rG; S.litSleep = 0;
  if (S.call && S.call.reason !== 'tantrum') S.call.t *= rG;
  S.snacks = [];
  S.awakeT = to.clock ? Math.max(S.awakeT, 1800) : 0;
  S.nextTantrum = to.clock ? rand(10, 25) : 55;
  S.cfg.pace = p;
}

export function migrate(o, now = Date.now()) {
  if (!o || o.v !== 2) return null;
  const S = Object.assign(fresh(o.gen, o.cfg, now), o);
  S.cfg = { ...defaultCfg(), ...(o.cfg || {}) };
  S.stats = { ...fresh().stats, ...(o.stats || {}) };
  S.notif = { day: '', count: 0, lastAt: 0, ...(o.notif || {}) };
  // Saves from before races and named illnesses
  if (S.sick && !DISEASES[S.disease]) S.disease = 'sporecough';
  if (!S.race && ['child', 'adult', 'senior'].includes(S.stage)) S.race = 'leafling';   // keeps the classic look
  if (!S.inv) S.inv = {};
  if (!S.tot) S.tot = {};
  if (!S.ach) S.ach = {};
  if (!S.dex) S.dex = [];
  if (S.race) {
    dexAdd(S, S.race);
    if ((S.stage === 'adult' || S.stage === 'senior') && S.variant) dexAdd(S, `${S.race}:${S.variant}`);
  }
  // Saves from before personalities (1.2.0): fresh() rolled one from a random race, so roll again from this Bubby's own.
  // A grown Bubby has already shown what it's like, so reveal what its stage would have revealed.
  if (!Array.isArray(S.journal)) S.journal = [];
  // Saves from before clothes (1.3.0) get a wardrobe with the welcome gift; a damaged one is repaired
  S.wardrobe = fixWardrobe(o.wardrobe);
  if (!o.persona) {
    S.persona = rollPersona(S.seedRace || S.race);
    const i = ['seed', 'baby', 'child', 'adult', 'senior'].indexOf(S.stage);
    if (i >= 3) revealForStage(S, 'adult');
    else { if (i >= 1) revealForStage(S, 'baby'); if (i >= 2) revealForStage(S, 'child'); }
    if (i >= 1 && !S.ended) say(S, 'learn', `Every Bubby has a personality now. Open Status, then Nature, to see what ${S.name || 'yours'} is like.`, now);
  }
  return S;
}

