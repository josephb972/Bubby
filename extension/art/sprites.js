// Bubby's pixel art, drawn in code (ported from the original index.html).
// Works with a DOM canvas in the popup and with OffscreenCanvas in the background service worker.

import { RACES, ITEMS, DISEASES } from '../core/content.js';
import { dress, eyewear, PAD } from './wardrobe.js';
export { PAD };

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
  if (o.eyewear) eyewear(x, o.eyewear, { e1, e2, ey, cx, cy, L, mood: m });   // shop glasses follow the eyes (1.3.0)
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
// The egg and the Bulb wear the colours of the race the seed was planted with (o.race). The Leafling, and a seed with no
// race, keep the original colours (that egg is also the logo).
function seedTones(race) {
  const r = RACES[race];
  if (!r || race === 'leafling') return { ring: '#55702f', base: '#7f9f4e', stripe: '#8c6a3a', shine: '#b5cf86' };
  // Stripes picked per race so they show up on the shell (and so the Mossback egg isn't the Leafling's)
  const EGG = {
    mossback: { base: r.body[2], stripe: r.body[0] },
    puddle: { base: r.body[1], stripe: r.body[2] },
    emberling: { base: r.body[1], stripe: r.bud[3] },
  }[race] || { base: r.body[1], stripe: r.bud[2] };
  return { ring: r.body[0], base: EGG.base, stripe: EGG.stripe, shine: race === 'mossback' ? '#e4efc8' : r.body[2] };
}
function bulbTones(race) {
  const r = RACES[race];
  if (!r || race === 'leafling') return { foot: ['#23706b', '#2f8f8a'], body: ['#2a8580', '#4cb8af'], shine: '#86dcd2', stem: '#3c8f45', leaf: ['#2f7d3a', '#5cc46a'], leafHi: '#8be095' };
  return { foot: [r.body[0], r.foot], body: [r.body[0], r.body[1]], shine: r.body[2], stem: r.leaf[0], leaf: [r.leaf[0], r.leaf[1]], leafHi: mix(r.leaf[1], '#ffffff', .35) };
}
function drawSeed(x, o) {
  const t = seedTones(o.race);
  ER(x, 24, 44, 14, 3.6, '#6b4226', '#8a5a36');
  P(x, [15, 44, 20, 43, 27, 45, 31, 43, 34, 44], '#a8724a');
  const sx = 24 + (o.wobble || 0);
  E(x, sx, 34, 8, 10, t.ring);
  E(x, sx, 34, 7, 9, (px, py) => { const v = py + 1.6 * Math.sin(px * .9); return ((v % 6) + 6) % 6 < 2 ? t.stripe : t.base; });
  P(x, [sx - 4, 29, sx - 4, 30, sx - 3, 28], t.shine);
  if (o.crack) P(x, [sx - 1, 25, sx, 26, sx + 1, 27, sx, 28, sx + 1, 29, sx + 2, 28], INK);
}
function drawBaby(x, o) {
  const t = bulbTones(o.race);
  ER(x, 18.5, 44.5, 3.5, 2, t.foot[0], t.foot[1]); ER(x, 29.5, 44.5, 3.5, 2, t.foot[0], t.foot[1]);
  ER(x, 24, 35, 11.5, 10, t.body[0], t.body[1]);
  E(x, 19, 30, 3, 2, t.shine);
  R(x, 23, 21, 2, 5, t.stem);
  ER(x, 19, 21, 5, 2.6, t.leaf[0], t.leaf[1], -.45);
  ER(x, 29, 20, 5.5, 2.8, t.leaf[0], t.leaf[1], .45);
  P(x, [18, 21, 20, 21, 28, 20, 30, 20], t.leafHi);
  face(x, 24, 36, { ...o, blush: '#f59aa6' });
}
/* ---- Race bodies ----
   Every race has its own body plan, not just its own colours: Leafling is the original sprout-and-flower, Mossback a mossy
   tortoise, Puddle a water droplet, Shroomling a mushroom, Emberling a flame spirit and Starling a five-point star.
   Care quality (Radiant / Daisy / Thistle) still shows on every body: Radiant is brighter with a rainbow gem, Daisy has a
   little yellow flower, Thistle is darker with spikes and a flat mouth. Seniors are faded and wear glasses and a cane. */
