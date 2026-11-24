// Garden decoration, drawn in code on the 100×75 garden.
//
// The garden is made of fixed slots (no free placement), so nothing can hide the poop, the falling seeds or Bubby:
//   ground   the lawn itself                   back     top-left corner (x 0–31, y 0–33)
//   sky      across the very top (y 0–9)       centre   where the flower pot stands (x 78–98, y 27–51)
//   floor    bottom-left corner (x 0–22)       path     the strip below Bubby's feet (y 68+), left of the poop
//   ambient  a light moving effect (butterflies, petals; fireflies glow at night)
// The four poop spots (and a margin around them) and Bubby's standing area are never drawn on.
// tools/garden-audit.mjs checks all of that, plus contrast of poop and seeds on every lawn.
import { E, ER, R, P, B, mk, mix, sprite } from './pixel.js';

export const SW = 100, SH = 75;
export const ZONES = {
  back: [0, 0, 31, 33], sky: [0, 0, 99, 10], centre: [78, 27, 98, 51], floor: [0, 50, 22, 67], path: [0, 67, 64, 74],
};
// Areas no decor may touch: each poop sprite (12×11, drawn at slot − [6, 10]) plus a 2px margin, and the middle of
// Bubby's walk. The 4th poop spot has always overlapped the pot's base, so it is reserved from just below the centrepiece.
export const RESERVED = [[72, 52, 87, 66], [82, 52, 97, 66], [62, 53, 77, 67], [80, 51, 95, 58], [24, 44, 56, 66]];

/* ---------- Lawns ---------- */
export const GROUNDS = {
  meadow: { base: '#9ad67f', noise: ['#88c96d', '#acdf8f', '#7fbf66'], tuft: ['#6fb35e'], shadow: 'rgba(64,120,52,.45)', potShadow: '#79bb65' },
  clover: { base: '#7fc76c', noise: ['#72ba60', '#8fd27c', '#6aae59'], tuft: ['#4f9a46', '#4f9a46', '#ffffff'], shadow: 'rgba(44,100,40,.45)', potShadow: '#62a855', clover: true },
  snow: { base: '#e6eff6', noise: ['#d6e3ee', '#f5f9fc', '#cbdbe8'], tuft: ['#b9cde0'], shadow: 'rgba(80,110,150,.35)', potShadow: '#c3d4e4' },
  autumn: { base: '#d3c272', noise: ['#c6b363', '#ddd086', '#bba757'], tuft: ['#d9772e', '#b8452f', '#9a7a35'], shadow: 'rgba(110,90,40,.4)', potShadow: '#b8a65c' },
};
const grounds = new Map();
export function groundTile(id) {
  const g = GROUNDS[id] || GROUNDS.meadow;
  if (grounds.has(id)) return grounds.get(id);
  const c = mk(SW, SH), x = c.getContext('2d');
  R(x, 0, 0, SW, SH, g.base);
  // Same seeded pattern as the original lawn, so the Meadow looks exactly as it always did.
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 170; i++) { const px = rnd() * SW | 0, py = rnd() * SH | 0; R(x, px, py, 1, 1, g.noise[i % 3]); }
  for (let i = 0; i < 22; i++) {
    const px = rnd() * (SW - 4) | 0, py = 6 + rnd() * (SH - 8) | 0, col = g.tuft[i % g.tuft.length];
    if (g.clover && col === '#ffffff') P(x, [px + 1, py], col);
    else if (g.clover) P(x, [px, py, px + 2, py, px + 1, py + 1, px + 1, py - 1], col);
    else P(x, [px, py, px + 2, py, px + 1, py + 1], col);
  }
  grounds.set(id, c);
  return c;
}

