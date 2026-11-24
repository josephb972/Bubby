// Checks the version 1.1 rules (races, illnesses and medicine, points and the shop) and the 1.2 personalities without a browser.
// Usage: node tools/rules-check.mjs
import * as R from '../extension/core/rules.js';
import { pickNotes } from '../extension/core/notes.js';
import * as Pe from '../extension/core/persona.js';
import * as B from '../extension/core/behaviors.js';
import { readFileSync } from 'node:fs';

let failed = 0, passed = 0;
const check = (ok, what) => { if (ok) passed++; else failed++; console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}`); };
const eq = (a, b, what) => check(a === b, `${what} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);

const T0 = new Date('2026-11-16T09:00:00').getTime();
const DAY = 86400e3;
// A personality that changes nothing, so the other rule checks are exact (personalities are checked at the end)
const NEUTRAL = () => ({ axes: { energy: 0, appetite: 0, manners: 0, nerve: 0, health: 0 }, quirks: ['explorer', 'cuddle'], known: { q: 0, axes: [] } });
// A Bubby of the given stage, awake with the lights on, ready to be cared for.
function bubby(pace = 'quick', stage = 'child', extra = {}) {
  const S = R.fresh(1, { pace }, T0);
  Object.assign(S, { stage, hunger: 2, happy: 2, seedRace: null, persona: NEUTRAL(), ...extra });   // no seed race: the Bud rolls one (tests below cover seedRace)
  // A dummy unfinished quest, so today's random quests never add surprise points to a test
  S.quests = { day: R.dayKey(T0), all: false, list: [{ id: 'x', ev: 'never', need: 1, text: 'x', have: 0, done: false }] };
  return S;
}
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };   // a fake Math.random

