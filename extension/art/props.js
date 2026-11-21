// Props, particles and a tiny pixel font for Bubby's passive behaviours (same code-drawn style as sprites.js).
import { sprite, E, R, P, INK, mk } from './sprites.js';

let _props = null;
export function props() {
  if (_props) return _props;
  const G1 = '#3f9a45', G2 = '#5cc46a';
  _props = {
    ball: sprite(9, 9, x => { E(x, 4.5, 4.5, 3.6, 3.6, '#e8524a'); R(x, 2, 4, 5, 1, '#ffffff'); P(x, [3, 2], '#ff9a9a'); }),
    flower: sprite(9, 12, x => { R(x, 4, 5, 1, 6, G1); P(x, [5, 8, 6, 7], G2); for (const [a, b] of [[4, 2], [2, 4], [6, 4], [4, 6], [3, 3], [5, 3]]) R(x, a, b, 1, 1, '#ff8fc0'); E(x, 4.5, 4.5, 1.6, 1.6, '#ff8fc0'); P(x, [4, 4], '#ffe14a'); }),
    book: sprite(12, 9, x => { R(x, 1, 2, 5, 6, '#ffffff'); R(x, 6, 2, 5, 6, '#f3efe6'); R(x, 1, 7, 10, 1, '#5a8fd6'); P(x, [2, 3, 3, 3, 4, 3, 2, 5, 3, 5, 7, 3, 8, 3, 9, 3, 7, 5, 9, 5], '#9aa3ae'); }),
    book2: sprite(12, 9, x => { R(x, 1, 2, 5, 6, '#f3efe6'); R(x, 6, 2, 5, 6, '#ffffff'); R(x, 1, 7, 10, 1, '#5a8fd6'); P(x, [2, 4, 3, 4, 4, 4, 2, 6, 4, 6, 7, 4, 8, 4, 7, 6, 8, 6, 9, 6], '#9aa3ae'); }),
    wand: sprite(7, 11, x => { E(x, 3.5, 3, 2.4, 2.4, '#ff8fc0'); x.clearRect(2, 2, 3, 2); R(x, 3, 5, 1, 5, '#c0703f'); }),
    tub: sprite(30, 11, x => { R(x, 2, 2, 26, 6, '#ffffff'); R(x, 1, 1, 28, 2, '#e8eef4'); R(x, 4, 8, 22, 1, '#d5dae1'); R(x, 4, 9, 2, 1, '#9aa3ae'); R(x, 24, 9, 2, 1, '#9aa3ae'); P(x, [5, 4, 6, 4], '#cfe8f8'); }),
    broom: sprite(9, 18, x => { R(x, 4, 1, 1, 11, '#a8693a'); R(x, 2, 12, 5, 1, '#c94a45'); for (let i = 0; i < 5; i++) R(x, 2 + i, 13, 1, 4, i % 2 ? '#e0b85a' : '#f2d27a'); }),
    mirror: sprite(8, 13, x => { E(x, 4, 4.5, 3.2, 3.8, '#e0a83a'); E(x, 4, 4.5, 2.2, 2.8, '#cfe8f8'); P(x, [3, 3, 3, 4], '#ffffff'); R(x, 3, 8, 2, 4, '#e0a83a'); }),
    umbrella: sprite(17, 13, x => { E(x, 8.5, 5, 7.4, 4, (px, py) => py > 5 ? null : (((px / 3) | 0) % 2 ? '#ff8fc0' : '#ffffff')); R(x, 8, 5, 1, 7, '#7a4a24'); P(x, [7, 11, 6, 11], '#7a4a24'); }),
    cloud: sprite(18, 9, x => { E(x, 6, 5, 4.4, 3, '#ffffff'); E(x, 11, 4, 5, 3.2, '#ffffff'); E(x, 9, 6, 7, 2, '#ffffff'); P(x, [7, 3, 8, 3], '#ffffff'); R(x, 3, 7, 12, 1, '#e3e9ef'); }),
    raincloud: sprite(18, 9, x => { E(x, 6, 5, 4.4, 3, '#b6c1cc'); E(x, 11, 4, 5, 3.2, '#c5cfd9'); E(x, 9, 6, 7, 2, '#a9b4c0'); }),
    darkcloud: sprite(14, 8, x => { E(x, 5, 4.5, 3.6, 2.6, '#6b7380'); E(x, 9, 4, 4, 2.8, '#7d8592'); E(x, 7, 5.5, 5.5, 1.6, '#5f6773'); }),
    scope: sprite(16, 16, x => { for (let i = 0; i < 8; i++) R(x, 3 + i, 9 - i, 3, 2, i < 2 ? '#3f5fa8' : '#5a8fd6'); P(x, [12, 1, 13, 1], '#cfe8f8'); R(x, 7, 9, 1, 6, '#7a4a24'); P(x, [6, 12, 5, 13, 5, 14, 8, 12, 9, 13, 9, 14], '#7a4a24'); }),
    apple: sprite(9, 10, x => { E(x, 4.5, 5.5, 3.4, 3.2, '#e8524a'); P(x, [3, 4], '#ff9a9a'); R(x, 4, 1, 1, 2, '#7a4a24'); P(x, [5, 1, 6, 1], G2); }),
    cookie: sprite(8, 8, x => { E(x, 4, 4, 3, 3, '#d9a15a'); P(x, [3, 3, 5, 4, 3, 5], '#6b4226'); }),
    lolly: sprite(8, 13, x => { E(x, 4, 4, 3, 3, '#ff8fc0'); P(x, [3, 3, 4, 4, 5, 5, 5, 3], '#ffffff'); R(x, 4, 7, 1, 5, '#ffffff'); }),
    juice: sprite(8, 11, x => { R(x, 1, 3, 6, 7, '#ffb43a'); R(x, 1, 5, 6, 3, '#ffffff'); P(x, [3, 6, 4, 6], '#5fcf6a'); R(x, 5, 0, 1, 3, '#e8524a'); }),
    kite: sprite(11, 12, x => { for (let i = 0; i < 5; i++) { R(x, 5 - i, 1 + i, 1 + i * 2, 1, '#e8524a'); R(x, 5 - i, 9 - i, 1 + i * 2, 1, '#ffd23f'); } R(x, 5, 1, 1, 9, '#ffffff'); }),
    yoyo: sprite(6, 6, x => { E(x, 3, 3, 2.2, 2.2, '#5a8fd6'); P(x, [3, 3], '#ffffff'); }),
    magnifier: sprite(10, 11, x => { E(x, 4, 4, 3.4, 3.4, '#4f5d6e'); E(x, 4, 4, 2.4, 2.4, '#cfe8f8'); P(x, [3, 3], '#ffffff'); for (let i = 0; i < 3; i++) R(x, 6 + i, 7 + i, 2, 1, '#a8693a'); }),
    plush: sprite(11, 11, x => { E(x, 3, 2.5, 1.6, 1.6, '#c98a5a'); E(x, 8, 2.5, 1.6, 1.6, '#c98a5a'); E(x, 5.5, 4.5, 3.4, 3, '#d9a06a'); E(x, 5.5, 8.5, 3.6, 2.4, '#c98a5a'); P(x, [4, 4, 7, 4], INK); P(x, [5, 5, 6, 5], '#6b4226'); }),
    can: sprite(13, 10, x => { R(x, 3, 3, 6, 6, '#5fb0e6'); R(x, 9, 4, 3, 1, '#5fb0e6'); P(x, [11, 3, 12, 2], '#5fb0e6'); E(x, 6, 3, 3, 1.4, '#4f9ad6'); R(x, 1, 4, 2, 3, '#4f9ad6'); }),
    cup: sprite(9, 7, x => { R(x, 1, 1, 5, 4, '#ffffff'); P(x, [6, 2, 7, 2, 7, 3, 6, 4], '#ffffff'); R(x, 1, 1, 5, 1, '#a8693a'); P(x, [3, 3], '#ff8fc0'); }),
    yarn: sprite(9, 8, x => { E(x, 4, 4, 3, 3, '#e8524a'); P(x, [2, 3, 3, 2, 4, 4, 5, 3, 3, 5, 5, 5], '#ff9a9a'); R(x, 7, 1, 1, 6, '#c9ced6'); }),
    diary: sprite(9, 10, x => { R(x, 1, 1, 7, 8, '#9a6cc7'); R(x, 2, 2, 5, 6, '#f3efe6'); P(x, [3, 3, 4, 3, 5, 3, 3, 5, 4, 5], '#9aa3ae'); }),
    pencil: sprite(4, 8, x => { R(x, 1, 1, 2, 4, '#ffd23f'); R(x, 1, 5, 2, 1, '#f3d9a8'); P(x, [1, 6], INK); }),
    bug: sprite(7, 6, x => { E(x, 3.5, 3, 2.4, 2, '#e8524a'); R(x, 3, 1, 1, 4, INK); P(x, [2, 2, 5, 3], INK); R(x, 5, 2, 1, 2, INK); }),
    bird: sprite(9, 7, x => { E(x, 4, 4, 3, 2.2, '#5a8fd6'); E(x, 6, 2.5, 1.6, 1.6, '#5a8fd6'); P(x, [6, 2], INK); P(x, [8, 3], '#ffb43a'); R(x, 2, 4, 3, 1, '#8fc0f0'); }),
    bird2: sprite(9, 7, x => { E(x, 4, 4, 3, 2.2, '#5a8fd6'); E(x, 6, 2.5, 1.6, 1.6, '#5a8fd6'); P(x, [6, 2], INK); P(x, [8, 3], '#ffb43a'); P(x, [2, 2, 3, 1, 4, 2], '#8fc0f0'); }),
    bigleaf: sprite(20, 22, x => { E(x, 10, 10, 7.5, 9, '#3f9a45', .25); E(x, 10, 10, 6.5, 8, '#5cc46a', .25); for (let i = 0; i < 14; i++) P(x, [8 + (i / 4 | 0), 3 + i], '#3f9a45'); R(x, 12, 18, 1, 3, '#2f7d3a'); }),
    berry: sprite(5, 5, x => { E(x, 2.5, 2.5, 1.6, 1.6, '#9a3fc7'); P(x, [2, 2], '#d8a8f2'); }),
    veggie: sprite(9, 10, x => { E(x, 3, 3, 2.2, 2, G1); E(x, 6, 3, 2.2, 2, G1); E(x, 4.5, 2, 2, 1.8, G2); R(x, 4, 5, 2, 4, '#9fd38a'); }),
    dandelion: sprite(9, 13, x => { R(x, 4, 5, 1, 7, G1); E(x, 4.5, 3.5, 3, 3, '#ffffff'); P(x, [4, 3], '#e3e6ea'); }),
    stem: sprite(9, 13, x => { R(x, 4, 5, 1, 7, G1); P(x, [4, 4], '#e3e6ea'); }),
    sprout: sprite(7, 6, x => { R(x, 3, 2, 1, 3, G1); P(x, [2, 1, 1, 1, 4, 1, 5, 0], G2); }),
    mound: sprite(14, 5, x => { E(x, 7, 4, 5.6, 2.4, '#8a5a36'); P(x, [5, 2, 8, 2], '#a8724a'); }),
    hole: sprite(10, 4, x => { E(x, 5, 2, 3.6, 1.2, '#5a3b22'); }),
    stick: sprite(5, 16, x => { R(x, 2, 1, 1, 11, '#c0703f'); R(x, 1, 11, 3, 1, '#7a4a24'); R(x, 2, 12, 1, 3, '#7a4a24'); P(x, [1, 4], '#c0703f'); }),
    brush: sprite(4, 9, x => { R(x, 1, 3, 2, 5, '#5a8fd6'); R(x, 1, 1, 2, 2, '#ffffff'); }),
    comb: sprite(9, 5, x => { R(x, 1, 1, 7, 1, '#ff8fc0'); for (let i = 1; i < 8; i += 2) R(x, i, 2, 1, 2, '#ff8fc0'); }),
    pumpkin: sprite(13, 9, x => { E(x, 6.5, 5, 5.2, 3.2, '#ff9a2e'); R(x, 6, 2, 1, 6, '#e07a1c'); R(x, 3, 3, 1, 4, '#e07a1c'); R(x, 9, 3, 1, 4, '#e07a1c'); R(x, 6, 0, 1, 2, G1); }),
    partyhat: sprite(9, 11, x => { for (let i = 0; i < 7; i++) R(x, 4 - (i / 2 | 0), 2 + i, 1 + 2 * (i / 2 | 0), 1, i % 3 === 1 ? '#ffd23f' : '#5a8fd6'); E(x, 4.5, 1.5, 1.2, 1.2, '#ff5f86'); }),
    heart: sprite(7, 6, x => { P(x, [1, 1, 2, 1, 4, 1, 5, 1, 1, 2, 2, 2, 3, 2, 4, 2, 5, 2, 2, 3, 3, 3, 4, 3, 3, 4], '#ff5f86'); P(x, [2, 1], '#ffc2d2'); }),
    note: sprite(7, 9, x => { R(x, 3, 1, 1, 5, '#5a8fd6'); P(x, [4, 1, 5, 2, 5, 3], '#5a8fd6'); E(x, 2.5, 6, 1.6, 1.3, '#5a8fd6'); P(x, [2, 5], '#bfe0ff'); }),
    seedi: sprite(5, 7, x => { E(x, 2.5, 3.5, 1.6, 2.4, '#a8693a'); P(x, [2, 2], '#d9a06a'); }),
    leaf: sprite(6, 5, x => { E(x, 3, 2.5, 2.2, 1.4, '#e0a83a', .5); P(x, [2, 2], '#f2d27a'); }),
  };
  return _props;
}

