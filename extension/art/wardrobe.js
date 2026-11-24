// Bubby's clothes (1.3.0), drawn in code like the rest of Bubby's art. Bought in the Shop (core/shop.js), one size per stage.
//
// How clothes always fit, on every race body:
//   - Every body gets a rig: where the head top, the hat brim, the neck and the face are. The classic bodies (every
//     Bulb, and the Leafling Bud and Blossom) use measured numbers; the other races' bodies are measured from their own
//     pixels (rigFor). Garments are drawn from the rig, so a hat follows each head and a shirt follows each body.
//   - Body garments are painted onto the visible body only, so they can't spill outside Bubby or over its face.
//   - Nothing but glasses may touch the face: the face box is cleared from every other garment.
//   - Each garment gets a 1px rim in its own dark tone where it meets Bubby; the ink outline then wraps the whole sprite.
//   - Colours: each garment has colourways, and the one that stands out most against the body under it is used.
//   tools/wardrobe-audit.mjs renders every garment on every race, stage, form and pose and fails on any fitting problem.
import { E, ER, R, P, mk, hex, outline, faceCenter, bodyPixels, torsoOf } from './sprites.js';

export const PAD = 8;
const W = 48, Hh = 48 + PAD;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Rows of a little bitmap: '#' = col, other letters from `cols`, '.' = empty
export function B(x, px, py, rows, col, cols = {}) {
  rows.forEach((row, y) => [...row].forEach((ch, X) => { const c = ch === '#' ? col : cols[ch]; if (c) { x.fillStyle = c; x.fillRect(px + X, py + y, 1, 1); } }));
}
// Colour distance (CIE76 ΔE in Lab), to keep clothes readable against what's under them
function lab(c) {
  const f = v => { v /= 255; return v > .04045 ? ((v + .055) / 1.055) ** 2.4 : v / 12.92; };
  const [r, g, b] = hex(c).map(f);
  const X = (r * .4124 + g * .3576 + b * .1805) / .95047, Y = r * .2126 + g * .7152 + b * .0722, Z = (r * .0193 + g * .1192 + b * .9505) / 1.08883;
  const t = v => v > .008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116;
  return [116 * t(Y) - 16, 500 * (t(X) - t(Y)), 200 * (t(Y) - t(Z))];
}
export function deltaE(a, b) { const p = lab(a), q = lab(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); }

