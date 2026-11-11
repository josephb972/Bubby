// A scripted, sped-up Bubby life for a 9:16 short video (1080×1920).
// Runs in a page served by tools/tiktok-video.mjs; draws with the extension's own sprites and scene code.
// window.frame(i) draws frame i; window.SCRIPT lists the sound cues for the audio track.
import { art, SW, SH, GROUND } from '/art/sprites.js';
import { drawScene, catchY } from '/popup/scene.js';
import * as Rules from '/core/rules.js';

export const FPS = 30, DURATION = 30;
const W = 1080, H = 1920;
const cv = document.getElementById('v'), cx = cv.getContext('2d');
const screen = document.createElement('canvas'); screen.width = SW; screen.height = SH;
const sx = screen.getContext('2d');

// Deterministic randomness, so every render is the same video.
let seed = 7;
const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const S = Rules.fresh(1, { pace: 'quick' }, 0);
Object.assign(S, { stageT: 6, hunger: 3, happy: 3 });
let A = null, G = null;
const PET = { x: 50, tx: 50, dir: 1, wait: .6, moving: false };
const cues = [];
const anim = (type, dur, extra = {}) => { A = { type, t: 0, dur, ...extra }; };
const grow = to => { const from = S.stage; S.stage = to; S.stageT = 0; anim('evolve', 1.8, { from }); cue('up'); };
const cue = name => cues.push({ t: T, name });
let T = 0;

// The story. [time in seconds, caption or null, what happens]
const BEATS = [
  [0.0, 'raising a virtual pet at 10,000x speed', () => {}],
  [2.2, 'it’s a baby!! \u{1F97A}', () => { grow('baby'); S.hunger = 3; S.happy = 3; }],
  [4.0, '4 seconds old. already pooping', () => { S.poops.push({ t: 0 }); cue('poop'); }],
  [4.7, null, () => { S.poops.push({ t: 0 }); cue('poop'); }],
  [5.5, 'it’s fine. it’s fine.', () => { anim('clean', 1.2, { poops: S.poops.length }); S.poops = []; cue('clean'); }],
  [7.0, 'full hearts. still screaming.', () => { S.hunger = 4; S.happy = 4; S.call = { reason: 'tantrum', t: 0 }; cue('call'); }],
  [8.5, 'DISCIPLINE.', () => { S.call = null; S.discipline = 25; anim('scold', 1.1); cue('scold'); }],
  [9.7, 'ok one snack as an apology', () => { anim('eat', .75, { food: 'snack' }); cue('eat'); }],
  [10.5, 'two snacks', () => { anim('eat', .75, { food: 'snack' }); cue('eat'); }],
  [11.3, 'three snacks??', () => { anim('eat', .75, { food: 'snack' }); cue('eat'); }],
  [12.1, 'toothache. obviously.', () => { S.sick = true; S.hunger = 3; S.happy = 2; cue('sick'); }],
  [13.4, 'medicine time \u{1F48A}', () => { anim('med', 1); cue('med'); }],
  [14.4, null, () => { anim('med', .9); S.sick = false; cue('med'); }],
  [15.3, 'cured. no lessons learned', () => { anim('happy', .8); S.happy = 3; cue('yay'); }],
  [16.1, '8 hours of sleep in 2 seconds', () => { S.lights = false; S.asleep = true; cue('off'); }],
  [18.2, null, () => { S.lights = true; S.asleep = false; S.hunger = 2; cue('on'); }],
  [18.6, 'woke up a whole different size', () => grow('child')],
  [20.4, 'minigame time \u{1F3AE}', () => startCatch()],
  [23.15, 'caught a pebble with its face', () => {}],
  [24.3, 'and after all that love it grew up to be…', () => { G = null; S.variant = 'thistle'; grow('adult'); }],
  [25.6, 'a thistle.', () => {}],
  [26.6, 'elder era. hips don’t lie anymore', () => grow('senior')],
  [28.2, 'it left a seed. here we go again \u{1F331}', () => { S.ended = { kind: 'garden' }; A = null; cue('end'); }],
];
let nextBeat = 0, caption = '', captionAt = 0;

