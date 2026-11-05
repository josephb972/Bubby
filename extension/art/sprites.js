// Bubby's pixel art, drawn in code (ported from the original index.html).
// Works with a DOM canvas in the popup and with OffscreenCanvas in the background service worker.

export const INK = '#3b2f4a';
export const SW = 100, SH = 75, GROUND = 67;

export function hex(c) { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
export function mix(a, b, t) { const x = hex(a), y = hex(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
export function mk(w, h) {
  if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  return new OffscreenCanvas(w, h);
}
export function E(x, cx, cy, rx, ry, col, rot = 0) {
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
export function ER(x, cx, cy, rx, ry, ring, fill, rot = 0) { E(x, cx, cy, rx, ry, ring, rot); E(x, cx, cy, rx - 1, ry - 1, fill, rot); }
export function R(x, px, py, w, h, col) { x.fillStyle = col; x.fillRect(px, py, w, h); }
export function P(x, pts, col) { x.fillStyle = col; for (let i = 0; i < pts.length; i += 2) x.fillRect(pts[i], pts[i + 1], 1, 1); }
function ring(x, cx, cy, r1, r2, col) {
  x.fillStyle = col;
  for (let py = Math.floor(cy - r2); py <= Math.ceil(cy + r2); py++) for (let px = Math.floor(cx - r2); px <= Math.ceil(cx + r2); px++) {
    const d = Math.hypot(px + .5 - cx, py + .5 - cy); if (d >= r1 && d < r2) x.fillRect(px, py, 1, 1);
  }
}
export function outline(c, col = INK) {
  const x = c.getContext('2d'), w = c.width, h = c.height, d = x.getImageData(0, 0, w, h), s = d.data, o = new Uint8ClampedArray(s), [r, g, b] = hex(col);
  for (let y = 0; y < h; y++) for (let X = 0; X < w; X++) {
    const i = (y * w + X) * 4; if (s[i + 3] > 0) continue;
    if ((X > 0 && s[i - 1] > 0) || (X < w - 1 && s[i + 7] > 0) || (y > 0 && s[i - w * 4 + 3] > 0) || (y < h - 1 && s[i + w * 4 + 3] > 0)) { o[i] = r; o[i + 1] = g; o[i + 2] = b; o[i + 3] = 255; }
  }
  d.data.set(o); x.putImageData(d, 0, 0); return c;
}
export function sprite(w, h, fn) { const c = mk(w, h); fn(c.getContext('2d')); return outline(c); }

/* ---- Faces ---- */
function face(x, cx, cy, o) {
  const m = o.mood || 'normal', L = o.look || 0, e1 = cx - 4 + L, e2 = cx + 2 + L, ey = cy - 1, mx = cx - 1 + L, my = cy + 3;
  if (o.glasses) {
    for (const c0 of [cx - 3 + L, cx + 3 + L]) { E(x, c0, cy + .5, 2.4, 2.4, mix(o.skin, '#ffffff', .5)); ring(x, c0, cy + .5, 2.3, 3.3, '#4f5d6e'); }
  } else if (o.blush && m !== 'angry') { R(x, e1 - 2, cy + 2, 2, 1, o.blush); R(x, e2 + 2, cy + 2, 2, 1, o.blush); }
  for (const ex of [e1, e2]) {
    if (m === 'happy') P(x, [ex - 1, ey + 2, ex, ey + 1, ex + 1, ey + 1, ex + 2, ey + 2], INK);
    else if (m === 'sleep' || m === 'sick' || o.blink) R(x, ex, ey + 2, 2, 1, INK);
    else if (m === 'angry' || o.glasses) R(x, ex, ey + 1, 2, 2, INK);
    else { R(x, ex, ey, 2, 3, INK); P(x, [ex, ey], '#ffffff'); }
  }
  if (m === 'angry') { P(x, [e1 - 1, ey - 1, e1, ey - 1, e1 + 1, ey, e2, ey, e2 + 1, ey - 1, e2 + 2, ey - 1], INK); }
  if (m === 'sad') { P(x, [e1 - 1, ey - 1, e1, ey - 2, e1 + 1, ey - 2, e2, ey - 2, e2 + 1, ey - 2, e2 + 2, ey - 1], INK); }
  const mouth = o.mouth || ({ normal: 'smile', happy: 'open', sad: 'frown', angry: 'frown', sick: 'wavy', sleep: 'small' })[m] || 'smile';
  if (mouth === 'smile') P(x, [mx - 1, my, mx, my + 1, mx + 1, my + 1, mx + 2, my], INK);
  else if (mouth === 'open') { R(x, mx, my, 2, 2, INK); P(x, [mx + 1, my + 1], '#e2687a'); }
  else if (mouth === 'frown') P(x, [mx - 1, my + 1, mx, my, mx + 1, my, mx + 2, my + 1], INK);
  else if (mouth === 'wavy') P(x, [mx - 1, my + 1, mx, my, mx + 1, my + 1, mx + 2, my], INK);
  else if (mouth === 'small') R(x, mx, my, 2, 1, INK);
  else if (mouth === 'flat') R(x, mx - 1, my, 4, 1, INK);
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

// Sprites are cached: the scene asks for the same pose every frame.
const cache = new Map();
export function petSprite(stage, o = {}) {
  const key = stage + '|' + [o.mood, o.mouth, o.variant, o.chubby, o.sick, o.blink, o.look, o.wobble, o.crack].join(',');
  let c = cache.get(key);
  if (c) return c;
  c = mk(48, 48); const x = c.getContext('2d');
  if (stage === 'seed') drawSeed(x, o);
  else if (stage === 'baby') drawBaby(x, o);
  else if (stage === 'child') drawChild(x, o);
  else drawAdult(x, o, stage === 'senior');
  outline(c);
  if (o.sick) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(140,190,60,.28)'; x.fillRect(0, 0, 48, 48); x.globalCompositeOperation = 'source-over'; }
  if (cache.size > 300) cache.clear();
  cache.set(key, c);
  return c;
}
export const HEADTOP = { seed: 23, baby: 17, child: 9, adult: 5, senior: 5 };
// Where each stage's face sits inside its 48×48 sprite (used to crop the toolbar icon).
export const FACE = { seed: [24, 36], baby: [24, 37], child: [24, 38], adult: [24, 23], senior: [24, 23] };

/* ---- Small sprites and icons (built on first use) ---- */
let _art = null;
export function art() {
  if (_art) return _art;
  const S_SILVER = '#d5dae1', S_SHADE = '#9aa3ae';
  const ICONS = {
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
    feed: sprite(16, 16, x => {
      R(x, 2, 2, 1, 4, S_SILVER); R(x, 4, 2, 1, 4, S_SILVER); R(x, 6, 2, 1, 4, S_SILVER); R(x, 2, 6, 5, 2, S_SILVER); R(x, 3, 8, 3, 1, S_SHADE); R(x, 4, 9, 1, 5, S_SILVER);
      E(x, 11.5, 5, 2.6, 3.4, S_SILVER); P(x, [10, 3, 10, 4], '#ffffff'); R(x, 11, 8, 1, 6, S_SILVER); R(x, 12, 8, 1, 6, S_SHADE);
    }),
    scold: sprite(16, 16, x => {
      for (let t = 0; t < 7; t++) { R(x, 4 + t, 9 - t, 2, 2, '#ffc83d'); P(x, [5 + t, 10 - t], '#e09a1c'); }
      R(x, 11, 2, 2, 2, '#c9ced6'); R(x, 12, 1, 2, 2, '#ff8fb0'); P(x, [13, 1], '#ffb7cc');
      R(x, 3, 11, 2, 2, '#f3d9a8'); P(x, [2, 13], INK);
    }),
    med: sprite(16, 16, x => {
      R(x, 5, 1, 6, 3, '#5aa0e6'); P(x, [6, 1, 7, 1], '#9cc8f4'); R(x, 6, 4, 4, 1, '#dfe7ee');
      R(x, 4, 5, 8, 9, '#f4f8fb'); R(x, 10, 5, 2, 9, '#cfdbe6'); R(x, 7, 7, 2, 5, '#e8524a'); R(x, 5, 8, 6, 3, '#e8524a');
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
    status: sprite(16, 16, x => {
      P(x, [7, 1, 8, 1, 7, 14, 8, 14, 1, 7, 1, 8, 14, 7, 14, 8, 3, 3, 12, 3, 3, 12, 12, 12], '#f5a524');
      E(x, 8, 8, 4.6, 4.6, '#f5a524'); E(x, 8, 8, 3.6, 3.6, '#ffd84a'); P(x, [6, 6, 7, 6, 6, 7], '#fff3b0');
    }),
    attn: sprite(16, 16, x => {
      E(x, 8, 7, 6.6, 5.4, '#ffffff'); P(x, [4, 11, 5, 11, 4, 12, 3, 13], '#ffffff');
      R(x, 7, 3, 2, 5, '#e8524a'); R(x, 7, 9, 2, 2, '#e8524a');
    }),
    catch: sprite(16, 16, x => {
      E(x, 4, 4, 1.8, 2.6, '#a8693a'); E(x, 11, 2.8, 1.8, 2.4, '#ffc93c'); E(x, 8.5, 8.5, 1.8, 2.6, '#a8693a');
      P(x, [4, 8, 11, 6, 8, 12], '#ffffff');
      E(x, 8, 14, 6, 1.6, '#6fb35e');
    }),
  };
  const heart = full => sprite(9, 8, x => {
    const m = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
    m.forEach((row, y) => [...row].forEach((ch, X) => { if (ch === '#') R(x, X + 1, y + 1, 1, 1, full ? '#ff5f86' : '#e6dde8'); }));
    if (full) P(x, [2, 2], '#ffc2d2');
  });
  const BG = (() => {
    const c = mk(SW, SH), x = c.getContext('2d');
    R(x, 0, 0, SW, SH, '#9ad67f');
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 170; i++) { const px = rnd() * SW | 0, py = rnd() * SH | 0; R(x, px, py, 1, 1, ['#88c96d', '#acdf8f', '#7fbf66'][i % 3]); }
    for (let i = 0; i < 22; i++) { const px = rnd() * (SW - 4) | 0, py = 6 + rnd() * (SH - 8) | 0; P(x, [px, py, px + 2, py, px + 1, py + 1], '#6fb35e'); }
    const pot = sprite(12, 16, y => {
      R(y, 3, 10, 7, 5, '#c0703f'); R(y, 2, 9, 9, 2, '#d9874f'); R(y, 4, 11, 1, 3, '#e09a68');
      R(y, 6, 4, 1, 5, '#4c9a4a'); P(y, [5, 6, 4, 5, 7, 7, 8, 6], '#5cc46a');
      E(y, 6.5, 3, 2.4, 2.4, '#ffffff'); P(y, [6, 2, 7, 3, 6, 3, 7, 2], '#ffd34a');
    });
    E(x, 88, 49, 6, 1.4, '#79bb65');
    x.drawImage(pot, 82, 34);
    return c;
  })();
  _art = {
    ICONS, BG,
    HEART_FULL: heart(true), HEART_EMPTY: heart(false),
    SEEDI: sprite(7, 9, x => { E(x, 3.5, 4.5, 2.2, 3.2, '#a8693a'); R(x, 3, 2, 1, 5, '#7a4a24'); P(x, [2, 3], '#d9a06a'); }),
    GOLDSEED: sprite(7, 9, x => { E(x, 3.5, 4.5, 2.2, 3.2, '#ffc93c'); R(x, 3, 2, 1, 5, '#e09a1c'); P(x, [2, 3, 2, 4], '#fff6c2'); }),
    PEBBLE: sprite(9, 8, x => { E(x, 4.5, 4, 3.4, 2.6, '#8e959e'); E(x, 4, 3.4, 2, 1.3, '#b3b9c1'); P(x, [3, 3], '#e3e6ea'); }),
    POOP: sprite(12, 11, x => {
      E(x, 6, 8.5, 5, 2.2, '#e9679f'); E(x, 6, 6, 3.8, 1.9, '#ff8fc0'); E(x, 6, 3.6, 2.4, 1.5, '#ffacd2'); P(x, [6, 1, 7, 1], '#ffacd2');
      P(x, [4, 6, 8, 6], INK); P(x, [5, 8, 6, 8], INK);
    }),
    SKULL: sprite(9, 8, x => {
      R(x, 2, 1, 5, 1, '#f4f4f4'); R(x, 1, 2, 7, 3, '#f4f4f4'); R(x, 2, 5, 5, 1, '#f4f4f4'); P(x, [2, 6, 4, 6, 6, 6], '#f4f4f4');
      R(x, 2, 3, 2, 1, INK); R(x, 5, 3, 2, 1, INK); P(x, [4, 5], INK);
    }),
    BUBBLE: sprite(9, 10, x => { E(x, 4.5, 4, 3.8, 3.6, '#ffffff'); P(x, [2, 7, 1, 8], '#ffffff'); R(x, 4, 1, 1, 4, '#e8524a'); P(x, [4, 6], '#e8524a'); }),
    BANG: sprite(5, 9, x => { R(x, 1, 1, 3, 4, '#ff5a5a'); R(x, 2, 5, 1, 1, '#ff5a5a'); R(x, 1, 6, 3, 2, '#ff5a5a'); }),
    PUFF: sprite(7, 6, x => { E(x, 3.5, 3, 2.8, 2.2, '#f2f2f2'); P(x, [2, 2], '#ffffff'); }),
    ZED: (() => { const c = mk(4, 4), x = c.getContext('2d'); R(x, 0, 0, 4, 1, '#ffffff'); P(x, [2, 1, 1, 2], '#ffffff'); R(x, 0, 3, 4, 1, '#ffffff'); return c; })(),
    STARS: [[8, 6], [22, 12], [37, 4], [55, 9], [70, 5], [86, 13], [15, 20], [62, 18], [93, 3], [46, 15]],
    SLOTS: [[80, 64], [90, 64], [70, 65], [88, 56]],
  };
  return _art;
}

// Mood shown when nothing is animating (also used for the toolbar icon).
export function restingMood(S) {
  if (S.asleep) return 'sleep';
  if (S.call && S.call.reason === 'tantrum') return 'angry';
  if (S.sick) return 'sick';
  if (S.hunger < 1 || S.happy < 1) return 'sad';
  if (S.hunger >= 3 && S.happy >= 3 && !S.poops.length) return 'happy';
  return 'normal';
}