/* ---------- Props (cached sprites, outlined like everything else) ---------- */
let _p = null;
function props() {
  if (_p) return _p;
  const pot = sprite(12, 16, y => {
    R(y, 3, 10, 7, 5, '#c0703f'); R(y, 2, 9, 9, 2, '#d9874f'); R(y, 4, 11, 1, 3, '#e09a68');
    R(y, 6, 4, 1, 5, '#4c9a4a'); P(y, [5, 6, 4, 5, 7, 7, 8, 6], '#5cc46a');
    E(y, 6.5, 3, 2.4, 2.4, '#ffffff'); P(y, [6, 2, 7, 3, 6, 3, 7, 2], '#ffd34a');
  });
  const lantern = sprite(12, 22, x => {
    R(x, 5, 9, 2, 12, '#4f5d6e'); R(x, 5, 9, 1, 12, '#6f7d8e'); R(x, 3, 20, 6, 1, '#4f5d6e');
    R(x, 2, 2, 8, 1, '#3b4656'); R(x, 3, 1, 6, 1, '#3b4656'); R(x, 5, 0, 2, 1, '#3b4656');
    R(x, 3, 3, 6, 5, '#ffd56a'); R(x, 4, 4, 4, 3, '#fff3b0'); R(x, 3, 3, 1, 5, '#e0a11c'); R(x, 8, 3, 1, 5, '#e0a11c'); R(x, 2, 8, 8, 1, '#3b4656');
  });
  const gnome = sprite(12, 17, x => {
    for (let i = 0; i < 7; i++) R(x, 6 - Math.ceil(i / 2), i, 1 + Math.ceil(i / 2) * 2 - (i % 2 ? 1 : 0), 1, '#e8524a');
    P(x, [5, 2, 4, 4], '#ff8a7f');
    R(x, 3, 7, 6, 2, '#f3d9a8'); P(x, [4, 7, 7, 7], '#3b2f4a'); P(x, [6, 8], '#e99a7a');
    E(x, 6, 10.5, 3.2, 2.6, '#ffffff'); P(x, [5, 12], '#dfe6ee');
    R(x, 2, 12, 8, 4, '#3f6fb8'); R(x, 2, 12, 2, 4, '#5a8fd6'); R(x, 2, 15, 3, 2, '#7a4a24'); R(x, 7, 15, 3, 2, '#7a4a24');
  });
  const birdbath = sprite(18, 16, x => {
    E(x, 9, 4, 8, 2.6, '#c9ced6'); E(x, 9, 3.6, 6.6, 1.6, '#7fc6f0'); P(x, [6, 3, 7, 3], '#d6f0ff');
    R(x, 7, 6, 4, 7, '#b3b9c1'); R(x, 7, 6, 1, 7, '#dfe3e8'); R(x, 4, 13, 10, 2, '#9aa3ae'); R(x, 4, 13, 10, 1, '#b3b9c1');
  });
  const tree = sprite(30, 32, x => {
    R(x, 13, 20, 5, 11, '#8a5a36'); R(x, 13, 20, 2, 11, '#a8724a'); P(x, [12, 30, 18, 30], '#8a5a36');
    E(x, 15, 12, 13, 10.5, '#3f9a45'); E(x, 13, 10, 10, 8, '#4fae55'); E(x, 10, 7, 4.5, 3, '#6cc46a');
    P(x, [5, 9, 9, 15, 15, 5, 20, 12, 24, 15, 18, 18, 7, 16], '#2f7d3a');
    for (const [ax, ay] of [[8, 12], [17, 8], [22, 15], [12, 17]]) { R(x, ax, ay, 2, 2, '#e8524a'); P(x, [ax, ay], '#ff9a9a'); }
  });
  const sunflowers = sprite(30, 32, x => {
    for (const [sx, top] of [[5, 6], [14, 2], [23, 9]]) {
      R(x, sx, top + 3, 1, 31 - top - 3, '#3c8f45');
      ER(x, sx - 2.5, top + 13, 2.6, 1.2, '#2f7d3a', '#5cc46a', -.4); ER(x, sx + 3.5, top + 18, 2.6, 1.2, '#2f7d3a', '#5cc46a', .4);
      E(x, sx + .5, top + 2.5, 3.8, 3.8, '#ffd23f'); P(x, [sx - 3, top + 2, sx + 3, top + 3, sx, top - 1, sx + 1, top + 6], '#f0a020');
      E(x, sx + .5, top + 2.5, 1.7, 1.7, '#7a4a24'); P(x, [sx, top + 2], '#a8724a');
    }
  });
  const mushroom = sprite(30, 32, x => {
    R(x, 8, 16, 14, 15, '#f3e6cc'); R(x, 8, 16, 3, 15, '#fff6e2'); R(x, 19, 16, 3, 15, '#dccdaa');
    R(x, 13, 22, 5, 9, '#8a5a36'); P(x, [16, 26], '#ffd23f'); R(x, 13, 22, 5, 1, '#6b4226');
    E(x, 10.5, 20.5, 1.6, 1.6, '#7fc6f0');
    E(x, 15, 12, 14, 8, (px, py) => py > 15 ? null : '#e8524a'); E(x, 15, 12, 14, 8, (px, py) => py === 15 ? '#b8403e' : null);
    for (const [dx, dy, r] of [[7, 8, 2], [15, 6, 2.4], [23, 9, 2], [11, 12, 1.4], [20, 12, 1.4]]) E(x, dx, dy, r, r, '#ffffff');
  });
  const flowerbed = sprite(20, 14, x => {
    E(x, 10, 10, 9, 3.4, '#8a5a36'); E(x, 10, 9.6, 8, 2.4, '#a8724a');
    for (const [fx, h, col] of [[4, 5, '#e8524a'], [8, 7, '#ffd23f'], [12, 5, '#ff8fc0'], [16, 6, '#8f78cf']]) {
      R(x, fx, 9 - h + 2, 1, h, '#3c8f45'); P(x, [fx + 1, 9 - Math.floor(h / 2)], '#5cc46a');
      R(x, fx - 1, 9 - h, 3, 2, col); P(x, [fx - 1, 9 - h - 1, fx + 1, 9 - h - 1], col);
    }
  });
  const pond = sprite(22, 14, x => {
    E(x, 11, 7, 10, 5.6, '#8e959e'); E(x, 11, 7, 9, 4.6, '#5aa8ff'); E(x, 11, 6.4, 7.5, 3.2, '#7fc6f0');
    P(x, [6, 6, 7, 6, 15, 8, 16, 8], '#d6f0ff');
    E(x, 14, 8, 2.8, 1.6, '#5cc46a'); P(x, [14, 8], '#7fc6f0'); R(x, 7, 5, 2, 2, '#ff8fc0'); P(x, [7, 5], '#ffd0e6');
  });
  const stone = sprite(9, 5, x => { E(x, 4.5, 2.5, 4, 2, '#9aa3ae'); E(x, 4, 2, 2.6, 1.2, '#b9c0c8'); P(x, [3, 1], '#dfe3e8'); });
  const flag = (col) => sprite(5, 6, x => B(x, 0, 0, ['#####', '#####', '.###.', '.###.', '..#..'], col));
  const flags = ['#e8524a', '#ffd23f', '#5aa8ff', '#5cc46a', '#ff8fc0'].map(flag);
  const fly = (col, open) => { const c = mk(5, 4), x = c.getContext('2d'); if (open) B(x, 0, 0, ['##.##', '#####', '.#.#.'], col, {}); else B(x, 1, 0, ['#.#', '###', '#.#'], col); P(x, [2, 1, 2, 2], '#3b2f4a'); return c; };
  _p = { pot, lantern, gnome, birdbath, tree, sunflowers, mushroom, flowerbed, pond, stone, flags,
    flies: [[fly('#ffd23f', true), fly('#ffd23f', false)], [fly('#8fc0f0', true), fly('#8fc0f0', false)]] };
  return _p;
}

