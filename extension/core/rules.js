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
  // bedAsked: the welcome page's bedtime question was answered. dev: show developer tools (time skip) in settings.
  return { pace: 'chill', bed: 22 * 60, wake: 8 * 60, notify: true, sound: true, look: 'toy', bedAsked: false, dev: false };
}

export function fresh(gen = 1, cfg = defaultCfg(), now = Date.now()) {
  return {
    v: 2, gen, cfg: { ...defaultCfg(), ...cfg },
    stage: 'seed', stageT: 0, age: 0, born: now, lastT: now,
    hunger: 4, happy: 4, discipline: 0, weight: 1,
    poops: [], sick: false, doses: 0, sickT: 0, sickCounted: false, sickMeter: 0, neglectT: 0, starveT: 0,
    asleep: false, lights: true, awakeT: 0, sleepT: 0,
    call: null, mistakes: 0, snacks: [], variant: null, chubby: false,
    ended: null, paused: false, nextPoop: 30, nextTantrum: 55,
    stats: { meals: 0, snacks: 0, games: 0, wins: 0, cleans: 0, meds: 0, scolds: 0, sick: 0, bestCatch: 0 },
    events: [], evSeq: 0, notifiedSeq: 0, seenSeq: 0,
    notif: { day: '', count: 0, lastAt: 0 },
  };
}

export function stageName(S) {
  if (S.stage === 'adult') return FORMS[S.variant] || 'Blossom';
  if (S.stage === 'senior') return 'Elder ' + (FORMS[S.variant] || 'Blossom').replace(' Blossom', '');
  return NAMES[S.stage];
}
export function healthyMax(stage) { return STAGE[stage].base ? Math.round(STAGE[stage].base * 1.6) : 99; }
export function dayNumber(S) { return Math.floor(S.age / pace(S).day); }

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

/* ---------- Life events ---------- */
function mistake(S) { S.mistakes++; }
function startCall(S, reason, now) {
  S.call = { reason, t: 0, counted: false };
  say(S, 'call', CALL_TEXT[reason], now, { reason });
}
export function getSick(S, cause, now) {
  if (S.sick) return;
  const st = STAGE[S.stage];
  S.sick = true; S.sickT = 0; S.sickCounted = false; S.sickMeter = 0;
  S.doses = Math.round(rand(st.doses[0], st.doses[1]));
  S.stats.sick++;
  say(S, 'sick', cause === 'sweets' ? 'Too many sweets! Bubby has a toothache.' : 'Bubby feels sick. It needs medicine.', now);
}
function fallAsleep(S, now) {
  S.asleep = true; S.sleepT = 0;
  if (S.call && S.call.reason === 'tantrum') S.call = null;
  say(S, 'sleep', S.lights ? 'Bubby fell asleep. Lights off, please.' : 'Bubby fell asleep.', now);
}
function wake(S, now) {
  S.asleep = false; S.awakeT = 0; S.lights = true;
  say(S, 'wake', 'Good morning, Bubby!', now);
}

export function evolve(S, to, now) {
  const from = S.stage;
  if (to === 'baby') S.weight = STAGE.baby.base;
  else S.weight += STAGE[to].base - STAGE[from].base;
  if (to === 'adult') {
    let tier = S.mistakes <= 2 && S.discipline >= 75 ? 0 : (S.mistakes <= 6 && S.discipline >= 25 ? 1 : 2);
    if (S.weight - (STAGE.adult.base - STAGE.child.base) > healthyMax('child')) { S.chubby = true; tier = Math.min(2, tier + 1); }
    S.variant = ['radiant', 'daisy', 'thistle'][tier];
  }
  S.stage = to; S.stageT = 0;
  S.nextPoop = rand(...STAGE[to].poop) * pace(S).kPoop;
  if (to === 'baby') { S.awakeT = 0; S.nextTantrum = pace(S).clock ? rand(10, 25) : 55; }
  const msg = to === 'baby' ? 'The seed sprouted! Meet Bubby the Bulb.'
    : to === 'child' ? 'Bubby grew into a Bud!'
    : to === 'adult' ? `Bubby blossomed into a ${FORMS[S.variant]}!`
    : 'Bubby is an Elder now. Take it easy.';
  say(S, 'evolve', msg, now, { from, to });
}