/* ---------- Races ---------- */
{
  const S = bubby('quick', 'baby');
  const names = R.COMMON_RACES;
  // The common races split the rest evenly: rolls just above the rare chance land on each in turn
  const got = names.map((_, i) => R.rollRace(bubby('quick'), seq(.99, (i + .5) / names.length)));
  check(JSON.stringify(got) === JSON.stringify(names), 'each common race can be rolled: ' + got.join(', '));
  eq(R.rollRace(bubby('quick'), seq(.01)), 'starling', 'a low roll gives the rare Starling');
  eq(R.rareChance(bubby('quick')), .05, 'Quick rare chance is 5%');
  eq(R.rareChance(bubby('chill')), .12, 'Chill rare chance is 12%');
  const m = bubby('chill'); R.rollRace(m, seq(.99, .1)); R.rollRace(m, seq(.99, .1));
  eq(m.rareMiss, 2, 'each miss is counted');
  check(Math.abs(R.rareChance(m) - .22) < 1e-9, 'each miss adds 5% (12% -> 22%)');
  R.rollRace(m, seq(.0)); eq(m.rareMiss, 0, 'a rare roll resets the miss counter');
  const big = bubby('chill', 'child', { rareMiss: 99 }); eq(R.rareChance(big), .6, 'the chance is capped at 60%');

  // The seed's race (1.1.1): every new seed is planted with a random common race; the egg and Bulb wear its colours and the
  // Bud becomes it, unless the rare roll turns it into a Starling.
  {
    const counts = {};
    for (let i = 0; i < 6000; i++) { const s = R.fresh(1, { pace: 'chill' }, T0).seedRace; counts[s] = (counts[s] || 0) + 1; }
    check(Object.keys(counts).sort().join() === [...R.COMMON_RACES].sort().join() && !counts.starling, 'new seeds get every common race, never the rare one: ' + JSON.stringify(counts));
    check(Object.values(counts).every(n => Math.abs(n - 6000 / R.COMMON_RACES.length) < 160), 'seed races are evenly spread');
    eq(R.rollRace(bubby('chill', 'baby', { seedRace: 'emberling' }), seq(.99, .01)), 'emberling', 'not rare: the Bud becomes the seed\'s race');
    eq(R.rollRace(bubby('chill', 'baby', { seedRace: 'emberling' }), seq(.01)), 'starling', 'rare: any Bulb can still become a Starling');
    const miss = bubby('chill', 'baby', { seedRace: 'puddle' }); R.rollRace(miss, seq(.99)); eq(miss.rareMiss, 1, 'the seed race still counts as a rare miss');
    const old = R.migrate(JSON.parse(JSON.stringify({ ...bubby('chill', 'baby'), seedRace: undefined })), T0);
    check(R.COMMON_RACES.includes(old.seedRace), 'a save from before 1.1.1 gets a seed race when it loads: ' + old.seedRace);
    const life = R.nextLife(bubby('chill', 'adult', { race: 'puddle' }), 2, T0);
    check(R.COMMON_RACES.includes(life.seedRace) && life.race === null, 'a new life gets a new seed race');
  }

  // Hatching, names, ID card and album (1.1.2)
  {
    const H = R.fresh(1, { pace: 'chill' }, T0); H.seedRace = 'puddle';
    R.advance(H, T0 + 90e3, { game: false, busy: false });
    check(H.stage === 'baby' && H.hunger === 0 && H.happy === 0, 'a newborn starts hungry and bored (0 and 0)');
    eq(H.hatchedAt > T0 && H.hatchedAt <= T0 + 90e3, true, 'the hatch time is its birthday');
    eq(R.fullName(H), 'Puddle Bulb', 'the race name shows from the start');
    check(/hatched! Meet your Puddle Bulb/.test(H.events.find(e => e.type === 'evolve').text), 'hatch message names the race');
    check(R.needsName(H), 'a newborn needs a name');
    eq(R.setName(H, '   '), false, 'an empty name is refused');
    eq(R.cleanName('  <b>Pip</b>\u0007  the   Great and Wonderful'), 'bPip/b the Gre', 'names are cleaned and cut to 14 characters');
    R.setName(H, 'Pip'); eq(H.name, 'Pip', 'named'); check(!R.needsName(H), '... and no longer asks');
    const card = R.idCard(H, T0 + 90e3);
    check(card.name === 'Pip' && card.title === 'Puddle Bulb' && card.race === 'puddle' && card.stage === 'baby' && card.born === H.hatchedAt, 'ID card: ' + JSON.stringify(card));
    // Notifications use the name
    const nH = { ...H, notif: { day: '', count: 0, lastAt: 0, lastKey: null }, asleep: false, call: { reason: 'hungry', t: 0 } };
    const notes = pickNotes(nH, [], T0 + DAY);
    check(notes.length && notes[0].title === 'Pip is hungry', 'notifications use the name: ' + (notes[0] && notes[0].title));
    // Leaving: start over puts the card in the album; it survives the new life
    const N = R.startOver(H, T0 + DAY);
    check(N.stage === 'seed' && N.name === '' && N.album.length === 1 && N.album[0].name === 'Pip' && N.album[0].kind === 'reset' && N.album[0].left === T0 + DAY, 'start over: the card goes in the album');
    const e2 = R.startOver(N, T0 + DAY); eq(e2.album.length, 1, 'an unhatched egg leaves no card');
    // A life that ends puts its last form in the album
    const G2 = bubby('quick', 'senior', { name: 'Mochi', race: 'emberling', variant: 'radiant', album: [] });
    G2.stageT = 1e9; R.step(G2, 1, T0, null);
    check(G2.ended && G2.album.length === 1 && G2.album[0].stage === 'senior' && G2.album[0].race === 'emberling' && G2.album[0].kind === 'garden', 'a finished life goes in the album with its last form');
    check(R.nextLife(G2, 2, T0).album.length === 1, 'the album is kept across lives');
    const old = R.migrate(JSON.parse(JSON.stringify({ ...bubby('chill', 'child'), name: undefined, album: undefined, hatchedAt: undefined })), T0);
    check(old.name === '' && Array.isArray(old.album) && R.needsName(old), 'a Bubby from before 1.1.2 is asked for a name');
  }

  // Evolving: baby -> child rolls the race, adds it to the Bubbydex and pays points
  const e = bubby('quick', 'baby', { points: 0 });
  const rnd = Math.random; Math.random = seq(.99, .5);   // not rare, the third common race
  R.evolve(e, 'child', T0); Math.random = rnd;
  eq(e.race, 'puddle', 'Bulb to Bud rolls a race');
  check(e.dex.includes('puddle'), 'the race is added to the Bubbydex');
  const ev = e.events.filter(x => x.type === 'evolve').pop();
  check(ev.race === 'puddle' && ev.rare === false && /Puddle Bud/.test(ev.text), 'the evolve event carries race and rare: ' + ev.text);
  eq(e.points, R.PTS.bud + R.PTS.dexRace, 'Bud + new race points');
  Object.assign(e, { mistakes: 0, discipline: 80 });
  R.evolve(e, 'adult', T0);
  check(e.dex.includes('puddle:radiant'), 'the adult form is added to the Bubbydex');
  eq(R.dexFound(e), 1, 'one adult form found');
  check(/Puddle Radiant Blossom/.test(R.fullName(e)), 'full name is race + form: ' + R.fullName(e));
  const r = bubby('quick', 'baby', { points: 0 });
  Math.random = seq(.01); R.evolve(r, 'child', T0); Math.random = rnd;
  const rev = r.events.filter(x => x.type === 'evolve').pop();
  check(r.race === 'starling' && rev.rare === true && /rare Starling/.test(rev.text), 'a rare Starling is flagged in the event: ' + rev.text);
  eq(r.points, R.PTS.bud + R.PTS.dexRace + R.PTS.rare + 40, 'the rare race pays a bonus (plus the Starstruck goal, 40)');
}