/* ---------- 3×5 pixel font for tiny speech bubbles ---------- */
const GLYPHS = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', '!': '010010010000010', '?': '110001010000010', '.': '000000000000010', ' ': '000000000000000',
  '1': '010110010010111', '2': '110001010100111', '3': '110001010001110', '♥': '000101111111010',
};
export function textWidth(s) { return s.length * 4 - 1; }
export function drawText(x, s, X, Y, col = INK) {
  x.fillStyle = col;
  [...s.toUpperCase()].forEach((ch, i) => {
    const g = GLYPHS[ch] || GLYPHS[' '];
    for (let j = 0; j < 15; j++) if (g[j] === '1') x.fillRect(X + i * 4 + (j % 3), Y + ((j / 3) | 0), 1, 1);
  });
}
// A small speech bubble with a tail pointing down-left, kept on screen.
export function speech(x, s, X, Y, SW) {
  const w = textWidth(s) + 4, h = 9;
  X = Math.max(1, Math.min(SW - w - 1, Math.round(X))); Y = Math.max(1, Math.round(Y));
  R(x, X + 1, Y, w - 2, h, INK); R(x, X, Y + 1, w, h - 2, INK);
  R(x, X + 1, Y + 1, w - 2, h - 2, '#ffffff');
  P(x, [X + 2, Y + h, X + 1, Y + h + 1], INK); P(x, [X + 2, Y + h - 1], '#ffffff');
  drawText(x, s, X + 2, Y + 2);
}
export { mk };