/* ---------- Rigs (48×48 body-box coordinates; y can go up to PAD above 0) ---------- */
// The measured rigs of the classic bodies
function classicRig(stage, o) {
  if (stage === 'baby') return {
    stage, ch: 0, body: [24, 35, 11.5, 10],
    face: [16, 32, 32, 40],
    head: { cx: 24, dome: [24, 35, 12.1, 10.6], top: 24, brim: 29, bow: [33, 27], pompom: false, crownW: 13, coneW: 14, coneH: 9 },
    neck: { cx: 24, y: 42, w: 14, tail: 1 },
    // a round body has no shoulders: the neckline sits under the mouth and rises up the sides around the face
    shirtTop: 41, wear: (px, py) => py >= 41 || ((px < 16 || px > 32) && py >= 41 - 2 * (Math.abs(px + .5 - 24) - 8)), heart: [24, 42, 'small'],
  };
  if (stage === 'child') return {
    stage, ch: 0, body: [24, 36, 9.5, 9],
    face: [16, 33, 32, 41],
    head: { cx: 24, dome: [24, 19, 6.8, 8.2], top: 11, brim: 15, bow: [29.5, 14], pompom: true, crownW: 11, coneW: 12, coneH: 10 },
    neck: { cx: 24, y: 27, w: 12, tail: 3 },
    shirtTop: 42, wear: (px, py) => py >= 42 || px < 16 || px > 32, heart: [24, 42, 'small'],   // the leaf arms become sleeves
  };
  const ch = o.chubby ? 2 : 0;
  return {
    stage, ch, body: [24, 39, 7.5 + ch, 6.5],
    face: [15, 17, 33, 28],
    head: { cx: 24, dome: [24, 14, 11, 9.2], top: 5, brim: 12, bow: [34, 8], pompom: true, crownW: 15, coneW: 16, coneH: 13 },
    neck: { cx: 24, y: 31, w: 14, tail: 4 },
    shirtTop: 33, wear: () => true, straps: [20, 28], strapTop: 33, heart: [24, 38, 'big'],
  };
}
const CANE = [0x7a, 0x4a, 0x24];
// Any other race body: measured from its pixels
function measuredRig(stage, o, bd) {
  const op = (X, y) => {
    if (X < 0 || X >= W || y < -PAD || y >= 48) return false;
    const i = ((y + PAD) * W + X) * 4;
    return bd[i + 3] > 0 && !(bd[i] === CANE[0] && bd[i + 1] === CANE[1] && bd[i + 2] === CANE[2]);   // the Elder's cane isn't Bubby
  };
  const span = y => { let lo = 99, hi = -1; for (let X = 0; X < W; X++) if (op(X, y)) { lo = Math.min(lo, X); hi = Math.max(hi, X); } return hi < 0 ? null : [lo, hi]; };
  const [fcx, fcy] = faceCenter(stage, o.race);
  const face = [fcx - 9, Math.floor(fcy) - 5, fcx + 9, Math.floor(fcy) + 4];
  let top = 48, bottom = 0;
  for (let y = -PAD; y < 48; y++) for (let X = 12; X <= 36; X++) if (op(X, y)) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
  for (let y = 47; y > bottom; y--) if (span(y)) { bottom = y; break; }
  const brim = Math.max(top + 2, Math.min(top + 6, face[1] - 2));
  const bs = span(brim) || [18, 30], w = clamp(bs[1] - bs[0] + 1, 8, 24);
  let ny = face[3] + 2;
  if (ny > bottom - 2) ny = Math.max(face[3] + 1, bottom - 2);
  const ns = span(ny) || [19, 29], nw = clamp(ns[1] - ns[0] - 1, 8, 16);
  const below = Math.max(2, bottom - face[3]), bs2 = span(Math.min(bottom - 1, face[3] + 3)) || [16, 32];
  // The bow sits on the first row of the head that is wide enough to hold it (a star's point is not)
  let bow = [Math.min(24 + w / 2 - 1, 41), top + 2];
  for (let y = top + 1; y < Math.min(face[1], top + 10); y++) { const sp = span(y); if (sp && sp[1] - sp[0] >= 7) { bow = [Math.min(sp[1] - 1, 41), y]; break; } }
  const ch = o.chubby ? 2 : 0;
  return {
    stage, ch, measured: true, body: [24, Math.round(face[3] + below / 2), (bs2[1] - bs2[0] + 1) / 2, below / 2],
    face,
    head: { cx: 24, dome: [24, brim + 1, w / 2 + 1, brim - top + 3], top, brim, bow, pompom: true,
      crownW: clamp(w - 4, 9, 15), coneW: clamp(w - 2, 10, 16), coneH: clamp(brim - 1 + PAD - 2, 6, 13) },
    neck: { cx: 24, y: ny, w: nw, tail: clamp(bottom - ny - 3, 1, 4) },
    shirtTop: face[3] + 1, wear: (px, py) => py > face[3] || (py >= fcy && (px < face[0] || px > face[2])),
    straps: [20, 28], strapTop: face[3] + 1, heart: [24, Math.min(face[3] + 3, bottom - 4), (bs2[1] - bs2[0]) >= 12 ? 'big' : 'small'],
  };
}
// The most common colour in a set of pixels (what a garment there is seen against)
function mode(bd, pts) {
  const n = new Map();
  for (const p of pts) {
    const i = p * 4; if (!bd[i + 3]) continue;
    const k = '#' + [bd[i], bd[i + 1], bd[i + 2]].map(v => v.toString(16).padStart(2, '0')).join('');
    n.set(k, (n.get(k) || 0) + 1);
  }
  let best = '#888888', m = 0; for (const [k, v] of n) if (v > m) { m = v; best = k; }
  return best;
}
const rigs = new Map();
export function rigFor(stage, o = {}) {
  const key = [stage, o.race, o.variant, o.chubby].join('|');
  if (rigs.has(key)) return rigs.get(key);
  const base = { race: o.race, variant: o.variant, chubby: o.chubby, mood: 'normal' };
  const bd = bodyPixels(stage, base), torso = torsoOf(stage, base);
  const r = torso || stage === 'baby' ? classicRig(stage, o) : measuredRig(stage, o, bd);
  r.torso = torso;
  // What each kind of garment sits on, sampled from the real pixels
  const at = (x0, x1, y0, y1) => { const out = []; for (let y = y0; y <= y1; y++) for (let X = x0; X <= x1; X++) if (X >= 0 && X < W && y >= -PAD && y < 48) out.push((y + PAD) * W + X); return out; };
  const hw = Math.ceil(r.head.dome[2]);
  const bodyPts = at(0, 47, -PAD, 47).filter(p => { const X = p % W, y = ((p / W) | 0) - PAD; return r.wear(X, y) && !(X >= r.face[0] && X <= r.face[2] && y >= r.face[1] && y <= r.face[3]); });
  r.under = { head: mode(bd, at(24 - hw, 24 + hw, r.head.top, r.head.brim + 1)), neck: mode(bd, at(24 - r.neck.w / 2, 24 + r.neck.w / 2, r.neck.y - 1, r.neck.y + 1)), body: mode(bd, bodyPts) };
  if (rigs.size > 300) rigs.clear();
  rigs.set(key, r);
  return r;
}