function poly(x, pts, col) {
  x.fillStyle = col;
  let lo = 1e9, hi = -1e9;
  for (let i = 1; i < pts.length; i += 2) { lo = Math.min(lo, pts[i]); hi = Math.max(hi, pts[i]); }
  for (let y = Math.floor(lo); y <= Math.ceil(hi); y++) {
    const yc = y + .5, xs = [];
    for (let i = 0; i < pts.length; i += 2) {
      const x1 = pts[i], y1 = pts[i + 1], x2 = pts[(i + 2) % pts.length], y2 = pts[(i + 3) % pts.length];
      if ((y1 <= yc && y2 > yc) || (y2 <= yc && y1 > yc)) xs.push(x1 + (yc - y1) / (y2 - y1) * (x2 - x1));
    }
    xs.sort((m, n) => m - n);
    for (let k = 0; k + 1 < xs.length; k += 2) x.fillRect(Math.round(xs[k]), y, Math.max(1, Math.round(xs[k + 1]) - Math.round(xs[k])), 1);
  }
}
// The same outline moved d pixels toward its centre, for the lighter inside of a shape
function inset(pts, cx, cy, d) {
  const out = [];
  for (let i = 0; i < pts.length; i += 2) {
    const dx = cx - pts[i], dy = cy - pts[i + 1], len = Math.hypot(dx, dy) || 1;
    out.push(pts[i] + dx / len * d, pts[i + 1] + dy / len * d);
  }
  return out;
}
function body(x, pts, cx, cy, ring, fill, d = 1.3) { poly(x, pts, ring); poly(x, inset(pts, cx, cy, d), fill); }
function starPts(cx, cy, R, r) {
  const out = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R; out.push(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); }
  return out;
}
// Colours for one race and one care tier (Radiant brighter, Thistle darker, seniors faded)
function tones(o, senior) {
  const r = RACES[o.race] || RACES.leafling, tier = o.variant;
  const adj = c => {
    let k = c;
    if (tier === 'radiant') k = mix(k, '#ffffff', .14); else if (tier === 'thistle') k = mix(k, '#2a1a3a', .28);
    return senior ? mix(k, '#cdb8a6', .45) : k;
  };
  return { b: r.body.map(adj), u: r.bud.map(adj), l: r.leaf.map(adj), c: r.collar.map(adj), foot: adj(r.foot), blush: adj('#f08a9a') };
}
// Face on the body; the same expression rules as the Leafling's
function raceFace(x, cx, cy, o, t, senior) {
  const th = o.variant === 'thistle';
  face(x, cx, cy, { ...o, blush: t.blush, glasses: senior && !o.eyewear, skin: t.b[2],
    mood: (th && (o.mood || 'normal') === 'normal') ? 'normal' : o.mood, mouth: o.mouth || (th && (!o.mood || o.mood === 'normal') ? 'flat' : undefined) });
}
// What the care tier adds to a body: a rainbow gem (Radiant), a little flower (Daisy) or a row of spikes (Thistle)
function tierMark(x, o, senior, gx, gy, spikes) {
  if (senior) return;
  if (o.variant === 'radiant') { P(x, [gx, gy], '#ff5a5a'); P(x, [gx - 1, gy + 1, gx, gy + 1, gx + 1, gy + 1], '#ffb43a'); P(x, [gx, gy + 2], '#ffe14a'); P(x, [gx - 1, gy + 3, gx + 1, gy + 3], '#5aa8ff'); }
  else if (o.variant === 'daisy') { P(x, [gx - 1, gy, gx + 1, gy, gx, gy - 1, gx, gy + 1], '#ffffff'); P(x, [gx, gy], '#ffd54f'); }
  else if (o.variant === 'thistle') for (const [sx, sy] of spikes || []) { P(x, [sx, sy, sx, sy - 1], '#3a2150'); }
}
function cane(x, ch) { R(x, 38 + ch, 36, 1, 10, '#7a4a24'); P(x, [38 + ch, 35, 39 + ch, 34, 40 + ch, 34, 41 + ch, 35], '#7a4a24'); }

