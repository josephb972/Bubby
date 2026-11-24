// Bubby's clothes, drawn in code like the rest of Bubby's art.
//
// How clothes always fit (see docs/SHOP-PLAN.md, section 2):
//   - Every body has a rig: anchors measured from the drawing code in sprites.js (where the head dome, the brim
//     line, the neck and the face are). Garments are drawn from those numbers, so they follow each body exactly,
//     including the three adult forms, chubby and Elder.
//   - Body garments (shirts, overalls…) are painted onto the visible torso only: a pixel is kept only where the
//     unclothed sprite shows the torso. They can't spill outside Bubby or over its head petals, by construction.
//   - Nothing but eyewear may touch the face: the face box is cleared from every other garment layer.
//   - Each garment gets a 1px rim in its own dark tone where it meets Bubby, and the final ink outline wraps the
//     whole silhouette, so clothes look drawn by the same hand.
//   - tools/wardrobe-audit.mjs renders every garment on every body and pose and fails on any fitting problem.
import { E, ER, R, P, B, mk, hex, deltaE, outline, PAD } from './pixel.js';
import { babyTorso, childTorso, adultTorso, adultPalette } from './sprites.js';

/* ---------- Rigs: one per body (48×48 body box coordinates; y can go up to PAD pixels above 0) ---------- */
export function rig(stage, variant, chubby) {
  if (stage === 'baby') return {
    stage, ch: 0, body: [24, 35, 11.5, 10],
    face: [16, 32, 32, 40],                   // x0, y0, x1, y1 (inclusive): eyes, brows, blush, mouth and the sick drop, for every "look"
    head: { cx: 24, dome: [24, 35, 12.1, 10.6], top: 24, brim: 29, bow: [33, 27], pompom: false, crownW: 13, coneW: 14, coneH: 9 },
    neck: { cx: 24, y: 42, w: 14, tail: 1 },
    // Body garments: a curved neckline under the mouth that rises up the sides around the face (a round body has no shoulders).
    shirtTop: 41, wear: (px, py) => py >= 41 || ((px < 16 || px > 32) && py >= 41 - 2 * (Math.abs(px + .5 - 24) - 8)), heart: [24, 42, 'small'],
    torso: babyTorso,
    under: { head: '#4cb8af', neck: '#4cb8af', body: '#4cb8af' },
  };
  if (stage === 'child') return {
    stage, ch: 0, body: [24, 36, 9.5, 9],
    face: [16, 33, 32, 41],
    head: { cx: 24, dome: [24, 19, 6.8, 8.2], top: 11, brim: 15, bow: [29.5, 14], pompom: true, crownW: 11, coneW: 12, coneH: 10 },
    neck: { cx: 24, y: 27, w: 12, tail: 3 },
    // The leaf arms become sleeves.
    shirtTop: 42, wear: (px, py) => py >= 42 || px < 16 || px > 32, heart: [24, 42, 'small'],
    torso: childTorso,
    under: { head: '#f08f7a', neck: '#4fae55', body: '#5cbf5a' },
  };
  const senior = stage === 'senior', ch = chubby ? 2 : 0, pal = adultPalette(variant, senior);
  return {
    stage, ch, senior, variant, body: [24, 39, 7.5 + ch, 6.5],
    face: [15, 17, 33, 28],
    head: { cx: 24, dome: [24, 14, 11, 9.2], top: 5, brim: 12, bow: [34, 8], pompom: true, crownW: 15, coneW: 16, coneH: 13 },
    neck: { cx: 24, y: 31, w: 14, tail: 4 },
    shirtTop: 33, wear: () => true, straps: [20, 28], strapTop: 33, heart: [24, 38, 'big'],
    torso: x => adultTorso(x, { variant, chubby }, senior),
    under: { head: pal.petal, neck: pal.petal, body: pal.suit[1] },
  };
}

/* ---------- Garment helpers ---------- */
// Pick the colourway that stands out most against what the garment sits on (a red scarf on a red Bubby is a no).
export function colourway(item, r) {
  const under = r.under[item.slot === 'face' ? 'head' : item.slot];
  let best = item.cw[0], d = -1;
  for (const cw of item.cw) { const v = deltaE(cw.base, under); if (v > d + 4) { d = v; best = cw; } }
  return best;
}
// Fill the rows y0..y1 of an ellipse with a colour function.
function rows(x, [cx, cy, rx, ry], y0, y1, col) { E(x, cx, cy, rx, ry, (px, py) => (py < y0 || py > y1) ? null : col(px, py)); }
// Half width of an ellipse at row py (pixel centres).
function chord([cx, cy, rx, ry], py) { const v = (py + .5 - cy) / ry; return v * v >= 1 ? 0 : rx * Math.sqrt(1 - v * v); }

