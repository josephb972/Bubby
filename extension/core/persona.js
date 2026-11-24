// Bubby's personality. Pure logic, no DOM (shared by the popup, the background worker and tools).
//
// Every seed is planted with a race (content.js). The race leans the personality one way or another:
//   - five temperament sliders, from -2 to +2, with a name at both ends (these change the care numbers), and
//   - two quirks (these mostly change which passive behaviours show up).
// Every slider is a trade-off, so no Bubby is strictly harder than another. The effects are capped so every
// roll keeps the "check in 3-5 times a day" promise (see tools/sim-check.mjs).
// The personality is rolled from the seed's race when it is planted. If the Bud turns out to be the rare Starling,
// it keeps that personality (the Starling is a surprise), and rare behaviours just show up more often.

export const LEAN = {
  leafling:   { bias: { energy: 1, manners: -1 },    quirks: ['explorer', 'songbird', 'cuddle'],   blurb: 'Cheerful and friendly, and loves the outdoors.' },
  mossback:   { bias: { energy: -1, health: 1 },     quirks: ['bookworm', 'sleepy', 'mudpie'],    blurb: 'Calm, tough and a little sleepy.' },
  puddle:     { bias: { health: -1, appetite: -1 },  quirks: ['neat', 'dreamer', 'songbird'],     blurb: 'Gentle, tidy and loves water.' },
  shroomling: { bias: { nerve: -1, appetite: 1 },    quirks: ['dreamer', 'nightowl', 'bookworm'], blurb: 'Shy and dreamy, and always peckish.' },
  emberling:  { bias: { manners: 1, nerve: 1 },      quirks: ['showoff', 'diva', 'jokester'],     blurb: 'Bold and fiery, with plenty of attitude.' },
  starling:   { bias: {}, quirks: [], blurb: 'Rare! Anything can happen.' },
};

// [name at -2, name at +2]
export const AXES = {
  energy:   ['Serious', 'Playful'],
  appetite: ['Picky', 'Peckish'],
  manners:  ['Sweet', 'Bratty'],
  nerve:    ['Timid', 'Brave'],
  health:   ['Delicate', 'Hardy'],
};
export const AXIS_IDS = Object.keys(AXES);
export const AXIS_LABEL = { energy: 'Energy', appetite: 'Appetite', manners: 'Manners', nerve: 'Nerve', health: 'Health' };
export const AXIS_HELP = {
  energy:   ['Gets bored slowly; games cheer it less; learns discipline fast', 'Gets bored fast; games cheer it a lot'],
  appetite: ['Gets hungry slowly; sometimes pushes a meal away', 'Gets hungry fast; loves every meal and snack'],
  manners:  ['Rarely acts out; an unfair scold hurts more', 'Acts out often; harder to discipline'],
  nerve:    ['Scared of the dark', 'Not scared of anything; pokes at dirty things'],
  health:   ['Gets sick easily, but medicine cheers it up', 'Rarely sick, but hard to treat'],
};

export const QUIRKS = {
  jokester: { name: 'Jokester',   help: 'Tells jokes and pulls silly faces' },
  diva:     { name: 'Diva',       help: 'Sassy; loves to pose' },
  dreamer:  { name: 'Dreamer',    help: 'Daydreams and watches the clouds' },
  neat:     { name: 'Neat-freak', help: 'Hates poop; loves a clean garden' },
  mudpie:   { name: 'Mud-pie',    help: 'Messy and doesn’t mind poop' },
  cuddle:   { name: 'Cuddlebug',  help: 'Affectionate; waves and sends hearts' },
  explorer: { name: 'Explorer',   help: 'Curious about every bug and leaf' },
  songbird: { name: 'Songbird',   help: 'Sings, hums and dances' },
  showoff:  { name: 'Show-off',   help: 'Does tricks for an audience' },
  sleepy:   { name: 'Sleepyhead', help: 'Yawns a lot; needs extra sleep' },
  nightowl: { name: 'Night owl',  help: 'Livelier in the evening' },
  bookworm: { name: 'Bookworm',   help: 'Reads, writes and ponders' },
};
export const QUIRK_IDS = Object.keys(QUIRKS);

const pick = (arr, r = Math.random) => arr[Math.floor(r() * arr.length)];
// race: the race the seed is planted with (S.seedRace).
export function rollPersona(race, r = Math.random) {
  const L = LEAN[race] || LEAN.starling;
  const spread = !LEAN[race] || race === 'starling' ? [-2, -2, -1, 0, 1, 2, 2] : [-2, -1, -1, 0, 0, 0, 1, 1, 2];
  const axes = {};
  for (const a of AXIS_IDS) axes[a] = Math.max(-2, Math.min(2, (L.bias[a] || 0) + pick(spread, r)));
  const q1 = L.quirks.length && r() < 0.6 ? pick(L.quirks, r) : pick(QUIRK_IDS, r);
  // The second quirk: a different one, and never Neat-freak with Mud-pie (picked from a list, so it can't loop forever)
  const fits = q => q !== q1 && !(q1 === 'neat' && q === 'mudpie') && !(q1 === 'mudpie' && q === 'neat');
  const leanPool = L.quirks.filter(fits), anyPool = QUIRK_IDS.filter(fits);
  const q2 = leanPool.length && r() < 0.4 ? pick(leanPool, r) : pick(anyPool, r);
  // known: what the player has discovered so far.
  return { axes, quirks: [q1, q2], known: { q: 0, axes: [] } };
}

