// Animations for Bubby's passive behaviours (ids match core/behaviors.js).
// Each script has a duration and up to three parts, all pure functions of time (no state of their own):
//   pose(c)  → { dx, dy, mood, mouth, look, blink, flip, rot, sqy, still }  how Bubby itself moves
//   back(c)  draws behind Bubby,  front(c)  draws in front
// c: { x (canvas), t (s), k (0–1), T (clock), px, gy (ground), top (head top), ey/my (eye and mouth y),
//      hx/hy (where a held thing goes), stage, r(i) (random 0–1, fixed for this run) }
import { E, R, P, INK, art } from '../art/sprites.js';
import { props, speech } from '../art/props.js';

const PI = Math.PI;
const hop = (t, rate = 2, h = 3) => -Math.round(Math.abs(Math.sin(t * PI * rate)) * h);
const sq = (t, rate) => ((t * rate) | 0) % 2;                // 0/1 square wave
const arc = k => Math.sin(Math.max(0, Math.min(1, k)) * PI);
const lerp = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
const btw = (c, a, b) => c.t >= a && c.t < b;
const there = (c, a, b) => c.k >= a && c.k < b;

function put(c, name, X, Y, flip) {
  const img = props()[name]; if (!img) return;
  const x0 = Math.round(X - img.width / 2), y0 = Math.round(Y - img.height / 2);
  if (!flip) return c.x.drawImage(img, x0, y0);
  c.x.save(); c.x.translate(x0 + img.width, y0); c.x.scale(-1, 1); c.x.drawImage(img, 0, 0); c.x.restore();
}
function crop(c, name, X, Y, w) { const img = props()[name]; if (w > 0) c.x.drawImage(img, 0, 0, w, img.height, Math.round(X - img.width / 2), Math.round(Y - img.height / 2), w, img.height); }
const say = (c, s) => speech(c.x, s, c.px + 5, c.top - 13, 100);
function sparkle(c, X, Y, t, r = 6) {
  for (let i = 0; i < 4; i++) {
    const a = t * 3 + i * PI / 2, px = Math.round(X + Math.cos(a) * r), py = Math.round(Y + Math.sin(a) * r * .7);
    c.x.fillStyle = i % 2 ? '#ffffff' : '#ffe14a'; c.x.fillRect(px, py, 1, 1); c.x.fillRect(px - 1, py, 3, 1); c.x.fillRect(px, py - 1, 1, 3);
  }
}
// Things floating up and fading: hearts, notes, bubbles
function floaters(c, name, n, X, Y, period = 1.2, rise = 12) {
  for (let i = 0; i < n; i++) {
    const f = ((c.t + i * period / n) / period) % 1;
    if (c.t < i * period / n) continue;
    c.x.globalAlpha = 1 - f * .8;
    put(c, name, X + Math.sin(f * 6 + i) * 3, Y - f * rise);
    c.x.globalAlpha = 1;
  }
}
function drops(c, X, Y, n, col = '#6fb8ea', len = 10, w = 8) {
  for (let i = 0; i < n; i++) {
    const f = (c.t * 2.2 + i / n) % 1, dx = Math.round(X - w / 2 + ((i * 37) % w));
    P(c.x, [dx, Math.round(Y + f * len)], col); P(c.x, [dx, Math.round(Y + f * len) + 1], col);
  }
}
function dust(c, X, Y, t0, len = .4) {
  const f = (c.t - t0) / len; if (f < 0 || f > 1) return;
  c.x.globalAlpha = 1 - f;
  for (const s of [-1, 1]) { E(c.x, X + s * (2 + f * 5), Y - f * 2, 1.6 - f, 1.2 - f * .8, '#e9f6dd'); }
  c.x.globalAlpha = 1;
}
function tear(c, X, Y, f) { P(c.x, [Math.round(X), Math.round(Y + f * 6), Math.round(X), Math.round(Y + f * 6) + 1], '#6fb8ea'); }
function sweat(c) { const f = (c.t * 1.5) % 1; P(c.x, [c.px + 8, Math.round(c.top + 3 + f * 4), c.px + 9, Math.round(c.top + 4 + f * 4), c.px + 8, Math.round(c.top + 4 + f * 4)], '#8fd0f8'); }
function line(c, x0, y0, x1, y1, col, sag = 0) {
  const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  c.x.fillStyle = col;
  for (let i = 0; i <= n; i++) { const k = i / n; c.x.fillRect(Math.round(lerp(x0, x1, k)), Math.round(lerp(y0, y1, k) + Math.sin(k * PI) * sag), 1, 1); }
}
function rope(c, a) {
  const yA = c.gy - 9, mid = (c.top + c.gy) / 2, r = (c.gy - c.top) / 2 + 3, yM = mid - Math.cos(a) * r;
  const x0 = c.px - c.w + 2, x1 = c.px + c.w - 2;
  line(c, x0, yA, x1, yA, '#ffffff', yM - yA);
  R(c.x, x0 - 1, yA - 1, 2, 3, '#e8524a'); R(c.x, x1, yA - 1, 2, 3, '#e8524a');
}
function thought(c, X, Y, draw) {
  E(c.x, X - 6, Y + 9, 1, 1, '#ffffff'); E(c.x, X - 4, Y + 6, 1.5, 1.5, '#ffffff');
  E(c.x, X + 3, Y, 7, 5, INK); E(c.x, X + 3, Y, 6, 4, '#ffffff'); draw(X + 3, Y);
}

