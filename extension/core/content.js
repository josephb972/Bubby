// Bubby game content: races, illnesses, shop items and the points tables. Plain data, no DOM.
// Shared by the rules (core/rules.js), the artwork (art/sprites.js) and the popup.

/* ---------- Races ----------
   A race is rolled at random when the Bulb grows into a Bud. Five common races share the odds equally;
   the rare Starling gets a special reveal. Real-time lives last days, so the rare chance is higher on the
   slower paces, and every miss adds a little (RARE_PITY) until one lands.
   Colors: body = [ring, fill, light], bud = [ring, fill, line, highlight], leaf/collar = [ring, fill]. */
export const RARE_RACE = 'starling';
export const RARE_BASE = { quick: 0.05, classic: 0.08, chill: 0.12 };
export const RARE_PITY = 0.05, RARE_MAX = 0.6;
export const RACES = {
  leafling:   { name: 'Leafling',   body: ['#2f7d3a', '#5cbf5a', '#8ad98a'], foot: '#3f9a45', leaf: ['#2a6e35', '#47a852'], collar: ['#2a6e35', '#4fae55'], bud: ['#b9544a', '#f08f7a', '#d8705f', '#ffb7a3'], suit: false, tint: '#8ad98a' },
  mossback:   { name: 'Mossback',   body: ['#4b5a2c', '#86a04e', '#b8cf86'], foot: '#6b8040', leaf: ['#3d4a22', '#6f8a40'], collar: ['#3d4a22', '#7a9446'], bud: ['#6e5a2a', '#b59a52', '#8f7a3a', '#dcc888'], suit: true, tint: '#b8cf86' },
  puddle:     { name: 'Puddle',     body: ['#2a6aa0', '#4ba8e2', '#a0dcf8'], foot: '#3a8ac4', leaf: ['#22609a', '#3d9ad4'], collar: ['#22609a', '#46a2dc'], bud: ['#2a8aa8', '#6fd3e6', '#4fb8d0', '#bdf0f8'], suit: true, tint: '#6fd3e6' },
  shroomling: { name: 'Shroomling', body: ['#8a5a3a', '#c9966a', '#ecca9e'], foot: '#b07c52', leaf: ['#6e4528', '#a87a52'], collar: ['#6e4528', '#b88a5e'], bud: ['#a63636', '#e65a5a', '#c84444', '#ff9a9a'], suit: true, tint: '#e65a5a' },
  emberling:  { name: 'Emberling',  body: ['#b0431c', '#f0803a', '#ffbb80'], foot: '#d9622a', leaf: ['#9a3818', '#e0702e'], collar: ['#9a3818', '#e8782e'], bud: ['#d42a1a', '#ff9d2e', '#f06a1a', '#ffd27a'], suit: true, tint: '#ff9d2e' },
  starling:   { name: 'Starling',   body: ['#4a2f96', '#8d6de0', '#d4c4ff'], foot: '#6e50c4', leaf: ['#3e2784', '#7a58d0'], collar: ['#3e2784', '#8264d8'], bud: ['#c98f0a', '#ffe066', '#f0b820', '#fff3b0'], suit: true, tint: '#ffe066', rare: true },
};
export const COMMON_RACES = Object.keys(RACES).filter(k => !RACES[k].rare);
export const TIERS = [['radiant', 'Radiant'], ['daisy', 'Daisy'], ['thistle', 'Thistle']];
export const DEX_TOTAL = Object.keys(RACES).length * TIERS.length;
export const dexFound = S => (S.dex || []).filter(k => k.includes(':')).length;

/* ---------- Illnesses ----------
   Every illness has its own medicine. Garden Tea is free and always available: it cures Spore Cough slowly
   (two cups) and only soothes the others. Times are the Quick-pace seconds; the rules scale them to the pace.
   limitK scales how long an untreated illness may last before Bubby moves away (1 = the pace's normal limit). */