/* ---------- Test helper, historical names ---------- */
{
  const S = bubby('quick', 'baby'); S.nextRace = 'puddle';
  eq(R.rollRace(S, () => .99), 'puddle', 'the nextRace test helper forces the next race'); eq(S.nextRace, null, '... once');
  const R2 = bubby('quick', 'baby'); R2.nextRace = 'starling'; R2.rareMiss = 4; R.rollRace(R2); eq(R2.rareMiss, 0, 'a forced Starling resets the miss counter');
  const names = Object.values(R.DISEASES).map(d => d.name);
  check(JSON.stringify(names) === JSON.stringify(['Ague', 'Scurvy', 'Dancing Plague', 'The Plague']), 'the illnesses are old medieval ones: ' + names.join(', '));
  check(!names.some(n => /lepro|leper|syphil|chlamyd|cholera|tubercul|covid/i.test(n)), 'no illness that still stigmatises people today');
  check(Object.values(R.DISEASES).every(d => d.lore && d.lore.length > 30), 'every illness has a short historical note');
  check(R.loreOf('salve') === R.DISEASES.itchymoss.lore && R.loreOf('elixir').includes('cure-all') && R.loreOf('shield').includes('herbs') && R.loreOf('pie') === '', 'items show the note of the illness they cure');
  check(R.DISCLAIMER.includes('not') && /game/i.test(R.DISCLAIMER), 'there is a not-medical-advice disclaimer');
  check(['Cinchona Bark', 'Lime Juice', 'Valerian Root', 'Four Thieves Vinegar', 'Theriac'].every(n => Object.values(R.ITEMS).some(i => i.name === n)), 'medicines are named after the old remedies');
}