export const SCRIPTS = {
  /* ---------- Play ---------- */
  ball: { dur: 4.5,
    pose: c => { const bx = Math.sin(c.t * 1.8) * 9; return { look: bx > 0 ? 1 : -1, dy: Math.abs(Math.cos(c.t * 1.8)) > .92 ? -2 : 0, mood: 'happy' }; },
    front: c => put(c, 'ball', c.px + Math.sin(c.t * 1.8) * 9 + (Math.sin(c.t * 1.8) > 0 ? 9 : -9), c.gy - 4 - Math.abs(Math.sin(c.t * 5)) * 2) },
  headball: { dur: 4,
    pose: c => ({ look: 0, mouth: c.k > .8 ? 'frown' : 'open', mood: c.k > .8 ? 'sad' : 'happy', dy: c.k < .8 ? -sq(c.t, 5) : 0 }),
    front: c => { if (c.k < .8) put(c, 'ball', c.px, c.top - 5 - Math.abs(Math.sin(c.t * 5)) * 9); else put(c, 'ball', c.px + 14, lerp(c.top, c.gy - 4, (c.k - .8) * 8)); } },
  butterfly: { dur: 5.5,
    pose: c => ({ dx: Math.round(Math.sin(c.t * 1.5) * 12), look: Math.cos(c.t * 1.5) > 0 ? 1 : -1, dy: c.k > .88 ? 2 : hop(c.t, 3, 2), mood: c.k > .88 ? 'sad' : 'happy', sqy: c.k > .88 ? .88 : 0 }),
    front: c => {
      const bx = c.px0 + Math.sin(c.t * 1.5 + .7) * 16 + 3, by = c.top - 3 + Math.sin(c.t * 4) * 3 - c.k * 6, flap = sq(c.t, 8);
      E(c.x, bx - 2, by, flap ? 1.6 : 2.2, flap ? 2.4 : 1.6, '#ffb43a'); E(c.x, bx + 2, by, flap ? 1.6 : 2.2, flap ? 2.4 : 1.6, '#ffb43a'); P(c.x, [Math.round(bx), Math.round(by), Math.round(bx), Math.round(by) + 1], INK);
    } },
  rope: { dur: 4,
    pose: c => { const ph = (c.t * 1.6) % 1; return { dy: ph > .55 && ph < .95 ? -Math.round(arc((ph - .55) / .4) * 4) : 0, mood: 'happy', look: 0 }; },
    // The rope swings round Bubby: over its head, then under its feet (drawn behind on the way back).
    back: c => { const a = (c.t * 1.6) % 1 * PI * 2; if (Math.sin(a) < 0) rope(c, a); },
    front: c => { const a = (c.t * 1.6) % 1 * PI * 2; if (Math.sin(a) >= 0) rope(c, a); } },
  dizzy: { dur: 3.6,
    pose: c => c.k < .55 ? { flip: sq(c.t, 9) === 1, mood: 'happy' } : { dx: sq(c.t, 4) ? 1 : -1, mood: 'sick', mouth: 'wavy', rot: 0 },
    front: c => { if (c.k >= .55) sparkle(c, c.px, c.top - 2, c.t * 2, 5); } },
  bubbles: { dur: 4.5,
    pose: c => ({ mouth: 'small', look: 1, mood: c.k > .7 ? 'happy' : undefined }),
    front: c => {
      put(c, 'wand', c.px + 9, c.my + 1);
      for (let i = 0; i < 5; i++) {
        const t0 = i * .6, f = (c.t - t0) / 2.2; if (f < 0 || f > 1) continue;
        const bx = c.px + 12 + f * 16 + Math.sin(f * 9 + i) * 2, by = c.my - f * 22;
        if (f > .92) sparkle(c, bx, by, c.t, 2); else { E(c.x, bx, by, 2.4, 2.4, '#e6f6ff'); E(c.x, bx, by, 1.6, 1.6, '#9ad67f'); P(c.x, [Math.round(bx) - 1, Math.round(by) - 1], '#ffffff'); }
      }
    } },
  kite: { dur: 6,
    pose: () => ({ look: 2, mood: 'happy', mouth: 'open' }),
    back: c => { const kx = Math.min(92, c.px + 26 + Math.sin(c.t * 1.3) * 5), ky = 10 + Math.sin(c.t * 2.1) * 3 + (1 - Math.min(1, c.t)) * 20; line(c, c.px + 9, c.hy, kx, ky + 5, '#ffffff', 3); put(c, 'kite', kx, ky); for (let i = 1; i < 4; i++) P(c.x, [Math.round(kx - i * 2 + Math.sin(c.t * 5 + i)), Math.round(ky + 6 + i * 2)], i % 2 ? '#ff5f86' : '#5a8fd6'); } },
  peekaboo: { dur: 4.5,
    pose: c => ({ mood: c.t > 2.6 ? 'happy' : 'normal', mouth: c.t > 2.6 ? 'open' : undefined, dy: c.t > 2.6 ? hop(c.t, 2, 2) : 0 }),
    front: c => { const peek = btw(c, 1, 1.4) || c.t > 2.6; put(c, 'bigleaf', c.px + (peek ? 13 : 0), c.ey + 3); if (c.t > 2.6 && c.t < 3.8) say(c, 'BOO'); } },
  cartwheel: { dur: 2.4,
    pose: c => ({ rot: Math.floor(c.k * 8) % 4, dx: Math.round(lerp(0, 18, c.k)) * (c.r(0) > .5 ? 1 : -1), dy: -Math.round(arc(c.k * 2 % 1) * 3) - (Math.floor(c.k * 8) % 2 ? 4 : 0), mood: 'happy' }),
    front: c => { if (c.k > .92) sparkle(c, c.px, c.top, c.t, 6); } },
  yoyo: { dur: 4.2,
    pose: c => ({ look: c.k < .65 ? 1 : 0, mood: c.k < .65 ? 'happy' : 'sad', mouth: c.k < .65 ? undefined : 'wavy' }),
    front: c => {
      if (c.k < .65) { const L = 2 + Math.abs(Math.sin(c.t * 3.2)) * 11; line(c, c.hx, c.hy, c.hx, c.hy + L, '#ffffff'); put(c, 'yoyo', c.hx, c.hy + L + 2); }
      else { for (let i = 0; i < 4; i++) line(c, c.px - 7, c.hy - 6 + i * 3, c.px + 7, c.hy - 4 + i * 3, '#ffffff'); put(c, 'yoyo', c.px + 7, c.hy + 4); }
    } },

  /* ---------- Food (just for show) ---------- */
  apple: { dur: 4,
    pose: c => ({ mouth: sq(c.t, 4) ? 'open' : 'small', mood: c.k > .85 ? 'happy' : undefined }),
    front: c => crop(c, 'apple', c.px + 9, c.my, 9 - Math.min(4, (c.k * 5) | 0) * 2) },
  cookie: { dur: 4,
    pose: c => c.k < .5 ? { look: sq(c.t, 1.5) ? 2 : -2, mouth: 'flat' } : { mouth: sq(c.t, 6) ? 'open' : 'small', mood: 'happy' },
    front: c => { if (c.k < .5) put(c, 'cookie', c.px - 10, c.hy + 2); else crop(c, 'cookie', c.px + 9, c.my, 8 - Math.min(3, ((c.k - .5) * 8) | 0) * 2); if (c.k < .5) sweat(c); } },
  lolly: { dur: 4,
    pose: c => ({ mouth: sq(c.t, 3) ? 'open' : 'smile', mood: 'happy', look: 1 }),
    front: c => put(c, 'lolly', c.px + 9, c.my + 3) },
  cakedream: { dur: 4.5,
    pose: c => ({ look: 2, mouth: 'open', blink: false }),
    front: c => { thought(c, c.px + 16, c.top - 4, (X, Y) => c.x.drawImage(art().ICONS.snack, X - 8, Y - 9)); P(c.x, [c.px + 1, Math.round(c.my + 2 + (c.t * 2 % 1) * 2)], '#8fd0f8'); } },
  rumble: { dur: 3,
    pose: c => ({ mood: 'sad', dx: btw(c, .6, 1.6) ? (sq(c.t, 14) ? 1 : -1) : 0 }),
    front: c => { if (btw(c, .5, 2.4)) say(c, 'GRR'); } },
  juice: { dur: 4,
    pose: c => ({ mouth: 'small', mood: c.k > .8 ? 'happy' : undefined, look: 1 }),
    front: c => put(c, 'juice', c.px + 8, c.my + 3) },
  berry: { dur: 3.5,
    pose: c => ({ look: 0, mouth: c.k < .55 ? 'open' : 'smile', mood: c.k >= .55 ? 'happy' : undefined, dy: c.k >= .55 ? hop(c.t, 2, 2) : 0 }),
    front: c => { if (c.k < .55) put(c, 'berry', c.px + 1, lerp(-4, c.my, c.k / .55)); else sparkle(c, c.px, c.my - 2, c.t, 5); } },
  sniff: { dur: 4,
    pose: c => ({ look: Math.sin(c.t * 2) > 0 ? 2 : -2, mouth: 'small', dx: Math.round(Math.sin(c.t) * 4) }),
    front: c => { if (sq(c.t, 2)) { P(c.x, [c.px + 4, c.my - 2, c.px + 6, c.my - 3, c.px + 7, c.my - 2], '#ffffff'); } if (c.k > .7) say(c, '?'); } },
  veggie: { dur: 3.6,
    pose: c => c.k < .45 ? { look: 1, mouth: 'flat' } : { dx: sq(c.t, 6) ? 1 : -1, mouth: 'frown', mood: 'angry' },
    front: c => { put(c, 'veggie', c.px + c.w + 3 + (c.k > .7 ? (c.k - .7) * 30 : 0), c.gy - 5); if (btw(c, 1.8, 3)) say(c, 'BLEH'); } },

  /* ---------- Garden ---------- */
  flower: { dur: 4.2,
    pose: c => ({ mood: c.k > .4 ? 'happy' : undefined, look: 1 }),
    front: c => { put(c, 'flower', c.px + 9, lerp(c.gy - 6, c.my, c.k * 3)); if (c.k > .4) floaters(c, 'heart', 2, c.px + 4, c.top, 1.4, 10); } },
  water: { dur: 4.2,
    pose: c => ({ mood: 'happy', mouth: 'open', look: 0, dx: c.k > .8 ? (sq(c.t, 12) ? 1 : -1) : 0 }),
    front: c => { if (c.k < .8) { put(c, 'can', c.px + 9, c.top - 6); drops(c, c.px + 2, c.top - 3, 8, '#6fb8ea', c.gy - c.top - 6, 10); } } },
  sunbathe: { dur: 5,
    pose: () => ({ mood: 'happy', mouth: 'smile', sqy: .94, still: true }),
    back: c => { E(c.x, 6, 6, 5, 5, '#ffe14a'); for (let i = 0; i < 8; i++) { const a = i * PI / 4 + c.t * .5; P(c.x, [Math.round(6 + Math.cos(a) * 8), Math.round(6 + Math.sin(a) * 8)], '#fff3b0'); } },
    front: c => sparkle(c, c.px, c.top + 4, c.t * .5, 12) },
  ladybug: { dur: 5,
    pose: c => { const bx = lerp(20, -20, c.k); return { look: bx > 2 ? 2 : (bx < -2 ? -2 : 0), mood: btw(c, 2, 3) ? 'happy' : undefined }; },
    front: c => put(c, 'bug', c.px + lerp(20, -20, c.k), c.gy - 1) },
  dig: { dur: 4,
    pose: c => ({ dy: sq(c.t, 4) ? 1 : 0, sqy: sq(c.t, 4) ? .92 : 0, mood: 'happy', look: 1 }),
    front: c => { const g = Math.min(1, c.k * 1.3); crop(c, 'mound', c.px + c.w + 5, c.gy - 1, Math.round(14 * g)); for (let i = 0; i < 3; i++) { const f = (c.t * 2 + i / 3) % 1; P(c.x, [Math.round(c.px + c.w + f * 8), Math.round(c.gy - 4 - arc(f) * 6)], '#8a5a36'); } } },
  plant: { dur: 4.5,
    pose: c => ({ dy: btw(c, 1, 2.6) ? sq(c.t, 4) : 0, look: 1, mood: c.k > .75 ? 'happy' : undefined }),
    front: c => { const X = c.px + c.w + 4; put(c, 'hole', X, c.gy); if (c.t < 1) put(c, 'seedi', X, lerp(c.hy, c.gy - 1, c.t)); if (c.k > .7) { put(c, 'sprout', X, c.gy - 3); sparkle(c, X, c.gy - 4, c.t, 4); } } },
  dandelion: { dur: 4.5,
    pose: c => ({ mouth: btw(c, 1.4, 2.6) ? 'small' : undefined, look: 1, mood: c.t > 2.6 ? 'happy' : undefined }),
    front: c => {
      put(c, c.t < 1.6 ? 'dandelion' : 'stem', c.px + 10, c.my + 2);
      if (c.t > 1.4) for (let i = 0; i < 7; i++) { const f = (c.t - 1.4 - i * .1) / 2.6; if (f < 0 || f > 1) continue; P(c.x, [Math.round(c.px + 11 + f * 34 + i), Math.round(c.my - 2 - f * 14 + Math.sin(f * 8 + i) * 3)], '#ffffff'); }
    } },
  roll: { dur: 3.2,
    pose: c => ({ rot: Math.floor(c.k * 8) % 4, dx: Math.round(Math.sin(c.k * PI) * 10) * (c.r(0) > .5 ? 1 : -1), dy: Math.floor(c.k * 8) % 2 ? 3 : 0, mood: 'happy' }),
    front: c => { for (let i = 0; i < 3; i++) P(c.x, [c.px - 8 + ((i * 7 + (c.t * 9 | 0)) % 16), c.gy - 2 - ((i * 3 + (c.t * 7 | 0)) % 4)], '#6fb35e'); } },
  bird: { dur: 5.5,
    pose: c => ({ look: 0, mood: there(c, .25, .85) ? 'happy' : undefined, still: there(c, .25, .85) }),
    front: c => {
      const land = c.top - 2;
      if (c.k < .25) put(c, sq(c.t, 8) ? 'bird' : 'bird2', lerp(-6, c.px + 2, c.k / .25), lerp(6, land, c.k / .25));
      else if (c.k < .85) { put(c, 'bird', c.px + 2, land); if (sq(c.t, 1.5)) put(c, 'note', c.px + 9, land - 6); }
      else put(c, sq(c.t, 8) ? 'bird' : 'bird2', lerp(c.px + 2, 106, (c.k - .85) / .15), lerp(land, -6, (c.k - .85) / .15));
    } },
  clouds: { dur: 5.5,
    pose: c => ({ look: Math.round(lerp(-2, 2, c.k)), mood: 'normal', mouth: 'small', still: true }),
    back: c => { put(c, 'cloud', lerp(-12, 112, c.k), 10); put(c, 'cloud', lerp(30, 120, c.k * .8), 4); } },

  /* ---------- Clean ---------- */
  bath: { dur: 5.5,
    pose: () => ({ dy: 4, mood: 'happy', mouth: 'open' }),
    front: c => {
      put(c, 'tub', c.px, c.gy - 4);
      for (let i = 0; i < 9; i++) E(c.x, c.px - 12 + i * 3, c.gy - 9 + (i % 2), 2, 1.6, '#ffffff');
      E(c.x, c.px + 10, c.gy - 10, 1.6, 1.2, '#ffd23f'); P(c.x, [c.px + 12, c.gy - 10], '#ff9a2e');
      for (let i = 0; i < 4; i++) { const f = (c.t * .6 + i / 4) % 1; E(c.x, c.px - 8 + i * 5, c.gy - 10 - f * 18, 1.4, 1.4, '#e6f6ff'); }
    } },
  shower: { dur: 4.5,
    pose: c => ({ mood: 'happy', mouth: 'smile', blink: true, dx: c.k > .85 ? (sq(c.t, 12) ? 1 : -1) : 0 }),
    front: c => { if (c.k < .85) { put(c, 'raincloud', c.px, c.top - 9); drops(c, c.px, c.top - 5, 9, '#6fb8ea', c.gy - c.top, 14); } } },
  teeth: { dur: 3.6,
    pose: () => ({ mouth: 'open', look: 0 }),
    front: c => { put(c, 'brush', c.px + 2 + Math.round(Math.sin(c.t * 14) * 2), c.my + 4); if (c.k > .3) P(c.x, [c.px - 2, c.my + 2, c.px + 3, c.my + 3, c.px + 1, c.my + 2], '#ffffff'); } },
  sweep: { dur: 4.5,
    pose: c => ({ dx: Math.round(Math.sin(c.k * PI * 2) * 8), look: Math.cos(c.k * PI * 2) > 0 ? 1 : -1, mood: 'happy' }),
    front: c => { const s = Math.sin(c.t * 6); put(c, 'broom', c.px + 9 + s * 2, c.gy - 8, s < 0); dust(c, c.px + 13, c.gy - 1, Math.floor(c.t * 1.5) / 1.5, .5); } },
  comb: { dur: 3.6,
    pose: () => ({ mood: 'happy', look: 0, still: true }),
    front: c => { put(c, 'comb', c.px - 6 + (c.t * 9 % 12), c.top + 2); if (c.k > .6) sparkle(c, c.px, c.top + 2, c.t, 8); } },
  shake: { dur: 2.2,
    pose: c => ({ dx: sq(c.t, 16) ? 2 : -2, mood: 'happy', mouth: 'open' }),
    front: c => { for (let i = 0; i < 8; i++) { const a = i * PI / 4, f = (c.t * 2.5 + i * .13) % 1; P(c.x, [Math.round(c.px + Math.cos(a) * (8 + f * 10)), Math.round(c.gy - 14 + Math.sin(a) * (6 + f * 8))], '#6fb8ea'); } } },

  /* ---------- Calm ---------- */
  read: { dur: 5.5,
    pose: c => ({ look: 0, mood: btw(c, 3.6, 4.6) ? 'happy' : undefined, mouth: 'small', still: true }),
    front: c => put(c, ((c.t / 1.6) | 0) % 2 ? 'book2' : 'book', c.px + 1, c.my + 5) },
  meditate: { dur: 5.5,
    pose: c => ({ mood: 'sleep', mouth: 'smile', dy: -Math.round(lerp(0, 6, c.t) + Math.sin(c.t * 2) * 1.5) * (c.k > .9 ? 0 : 1) }),
    back: c => { if (c.k < .9) { const a = .45 + Math.sin(c.t * 3) * .15; c.x.globalAlpha = a; E(c.x, c.px, c.gy - 20 - lerp(0, 6, c.t), c.w + 4, 22, '#fff6c8'); c.x.globalAlpha = 1; sparkle(c, c.px, c.top + 6 - lerp(0, 6, c.t), c.t * .6, c.w + 2); } },
    front: c => { if (c.k < .9) E(c.x, c.px, c.gy + 1, 7 - lerp(0, 3, c.t), 1.2, 'rgba(64,120,52,.35)'); } },
  stretch: { dur: 4,
    pose: c => ({ sqy: c.k < .5 ? lerp(1, 1.12, c.k * 4) : lerp(1.12, .9, (c.k - .5) * 4), mood: c.k > .5 ? 'happy' : 'sleep', mouth: c.k < .5 ? 'open' : undefined }) },
  diary: { dur: 5,
    pose: () => ({ look: 1, mouth: 'small', still: true }),
    front: c => { put(c, 'diary', c.px + c.w + 3, c.gy - 6); put(c, 'pencil', c.px + c.w + 3 + Math.round(Math.sin(c.t * 9) * 2), c.gy - 9); if (c.k > .75) say(c, 'HEHE'); } },
  pushups: { dur: 4,
    pose: c => ({ sqy: sq(c.t, 3) ? .84 : 1, dy: sq(c.t, 3) ? 1 : 0, mood: 'angry', mouth: 'flat', look: 0 }),
    front: c => { if (c.t > .5) say(c, String(Math.min(3, (c.t / 1.1 | 0) + 1))); sweat(c); } },
  ponder: { dur: 4,
    pose: c => ({ look: 2, mouth: c.k > .75 ? 'open' : 'flat', mood: c.k > .75 ? 'happy' : undefined, still: true }),
    front: c => say(c, c.k > .75 ? '!' : '?') },
  telescope: { dur: 5.5,
    pose: c => ({ look: 2, mood: c.k > .7 ? 'happy' : undefined, mouth: c.k > .7 ? 'open' : 'small', still: true }),
    back: c => { for (let i = 0; i < 4; i++) if (sq(c.t + i * .3, 2)) sparkle(c, 60 + i * 9, 6 + (i % 2) * 6, 0, 1); },
    front: c => { put(c, 'scope', c.px + c.w + 6, c.gy - 8); if (c.k > .7) say(c, 'WOW'); } },

  /* ---------- Jokes ---------- */
  joke: { dur: 4,
    pose: c => c.t < 1.4 ? { mouth: 'open', look: 0 } : { mood: 'happy', mouth: 'open', dy: hop(c.t, 4, 2) },
    front: c => say(c, c.t < 1.4 ? 'KNOCK' : 'HAHA') },
  fakesneeze: { dur: 3.6,
    pose: c => c.t < 1.2 ? { dy: -1, mouth: 'open', blink: true } : (c.t < 2.2 ? { dx: sq(c.t, 12) ? 1 : -1, mouth: 'open', mood: 'sick' } : { mood: 'happy', mouth: 'smile', look: 0 }),
    front: c => say(c, c.t < 1.2 ? 'AH..' : c.t < 2.2 ? 'ACHOO' : 'JK!') },
  silly: { dur: 3.2,
    pose: c => ({ look: sq(c.t, 5) ? 2 : -2, mood: 'happy', mouth: 'open', dx: sq(c.t, 5) ? 1 : -1 }),
    front: c => P(c.x, [c.px, c.my + 2, c.px + 1, c.my + 2, c.px, c.my + 3], '#e2687a') },
  disguise: { dur: 4.5,
    pose: c => ({ look: sq(c.t, 1.2) ? 2 : -2, mouth: 'flat', dx: Math.round(Math.sin(c.t * 1.2) * 4) }),
    front: c => { R(c.x, c.px - 4, c.my - 1, 3, 1, '#4a2e1c'); R(c.x, c.px + 1, c.my - 1, 3, 1, '#4a2e1c'); P(c.x, [c.px - 5, c.my - 2, c.px + 4, c.my - 2, c.px - 1, c.my - 1], '#4a2e1c'); if (c.k > .5) say(c, 'SHH'); } },
  juggle: { dur: 4.2,
    pose: c => c.k < .72 ? { look: 0, mouth: 'open', mood: 'happy' } : { mood: 'sad', mouth: 'wavy' },
    front: c => {
      for (let i = 0; i < 3; i++) {
        if (c.k < .72) { const f = (c.t * 1.1 + i / 3) % 1; put(c, 'seedi', c.px + Math.cos(f * PI * 2) * 8, c.hy - 6 - Math.abs(Math.sin(f * PI * 2)) * 14); }
        else put(c, 'seedi', c.px - 10 + i * 10, lerp(c.hy - 10 - i * 4, c.gy - 3, (c.k - .72) * 6));
      }
      if (c.k > .8) say(c, 'OOPS');
    } },
  statue: { dur: 4.5,
    pose: c => c.t < 3 ? { still: true, blink: false, mouth: 'flat', look: 0 } : { dx: sq(c.t, 10) ? 1 : -1, mood: 'happy', mouth: 'open' },
    front: c => { if (c.t < 3) { R(c.x, c.px - 9, c.gy - 1, 18, 2, '#d5dae1'); R(c.x, c.px - 9, c.gy + 1, 18, 1, '#9aa3ae'); } else say(c, 'HEHE'); } },

  /* ---------- Sass ---------- */
  petalflip: { dur: 2.6,
    pose: c => ({ flip: there(c, .25, .45), mood: 'happy', mouth: 'smile', dy: there(c, .2, .5) ? -1 : 0 }),
    front: c => { if (c.k > .4) sparkle(c, c.px, c.top + 2, c.t, 9); } },
  shades: { dur: 4,
    pose: c => ({ mouth: 'smile', look: 0, dy: c.t < .4 ? -1 : 0 }),
    front: c => { R(c.x, c.px - 6, c.ey, 12, 1, INK); R(c.x, c.px - 6, c.ey + 1, 5, 2, INK); R(c.x, c.px + 1, c.ey + 1, 5, 2, INK); if (sq(c.t, 1.4)) P(c.x, [c.px - 4, c.ey + 1], '#ffffff'); if (c.k > .5) say(c, 'COOL'); } },
  mirror: { dur: 4,
    pose: () => ({ look: 2, mood: 'happy', mouth: 'smile', still: true }),
    front: c => { put(c, 'mirror', c.px + 12, c.ey + 2); floaters(c, 'heart', 2, c.px + 8, c.top - 2, 1.3, 9); } },
  hmph: { dur: 3.6,
    pose: () => ({ flip: true, look: -2, mood: 'angry', mouth: 'flat', still: true }),
    front: c => { say(c, 'HMPH'); if (sq(c.t, 2)) c.x.drawImage(art().PUFF, c.px - 14, c.top + 2); } },
  foottap: { dur: 3.6,
    pose: () => ({ mood: 'angry', mouth: 'flat', look: 0, still: true }),
    front: c => { if (sq(c.t, 4)) P(c.x, [c.px + 5, c.gy, c.px + 6, c.gy, c.px + 7, c.gy], '#e9f6dd'); if (c.k > .5) say(c, '...'); } },
  eyeroll: { dur: 2.8,
    pose: c => ({ look: c.k < .3 ? -2 : (c.k < .5 ? 0 : (c.k < .7 ? 2 : 0)), blink: there(c, .45, .55), mouth: 'flat', still: true }),
    front: c => { if (c.k > .6) say(c, 'UGH'); } },

  /* ---------- Bratty ---------- */
  stomp: { dur: 3.2,
    pose: c => ({ dy: hop(c.t, 1.6, 3), mood: 'angry', dx: Math.round(Math.sin(c.t * 1.6) * 6) }),
    front: c => { for (let i = 0; i < 6; i++) dust(c, c.px, c.gy, i / 1.6 - .05, .35); } },
  kickdirt: { dur: 3,
    pose: c => ({ mood: 'angry', look: -1, dy: sq(c.t, 3) ? -1 : 0 }),
    front: c => { for (let i = 0; i < 5; i++) { const f = (c.t * 1.5 + i / 5) % 1; P(c.x, [Math.round(c.px - 6 - f * 14), Math.round(c.gy - 2 - arc(f) * 8)], '#8a5a36'); } } },
  raspberry: { dur: 2.8,
    pose: () => ({ look: 0, mouth: 'open', mood: 'happy' }),
    front: c => { P(c.x, [c.px, c.my + 2, c.px + 1, c.my + 2, c.px, c.my + 3, c.px + 1, c.my + 3], '#e2687a'); if (sq(c.t, 8)) P(c.x, [c.px + 4, c.my + 1, c.px + 6, c.my + 3, c.px + 5, c.my], '#8fd0f8'); say(c, 'PFFT'); } },
  sulk: { dur: 5,
    pose: () => ({ mood: 'sad', mouth: 'frown', look: -2, dy: 1, sqy: .94, still: true }),
    front: c => { put(c, 'darkcloud', c.px + 1, c.top - 7); if (sq(c.t, 2.5)) drops(c, c.px + 1, c.top - 4, 3, '#8fd0f8', 4, 6); } },
  throwtoy: { dur: 4.4,
    pose: c => c.k < .2 ? { mood: 'angry', look: -1 } : (c.k < .6 ? { mood: 'angry', mouth: 'flat', look: -2 } : { mood: 'sad', look: -2 }),
    front: c => { const f = Math.min(1, Math.max(0, (c.k - .15) * 3)); put(c, 'ball', c.px - 6 - f * 20, c.hy - arc(f) * 14 + f * 6); if (c.k > .65) say(c, 'MINE!'); } },

  /* ---------- Timid and brave ---------- */
  startle: { dur: 3,
    pose: c => c.k < .4 ? { look: 0 } : { dy: c.k < .55 ? -5 : 0, mood: 'angry', mouth: 'open' },
    front: c => { if (c.k < .4) put(c, 'leaf', c.px + 3 + Math.sin(c.t * 6) * 4, lerp(-4, c.top - 1, c.k / .4)); else { put(c, 'leaf', c.px + 8, c.gy - 1); if (c.k < .7) c.x.drawImage(art().BANG, c.px + 9, c.top - 6); sweat(c); } } },
  hidebug: { dur: 4.2,
    pose: c => ({ dx: -Math.round(lerp(0, 10, c.k * 2)), look: 2, mood: c.k > .3 ? 'sad' : undefined, mouth: 'wavy' }),
    front: c => { put(c, 'bug', c.px0 + lerp(26, 10, c.k), c.gy - 1); if (c.k > .3) sweat(c); } },
  shiver: { dur: 3.6,
    pose: c => ({ dx: there(c, .25, .8) ? (sq(c.t, 18) ? 1 : 0) : 0, mood: there(c, .25, .8) ? 'sad' : undefined, mouth: 'wavy' }),
    back: c => { c.x.globalAlpha = .25 * arc(c.k); E(c.x, lerp(-20, 120, c.k), c.gy - 8, 22, 9, '#1c2440'); c.x.globalAlpha = 1; } },
  tiptoe: { dur: 4.5,
    pose: c => ({ dx: Math.round(Math.sin(c.k * PI * 2) * 9), dy: -sq(c.t, 3), look: Math.cos(c.k * PI * 2) > 0 ? 1 : -1, mouth: 'small' }),
    front: c => { if (c.k > .3 && c.k < .8) say(c, 'SHH'); } },
  plush: { dur: 4.4,
    pose: c => ({ mood: 'happy', mouth: 'smile', dx: Math.round(Math.sin(c.t * 2)) }),
    front: c => { put(c, 'plush', c.px + 1, c.gy - 8); floaters(c, 'heart', 2, c.px + 6, c.top, 1.6, 8); } },
  sword: { dur: 4.4,
    pose: c => ({ dx: Math.round(Math.sin(c.k * PI * 2) * 10), dy: -sq(c.t, 3), mood: 'angry', mouth: 'open', look: Math.cos(c.k * PI * 2) > 0 ? 1 : -1 }),
    front: c => { put(c, 'stick', c.px + 10, c.hy - 6); if (c.k > .4 && c.k < .7) say(c, 'HYA!'); } },
  magnify: { dur: 4.8,
    pose: c => ({ look: Math.sin(c.t * 1.5) > 0 ? 1 : -1, mouth: c.k > .75 ? 'open' : 'small', mood: c.k > .75 ? 'happy' : undefined, dx: Math.round(Math.sin(c.t * .8) * 5) }),
    front: c => { put(c, 'magnifier', c.px + 9 * (Math.sin(c.t * 1.5) > 0 ? 1 : -1), c.gy - 7); if (c.k > .75) say(c, '!'); } },

  /* ---------- Feelings and body ---------- */
  cry: { dur: 4.5,
    pose: () => ({ mood: 'sad', dy: 1, still: true }),
    front: c => { for (const [i, X] of [[0, c.px - 4], [1, c.px + 3]]) tear(c, X, c.ey + 2, (c.t * 1.4 + i * .5) % 1); if (c.k > .55) say(c, 'SNIFF'); } },
  yawn: { dur: 4.5,
    pose: c => c.t < 1.4 ? { mouth: 'open', blink: true, sqy: 1.06 } : (c.k < .85 ? { mood: 'sleep', dy: sq(c.t, 1) ? 1 : 0, still: true } : { mood: 'angry', mouth: 'open', dy: -2 }),
    front: c => { if (c.t >= 1.4 && c.k < .85) { const f = (c.t * .8) % 1; c.x.globalAlpha = 1 - f * .7; c.x.drawImage(art().ZED, c.px + 9 + f * 4, c.top - 2 - f * 8); c.x.globalAlpha = 1; } } },
  hiccup: { dur: 3.6,
    pose: c => ({ dy: (c.t % .9) < .12 ? -2 : 0, mouth: 'small', blink: (c.t % .9) < .12 }),
    front: c => { if ((c.t % .9) < .45) say(c, 'HIC'); } },
  sing: { dur: 4.8,
    pose: c => ({ mood: 'happy', mouth: sq(c.t, 3) ? 'open' : 'small', dx: sq(c.t, 1.5) ? 1 : -1 }),
    front: c => floaters(c, 'note', 3, c.px + 8, c.top + 2, 1.5, 14) },
  dance: { dur: 4.2,
    pose: c => ({ flip: sq(c.t, 2) === 1, dy: hop(c.t, 2, 3), mood: 'happy', mouth: 'open' }),
    front: c => { floaters(c, 'note', 2, c.px - 9, c.top + 4, 1.2, 12); sparkle(c, c.px, c.gy - 18, c.t, 15); } },
  wave: { dur: 3.2,
    pose: () => ({ look: 0, mood: 'happy', mouth: 'open' }),
    front: c => { const up = sq(c.t, 4); E(c.x, c.px + 11, c.hy - 4 - up * 2, 2, 2, INK); E(c.x, c.px + 11, c.hy - 4 - up * 2, 1.2, 1.2, '#ffd3a8'); if (c.k > .4) floaters(c, 'heart', 1, c.px + 2, c.top, 1.4, 8); } },
  sneeze: { dur: 2.8,
    pose: c => c.t < 1 ? { dy: -1, mouth: 'open', blink: true } : { dx: c.t < 1.5 ? (sq(c.t, 14) ? 1 : -1) : 0, mood: 'sick', mouth: 'wavy' },
    front: c => { if (c.t < 1) say(c, 'AH..'); else if (c.t < 1.8) { say(c, 'ACHOO'); for (let i = 0; i < 3; i++) c.x.drawImage(art().PUFF, c.px + 6 + i * 4 + (c.t - 1) * 8, c.my - 4 + i); } } },

  /* ---------- Bulb and Elder ---------- */
  wobble: { dur: 3.2,
    pose: c => c.k < .5 ? { dx: Math.round(Math.sin(c.t * 9) * 2), mouth: 'open' } : { dy: 2, sqy: .86, mood: c.k < .75 ? 'sad' : 'happy', still: true },
    front: c => { if (c.k > .5 && c.k < .6) dust(c, c.px, c.gy, c.t, .4); } },
  crawl: { dur: 4.5,
    pose: c => ({ sqy: .9, dy: 1 + sq(c.t, 3), dx: Math.round(Math.sin(c.k * PI * 2) * 9), look: Math.cos(c.k * PI * 2) > 0 ? 1 : -1, mood: 'happy' }) },
  knit: { dur: 5.5,
    pose: () => ({ look: 1, mouth: 'small', still: true }),
    front: c => { put(c, 'yarn', c.px + c.w + 3, c.gy - 4); const n = Math.min(6, (c.k * 7) | 0); for (let i = 0; i < n; i++) R(c.x, c.px + 4, c.hy - 2 + i, 6, 1, i % 2 ? '#5a8fd6' : '#e8524a'); P(c.x, [c.px + 3 + sq(c.t, 6), c.hy - 4, c.px + 10 - sq(c.t, 6), c.hy - 4], '#c9ced6'); } },
  tea: { dur: 4.6,
    pose: c => ({ mood: btw(c, 1.5, 3.2) ? 'happy' : undefined, mouth: 'small', still: true }),
    front: c => { const up = btw(c, 1, 2.2); put(c, 'cup', c.px + 9, up ? c.my + 1 : c.hy + 1); for (let i = 0; i < 2; i++) { const f = (c.t * .8 + i / 2) % 1; P(c.x, [Math.round(c.px + 9 + Math.sin(f * 6 + i) * 1.5), Math.round((up ? c.my : c.hy) - 3 - f * 6)], '#ffffff'); } } },
  doze: { dur: 5.5,
    pose: c => ({ mood: 'sleep', dy: sq(c.t, .8), still: true }),
    front: c => { const f = (c.t * .8) % 1; c.x.globalAlpha = 1 - f * .7; c.x.drawImage(art().ZED, c.px + 9 + f * 4, c.top - 2 - f * 8); c.x.globalAlpha = 1; } },
  backache: { dur: 3.6,
    pose: c => c.k < .5 ? { sqy: .88, dy: 1, mood: 'sad', mouth: 'wavy' } : { sqy: lerp(.95, 1.08, (c.k - .5) * 2), mood: 'happy' },
    front: c => say(c, c.k < .5 ? 'OOF' : 'AH') },

  /* ---------- Special days ---------- */
  snow: { dur: 5.5,
    pose: c => ({ look: 0, mouth: 'open', mood: 'happy', dy: (c.t % 1.4) < .2 ? -2 : 0 }),
    back: c => { for (let i = 0; i < 14; i++) { const f = (c.t * .25 + i / 14) % 1, X = (i * 23 + Math.sin(c.t + i) * 3) % 100; R(c.x, Math.round(X), Math.round(f * 72), 2, 2, '#ffffff'); } } },
  pumpkin: { dur: 4.2,
    pose: c => ({ mood: 'happy', mouth: 'open', dy: hop(c.t, 1.5, 2) }),
    front: c => { put(c, 'pumpkin', c.px, c.top - 1); if (c.k > .4) say(c, 'BOO!'); } },
  party: { dur: 4.4,
    pose: c => ({ mood: 'happy', mouth: 'open', dy: hop(c.t, 2, 2) }),
    front: c => { put(c, 'partyhat', c.px, c.top - 3); for (let i = 0; i < 10; i++) { const f = (c.t * .5 + i / 10) % 1; P(c.x, [Math.round(c.px - 20 + i * 4 + Math.sin(f * 9) * 2), Math.round(f * 50)], ['#ff5f86', '#ffd23f', '#5a8fd6', '#5fcf6a'][i % 4]); } if (c.k > .3) say(c, 'YAY'); } },
};

// Runtime: one behaviour at a time.
export function startBehavior(b) {
  const s = SCRIPTS[b.id];
  if (!s) return null;
  const seed = Math.random() * 1000;
  return { id: b.id, def: b, s, t: 0, dur: s.dur, r: i => { const v = Math.sin(seed + i * 12.9898) * 43758.5453; return v - Math.floor(v); }, dx: 0 };
}
