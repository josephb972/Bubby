// Pixel-art drawing helpers shared by Bubby, the wardrobe and the garden decor.
// Works with a DOM canvas in the popup and with OffscreenCanvas in the background service worker.

export const INK = '#3b2f4a';
// Pet sprites are 48 wide and 48 + PAD tall: Bubby's 48×48 body box sits PAD pixels down, leaving headroom for hats.
export const PAD = 8;

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
export function ring(x, cx, cy, r1, r2, col) {
  x.fillStyle = col;
  for (let py = Math.floor(cy - r2); py <= Math.ceil(cy + r2); py++) for (let px = Math.floor(cx - r2); px <= Math.ceil(cx + r2); px++) {
    const d = Math.hypot(px + .5 - cx, py + .5 - cy); if (d >= r1 && d < r2) x.fillRect(px, py, 1, 1);
  }
}
// Draw rows of a little bitmap: '#' = col, other letters from `cols`, '.' or ' ' = empty.
export function B(x, px, py, rows, col, cols = {}) {
  rows.forEach((row, y) => [...row].forEach((ch, X) => {
    const c = ch === '#' ? col : cols[ch];
    if (c) { x.fillStyle = c; x.fillRect(px + X, py + y, 1, 1); }
  }));
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

// Colour distance (CIE76 ΔE in Lab). Used to keep clothes and decor readable against what's behind them.
function lab(c) {
  const f = v => { v /= 255; return v > .04045 ? ((v + .055) / 1.055) ** 2.4 : v / 12.92; };
  const [r, g, b] = hex(c).map(f);
  const X = (r * .4124 + g * .3576 + b * .1805) / .95047, Y = r * .2126 + g * .7152 + b * .0722, Z = (r * .0193 + g * .1192 + b * .9505) / 1.08883;
  const t = v => v > .008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116;
  return [116 * t(Y) - 16, 500 * (t(X) - t(Y)), 200 * (t(Y) - t(Z))];
}
export function deltaE(a, b) { const p = lab(a), q = lab(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); }