/* ---------- Illness and medicine ---------- */
{
  const picks = ['poop', 'sweets', 'weight', 'light', 'neglect'].map(c => R.pickDisease(c, () => .5));
  check(JSON.stringify(picks) === JSON.stringify(['sporecough', 'itchymoss', 'itchymoss', 'moonflu', 'blight']), 'causes pick the right illness: ' + picks.join(', '));
  eq(R.pickDisease('poop', () => .9), 'itchymoss', 'a dirty garden sometimes gives Scurvy');

  // Wrong medicine is refused and not used up; right medicine takes the full dose count
  const S = bubby('quick', 'child', { inv: { syrup: 1, salve: 2 }, points: 0 });
  R.getSick(S, 'x', T0, 'itchymoss');
  eq(S.disease, 'itchymoss', 'forced illness'); eq(S.doses, 2, 'Scurvy needs 2 doses');
  let r = R.useItem(S, 'syrup', T0);
  check(!r.ok && S.inv.syrup === 1 && S.doses === 2, 'wrong medicine refused and not used: ' + r.msg);
  r = R.useItem(S, 'salve', T0); check(r.ok && S.sick && S.doses === 1 && S.inv.salve === 1, 'first dose: ' + r.msg);
  r = R.useItem(S, 'salve', T0); check(r.ok && r.cured && !S.sick && S.disease === null && S.inv.salve === 0, 'second dose cures: ' + r.msg);
  check(S.points >= R.PTS.cure, 'curing pays points'); eq(S.tot.cure, 1, 'cure is counted');

  // Garden Tea: two cups cure Ague; it only soothes the others, with a cooldown
  const c = bubby('quick', 'child'); R.getSick(c, 'poop', T0, 'sporecough');
  r = R.useItem(c, 'tea', T0); check(r.ok && c.sick && /1 more dose/.test(r.msg), 'tea cup 1 of 2: ' + r.msg);
  r = R.useItem(c, 'tea', T0); check(r.ok && r.cured && !c.sick, 'tea cup 2 cures Ague');
  const m = bubby('quick', 'child'); R.getSick(m, 'x', T0, 'moonflu'); m.sickT = 100;
  r = R.useItem(m, 'tea', T0); check(r.ok && m.sick && m.sickT === 70 && m.doses === 2, 'tea only soothes Dancing Plague: sickT 100 -> ' + m.sickT);
  r = R.useItem(m, 'tea', T0); check(!r.ok && /moment/.test(r.msg), 'tea has a cooldown: ' + r.msg);
  m.teaCd = 0; R.useItem(m, 'tea', T0); eq(m.sickT, 40, 'soothing works again after the cooldown');

  // Theriac, and the Medicine button picks the best medicine you have
  const b = bubby('quick', 'child', { inv: { elixir: 1 } }); R.getSick(b, 'x', T0, 'blight');
  eq(R.bestMed(b), 'elixir', 'with no matching medicine the Elixir is picked');
  b.inv.tonic = 1; eq(R.bestMed(b), 'tonic', 'the matching medicine beats the Elixir');
  R.doAction(b, 'med', T0); R.doAction(b, 'med', T0); r = R.doAction(b, 'med', T0);
  check(!b.sick && b.inv.tonic === 0, 'three Four Thieves Vinegars cure The Plague via the Medicine button');
  const e = bubby('quick', 'child', { inv: { elixir: 1 } }); R.getSick(e, 'x', T0, 'blight');
  r = R.useItem(e, 'elixir', T0); check(r.cured && !e.sick && e.inv.elixir === 0, 'Theriac cures at once');
  eq(R.bestMed(bubby('quick')), 'tea', 'a healthy Bubby: tea');
  r = R.doAction(bubby('quick'), 'med', T0); check(!r.ok && /isn.t sick/.test(r.msg), 'medicine for a healthy Bubby is refused');

  // Plague Doctor’s Posy blocks illness for a while (scaled by pace) and runs out
  const i = bubby('quick', 'child', { inv: { shield: 1 } });
  r = R.useItem(i, 'shield', T0); check(r.ok && i.immuneT === 240, 'Plague Doctor’s Posy: 240 s on Quick');
  R.getSick(i, 'poop', T0); check(!i.sick, 'no illness while protected');
  R.step(i, 300, T0 + 300e3, null); eq(i.immuneT, 0, 'protection runs out');
  const ic = bubby('chill', 'child', { inv: { shield: 1 } }); R.useItem(ic, 'shield', T0);
  eq(ic.immuneT, 240 * 450, 'on Chill the protection lasts 30 hours');

  // Illnesses are worse in different ways: decay and how long Bubby can stay ill
  const dec = k => { const x = bubby('quick', 'child', { hunger: 4, happy: 4 }); R.getSick(x, 'x', T0, k); const h0 = x.hunger; R.step(x, 10, T0, null); return h0 - x.hunger; };
  check(dec('blight') > dec('moonflu') && dec('moonflu') > dec('itchymoss') && dec('itchymoss') > dec('sporecough'), 'worse illnesses drain hunger faster');
  const lim = k => { const x = bubby('quick', 'child', { hunger: 4, happy: 4 }); R.getSick(x, 'x', T0, k); let t = 0; while (!x.ended && t < 400) { R.step(x, 1, T0 + t * 1000, null); t++; x.hunger = 4; x.happy = 4; } return t; };
  check(lim('blight') < lim('itchymoss') && lim('sporecough') > lim('itchymoss'), `untreated limits: blight ${lim('blight')}s < moss ${lim('itchymoss')}s < cough ${lim('sporecough')}s`);
}