/* ---------- The garments ----------
   Each: { slot, cw: colourways [{ base, alt, dark, light }], draw(x, rig, cw) } (eyewear draws in the face instead). */
export const GARMENTS = {
  /* ----- Head ----- */
  petalbow: {
    slot: 'head',
    cw: [{ base: '#ff7fb0', alt: '#ffc2dc', dark: '#c94a7f', light: '#ffe3ef' }, { base: '#6fd3c0', alt: '#b8efe4', dark: '#3a9a88', light: '#e2fbf6' }],
    draw(x, r, c) {
      const [bx, by] = r.head.bow;
      ER(x, bx - 2.2, by, 2.4, 1.9, c.dark, c.base, -.35); ER(x, bx + 2.2, by, 2.4, 1.9, c.dark, c.base, .35);
      P(x, [Math.floor(bx - 3), Math.floor(by - 1), Math.floor(bx + 2), Math.floor(by - 1)], c.light);
      R(x, Math.floor(bx) - 1 + (bx % 1 ? 1 : 0), Math.floor(by) - 1, 2, 2, c.dark);
    },
  },
  beanie: {
    slot: 'head',
    cw: [{ base: '#e8524a', alt: '#fff3e6', dark: '#a8383a', light: '#ff8a7f' }, { base: '#3f6fb8', alt: '#e9f2ff', dark: '#2a4a80', light: '#6f9ae0' },
      { base: '#f0b429', alt: '#fff6d6', dark: '#b57c12', light: '#ffd56a' }],
    draw(x, r, c) {
      const h = r.head, d = h.dome;
      rows(x, d, h.top - 2, h.brim - 1, (px, py) => ((h.brim - 1 - py) >> 1) % 2 ? c.alt : c.base);
      // ribbed brim, one pixel wider than the head on each side
      const w = Math.round(chord(d, h.brim)) + 1;
      for (let px = h.cx - w; px < h.cx + w; px++) { P(x, [px, h.brim], px % 2 ? c.base : c.dark); P(x, [px, h.brim + 1], c.dark); }
      // a little shine on the upper left
      const sx = Math.round(h.cx - chord(d, h.top + 1) * .55);
      P(x, [sx, h.top + 1, sx + 1, h.top], c.light);
      if (h.pompom) { ER(x, h.cx, h.top - 3, 2.6, 2.4, c.dark, c.alt); P(x, [h.cx - 1, h.top - 4], '#ffffff'); }
    },
  },
  crown: {
    slot: 'head',
    cw: [{ base: '#ffd23f', alt: '#e8524a', dark: '#c98a12', light: '#fff3b0' }, { base: '#dfe6ee', alt: '#5aa8ff', dark: '#8a96a6', light: '#ffffff' }],
    draw(x, r, c) {
      const h = r.head, w = h.crownW, x0 = h.cx - (w >> 1), y = h.brim - 2;
      R(x, x0, y, w, 3, c.base); R(x, x0, y + 2, w, 1, c.dark); R(x, x0, y, w, 1, c.light);
      // three points with round tips
      for (const sx of [x0 + 1, h.cx, x0 + w - 2]) {
        R(x, sx - 1, y - 1, 3, 1, c.base); R(x, sx, y - 3, 1, 2, c.base); P(x, [sx, y - 4], c.light);
      }
      P(x, [h.cx, y + 1], c.alt); P(x, [x0 + 2, y + 1, x0 + w - 3, y + 1], c.alt === '#e8524a' ? '#5aa8ff' : '#e8524a');
    },
  },
  wizard: {
    slot: 'head',
    cw: [{ base: '#6b4fbf', alt: '#ffe14a', dark: '#46318a', light: '#9b82e6' }, { base: '#2f7f8f', alt: '#ffe14a', dark: '#1d5560', light: '#5fb3c2' }],
    draw(x, r, c) {
      const h = r.head, H = h.coneH, W = h.coneW;
      // cone, its tip bending to the right
      for (let i = 0; i <= H; i++) {
        const t = i / H, half = Math.max(.5, (1 - t) * W / 2), lean = Math.round(t * t * 3);
        const y = h.brim - 1 - i, xa = Math.round(h.cx - half + lean), xb = Math.round(h.cx + half + lean);
        R(x, xa, y, Math.max(1, xb - xa), 1, i === 0 ? c.alt : c.base);
        if (i > 0 && xb - xa > 2) P(x, [xa, y], c.light);
      }
      // brim
      E(x, h.cx, h.brim + .5, W / 2 + 2.5, 1.6, c.dark);
      R(x, h.cx - Math.floor(W / 2) - 1, h.brim, W + 2, 1, c.base);
      // stars
      const sy = h.brim - Math.round(H * .45), sx = h.cx - 1;
      P(x, [sx, sy - 1, sx - 1, sy, sx, sy, sx + 1, sy, sx, sy + 1], c.alt);
      P(x, [h.cx + 2, h.brim - Math.round(H * .75)], c.alt);
    },
  },
  /* ----- Face (drawn inside the face, so it follows the eyes and the "look" direction) ----- */
  shades: {
    slot: 'face', eyewear: true,
    cw: [{ base: '#2b2d42', alt: '#4a5078', dark: '#1a1b2a', light: '#a9c2ea' }],
  },
  hearts: {
    slot: 'face', eyewear: true,
    cw: [{ base: '#ff5f86', alt: '#ffc2d2', dark: '#c9365c', light: '#ffe3ea' }],
  },
  /* ----- Neck ----- */
  bowtie: {
    slot: 'neck',
    cw: [{ base: '#e8524a', alt: '#ff8a7f', dark: '#a8383a', light: '#ffb3ab' }, { base: '#3f5fa8', alt: '#6a90dc', dark: '#2a4070', light: '#9cb8f0' },
      { base: '#f0b429', alt: '#ffd56a', dark: '#a8740e', light: '#fff0b8' }],
    draw(x, r, c) {
      const n = r.neck;
      B(x, n.cx - 3, n.y - 1, ['ab...ba', 'aabkbaa', 'aabkbaa', 'ab...ba'], null, { a: c.base, b: c.alt, k: c.dark });
    },
  },
  scarf: {
    slot: 'neck',
    cw: [{ base: '#4f9d5a', alt: '#fff3e6', dark: '#2f6a38', light: '#8fd39a' }, { base: '#e8524a', alt: '#fff3e6', dark: '#a8383a', light: '#ff9a90' },
      { base: '#8f78cf', alt: '#fff3e6', dark: '#5f4a9a', light: '#c3b2f2' }],
    draw(x, r, c) {
      const n = r.neck, hw = n.w / 2;
      E(x, n.cx, n.y + .5, hw + .5, 1.7, (px) => (((px - n.cx + 40) >> 1) % 2) ? c.alt : c.base);
      // the loose end hangs on one side
      const tx = Math.round(n.cx + hw * .45);
      for (let i = 1; i <= n.tail; i++) R(x, tx, n.y + 1 + i, 2, 1, i % 2 ? c.base : c.alt);
      if (n.tail > 1) P(x, [tx, n.y + 2 + n.tail, tx + 1, n.y + 2 + n.tail], c.dark);
    },
  },
  /* ----- Body (painted on the visible torso only) ----- */
  tee: {
    slot: 'body',
    cw: [{ base: '#e8524a', alt: '#fff3e6', dark: '#a8383a', light: '#ff8a7f' }, { base: '#f0b429', alt: '#fff6d6', dark: '#a8740e', light: '#ffd56a' }],
    draw(x, r, c) {
      for (let py = -PAD; py < 48; py++) R(x, 0, py, 48, 1, ((py - r.body[1] + 100) >> 1) % 2 ? c.alt : c.base);
    },
  },
  overalls: {
    slot: 'body',
    cw: [{ base: '#4a78c8', alt: '#7fa6e6', dark: '#2f528f', light: '#ffd23f' }, { base: '#c0507a', alt: '#e889ab', dark: '#86304f', light: '#ffd23f' },
      { base: '#8a6a4a', alt: '#b8946a', dark: '#5e452e', light: '#ffd23f' }],
    draw(x, r, c) {
      const [cx, cy] = r.body;
      if (r.stage === 'adult' || r.stage === 'senior') {
        R(x, 0, cy, 48, 12, c.base);                      // trousers from the waist down (arms stay bare)
        R(x, cx - 3, cy - 4, 7, 4, c.base);               // bib
        R(x, cx - 2, cy - 2, 5, 1, c.alt);                // pocket
        R(x, r.straps[0], r.strapTop, 1, cy - 4 - r.strapTop, c.base); R(x, r.straps[1], r.strapTop, 1, cy - 4 - r.strapTop, c.base);
        P(x, [cx - 3, cy - 4, cx + 3, cy - 4], c.light);  // buttons
        R(x, 0, cy + 3, 48, 1, c.dark);                   // leg seam shadow
        P(x, [cx, cy + 1, cx, cy + 2, cx, cy + 3, cx, cy + 4, cx, cy + 5], c.dark);
        return;
      }
      R(x, 0, 0, 48, 48, c.base);
      R(x, 0, r.shirtTop + 2, 48, 1, c.alt);             // waist stitching
      R(x, cx - 2, r.shirtTop, 5, 2, c.alt);             // little bib pocket under the mouth
      P(x, [cx - 4, r.shirtTop, cx + 4, r.shirtTop], c.light);
    },
  },
  sweater: {
    slot: 'body',
    cw: [{ base: '#ffb3cf', alt: '#ffd6e6', dark: '#d9608f', light: '#e8524a' }, { base: '#ffe08a', alt: '#fff0c4', dark: '#c99a1c', light: '#e8524a' },
      { base: '#bfe6db', alt: '#e2f7f1', dark: '#5e978c', light: '#e8524a' }],
    draw(x, r, c) {
      const [cx, cy, , ry] = r.body;
      for (let py = -PAD; py < 48; py++) for (let px = 0; px < 48; px++) R(x, px, py, 1, 1, (px + py * 2) % 4 === 0 ? c.alt : c.base);
      R(x, 0, Math.round(cy + ry) - 2, 48, 2, c.dark);  // ribbed hem
      const [hx, hy, size] = r.heart;
      if (size === 'big') B(x, hx - 2, hy, ['##.##', '#####', '.###.', '..#..'], c.light);
      else B(x, hx - 1, hy, ['#.#', '###', '.#.'], c.light);
    },
  },
};