/* Mossback: a mossy tortoise (low, wide, domed shell, four stubby feet) */
function mossChild(x, o, t) {
  const [b0, b1] = t.b, [u0, u1] = t.u;
  ER(x, 12, 44.5, 3.4, 2.1, b0, t.foot); ER(x, 36, 44.5, 3.4, 2.1, b0, t.foot); ER(x, 19.5, 45.6, 3, 1.8, b0, t.foot); ER(x, 28.5, 45.6, 3, 1.8, b0, t.foot);
  ER(x, 24, 36, 16, 10, b0, b1);
  ER(x, 24, 28.6, 3.4, 2.2, u0, u1); ER(x, 14.5, 33, 3, 2.3, u0, u1); ER(x, 33.5, 33, 3, 2.3, u0, u1);
  P(x, [17, 27, 18, 26, 30, 26, 31, 27, 21, 25, 27, 25], t.l[1]);
  R(x, 24, 21, 1, 5, t.l[0]); ER(x, 27.5, 22, 3.4, 1.8, t.l[0], t.l[1], .5); ER(x, 20.5, 23, 3, 1.6, t.l[0], t.l[1], -.5);
  ER(x, 24, 38, 8.6, 5.6, b0, t.b[2]);
  raceFace(x, 24, 37.5, o, t, false);
}
function mossAdult(x, o, senior, t) {
  const ch = o.chubby ? 2 : 0, [b0, b1] = t.b, [u0, u1] = t.u;
  ER(x, 10 - ch, 44, 4, 2.4, b0, t.foot); ER(x, 38 + ch, 44, 4, 2.4, b0, t.foot); ER(x, 19, 45.6, 3.4, 1.9, b0, t.foot); ER(x, 29, 45.6, 3.4, 1.9, b0, t.foot);
  ER(x, 24, 30, 19 + ch, 15, b0, b1);
  ER(x, 24, 18.5, 4.8, 3, u0, u1); ER(x, 13, 25, 4.4, 3.6, u0, u1); ER(x, 35, 25, 4.4, 3.6, u0, u1); ER(x, 12, 36, 3.8, 3, u0, u1); ER(x, 36, 36, 3.8, 3, u0, u1);
  P(x, [14, 17, 15, 16, 19, 15, 29, 15, 33, 16, 34, 17, 22, 14, 26, 14], t.l[1]);
  R(x, 24, 8, 1, 6, t.l[0]); ER(x, 28, 9, 4, 2, t.l[0], t.l[1], .5); ER(x, 20, 10, 3.6, 1.8, t.l[0], t.l[1], -.5); ER(x, 24, 7, 2.4, 2.4, t.l[0], t.l[1]);
  ER(x, 24, 33, 10.5, 8, b0, t.b[2]);
  tierMark(x, o, senior, 24, 22, [[10, 22], [38, 22], [16, 17], [32, 17], [24, 14]]);
  raceFace(x, 24, 32, o, t, senior);
  if (senior) cane(x, ch);
}

/* Puddle: a water droplet (pointed top, no legs, ripples underneath) */
const DROP_C = [24, 13, 31, 26, 35, 35, 33, 43, 24, 46, 15, 43, 13, 35, 17, 26];
function puddleChild(x, o, t) {
  const [b0, b1, b2] = t.b, [u0, u1] = t.u;
  E(x, 24, 46, 14, 1.8, u0); E(x, 24, 46, 10, .9, u1);
  body(x, DROP_C, 24, 36, b0, b1);
  E(x, 18.6, 34, 2, 3.2, b2); P(x, [19, 30, 20, 29], '#ffffff');
  ER(x, 36, 24, 1.8, 2.4, u0, u1); ER(x, 11, 29, 1.5, 2, u0, u1);
  raceFace(x, 24, 38, o, t, false);
}
const DROP_A = [24, 3, 31, 14, 36, 23, 38, 32, 36, 41, 29, 46, 19, 46, 12, 41, 10, 32, 12, 23, 17, 14];
function puddleAdult(x, o, senior, t) {
  const ch = o.chubby ? 2 : 0, [b0, b1, b2] = t.b, [u0, u1] = t.u;
  E(x, 24, 46, 17 + ch, 2, u0); E(x, 24, 46, 12 + ch, 1, u1);
  ER(x, 9 - ch, 36, 3.2, 5.4, b0, b1, .5); ER(x, 39 + ch, 36, 3.2, 5.4, b0, b1, -.5);
  body(x, ch ? DROP_A.map((v, i) => i % 2 ? v : 24 + (v - 24) * 1.08) : DROP_A, 24, 31, b0, b1);
  E(x, 18, 24, 2.4, 5, b2); P(x, [18, 17, 19, 16], '#ffffff');
  ER(x, 38, 9, 2, 2.8, u0, u1); ER(x, 9, 13, 1.7, 2.3, u0, u1); ER(x, 41, 20, 1.3, 1.8, u0, u1);
  tierMark(x, o, senior, 24, 41, [[17, 12], [31, 12], [14, 22], [34, 22], [24, 6]]);
  raceFace(x, 24, 30, o, t, senior);
  if (senior) cane(x, ch);
}