/* ---------- Nothing new punishes absence ---------- */
{
  // Chill, asleep with the lights on, nobody watching for a whole night: no Dancing Plague, and no sleep bonus
  const S = bubby('chill', 'adult', { hunger: 4, happy: 4, variant: 'daisy', race: 'puddle' });
  R.fallAsleep ? 0 : 0;
  Object.assign(S, { asleep: true, lights: true, sleepT: 0, litSleep: 0, litTotal: 0, lastT: new Date('2026-11-16T22:30:00').getTime() });
  S.nextTantrum = 1e9;
  const before = S.points;
  R.advance(S, new Date('2026-11-17T07:00:00').getTime(), null);
  check(!S.sick || S.disease !== 'moonflu', 'no Dancing Plague from lights left on overnight while away');
  check(S.litTotal > 3 * 3600, 'the lit hours are still counted: ' + Math.round(S.litTotal / 3600) + ' h');
  R.advance(S, new Date('2026-11-17T08:30:00').getTime(), null);
  check(!S.asleep, 'Bubby woke up'); eq(S.tot.sleep || 0, 0, 'no good-night bonus when the lights stayed on');
  // Lights off: the bonus is paid
  const G = bubby('chill', 'adult', { hunger: 4, happy: 4, variant: 'daisy', race: 'puddle' });
  Object.assign(G, { asleep: true, lights: false, sleepT: 0, lastT: new Date('2026-11-16T22:30:00').getTime() }); G.nextTantrum = 1e9;
  R.advance(G, new Date('2026-11-17T08:30:00').getTime(), null);
  eq(G.tot.sleep, 1, 'a good night with the lights off pays the sleep bonus');
  check(G.ptsDay && G.ptsDay.care >= R.PTS.sleep, 'sleep points count toward the care cap');
  // Watching (popup open) a lit sleep for 18 seconds does give Dancing Plague
  const NIGHT = new Date('2026-11-16T23:00:00').getTime();
  const W = bubby('chill', 'adult', { asleep: true, lights: true, hunger: 4, happy: 4, variant: 'daisy' });
  for (let t = 0; t < 20 && !W.sick; t++) R.step(W, 1, NIGHT + t * 1000, { game: false, busy: false });
  eq(W.disease, 'moonflu', 'watching a lit sleep for ~18 s gives Dancing Plague');
  // Quick pace: same
  const Q = bubby('quick', 'child', { asleep: true, lights: true, hunger: 4, happy: 4 });
  for (let t = 0; t < 20 && !Q.sick; t++) R.step(Q, 1, T0 + t * 1000, null);
  eq(Q.disease, 'moonflu', 'on Quick a lit sleep gives Dancing Plague');
  // Nobody there (1.1.2): the egg waits to hatch until you open Bubby, so a newborn is never left alone
  const L = R.fresh(1, { pace: 'chill' }, T0); R.advance(L, T0 + 14 * DAY);
  check(L.stage === 'seed' && L.eggReady && !L.ended && L.mistakes === 0, 'an unattended egg waits to hatch, unharmed');
  eq(L.events.filter(e => e.type === 'ready').length, 1, 'one "ready to hatch" event (one notification)');
  // Once hatched, a whole life with nobody there still ends exactly as before (no new way to die)
  R.advance(L, T0 + 14 * DAY + 1000, { game: false, busy: false }); eq(L.stage, 'baby', 'the egg hatches as soon as you look');
  R.advance(L, T0 + 28 * DAY);
  check(L.ended && ['away', 'garden'].includes(L.ended.kind), 'an unattended life still ends: ' + (L.ended && L.ended.kind));
}