/* ---------- Eyewear (called from face() in sprites.js) ---------- */
export function eyewear(x, id, f) {
  const { e1, e2, ey } = f;
  if (id === 'shades') {
    const c = GARMENTS.shades.cw[0];
    for (const ex of [e1, e2]) { R(x, ex - 1, ey, 4, 3, c.base); P(x, [ex - 1, ey], c.light); R(x, ex - 1, ey + 2, 4, 1, c.alt); }
    R(x, e1 + 3, ey, e2 - e1 - 4, 1, c.dark);
    P(x, [e1 - 2, ey, e2 + 3, ey], c.dark);
  } else if (id === 'hearts') {
    const c = GARMENTS.hearts.cw[0];
    for (const ex of [e1, e2]) { B(x, ex - 1, ey - 1, ['##.##', '#####', '.###.', '..#..'], c.base); P(x, [ex - 1, ey - 1], c.alt); }
    R(x, e1 + 4, ey, e2 - e1 - 5, 1, c.dark);
  }
}

/* ---------- Putting it on ---------- */
const ORDER = ['body', 'neck', 'head'];
const W = 48, Hh = 48 + PAD;

// Composite the outfit onto a freshly drawn (not yet outlined) sprite canvas. Records fit numbers on the canvas
// (c.topY: the highest pixel of any garment; c.fit: details for the audit).
export function dress(c, stage, o) {
  const r = rig(stage, o.variant, o.chubby), x = c.getContext('2d');
  const base = x.getImageData(0, 0, W, Hh), cd = new Uint8ClampedArray(base.data), bd = base.data;
  const fit = c.fit = { faceHits: 0, items: {} };
  let visible = null;
  const [fx0, fy0, fx1, fy1] = r.face;
  const inFace = (X, Y) => X >= fx0 && X <= fx1 && Y - PAD >= fy0 && Y - PAD <= fy1;
  for (const slot of ORDER) {
    const id = o.outfit[slot], g = GARMENTS[id];
    if (!g || g.slot !== slot || !g.draw) continue;
    const cw = colourway(g, r);
    const lc = mk(W, Hh), lx = lc.getContext('2d');
    lx.translate(0, PAD); g.draw(lx, r, cw);
    const ld = lx.getImageData(0, 0, W, Hh).data;
    if (slot === 'body' && !visible) visible = visibleTorso(r, bd);
    const info = fit.items[id] = { pixels: 0, faceHits: 0, touches: 0, orphans: 0, top: Hh, bottom: -1, left: W, right: -1, edge: false, under: r.under[slot], cw: cw.base };
    const keep = new Uint8Array(W * Hh);
    for (let Y = 0; Y < Hh; Y++) for (let X = 0; X < W; X++) {
      const p = Y * W + X;
      if (!ld[p * 4 + 3]) continue;
      if (slot === 'body' && (!visible[p] || !r.wear(X, Y - PAD))) continue;
      if (inFace(X, Y)) { info.faceHits++; fit.faceHits++; continue; }
      keep[p] = 1;
    }
    let orphans = 0;
    for (let p = 0; p < W * Hh; p++) {
      if (!keep[p]) continue;
      const X = p % W, Y = (p / W) | 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if ((dx || dy) && X + dx >= 0 && X + dx < W && Y + dy >= 0 && Y + dy < Hh && keep[p + dy * W + dx]) n++;
      }
      if (!n) { if (slot === 'body') keep[p] = 0; else orphans++; } // the torso mask can leave 1px crumbs between petals: drop them
    }
    info.orphans = orphans;
    // rim in the garment's dark tone wherever it meets Bubby
    const rim = new Uint8Array(W * Hh);
    for (let Y = 0; Y < Hh; Y++) for (let X = 0; X < W; X++) {
      const p = Y * W + X;
      if (keep[p] || !cd[p * 4 + 3] || inFace(X, Y)) continue;
      if (slot === 'body' && !visible[p]) continue;
      if ((X > 0 && keep[p - 1]) || (X < W - 1 && keep[p + 1]) || (Y > 0 && keep[p - W]) || (Y < Hh - 1 && keep[p + W])) rim[p] = 1;
    }
    const dk = hex(cw.dark);
    for (let p = 0; p < W * Hh; p++) {
      if (!keep[p] && !rim[p]) continue;
      const X = p % W, Y = (p / W) | 0;
      if (bd[p * 4 + 3]) info.touches++;
      if (keep[p]) {
        info.pixels++;
        cd[p * 4] = ld[p * 4]; cd[p * 4 + 1] = ld[p * 4 + 1]; cd[p * 4 + 2] = ld[p * 4 + 2]; cd[p * 4 + 3] = 255;
        info.top = Math.min(info.top, Y); info.bottom = Math.max(info.bottom, Y); info.left = Math.min(info.left, X); info.right = Math.max(info.right, X);
        if (X === 0 || X === W - 1 || Y === 0 || Y === Hh - 1) info.edge = true;
      } else { cd[p * 4] = dk[0]; cd[p * 4 + 1] = dk[1]; cd[p * 4 + 2] = dk[2]; cd[p * 4 + 3] = 255; }
    }
    if (slot === 'head' || slot === 'neck') c.topY = Math.min(c.topY == null ? 99 : c.topY, info.top - PAD);
  }
  base.data.set(cd);
  x.putImageData(base, 0, 0);
}