/* Shroomling: a mushroom (wide spotted cap on a short stem) */
function shroomChild(x, o, t) {
  const [b0, b1] = t.b, [u0, u1, u2] = t.u;
  ER(x, 19.5, 45.2, 3, 1.9, b0, t.foot); ER(x, 28.5, 45.2, 3, 1.9, b0, t.foot);
  ER(x, 24, 28, 15, 10, u0, u1);
  x.clearRect(0, 32, 48, 8);
  R(x, 9, 31, 30, 1, u0); R(x, 11, 32, 26, 1, u2);
  R(x, 17, 32, 14, 11, b0); R(x, 18, 32, 12, 11, b1); ER(x, 24, 42, 6.5, 3.2, b0, b1);
  E(x, 17, 24, 2.6, 2, '#ffffff'); E(x, 29, 22.5, 3, 2.3, '#ffffff'); E(x, 24, 27.5, 1.8, 1.2, '#ffffff'); E(x, 34, 28, 1.6, 1.2, '#ffffff');
  raceFace(x, 24, 36.5, o, t, false);
}
function shroomAdult(x, o, senior, t) {
  const ch = o.chubby ? 2 : 0, [b0, b1] = t.b, [u0, u1, u2] = t.u;
  // The cap first, with a flat underside; everything below it is drawn afterwards so the stem stays joined to it
  ER(x, 24, 17, 22, 13, u0, u1);
  x.clearRect(0, 25, 48, 23);
  R(x, 4, 24, 40, 1, u0); R(x, 6, 25, 36, 1, u2); P(x, [10, 26, 14, 26, 18, 26, 22, 26, 26, 26, 30, 26, 34, 26, 38, 26], u0);
  ER(x, 18.5, 45.4, 3.4, 2, b0, t.foot); ER(x, 29.5, 45.4, 3.4, 2, b0, t.foot);
  ER(x, 11 - ch, 37, 2.8, 4, b0, b1, .3); ER(x, 37 + ch, 37, 2.8, 4, b0, b1, -.3);
  R(x, 17, 27, 14, 9, b0); R(x, 18, 27, 12, 9, b1);
  ER(x, 24, 37.5, 10 + ch, 8.5, b0, b1);
  E(x, 13, 14, 3.4, 2.4, '#ffffff'); E(x, 25, 9.5, 3.8, 2.6, '#ffffff'); E(x, 35, 15, 3, 2.2, '#ffffff'); E(x, 20, 19, 2.2, 1.6, '#ffffff'); E(x, 31, 21, 1.8, 1.4, '#ffffff'); E(x, 40, 19, 1.4, 1.1, '#ffffff');
  tierMark(x, o, senior, 24, 29, [[10, 11], [38, 11], [16, 6], [32, 6], [24, 4]]);
  raceFace(x, 24, 35, o, t, senior);
  if (senior) cane(x, ch);
}