/* ---------- Points ---------- */
{
  // Care points stop at the daily cap
  const S = bubby('quick', 'child', { points: 0, hunger: 0, happy: 0 });
  S.ptsDay = { k: R.dayKey(T0), care: 29, game: 0, noted: {} }; S.ach = { bite: true };   // First Bite already earned, so only the cap is measured
  R.doAction(S, 'meal', T0); eq(S.points, 1, 'the last care point under the cap is paid');
  S.hunger = 0; R.doAction(S, 'meal', T0); eq(S.points, 1, 'care points over the cap are not paid');
  check(S.events.some(e => /maxed/.test(e.text)), 'the cap is announced once');
  S.hunger = 0; R.doAction(S, 'meal', T0); eq(S.events.filter(e => /maxed/.test(e.text)).length, 1, '... and only once');
  // A new day resets the cap
  S.hunger = 0; const before = S.points; R.doAction(S, 'meal', T0 + DAY); eq(S.points, before + 1, 'care points work again the next day');

  // Cleaning pays per poop; scolding only pays for a real tantrum
  const C = bubby('quick', 'child', { points: 0 }); C.poops = [{ t: 0 }, { t: 0 }, { t: 0 }];
  R.doAction(C, 'clean', T0); eq(C.points, 3, 'three poops cleaned = 3 points');
  R.doAction(C, 'scold', T0); eq(C.points, 3, 'scolding a well-behaved Bubby pays nothing');
  C.call = { reason: 'tantrum', t: 0, counted: false }; R.doAction(C, 'scold', T0); eq(C.points, 3 + R.PTS.scold, 'scolding a tantrum pays');

  // Daily check-in, streak and milestones
  const D = R.fresh(1, { pace: 'quick' }, T0); Object.assign(D, { stage: 'child', hunger: 2, happy: 2, points: 0 });
  let r = R.checkIn(D, T0); check(r.newDay && r.daily === 10 && D.streak === 1 && r.gift, 'first day: 10 points and the gift');
  eq(D.hunger, 3, 'the gift adds a heart'); r = R.checkIn(D, T0 + 3600e3); check(!r.newDay, 'a second visit the same day pays nothing');
  r = R.checkIn(D, T0 + DAY); check(r.daily === 12 && D.streak === 2, 'day 2: 10 + 2');
  r = R.checkIn(D, T0 + 2 * DAY); check(D.streak === 3 && r.daily === 14 && r.mile === 3 && r.milePts === 10, '3-day streak bonus: +10');
  for (let d = 3; d < 7; d++) r = R.checkIn(D, T0 + d * DAY);
  check(D.streak === 7 && r.mile === 7 && r.milePts === 30 && r.daily === 20, 'day 7: the daily bonus tops out at 20, plus the 7-day bonus of 30');
  r = R.checkIn(D, T0 + 10 * DAY); check(D.streak === 1 && D.streakMs === 0 && r.daily === 10, 'a missed day resets the streak');
  const sd = R.fresh(1, { pace: 'quick' }, T0); r = R.checkIn(sd, T0); check(r.newDay && !r.gift && r.daily === 10, 'a seed gets the points but no heart gift');

  // Daily quests: three a day, each pays, finishing all three pays a bonus; new ones each day
  const Q = bubby('quick', 'child', { points: 0 }); Q.quests = null;
  const quests = R.ensureQuests(Q, T0); eq(quests.list.length, 3, 'three quests a day');
  check(new Set(quests.list.map(q => q.id)).size === 3, 'the quests are all different');
  Q.quests = { day: R.dayKey(T0), all: false, list: [{ id: 'feed', ev: 'feed', need: 2, text: 'f', have: 0, done: false }, { id: 'clean', ev: 'clean', need: 1, text: 'c', have: 0, done: false }, { id: 'win', ev: 'win', need: 1, text: 'w', have: 0, done: false }] };
  R.bump(Q, 'feed', T0); check(!Q.quests.list[0].done, 'half a quest pays nothing yet');
  R.bump(Q, 'feed', T0); check(Q.quests.list[0].done && Q.points === R.PTS.quest, 'a finished quest pays 8');
  R.bump(Q, 'clean', T0); R.bump(Q, 'win', T0);
  check(Q.quests.all && Q.points === 3 * R.PTS.quest + R.PTS.questAll, 'all three done pays the +10 bonus: ' + Q.points);
  R.bump(Q, 'clean', T0); eq(Q.points, 3 * R.PTS.quest + R.PTS.questAll, 'a finished quest does not pay twice');
  const next = R.ensureQuests(Q, T0 + DAY); check(next.day === R.dayKey(T0 + DAY) && next.list.every(q => !q.done), 'new quests the next day');

  // Goals pay once
  const Gl = bubby('quick', 'child', { points: 0 });
  R.bump(Gl, 'feed', T0); const n = R.checkGoals(Gl, T0); check(n === 1 && Gl.ach.bite && Gl.points >= R.PTS.quest * 0 + 5, 'First Bite goal pays once');
  eq(R.checkGoals(Gl, T0), 0, 'a goal does not pay twice');

  // Minigame points
  const Mg = bubby('quick', 'child', { points: 0 });
  let got = R.finishGame(Mg, 1, { kind: 'guess', score: 5 }, T0); eq(got, 13, '"Which way?" 5/5 pays 5×2 + 3 = 13');
  got = R.finishGame(Mg, 0, { kind: 'guess', score: 2 }, T0); eq(got, 4, '2/5 pays 4');
  got = R.finishGame(Mg, 2, { kind: 'catch', score: 21 }, T0); eq(got, 10, 'Seed catch 21 pays 10 (first best: no best bonus)');
  got = R.finishGame(Mg, 2, { kind: 'catch', score: 30 }, T0); eq(got, 15 + R.PTS.catchBest, 'a new best pays +5');
  check(Mg.tot.win >= 3 && Mg.tot.bestCatch === 30 && Mg.stats.bestCatch === 30, 'wins and the best score are tracked');
  const cap = bubby('quick', 'child', { points: 0 }); cap.ptsDay = { k: R.dayKey(T0), care: 0, game: 58, noted: {} };
  eq(R.finishGame(cap, 1, { kind: 'guess', score: 5 }, T0), 2, 'game points stop at the daily cap of 60');
  eq(R.finishGame(bubby('quick'), 1, null, T0), 0, 'finishGame without a result pays nothing (old behaviour)');
}

