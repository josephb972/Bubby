// Engine for Bubby short videos (9:16, 1080×1920). Runs in a page served by tools/tiktok-video.mjs and draws
// with the extension's own sprites and scene code. The story comes from tools/video/stories/<name>.js (?story=name).
// window.frame(i) draws frame i; window.CUES() lists the sound cues and window.MUSIC() the music volume (10 per s).
import { art, SW, SH, GROUND } from '/art/sprites.js';
import { drawScene, catchY } from '/popup/scene.js';
import * as Rules from '/core/rules.js';

const FPS = 30, W = 1080, H = 1920;
const cv = document.getElementById('v'), cx = cv.getContext('2d');
const screen = document.createElement('canvas'); screen.width = SW; screen.height = SH;
const sx = screen.getContext('2d');

// Deterministic randomness, so every render is the same video.
let seed = 7;
const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const S = Rules.fresh(1, { pace: 'quick' }, 0);
let A = null, G = null, T = 0, card = null;
const PET = { x: 50, tx: 50, dir: 1, wait: .6, moving: false, walk: null };
const cues = [];

// What a story can do.
const api = {
  S, PET,
  get T() { return T; },
  cue: name => cues.push({ t: T, name }),
  anim: (type, dur, extra = {}) => { A = { type, t: 0, dur, ...extra }; },
  stop: () => { A = null; G = null; },
  grow: to => { const from = S.stage; S.stage = to; S.stageT = 0; api.anim('evolve', 1.8, { from }); api.cue('up'); },
  // Walk to x (in screen pixels, 0–100; beyond that is off screen) at a fixed speed, whatever Bubby is feeling.
  walk: (x, speed = 12) => { PET.walk = { x, speed }; },
  // An end-of-life card over the screen, like the popup's.
  card: (title, text) => { card = title ? { title, text, at: T } : null; },
  // Seed catch, scripted: plan = [[time after start, x, 'seed' | 'gold' | 'pebble'], ...]
  catchGame: plan => { G = { type: 'catch', phase: 'play', t: 0, score: 0, px: PET.x, dir: 1, moving: false, stun: 0, joy: 0, items: [], plan: plan.slice() }; },
};
const name = new URL(import.meta.url).searchParams.get('story') || 'life';
const story = (await import(`/video/stories/${name}.js`)).default(api);
const { beats: BEATS, clock: CLOCK, duration: DURATION } = story;
const badge = story.badge || (() => '▶▶ x10000');
const musicVol = story.music || (() => 1);
let nextBeat = 0, caption = '', captionAt = 0;

function clock(t) {
  let i = 0; while (i < CLOCK.length - 2 && t > CLOCK[i + 1][0]) i++;
  const [t0, h0] = CLOCK[i], [t1, h1] = CLOCK[i + 1], h = h0 + (h1 - h0) * Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
  const d = Math.floor(h / 24) + 1, hh = Math.floor(h % 24), mm = Math.floor((h % 1) * 60 / 10) * 10;
  return `DAY ${d} · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
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
      if (it.kind === 'pebble') { g.stun = 1.4; g.score = Math.max(0, g.score - 2); api.cue('bonk'); }
      else { g.joy = .5; g.score += it.kind === 'gold' ? 3 : 1; api.cue(it.kind === 'gold' ? 'gold' : 'catch'); }
    } else if (it.y >= GROUND - 2) it.fx = 1e-3;
  }
  g.items = g.items.filter(it => !it.fx || it.fx < .5);
  // Bubby runs under the next falling thing (including, sadly, pebbles).
  const want = g.items.filter(it => !it.fx).sort((a, b) => b.y - a.y)[0];
  g.moving = false;
  if (want && !g.stun) {
    const d = want.x - g.px;
    if (Math.abs(d) > .5) { g.dir = Math.sign(d); g.px += g.dir * Math.min(Math.abs(d), 58 * dt); g.moving = true; }
  }
}

let stepT = 0;
function updatePet(dt) {
  PET.moving = false;
  if (PET.walk) {
    const d = PET.walk.x - PET.x;
    if (Math.abs(d) > .5) {
      PET.dir = Math.sign(d); PET.x += PET.dir * Math.min(Math.abs(d), PET.walk.speed * dt); PET.moving = true;
      stepT += dt; if (stepT > .32) { stepT = 0; if (PET.x > 0 && PET.x < 100) api.cue('step'); }
    }
    return;
  }
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
    if (fn) fn();
    if (cap !== null) { caption = cap; captionAt = T; }
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
function drawCard(t, x, y, w, h) {
  const k = Math.min(1, (t - card.at) / .25), cw = w - 100, ch = h - 140;
  cx.save();
  cx.globalAlpha = k;
  cx.fillStyle = 'rgba(30,26,40,.35)'; cx.fillRect(x, y, w, h);
  cx.translate(0, (1 - k) * 40);
  cx.fillStyle = '#fffcf3'; rr(x + 50, y + 70, cw, ch, 28); cx.fill();
  cx.strokeStyle = '#c7ba98'; cx.lineWidth = 5; cx.stroke();
  cx.fillStyle = INK; cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.font = '600 58px Fredoka, sans-serif';
  wrap(card.title, cw - 80).forEach((l, i) => cx.fillText(l, x + w / 2, y + 160 + i * 70));
  cx.font = '400 50px Nunito, sans-serif'; cx.fillStyle = '#5d5070';
  wrap(card.text, cw - 100).forEach((l, i) => cx.fillText(l, x + w / 2, y + 330 + i * 68));
  cx.restore();
}

function draw(t) {
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
  cx.save(); rr(SX, SY, SW * SC, SH * SC, 16); cx.clip(); cx.drawImage(screen, SX, SY, SW * SC, SH * SC);
  if (card) drawCard(t, SX, SY, SW * SC, SH * SC);
  cx.restore();

  // Overlays on the screen: clock, and a badge (speed, minigame score, or whatever the story counts).
  cx.font = '600 44px "Pixelify Sans", monospace'; cx.textBaseline = 'top';
  const pill = (text, x, align) => {
    const w = cx.measureText(text).width + 36, px = align === 'right' ? x - w : x;
    cx.fillStyle = 'rgba(59,47,74,.72)'; rr(px, SY + 18, w, 62, 31); cx.fill();
    cx.fillStyle = '#fff6c8'; cx.textAlign = 'left'; cx.fillText(text, px + 18, SY + 26);
  };
  pill(clock(t), SX + 18);
  pill(G ? `${G.score} pts` : badge(t), SX + SW * SC - 18, 'right');

  // Under the screen: name and hearts.
  const nm = S.ended ? 'A new seed' : Rules.stageName(S);
  cx.fillStyle = INK; cx.font = '600 52px Fredoka, sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.fillText(`Bubby · ${nm}`, W / 2, SY + SH * SC + 70);
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
window.MUSIC = () => Array.from({ length: DURATION * 10 + 1 }, (_, i) => musicVol(i / 10));
window.ready = document.fonts.ready
  .then(() => Promise.all(['600 84px Fredoka', '600 44px "Pixelify Sans"', '400 50px Nunito'].map(f => document.fonts.load(f))))
  .then(() => true);