/* Emberling: a flame spirit (tongues of fire on top, a glowing belly) */
function emberChild(x, o, t) {
  const [b0, b1] = t.b, [u0, u1, u2, u3] = t.u, w = o.fl ? 1 : 0;
  ER(x, 19.5, 45.5, 3, 1.8, b0, t.foot); ER(x, 28.5, 45.5, 3, 1.8, b0, t.foot);
  const flame = [24, 11 + w, 26.5, 17, 29, 14 + w, 30.5, 22, 34, 28, 34.5, 36, 32, 43, 26, 46, 22, 46, 16, 43, 13.5, 36, 14, 28, 17.5, 22, 19, 14 + w, 21.5, 17];
  body(x, flame, 24, 34, b0, b1);
  body(x, [24, 19, 28, 27, 30, 35, 27, 42, 21, 42, 18, 35, 20, 27], 24, 34, u0, u3, 1.4);
  ER(x, 10, 36, 2.4, 3, b0, b1, .5); ER(x, 38, 36, 2.4, 3, b0, b1, -.5); P(x, [9, 32, 38, 32], u3);
  raceFace(x, 24, 36, o, t, false);
}
function emberAdult(x, o, senior, t) {
  const ch = o.chubby ? 2 : 0, [b0, b1] = t.b, [u0, u1, u2, u3] = t.u, w = o.fl ? 1 : 0;
  ER(x, 18.5, 45.5, 3.6, 2, b0, t.foot); ER(x, 29.5, 45.5, 3.6, 2, b0, t.foot);
  const flame = [24, 2 + w, 27, 10, 31, 5 + w, 31.5, 14, 37, 12 + w, 36, 22, 40 + ch, 30, 38 + ch, 40, 31, 46, 17, 46, 10 - ch, 40, 8 - ch, 30, 12, 22, 11, 12 + w, 17, 14, 17, 5 + w, 21, 10];
  body(x, flame, 24, 28, b0, b1);
  body(x, [24, 12, 30, 21, 33, 31, 30, 41, 18, 41, 15, 31, 18, 21], 24, 30, u0, u3, 1.5);
  ER(x, 8 - ch, 34, 3, 4.2, b0, b1, .5); ER(x, 40 + ch, 34, 3, 4.2, b0, b1, -.5); P(x, [7 - ch, 29, 41 + ch, 29, 8 - ch, 28, 40 + ch, 28], u3);
  tierMark(x, o, senior, 24, 40, [[12, 12], [36, 12], [18, 7], [30, 7], [24, 3]]);
  raceFace(x, 24, 31, o, t, senior);
  if (senior) cane(x, ch);
}

/* Starling: a five-point star (the bottom two points are its feet) */
function starChild(x, o, t) {
  const [b0, b1, b2] = t.b, [u0, u1] = t.u;
  body(x, starPts(24, 30, 19, 10), 24, 30, b0, b1, 1.5);
  ER(x, 24, 31, 8, 7.4, b0, b2);
  P(x, [24, 14, 24, 15, 11, 25, 37, 25, 17, 44, 31, 44], u1);
  raceFace(x, 24, 29.5, o, t, false);
}
function starAdult(x, o, senior, t) {
  const ch = o.chubby ? 2 : 0, [b0, b1, b2] = t.b, [u0, u1] = t.u;
  body(x, starPts(24, 27, 22 + ch, 11.5 + ch / 2), 24, 27, b0, b1, 1.6);
  ER(x, 24, 28, 9.4, 8.6, b0, b2);
  P(x, [24, 6, 24, 7, 4, 19, 44, 19, 14, 44, 34, 44], u1); P(x, [23, 6, 25, 6, 23, 7, 25, 7], u0);
  P(x, [4, 6, 3, 7, 4, 7, 5, 7, 4, 8, 44, 8, 43, 9, 44, 9, 45, 9, 44, 10], u1);
  tierMark(x, o, senior, 24, 38, [[8, 19], [40, 19], [14, 11], [34, 11], [24, 4]]);
  raceFace(x, 24, 27.5, o, t, senior);
  if (senior) cane(x, ch);
}

const SHAPES = {
  mossback: { child: mossChild, adult: mossAdult }, puddle: { child: puddleChild, adult: puddleAdult },
  shroomling: { child: shroomChild, adult: shroomAdult }, emberling: { child: emberChild, adult: emberAdult },
  starling: { child: starChild, adult: starAdult },
};
// Where the face sits (used to crop the toolbar icon); the Leafling keeps the original positions
const FACE_Y = { mossback: { child: 37.5, adult: 32 }, puddle: { child: 38, adult: 30 }, shroomling: { child: 36.5, adult: 35 }, emberling: { child: 36, adult: 31 }, starling: { child: 29.5, adult: 27.5 } };
export const hasShape = race => !!SHAPES[race];
export function faceCenter(stage, race) {
  const k = stage === 'senior' ? 'adult' : stage, y = FACE_Y[race] && FACE_Y[race][k];
  return y ? [24, y] : FACE[stage];
}
// The top row of Bubby's body in its sprite (status bubbles and the Seed catch basket sit above it)
const topCache = new Map();
export function headTop(stage, race) {
  if (!SHAPES[race] || stage === 'seed' || stage === 'baby') return HEADTOP[stage];
  const key = stage + '|' + race;
  if (topCache.has(key)) return topCache.get(key);
  const c = petSprite(stage, { race, variant: 'daisy', mood: 'normal' }), d = c.getContext('2d').getImageData(0, 0, 48, 48).data;
  let top = HEADTOP[stage];
  find: for (let y = 0; y < 48; y++) for (let X = 0; X < 48; X++) if (d[(y * 48 + X) * 4 + 3] > 0) { top = y + 1; break find; }   // +1: skip the outline
  topCache.set(key, top);
  return top;
}