/* ---------- Garment helpers ---------- */
export function colourway(item, r) {
  const under = r.under[item.slot === 'face' ? 'head' : item.slot];
  let best = item.cw[0], d = -1;
  for (const cw of item.cw) { const v = deltaE(cw.base, under); if (v > d + 4) { d = v; best = cw; } }
  return best;
}
function rows(x, [cx, cy, rx, ry], y0, y1, col) { E(x, cx, cy, rx, ry, (px, py) => (py < y0 || py > y1) ? null : col(px, py)); }
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
        const sh = Math.max(0, cy - 4 - r.strapTop); R(x, r.straps[0], r.strapTop, 1, sh, c.base); R(x, r.straps[1], r.strapTop, 1, sh, c.base);
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
// Composite the outfit onto a freshly drawn (not yet outlined) padded sprite. Records c.topY (the highest garment
// pixel, so status bubbles sit above a hat) and c.fit (numbers for the audit).
export function dress(c, stage, o) {
  const r = rigFor(stage, o), x = c.getContext('2d');
  const base = x.getImageData(0, 0, W, Hh), cd = new Uint8ClampedArray(base.data), bd = base.data;
  const fit = c.fit = { faceHits: 0, items: {} };
  let visible = null;
  const [fx0, fy0, fx1, fy1] = r.face;
  const inFace = (X, Y) => X >= fx0 && X <= fx1 && Y - PAD >= fy0 && Y - PAD <= fy1;
  for (const slot of ORDER) {
    const id = o.outfit[slot], g = GARMENTS[id];
    if (!g || g.slot !== slot || !g.draw) continue;
    const cw = colourway(g, r);
    const lc = mk(W, Hh), lx = lc.getContext('2d', { willReadFrequently: true });
    lx.translate(0, PAD); g.draw(lx, r, cw);
    const ld = lx.getImageData(0, 0, W, Hh).data;
    if (slot === 'body' && !visible) visible = visibleBody(r, bd);
    const info = fit.items[id] = { pixels: 0, faceHits: 0, touches: 0, orphans: 0, top: Hh, bottom: -1, left: W, right: -1, edge: false, under: r.under[slot], cw: cw.base };
    const keep = new Uint8Array(W * Hh);
    for (let Y = 0; Y < Hh; Y++) for (let X = 0; X < W; X++) {
      const p = Y * W + X;
      if (!ld[p * 4 + 3]) continue;
      if (slot === 'body' && (!visible[p] || !r.wear(X, Y - PAD))) continue;
      if (inFace(X, Y)) { info.faceHits++; fit.faceHits++; continue; }
      keep[p] = 1;
    }
    for (let p = 0; p < W * Hh; p++) {
      if (!keep[p]) continue;
      const X = p % W, Y = (p / W) | 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && X + dx >= 0 && X + dx < W && Y + dy >= 0 && Y + dy < Hh && keep[p + dy * W + dx]) n++;
      if (!n) { if (slot === 'body') keep[p] = 0; else info.orphans++; }   // a body mask can leave 1px crumbs: drop them
    }
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
        if ((X === 0 || X === W - 1 || Y === 0 || Y === Hh - 1) && !bd[p * 4 + 3]) info.edge = true;   // only where it goes past Bubby
      } else { cd[p * 4] = dk[0]; cd[p * 4 + 1] = dk[1]; cd[p * 4 + 2] = dk[2]; cd[p * 4 + 3] = 255; }
    }
    if (slot === 'head' || slot === 'neck') c.topY = Math.min(c.topY == null ? 99 : c.topY, info.top - PAD);
  }
  base.data.set(cd);
  x.putImageData(base, 0, 0);
}
// Where a body garment may show: the classic bodies use their torso drawing matched pixel by pixel (so petals, leaves
// and the face stay on top); the other races use the whole body except the Elder's cane.
function visibleBody(r, bd) {
  const v = new Uint8Array(W * Hh);
  if (r.torso) {
    const t = mk(W, Hh), tx = t.getContext('2d', { willReadFrequently: true });
    tx.translate(0, PAD); r.torso(tx);
    const td = tx.getImageData(0, 0, W, Hh).data;
    for (let p = 0; p < W * Hh; p++) { const i = p * 4; v[p] = td[i + 3] && td[i] === bd[i] && td[i + 1] === bd[i + 1] && td[i + 2] === bd[i + 2] && bd[i + 3] ? 1 : 0; }
  } else for (let p = 0; p < W * Hh; p++) { const i = p * 4; v[p] = bd[i + 3] && !(bd[i] === CANE[0] && bd[i + 1] === CANE[1] && bd[i + 2] === CANE[2]) ? 1 : 0; }
  return v;
}

// A garment on its own, outlined (for the pop-off when Bubby grows out of it)
const loose = new Map();
export function looseGarment(id, stage, o = {}) {
  const key = [id, stage, o.race, o.variant, o.chubby].join('|');
  if (loose.has(key)) return loose.get(key);
  const g = GARMENTS[id];
  let c = null;
  if (g && g.draw && g.slot !== 'body') {
    const r = rigFor(stage, o);
    c = mk(W, Hh); const x = c.getContext('2d');
    x.translate(0, PAD); g.draw(x, r, colourway(g, r)); x.setTransform(1, 0, 0, 1, 0, 0);
    const [fx0, fy0, fx1, fy1] = r.face;
    x.clearRect(fx0, fy0 + PAD, fx1 - fx0 + 1, fy1 - fy0 + 1);
    outline(c);
  }
  loose.set(key, c);
  return c;
}