// Where each prop sits (top-left corner in the garden).
const AT = { pot: [82, 34], lantern: [82, 29], gnome: [82, 33], birdbath: [79, 35], tree: [0, 0], sunflowers: [0, 0], mushroom: [0, 1], flowerbed: [0, 53], pond: [0, 52] };

export function groundStyle(home) { return GROUNDS[home && home.ground] || GROUNDS.meadow; }

/* ---------- Drawing, in layers the scene calls in order ---------- */
// Behind Bubby: lawn, path, corner, back, sky, centrepiece.
export function drawBack(x, home) {
  const h = home || {}, p = props(), g = groundStyle(h);
  x.drawImage(groundTile(GROUNDS[h.ground] ? h.ground : 'meadow'), 0, 0);
  if (h.path === 'stones') for (const sx of [6, 20, 34, 48]) x.drawImage(p.stone, sx, 68 + ((sx / 14) % 2 ? 1 : 0));
  if (h.floor && p[h.floor]) x.drawImage(p[h.floor], ...AT[h.floor]);
  if (h.back && p[h.back]) x.drawImage(p[h.back], ...AT[h.back]);
  if (h.sky === 'bunting') {
    for (let px = 0; px < SW; px++) { const sag = Math.round(4 * Math.sin(Math.PI * px / (SW - 1))); P(x, [px, 1 + sag], '#7a4a24'); }
    p.flags.forEach((f, i) => { for (let k = i; k < 12; k += 5) { const fx = 4 + k * 8, sag = Math.round(4 * Math.sin(Math.PI * (fx + 2) / (SW - 1))); x.drawImage(f, fx, 1 + sag); } });
  }
  const c = 'centre' in h ? h.centre : 'pot';
  if (c && p[c]) {
    E(x, 88, 49, 6, 1.4, c === 'pot' ? g.potShadow : mix(g.potShadow, '#3b2f4a', .08));
    x.drawImage(p[c], ...AT[c]);
  }
}