// Where a 32 px toolbar icon is centred to show the whole body: top-aligned, but never below the feet
export function bodyCropY(stage, race) { return Math.max(16, Math.min(32, headTop(stage, race) + 16)); }

function drawChild(x, o) {
  if (SHAPES[o.race]) return SHAPES[o.race].child(x, o, tones(o, false));
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
  if (SHAPES[o.race]) return SHAPES[o.race].adult(x, o, senior, tones(o, senior));
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
  face(x, cx, hy + 1, { ...o, blush: pal.blush, glasses: senior && !o.eyewear, skin: pal.face, mood: (th && (o.mood || 'normal') === 'normal') ? 'normal' : o.mood, mouth: o.mouth || (th && (!o.mood || o.mood === 'normal') ? 'flat' : undefined) });
}

function drawBody(x, stage, o) {
  if (stage === 'seed') drawSeed(x, o);
  else if (stage === 'baby') drawBaby(x, o);
  else if (stage === 'child') drawChild(x, o);
  else drawAdult(x, o, stage === 'senior');
}
// Sprites are cached: the scene asks for the same pose every frame.
const cache = new Map();
export function petSprite(stage, o = {}) {
  const key = stage + '|' + [o.mood, o.mouth, o.variant, o.chubby, o.sick, o.blink, o.look, o.wobble, o.crack, o.race, o.fl].join(',');
  let c = cache.get(key);
  if (c) return c;
  c = mk(48, 48); const x = c.getContext('2d');
  drawBody(x, stage, o);
  outline(c);
  if (o.sick) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = (DISEASES[o.sick] || {}).tint || 'rgba(140,190,60,.28)'; x.fillRect(0, 0, 48, 48); x.globalCompositeOperation = 'source-over'; }
  if (cache.size > 300) cache.clear();
  cache.set(key, c);
  return c;
}

/* ---- Bubby wearing its clothes (1.3.0) ----
   48 wide and 48 + PAD tall: the usual 48×48 sprite sits PAD pixels down, leaving headroom for hats. o.outfit is
   { head, face, neck, body }: item ids Bubby owns in its current size (core/shop.js outfitFor). Garments are put on before
   the ink outline (art/wardrobe.js), so they're outlined with Bubby. Without an outfit it is petSprite moved down PAD. */