export const DISEASES = {
  sporecough: { name: 'Spore Cough', sev: 'Mild',   doses: 1, decay: 1.3, limitK: 1.06, med: 'syrup', tint: 'rgba(170,200,60,.30)',  sign: 'sneezes puffs of spores',      contagious: true },
  itchymoss:  { name: 'Itchy Moss',  sev: 'Medium', doses: 2, decay: 1.5, limitK: 1,    med: 'salve', tint: 'rgba(240,110,150,.32)', sign: 'scratches itchy moss',          contagious: true },
  moonflu:    { name: 'Moonflu',     sev: 'Medium', doses: 2, decay: 1.6, limitK: 1,    med: 'drops', tint: 'rgba(100,140,240,.34)', sign: 'shivers with a moonlit chill',  contagious: true },
  blight:     { name: 'The Blight',  sev: 'Severe', doses: 3, decay: 2.0, limitK: 0.81, med: 'tonic', tint: 'rgba(90,50,130,.42)',   sign: 'wilts under a dark blight',     contagious: true },
};

/* ---------- Shop items ----------
   kind: food (Feed menu), med (Medicine cabinet), care (cabinet, prevents illness). Prices are in points. */
export const MAX_STACK = 9;
export const ITEMS = {
  salad:  { kind: 'food', name: 'Garden Salad',    price: 6,  hunger: 1, happy: .5, weight: 0, icon: '#7ccf5a', desc: '+1 hunger, +½ happy, no weight gain' },
  pie:    { kind: 'food', name: 'Sunberry Pie',    price: 10, hunger: 1, happy: 1,  weight: 1, icon: '#c04a86', desc: '+1 hunger, +1 happy, never a toothache' },
  stew:   { kind: 'food', name: 'Hearty Stew',     price: 14, hunger: 2, happy: 0,  weight: 1, icon: '#d98a3a', desc: '+2 hunger' },
  feast:  { kind: 'food', name: 'Golden Feast',    price: 30, hunger: 4, happy: 4,  weight: 2, icon: '#f2c230', desc: 'Fills hunger and happiness' },
  syrup:  { kind: 'med',  name: 'Spore Syrup',     price: 8,  cures: ['sporecough'], dose: 1, icon: '#9bc53d', desc: 'Cures Spore Cough in 1 dose' },
  salve:  { kind: 'med',  name: 'Moss Salve',      price: 10, cures: ['itchymoss'],  dose: 1, icon: '#e86b8c', desc: 'Cures Itchy Moss, 1 dose each' },
  drops:  { kind: 'med',  name: 'Moon Drops',      price: 10, cures: ['moonflu'],    dose: 1, icon: '#6e96f0', desc: 'Cures Moonflu, 1 dose each' },
  tonic:  { kind: 'med',  name: 'Blight Tonic',    price: 25, cures: ['blight'],     dose: 1, icon: '#7a4aa8', desc: 'Cures The Blight, 1 dose each' },
  elixir: { kind: 'med',  name: 'Cure-All Elixir', price: 45, cures: 'all',          dose: 99, icon: '#f2c230', desc: 'Cures any illness at once' },
  shield: { kind: 'care', name: 'Immunity Tonic',  price: 20, icon: '#58c4b8', desc: 'Protects from illness for a while' },
};
export const TEA = { name: 'Garden Tea', cures: ['sporecough'], dose: .5, soothes: true };
export const IMMUNITY_SECS = 240;   // Quick pace; real-time paces stretch it by their grace multiplier
export const medIds = () => Object.keys(ITEMS).filter(k => ITEMS[k].kind !== 'food');
export const foodIds = () => Object.keys(ITEMS).filter(k => ITEMS[k].kind === 'food');

/* ---------- Points ----------
   Earned by playing, never bought with money, only spent in the Shop. Care and game points stop at a daily
   cap so they cannot be farmed. Everything else is uncapped (but happens once). */