/* ---------- Shop ---------- */
{
  const S = bubby('quick', 'child', { points: 30, inv: {} });
  let r = R.buy(S, 'salad', T0); check(r.ok && S.points === 24 + 5 && S.inv.salad === 1, 'buying Garden Salad costs 6 (the Shopper goal then pays 5): ' + S.points);
  r = R.buy(S, 'feast', T0); check(!r.ok && S.points < 30 && !S.inv.feast, 'cannot afford the Golden Feast: ' + r.msg);
  S.points = 1000; for (let i = 0; i < 12; i++) R.buy(S, 'syrup', T0);
  eq(S.inv.syrup, 9, 'stock is capped at 9'); r = R.buy(S, 'syrup', T0); check(!r.ok, 'a full shelf refuses: ' + r.msg);
  eq(R.buy(S, 'nope', T0).ok, false, 'unknown items are refused');
  // Shop food
  const F = bubby('quick', 'child', { hunger: 1, happy: 1, inv: { pie: 1, feast: 1, salad: 1 }, points: 0 });
  r = R.useItem(F, 'pie', T0); check(r.ok && F.hunger === 2 && F.happy === 2 && F.inv.pie === 0 && r.food === 'pie', 'Sunberry Pie: +1 hunger, +1 happy');
  r = R.useItem(F, 'feast', T0); check(F.hunger === 4 && F.happy === 4 && F.weight >= 3, 'Golden Feast fills both');
  r = R.useItem(F, 'salad', T0); check(!r.ok && /full/.test(r.msg) && F.inv.salad === 1, 'a full Bubby refuses and keeps the food');
  eq(R.useItem(bubby('quick'), 'pie', T0).ok, false, 'food you do not own is refused');
  const sp = bubby('quick', 'child', { hunger: 1, happy: 1, inv: { salad: 1 } }); const w0 = sp.weight; R.useItem(sp, 'salad', T0); eq(sp.weight, w0, 'Garden Salad adds no weight');
  // The picker lists what you own
  check(JSON.stringify(R.pickIds(bubby('quick', 'child', { inv: { salve: 2, pie: 1 } }), 'med')) === JSON.stringify(['tea', 'salve']), 'the cabinet lists Tea plus owned medicine');
  check(JSON.stringify(R.pickIds(bubby('quick', 'child', { inv: { salve: 2, pie: 1 } }), 'food')) === JSON.stringify(['pie']), 'the pantry lists owned food');
}

/* ---------- Carrying over and old saves ---------- */
{
  const S = bubby('chill', 'adult', { points: 77, inv: { pie: 2 }, dex: ['puddle', 'puddle:daisy'], streak: 4, rareMiss: 3, race: 'puddle', variant: 'daisy' });
  S.tot = { feed: 9 }; S.ach = { bite: true }; S.stats.bestCatch = 12;
  const N = R.nextLife(S, 2, T0);
  check(N.stage === 'seed' && N.gen === 2 && N.race === null && !N.sick, 'a new life starts as a seed');
  check(N.points === 77 && N.inv.pie === 2 && N.dex.length === 2 && N.streak === 4 && N.rareMiss === 3 && N.tot.feed === 9 && N.ach.bite && N.stats.bestCatch === 12, 'points, shop stock, Bubbydex, streak and goals carry over');
  eq(N.cfg.pace, 'chill', 'settings carry over');

  // A v1.0.0 save has none of the new fields
  const old = JSON.parse(JSON.stringify(R.fresh(3, { pace: 'classic' }, T0)));
  for (const k of ['race', 'dex', 'disease', 'points', 'inv', 'tot', 'ach', 'quests', 'ptsDay', 'streak', 'streakMs', 'lastCheckIn', 'rareMiss', 'immuneT', 'teaCd', 'litSleep', 'litTotal']) delete old[k];
  Object.assign(old, { stage: 'adult', variant: 'thistle', sick: true, doses: 2 });
  const M = R.migrate(old, T0);
  check(M && M.race === 'leafling' && M.disease === 'sporecough' && M.points === 25 && Array.isArray(M.dex), 'an old save becomes a Leafling with Ague and the starter points');
  check(M.dex.includes('leafling') && M.dex.includes('leafling:thistle'), 'its adult form is in the Bubbydex');
  eq(R.migrate({ v: 1 }), null, 'unknown versions are still rejected');
}

