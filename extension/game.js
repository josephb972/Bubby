(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const KEY = 'bubby.save.v1';
const INK = '#3b2f4a';
const SW = 100, SH = 75, GROUND = 67;
const RM = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
let REDUCED = RM.matches;
if (RM.addEventListener) RM.addEventListener('change', e => { REDUCED = e.matches; });
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ================= Game rules ================= */
// Times are game-seconds (1× speed = real seconds). Rates are hearts lost per second.
const STAGE = {
  seed:   { next: 'baby',   dur: 18 },
  baby:   { next: 'child',  dur: 180, hr: 1/22, pr: 1/28, poop: [30, 45], awake: 85,  sleep: 25, base: 5,  doses: [1, 2] },
  child:  { next: 'adult',  dur: 300, hr: 1/34, pr: 1/40, poop: [45, 65], awake: 120, sleep: 30, base: 10, doses: [1, 2] },
  adult:  { next: 'senior', dur: 420, hr: 1/48, pr: 1/52, poop: [55, 85], awake: 150, sleep: 35, base: 20, doses: [1, 3] },
  senior: { next: null,     dur: 240, hr: 1/58, pr: 1/58, poop: [65, 95], awake: 110, sleep: 45, base: 20, doses: [2, 3] },
};
const NAMES = { seed: 'Seed', baby: 'Bulb', child: 'Bud', adult: 'Blossom', senior: 'Elder' };
const FORMS = { radiant: 'Radiant Blossom', daisy: 'Daisy Blossom', thistle: 'Thistle' };
const CALL_TEXT = {
  hungry: 'Calling: tummy is empty. Feed a meal.',
  sad: 'Calling: feeling lonely. Play or snack.',
  sleep: 'Calling: asleep with lights on. Press SLEEP.',
  tantrum: 'Calling, but hearts are full. Acting out?',
};
const DAY = 60;

function stageName(s = S) {
  if (s.stage === 'adult') return FORMS[s.variant] || 'Blossom';
  if (s.stage === 'senior') return 'Elder ' + (FORMS[s.variant] || 'Blossom').replace(' Blossom', '');
  return NAMES[s.stage];
}
function healthyMax(stage) { return STAGE[stage].base ? Math.round(STAGE[stage].base * 1.6) : 99; }

function fresh(gen = 1, speed = 1) {
  return {
    v: 1, gen, speed, stage: 'seed', stageT: 0, age: 0,
    hunger: 4, happy: 4, discipline: 0, weight: 1,
    poops: [], sick: false, doses: 0, sickT: 0, sickCounted: false, sickMeter: 0, neglectT: 0, starveT: 0,
    asleep: false, lights: true, awakeT: 0, sleepT: 0,
    call: null, mistakes: 0, snacks: [], variant: null, chubby: false,
    ended: null, paused: false, nextPoop: 30, nextTantrum: 55,
    stats: { meals: 0, snacks: 0, games: 0, wins: 0, cleans: 0, meds: 0, scolds: 0, sick: 0 },
  };
}

let S = fresh();
let A = null;          // current animation {type, t, dur, ...}
let G = null;          // minigame state
const PET = { x: 40, tx: 40, dir: 1, wait: 1, moving: false };

function mistake(reason) {
  S.mistakes++;
}
function startCall(reason) {
  S.call = { reason, t: 0, counted: false };
  beepCall();
}
function getSick(cause) {
  if (S.sick) return;
  const st = STAGE[S.stage];
  S.sick = true; S.sickT = 0; S.sickCounted = false; S.sickMeter = 0;
  S.doses = Math.round(rand(st.doses[0], st.doses[1]));
  S.stats.sick++;
  toast(cause === 'sweets' ? 'Toothache from sweets!' : 'Bubby feels sick…');
  beep(330, .12); setTimeout(() => beep(260, .18), 140);
}
function fallAsleep() {
  S.asleep = true; S.sleepT = 0;
  if (S.call && S.call.reason === 'tantrum') S.call = null;
  if (S.lights) toast('Zzz… lights off please');
}
function wake() {
  S.asleep = false; S.awakeT = 0; S.lights = true;
  toast('Good morning!');
}

function evolve(to) {
  const from = S.stage;
  if (to === 'baby') S.weight = STAGE.baby.base;
  else S.weight += STAGE[to].base - STAGE[from].base;
  if (to === 'adult') {
    let tier = S.mistakes <= 2 && S.discipline >= 75 ? 0 : (S.mistakes <= 6 && S.discipline >= 25 ? 1 : 2);
    if (S.weight - (STAGE.adult.base - STAGE.child.base) > healthyMax('child')) { S.chubby = true; tier = Math.min(2, tier + 1); }
    S.variant = ['radiant', 'daisy', 'thistle'][tier];
  }
  S.stage = to; S.stageT = 0;
  unlock('stages', to); if (to === 'adult') unlock('forms', S.variant);
  S.nextPoop = rand(...STAGE[to].poop);
  if (to === 'baby') { S.awakeT = 0; S.nextTantrum = 55; }
  if (from === 'seed') { PET.x = PET.tx = 50; }
  A = { type: 'evolve', t: 0, dur: 1.8, from, to };
  const card = to === 'baby' ? ['Bulb', 'The seed sprouted!']
    : to === 'child' ? ['Bud', 'Bubby is growing up']
    : to === 'adult' ? [FORMS[S.variant], 'Fully bloomed!']
    : ['Elder', 'A wise old friend'];
  FX.cardPending = { title: card[0], sub: card[1], delay: 1.0 };
  sfx('evolve-build');
  save();
}

function end(kind) {
  S.ended = { kind, age: S.age, stage: S.stage, name: stageName(), mistakes: S.mistakes, gen: S.gen };
  S.call = null; A = null; G = null;
  closeOverlays();
  showEnd();
  save();
}

function tick(dt) {
  if (S.ended || S.paused) return;
  if (A && A.type === 'evolve') return;
  S.age += dt; S.stageT += dt;
  if (S.stage === 'seed') { if (S.stageT >= STAGE.seed.dur) evolve('baby'); return; }
  const st = STAGE[S.stage];

  // Day and night
  if (S.asleep) {
    S.sleepT += dt;
    if (S.lights) S.happy -= dt / 40;
    if (S.sleepT >= st.sleep) wake();
  } else {
    S.awakeT += dt;
    if (!S.lights) S.happy -= dt / 70;
    if (S.awakeT >= st.awake && !G) fallAsleep();
  }

  // Meters
  let m = S.asleep ? 0.15 : 1;
  if (S.sick) m *= 1.6;
  S.hunger = clamp(S.hunger - st.hr * m * dt, 0, 4);
  S.happy = clamp(S.happy - st.pr * m * dt - 0.004 * S.poops.length * dt, 0, 4);

  // Poop
  if (!S.asleep) {
    S.nextPoop -= dt;
    if (S.nextPoop <= 0) {
      if (S.poops.length < 4) { S.poops.push({ t: 0 }); beep(200, .08); }
      S.nextPoop = rand(...st.poop);
    }
  }
  let old = 0;
  for (const p of S.poops) { p.t += dt; if (p.t > 12) old++; }
  S.sickMeter += dt * old;
  if (S.weight > STAGE[S.stage].base * 2) S.sickMeter += dt * 0.3;
  if (!S.sick && S.sickMeter >= 45) getSick('poop');

  // Neglect
  if (S.hunger <= 0 && S.happy <= 0) S.neglectT += dt; else S.neglectT = Math.max(0, S.neglectT - dt);
  if (!S.sick && S.neglectT > 30) getSick('neglect');
  S.starveT = S.hunger <= 0 ? S.starveT + dt : 0;
  if (S.sick) {
    S.sickT += dt;
    if (S.sickT >= 60 && !S.sickCounted) { S.sickCounted = true; mistake('sick'); }
  }
  if (S.sickT >= 160 || S.starveT >= 150) { end('away'); return; }

  // Tantrums (misbehaving calls)
  if (!S.asleep && S.lights && !S.call && S.stage !== 'senior' && !G) {
    S.nextTantrum -= dt;
    if (S.nextTantrum <= 0) {
      if (S.hunger >= 2 && S.happy >= 2 && !S.sick && S.discipline < 100) startCall('tantrum');
      S.nextTantrum = rand(45, 80) + S.discipline * 0.8;
    }
  }

  // Calls for real needs
  const want = S.asleep ? (S.lights ? 'sleep' : null) : (S.hunger <= 0 ? 'hungry' : (S.happy <= 0 ? 'sad' : null));
  if (want) { if (!S.call || S.call.reason !== want) startCall(want); }
  else if (S.call && S.call.reason !== 'tantrum') S.call = null;

  if (S.call) {
    S.call.t += dt;
    if (S.call.t >= 30 && !S.call.counted) {
      S.call.counted = true; mistake(S.call.reason);
      if (S.call.reason === 'tantrum') { S.call = null; toast('Bubby sulked it out'); }
    }
  }

  // Growing up
  if (S.stageT >= st.dur) {
    if (st.next) { if (!S.asleep && !G && !A) evolve(st.next); }
    else end('garden');
  }
}

/* ================= Actions ================= */
function canCare() {
  if (S.stage === 'seed') { toast('Still sprouting…'); return false; }
  if (S.asleep) { toast('Shh… sleeping'); return false; }
  if (!S.lights) { toast('Too dark! Lights on'); return false; }
  return true;
}
function petX() { return S.stage === 'seed' || S.ended ? 50 : (G ? (G.type === 'catch' ? G.px : 50) : PET.x); }
const PRESS = { feed: ['#ff9aa8', 'feed'], play: ['#ffd34a', 'play'], clean: ['#8fd6ff', 'clean'], lights: ['#9fb8ff', 'lights'], med: ['#c9a8ff', 'med'], discipline: ['#ffb74a', 'scold'], status: ['#ffe27a', 'status'], attn: ['#ff9aa0', 'tap'] };
function pressFx(a) {
  const [col, snd] = PRESS[a] || ['#ffffff', 'tap'];
  sfx(snd);
  const tile = $(`.tile[data-act="${a}"]`); if (tile) { tile.classList.remove('bounce'); void tile.offsetWidth; tile.classList.add('bounce'); setTimeout(() => tile.classList.remove('bounce'), 400); }
  const hw = $(`.hw[data-act="${a}"]`); if (hw) { hw.classList.add('down'); setTimeout(() => hw.classList.remove('down'), 140); }
  if (S.stage !== 'seed' && !S.ended) burst(petX(), GROUND - 24, 7, [col, '#ffffff', col], { min: 10, max: 22, flat: .8, up: 8, life: .8 });
  swayChain();
}
function swayChain() { const ch = $('#chainWrap'); if (!ch || REDUCED) return; ch.classList.remove('sway'); void ch.getBoundingClientRect(); ch.classList.add('sway'); }
function act(a) {
  unlockAudio();
  if (a === 'pause') { togglePause(); return; }
  if (S.ended) return;
  if (a === 'status' || a === 'attn') { pressFx(a); if (OV === 'status') closeOverlays(); else openStatus(); return; }
  if (S.paused) { toast('Paused'); return; }
  if (G) return;
  if (A) return;
  closeOverlays();
  pressFx(a);
  if (a === 'lights') return toggleLights();
  if (!canCare()) return;
  ({ feed: openFeed, play: openPlay, clean: doClean, med: doMed, discipline: doScold })[a]?.();
}
function toggleLights() {
  const st = STAGE[S.stage];
  S.lights = !S.lights;
  if (!S.lights) {
    if (!S.asleep && st && st.awake && S.awakeT >= st.awake * 0.6 && S.stage !== 'seed') { fallAsleep(); toast('Off to bed. Sweet dreams'); }
    else toast(S.asleep ? 'Lights off. Sweet dreams' : 'Lights off');
  } else {
    toast(S.asleep ? 'Lights on (still asleep)' : 'Lights on');
  }
  save();
}
function openFeed() { showOv('feed'); }
function feed(kind) {
  closeOverlays();
  if (!canCare() || A) return;
  if (kind === 'meal') {
    if (S.hunger >= 3.999) { A = { type: 'no', t: 0, dur: .9 }; toast('Too full!'); return; }
    S.hunger = clamp(S.hunger + 1, 0, 4); S.weight += 1; S.stats.meals++; S.nextPoop -= 4;
    A = { type: 'eat', t: 0, dur: 1.6, food: 'meal' }; toast('Yum! A good meal');
  } else {
    S.happy = clamp(S.happy + 1, 0, 4); S.weight += 2; S.stats.snacks++;
    S.snacks = S.snacks.filter(t => S.age - t < 45); S.snacks.push(S.age);
    A = { type: 'eat', t: 0, dur: 1.6, food: 'snack' }; toast('Sweet! Yum!');
    if (S.snacks.length >= 3 && Math.random() < 0.6) { A.after = () => getSick('sweets'); S.snacks = []; }
  }
  save();
}
function doClean() {
  if (!S.poops.length) { toast('Already clean'); A = { type: 'sparkle', t: 0, dur: .7 }; return; }
  A = { type: 'clean', t: 0, dur: 1.2, after: () => { S.poops = []; S.sickMeter = 0; S.happy = clamp(S.happy + .25, 0, 4); S.stats.cleans++; toast('All clean!'); save(); } };
  beep(520, .08); setTimeout(() => beep(440, .1), 90);
}
function doMed() {
  if (!S.sick) { A = { type: 'no', t: 0, dur: .9 }; toast('Not sick'); return; }
  S.doses--; S.stats.meds++;
  A = { type: 'med', t: 0, dur: 1.1 };
  if (S.doses <= 0) {
    A.after = () => { S.sick = false; S.sickT = 0; S.sickCounted = false; S.neglectT = 0; S.sickMeter = 0; S.happy = clamp(S.happy - .5, 0, 4); toast('All better!'); A = { type: 'happy', t: 0, dur: .8 }; save(); };
  } else toast(`Gulp! ${S.doses} more dose${S.doses > 1 ? 's' : ''}`);
  save();
}
function doScold() {
  if (S.call && S.call.reason === 'tantrum') {
    S.discipline = clamp(S.discipline + 25, 0, 100); S.call = null; S.stats.scolds++;
    A = { type: 'scold', t: 0, dur: 1.1 };
    toast(`Behaving! Manners ${S.discipline}%`);
  } else {
    S.happy = clamp(S.happy - 1, 0, 4);
    A = { type: 'scold', t: 0, dur: 1.1 };
    toast('Unfair! Bubby is upset');
  }
  save();
}
function togglePause() {
  if (S.ended) return;
  S.paused = !S.paused;
  if (S.paused) { G = null; closeOverlays(); }
  $('#btnPower').setAttribute('aria-pressed', String(S.paused));
  $('#btnPower').setAttribute('aria-label', S.paused ? 'Resume' : 'Pause');
  $('#ovPause').hidden = !S.paused;
  beep(S.paused ? 330 : 660, .08);
  save();
}

/* ---- Minigames ---- */
function openPlay() {
  if (S.sick) { A = { type: 'no', t: 0, dur: .9 }; toast('Too sick to play'); return; }
  $('#optCatch small').textContent = S.stats.bestCatch ? `Best: ${S.stats.bestCatch}` : '20s · gold = 3';
  showOv('play');
}
function startGame(kind) {
  closeOverlays();
  if (!canCare() || A || G) return;
  if (S.sick) { A = { type: 'no', t: 0, dur: .9 }; toast('Too sick to play'); return; }
  if (kind === 'catch') {
    G = { type: 'catch', phase: 'play', t: 0, left: 20, score: 0, combo: 0, caught: 0, items: [], spawn: .6, px: 50, dir: 1, moving: false, hold: 0, target: null, stun: 0, joy: 0, sec: -1 };
  } else {
    G = { type: 'guess', round: 1, score: 0, phase: 'guess', look: 0, t: 0, last: false };
  }
  showOv('game'); $('#ovGame').classList.toggle('catch', G.type === 'catch'); renderGame();
}
function finishGame(happyGain, msg) {
  S.stats.games++;
  S.weight = Math.max(Math.round(STAGE[S.stage].base * 0.8), S.weight - 1);
  if (happyGain) { S.happy = clamp(S.happy + happyGain, 0, 4); S.stats.wins++; A = { type: 'happy', t: 0, dur: 1 }; }
  G = null; closeOverlays();
  toast(msg);
  save();
}

/* Which way will Bubby look? */
function guess(d) {
  if (!G || G.type !== 'guess' || G.phase !== 'guess') return;
  G.look = Math.random() < 0.5 ? -1 : 1;
  G.last = G.look === d;
  if (G.last) G.score++;
  G.phase = 'reveal'; G.t = 0;
  sfx(G.last ? 'right' : 'wrong');
  if (G.last) { heartsUp(50, GROUND - 40, 2); burst(50, GROUND - 28, 8, ['#ffd34a', '#ffffff'], { kind: 'spark', min: 8, max: 22, g: 0 }); } else burst(50, GROUND - 40, 3, ['#8fd8ff'], { min: 6, max: 14 });
  renderGame();
}
function renderGame() {
  if (!G) return;
  if (G.type === 'catch') {
    $('#gPrompt').textContent = G.phase === 'play' ? `Catch seeds · ${Math.ceil(G.left)}s`
      : G.score >= 20 ? 'Super harvest!' : G.score >= 10 ? 'Nice catch!' : 'Aim for 10 next time';
    $('#gRound').textContent = `${G.score} pts`;
    $('#gScore').textContent = G.combo > 1 ? `x${G.combo} combo` : 'Catch!';
    $('#gLeft').disabled = $('#gRight').disabled = G.phase !== 'play';
    return;
  }
  $('#gRound').textContent = `${Math.min(G.round, 5)}/5`;
  $('#gScore').textContent = `${G.score} right`;
  $('#gPrompt').textContent = G.phase === 'guess' ? 'Which way will Bubby look?'
    : G.phase === 'reveal' ? (G.last ? 'Yes! You got it' : 'Nope, other way')
    : (G.score >= 3 ? `You won ${G.score}/5!` : `Only ${G.score}/5. Try again later`);
  $('#gLeft').disabled = $('#gRight').disabled = G.phase !== 'guess';
}

/* Seed catch: move Bubby under falling seeds. Gold seeds are worth 3, pebbles cost 2 and stun. */
function catchY() { return GROUND - 46 + HEADTOP[S.stage] + 3; }
function updateCatch(rdt) {
  const g = G;
  if (g.phase === 'done') {
    if (g.isBest && g.t < 1.5 && (g.confT -= rdt) <= 0) {
      g.confT = .05;
      for (let i = 0; i < 4; i++) emit({ x: rand(4, 96), y: rand(-4, 6), vx: rand(-6, 6), vy: rand(10, 24), g: 24, life: 1.6, sz: 2, col: ['#ff7d9c', '#ffd34a', '#8be0ff', '#a6e86a', '#c39be0'][(Math.random() * 5) | 0] });
    }
    if (g.t > 1.8) {
      const gain = g.score >= 20 ? 2 : g.score >= 10 ? 1 : 0;
      const best = g.score > (S.stats.bestCatch || 0);
      if (best) S.stats.bestCatch = g.score;
      finishGame(gain, (best ? 'New best! ' : '') + (gain ? `+${gain} joy, -1g` : 'Good exercise! -1g'));
    }
    return;
  }
  g.left -= rdt; g.joy = Math.max(0, g.joy - rdt); g.stun = Math.max(0, g.stun - rdt);
  g.moving = false;
  if (g.stun <= 0) {
    let dir = g.hold;
    if (!dir && g.target != null) { const d = g.target - g.px; dir = Math.abs(d) < 1.5 ? 0 : Math.sign(d); }
    if (dir) { g.px = clamp(g.px + dir * 58 * rdt, 13, 87); g.dir = dir; g.moving = true; }
  }
  const elapsed = 20 - g.left;
  g.spawn -= rdt;
  if (g.spawn <= 0 && g.left > 1.2) {
    const r = Math.random(), kind = r < .12 ? 'gold' : r < .32 ? 'pebble' : 'seed';
    g.items.push({ x: rand(10, 90), y: -6, vy: rand(20, 30) + elapsed * 1.2, kind, fx: 0 });
    g.spawn = Math.max(.4, .8 - elapsed * .022) * rand(.8, 1.2);
  }
  const cy = catchY();
  for (const it of g.items) {
    if (it.fx) { it.fx += rdt; continue; }
    it.y += it.vy * rdt;
    if (it.y >= cy - 3 && it.y <= cy + 8 && Math.abs(it.x - g.px) <= 9) {
      it.fx = .001; it.hit = true;
      if (it.kind === 'pebble') {
        g.score = Math.max(0, g.score - 2); g.stun = .8; g.combo = 0; sfx('pebble');
        hitstop(.07); shake(1, .25); floater(it.x, it.y - 8, '-2', '#ff7b7b'); burst(it.x, it.y, 7, ['#8e959e', '#b3b9c1', '#ffffff'], { min: 10, max: 26 });
      } else {
        const gold = it.kind === 'gold';
        g.score += gold ? 3 : 1; g.caught++; g.joy = .35; g.combo = (g.combo || 0) + 1;
        sfx(gold ? 'gold' : 'catch', g.combo - 1); if (gold) sfx('catch', g.combo - 1);
        floater(it.x, it.y - 8, gold ? '+3' : '+1', gold ? '#ffd34a' : '#ffffff');
        burst(it.x, it.y, gold ? 10 : 5, gold ? ['#ffd34a', '#fff6c2', '#ffffff'] : ['#a8693a', '#d9a06a'], { kind: gold ? 'spark' : 'px', min: 8, max: 24, g: 10 });
        if (g.combo >= 3 && g.combo % 3 === 0) { floater(g.px, catchY() - 14, 'x' + g.combo, '#8be0ff'); }
        const r = $('#gRound'); r.classList.remove('bump'); void r.offsetWidth; r.classList.add('bump');
      }
      renderGame();
    } else if (it.y >= GROUND - 1) { it.fx = .001; it.y = GROUND - 1; }
  }
  g.items = g.items.filter(it => !it.fx || it.fx < .45);
  if (g.left <= 0) {
    g.phase = 'done'; g.t = 0; g.items = []; g.moving = false; g.isBest = g.score > (S.stats.bestCatch || 0) && g.score > 0; g.confT = 0;
    sfx(g.isBest ? 'best' : 'fanfare'); if (g.isBest) flash('#fff6c2', .2);
    renderGame(); return;
  }
  const sec = Math.ceil(g.left);
  if (sec !== g.sec || g.lastScore !== g.score) { g.sec = sec; g.lastScore = g.score; renderGame(); }
}
function updateGame(rdt) {
  if (!G) return;
  G.t += rdt;
  if (G.type === 'catch') { updateCatch(rdt); return; }
  if (G.phase === 'reveal' && G.t > 1.1) {
    if (G.round >= 5) { G.phase = 'done'; G.t = 0; }
    else { G.round++; G.phase = 'guess'; G.look = 0; }
    renderGame();
  } else if (G.phase === 'done' && G.t > 1.6) {
    const win = G.score >= 3;
    finishGame(win ? 1 : 0, win ? 'Fun! +1 joy, -1g' : 'Good exercise! -1g');
  }
}

/* ================= Pixel drawing ================= */
function hex(c) { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function mix(a, b, t) { const x = hex(a), y = hex(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d', { willReadFrequently: true }); return c; }
function E(x, cx, cy, rx, ry, col, rot = 0) {
  const Rr = Math.max(rx, ry) + 1, cs = Math.cos(rot), sn = Math.sin(rot), fn = typeof col === 'function';
  if (!fn) x.fillStyle = col;
  for (let py = Math.floor(cy - Rr); py <= Math.ceil(cy + Rr); py++) {
    for (let px = Math.floor(cx - Rr); px <= Math.ceil(cx + Rr); px++) {
      const dx = px + .5 - cx, dy = py + .5 - cy, u = (dx * cs + dy * sn) / rx, v = (-dx * sn + dy * cs) / ry;
      if (u * u + v * v <= 1) {
        if (fn) { const c = col(px, py); if (!c) continue; x.fillStyle = c; }
        x.fillRect(px, py, 1, 1);
      }
    }
  }
}
function ER(x, cx, cy, rx, ry, ring, fill, rot = 0) { E(x, cx, cy, rx, ry, ring, rot); E(x, cx, cy, rx - 1, ry - 1, fill, rot); }
function R(x, px, py, w, h, col) { x.fillStyle = col; x.fillRect(px, py, w, h); }
function P(x, pts, col) { x.fillStyle = col; for (let i = 0; i < pts.length; i += 2) x.fillRect(pts[i], pts[i + 1], 1, 1); }
function ring(x, cx, cy, r1, r2, col) {
  x.fillStyle = col;
  for (let py = Math.floor(cy - r2); py <= Math.ceil(cy + r2); py++) for (let px = Math.floor(cx - r2); px <= Math.ceil(cx + r2); px++) {
    const d = Math.hypot(px + .5 - cx, py + .5 - cy); if (d >= r1 && d < r2) x.fillRect(px, py, 1, 1);
  }
}
function rgbOf(c) { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
const INK_RGB = rgbOf('#2a1f45'), LIT_RGB = rgbOf('#3b2f5e');
/* Selective outline: tinted from the neighbouring fill (never pure black); lighter where light (top-left) hits. */
function outline(c) {
  const x = c.getContext('2d'), w = c.width, h = c.height, d = x.getImageData(0, 0, w, h), s = d.data, o = new Uint8ClampedArray(s);
  const at = (X, Y) => (X < 0 || Y < 0 || X >= w || Y >= h) ? -1 : (Y * w + X) * 4;
  for (let y = 0; y < h; y++) for (let X = 0; X < w; X++) {
    const i = (y * w + X) * 4; if (s[i + 3] > 0) continue;
    // fill neighbours: right/below means this pixel is on the lit (top/left) edge
    let j = -1, lit = false;
    for (const [dx, dy, l] of [[1, 0, 1], [0, 1, 1], [-1, 0, 0], [0, -1, 0]]) {
      const k = at(X + dx, y + dy); if (k >= 0 && s[k + 3] > 0) { j = k; lit = !!l; if (l) break; }
    }
    if (j < 0) continue;
    const t = lit ? .46 : .68, tint = lit ? LIT_RGB : INK_RGB;
    o[i] = s[j] + (tint[0] - s[j]) * t; o[i + 1] = s[j + 1] + (tint[1] - s[j + 1]) * t; o[i + 2] = s[j + 2] + (tint[2] - s[j + 2]) * t; o[i + 3] = 255;
  }
  d.data.set(o); x.putImageData(d, 0, 0); return c;
}
/* Ramp shading: warm highlight on the top-left rim, cool purple shade on the bottom-right rim (light from top-left). */
const HI_RGB = rgbOf('#fff1a8'), SH_RGB = rgbOf('#5b3f9e');
function shade(c) {
  const x = c.getContext('2d'), w = c.width, h = c.height, d = x.getImageData(0, 0, w, h), s = d.data, o = new Uint8ClampedArray(s);
  const solid = (X, Y) => X >= 0 && Y >= 0 && X < w && Y < h && s[(Y * w + X) * 4 + 3] > 0;
  const dist = (X, Y, dirs) => { let m = 4; for (const [dx, dy] of dirs) { let k = 1; while (k < 4 && solid(X + dx * k, Y + dy * k)) k++; m = Math.min(m, k); } return m; };
  const UL = [[-1, -1], [-1, 0], [0, -1]], DR = [[1, 1], [1, 0], [0, 1]];
  for (let y = 0; y < h; y++) for (let X = 0; X < w; X++) {
    const i = (y * w + X) * 4; if (s[i + 3] === 0) continue;
    const r = s[i], g = s[i + 1], b = s[i + 2];
    if (r * .3 + g * .59 + b * .11 < 70) continue;      // keep ink details crisp
    const ul = dist(X, y, UL), dr = dist(X, y, DR);
    let tr = r, tg = g, tb = b;
    const mixTo = (c, t) => { tr += (c[0] - tr) * t; tg += (c[1] - tg) * t; tb += (c[2] - tb) * t; };
    if (dr === 1) mixTo(SH_RGB, .36); else if (dr === 2) mixTo(SH_RGB, .14);
    if (ul === 1) mixTo(HI_RGB, .34); else if (ul === 2) mixTo(HI_RGB, .12);
    o[i] = tr; o[i + 1] = tg; o[i + 2] = tb;
  }
  d.data.set(o); x.putImageData(d, 0, 0); return c;
}
function sprite(w, h, fn, rim) { const c = mk(w, h); fn(c.getContext('2d')); if (rim) shade(c); return outline(c); }
function silhouette(src, col) {
  const c = mk(src.width, src.height), x = c.getContext('2d'); x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); return c;
}

/* ---- Faces ---- */
function face(x, cx, cy, o) {
  const m = o.mood || 'normal', L = o.look || 0, e1 = cx - 4 + L, e2 = cx + 2 + L, ey = cy - 1, mx = cx - 1 + L, my = cy + 3;
  const closedFlat = o.blink && m !== 'sleep';
  if (o.glasses) {
    for (const c0 of [cx - 3 + L, cx + 3 + L]) { E(x, c0, cy + .5, 2.4, 2.4, mix(o.skin, '#ffffff', .5)); ring(x, c0, cy + .5, 2.3, 3.3, '#4f5d6e'); }
  } else if (o.blush && m !== 'sick') {
    const bc = m === 'angry' ? '#ff5a5a' : m === 'happy' ? mix(o.blush, '#ff9ab0', .4) : o.blush;
    R(x, e1 - 2, cy + 2, 2, 1, bc); R(x, e2 + 2, cy + 2, 2, 1, bc);
    if (m === 'happy') { P(x, [e1 - 2, cy + 3, e2 + 3, cy + 3], bc); }
  }
  for (const ex of [e1, e2]) {
    if (m === 'happy') P(x, [ex - 1, ey + 2, ex, ey + 1, ex + 1, ey + 1, ex + 2, ey + 2], INK);
    else if (m === 'sleep') P(x, [ex - 1, ey + 1, ex, ey + 2, ex + 1, ey + 2, ex + 2, ey + 1], INK);
    else if (closedFlat) R(x, ex, ey + 2, 2, 1, INK);
    else if (m === 'sick') { const px = ex - 1; P(x, [px, ey, px + 1, ey, px + 2, ey, px + 2, ey + 1, px + 2, ey + 2, px + 1, ey + 2, px, ey + 2, px + 1, ey + 1], INK); }
    else if (m === 'angry' || o.glasses) R(x, ex, ey + 1, 2, 2, INK);
    else if (m === 'sad') { R(x, ex, ey + 1, 2, 3, INK); P(x, [ex, ey + 1], '#ffffff'); P(x, [ex + 1, ey + 3], '#8aa0d8'); }
    else { R(x, ex, ey, 2, 3, INK); P(x, [ex, ey], '#ffffff'); }
  }
  if (m === 'angry') P(x, [e1 - 1, ey - 1, e1, ey, e1 + 1, ey, e2, ey, e2 + 1, ey, e2 + 2, ey - 1], INK);
  if (m === 'sad') {
    P(x, [e1 - 1, ey, e1, ey - 1, e1 + 1, ey - 2, e2, ey - 2, e2 + 1, ey - 1, e2 + 2, ey], INK);
    if (o.tear) P(x, [e1, ey + 4 + (o.tear - 1), e1, ey + 4 + (o.tear - 1) - 1], '#8fd8ff');
  }
  const mouth = o.mouth || ({ normal: 'smile', happy: 'open', sad: 'frown', angry: 'grit', sick: 'wavy', sleep: 'small' })[m] || 'smile';
  if (mouth === 'smile') P(x, [mx - 1, my, mx, my + 1, mx + 1, my + 1, mx + 2, my], INK);
  else if (mouth === 'open') { R(x, mx - 1, my, 4, 2, INK); P(x, [mx, my + 1, mx + 1, my + 1], '#e2687a'); P(x, [mx - 1, my, mx + 2, my], INK); }
  else if (mouth === 'frown') P(x, [mx - 1, my + 2, mx, my + 1, mx + 1, my + 1, mx + 2, my + 2], INK);
  else if (mouth === 'wavy') P(x, [mx - 1, my + 1, mx, my, mx + 1, my + 1, mx + 2, my], INK);
  else if (mouth === 'small') R(x, mx, my, 2, 1, INK);
  else if (mouth === 'flat') R(x, mx - 1, my, 4, 1, INK);
  else if (mouth === 'grit') { R(x, mx - 1, my, 4, 2, INK); P(x, [mx, my, mx + 1, my + 1], '#ffffff'); }
  else if (mouth === 'o') { R(x, mx, my - 1, 2, 3, INK); P(x, [mx, my + 1], '#e2687a'); }
  if (m === 'sick') P(x, [cx + 7, cy - 4, cx + 7, cy - 3, cx + 6, cy - 3, cx + 8, cy - 3, cx + 7, cy - 2], '#6fb8ea');
}

/* ---- Bubby at each stage (48×48, feet at y≈46) ---- */
const PAL = {
  radiant: { ring: '#b8403e', petal: '#f06a5f', face: '#ff8f7f', faceRing: '#c94a45', suit: ['#3f5fa8', '#6a90dc'], blush: '#e0505a', wings: ['#8f78cf', '#c3b2f2'] },
  daisy:   { ring: '#b3a9c4', petal: '#ffffff', face: '#ffd54f', faceRing: '#d9a520', suit: ['#3f8f4f', '#66bb6a'], blush: '#f59a7a', wings: null },
  thistle: { ring: '#5a3b80', petal: '#9a6cc7', face: '#c39be0', faceRing: '#6e4b98', suit: ['#5d6b4f', '#7f8f6a'], blush: '#a678c9', wings: null },
};
function palette(variant, senior) {
  const p = PAL[variant] || PAL.radiant;
  if (!senior) return p;
  const m = c => mix(c, '#cdb8a6', .45);
  return { ring: m(p.ring), petal: m(p.petal), face: m(p.face), faceRing: m(p.faceRing), suit: [m(p.suit[0]), m(p.suit[1])], blush: m(p.blush),
    wings: p.wings && [mix(p.wings[0], '#bfb3a3', .6), mix(p.wings[1], '#e2d8ca', .6)] };
}
function drawSeed(x, o) {
  ER(x, 24, 44, 14, 3.6, '#6b4226', '#8a5a36');
  P(x, [15, 44, 20, 43, 27, 45, 31, 43, 34, 44], '#a8724a');
  const sx = 24 + (o.wobble || 0);
  E(x, sx, 34, 8, 10, '#55702f');
  E(x, sx, 34, 7, 9, (px, py) => { const v = py + 1.6 * Math.sin(px * .9); return ((v % 6) + 6) % 6 < 2 ? '#8c6a3a' : '#7f9f4e'; });
  P(x, [sx - 4, 29, sx - 4, 30, sx - 3, 28], '#b5cf86');
  if (o.crack) P(x, [sx - 1, 25, sx, 26, sx + 1, 27, sx, 28, sx + 1, 29, sx + 2, 28], INK);
}
function drawBaby(x, o) {
  ER(x, 18.5, 44.5, 3.5, 2, '#23706b', '#2f8f8a'); ER(x, 29.5, 44.5, 3.5, 2, '#23706b', '#2f8f8a');
  ER(x, 24, 35, 11.5, 10, '#2a8580', '#4cb8af');
  E(x, 19, 30, 3, 2, '#86dcd2');
  R(x, 23, 21, 2, 5, '#3c8f45');
  ER(x, 19, 21, 5, 2.6, '#2f7d3a', '#5cc46a', -.45);
  ER(x, 29, 20, 5.5, 2.8, '#2f7d3a', '#5cc46a', .45);
  P(x, [18, 21, 20, 21, 28, 20, 30, 20], '#8be095');
  face(x, 24, 36, { ...o, blush: '#f59aa6' });
}
function drawChild(x, o) {
  ER(x, 20, 45, 2.6, 2, '#2f7d3a', '#3f9a45'); ER(x, 28, 45, 2.6, 2, '#2f7d3a', '#3f9a45');
  ER(x, 14.5, 37, 2.6, 3.6, '#2f7d3a', '#5cbf5a', .3); ER(x, 33.5, 37, 2.6, 3.6, '#2f7d3a', '#5cbf5a', -.3);
  ER(x, 24, 36, 9.5, 9, '#2f7d3a', '#5cbf5a');
  E(x, 20, 31, 2.5, 1.6, '#8ad98a');
  ER(x, 16, 25.5, 6.5, 2.6, '#2a6e35', '#47a852', -.4); ER(x, 32, 25.5, 6.5, 2.6, '#2a6e35', '#47a852', .4);
  ER(x, 24, 19, 6, 7.5, '#b9544a', '#f08f7a');
  R(x, 21, 15, 1, 9, '#d8705f'); R(x, 26, 15, 1, 9, '#d8705f');
  E(x, 22.5, 15.5, 1.2, 2, '#ffb7a3');
  P(x, [23, 10, 24, 10, 23, 11, 24, 11], '#f08f7a');
  ER(x, 24, 26, 5, 2, '#2a6e35', '#4fae55');
  face(x, 24, 37, { ...o, blush: '#f59aa6' });
}
function drawAdult(x, o, senior) {
  const pal = palette(o.variant, senior), ch = o.chubby ? 2 : 0, cx = 24, hy = 21, th = o.variant === 'thistle';
  if (pal.wings) { ER(x, 12 - ch, 35, 6.5, 3.4, pal.wings[0], pal.wings[1], -.55); ER(x, 36 + ch, 35, 6.5, 3.4, pal.wings[0], pal.wings[1], .55); }
  ER(x, 20.5, 45, 2.5, 1.8, pal.suit[0], pal.suit[0]); ER(x, 27.5, 45, 2.5, 1.8, pal.suit[0], pal.suit[0]);
  ER(x, 16 - ch, 38.5, 2.6, 3.6, pal.suit[0], pal.suit[1], .35); ER(x, 32 + ch, 38.5, 2.6, 3.6, pal.suit[0], pal.suit[1], -.35);
  ER(x, 24, 39, 7.5 + ch, 6.5, pal.suit[0], pal.suit[1]);
  if (o.variant === 'radiant' && !senior) {
    P(x, [24, 37], '#ff5a5a'); P(x, [22, 38, 23, 38, 24, 38, 25, 38, 26, 38], '#ffb43a');
    P(x, [23, 39, 24, 39, 25, 39], '#ffe14a'); P(x, [23, 40, 25, 40], '#5fcf6a'); P(x, [22, 41, 26, 41], '#5aa8ff');
  }
  if (o.variant === 'daisy') { P(x, [21, 34, 22, 35, 23, 35, 24, 35, 25, 35, 26, 35, 27, 34], '#ffd54f'); }
  if (senior) { R(x, 35 + ch, 36, 1, 10, '#7a4a24'); P(x, [35 + ch, 35, 36 + ch, 34, 37 + ch, 34, 38 + ch, 35], '#7a4a24'); }
  const n = th ? 10 : 8, pr = th ? 4 : 5, rad = th ? 11.5 : 10.5;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + i / n * Math.PI * 2;
    let px = cx + Math.cos(a) * rad, py = hy + Math.sin(a) * rad;
    if (senior && Math.sin(a) > -.2) py += 1;
    ER(x, px, py, pr, pr, pal.ring, pal.petal);
  }
  if (senior) P(x, [15, 14, 32, 13, 12, 22, 36, 24, 18, 31, 30, 31], mix(pal.petal, '#8a5a40', .35));
  ER(x, cx, hy, 8.5, 8.5, pal.faceRing, pal.face);
  E(x, 20, 16.5, 2, 1.3, mix(pal.face, '#ffffff', .45));
  face(x, cx, hy + 1, { ...o, blush: pal.blush, glasses: senior, skin: pal.face, mood: (th && (o.mood || 'normal') === 'normal') ? 'normal' : o.mood, mouth: o.mouth || (th && (!o.mood || o.mood === 'normal') ? 'flat' : undefined) });
}
const SPR_CACHE = new Map();
function petSprite(stage, o = {}) {
  const key = stage + '|' + [o.variant, o.chubby ? 1 : 0, o.mood, o.mouth, o.blink ? 1 : 0, o.sick ? 1 : 0, o.look, o.wobble, o.crack ? 1 : 0, o.tear].join(',');
  let c = SPR_CACHE.get(key); if (c) return c;
  c = mk(48, 48); const x = c.getContext('2d');
  if (stage === 'seed') drawSeed(x, o);
  else if (stage === 'baby') drawBaby(x, o);
  else if (stage === 'child') drawChild(x, o);
  else drawAdult(x, o, stage === 'senior');
  if (o.sick) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(140,190,60,.28)'; x.fillRect(0, 0, 48, 48); x.globalCompositeOperation = 'source-over'; }
  shade(c); outline(c);
  if (SPR_CACHE.size > 600) SPR_CACHE.clear();
  SPR_CACHE.set(key, c); return c;
}
const HEADTOP = { seed: 23, baby: 17, child: 9, adult: 5, senior: 5 };

/* ---- Small sprites and icons ---- */
const S_SILVER = '#d5dae1', S_SHADE = '#9aa3ae';
const ICONS = {
  feed: sprite(16, 16, x => {
    R(x, 2, 2, 1, 4, S_SILVER); R(x, 4, 2, 1, 4, S_SILVER); R(x, 6, 2, 1, 4, S_SILVER); R(x, 2, 6, 5, 2, S_SILVER); R(x, 3, 8, 3, 1, S_SHADE); R(x, 4, 9, 1, 5, S_SILVER);
    E(x, 11.5, 5, 2.6, 3.4, S_SILVER); P(x, [10, 3, 10, 4], '#ffffff'); R(x, 11, 8, 1, 6, S_SILVER); R(x, 12, 8, 1, 6, S_SHADE);
  }),
  status: sprite(16, 16, x => {
    P(x, [7, 1, 8, 1, 7, 14, 8, 14, 1, 7, 1, 8, 14, 7, 14, 8, 3, 3, 12, 3, 3, 12, 12, 12], '#f5a524');
    E(x, 8, 8, 4.6, 4.6, '#f5a524'); E(x, 8, 8, 3.6, 3.6, '#ffd84a'); P(x, [6, 6, 7, 6, 6, 7], '#fff3b0');
  }),
  discipline: sprite(16, 16, x => {
    for (let t = 0; t < 7; t++) { R(x, 4 + t, 9 - t, 2, 2, '#ffc83d'); P(x, [5 + t, 10 - t], '#e09a1c'); }
    R(x, 11, 2, 2, 2, '#c9ced6'); R(x, 12, 1, 2, 2, '#ff8fb0'); P(x, [13, 1], '#ffb7cc');
    R(x, 3, 11, 2, 2, '#f3d9a8'); P(x, [2, 13], INK);
  }),
  med: sprite(16, 16, x => {
    R(x, 5, 1, 6, 3, '#5aa0e6'); P(x, [6, 1, 7, 1], '#9cc8f4'); R(x, 6, 4, 4, 1, '#dfe7ee');
    R(x, 4, 5, 8, 9, '#f4f8fb'); R(x, 10, 5, 2, 9, '#cfdbe6'); R(x, 7, 7, 2, 5, '#e8524a'); R(x, 5, 8, 6, 3, '#e8524a'); R(x, 7, 7, 2, 5, '#e8524a');
  }),
  clean: sprite(16, 16, x => {
    E(x, 8, 12.5, 6, 2.4, '#e9679f'); E(x, 8, 9.6, 4.6, 2.2, '#ff8fc0'); E(x, 8, 6.8, 3, 1.8, '#ffacd2'); P(x, [8, 4, 9, 4, 9, 3], '#ffacd2');
    P(x, [6, 9, 10, 9], INK); P(x, [7, 11, 8, 11], INK); P(x, [5, 8], '#ffd0e6');
  }),
  lights: sprite(16, 16, x => {
    E(x, 8, 14, 4.5, 1.6, '#4f86c6');
    P(x, [8, 12, 8, 11, 7, 10, 7, 9, 6, 8, 6, 7, 7, 6, 8, 5], '#7fb6e8'); P(x, [9, 12, 9, 11, 8, 10, 8, 9, 7, 8], '#5b8fd6');
    E(x, 11, 5, 3.6, 2.2, '#4f86c6', .7); E(x, 11.5, 4.5, 2, 1, '#8fc0f0', .7);
    P(x, [13, 8, 12, 8, 13, 7], '#ffe27a');
  }),
  play: sprite(16, 16, x => {
    E(x, 9, 10.5, 5.5, 3.5, '#ffd23f'); E(x, 6, 6, 3.1, 3.1, '#ffd23f'); R(x, 1, 6, 3, 2, '#ff9a2e');
    P(x, [6, 5], INK); P(x, [5, 4], '#fff3b0'); E(x, 10, 10, 2.6, 1.5, '#f2b72a'); P(x, [14, 8, 15, 7], '#ffd23f');
    R(x, 2, 13, 13, 2, '#7fc6f0'); P(x, [4, 13, 9, 13, 13, 13], '#bfe6fb');
  }),
  catch: sprite(16, 16, x => {
    E(x, 4, 4, 1.8, 2.6, '#a8693a'); E(x, 11, 2.8, 1.8, 2.4, '#ffc93c'); E(x, 8.5, 8.5, 1.8, 2.6, '#a8693a');
    P(x, [4, 8, 11, 6, 8, 12], '#ffffff');
    E(x, 8, 14, 6, 1.6, '#6fb35e');
  }),
  attn: sprite(16, 16, x => {
    E(x, 8, 7, 6.6, 5.4, '#ffffff'); P(x, [4, 11, 5, 11, 4, 12, 3, 13], '#ffffff');
    R(x, 7, 3, 2, 5, '#e8524a'); R(x, 7, 9, 2, 2, '#e8524a');
  }),
  meal: sprite(16, 16, x => {
    E(x, 8, 9, 6, 3.4, '#ffffff'); P(x, [5, 7, 8, 6, 10, 7, 6, 9], '#eef0f2');
    E(x, 8, 10, 6.5, 4, (px, py) => py >= 10 ? (px > 10 ? '#3f6fb8' : '#5a8fd6') : null);
    R(x, 6, 14, 4, 1, '#3f6fb8'); R(x, 3, 11, 10, 1, '#8fc0f0');
  }),
  snack: sprite(16, 16, x => {
    for (let y = 10; y <= 14; y++) { const ins = Math.floor((y - 10) * .5); R(x, 3 + ins, y, 10 - ins * 2, 1, '#7fc6f0'); }
    P(x, [5, 11, 8, 11, 11, 11, 6, 13, 9, 13], '#4f9ad6');
    E(x, 8, 8, 5.6, 3, '#ff9ccb'); P(x, [5, 7, 7, 6, 10, 7], '#ffd0e6'); P(x, [6, 9, 9, 8, 11, 9], '#ffe14a');
    E(x, 8, 4.2, 1.7, 1.7, '#e8524a'); P(x, [7, 3], '#ff9a9a');
  }),
};
const SEEDI = sprite(7, 9, x => { E(x, 3.5, 4.5, 2.2, 3.2, '#a8693a'); R(x, 3, 2, 1, 5, '#7a4a24'); P(x, [2, 3], '#d9a06a'); });
const GOLDSEED = sprite(7, 9, x => { E(x, 3.5, 4.5, 2.2, 3.2, '#ffc93c'); R(x, 3, 2, 1, 5, '#e09a1c'); P(x, [2, 3, 2, 4], '#fff6c2'); });
const PEBBLE = sprite(9, 8, x => { E(x, 4.5, 4, 3.4, 2.6, '#8e959e'); E(x, 4, 3.4, 2, 1.3, '#b3b9c1'); P(x, [3, 3], '#e3e6ea'); });
const POOP = sprite(12, 11, x => {
  E(x, 6, 8.5, 5, 2.2, '#e9679f'); E(x, 6, 6, 3.8, 1.9, '#ff8fc0'); E(x, 6, 3.6, 2.4, 1.5, '#ffacd2'); P(x, [6, 1, 7, 1], '#ffacd2');
  P(x, [4, 6, 8, 6], INK); P(x, [5, 8, 6, 8], INK);
});
const SKULL = sprite(9, 8, x => {
  R(x, 2, 1, 5, 1, '#f4f4f4'); R(x, 1, 2, 7, 3, '#f4f4f4'); R(x, 2, 5, 5, 1, '#f4f4f4'); P(x, [2, 6, 4, 6, 6, 6], '#f4f4f4');
  R(x, 2, 3, 2, 1, INK); R(x, 5, 3, 2, 1, INK); P(x, [4, 5], INK);
});
const BUBBLE = sprite(9, 10, x => { E(x, 4.5, 4, 3.8, 3.6, '#ffffff'); P(x, [2, 7, 1, 8], '#ffffff'); R(x, 4, 1, 1, 4, '#e8524a'); P(x, [4, 6], '#e8524a'); });
const BANG = sprite(5, 9, x => { R(x, 1, 1, 3, 4, '#ff5a5a'); R(x, 2, 5, 1, 1, '#ff5a5a'); R(x, 1, 6, 3, 2, '#ff5a5a'); });
const PUFF = sprite(7, 6, x => { E(x, 3.5, 3, 2.8, 2.2, '#f2f2f2'); P(x, [2, 2], '#ffffff'); });
const ZED = (() => { const c = mk(4, 4), x = c.getContext('2d'); R(x, 0, 0, 4, 1, '#ffffff'); P(x, [2, 1, 1, 2], '#ffffff'); R(x, 0, 3, 4, 1, '#ffffff'); return c; })();
const HEART_FULL_C = (() => { const c = mk(9, 8); c.getContext('2d').drawImage(sprite(9, 8, x => { ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'].forEach((row, y) => [...row].forEach((ch, X) => { if (ch === '#') R(x, X + 1, y + 1, 1, 1, '#ff5f86'); })); P(x, [2, 2], '#ffc2d2'); }), 0, 0); return c; })();
const HEART_EMPTY_C = (() => { const c = mk(9, 8); c.getContext('2d').drawImage(sprite(9, 8, x => { ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'].forEach((row, y) => [...row].forEach((ch, X) => { if (ch === '#') R(x, X + 1, y + 1, 1, 1, '#e6dde8'); })); }), 0, 0); return c; })();

/* ---- Pixel text (3×5) ---- */
const GLYPH = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001',
  '5': '111100111001111', '6': '111100111101111', '7': '111001010100100', '8': '111101111101111', '9': '111101111001111',
  '+': '000010111010000', '-': '000000111000000', 'x': '000101010101000', '!': '010010010000010', ' ': '000000000000000',
  B: '110101110101110', E: '111100110100111', N: '111101101101101', S: '111100111001111', T: '111010010010010', W: '101101101111101',
};
function drawText(g, str, x, y, col, edge = '#2a1f45') {
  const put = (ox, oy, c) => {
    g.fillStyle = c; let cx = x + ox;
    for (const ch of str) {
      const bits = GLYPH[ch] || GLYPH[' '];
      for (let i = 0; i < 15; i++) if (bits[i] === '1') g.fillRect(cx + (i % 3), y + oy + ((i / 3) | 0), 1, 1);
      cx += 4;
    }
  };
  if (edge) { put(1, 0, edge); put(-1, 0, edge); put(0, 1, edge); put(0, -1, edge); }
  put(0, 0, col);
}
const textW = str => str.length * 4 - 1;

/* ---- Time of day ---- */
const TOD = [
  { top: '#f4a98f', bot: '#ffe2ae', tint: '#ffd9bd', a: .2, night: 0 },     // morning
  { top: '#78cdf2', bot: '#c9eefc', tint: '#ffffff', a: 0, night: 0 },      // noon
  { top: '#e9805d', bot: '#ffc983', tint: '#ffb272', a: .28, night: 0 },    // golden evening
  { top: '#17214f', bot: '#35458a', tint: '#6479c8', a: .52, night: 1 },    // night
];
function todAt(age) {
  const p = ((age % DAY) + DAY) % DAY / DAY, f = p * 4, i = Math.floor(f) % 4, j = (i + 1) % 4;
  let t = f - Math.floor(f); t = t * t * (3 - 2 * t);
  const A_ = TOD[i], B_ = TOD[j];
  return { p, top: mix(A_.top, B_.top, t), bot: mix(A_.bot, B_.bot, t), tint: mix(A_.tint, B_.tint, t), a: A_.a + (B_.a - A_.a) * t, night: A_.night + (B_.night - A_.night) * t };
}

/* ---- Background layers (pre-rendered once) ---- */
const SKY_H = 18, HORIZON = 20;
const LAYERS = (() => {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // far hills: a soft blue-green silhouette, wider than the screen for parallax
  const far = mk(SW + 12, 14), fx = far.getContext('2d');
  for (let X = 0; X < far.width; X++) { const h = 5 + Math.round(Math.sin(X * .09) * 2.2 + Math.sin(X * .23 + 1) * 1.2); R(fx, X, 14 - h - 1, 1, h + 1, '#9fd0b6'); R(fx, X, 14 - h - 1, 1, 1, '#c3e6cf'); }
  const mid = mk(SW + 12, 14), mx = mid.getContext('2d');
  for (let X = 0; X < mid.width; X++) { const h = 4 + Math.round(Math.sin(X * .13 + 2) * 2 + Math.sin(X * .31) * 1); R(mx, X, 14 - h, 1, h, '#7dc486'); R(mx, X, 14 - h, 1, 1, '#a6dc9d'); }
  // bushes: round clumps with a lit top-left rim and a cool shade
  const bush = mk(SW + 12, 12), bx = bush.getContext('2d');
  for (let X = 2; X < bush.width; X += 7 + (rnd() * 5 | 0)) {
    const r = 3 + rnd() * 2.2, cy = 12 - r + 1;
    E(bx, X, cy, r + 1.3, r, '#3f8a52'); E(bx, X - .6, cy - .6, r + .4, r - .4, '#5eae62'); E(bx, X - 1.6, cy - 1.4, r * .55, r * .4, '#8ed77f');
    if (rnd() < .5) P(bx, [X + 1, cy - 1, X - 2, cy + 1], rnd() < .5 ? '#ffd2e0' : '#fff3a8');
  }
  // grass field with ramped tufts and a lighter horizon band
  const grass = mk(SW, SH), gx = grass.getContext('2d');
  R(gx, 0, 0, SW, SH, '#9ad67f');
  for (let y = 0; y < SH; y++) { if (y < 6) R(gx, 0, y, SW, 1, mix('#b5e596', '#9ad67f', y / 6)); else if (y > 56) R(gx, 0, y, SW, 1, mix('#9ad67f', '#86c76e', (y - 56) / 18)); }
  for (let i = 0; i < 190; i++) { const px = rnd() * SW | 0, py = rnd() * SH | 0; R(gx, px, py, 1, 1, ['#88c96d', '#acdf8f', '#7fbf66', '#b9e79b'][i % 4]); }
  for (let i = 0; i < 26; i++) { const px = rnd() * (SW - 4) | 0, py = 4 + rnd() * (SH - 6) | 0; P(gx, [px, py, px + 2, py, px + 1, py + 1], '#6fb35e'); P(gx, [px + 1, py - 1], '#bdeaa0'); }
  for (let i = 0; i < 9; i++) { const px = rnd() * (SW - 6) + 3 | 0, py = 8 + rnd() * (SH - 14) | 0; P(gx, [px, py, px - 1, py + 1, px + 1, py + 1, px, py + 2], i % 3 ? '#fff6c8' : '#ffd0e0'); P(gx, [px, py + 1], '#ffcf3a'); }
  // flower pot with soft contact shadow
  const pot = sprite(12, 16, y => {
    R(y, 3, 10, 7, 5, '#c0703f'); R(y, 2, 9, 9, 2, '#d9874f'); R(y, 4, 11, 1, 3, '#e8a470'); R(y, 9, 11, 1, 3, '#a85a30');
    R(y, 6, 4, 1, 5, '#4c9a4a'); P(y, [5, 6, 4, 5, 7, 7, 8, 6], '#5cc46a');
    E(y, 6.5, 3, 2.4, 2.4, '#ffffff'); P(y, [6, 2, 7, 3, 6, 3, 7, 2], '#ffd34a');
  });
  E(gx, 88, 49.5, 6.5, 1.5, '#6fb35e'); E(gx, 88, 49.5, 4.5, 1, '#5f9f52');
  gx.drawImage(pot, 82, 34);
  // clouds
  const cloud = sprite(16, 7, y => { E(y, 5, 4.5, 4.5, 2.4, '#ffffff'); E(y, 10, 3.5, 4, 2.6, '#ffffff'); E(y, 8, 5, 6.5, 1.8, '#f3f8ff'); });
  return { far, mid, bush, grass, cloud };
})();
const SUN = sprite(9, 9, x => { E(x, 4.5, 4.5, 3.6, 3.6, '#ffd24a'); E(x, 3.8, 3.8, 2, 2, '#fff2a6'); P(x, [4, 0, 4, 8, 0, 4, 8, 4], '#ffe27a'); });
const MOON = sprite(9, 9, x => { E(x, 4.5, 4.5, 3.8, 3.8, '#f6f0cf'); E(x, 6, 3.4, 3.2, 3.2, (px, py) => null); P(x, [3, 3, 4, 6, 2, 5], '#d8d0a6'); });
const STARS = [[8, 6], [22, 12], [37, 4], [55, 9], [70, 5], [86, 13], [15, 14], [62, 14], [93, 3], [46, 13]];
const SLOTS = [[80, 64], [90, 64], [70, 65], [88, 56]];
const BUTTERFLY = [0, 1].map(f => sprite(7, 6, x => {
  const wing = f ? 1 : 3; E(x, 1.8, 2.6 - (f ? 0 : 1), 1.8, wing * .8 + 1, '#ff9ccb'); E(x, 5.2, 2.6 - (f ? 0 : 1), 1.8, wing * .8 + 1, '#ffb7dd'); R(x, 3, 2, 1, 3, '#5b3f9e');
}));
const LADYBUG = sprite(5, 4, x => { E(x, 2.5, 2.4, 2.1, 1.6, '#e8524a'); P(x, [2, 1, 2, 3], '#2a1f45'); P(x, [1, 2], '#2a1f45'); });
const HEART_S = sprite(7, 6, x => { ['.#.#.', '#####', '#####', '.###.', '..#..'].forEach((r, y) => [...r].forEach((c, X) => { if (c === '#') R(x, X + 1, y, 1, 1, '#ff6f93'); })); P(x, [2, 1], '#ffd0dc'); });
const EMOTE_SWEAT = sprite(3, 5, x => { P(x, [1, 0, 1, 1, 0, 2, 2, 2, 0, 3, 1, 3, 2, 3, 1, 3], '#8fd8ff'); P(x, [1, 2], '#d8f2ff'); });
const EMOTE_VEIN = sprite(5, 5, x => { P(x, [0, 0, 1, 0, 0, 1, 3, 0, 4, 0, 4, 1, 0, 3, 0, 4, 1, 4, 4, 3, 3, 4, 4, 4], '#ff5a5a'); });
const FOLIAGE = Array.from({ length: 30 }, (_, i) => ({ x: 1 + i * 3.4, h: 3 + (i * 7 % 3), ph: i * 1.7 }));
const WAIST = { seed: 24, baby: 26, child: 29, adult: 32, senior: 32 };

/* ---- Effects engine: particles, floaters, shake, hit-stop ---- */
const FX = { p: [], shake: 0, shakeAmp: 1, hit: 0, flash: 0, flashCol: '#ffffff', flashDur: .18, card: 0, shimmer: 0, bf: null, bfT: rand(8, 20), lb: null, lbT: rand(30, 60), ss: null, ssT: rand(10, 25), glow: 0, nextEmit: 0 };
const PM = { h: 0, st: 0, lagX: 0, lagY: 0, sway: 0, blinkT: 0, nextBlink: 2.5, fid: null, nextFid: 4, glanceT: 0, nextGlance: 6, ph: 0, stepT: 0, dust: 0, land: 0, prevH: 0, eatN: 0 };
const PTR = { x: 50, t: -99 };
function emit(o) {
  const soft = o.kind === 'heart' || o.kind === 'text';
  if (REDUCED) { if (!soft) return; o = Object.assign(o, { vx: 0, vy: 0, g: 0, fric: 0, life: Math.min(o.life || 1, 1) }); }
  if (FX.p.length > 240) FX.p.shift();
  FX.p.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, g: 0, fric: 0, t: 0, life: 1, kind: 'px', col: '#fff', sz: 1 }, o));
}
function burst(x, y, n, cols, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), sp = rand(o.min || 8, o.max || 26);
    emit({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * (o.flat || 1) - (o.up || 0), g: o.g === undefined ? 40 : o.g, fric: o.fric || 0, life: rand(.35, .8) * (o.life || 1), col: cols[i % cols.length], sz: o.sz || 1, kind: o.kind || 'px' });
  }
}
function heartsUp(x, y, n = 3) { for (let i = 0; i < n; i++) emit({ kind: 'heart', x: x + rand(-8, 8), y: y - i * 3, vx: rand(-4, 4), vy: rand(-18, -12), fric: .6, life: rand(.9, 1.3), t: -i * .13 }); }
function floater(x, y, txt, col) { emit({ kind: 'text', txt, col, x: x - textW(txt) / 2, y, vy: -26, fric: 5, life: .9 }); }
function shake(amp = 1, dur = .18) { if (REDUCED) return; FX.shake = dur; FX.shakeAmp = amp; }
function hitstop(sec) { if (!REDUCED) FX.hit = sec; }
function flash(col = '#ffffff', dur = .18) { FX.flash = dur; FX.flashDur = dur; FX.flashCol = col; }
function updateFX(rdt) {
  const P_ = FX.p;
  for (let i = P_.length - 1; i >= 0; i--) {
    const p = P_[i]; p.t += rdt; if (p.t < 0) continue;
    if (p.t > p.life) { P_.splice(i, 1); continue; }
    p.vy += p.g * rdt; if (p.fric) { const f = Math.max(0, 1 - p.fric * rdt); p.vx *= f; p.vy *= f; }
    p.x += p.vx * rdt; p.y += p.vy * rdt;
  }
  FX.shake = Math.max(0, FX.shake - rdt); FX.flash = Math.max(0, FX.flash - rdt); FX.shimmer = Math.max(0, FX.shimmer - rdt);
}
function drawFX(time) {
  for (const p of FX.p) {
    if (p.t < 0) continue;
    const k = p.t / p.life, X = Math.round(p.x), Y = Math.round(p.y);
    sx.globalAlpha = k > .7 ? 1 - (k - .7) / .3 : 1;
    if (p.kind === 'heart') sx.drawImage(HEART_S, X - 3, Y - 3);
    else if (p.kind === 'text') drawText(sx, p.txt, X, Y, p.col);
    else if (p.kind === 'spark') { sx.fillStyle = p.col; if (((time * 10 + p.x) | 0) % 2) { sx.fillRect(X, Y - 1, 1, 3); sx.fillRect(X - 1, Y, 3, 1); } else sx.fillRect(X, Y, 1, 1); }
    else if (p.kind === 'petal') { sx.fillStyle = p.col; sx.fillRect(X + Math.round(Math.sin(p.t * 6 + p.x) * 1.4), Y, 2, 1); sx.fillRect(X, Y + 1, 1, 1); }
    else { sx.fillStyle = p.col; sx.fillRect(X, Y, p.sz, p.sz); }
  }
  sx.globalAlpha = 1;
}

/* ---- Sprite helpers ---- */
const scene = $('#scene'), sx = scene.getContext('2d');
function blit(img, x, y) { sx.drawImage(img, Math.round(x), Math.round(y)); }
function sparkles(cx, cy, t, r = 16) {
  for (let i = 0; i < 6; i++) {
    const a = t * 3 + i * Math.PI / 3, px = Math.round(cx + Math.cos(a) * r), py = Math.round(cy + Math.sin(a) * r * .7);
    sx.fillStyle = i % 2 ? '#ffffff' : '#ffe14a'; sx.fillRect(px, py, 1, 1); sx.fillRect(px - 1, py, 3, 1); sx.fillRect(px, py - 1, 1, 3);
  }
}
/* Draws the pet as two slices around the waist so the head/petals can lag, stretch and squash (secondary motion). */
function drawSliced(img, x, y, waist, rise, lagX) {
  const n = Math.round(rise);
  if (n > 0) {
    sx.drawImage(img, 0, 0, 48, waist, x + lagX, y - n, 48, waist);
    sx.drawImage(img, 0, waist, 48, 1, x, y + waist - n, 48, n);          // fill the gap with the waist row
  } else if (n < 0) {
    const m = Math.min(-n, waist - 4);
    sx.drawImage(img, 0, 0, 48, waist - m, x + lagX, y + m, 48, waist - m);
  } else sx.drawImage(img, 0, 0, 48, waist, x + lagX, y, 48, waist);
  sx.drawImage(img, 0, waist, 48, 48 - waist, x, y + waist, 48, 48 - waist);
}
function ringGlow(cx, cy, r, col, alpha) {
  sx.globalAlpha = alpha; sx.fillStyle = col;
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = Math.hypot(x, y * 1.15); if (d <= r && d >= r - 2 && ((x + y) & 1) === 0) sx.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1); }
  sx.globalAlpha = 1;
}
function moodNow() {
  let mood = 'normal', mouth;
  if (S.asleep) mood = 'sleep';
  else if (A && A.type === 'eat') mouth = (A.t * 5 | 0) % 2 ? 'open' : 'small';
  else if (A && A.type === 'no') { mood = 'angry'; mouth = 'flat'; }
  else if (A && A.type === 'scold') mood = 'sad';
  else if (A && (A.type === 'happy' || A.type === 'evolve' && A.t > 1)) mood = 'happy';
  else if (G && G.type === 'catch') mood = G.stun > 0 ? 'angry' : (G.joy > 0 || (G.phase === 'done' && G.score >= 10)) ? 'happy' : (G.phase === 'done' ? 'sad' : 'normal');
  else if (G && G.phase !== 'guess') mood = G.last || G.phase === 'done' && G.score >= 3 ? 'happy' : 'sad';
  else if (S.call && S.call.reason === 'tantrum') mood = 'angry';
  else if (S.sick) mood = 'sick';
  else if (S.hunger < 1 || S.happy < 1) mood = 'sad';
  else if (PM.fid && PM.fid.type === 'yawn') mouth = 'o';
  return { mood, mouth };
}

/* ---- Alive: blinks, gaze, fidgets, gait ---- */
const FIDGETS = { baby: ['hop', 'look', 'shimmy'], child: ['hop', 'look', 'shimmy', 'stretch'], adult: ['stretch', 'look', 'yawn', 'shimmy', 'hop'], senior: ['look', 'yawn', 'stretch'] };
function idleNow() { return !A && !G && !S.asleep && !S.paused && !S.ended && S.stage !== 'seed' && !PET.moving && !(S.call && S.call.reason === 'tantrum'); }
function updateAlive(rdt, time) {
  PM.nextBlink -= rdt;
  if (PM.nextBlink <= 0) { PM.blinkT = .12; PM.nextBlink = Math.random() < .2 ? .22 : rand(2, 5.5); }
  PM.blinkT = Math.max(0, PM.blinkT - rdt);
  PM.nextGlance -= rdt; PM.glanceT = Math.max(0, PM.glanceT - rdt);
  if (PM.nextGlance <= 0) { PM.glanceT = 1.1; PM.nextGlance = rand(5, 9); }
  if (PM.fid) { PM.fid.t += rdt; if (PM.fid.t >= PM.fid.dur) PM.fid = null; }
  if (idleNow() && !PM.fid) {
    PM.nextFid -= rdt;
    if (PM.nextFid <= 0) {
      const list = FIDGETS[S.stage] || FIDGETS.adult; const type = list[(Math.random() * list.length) | 0];
      PM.fid = { type, t: 0, dur: ({ hop: .55, look: 1.7, shimmy: .6, stretch: .95, yawn: 1.3 })[type] };
      PM.nextFid = rand(3.5, 8);
    }
  } else if (!idleNow()) PM.nextFid = Math.max(PM.nextFid, 2.5);
  PM.land = Math.max(0, PM.land - rdt);
}
function gazeDir(px) {
  if (G) return G.type === 'catch' ? (G.moving ? G.dir : 0) : (G.phase === 'reveal' ? G.look * 2 : 0);
  if (A && A.type === 'eat') return 1;
  if (PM.fid && PM.fid.type === 'look') return PM.fid.t < .55 ? -1 : PM.fid.t < 1.2 ? 1 : 0;
  if (S.poops.length && PM.glanceT > 0) { const [sx_] = SLOTS[0]; return Math.sign(sx_ - px); }
  if (PET.moving) return PET.dir;
  if (time_ - PTR.t < 3 && Math.abs(PTR.x - px) > 7) return Math.sign(PTR.x - px);
  return 0;
}
let time_ = 0;

/* ---- Scene rendering ---- */
let TOD_NOW = todAt(0), BGT = 0;
function drawSky(time, px) {
  const tod = TOD_NOW, par = REDUCED ? 0 : (px - 50) * .04;
  const bands = 6;
  sx.save(); sx.beginPath(); sx.rect(0, 0, SW, HORIZON); sx.clip();
  for (let i = 0; i < bands; i++) R(sx, 0, Math.floor(i * HORIZON / bands), SW, Math.ceil(HORIZON / bands) + 1, mix(tod.top, tod.bot, i / (bands - 1)));
  // stars, sun / moon on a shallow arc
  if (tod.night > .25) {
    sx.globalAlpha = Math.min(1, tod.night);
    for (let i = 0; i < STARS.length; i++) { if (REDUCED || ((time * 1.4 + i * .8) | 0) % 3 !== 0) { const [X, Y] = STARS[i]; R(sx, X, Y, 1, 1, '#fff6c8'); if (i % 3 === 0) { R(sx, X - 1, Y, 3, 1, 'rgba(255,246,200,.5)'); R(sx, X, Y - 1, 1, 3, 'rgba(255,246,200,.5)'); } } }
    sx.globalAlpha = 1;
  }
  const p = tod.p, arc = u => 24 - Math.sin(Math.PI * u) * 22;
  if (p < .72) blit(SUN, 4 + p / .72 * 86, arc(p / .72)); else blit(MOON, 8 + (p - .72) / .28 * 82, arc((p - .72) / .28));
  // clouds drift slowly; parallax with the pet
  const dr = REDUCED ? 0 : time * 1.2;
  sx.globalAlpha = .9 - tod.night * .55;
  for (let i = 0; i < 3; i++) blit(LAYERS.cloud, ((i * 46 + dr * (.8 + i * .25) + par * 1.2) % (SW + 24) + SW + 24) % (SW + 24) - 20, 2 + i * 4 - (i === 1 ? 0 : 0));
  sx.globalAlpha = 1;
  sx.restore();
  blit(LAYERS.far, -6 - par * 1.5, HORIZON - 14 + 1);
  blit(LAYERS.mid, -6 - par * 2.5, HORIZON - 13 + 3);
  blit(LAYERS.bush, -6 - par * 4 + (REDUCED ? 0 : Math.round(Math.sin(time * .9) * .5)), HORIZON - 10 + 5);
}
function drawFoliage(time) {
  for (const f of FOLIAGE) {
    const sw = REDUCED ? 0 : Math.round(Math.sin(time * 1.7 + f.ph) * 1.2), x = Math.round(f.x), y = SH - f.h;
    R(sx, x, y + 1, 1, f.h - 1, '#4f9c4a'); R(sx, x + 1, y + 2, 1, f.h - 2, '#6bbf5a'); R(sx, x + sw, y, 1, 1, '#b4ea8a'); R(sx, x + 1 + sw, y + 1, 1, 1, '#8fd470');
  }
}
function drawAtmosphere(time, rdt, px) {
  const night = TOD_NOW.night;
  if (REDUCED) return;
  for (let i = 0; i < 9; i++) {
    const X = (i * 17.3 + time * (2.2 + i % 3 * .8)) % SW, Y = 28 + (i * 7.7) % 36 + Math.sin(time * .7 + i) * 3;
    if (night > .5) { if (Math.sin(time * 2.1 + i * 2) > -.2) { sx.fillStyle = 'rgba(214,255,120,.9)'; sx.fillRect(Math.round(X), Math.round(Y), 1, 1); sx.fillStyle = 'rgba(214,255,120,.3)'; sx.fillRect(Math.round(X) - 1, Math.round(Y), 3, 1); } }
    else if (i < 7) { sx.fillStyle = (i % 2 ? 'rgba(255,255,230,.75)' : 'rgba(255,245,190,.6)'); sx.fillRect(Math.round(X), Math.round(Y), 1, 1); }
  }
  // butterfly (daytime), ladybug (rare, on the foreground), shooting star (night)
  if (!FX.bf) { FX.bfT -= rdt; if (FX.bfT <= 0 && night < .3) { FX.bf = { x: Math.random() < .5 ? -6 : SW + 6, y: rand(24, 50), t: 0 }; FX.bf.vx = FX.bf.x < 0 ? rand(7, 11) : -rand(7, 11); FX.bfT = rand(30, 55); } }
  if (FX.bf) { const b = FX.bf; b.t += rdt; b.x += b.vx * rdt; blit(BUTTERFLY[(time * 9 | 0) % 2], b.x, b.y + Math.sin(b.t * 3.3) * 4); if (b.x < -10 || b.x > SW + 10) FX.bf = null; }
  if (!FX.lb) { FX.lbT -= rdt; if (FX.lbT <= 0) { FX.lb = { x: -5, d: 1 }; FX.lbT = rand(80, 150); } }
  if (FX.lb) { FX.lb.x += rdt * 3.5; blit(LADYBUG, FX.lb.x, SH - 7); if (FX.lb.x > SW + 5) FX.lb = null; }
  if (night > .6) {
    if (!FX.ss) { FX.ssT -= rdt; if (FX.ssT <= 0) { FX.ss = { x: rand(50, 95), y: 1, t: 0 }; FX.ssT = rand(35, 70); } }
    if (FX.ss) {
      const q = FX.ss; q.t += rdt; q.x -= rdt * 60; q.y += rdt * 24;
      for (let i = 0; i < 6; i++) { sx.globalAlpha = 1 - i / 6; R(sx, Math.round(q.x + i * 2.5), Math.round(q.y - i), 1, 1, i ? '#fff6c8' : '#ffffff'); }
      sx.globalAlpha = 1; if (q.t > .8) FX.ss = null;
    }
  }
}
function drawPoops(time, wave) {
  S.poops.forEach((p, i) => {
    const [X, Y] = SLOTS[i % 4]; if (wave !== null && X - 6 > wave) return;
    sx.fillStyle = 'rgba(52,96,64,.35)'; E(sx, X, Y + 1.5, 6, 1.4, 'rgba(52,96,64,.35)');
    blit(POOP, X - 6, Y - 10);
    if (!REDUCED) {
      const w = ((time * 2.2 + i) | 0) % 2;
      P(sx, [X - 1 + w, Y - 12, X + w, Y - 13, X - 1 + w, Y - 14], 'rgba(160,200,90,.85)'); P(sx, [X + 3 - w, Y - 11, X + 3 - w, Y - 12], 'rgba(160,200,90,.85)');
      if (p.t > 12) { const fa = time * 5 + i; P(sx, [Math.round(X + Math.cos(fa) * 5), Math.round(Y - 8 + Math.sin(fa * 1.3) * 3)], '#2a1f45'); }
    }
  });
}
function draw(time, rdt) {
  time_ = time; TOD_NOW = todAt(S.age);
  sx.save();
  const shaking = FX.shake > 0 && !REDUCED;
  if (shaking) sx.translate(Math.round((Math.random() - .5) * 2 * FX.shakeAmp), Math.round((Math.random() - .5) * 2 * FX.shakeAmp));
  sx.clearRect(-2, -2, SW + 4, SH + 4);
  const px0 = (S.stage === 'seed' || S.ended) ? 50 : (G ? (G.type === 'catch' ? G.px : 50) : PET.x);
  sx.drawImage(LAYERS.grass, 0, 0);
  drawSky(time, px0);

  if (S.ended) {
    blit(petSprite('seed', {}), 50 - 24, GROUND - 44);
    sparkles(50, GROUND - 16, time, 14);
    drawFoliage(time); grade(time);
    sx.restore(); return;
  }

  const wave = A && A.type === 'clean' ? SW + 14 - (A.t / A.dur) * (SW + 34) : null;
  drawPoops(time, wave);

  // ---- Bubby
  let stage = S.stage;
  const evo = A && A.type === 'evolve' ? A : null;
  if (evo && evo.t < .8) stage = evo.from;
  const px = stage === 'seed' ? 50 : (G ? (G.type === 'catch' ? G.px : 50) : PET.x);
  let o = {}, shakeX = 0;
  const y0 = GROUND - 46;
  let h = 0, rise = 0, lagX = 0, bob = 0;
  if (stage === 'seed') {
    const prog = S.stage === 'seed' ? S.stageT / STAGE.seed.dur : 1;
    const amp = prog > .45 ? (prog > .8 ? 2 : 1) : 0;
    o.wobble = amp ? Math.round(Math.sin(time * (prog > .8 ? 22 : 7)) * amp) : 0;
    o.crack = prog > .65;
    if (evo) shakeX = Math.round(Math.sin(evo.t * 60) * Math.min(2, evo.t * 4));
    if (o.crack && !REDUCED && prog > .65 && Math.random() < rdt * (prog > .8 ? 7 : 2.5)) emit({ kind: 'spark', x: 50 + rand(-3, 3), y: GROUND - 34 + rand(-4, 4), vy: -8, life: .5, col: '#fff3a8' });
  } else {
    const mn = moodNow();
    o = { mood: mn.mood, mouth: mn.mouth, variant: S.variant, chubby: S.chubby, sick: S.sick && !S.asleep, blink: PM.blinkT > 0 && !S.asleep };
    o.look = gazeDir(px);
    if (o.mood === 'sad') o.tear = ((time * 2.2) | 0) % 3 + 1;
    // breathing: 2-frame inhale/exhale
    const breathe = S.asleep ? Math.sin(time * 1.4) > 0 : Math.sin(time * 2.6) > .1;
    rise = breathe ? 1 : 0;
    // gait
    const moving = PET.moving || (G && G.moving);
    if (moving) {
      const ph = PM.ph;
      if (S.stage === 'baby') { h = Math.abs(Math.sin(ph * Math.PI)) * 5; rise = h > 3.6 ? 1 : h < .6 ? -1 : 0; }
      else if (S.stage === 'child') { h = Math.abs(Math.sin(ph * Math.PI)) * 1.2; lagX = Math.sin(ph * Math.PI) > 0 ? 1 : -1; shakeX = lagX; rise = 0; }
      else if (S.stage === 'adult') { h = Math.abs(Math.sin(ph * Math.PI)) * 2.6; rise = h > 2 ? 1 : h < .5 ? -1 : 0; }
      else { h = PM.stepT < .1 ? 1 : 0; rise = 0; }
    }
    if (S.asleep) rise = breathe ? 1 : 0;
    else if (A && A.type === 'happy') { h = Math.abs(Math.sin(time * 9)) * 3; rise = h > 2 ? 1 : -1; }
    else if (S.call && S.call.reason === 'tantrum') { h = (((time * 9) | 0) % 2) * 1; shakeX = ((time * 14) | 0) % 2 ? 1 : -1; }
    else if (A && A.type === 'eat') { rise = ((A.t * 5) | 0) % 2 ? 1 : -1; }
    else if (A && A.type === 'no') shakeX = (((A.t * 14) | 0) % 2) ? 2 : -2;
    else if (A && A.type === 'scold') { rise = A.t < .15 ? -2 : 0; shakeX = A.t < .4 ? (((A.t * 30) | 0) % 2 ? 1 : -1) : 0; }
    else if (evo && evo.t >= .8) { const k = clamp((evo.t - .95) / .85, 0, 1); h = Math.sin(k * Math.PI) * 7; rise = k < .15 ? -2 : (h > 4 ? 2 : (k > .85 ? -1 : 0)); }
    else if (G && G.type === 'catch' && G.joy > 0) { h = Math.sin(clamp(1 - G.joy / .35, 0, 1) * Math.PI) * 3; rise = 1; }
    else if (G && G.type === 'catch' && G.stun > 0) { shakeX = ((time * 20) | 0) % 2 ? 1 : -1; rise = -1; }
    if (PM.fid && idleNow()) {
      const f = PM.fid, k = f.t / f.dur;
      if (f.type === 'hop') { h = Math.sin(k * Math.PI) * 4; rise = k < .12 ? -2 : k > .85 ? -1 : (h > 2 ? 2 : 1); }
      else if (f.type === 'shimmy') { shakeX = ((f.t * 22) | 0) % 2 ? 1 : -1; lagX = -shakeX; }
      else if (f.type === 'stretch') { rise = k < .2 ? -1 : k < .75 ? 2 : 0; }
      else if (f.type === 'yawn') { rise = k < .6 ? 1 + (k > .15 ? 1 : 0) : 0; }
    }
    // landing squash after a hop
    if (PM.land > 0) rise = Math.min(rise, -1);
    if (h < .3 && PM.prevH > 1.5) PM.land = .1;
    PM.prevH = h;
    // spring-driven follow-through: petals and leaves trail the body
    const targetLag = clamp(-(PET.moving ? PET.dir * 1.4 : 0) + lagX, -2, 2);
    PM.lagX += (targetLag - PM.lagX) * Math.min(1, rdt * 12);
    lagX = Math.round(PM.lagX);
    bob = 0;
  }
  const hy = Math.round(h);
  let spr = petSprite(stage, o);
  // contact shadow shrinks as Bubby leaves the ground
  if (stage !== 'seed') {
    const sw = 9.5 - h * .5;
    E(sx, px, GROUND + 1.6, sw, 1.8, 'rgba(48,92,60,.28)'); E(sx, px, GROUND + 1.6, sw * .68, 1.2, 'rgba(48,92,60,.34)');
  }
  // medicine glow behind Bubby
  if (A && A.type === 'med') { const k = A.t / A.dur; ringGlow(px, GROUND - 22, 14 + Math.round(k * 8), '#9ff5d2', .65 * (1 - k * .5)); ringGlow(px, GROUND - 22, 9 + Math.round(k * 6), '#e6fff4', .55); }
  if (evo) {
    const gk = clamp(evo.t / .8, 0, 1);
    if (evo.t < .8) ringGlow(px, GROUND - 22, 8 + Math.round(gk * 16), '#fff3a8', .25 + gk * .5);
  }
  if (stage === 'seed') {
    blit(spr, px - 24 + shakeX, y0 - hy);
    if (S.stage === 'seed' && o.crack) { sx.globalAlpha = .55 + Math.sin(time * 8) * .25; R(sx, 50 - 1 + (o.wobble || 0), GROUND - 21, 1, 3, '#fff6b8'); sx.globalAlpha = 1; }
  } else if (evo && evo.t < .8) {
    // silhouette flashing, faster as the burst approaches
    const white = ((evo.t * (8 + evo.t * 14)) | 0) % 2 === 0;
    const img = white ? silhouette(spr, '#ffffff') : spr;
    sx.drawImage(img, Math.round(px - 24 + shakeX), y0 - hy);
  } else {
    drawSliced(spr, Math.round(px - 24 + shakeX), y0 - hy, WAIST[stage], rise, lagX);
    if (evo) { const fade = 1 - clamp((evo.t - .8) / .45, 0, 1); if (fade > 0) { sx.globalAlpha = fade; sx.drawImage(silhouette(spr, '#ffffff'), Math.round(px - 24 + shakeX), y0 - hy); sx.globalAlpha = 1; } }
  }
  const top = y0 + HEADTOP[stage] - hy - Math.max(0, rise);

  // ---- Action effects
  if (A) {
    const k = A.t / A.dur;
    if (A.type === 'eat') {
      const bites = Math.min(3, (A.t / .5) | 0), img = ICONS[A.food], w = 16 - bites * 5;
      if (w > 0) sx.drawImage(img, 0, 0, w, 16, Math.round(px + 11), GROUND - 15 - Math.round(Math.abs(Math.sin(A.t * 10)) * (bites ? 1 : 0)), w, 16);
    }
    if (A.type === 'clean' && wave !== null) {
      const wx = Math.round(wave);
      R(sx, wx, 0, 12, SH, '#7fc6f0'); R(sx, wx, 0, 3, SH, '#d6f0ff'); R(sx, wx + 9, 0, 3, SH, '#a6dcf8');
      for (let i = 0; i < 6; i++) P(sx, [wx + 4 + (i * 3) % 7, (i * 13 + (time * 40 | 0)) % SH], '#ffffff');
      // freshly swept grass shimmers behind the wave
      if (!REDUCED) { sx.globalAlpha = .22; for (let X = wx + 12; X < SW; X += 3) { const sh = Math.sin(time * 9 + X * .6); if (sh > .2) R(sx, X, 20 + ((X * 7) % 50), 2, 1, '#ffffff'); } sx.globalAlpha = 1; }
    }
    if (A.type === 'med') blit(ICONS.med, px + 9, top - 6 - Math.round(Math.sin(k * Math.PI) * 4));
    if (A.type === 'scold') { if (((A.t * 6) | 0) % 2 === 0) blit(BANG, px + 10, top - 4); blit(EMOTE_SWEAT, px - 14, top + 3 + Math.round(A.t * 6)); }
    if (A.type === 'no') { blit(EMOTE_SWEAT, px + 12, top + 3 + Math.round(A.t * 4)); }
    if (evo) {
      if (evo.t >= .8) { sx.globalAlpha = 1; }
      if (evo.t < .8) sparkles(px, GROUND - 22, time * 2, 18 - evo.t * 12);
      else if (evo.t < 1.5) sparkles(px, GROUND - 22, time, 14 + (evo.t - .8) * 12);
      if (evo.t >= .8 && evo.t < 1.2) {
        const bk = (evo.t - .8) / .4;
        ringGlow(px, GROUND - 22, Math.round(6 + bk * 34), '#ffffff', 1 - bk);
        for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + .2, r0 = 8 + bk * 10, r1 = r0 + 8 * (1 - bk) + 2; sx.fillStyle = i % 2 ? '#fff3a8' : '#ffffff'; for (let r = r0; r < r1; r += 1) sx.fillRect(Math.round(px + Math.cos(a) * r), Math.round(GROUND - 22 + Math.sin(a) * r * .8), 1, 1); }
      }
    }
    if (A.type === 'sparkle' || A.type === 'happy') sparkles(px, GROUND - 20, time, 15);
  }

  // ---- Seed catch items fall in front of Bubby
  if (G && G.type === 'catch') {
    for (const it of G.items) {
      const img = it.kind === 'gold' ? GOLDSEED : it.kind === 'pebble' ? PEBBLE : SEEDI;
      if (!it.fx) {
        sx.fillStyle = 'rgba(48,92,60,.25)'; E(sx, it.x, GROUND + 1, 2.5, .8, 'rgba(48,92,60,.25)');
        blit(img, it.x - img.width / 2, it.y - img.height / 2);
        if (it.kind === 'gold' && !REDUCED && ((time * 8 + it.x) | 0) % 3 === 0) P(sx, [Math.round(it.x) + 3, Math.round(it.y) - 4, Math.round(it.x) + 2, Math.round(it.y) - 4, Math.round(it.x) + 3, Math.round(it.y) - 5, Math.round(it.x) + 4, Math.round(it.y) - 4, Math.round(it.x) + 3, Math.round(it.y) - 3], '#ffffff');
      } else if (!it.hit) P(sx, [Math.round(it.x) - 2, GROUND - 1, Math.round(it.x) + 2, GROUND - 1, Math.round(it.x), GROUND - 2], '#e9f6dd');
    }
    if (G.stun > 0) blit(EMOTE_VEIN, px + 11, top - 2 + (((time * 10) | 0) % 2));
  }

  drawFoliage(time);
  drawAtmosphere(time, rdt, px);
  grade(time);

  // lights off / night room
  if (!S.lights) {
    R(sx, 0, 0, SW, SH, 'rgba(18,20,48,.8)');
    for (let i = 0; i < STARS.length; i++) { if (((time * 1.3 + i * .7) | 0) % 3 !== 0) P(sx, STARS[i], '#fff6c8'); }
  }

  // ---- Status bubbles (over the dark layer)
  if (S.stage !== 'seed' && !evo) {
    if (S.asleep) {
      const f = time * .9 % 1;
      sx.globalAlpha = 1 - f * .7; blit(ZED, px + 9 + f * 4, top - 2 - f * 8);
      sx.globalAlpha = 1 - ((f + .5) % 1) * .7; blit(ZED, px + 9 + ((f + .5) % 1) * 4, top - 2 - ((f + .5) % 1) * 8);
      sx.globalAlpha = 1;
    }
    if (S.sick && !(A && A.type === 'med')) blit(SKULL, px + 9, top - 4 + Math.round(Math.sin(time * 3)));
    if (S.call && S.call.reason === 'tantrum' && !S.asleep) { if (((time * 3) | 0) % 2) blit(PUFF, px + 11, top + 1); blit(EMOTE_VEIN, px + 9, top - 3 + (((time * 6) | 0) % 2)); }
    else if (S.call && !S.asleep && !G) { const k = (Math.sin(time * 4) + 1) / 2; if (!S.sick || true) blit(BUBBLE, px - 18, top - 2 - Math.round(k * 2)); }
  }

  drawFX(time);
  // evolution light-burst flash over everything
  if (FX.flash > 0) { sx.globalAlpha = Math.min(1, FX.flash / FX.flashDur) * .85; R(sx, 0, 0, SW, SH, FX.flashCol); sx.globalAlpha = 1; }
  if (G && G.type === 'catch' && G.phase === 'done' && G.isBest) drawText(sx, 'NEW BEST!', Math.round(50 - textW('NEW BEST!') / 2), 12 + Math.round(Math.sin(time * 6) * 1.5), '#ffd34a');
  sx.restore();
}
/* day/night colour grade over the garden */
function grade(time) {
  const tod = TOD_NOW; if (tod.a <= .01) return;
  sx.globalCompositeOperation = 'multiply'; sx.fillStyle = mix('#ffffff', tod.tint, Math.min(1, tod.a)); sx.fillRect(0, 0, SW, SH);
  sx.globalCompositeOperation = 'source-over';
}

/* ================= UI ================= */
const TILES = [
  ['feed', 'Feed', '#f7c6d0', 'Meal fills hunger. Snack cheers Bubby up.'],
  ['status', 'Status', '#fbe6a2', 'Check hearts, weight and discipline.'],
  ['discipline', 'Discipline', '#cfe8b8', 'Scold a tantrum.'],
  ['med', 'Medicine', '#ddd2f2', 'Cure sickness. May take a few doses.'],
  ['clean', 'Clean', '#ecd5f3', 'Flush poop before it makes Bubby sick.'],
  ['lights', 'Lights', '#fbd8b6', 'Turn off when Bubby sleeps.'],
  ['play', 'Play', '#c9e2f4', 'Guess its turn, or catch falling seeds.'],
  ['attn', 'Attention', '#fde3c6', 'Flashes when Bubby calls you.'],
];
function buildTiles() {
  TILES.forEach(([k, label, col], i) => {
    const b = document.createElement('button');
    b.className = 'tile'; b.dataset.act = k; b.style.setProperty('--t', col); b.setAttribute('aria-label', label); b.title = label;
    const c = mk(16, 16); c.getContext('2d').drawImage(ICONS[k], 0, 0); b.appendChild(c);
    (i < 4 ? $('#tilesTop') : $('#tilesBot')).appendChild(b);
  });
  $$('canvas[data-icon]').forEach(c => c.getContext('2d').drawImage(ICONS[c.dataset.icon], 0, 0));
}
function buildGuide() {
  const lg = $('#legend');
  TILES.forEach(([k, label, col, text]) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="ic" style="--t:${col}"></span><span><b>${label}</b><span>${text}</span></span>`;
    const c = mk(16, 16); c.getContext('2d').drawImage(ICONS[k], 0, 0); li.querySelector('.ic').appendChild(c);
    lg.appendChild(li);
  });
  renderCollection();
}
/* Collection: optional, separate from the game save. Stages and adult forms the player has raised. */
const CKEY = 'bubby.collection.v1';
const STAGES_ORDER = ['seed', 'baby', 'child', 'adult', 'senior'];
let COL = { stages: { seed: 1 }, forms: {}, fresh: {} };
function loadCol() { try { const o = JSON.parse(localStorage.getItem(CKEY) || 'null'); if (o && typeof o === 'object') COL = Object.assign({ stages: { seed: 1 }, forms: {}, fresh: {} }, o); } catch (e) {} COL.fresh = {}; }
function saveCol() { try { localStorage.setItem(CKEY, JSON.stringify({ stages: COL.stages, forms: COL.forms })); } catch (e) {} }
function unlock(kind, id) { if (!COL[kind][id]) { COL[kind][id] = 1; COL.fresh[kind + id] = 1; saveCol(); renderCollection(); } }
function syncCollection() {
  const i = STAGES_ORDER.indexOf(S.stage);
  for (let k = 0; k <= i; k++) { if (!COL.stages[STAGES_ORDER[k]]) { COL.stages[STAGES_ORDER[k]] = 1; } }
  if (S.variant && (S.stage === 'adult' || S.stage === 'senior')) COL.forms[S.variant] = 1;
  saveCol(); renderCollection();
}
function cardCanvas(stage, variant, locked) {
  const c = mk(48, 48), x = c.getContext('2d'), img = petSprite(stage, { variant, mood: 'normal' });
  x.drawImage(locked ? silhouette(img, '#7d6d99') : img, 0, 0);
  if (locked) { x.globalAlpha = .35; x.globalCompositeOperation = 'source-atop'; x.fillStyle = '#ffffff'; for (let i = 0; i < 48; i += 2) x.fillRect(0, i, 48, 1); }
  return c;
}
function renderCollection() {
  const strip = $('#lifeStrip'); if (!strip) return; strip.textContent = '';
  [['seed', 'Seed', 'egg'], ['baby', 'Bulb', 'baby'], ['child', 'Bud', 'child'], ['adult', 'Blossom', 'adult'], ['senior', 'Elder', 'senior']].forEach(([st, n, sub], i) => {
    const got = !!COL.stages[st], f = document.createElement('figure');
    f.className = 'card' + (got ? '' : ' locked') + (COL.fresh['stages' + st] ? ' new' : ''); f.setAttribute('role', 'listitem');
    f.setAttribute('aria-label', got ? `${n}, ${sub}` : `${n}, not yet raised`);
    f.appendChild(cardCanvas(st, 'radiant', !got));
    f.insertAdjacentHTML('beforeend', `<span class="no">${i + 1}</span><figcaption>${got ? n : '???'}<small>${got ? sub : 'not yet raised'}</small></figcaption>`);
    strip.appendChild(f);
  });
  const forms = $('#forms'); forms.textContent = '';
  [['radiant', 'Radiant Blossom', '0–2 mistakes, well disciplined'], ['daisy', 'Daisy Blossom', 'A few slips along the way'], ['thistle', 'Thistle', 'Lots of mistakes or overweight']].forEach(([v, n, sub]) => {
    const got = !!COL.forms[v], f = document.createElement('figure');
    f.className = got ? '' : 'locked'; if (COL.fresh['forms' + v]) f.classList.add('new');
    f.setAttribute('aria-label', got ? n : 'Adult form not yet raised');
    f.appendChild(cardCanvas('adult', v, !got));
    f.insertAdjacentHTML('beforeend', `<figcaption>${got ? n : '???'}<small>${got ? sub : 'Raise a Bubby to find out'}</small></figcaption>`);
    forms.appendChild(f);
  });
}

let OV = null;
const OVS = { status: '#ovStatus', feed: '#ovFeed', play: '#ovPlay', game: '#ovGame' };
const $gBot = $('#gBot');
function showOv(name) {
  for (const k in OVS) $(OVS[k]).hidden = k !== name;
  OV = name; $gBot.hidden = name !== 'game';
  if (name === 'status') renderStatus(true);
  const first = name && $(OVS[name]).querySelector('button:not([disabled])');
  if (first && document.activeElement && document.activeElement.closest('#device') && name !== 'game') first.focus({ preventScroll: true });
}
function closeOverlays() { for (const k in OVS) $(OVS[k]).hidden = true; OV = null; $gBot.hidden = true; }
function openStatus() { showOv('status'); }
const HEART_CV = { full: null, empty: null };
function heartCanvas(full) {
  const c = mk(9, 8), x = c.getContext('2d');
  x.drawImage(full ? HEART_FULL_C : HEART_EMPTY_C, 0, 0); return c;
}
let lastStat = '';
function hearts(el, v, animate) {
  const n = Math.ceil(v - 1e-3);
  el.setAttribute('aria-label', `${n} of 4`); el.setAttribute('role', 'img');
  el.textContent = '';
  for (let i = 0; i < 4; i++) {
    const c = heartCanvas(i < n);
    if (animate && i < n && !REDUCED) { c.className = 'pop'; c.style.animationDelay = (i * 90) + 'ms'; }
    el.appendChild(c);
  }
}
function drawScale(over) {
  const c = $('#stScale'), x = c.getContext('2d'); x.clearRect(0, 0, 16, 10);
  const hm = healthyMax(S.stage), r = clamp(S.weight / (hm * 1.4), 0, 1), tilt = S.stage === 'seed' ? 0 : Math.round((r - .5) * 6);
  R(x, 7, 9, 2, 1, '#8b7fa0'); R(x, 7, 3, 2, 6, '#b3a7c7'); R(x, 6, 8, 4, 2, '#8b7fa0');
  // beam tilts toward the heavier side
  for (let i = -6; i <= 6; i++) P(x, [8 + i, 2 + Math.round(i * tilt / 12)], '#6c5f85');
  const lx = 2, rx = 14, ly = 3 - Math.round(tilt / 2) * 0, ry = 3;
  const pan = (px, py, col) => { R(x, px - 2, py + 1, 5, 1, col); P(x, [px - 2, py, px + 2, py], '#8b7fa0'); };
  pan(lx + 1, 3 + (tilt > 0 ? -1 : 0) + (tilt < 0 ? 1 : 0), '#ffd34a');
  pan(rx - 1, 3 + (tilt > 0 ? 1 : 0) + (tilt < 0 ? -1 : 0), over ? '#ff7d9c' : '#a7e0a1');
  outline(c, '#3b2f4a');
}
function drawVine(pct) {
  const c = $('#stVine'), x = c.getContext('2d'); x.clearRect(0, 0, 44, 10);
  R(x, 0, 6, 44, 2, '#d9cfe3');
  const len = Math.round(44 * pct / 100);
  for (let i = 0; i < len; i++) { const y = 5 + Math.round(Math.sin(i * .5) * 1); R(x, i, y, 1, 2, i % 6 < 3 ? '#4fae55' : '#3f9a45'); }
  for (let k = 1; k <= 4; k++) {
    const lx = Math.round(44 * k / 4) - 5; if (lx + 4 > len) { P(x, [Math.min(43, lx + 4), 7], '#cfc3dd'); continue; }
    const up = k % 2;
    E(x, lx, up ? 3 : 8, 2.2, 1.4, '#6fd36a', up ? -.6 : .6);
  }
  if (pct >= 100) { P(x, [42, 2, 43, 2, 42, 3, 41, 2, 42, 1], '#ffd34a'); P(x, [42, 2], '#ff7d9c'); }
  else if (len > 0) E(x, len, 5, 1.2, 1.2, '#8fe48a');
  outline(c, '#3b2f4a');
}
function renderStatus(first) {
  if (OV !== 'status') return;
  const hm = healthyMax(S.stage), over = S.weight > hm;
  const key = [S.stage, S.variant, S.hunger > 0 ? Math.ceil(S.hunger - 1e-3) : 0, Math.ceil(S.happy - 1e-3), S.weight, S.discipline, S.mistakes, Math.floor(S.age / DAY), S.gen, S.call && S.call.reason, S.sick, S.poops.length, S.asleep, S.doses].join('|');
  if (!first && key === lastStat) return;
  lastStat = key;
  $('#stName').textContent = stageName();
  $('#stAge').textContent = `Day ${Math.floor(S.age / DAY)} · Gen ${S.gen} · ${S.mistakes} slip${S.mistakes === 1 ? '' : 's'}`;
  $('#stWeight').textContent = S.stage === 'seed' ? '–' : `${S.weight}g ${over ? 'heavy' : 'ok'}`;
  hearts($('#stHunger'), S.hunger, first); hearts($('#stHappy'), S.happy, first);
  drawScale(over); drawVine(S.discipline);
  $('#stVine').setAttribute('aria-label', `Discipline ${S.discipline}%`);
  $('#stDiscN').textContent = S.discipline + '%';
  const c = $('#stCall');
  let msg = '', ok = false;
  if (S.stage === 'seed') { msg = 'The seed is about to sprout.'; ok = true; }
  else if (S.call) msg = CALL_TEXT[S.call.reason];
  else if (S.sick) msg = `Sick: ${S.doses} dose${S.doses > 1 ? 's' : ''} of medicine needed.`;
  else if (S.poops.length) msg = 'There is poop to clean up.';
  else if (S.asleep) { msg = 'Bubby is sleeping soundly.'; ok = true; }
  else { msg = 'Bubby is doing fine.'; ok = true; }
  c.textContent = msg; c.classList.toggle('ok', ok); c.hidden = false;
}
function showEnd() {
  const e = S.ended; if (!e) return;
  $('#endTitle').textContent = e.kind === 'garden' ? 'Bubby returned to the garden' : 'Bubby packed up and moved away';
  const days = Math.floor(e.age / DAY);
  $('#endText').textContent = (e.kind === 'garden'
    ? `A full life of ${days} days as a ${e.name}. It left a seed behind for you.`
    : `After ${days} days as a ${e.name}, Bubby went looking for a better garden. It left a seed behind.`)
    + ` Care mistakes: ${e.mistakes}.`;
  $('#ovEnd').hidden = false;
}

const TOASTS = [];            // {el, t}
const $toasts = $('#toasts');
const toastDefer = [];
function toast(msg) {
  if (OV && OV !== 'game' && OV !== null) { toastDefer.push({ msg, t: 0 }); if (toastDefer.length > 3) toastDefer.shift(); return; }
  if (TOASTS.length && TOASTS[0].msg === msg) { TOASTS[0].t = 0; return; }
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  $toasts.prepend(el);
  TOASTS.unshift({ el, t: 0, msg });
  TOASTS.forEach((o, i) => o.el.classList.toggle('old', i > 0));
  while (TOASTS.length > 2) { const o = TOASTS.pop(); o.el.remove(); }
}
function updateToasts(rdt) {
  for (let i = TOASTS.length - 1; i >= 0; i--) {
    const o = TOASTS[i]; o.t += rdt;
    if (o.t > 2.2 && !o.out) { o.out = true; o.el.classList.add('out'); }
    if (o.t > 2.5) { o.el.remove(); TOASTS.splice(i, 1); }
  }
  if (toastDefer.length && (!OV || OV === 'game')) { const d = toastDefer.shift(); if (d.t < 4) toast(d.msg); }
  for (const d of toastDefer) d.t += rdt;
}

/* ---- Sound ---- */
let AC = null;
function unlockAudio() {
  if (AC || !S.soundOn) return;
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; }
}
function tone(f, d = .08, o = {}) {
  if (!AC || !S.soundOn) return;
  try {
    const t0 = AC.currentTime + (o.at || 0), osc = AC.createOscillator(), g = AC.createGain(), v = o.vol === undefined ? .05 : o.vol;
    osc.type = o.type || 'square'; osc.frequency.setValueAtTime(f, t0);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, f * o.slide), t0 + d);
    g.gain.setValueAtTime(.0001, t0); g.gain.linearRampToValueAtTime(v, t0 + .006); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    osc.connect(g); g.connect(AC.destination); osc.start(t0); osc.stop(t0 + d + .03);
  } catch (e) {}
}
function noise(d = .1, vol = .04, at = 0) {
  if (!AC || !S.soundOn) return;
  try {
    const n = Math.floor(AC.sampleRate * d), buf = AC.createBuffer(1, n, AC.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = AC.createBufferSource(), g = AC.createGain(); src.buffer = buf; g.gain.value = vol; src.connect(g); g.connect(AC.destination); src.start(AC.currentTime + at);
  } catch (e) {}
}
function beep(f, d = .08, vol = .05) { tone(f, d, { vol }); }
const NOTE = n => 523.25 * Math.pow(2, n / 12);
const MAJ = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21];
function sfx(name, n = 0) {
  switch (name) {
    case 'feed': tone(NOTE(4), .07, { type: 'triangle', vol: .08 }); tone(NOTE(9), .1, { type: 'triangle', vol: .08, at: .07 }); break;
    case 'play': [0, 4, 7].forEach((k, i) => tone(NOTE(k + 7), .07, { at: i * .06, vol: .045 })); break;
    case 'clean': noise(.25, .035); tone(NOTE(12), .1, { type: 'triangle', at: .12, vol: .06 }); break;
    case 'lights': tone(NOTE(7), .1, { type: 'triangle', slide: .6, vol: .07 }); break;
    case 'med': tone(NOTE(14), .14, { type: 'triangle', vol: .07 }); tone(NOTE(19), .2, { type: 'triangle', at: .1, vol: .06 }); break;
    case 'scold': tone(NOTE(-12), .14, { type: 'sawtooth', slide: .7, vol: .05 }); noise(.06, .05); break;
    case 'no': tone(NOTE(-5), .08, { slide: .8 }); tone(NOTE(-8), .1, { at: .09, slide: .8 }); break;
    case 'status': tone(NOTE(12), .05, { type: 'triangle', vol: .07 }); break;
    case 'tap': tone(NOTE(10), .03, { type: 'triangle', vol: .06 }); break;
    case 'catch': tone(NOTE(MAJ[Math.min(n, MAJ.length - 1)]), .09, { type: 'triangle', vol: .09 }); tone(NOTE(MAJ[Math.min(n, MAJ.length - 1)] + 12), .06, { at: .03, vol: .025 }); break;
    case 'gold': [0, 4, 7, 12].forEach((k, i) => tone(NOTE(k + 12), .07, { at: i * .045, vol: .05 })); break;
    case 'pebble': noise(.12, .07); tone(NOTE(-17), .16, { type: 'sawtooth', slide: .5, vol: .06 }); break;
    case 'right': tone(NOTE(7), .07, { type: 'triangle', vol: .08 }); tone(NOTE(14), .12, { type: 'triangle', at: .07, vol: .08 }); break;
    case 'wrong': tone(NOTE(-3), .16, { slide: .6, vol: .05 }); break;
    case 'fanfare': [0, 4, 7, 12, 16].forEach((k, i) => tone(NOTE(k + 7), .12, { at: i * .08, vol: .05 })); tone(NOTE(19), .4, { at: .45, type: 'triangle', vol: .07 }); break;
    case 'best': [0, 4, 7, 12, 16, 19, 24].forEach((k, i) => tone(NOTE(k + 7), .1, { at: i * .07, vol: .05 })); [12, 16, 19].forEach(k => tone(NOTE(k + 19), .5, { at: .55, type: 'triangle', vol: .05 })); break;
    case 'evolve-build': [0, 2, 4, 5, 7, 9, 11, 12].forEach((k, i) => tone(NOTE(k), .09, { at: i * .08, type: 'triangle', vol: .04 + i * .004 })); break;
    case 'evolve-pop': noise(.3, .05); [0, 4, 7, 12, 16].forEach((k, i) => tone(NOTE(k + 12), .16, { at: i * .05, type: 'triangle', vol: .06 })); break;
    case 'step': tone(180, .03, { type: 'triangle', vol: .02 }); break;
  }
}
function beepCall() { beep(1046, .07); setTimeout(() => beep(1046, .07), 130); setTimeout(() => beep(1318, .1), 260); }

/* ---- Save ---- */
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function load() {
  try { const t = localStorage.getItem(KEY); if (t) { const o = JSON.parse(t); if (o && o.v === 1) return Object.assign(fresh(), o); } } catch (e) {}
  return null;
}

/* ---- Wiring ---- */
function drawSndIcon(on) {
  const c = $('#sndIcon'), x = c.getContext('2d'); x.clearRect(0, 0, 16, 16);
  const col = on ? '#2f5559' : '#6a7779';
  R(x, 2, 6, 3, 4, col); P(x, [5, 5, 5, 4, 6, 3, 6, 4, 6, 5, 6, 6, 6, 7, 6, 8, 6, 9, 6, 10, 6, 11, 5, 11, 5, 12], col); R(x, 5, 5, 2, 6, col);
  if (on) { P(x, [9, 6, 10, 7, 10, 8, 10, 9, 9, 10], col); P(x, [11, 4, 12, 5, 12, 6, 12, 7, 12, 8, 12, 9, 12, 10, 12, 11, 11, 12], col); }
  else { P(x, [9, 6, 10, 7, 11, 8, 12, 9, 13, 10, 13, 6, 12, 7, 10, 9, 9, 10], col); }
}
function syncControls() {
  $$('[data-speed]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.speed === S.speed)));
  $('#btnSound').setAttribute('aria-pressed', String(S.soundOn !== false));
  $('#sndTxt').textContent = S.soundOn !== false ? 'Sound on' : 'Sound off';
  drawSndIcon(S.soundOn !== false);
  $('#btnPower').setAttribute('aria-pressed', String(!!S.paused));
  $('#ovPause').hidden = !S.paused;
  $('#ovEnd').hidden = !S.ended;
  if (S.ended) showEnd();
}
function wire() {
  $('#device').addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (b) { act(b.dataset.act); return; }
    if (e.target.closest('[data-close]')) { closeOverlays(); return; }
    const f = e.target.closest('[data-food]'); if (f) { feed(f.dataset.food); return; }
    const g = e.target.closest('[data-g]'); if (g) { guess(+g.dataset.g); return; }
    const pg = e.target.closest('[data-game]'); if (pg) { startGame(pg.dataset.game); return; }
  });
  $('#btnReplant').addEventListener('click', () => {
    const gen = S.ended ? S.ended.gen + 1 : S.gen + 1;
    const keep = { speed: S.speed, soundOn: S.soundOn };
    S = Object.assign(fresh(gen), keep); A = null; G = null;
    $('#ovEnd').hidden = true; save(); toast('New seed planted'); syncControls();
  });
  $$('[data-speed]').forEach(b => b.addEventListener('click', () => { S.speed = +b.dataset.speed; syncControls(); save(); }));
  $('#btnSound').addEventListener('click', () => { S.soundOn = S.soundOn === false; if (S.soundOn) unlockAudio(); syncControls(); save(); beep(880, .05); });
  const box = $('#resetBox');
  box.addEventListener('click', e => {
    if (e.target.id === 'btnReset') {
      box.innerHTML = '<span>Plant a new seed? Your current Bubby will be gone.</span><button class="chip danger" id="btnResetYes">Start over</button><button class="chip" id="btnResetNo">Keep playing</button>';
      $('#btnResetNo').focus();
    } else if (e.target.id === 'btnResetYes') {
      const keep = { speed: S.speed, soundOn: S.soundOn };
      S = Object.assign(fresh(1), keep); A = null; G = null; closeOverlays(); save(); syncControls(); toast('New seed planted');
      box.innerHTML = '<button class="chip" id="btnReset">Start over</button>';
    } else if (e.target.id === 'btnResetNo') {
      box.innerHTML = '<button class="chip" id="btnReset">Start over</button>';
    }
  });
  const KEYS = { f: 'feed', p: 'play', c: 'clean', l: 'lights', m: 'med', d: 'discipline', s: 'status', a: 'attn' };
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest && e.target.closest('input, textarea')) return;
    const k = e.key.toLowerCase();
    if (G && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      if (G.type === 'catch') { G.hold = e.key === 'ArrowLeft' ? -1 : 1; G.target = null; } else guess(e.key === 'ArrowLeft' ? -1 : 1);
      return;
    }
    if (OV === 'play' && (k === '1' || k === '2')) { startGame(k === '1' ? 'guess' : 'catch'); return; }
    if (e.key === 'Escape') { if (OV && OV !== 'game') closeOverlays(); return; }
    if (e.key === ' ' && !(e.target.closest && e.target.closest('button'))) { e.preventDefault(); act('pause'); return; }
    if (OV === 'feed' && (k === '1' || k === '2')) { feed(k === '1' ? 'meal' : 'snack'); return; }
    if (KEYS[k]) act(KEYS[k]);
  });
  document.addEventListener('keyup', e => {
    if (G && G.type === 'catch' && ((e.key === 'ArrowLeft' && G.hold < 0) || (e.key === 'ArrowRight' && G.hold > 0))) G.hold = 0;
  });
  // Seed catch: hold the arrow buttons, or touch / drag on the garden to steer Bubby
  const holdOn = (d) => e => { if (G && G.type === 'catch') { e.preventDefault(); G.hold = d; G.target = null; e.currentTarget.classList.add('held'); } };
  const holdOff = () => { $$('.g-btn').forEach(b => b.classList.remove('held')); if (G && G.type === 'catch') G.hold = 0; };
  [['#gLeft', -1], ['#gRight', 1]].forEach(([id, d]) => {
    const b = $(id);
    b.addEventListener('pointerdown', holdOn(d));
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, holdOff));
  });
  let steering = false;
  const steer = e => {
    if (!G || G.type !== 'catch') return;
    const r = scene.getBoundingClientRect();
    G.target = clamp((e.clientX - r.left) / r.width * SW, 13, 87);
  };
  scene.addEventListener('pointermove', e => { const r = scene.getBoundingClientRect(); PTR.x = (e.clientX - r.left) / r.width * SW; PTR.t = time_; });
  scene.addEventListener('pointerdown', e => { if (G && G.type === 'catch') { steering = true; steer(e); try { scene.setPointerCapture(e.pointerId); } catch (_) {} } });
  scene.addEventListener('pointermove', e => { if (steering) steer(e); });
  ['pointerup', 'pointercancel'].forEach(ev => scene.addEventListener(ev, () => { steering = false; if (G && G.type === 'catch') G.target = null; }));
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  window.addEventListener('pagehide', save);
}

function dust(x, n = 4) { for (let i = 0; i < n; i++) emit({ x: x + rand(-4, 4), y: GROUND + 1, vx: rand(-8, 8), vy: rand(-8, -3), g: 14, life: rand(.25, .45), col: i % 2 ? '#e9f6dd' : '#cfe8b8' }); }
function updatePet(rdt) {
  PET.moving = false;
  if (S.stage === 'seed' || S.ended || A || G || S.asleep || S.paused || (S.call && S.call.reason === 'tantrum')) return;
  if (PET.wait > 0) { PET.wait -= rdt; return; }
  const base = S.stage === 'senior' ? 5 : (S.sick ? 3 : (S.stage === 'baby' ? 7 : 9));
  let sp = base;
  const d = PET.tx - PET.x;
  if (Math.abs(d) < .5) { PET.wait = .8 + Math.random() * 2.6; PET.tx = 16 + Math.random() * 44; return; }
  PET.dir = Math.sign(d); PET.moving = true;
  const was = Math.abs(Math.sin(PM.ph * Math.PI));
  if (S.stage === 'baby') { PM.ph += rdt * 2.3; const a = Math.abs(Math.sin(PM.ph * Math.PI)); sp = base * (a > .25 ? 1.8 : .25); if (was > .2 && a <= .2) dust(PET.x, 3); }
  else if (S.stage === 'child') PM.ph += rdt * 3.4;
  else if (S.stage === 'adult') PM.ph += rdt * 4.2;
  else { PM.stepT += rdt; if (PM.stepT > .36) { PM.stepT = 0; dust(PET.x + PET.dir * 10, 2); sfx('step'); } sp = base * (PM.stepT < .14 ? 2.6 : 0); }
  PET.x += PET.dir * Math.min(Math.abs(d), sp * rdt);
}

/* ---- Care and ceremony effects, driven by the current animation ---- */
let prevA = null, aF = {};
function onAEnd(a) {
  const px = petX();
  if (a.type === 'eat') { heartsUp(px, GROUND - 40, a.food === 'snack' ? 4 : 3); sfx('right'); }
  if (a.type === 'clean') { FX.shimmer = 1.2; }
  if (a.type === 'med' && !S.sick) { heartsUp(px, GROUND - 40, 3); sfx('right'); }
}
function onAStart(a) {
  const px = petX();
  if (a.type === 'no') sfx('no');
  if (a.type === 'scold') { sfx('scold'); hitstop(.07); shake(1, .22); burst(px, GROUND - 40, 5, ['#ffb74a', '#ffffff'], { min: 10, max: 24 }); }
  if (a.type === 'clean') sfx('clean');
  if (a.type === 'med') sfx('med');
  if (a.type === 'happy') { heartsUp(px, GROUND - 40, 3); sfx('right'); }
}
function actionFX(rdt, time) {
  if (A !== prevA) { if (prevA) onAEnd(prevA); prevA = A; aF = {}; if (A) onAStart(A); }
  if (!A) return;
  const px = petX();
  if (A.type === 'eat') {
    const b = Math.min(3, (A.t / .5) | 0);
    if (b > (aF.b || 0)) { aF.b = b; burst(px + 12, GROUND - 8, 5, A.food === 'snack' ? ['#ffb3d6', '#ffe27a', '#ffffff'] : ['#f6eede', '#8fc0f0', '#ffffff'], { min: 6, max: 14, up: 10, life: .6 }); tone(NOTE(2 + b * 2), .05, { type: 'triangle', vol: .07 }); }
  }
  if (A.type === 'clean') {
    const wx = SW + 14 - (A.t / A.dur) * (SW + 34);
    if (!REDUCED && Math.random() < rdt * 40) emit({ kind: 'spark', x: wx + rand(-2, 12), y: rand(20, 70), vy: -6, life: .5, col: Math.random() < .5 ? '#ffffff' : '#d6f0ff' });
  }
  if (A.type === 'med' && A.t / A.dur > .3 && !aF.m) { aF.m = 1; burst(px, GROUND - 24, 8, ['#bfffe0', '#ffffff'], { kind: 'spark', min: 6, max: 18, g: -6, life: 1 }); }
  if (A.type === 'evolve') {
    if (A.t < .8 && !REDUCED && Math.random() < rdt * 28) { const a2 = rand(0, 6.28); emit({ kind: 'spark', x: px + Math.cos(a2) * 26, y: GROUND - 22 + Math.sin(a2) * 18, vx: -Math.cos(a2) * 34, vy: -Math.sin(a2) * 24, life: .75, col: '#fff3a8' }); }
    if (A.t >= .8 && !aF.burst) {
      aF.burst = 1; flash('#ffffff', .22); shake(2, .3); sfx('evolve-pop');
      burst(px, GROUND - 22, 28, ['#fff3a8', '#ffffff', '#ffd0e0', '#bfeaff'], { min: 14, max: 46, g: 18, life: 1.1 });
      if (A.from === 'seed') burst(px, GROUND - 14, 12, ['#7f9f4e', '#55702f', '#8c6a3a'], { min: 14, max: 34, g: 90, life: 1 });
    }
    if (A.t >= .85 && !REDUCED && Math.random() < rdt * 22) {
      const cols = S.variant === 'daisy' ? ['#ffffff', '#ffd54f'] : S.variant === 'thistle' ? ['#9a6cc7', '#c39be0'] : ['#f06a5f', '#ffb7a3', '#8be095'];
      emit({ kind: 'petal', x: px + rand(-14, 14), y: GROUND - 8 + rand(-4, 4), vx: rand(-4, 4), vy: rand(-26, -14), life: 1.3, col: cols[(Math.random() * cols.length) | 0] });
    }
  }
}
function updateCard(rdt) {
  const $c = $('#nameCard');
  if (FX.cardPending) {
    FX.cardPending.delay -= rdt;
    if (FX.cardPending.delay <= 0) {
      const c = FX.cardPending; FX.cardPending = null;
      $c.innerHTML = '<b></b><small></small>'; $c.firstChild.textContent = c.title; $c.lastChild.textContent = c.sub;
      $c.classList.remove('out'); $c.hidden = false; FX.card = 3.1;
    }
  }
  if (FX.card > 0) { FX.card -= rdt; if (FX.card < .4) $c.classList.add('out'); if (FX.card <= 0) $c.hidden = true; }
  $toasts.classList.toggle('hold', !$c.hidden);
}

let last = performance.now(), uiT = 0, saveT = 0, prevCall = false;
function frame(now) {
  const rdt = Math.max(0, Math.min(.25, (now - last) / 1000)); last = now;
  const gdt = rdt * (S.speed || 1);
  tick(gdt);
  if (A && !S.paused) { A.t += rdt; if (A.t >= A.dur) { const f = A.after; A = null; if (f) f(); } }
  if (!S.paused) { updateGame(rdt); updatePet(rdt); }
  updateToasts(rdt); updateCard(rdt);
  const t = now / 1000;
  if (!S.paused) { actionFX(rdt, t); updateAlive(rdt, t); }
  if (FX.hit > 0) FX.hit -= rdt;           // hit-stop: hold the last frame for a beat; the simulation keeps its clock
  else { updateFX(rdt); draw(t, rdt); }

  const blinkOn = !!S.call;
  if (blinkOn !== prevCall) { $('[data-act="attn"]')?.classList.toggle('alert', blinkOn); prevCall = blinkOn; }
  uiT += rdt; saveT += rdt;
  if (uiT > .4) {
    uiT = 0;
    $('[data-act="lights"]')?.classList.toggle('on', S.lights);
    $('#subtitle').textContent = `Gen ${S.gen} · ${S.ended ? 'New seed' : stageName()} · Day ${Math.floor(S.age / DAY)}`;
    renderStatus();
  }
  if (saveT > 3) { saveT = 0; save(); }
  requestAnimationFrame(frame);
}

function start(data) {
  const restored = data && data.S ? Object.assign(fresh(), data.S) : load();
  if (restored) S = restored;
  if (S.soundOn === undefined) S.soundOn = true;
  if (![1, 2, 4].includes(S.speed)) S.speed = 1;
  if (data && data.PET) Object.assign(PET, data.PET);
  loadCol(); buildTiles(); buildGuide(); wire(); syncControls(); syncCollection();
  if (!restored) toast('A seed! Watch it sprout');
  requestAnimationFrame(t => { last = t; frame(t); });
}

/* ---- Pixel UI frames (9-slice sources drawn in code) ---- */
function pixFrame(n, o) {
  const c = mk(n, n), x = c.getContext('2d');
  for (let y = 0; y < n; y++) for (let X = 0; X < n; X++) {
    const r = Math.min(X, y, n - 1 - X, n - 1 - y);
    if (r === 0 && (X === 0 || X === n - 1) && (y === 0 || y === n - 1)) continue;
    let col = o.fill;
    if (r === 0) col = o.ink;
    else if (r === 1) col = (y === 1 || X === 1) ? o.hi : o.lo;
    x.fillStyle = col; x.fillRect(X, y, 1, 1);
  }
  return `url(${c.toDataURL()})`;
}
(function frames() {
  const st = document.documentElement.style;
  st.setProperty('--frame', pixFrame(8, { ink: '#3b2f4a', hi: '#ffffff', lo: '#e3d4b4', fill: '#fff8e6' }));
  st.setProperty('--btn', pixFrame(6, { ink: '#3b2f4a', hi: '#ffffff', lo: '#cfc3dd', fill: '#ffffff' }));
  const lc = mk(7, 7), lx = lc.getContext('2d');
  ['.....##', '...####', '..#####', '.#####.', '####...', '#.#....', '#......'].forEach((r, y) => [...r].forEach((ch, X) => { if (ch === '#') { lx.fillStyle = (X + y) % 4 === 0 ? '#8be095' : '#4fae55'; lx.fillRect(X, y, 1, 1); } }));
  st.setProperty('--leaf', `url(${lc.toDataURL()})`);
  st.setProperty('--btnd', pixFrame(6, { ink: '#3b2f4a', hi: '#cfc3dd', lo: '#cfc3dd', fill: '#efe8f5' }));
})();
/* Pick the art-pixel size so that (css px per art pixel) × devicePixelRatio is a whole number. */
const VKEY = 'bubby.view.v1';
function applyView(v) {
  document.documentElement.classList.toggle('compact', v === 'compact');
  const b = $('#btnView'); if (b) { b.setAttribute('aria-pressed', String(v === 'compact')); $('#viewTxt').textContent = v === 'compact' ? 'Toy view' : 'Compact view'; }
  try { localStorage.setItem(VKEY, v); } catch (e) {}
  fitDevice();
}
function fitDevice() {
  const dpr = window.devicePixelRatio || 1, popup = document.documentElement.classList.contains('popup');
  if (document.documentElement.classList.contains('compact')) {
    const vw = popup ? 400 : (document.documentElement.clientWidth || 390);
    let smax = Math.min(3, (vw - 40) / 100);
    if (popup) smax = Math.min(smax, (600 - 62 - 110) / 119);   // screen + button row + controls must fit the popup
    let s = Math.floor(smax * dpr + 1e-6) / dpr; if (s < 1) s = Math.max(.75, smax);
    document.documentElement.style.setProperty('--s', s.toFixed(4) + 'px'); return;
  }
  const vw = popup ? 400 : (document.documentElement.clientWidth || 390);
  let wmax = Math.min(430, (vw - 8) / .844);
  if (popup) wmax = Math.min(wmax, (600 - 62) / 1.6667);      // device is 5:3 tall; leave room for the controls row
  let k = Math.floor(wmax / 189.474 * dpr + 1e-6);
  let s = k / dpr;
  if (popup && s < 1.4) s = 1.5;                               // 1× screens: 1.5 beats a tiny 1.0 (pixels become 1/2 px alternating)
  if (s < 1) s = Math.max(.75, wmax / 189.474);
  document.documentElement.style.setProperty('--s', s.toFixed(4) + 'px');
}
let v0 = 'toy'; try { v0 = localStorage.getItem(VKEY) === 'compact' ? 'compact' : 'toy'; } catch (e) {}
applyView(v0); addEventListener('resize', fitDevice);
$('#btnView').addEventListener('click', () => applyView(document.documentElement.classList.contains('compact') ? 'toy' : 'compact'));
if (window.chrome && chrome.tabs && chrome.runtime && chrome.runtime.getURL) $('#btnFull').addEventListener('click', () => { chrome.tabs.create({ url: chrome.runtime.getURL('bubby.html') }); });
else { const b = $('#btnFull'); if (b) b.remove(); }

/* ---- Device shell (scalloped body and bezel) ---- */
(function buildShell() {
  const ring = (cx, cy, ax, ay, r, n, crx, cry) => {
    let s = `<ellipse cx="${cx}" cy="${cy}" rx="${crx}" ry="${cry}"/>`;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; s += `<circle cx="${(cx + ax * Math.cos(a)).toFixed(1)}" cy="${(cy + ay * Math.sin(a)).toFixed(1)}" r="${r}"/>`; }
    return s;
  };
  const body = ring(180, 349, 112, 180, 61, 16, 152, 220);
  ['#bodySh', '#bodyLn', '#bodyFl', '#bodyShade', '#bodyMatte', '#bodyRim'].forEach(id => { $(id).innerHTML = body; });
  const bc = [180, 290];
  let bez = `<rect x="${bc[0] - 120}" y="${bc[1] - 134}" width="240" height="268" rx="40"/>`;
  const lobes = [[94, 110, 36], [-94, 110, 36], [94, -110, 36], [-94, -110, 36], [34, 124, 32], [-34, 124, 32], [34, -124, 32], [-34, -124, 32], [106, 40, 30], [-106, 40, 30], [106, -40, 30], [-106, -40, 30]];
  lobes.forEach(([dx, dy, r]) => { bez += `<circle cx="${bc[0] + dx}" cy="${bc[1] + dy}" r="${r}"/>`; });
  ['#bezSh', '#bezLn', '#bezFl', '#bezAO', '#bezMatte', '#bezRim'].forEach(id => { $(id).innerHTML = bez; });
  let ch = '';
  const N = 22, a0 = 170 * Math.PI / 180, a1 = 370 * Math.PI / 180, cx = 168, cy = 92, r = 64;
  for (let i = 0; i <= N; i++) {
    const a = a0 + (a1 - a0) * i / N, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r, rot = (a * 180 / Math.PI + 90).toFixed(1);
    ch += i % 2 ? `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="6.5" ry="1.6" transform="rotate(${rot} ${x.toFixed(1)} ${y.toFixed(1)})" stroke-width="2.6"/>`
                : `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="6.5" ry="4" transform="rotate(${rot} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }
  $('#chain').innerHTML = `<g stroke="#7f8894" stroke-width="5.4">${ch}</g>${ch}<g stroke="#ffffff" stroke-width="1.1" opacity=".6" transform="translate(-.7 -.9)">${ch}</g>`;
})();

/* ---- Boot (keeps state across live updates) ---- */
const hot = window.claude && window.claude.hot;
if (hot && hot.snapshot) { try { hot.snapshot(() => ({ S, PET, PM, FX, get A() { return A; }, set A(v) { A = v; }, get G() { return G; }, set G(v) { G = v; } })); } catch (e) {} }
if (hot && hot.ready) hot.ready(start); else start(hot && hot.data ? hot.data : {});
})();