export const PTS = {
  start: 25, daily: 10, streakStep: 2, streakSteps: 5,
  meal: 1, snack: 1, premium: 2, clean: 1, sleep: 3, scold: 2, cure: 5,
  guess: 2, guessPerfect: 3, catchDiv: 2, catchBest: 5,
  bud: 10, blossom: 25, elder: 20, garden: 30, rare: 50, dexRace: 5, dexForm: 15,
  quest: 8, questAll: 10,
};
export const CAPS = { care: 30, game: 60 };
export const STREAK_MS = [[3, 10], [7, 30], [14, 60], [30, 150]];
export const QUEST_POOL = [
  { id: 'feed',  ev: 'feed',    need: 3, text: 'Feed Bubby 3 times' },
  { id: 'clean', ev: 'clean',   need: 2, text: 'Clean up 2 times' },
  { id: 'games', ev: 'game',    need: 2, text: 'Play 2 games' },
  { id: 'win',   ev: 'win',     need: 1, text: 'Win a game' },
  { id: 'sleep', ev: 'sleep',   need: 1, text: 'Tuck Bubby in for the night' },
  { id: 'scold', ev: 'scold',   need: 1, text: 'Scold a tantrum' },
  { id: 'catch', ev: 'catch10', need: 1, text: 'Score 10 or more in Seed catch' },
];
const tot = (S, k) => (S.tot && S.tot[k]) || 0;
export const GOALS = [
  { id: 'bite',     name: 'First Bite',      desc: 'Feed Bubby',                 pts: 5,   of: 1,   val: S => tot(S, 'feed') },
  { id: 'foodie',   name: 'Foodie',          desc: 'Feed Bubby 25 times',        pts: 15,  of: 25,  val: S => tot(S, 'feed') },
  { id: 'tidy',     name: 'Tidy Gardener',   desc: 'Clean up 10 times',          pts: 10,  of: 10,  val: S => tot(S, 'clean') },
  { id: 'gamer',    name: 'Game Face',       desc: 'Win 5 games',                pts: 15,  of: 5,   val: S => tot(S, 'win') },
  { id: 'seedstar', name: 'Seed Star',       desc: 'Score 20 in Seed catch',     pts: 20,  of: 20,  val: S => tot(S, 'bestCatch') },
  { id: 'sleeper',  name: 'Sleepyhead',      desc: 'Tuck Bubby in 5 times',      pts: 15,  of: 5,   val: S => tot(S, 'sleep') },
  { id: 'doctor',   name: 'Little Doctor',   desc: 'Cure an illness',            pts: 10,  of: 1,   val: S => tot(S, 'cure') },
  { id: 'gdoctor',  name: 'Garden Doctor',   desc: 'Cure 5 illnesses',           pts: 30,  of: 5,   val: S => tot(S, 'cure') },
  { id: 'shopper',  name: 'Shopper',         desc: 'Buy something in the Shop',  pts: 5,   of: 1,   val: S => tot(S, 'buy') },
  { id: 'saver',    name: 'Saver',           desc: 'Earn 500 points in total',   pts: 50,  of: 500, val: S => tot(S, 'earned') },
  { id: 'elder',    name: 'Full Circle',     desc: 'Raise a Bubby to an Elder',  pts: 30,  of: 1,   val: S => tot(S, 'elder') },
  { id: 'star',     name: 'Starstruck',      desc: 'Meet a Starling',            pts: 40,  of: 1,   val: S => ((S.dex || []).includes('starling') ? 1 : 0) },
  { id: 'dex6',     name: 'Collector',       desc: 'Fill 6 Bubbydex forms',      pts: 25,  of: 6,   val: S => dexFound(S) },
  { id: 'dex12',    name: 'Curator',         desc: 'Fill 12 Bubbydex forms',     pts: 60,  of: 12,  val: S => dexFound(S) },
  { id: 'dex18',    name: 'Bubbydex Master', desc: 'Fill all 18 Bubbydex forms', pts: 150, of: 18,  val: S => dexFound(S) },
];