// Light moving effects. `still` (reduced motion) freezes them; they're skipped during minigames.
export function drawAmbient(x, home, time, { lights = true, still = false } = {}) {
  const a = home && home.ambient, t = still ? 0 : time;
  if (a === 'butterflies' && lights) {
    const p = props();
    for (let i = 0; i < 2; i++) {
      const bx = 50 + Math.sin(t * .35 + i * 2.6) * 38, by = 30 + Math.sin(t * .6 + i * 1.7) * 14 - (i ? 6 : 0);
      x.drawImage(p.flies[i][((t * 5 + i) | 0) % 2], Math.round(bx), Math.round(by));
    }
  }
  if (a === 'petals' && lights) {
    for (let i = 0; i < 7; i++) {
      const fall = ((t * 4 + i * 23) % 90) - 8, px = (i * 37 + Math.sin(t * .8 + i) * 6 + 400) % 100;
      P(x, [Math.round(px), Math.round(fall)], i % 2 ? '#ffb3cf' : '#ff8fc0'); P(x, [Math.round(px) + 1, Math.round(fall)], '#ffd6e6');
    }
  }
}

// After the night overlay: things that glow in the dark.
export function drawGlow(x, home, time, { still = false } = {}) {
  const h = home || {}, t = still ? 0 : time;
  if (h.centre === 'lantern') {
    x.fillStyle = 'rgba(255,214,106,.16)';
    E(x, 88, 35, 13, 11, 'rgba(255,214,106,.14)'); E(x, 88, 35, 7, 6, 'rgba(255,214,106,.18)');
    R(x, 86, 33, 4, 3, '#fff3b0'); R(x, 85, 32, 6, 5, 'rgba(255,214,106,.5)');
  }
  if (h.ambient === 'fireflies') {
    for (let i = 0; i < 7; i++) {
      if (((t * 1.5 + i * .37) | 0) % 3 === 0) continue;
      const fx = (i * 29 + 7 + Math.sin(t * .5 + i) * 5 + 100) % 96 + 2, fy = 14 + (i * 17) % 40 + Math.sin(t * .7 + i * 2) * 3;
      P(x, [Math.round(fx), Math.round(fy)], '#fff27a'); x.fillStyle = 'rgba(255,242,122,.35)'; x.fillRect(Math.round(fx) - 1, Math.round(fy), 3, 1); x.fillRect(Math.round(fx), Math.round(fy) - 1, 1, 3);
    }
  }
}

// A small picture of one decor item, for the shop.
export function decorThumb(id, size = 32) {
  const c = mk(size, size), x = c.getContext('2d'), p = props();
  x.imageSmoothingEnabled = false;
  if (GROUNDS[id]) { x.drawImage(groundTile(id), 30, 30, size, size, 0, 0, size, size); return c; }
  if (id === 'bunting') { x.fillStyle = GROUNDS.meadow.base; x.fillRect(0, 0, size, size); for (let i = 0; i < 3; i++) x.drawImage(p.flags[i], 2 + i * 10, 10 + (i === 1 ? 2 : 0)); return c; }
  if (id === 'stones') { x.drawImage(p.stone, 2, 18); x.drawImage(p.stone, 14, 12); x.drawImage(p.stone, 20, 22); return c; }
  if (id === 'butterflies') { x.drawImage(p.flies[0][0], 8, 10); x.drawImage(p.flies[1][0], 18, 18); return c; }
  if (id === 'fireflies') { x.fillStyle = '#2b2f4f'; x.fillRect(0, 0, size, size); for (const [fx, fy] of [[8, 9], [20, 7], [14, 18], [24, 22], [6, 24]]) { P(x, [fx, fy], '#fff27a'); x.fillStyle = 'rgba(255,242,122,.4)'; x.fillRect(fx - 1, fy, 3, 1); x.fillRect(fx, fy - 1, 1, 3); } return c; }
  if (id === 'petals') { for (const [fx, fy] of [[6, 6], [18, 10], [10, 18], [24, 22], [14, 26]]) { P(x, [fx, fy], '#ff8fc0'); P(x, [fx + 1, fy], '#ffd6e6'); } return c; }
  const s = p[id]; if (!s) return c;
  const k = Math.min(1, size / Math.max(s.width, s.height));
  x.drawImage(s, Math.round((size - s.width * k) / 2), Math.round((size - s.height * k) / 2), Math.round(s.width * k), Math.round(s.height * k));
  return c;
}