// Clock shown on screen: game hours at a few moments, linear in between.
const CLOCK = [[0, 8], [16.1, 21.9], [18.2, 31], [24.3, 3 * 24 + 9], [26.6, 5 * 24 + 15], [28.2, 7 * 24 + 18], [30, 7 * 24 + 18]];
function clock(t) {
  let i = 0; while (i < CLOCK.length - 2 && t > CLOCK[i + 1][0]) i++;
  const [t0, h0] = CLOCK[i], [t1, h1] = CLOCK[i + 1], h = h0 + (h1 - h0) * Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
  const d = Math.floor(h / 24) + 1, hh = Math.floor(h % 24), mm = Math.floor((h % 1) * 60 / 10) * 10;
  return `DAY ${d} · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// Seed catch, scripted: a few seeds and a gold one, then a pebble straight to the face.
function startCatch() {
  G = { type: 'catch', phase: 'play', t: 0, score: 0, px: PET.x, dir: 1, moving: false, stun: 0, joy: 0, items: [],
    plan: [[.15, 34, 'seed'], [.75, 64, 'seed'], [1.25, 44, 'gold'], [1.85, 58, 'pebble'], [2.35, 22, 'seed'], [2.7, 80, 'seed']] };
}
function updateCatch(dt) {
  const g = G; g.t += dt; g.joy = Math.max(0, g.joy - dt); g.stun = Math.max(0, g.stun - dt);
  while (g.plan.length && g.plan[0][0] <= g.t) { const [, x, kind] = g.plan.shift(); g.items.push({ x, y: -4, kind, fx: 0, hit: false }); }
  const cy = catchY(S);
  for (const it of g.items) {
    if (it.fx) { it.fx += dt; continue; }
    it.y += 44 * dt;
    if (it.y >= cy && it.y < cy + 6 && Math.abs(it.x - g.px) < 9) {
      it.hit = true; it.fx = 1e-3;
      if (it.kind === 'pebble') { g.stun = 1.4; g.score = Math.max(0, g.score - 2); cue('bonk'); }
      else { g.joy = .5; g.score += it.kind === 'gold' ? 3 : 1; cue(it.kind === 'gold' ? 'gold' : 'catch'); }
    } else if (it.y >= GROUND - 2) it.fx = 1e-3;
  }
  g.items = g.items.filter(it => !it.fx || it.fx < .5);
  // Bubby runs under the next falling thing (including, sadly, the pebble).
  const want = g.items.filter(it => !it.fx).sort((a, b) => b.y - a.y)[0];
  g.moving = false;
  if (want && !g.stun) {
    const d = want.x - g.px;
    if (Math.abs(d) > .5) { g.dir = Math.sign(d); g.px += g.dir * Math.min(Math.abs(d), 58 * dt); g.moving = true; }
  }
}

function updatePet(dt) {
  PET.moving = false;
  if (S.stage === 'seed' || S.ended || A || G || S.asleep || S.call) return;
  if (PET.wait > 0) { PET.wait -= dt; return; }
  const sp = S.stage === 'senior' ? 6 : 14, d = PET.tx - PET.x;
  if (Math.abs(d) < .5) { PET.wait = .3 + rnd() * .8; PET.tx = 22 + rnd() * 40; }
  else { PET.dir = Math.sign(d); PET.x += PET.dir * Math.min(Math.abs(d), sp * dt); PET.moving = true; }
}

function step(dt) {
  T += dt;
  while (nextBeat < BEATS.length && BEATS[nextBeat][0] <= T + 1e-6) {
    const [, cap, fn] = BEATS[nextBeat++];
    fn();
    if (cap) { caption = cap; captionAt = T; }
  }
  if (S.stage === 'seed') S.stageT = Math.min(17.9, S.stageT + dt * 5.4);
  if (A) { A.t += dt; if (A.t >= A.dur) A = null; }
  if (G) updateCatch(dt);
  updatePet(dt);
}

/* ---------- Drawing ---------- */
const INK = '#3b2f4a';
function rr(x, y, w, h, r) { cx.beginPath(); cx.roundRect(x, y, w, h, r); }
function wrap(text, max) {
  const words = text.split(' '), lines = [];
  let line = '';
  for (const w of words) { const tryL = line ? line + ' ' + w : w; if (cx.measureText(tryL).width > max && line) { lines.push(line); line = w; } else line = tryL; }
  if (line) lines.push(line);
  return lines;
}
function drawCaption(t) {
  if (!caption) return;
  const k = Math.min(1, (t - captionAt) / .14), s = .82 + .18 * (1 - Math.pow(1 - k, 3)) + Math.sin(Math.min(1, k) * Math.PI) * .05;
  cx.save();
  cx.translate(W / 2, 400);
  cx.scale(s, s);
  cx.font = '600 84px Fredoka, "Noto Color Emoji", sans-serif';
  cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.lineJoin = 'round';
  const lines = wrap(caption, 900), lh = 100, y0 = -(lines.length - 1) * lh / 2;
  lines.forEach((l, i) => {
    cx.lineWidth = 18; cx.strokeStyle = INK; cx.strokeText(l, 0, y0 + i * lh);
    cx.fillStyle = '#ffffff'; cx.fillText(l, 0, y0 + i * lh);
  });
  cx.restore();
}
function drawHearts(x, y, label, v) {
  const { HEART_FULL, HEART_EMPTY } = art();
  cx.font = '600 40px Fredoka, sans-serif'; cx.textAlign = 'left'; cx.textBaseline = 'middle'; cx.fillStyle = INK;
  cx.fillText(label, x, y + 26);
  const n = Math.ceil(v - 1e-3);
  for (let i = 0; i < 4; i++) cx.drawImage(i < n ? HEART_FULL : HEART_EMPTY, x + 190 + i * 66, y, 54, 54 * HEART_FULL.height / HEART_FULL.width);
}

function draw(t) {
  // Background: the popup's mint.
  const bg = cx.createRadialGradient(W * .3, 0, 0, W * .3, 0, H * .8);
  bg.addColorStop(0, '#dcf4ed'); bg.addColorStop(1, '#bfe6db');
  cx.fillStyle = bg; cx.fillRect(0, 0, W, H);

  // Device: cream bezel, dark rim, pixel screen at 10×.
  const SX = 40, SY = 640, SC = 10;
  cx.fillStyle = 'rgba(40,60,70,.22)'; rr(SX - 34, SY - 34 + 18, SW * SC + 68, SH * SC + 300, 56); cx.fill();
  cx.fillStyle = '#fffcf3'; rr(SX - 34, SY - 34, SW * SC + 68, SH * SC + 300, 56); cx.fill();
  cx.strokeStyle = '#c7ba98'; cx.lineWidth = 4; cx.stroke();
  cx.fillStyle = '#454b58'; rr(SX - 12, SY - 12, SW * SC + 24, SH * SC + 24, 26); cx.fill();
  drawScene(sx, S, A, G, PET, t);
  cx.imageSmoothingEnabled = false;
  cx.save(); rr(SX, SY, SW * SC, SH * SC, 16); cx.clip(); cx.drawImage(screen, SX, SY, SW * SC, SH * SC); cx.restore();

  // Overlays on the screen: clock and speed, and the minigame score.
  cx.font = '600 44px "Pixelify Sans", monospace'; cx.textBaseline = 'top';
  const pill = (text, x, align) => {
    const w = cx.measureText(text).width + 36, px = align === 'right' ? x - w : x;
    cx.fillStyle = 'rgba(59,47,74,.72)'; rr(px, SY + 18, w, 62, 31); cx.fill();
    cx.fillStyle = '#fff6c8'; cx.textAlign = 'left'; cx.fillText(text, px + 18, SY + 26);
  };
  pill(clock(t), SX + 18);
  pill(G ? `${G.score} pts` : '▶▶ x10000', SX + SW * SC - 18, 'right');

  // Under the screen: name and hearts.
  const name = S.ended ? 'A new seed' : Rules.stageName(S);
  cx.fillStyle = INK; cx.font = '600 52px Fredoka, sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.fillText(`Bubby · ${name}`, W / 2, SY + SH * SC + 70);
  if (S.stage !== 'seed' && !S.ended) {
    drawHearts(SX + 40, SY + SH * SC + 130, 'Hunger', S.hunger);
    drawHearts(SX + 40 + 520 - 40, SY + SH * SC + 130, 'Happy', S.happy);
  }

  drawCaption(t);
}

let frameNo = 0;
window.frame = i => {
  while (frameNo < i) { step(1 / FPS); frameNo++; }
  draw(T);
  return cv.toDataURL('image/png');
};
window.FPS = FPS; window.DURATION = DURATION;
window.CUES = () => cues;
window.ready = document.fonts.ready.then(() => Promise.all(['600 84px Fredoka', '600 44px "Pixelify Sans"'].map(f => document.fonts.load(f)))).then(() => true);