const worn = new Map();
export const outfitKey = f => f ? [f.head, f.face, f.neck, f.body].map(v => v || '').join('/') : '';
export function wornSprite(stage, o = {}) {
  const fit = stage === 'seed' ? '' : outfitKey(o.outfit);
  const key = stage + '|' + [o.mood, o.mouth, o.variant, o.chubby, o.sick, o.blink, o.look, o.wobble, o.crack, o.race, o.fl, fit].join(',');
  let c = worn.get(key);
  if (c) return c;
  c = mk(48, 48 + PAD); const x = c.getContext('2d', { willReadFrequently: true });
  x.translate(0, PAD);
  drawBody(x, stage, fit && o.outfit.face ? { ...o, eyewear: o.outfit.face } : o);
  x.setTransform(1, 0, 0, 1, 0, 0);
  c.topY = null;
  if (fit && fit !== '///') dress(c, stage, o);
  outline(c);
  if (o.sick) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = (DISEASES[o.sick] || {}).tint || 'rgba(140,190,60,.28)'; x.fillRect(0, 0, 48, 48 + PAD); x.globalCompositeOperation = 'source-over'; }
  if (worn.size > 1500) worn.clear();
  worn.set(key, c);
  return c;
}
// The body without outline or clothes, in the padded box (the wardrobe measures it to fit clothes to every race)
export function bodyPixels(stage, o) {
  const c = mk(48, 48 + PAD), x = c.getContext('2d', { willReadFrequently: true });
  x.translate(0, PAD); drawBody(x, stage, { ...o, eyewear: null });
  return x.getImageData(0, 0, 48, 48 + PAD).data;
}
// The parts of the classic bodies that clothes may cover, drawn exactly as in the full sprite (matched pixel by pixel).
// Every race shares the Bulb's body; the Leafling Bud and Blossom keep their original bodies. Other race bodies: null
// (the wardrobe measures those from their pixels instead).
export function torsoOf(stage, o) {
  if (stage === 'baby') return x => { const t = bulbTones(o.race); ER(x, 24, 35, 11.5, 10, t.body[0], t.body[1]); E(x, 19, 30, 3, 2, t.shine); };
  if (SHAPES[o.race]) return null;
  if (stage === 'child') return x => {
    ER(x, 14.5, 37, 2.6, 3.6, '#2f7d3a', '#5cbf5a', .3); ER(x, 33.5, 37, 2.6, 3.6, '#2f7d3a', '#5cbf5a', -.3);
    ER(x, 24, 36, 9.5, 9, '#2f7d3a', '#5cbf5a'); E(x, 20, 31, 2.5, 1.6, '#8ad98a');
  };
  if (stage === 'adult' || stage === 'senior') return x => {
    const senior = stage === 'senior', pal = palette(o.variant, senior), ch = o.chubby ? 2 : 0;
    ER(x, 16 - ch, 38.5, 2.6, 3.6, pal.suit[0], pal.suit[1], .35); ER(x, 32 + ch, 38.5, 2.6, 3.6, pal.suit[0], pal.suit[1], -.35);
    ER(x, 24, 39, 7.5 + ch, 6.5, pal.suit[0], pal.suit[1]);
    if (o.variant === 'radiant' && !senior) {
      P(x, [24, 37], '#ff5a5a'); P(x, [22, 38, 23, 38, 24, 38, 25, 38, 26, 38], '#ffb43a');
      P(x, [23, 39, 24, 39, 25, 39], '#ffe14a'); P(x, [23, 40, 25, 40], '#5fcf6a'); P(x, [22, 41, 26, 41], '#5aa8ff');
    }
    if (o.variant === 'daisy') P(x, [21, 34, 22, 35, 23, 35, 24, 35, 25, 35, 26, 35, 27, 34], '#ffd54f');
  };
  return null;
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
  // Shop items: plates for food, bottles for medicine and tonics, a cup for Garden Tea
  const foodIcon = col => sprite(16, 16, x => {
    E(x, 8, 11.5, 7, 3.4, '#ffffff'); E(x, 8, 12.3, 6, 2.4, '#dfe6ec');
    E(x, 8, 8.4, 5, 3.6, col); E(x, 6.4, 6.8, 2, 1.2, mix(col, '#ffffff', .45)); P(x, [10, 9, 11, 8, 8, 10], mix(col, '#000000', .25));
  });
  const bottleIcon = col => sprite(16, 16, x => {
    R(x, 6, 1, 4, 2, '#b78a5a'); R(x, 6, 3, 4, 1, '#dfe7ee');
    R(x, 4, 4, 8, 10, '#f4f8fb'); R(x, 10, 4, 2, 10, '#cfdbe6');
    R(x, 5, 8, 6, 5, col); R(x, 5, 8, 6, 1, mix(col, '#ffffff', .45)); P(x, [5, 5, 6, 5], '#ffffff');
  });
  for (const [id, it] of Object.entries(ITEMS)) _art.ICONS[id] = it.kind === 'food' ? foodIcon(it.icon) : bottleIcon(it.icon);
  _art.ICONS.tea = sprite(16, 16, x => {
    E(x, 8, 10, 6, 4, '#ffffff'); R(x, 2, 6, 12, 2, '#ffffff'); E(x, 8, 7, 5, 1.4, '#c9a66b');
    R(x, 13, 8, 2, 3, '#ffffff'); P(x, [6, 3, 8, 2, 10, 3], '#dfe9ee');
  });
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