function end(S, kind, now) {
  S.ended = { kind, age: S.age, stage: S.stage, name: stageName(S), mistakes: S.mistakes, gen: S.gen, day: dayNumber(S) };
  S.call = null;
  say(S, 'end', kind === 'garden' ? 'Bubby returned to the garden after a full life.' : 'Bubby packed up and moved away.', now, { kind });
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
  if (S.stage === 'seed') { if (S.stageT >= P.dur.seed) evolve(S, 'baby', now); return; }
  const st = STAGE[S.stage];
  const inGame = !!(live && live.game);

  // Day and night
  if (S.asleep) {
    S.sleepT += dt;
    if (S.lights) S.happy -= dt / (40 * kG);
    if (P.clock ? !isBedtime(S, now) : S.sleepT >= st.sleep) wake(S, now);
  } else {
    S.awakeT += dt;
    if (!S.lights) S.happy -= dt / (70 * kG);
    // Real time: a newborn stays up for 30 minutes even if it is born at bedtime.
    const sleepy = P.clock ? (isBedtime(S, now) && S.awakeT >= 1800) : S.awakeT >= st.awake;
    if (sleepy && !inGame) fallAsleep(S, now);
  }

  // Meters
  let m = S.asleep ? 0.15 : 1;
  if (S.sick) m *= 1.6;
  S.hunger = clamp(S.hunger - st.hr / kN * m * dt, 0, 4);
  S.happy = clamp(S.happy - st.pr / kN * m * dt - 0.004 / kN * S.poops.length * dt, 0, 4);

  // Poop
  if (!S.asleep) {
    S.nextPoop -= dt;
    if (S.nextPoop <= 0) {
      if (S.poops.length < 4) { S.poops.push({ t: 0 }); say(S, 'poop', 'Bubby pooped.', now); }
      S.nextPoop = rand(...st.poop) * P.kPoop;
    }
  }
  let old = 0, newlyOld = false;
  for (const p of S.poops) {
    p.t += dt;
    if (p.t > 12 * kG) { old++; if (!p.warned) { p.warned = true; newlyOld = true; } }
  }
  if (newlyOld && P.clock) say(S, 'dirty', 'The garden is getting dirty. Clean it before Bubby gets sick.', now);
  S.sickMeter += dt * old;
  if (S.weight > st.base * 2) S.sickMeter += dt * 0.3;
  if (!S.sick && S.sickMeter >= 45 * kG) getSick(S, 'poop', now);

  // Neglect
  if (S.hunger <= 0 && S.happy <= 0) S.neglectT += dt; else S.neglectT = Math.max(0, S.neglectT - dt);
  if (!S.sick && S.neglectT > 30 * kG) getSick(S, 'neglect', now);
  S.starveT = S.hunger <= 0 ? S.starveT + dt : 0;
  if (S.sick) {
    S.sickT += dt;
    if (S.sickT >= 60 * kG && !S.sickCounted) { S.sickCounted = true; mistake(S); say(S, 'mistake', 'Bubby stayed sick too long.', now); }
  }
  if (S.sickT >= P.awaySick || S.starveT >= P.awayStarve) { end(S, 'away', now); return; }

  // Tantrums. In real-time paces they only happen while you are looking (popup open), never as a
  // notification: a fake-out call is fun to catch, but annoying to be woken up by.
  if (P.clock && !live && S.call && S.call.reason === 'tantrum') S.call = null;
  const tantrumClock = P.clock ? !!live : true;
  if (tantrumClock && !S.asleep && S.lights && !S.call && S.stage !== 'senior' && !inGame) {
    S.nextTantrum -= dt;
    if (S.nextTantrum <= 0) {
      if (S.hunger >= 2 && S.happy >= 2 && !S.sick && S.discipline < 100) startCall(S, 'tantrum', now);
      S.nextTantrum = P.clock ? rand(25, 50) + S.discipline * 0.4 : rand(45, 80) + S.discipline * 0.8;
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

export function doAction(S, a, now = Date.now()) {
  if (a === 'lights') return toggleLights(S, now);
  const no = canCare(S);
  if (no) return { ok: false, msg: no };
  switch (a) {
    case 'meal': {
      if (S.hunger >= 3.999) return { ok: false, msg: 'Bubby is full', anim: 'no' };
      S.hunger = clamp(S.hunger + 1, 0, 4); S.weight += 1; S.stats.meals++; S.nextPoop -= 4 * pace(S).kPoop;
      return { ok: true, msg: 'Yum! A good meal', anim: 'eat-meal' };
    }
    case 'snack': {
      const kG = pace(S).kGrace;
      S.happy = clamp(S.happy + 1, 0, 4); S.weight += 2; S.stats.snacks++;
      S.snacks = S.snacks.filter(t => S.age - t < 45 * kG); S.snacks.push(S.age);
      const r = { ok: true, msg: 'Sweet! Bubby loves snacks', anim: 'eat-snack' };
      if (S.snacks.length >= 3 && Math.random() < 0.6) { S.snacks = []; getSick(S, 'sweets', now); r.msg = 'Too many sweets! Bubby has a toothache'; }
      return r;
    }
    case 'clean': {
      if (!S.poops.length) return { ok: false, msg: 'The garden is already clean', anim: 'sparkle' };
      S.poops = []; S.sickMeter = 0; S.happy = clamp(S.happy + 0.25, 0, 4); S.stats.cleans++;
      return { ok: true, msg: 'All clean!', anim: 'clean' };
    }
    case 'med': {
      if (!S.sick) return { ok: false, msg: 'Bubby isn’t sick', anim: 'no' };
      S.doses--; S.stats.meds++;
      if (S.doses <= 0) {
        S.sick = false; S.sickT = 0; S.sickCounted = false; S.neglectT = 0; S.sickMeter = 0; S.happy = clamp(S.happy - 0.5, 0, 4);
        return { ok: true, msg: 'All better!', anim: 'med' };
      }
      return { ok: true, msg: `Gulp. ${S.doses} more dose${S.doses > 1 ? 's' : ''} needed`, anim: 'med' };
    }
    case 'scold': {
      if (S.call && S.call.reason === 'tantrum') {
        S.discipline = clamp(S.discipline + 25, 0, 100); S.call = null; S.stats.scolds++;
        return { ok: true, msg: `Bubby behaves now. Discipline ${S.discipline}%`, anim: 'scold' };
      }
      S.happy = clamp(S.happy - 1, 0, 4);
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
      if (early) { S.asleep = true; S.sleepT = 0; if (S.call && S.call.reason === 'tantrum') S.call = null; return { ok: true, msg: 'Bubby went to bed. Sweet dreams' }; }
    }
    return { ok: true, msg: S.asleep ? 'Lights off. Sweet dreams' : 'Lights off' };
  }
  return { ok: true, msg: S.asleep ? 'Lights on. Bubby is still sleeping' : 'Lights on' };
}

// Minigame results (the games themselves run in the popup).
export function finishGame(S, happyGain) {
  S.stats.games++;
  S.weight = Math.max(Math.round(STAGE[S.stage].base * 0.8), S.weight - 1);
  if (happyGain) { S.happy = clamp(S.happy + happyGain, 0, 4); S.stats.wins++; }
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
  if (S.sick) return { act: 'med', label: `Give medicine (${S.doses} dose${S.doses > 1 ? 's' : ''})`, tone: 'urgent' };
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
  return S;
}