// Pixels where the unclothed sprite shows the torso (not covered by petals, leaves, face or cane).
function visibleTorso(r, bd) {
  const t = mk(W, Hh), tx = t.getContext('2d');
  tx.translate(0, PAD); r.torso(tx);
  const td = tx.getImageData(0, 0, W, Hh).data, v = new Uint8Array(W * Hh);
  for (let p = 0; p < W * Hh; p++) {
    const i = p * 4;
    v[p] = td[i + 3] && td[i] === bd[i] && td[i + 1] === bd[i + 1] && td[i + 2] === bd[i + 2] && bd[i + 3] ? 1 : 0;
  }
  return v;
}

// A garment on its own (for the pop-off animation when Bubby grows out of it), outlined like a sprite.
const loose = new Map();
export function looseGarment(id, stage, variant, chubby) {
  const key = [id, stage, variant, chubby].join('|');
  if (loose.has(key)) return loose.get(key);
  const g = GARMENTS[id];
  let c = null;
  if (g && g.draw && g.slot !== 'body') {
    const r = rig(stage, variant, chubby);
    c = mk(W, Hh); const x = c.getContext('2d');
    x.translate(0, PAD); g.draw(x, r, colourway(g, r)); x.setTransform(1, 0, 0, 1, 0, 0);
    const [fx0, fy0, fx1, fy1] = r.face;
    x.clearRect(fx0, fy0 + PAD, fx1 - fx0 + 1, fy1 - fy0 + 1);
    const d = x.getImageData(0, 0, W, Hh).data;
    for (let p = 0; p < W * Hh; p++) if (d[p * 4 + 3]) { c.topY = Math.min(c.topY ?? 99, ((p / W) | 0) - PAD); }
    outline(c);
  }
  loose.set(key, c);
  return c;
}