/* ---------- Effects on the care rules ---------- */
const NEUTRAL = {
  hunger: 1, happy: 1, game: 1, mealHappy: 0, snack: 1, refuse: 0, tantrum: 1, disc: 25, unfair: 1,
  dark: 1, sick: 1, doses: 0, cure: -0.5, poopMood: 1, cleanBonus: 0, poopGap: 1, awake: 1, stun: 1,
};
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
export function mods(S) {
  const p = S && S.persona;
  if (!p) return NEUTRAL;
  const a = p.axes, q = p.quirks || [], has = id => q.includes(id);
  const neg = v => Math.max(0, -v), pos = v => Math.max(0, v);
  return {
    hunger: cl(1 + 0.08 * a.appetite, 0.85, 1.2),          // hunger drain
    happy: cl(1 + 0.08 * a.energy, 0.85, 1.25),             // happiness drain
    game: cl(1 + 0.2 * a.energy, 0.6, 1.4),                 // happiness from a won game
    mealHappy: 0.1 * pos(a.appetite),                       // a meal also cheers a foodie up
    snack: 1 + 0.1 * a.appetite,                            // happiness from a snack
    refuse: 0.08 * neg(a.appetite),                         // chance a picky eater pushes a meal away
    tantrum: 1 - 0.15 * a.manners,                          // time between tantrums
    disc: 25 - 4 * a.manners + 5 * neg(a.energy),           // discipline from a fair scold
    unfair: 1 + 0.125 * neg(a.manners),                     // how much an unfair scold hurts
    dark: 1 + 0.5 * neg(a.nerve),                           // lights off while awake
    sick: cl((1 - 0.12 * a.health) * (1 + 0.05 * pos(a.nerve)), 0.7, 1.3), // sickness meter speed
    doses: a.health >= 2 ? 1 : (a.health <= -2 ? -1 : 0),
    cure: a.health < 0 ? 0.25 : -0.5,                       // happiness change when cured
    poopMood: has('neat') ? 1.5 : (has('mudpie') ? 0.5 : 1),
    cleanBonus: has('neat') ? 0.5 : 0,
    poopGap: has('mudpie') ? 0.9 : 1,
    awake: has('sleepy') ? 0.9 : 1,                         // Quick pace: time awake before bed
    stun: 1 + 0.25 * neg(a.nerve),                          // seed-catch: pebbles stun a timid Bubby longer
  };
}

/* ---------- Names ---------- */
export function poleName(axis, v) { return v === 0 ? null : AXES[axis][v > 0 ? 1 : 0]; }
const QUIRK_NOUN = { diva: 'Diva', neat: 'Neat-freak', mudpie: 'Mud-pie', cuddle: 'Cuddlebug', sleepy: 'Sleepyhead', nightowl: 'Night owl' };

// "Bratty Songbird". With known=true, only uses what the player has discovered.
export function title(S, known = true) {
  const p = S && S.persona; if (!p) return '';
  const k = p.known || { q: 0, axes: [] };
  const axes = AXIS_IDS.filter(a => p.axes[a] !== 0 && (!known || k.axes.includes(a)))
    .sort((x, y) => Math.abs(p.axes[y]) - Math.abs(p.axes[x]));
  const adj = axes.length ? AXES[axes[0]][p.axes[axes[0]] > 0 ? 1 : 0] : null;
  const q = !known || k.q > 0 ? p.quirks[0] : null;
  const noun = q ? (QUIRK_NOUN[q] || QUIRKS[q].name) : null;
  if (adj && noun) return `${adj} ${noun}`;
  if (noun) return noun;
  if (adj) return adj;
  return known ? '' : 'Easygoing';
}

/* ---------- Discovering the personality ---------- */
// Returns a short sentence for a toast, or null if nothing new was learned.
export function revealQuirk(S) {
  const p = S.persona; if (!p || p.known.q >= 2) return null;
  const q = p.quirks[p.known.q++];
  return `You noticed: Bubby is a ${QUIRKS[q].name}!`;
}
export function revealAxis(S, axis) {
  const p = S.persona; if (!p || p.known.axes.includes(axis) || !p.axes[axis]) return null;
  p.known.axes.push(axis);
  return `You noticed: Bubby is ${poleName(axis, p.axes[axis])}!`;
}
export function revealAll(S) {
  const p = S.persona; if (!p) return null;
  const before = p.known.q + p.known.axes.length;
  p.known.q = 2;
  p.known.axes = AXIS_IDS.filter(a => p.axes[a] !== 0);
  return p.known.q + p.known.axes.length > before ? `You know Bubby well now: a ${title(S)}.` : null;
}
// How far along the player is, for existing saves and stage changes.
export function revealForStage(S, stage) {
  if (stage === 'baby') return revealQuirk(S);
  if (stage === 'child') { const a = revealQuirk(S); return a; }
  if (stage === 'adult' || stage === 'senior') return revealAll(S);
  return null;
}