/* ---------- Personalities and passive behaviours (1.2.0) ---------- */
{
  const ax = o => ({ energy: 0, appetite: 0, manners: 0, nerve: 0, health: 0, ...o });
  const who = (o, quirks = ['explorer', 'cuddle']) => bubby('quick', 'child', { persona: { axes: ax(o), quirks, known: { q: 0, axes: [] } } });
  // Every new seed has a personality leaning its race's way
  const S = R.fresh(1, { pace: 'chill' }, T0);
  check(!!(S.persona && S.persona.axes && S.persona.quirks.length === 2 && Array.isArray(S.journal)), 'a new seed has a personality and a journal');
  const avg = (race, axis) => { let t = 0; for (let i = 0; i < 3000; i++) t += Pe.rollPersona(race).axes[axis]; return t / 3000; };
  check(avg('emberling', 'nerve') > .5 && avg('shroomling', 'nerve') < -.5, 'races lean the personality (Emberlings brave, Shroomlings timid)');
  check([...Array(500)].every(() => { const q = Pe.rollPersona('puddle').quirks; return q[0] !== q[1] && !(q.includes('neat') && q.includes('mudpie')); }), 'two different quirks, never Neat-freak with Mud-pie');
  // The numbers
  const drain = o => { const x = who(o, ['explorer', 'cuddle']); x.hunger = 4; x.happy = 4; R.step(x, 20, T0, null); return [4 - x.hunger, 4 - x.happy]; };
  check(drain({ appetite: 2 })[0] > drain({})[0] && drain({ appetite: -2 })[0] < drain({})[0], 'a Peckish Bubby gets hungry faster, a Picky one slower');
  check(drain({ energy: 2 })[1] > drain({})[1], 'a Playful Bubby gets bored faster');
  const picky = who({ appetite: -2 }); picky.hunger = 0.5;
  check([...Array(50)].every(() => { const r = R.doAction(picky, 'meal', T0); picky.hunger = 0.5; return r.ok; }), 'a picky eater never refuses a meal when it is really hungry');
  const g = who({ energy: 2 }); g.happy = 0; R.finishGame(g, 1); eq(+g.happy.toFixed(2), 1.4, 'a Playful Bubby gets more out of a won game');
  const hardy = who({ health: 2 }), deli = who({ health: -2 });
  R.getSick(hardy, 'x', T0, 'sporecough'); R.getSick(deli, 'x', T0, 'blight');
  check(hardy.doses === 2 && deli.doses === 2, `Hardy needs one more dose, Delicate one fewer (got ${hardy.doses}, ${deli.doses})`);
  deli.inv = { tonic: 2 }; deli.happy = 2; R.useItem(deli, 'tonic', T0); R.useItem(deli, 'tonic', T0);
  check(!deli.sick && deli.happy === 2.25, 'medicine cheers a Delicate Bubby up when it is cured');
  const brat = who({ manners: 2 }); brat.call = { reason: 'tantrum', t: 0, counted: false }; R.doAction(brat, 'scold', T0); eq(brat.discipline, 17, 'a Bratty Bubby learns less from a scold');
  // Discovering it
  const D = R.fresh(1, { pace: 'quick' }, T0); D.persona.axes.energy = 2;
  R.evolve(D, 'baby', T0); eq(D.persona.known.q, 1, 'hatching reveals the first quirk');
  check(D.events.some(e => e.type === 'learn'), 'and says so');
  R.evolve(D, 'child', T0); eq(D.persona.known.q, 2, 'a Bud reveals the second quirk');
  check(Pe.revealAxis(D, 'energy') && D.persona.known.axes.includes('energy') && !Pe.revealAxis(D, 'energy'), 'a trait is revealed once');
  R.evolve(D, 'adult', T0); check(Pe.AXIS_IDS.every(a => !D.persona.axes[a] || D.persona.known.axes.includes(a)), 'a Blossom reveals everything');
  // Carried over and old saves
  const J = bubby('chill', 'adult', { journal: ['ball', 'read'] }); const N = R.nextLife(J, 2, T0);
  check(N.journal.length === 2 && N.persona !== J.persona, 'the journal carries over; the new seed gets its own personality');
  const old = JSON.parse(JSON.stringify(R.fresh(3, { pace: 'chill' }, T0))); delete old.persona; delete old.journal;
  Object.assign(old, { stage: 'child', race: 'puddle', seedRace: 'puddle' });
  const M = R.migrate(old, T0);
  check(M.persona && M.persona.known.q === 2 && Array.isArray(M.journal) && M.events.some(e => e.type === 'learn'), 'an older Bud gets a personality with both quirks known');
  // Behaviours
  const src = readFileSync(new URL('../extension/popup/behave.js', import.meta.url), 'utf8');
  const missing = B.BEHAVIORS.filter(b => !new RegExp(`\\b${b.id}: \\{`).test(src)).map(b => b.id);
  check(B.TOTAL >= 80 && !missing.length, `${B.TOTAL} behaviours, each with an animation${missing.length ? ' (missing: ' + missing + ')' : ''}`);
  const share = (o, quirks, cat) => { const x = who(o, quirks); x.hunger = 2.5; x.happy = 2.5; x.journal = B.BEHAVIORS.map(b => b.id); let n = 0; for (let i = 0; i < 4000; i++) if (B.pickBehavior(x, [], T0).cat === cat) n++; return n / 4000; };
  check(share({ energy: -2 }, ['bookworm', 'dreamer'], 'calm') > 2 * share({ energy: 2 }, ['jokester', 'showoff'], 'calm'), 'a Serious Bookworm does calm things far more than a Playful Jokester');
  const sad = who({}); sad.happy = 0.5; check([...Array(300)].some(() => B.pickBehavior(sad, [], T0).id === 'cry'), 'a sad Bubby sometimes cries');
  const fine = who({}); fine.happy = 3; check([...Array(300)].every(() => B.pickBehavior(fine, [], T0).id !== 'cry'), 'a happy Bubby never cries');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
