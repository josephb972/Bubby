// TikTok / Reels / Shorts promo for the shop update, rendered from the real game art and real popup screenshots.
// Usage: node tools/promo-video.mjs   (needs Playwright with Chromium, and ffmpeg)
// Audio is normalised to -14 LUFS (TikTok's usual level). Copy the finished files to store/promo/ to keep them.
//   → dist/promo/bubby-shop-tiktok.mp4           1080×1920, 30 fps, with the original chiptune soundtrack
//     dist/promo/bubby-shop-tiktok-sfx-only.mp4  same, sound effects only (to lay a trending sound under it in TikTok)
//     dist/promo/cover.png                       cover frame
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { openPage, repo } from './lib/page.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const out = join(repo, 'dist', 'promo'), ext = join(repo, 'extension');
await mkdir(out, { recursive: true });
const FPS = 30, BEAT = 60 / 160;   // 160 BPM; every scene starts on a beat
const T = { hook: 0, evolve: 2.25, flash: 2.55, shop: 5.25, montage: 9.75, garden: 14.25, night: 16.9, cta: 18.75, end: 22.5 };

/* ---------- 1. Real popup screenshots (shop buying flow, toy pod) ---------- */
console.log('capturing the real popup…');
const shots = {};
{
  const ctx = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true, viewport: { width: 468, height: 600 }, deviceScaleFactor: 2,
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`] });
  let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const base = `chrome-extension://${new URL(sw.url()).host}/`;
  await sw.evaluate(async () => { for (let i = 0; i < 50 && !(await chrome.storage.local.get('bubby')).bubby; i++) await new Promise(r => setTimeout(r, 100)); });
  const set = (state, meta) => sw.evaluate(async ([state, meta]) => {
    const S = (await chrome.storage.local.get('bubby')).bubby, now = Date.now();
    Object.assign(S, { hunger: 4, happy: 4, poops: [], sick: false, call: null, asleep: false, lights: true, paused: false, ended: null, mistakes: 0, discipline: 100, awakeT: 3600, stageT: 3600 }, state);
    Object.assign(S.cfg, { look: 'toy', bed: (new Date().getHours() * 60 + 300) % 1440, wake: (new Date().getHours() * 60 + 400) % 1440 });
    S.lastT = now; S.lastSeenAt = now; S.seenSeq = S.evSeq; S.notifiedSeq = S.evSeq;
    meta.claim = { born: S.born, seq: S.evSeq }; meta.v = 1; meta.rev = now;
    await chrome.storage.local.set({ bubby: S, 'bubby-meta': meta });
  }, [state, meta]);
  const png = async (p, sel) => 'data:image/png;base64,' + (await p.locator(sel).screenshot()).toString('base64');
  const box = async (p, sel, rel) => { const a = await p.locator(sel).boundingBox(), b = await p.locator(rel).boundingBox(); return { x: a.x - b.x, y: a.y - b.y, w: a.width, h: a.height }; };
  const ALL = ['S', 'M', 'L', 'XL'];

  await set({ stage: 'child', weight: 12 }, { petals: 60, lifetime: 60, owned: { petalbow: ALL, beanie: ['S'], meadow: ['*'], pot: ['*'] },
    equip: { head: 'beanie', face: null, neck: null, body: null }, home: { ground: 'meadow', centre: 'pot' }, news: { outgrown: ['beanie'] } });
  let p = await ctx.newPage();
  await p.goto(base + 'popup/popup.html'); await p.waitForTimeout(700);
  await p.keyboard.press('b'); await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelector('article[data-id="beanie"]').scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(200);
  const buy = 'article[data-id="beanie"] button.buy';
  shots.a = await png(p, '#viewShop'); shots.buyBox = await box(p, buy, '#viewShop');
  shots.chips = await box(p, 'article[data-id="beanie"] .sizes', '#viewShop');
  await p.click(buy); await p.waitForTimeout(150);
  shots.b = await png(p, '#viewShop'); shots.buyBox2 = await box(p, buy, '#viewShop');
  await p.click(buy); await p.waitForTimeout(700);
  shots.c = await png(p, '#viewShop');
  shots.chips = await box(p, 'article[data-id="beanie"] .sizes', '#viewShop');
  shots.card = await box(p, 'article[data-id="beanie"]', '#viewShop');
  await p.close();

  await set({ stage: 'adult', variant: 'radiant', weight: 24, age: 5 * 86400 }, { petals: 186, lifetime: 420, owned: { petalbow: ALL, crown: ['L'], bowtie: ['L'], shades: ['L'], meadow: ['*'], pot: ['*'], tree: ['*'], lantern: ['*'], bunting: ['*'], flowerbed: ['*'] },
    equip: { head: 'crown', face: 'shades', neck: 'bowtie', body: null }, home: { ground: 'meadow', centre: 'lantern', back: 'tree', sky: 'bunting', floor: 'flowerbed' }, news: {} });
  p = await ctx.newPage();
  await p.goto(base + 'popup/popup.html'); await p.waitForTimeout(900);
  shots.pod = await png(p, '.pdev');
  await ctx.close();
}

/* ---------- 2. The soundtrack (original chiptune, 160 BPM) and sound effects ---------- */
console.log('composing the soundtrack…');
const SR = 44100, N = Math.ceil(T.end * SR);
const music = new Float32Array(N), sfx = new Float32Array(N);
const midi = m => 440 * 2 ** ((m - 69) / 12);
let seed = 1; const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
function tone(buf, at, dur, f, { vol = .2, wave = 'square', duty = .5, a = .004, r = .05, to = null } = {}) {
  const s0 = Math.floor(at * SR), n = Math.floor((dur + r) * SR);
  let ph = 0, lp = 0;
  for (let i = 0; i < n && s0 + i < N; i++) {
    const t = i / SR, fr = to ? f * (to / f) ** Math.min(1, t / dur) : f;
    ph = (ph + fr / SR) % 1;
    let v = wave === 'square' ? (ph < duty ? 1 : -1) : wave === 'tri' ? 4 * Math.abs(ph - .5) - 1 : wave === 'sine' ? Math.sin(ph * 2 * Math.PI) : noise();
    lp += (v - lp) * (wave === 'square' ? .35 : 1);   // soften the square a little
    const env = Math.min(1, t / a) * (t > dur ? Math.max(0, 1 - (t - dur) / r) : 1);
    buf[s0 + i] += lp * env * vol;
  }
}
function drum(at, kind, vol = 1) {
  const s0 = Math.floor(at * SR);
  const n = Math.floor((kind === 'kick' ? .16 : kind === 'snare' ? .14 : .04) * SR);
  let ph = 0, prev = 0;
  for (let i = 0; i < n && s0 + i < N; i++) {
    const t = i / SR, d = Math.exp(-t / (kind === 'kick' ? .05 : kind === 'snare' ? .045 : .01));
    let v;
    if (kind === 'kick') { ph += (45 + 110 * Math.exp(-t / .03)) / SR; v = Math.sin(ph * 2 * Math.PI) * .9; }
    else if (kind === 'snare') { ph += 185 / SR; v = noise() * .55 + Math.sin(ph * 2 * Math.PI) * .3; }
    else { const nz = noise(); v = (nz - prev) * .5; prev = nz; }
    music[s0 + i] += v * d * vol * .5;
  }
}
// Music: I–V–vi–IV in C, bass on eighths, arpeggio on sixteenths, a little hook melody, drums.
const CH = [[48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48]];
const MEL = [[76, 79, 81, 79], [74, 79, 83, 79], [72, 76, 81, 76], [72, 77, 81, 84]];
const muted = t => (t >= 3.75 && t < 4.65) || (t >= T.night && t < T.night + .7);
for (let bar = 0; bar * 4 * BEAT < T.end; bar++) {
  const chord = CH[bar % 4], t0 = bar * 4 * BEAT, last = t0 + 4 * BEAT > T.end - .01;
  for (let e = 0; e < 8; e++) {
    const t = t0 + e * BEAT / 2; if (muted(t) || t >= T.end - .2) continue;
    tone(music, t, BEAT / 2 * .7, midi(chord[0] - 12 + (e % 2 ? 12 : 0)), { vol: .22, duty: .5 });
  }
  for (let s = 0; s < 16; s++) {
    const t = t0 + s * BEAT / 4; if (muted(t) && !(t >= T.night)) continue; if (t >= T.end - .2) continue;
    tone(music, t, BEAT / 4 * .5, midi(chord[s % 3] + 24), { vol: t >= T.night && t < T.night + .7 ? .07 : .05, duty: .25 });
  }
  if (bar >= 1 || true) for (let b = 0; b < 4; b++) {
    const t = t0 + b * BEAT; if (muted(t) || t >= T.end - .2) continue;
    tone(music, t, BEAT * .55, midi(MEL[bar % 4][b]), { vol: .09, wave: 'tri', r: .08 });
    drum(t, b % 2 ? 'snare' : 'kick');
    drum(t + BEAT / 2, 'hat', .8);
  }
  if (last) for (const m of [60, 64, 67, 72]) tone(music, T.end - 1.1, .9, midi(m), { vol: .08, wave: 'tri', r: .2 });
}
// Sound effects, synced to the picture
const beepUp = (at, notes, step = .09, vol = .16) => notes.forEach((f, i) => tone(sfx, at + i * step, step * 1.1, f, { vol, duty: .5 }));
tone(sfx, 0, .18, 300, { to: 900, vol: .12, wave: 'sine' });                                   // hook pop-in
beepUp(T.flash, [523, 659, 784, 1046]);                                                        // evolve (the game's level-up)
tone(sfx, T.flash, .25, 0, { wave: 'noise', vol: .1, r: .15 });                                 // flash
tone(sfx, 3.85, .09, 320, { to: 1500, vol: .22, wave: 'sine' });                               // the hat pops off
tone(sfx, 4.0, .28, 392, { to: 370, vol: .14, duty: .5, r: .04 });                             // wah…
tone(sfx, 4.32, .42, 370, { to: 330, vol: .14, duty: .5, r: .12 });                            // …wah
tone(sfx, T.shop, .22, 0, { wave: 'noise', vol: .06, r: .1 });                                 // card swoosh
for (const t of [6.6, 7.6]) { tone(sfx, t, .02, 2400, { vol: .1, wave: 'sine', r: .02 }); tone(sfx, t + .01, .03, 1200, { vol: .06, r: .02 }); } // taps
tone(sfx, 7.65, .06, 1046, { vol: .16 }); tone(sfx, 7.74, .12, 1318, { vol: .16 });             // the game's buy chime
beepUp(7.95, [1568, 2093], .07, .09);                                                          // Petals sparkle
[1046, 1175, 1318, 1568, 1760, 2093].forEach((f, i) => tone(sfx, T.garden + .375 * (i + 1), .07, f, { vol: .1, duty: .25 })); // decor pops
tone(sfx, T.night, .35, 220, { to: 70, vol: .2, wave: 'sine', r: .1 });                         // lights off
beepUp(T.night + .45, [2093, 2637, 3136, 2637, 3136, 4186], .06, .05);                          // glow shimmer
beepUp(T.cta, [523, 659, 784, 1046], .1, .14);                                                 // outro jingle

function wav(buf) {
  let peak = 0; for (const v of buf) peak = Math.max(peak, Math.abs(v));
  const g = peak ? .89 / peak : 1, b = Buffer.alloc(44 + buf.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + buf.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(buf.length * 2, 40);
  for (let i = 0; i < buf.length; i++) b.writeInt16LE(Math.round(Math.tanh(buf[i] * g * 1.1) * 32000), 44 + i * 2);
  return b;
}
const full = new Float32Array(N); for (let i = 0; i < N; i++) full[i] = music[i] * .62 + sfx[i];
await writeFile(join(out, 'audio-full.wav'), wav(full));
await writeFile(join(out, 'audio-sfx.wav'), wav(sfx));

/* ---------- 3. Frames ---------- */
console.log('rendering frames…');
const { page, errors, close } = await openPage();
await page.setViewportSize({ width: 1080, height: 1920 });
await page.evaluate(async ({ T, BEAT, shots }) => {
  const st = document.createElement('style');
  st.textContent = ['fredoka-latin-600-normal:Fredoka:600', 'pixelify-sans-latin-600-normal:Pixelify:600', 'nunito-latin-700-normal:Nunito:700']
    .map(s => { const [f, n, w] = s.split(':'); return `@font-face{font-family:${n};font-weight:${w};src:url(/fonts/${f}.woff2)}`; }).join('');
  document.head.appendChild(st);
  await Promise.all(['600 80px Fredoka', '600 40px Pixelify', '700 40px Nunito'].map(f => document.fonts.load(f)));
  const { petSprite, PAD } = await import('/art/sprites.js');
  const { drawScene } = await import('/popup/scene.js');
  const Rules = await import('/core/rules.js');
  const img = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
  const IM = { a: await img(shots.a), b: await img(shots.b), c: await img(shots.c), pod: await img(shots.pod) };
  const W = 1080, H = 1920, C = document.createElement('canvas'); C.width = W; C.height = H; document.body.appendChild(C);
  const x = C.getContext('2d');
  const INK = '#3b2f4a', RED = '#d9504a', CREAM = '#fffcf3', PINK = '#ff8fc0';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), k01 = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const back = t => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2, outQ = t => 1 - (1 - t) ** 3;
  const garden = document.createElement('canvas'); garden.width = 100; garden.height = 75; const gx = garden.getContext('2d');

  function bg(col, t) {
    const g = x.createRadialGradient(W * .3, 0, 50, W * .5, H * .4, H);
    g.addColorStop(0, '#ffffff'); g.addColorStop(.35, col); g.addColorStop(1, col);
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(59,47,74,.06)';                               // drifting pixel confetti
    for (let i = 0; i < 46; i++) { const px = (i * 197 + t * 30 * (1 + i % 3)) % (W + 40) - 20, py = (i * 331 + t * 12) % H; x.fillRect(px | 0, py | 0, 12, 12); }
  }
  function words(segs, cx, cy, size, { font = 'Fredoka', pop = 1, stroke = 16, rot = 0 } = {}) {
    x.save(); x.translate(cx, cy); x.rotate(rot); x.scale(pop, pop);
    x.font = `600 ${size}px ${font}`; x.textBaseline = 'middle'; x.lineJoin = 'round';
    const w = segs.reduce((s, [t]) => s + x.measureText(t).width, 0);
    let px = -w / 2;
    for (const [t, col] of segs) {
      x.lineWidth = stroke; x.strokeStyle = INK; x.strokeText(t, px, 6);
      x.fillStyle = INK; x.fillText(t, px, 10);                       // drop shadow
      x.strokeText(t, px, 0); x.fillStyle = col || CREAM; x.fillText(t, px, 0);
      px += x.measureText(t).width;
    }
    x.restore();
  }
  // Caption that pops in with a little overshoot at `at`
  const cap = (t, at, lines, y, size, opt = {}) => {
    if (t < at || (opt.until && t >= opt.until)) return;
    const p = back(k01(t, at, at + .22));
    lines.forEach((l, i) => words(l, W / 2, y + i * size * 1.08, size, { ...opt, pop: .55 + .45 * p }));
  };
  function pet(stage, o, cx, cy, scale) {
    const s = petSprite(stage, o); x.imageSmoothingEnabled = false;
    x.drawImage(s, Math.round(cx - 24 * scale), Math.round(cy - (28 + PAD / 2) * scale), 48 * scale, (48 + PAD) * scale);
  }
  function screen(S, A, time, look, cx, cy, k, alpha = 1) {
    drawScene(gx, S, A, null, { x: 50, moving: false, dir: 1 }, time, look);
    const w = 100 * k, h = 75 * k, X = cx - w / 2, Y = cy - h / 2;
    x.save(); x.globalAlpha = alpha;
    x.fillStyle = '#454b58'; rr(X - 22, Y - 22, w + 44, h + 44, 44); x.fill();
    x.fillStyle = INK; rr(X - 22, Y - 10, w + 44, h + 44, 44); x.globalCompositeOperation = 'destination-over'; x.fill(); x.globalCompositeOperation = 'source-over';
    x.save(); rr(X, Y, w, h, 18); x.clip(); x.imageSmoothingEnabled = false; x.drawImage(garden, X, Y, w, h); x.restore();
    x.restore();
  }
  function rr(X, Y, w, h, r) { x.beginPath(); x.roundRect(X, Y, w, h, r); }
  function sparkle(cx, cy, t, r = 60, n = 6, size = 12) {
    for (let i = 0; i < n; i++) {
      const a = t * 3 + i * Math.PI * 2 / n, px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r * .7;
      x.fillStyle = i % 2 ? '#ffffff' : '#ffe14a';
      x.fillRect(px - size / 2, py - size * 1.5, size, size * 3); x.fillRect(px - size * 1.5, py - size / 2, size * 3, size);
    }
  }
  function watermark() {
    x.save(); x.font = '600 46px Fredoka'; x.textBaseline = 'middle';
    x.fillStyle = 'rgba(255,252,243,.85)'; rr(52, 200, 196, 70, 35); x.fill();
    x.fillStyle = INK; x.fillText('Bub', 82, 236); x.fillStyle = RED; x.fillText('by', 82 + x.measureText('Bub').width, 236);
    x.restore();
  }
  const S0 = Rules.fresh(1, { pace: 'chill' }, 0);
  const mkS = o => ({ ...S0, hunger: 4, happy: 4, poops: [], sick: false, asleep: false, lights: true, call: null, ended: null, paused: false, ...o });

  // Outfit montage: one look per beat, every body and form
  const LOOKS = [
    ['adult', { variant: 'radiant' }, { head: 'crown', face: 'shades', neck: 'bowtie' }, 'Radiant · crown + shades', '#ffd6e6'],
    ['adult', { variant: 'daisy' }, { head: 'wizard', body: 'sweater' }, 'Daisy · wizard hat', '#fff1c9'],
    ['adult', { variant: 'thistle' }, { head: 'beanie', neck: 'scarf', body: 'overalls' }, 'Thistle · cosy mode', '#e3d8ff'],
    ['child', {}, { head: 'crown', face: 'hearts' }, 'Bud · tiny royalty', '#d6e6ff'],
    ['baby', {}, { head: 'wizard', neck: 'bowtie' }, 'Bulb · baby wizard', '#bfe6db'],
    ['senior', { variant: 'daisy' }, { head: 'beanie', neck: 'scarf', body: 'tee' }, 'Elder · still stylish', '#ffd6e6'],
    ['adult', { variant: 'radiant', chubby: true }, { head: 'petalbow', face: 'hearts', body: 'sweater' }, 'Chubby · fits perfectly', '#fff1c9'],
    ['senior', { variant: 'thistle' }, { head: 'crown', neck: 'bowtie', body: 'overalls' }, 'Elder Thistle · the boss', '#e3d8ff'],
    ['adult', { variant: 'daisy' }, { face: 'shades', neck: 'scarf', body: 'tee' }, 'Daisy · summer fit', '#d6e6ff'],
    ['child', {}, { head: 'beanie', body: 'overalls' }, 'Bud · garden work', '#bfe6db'],
    ['senior', { variant: 'radiant' }, { head: 'wizard', neck: 'scarf' }, 'Elder · wise wizard', '#ffd6e6'],
    ['adult', { variant: 'thistle', chubby: true }, { head: 'crown', face: 'shades', body: 'sweater' }, 'Thistle · main character', '#fff1c9'],
  ];
  const HOME0 = { ground: 'meadow', centre: 'pot' };
  const ADDS = [['back', 'tree'], ['sky', 'bunting'], ['floor', 'flowerbed'], ['centre', 'lantern'], ['path', 'stones'], ['ambient', 'butterflies']];
  const ADD_AT = [[16, 12], [50, 4], [8, 62], [88, 38], [30, 70], [50, 40]];
  const BLOSSOM = { head: 'crown', neck: 'bowtie' };

  window.render = function (t) {
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.imageSmoothingEnabled = false;
    if (t < T.evolve) {
      // HOOK
      bg('#bfe6db', t);
      const punch = 1 + .25 * (1 - outQ(k01(t, 0, .35)));
      pet('baby', { mood: 'happy', outfit: { head: 'beanie' }, blink: (t % 1.7) < .1 }, W / 2, 1150 - Math.abs(Math.sin(t * 6)) * 24, 15 * punch);
      // The whole hook is readable on the very first frame (that's what decides the scroll); it just gets a punch.
      const shake = Math.sin(t * 50) * 5 * (1 - k01(t, 0, .7));
      words([['my pet keeps']], W / 2, 430, 96, { pop: .85 + .15 * back(k01(t, 0, .2)) });
      words([['OUTGROWING', RED]], W / 2 + shake, 560, 150, { pop: .8 + .2 * back(k01(t, .05, .3)), stroke: 20, rot: -.03 });
      words([['its clothes']], W / 2, 690, 96, { pop: .85 + .15 * back(k01(t, .1, .3)) });
    } else if (t < T.shop) {
      // EVOLVE: the real evolve animation, the beanie pops off
      bg('#bfe6db', t);
      const at = t - T.flash, S = mkS({ stage: at < 0 ? 'baby' : 'child' });
      const A = at < 0 ? null : { type: 'evolve', t: Math.min(at, 2.49), dur: 2.5, from: 'baby', popOff: ['beanie'] };
      const look = { home: HOME0, wear: s => s === 'baby' ? { head: 'beanie' } : {} };
      screen(S, A, t, look, W / 2, 1050, 9.2);
      cap(t, T.flash, [[['it grew…']]], 420, 110, { until: 3.85 });
      cap(t, 3.85, [[['…the hat ', CREAM], ["didn't", RED]]], 420, 110);
    } else if (t < T.montage) {
      // SHOP: the real popup, tapping Buy (Bud size), confirm, bought
      bg('#ffd6e6', t);
      const slide = outQ(k01(t, T.shop, T.shop + .35)), k = .86, w = 936 * k, h = 1200 * k, X = (W - w) / 2, Y = 470 + (1 - slide) * 900;
      const im = t < 6.68 ? IM.a : t < 7.68 ? IM.b : IM.c;
      // Camera: push in on the beanie card for the tap → confirm → bought moment
      const cd = shots.card, fx = X + (cd.x + cd.w / 2) * 2 * k, fy = Y + (cd.y + cd.h / 2) * 2 * k;
      const e = outQ(k01(t, 6.05, 6.45)), z = 1 + .36 * e;
      x.save(); x.translate(fx + (W / 2 - fx) * e, fy + (1200 - fy) * e); x.scale(z, z); x.translate(-fx, -fy);
      x.save(); x.shadowColor = 'rgba(59,47,74,.35)'; x.shadowBlur = 40; x.shadowOffsetY = 16;
      x.fillStyle = INK; rr(X - 10, Y - 10, w + 20, h + 20, 46); x.fill(); x.restore();
      x.save(); rr(X, Y, w, h, 38); x.clip(); x.imageSmoothingEnabled = true; x.drawImage(im, X, Y, w, h); x.restore();
      const tap = (at, b, until = at + .45) => {
        if (t < at - .25 || t > until) return;
        const bx = X + (b.x + b.w / 2) * 2 * k, by = Y + (b.y + b.h / 2) * 2 * k, p = k01(t, at, at + .4);
        x.save(); x.globalAlpha = t < at ? 1 : 1 - p; x.fillStyle = 'rgba(255,255,255,.75)'; x.strokeStyle = INK; x.lineWidth = 6;
        x.beginPath(); x.arc(bx, by, t < at ? 34 : 34 + p * 50, 0, Math.PI * 2); x.fill(); x.stroke(); x.restore();
      };
      tap(6.6, shots.buyBox, 6.68); tap(7.6, shots.buyBox2, 7.68);   // each ripple ends when the screen changes
      if (t >= 8.25) {                                                    // ring the four size chips
        const c = shots.chips, p = .5 + .5 * Math.sin((t - 8.25) * 12);
        x.save(); x.strokeStyle = RED; x.lineWidth = (8 + p * 4) / z; rr(X + c.x * 2 * k - 10, Y + c.y * 2 * k - 10, c.w * 2 * k + 20, c.h * 2 * k + 20, 22); x.stroke(); x.restore();
      }
      x.restore();
      if (t >= 7.65 && t < 8.6) {                                         // -26 Petals floating up
        const p = k01(t, 7.65, 8.6); x.save(); x.globalAlpha = 1 - p;
        words([['-26 Petals', PINK]], W - 230, 640 - p * 90, 60, { font: 'Pixelify', stroke: 12 }); x.restore();
      }
      const band = x.createLinearGradient(0, 160, 0, 520);                // keep the caption readable over the zoomed UI
      band.addColorStop(0, 'rgba(255,214,230,1)'); band.addColorStop(.6, 'rgba(255,214,230,.92)'); band.addColorStop(1, 'rgba(255,214,230,0)');
      x.fillStyle = band; x.fillRect(0, 0, W, 520);
      cap(t, T.shop + .15, [[['so we went ', CREAM], ['shopping', RED]]], 330, 100, { until: 8.2 });
      cap(t, 8.2, [[['1 size for ', CREAM], ['every stage', RED]]], 330, 100);
    } else if (t < T.garden) {
      // MONTAGE: a new look on every beat
      const i = Math.min(LOOKS.length - 1, Math.floor((t - T.montage) / BEAT)), [stage, b, outfit, label, col] = LOOKS[i];
      const bt = (t - T.montage) % BEAT, bump = 1 + .12 * (1 - outQ(k01(bt, 0, .18)));
      bg(col, t);
      pet(stage, { ...b, mood: 'happy', outfit }, W / 2, 1080, 14 * bump);
      cap(t, T.montage, [[['every outfit fits']], [['EVERY', RED], [' form', CREAM]]], 360, 104);
      words([[label, INK]], W / 2, 1530, 52, { font: 'Pixelify', stroke: 0, pop: bump });
      x.fillStyle = 'rgba(59,47,74,.18)';                                 // beat dots
      LOOKS.forEach((_, j) => { x.fillStyle = j <= i ? INK : 'rgba(59,47,74,.18)'; x.fillRect(W / 2 - LOOKS.length * 16 + j * 32 + 8, 1620, 16, 16); });
    } else if (t < T.cta) {
      // GARDEN GLOW-UP, then lights off
      bg(t < T.night ? '#fff1c9' : '#2b2f4f', t);
      const home = { ...HOME0 }; let newest = -1;
      ADDS.forEach(([slot, id], j) => { if (t >= T.garden + BEAT * (j + 1)) { home[slot] = id; newest = j; } });
      const night = t >= T.night;
      if (night) home.ambient = 'fireflies';
      const S = mkS({ stage: 'adult', variant: 'radiant', lights: !night });
      const k = 9.6, cx = W / 2, cy = 1050;
      screen(S, null, t, { home, wear: () => BLOSSOM }, cx, cy, k);
      if (newest >= 0 && !night) {
        const at = T.garden + BEAT * (newest + 1), p = k01(t, at, at + .3);
        if (p < 1) { x.save(); x.globalAlpha = 1 - p; const [gx2, gy2] = ADD_AT[newest]; sparkle(cx - 50 * k + gx2 * k, cy - 37.5 * k + gy2 * k, t, 50 + p * 60); x.restore(); }
      }
      if (t >= T.night && t < T.night + .12) { x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(0, 0, W, H); }
      if (!night) cap(t, T.garden, [[['then its garden']], [['got a ', CREAM], ['GLOW-UP', RED]]], 340, 104);
      else {
        cap(t, T.night + .1, [[['lights off…']]], 360, 104, { until: T.night + .65 });
        cap(t, T.night + .65, [[['so ', CREAM], ['cosy', '#ffd56a']]], 360, 120);
        if (t > T.night + .65) { x.save(); x.globalAlpha = .9; sparkle(W / 2, 360, t, 330, 8, 10); x.restore(); }
      }
    } else {
      // CTA: brand outro
      bg('#bfe6db', t);
      const p = outQ(k01(t, T.cta, T.cta + .5)), k = .6, w = 936 * k, h = 1200 * k;
      x.save(); x.shadowColor = 'rgba(40,60,70,.3)'; x.shadowBlur = 50; x.shadowOffsetY = 20;
      x.save(); rr((W - w) / 2, 560 + (1 - p) * 1200, w, h, 40); x.clip(); x.imageSmoothingEnabled = true; x.drawImage(IM.pod, (W - w) / 2, 560 + (1 - p) * 1200, w, h); x.restore(); x.restore();
      const lp = back(k01(t, T.cta, T.cta + .3));
      x.save(); x.translate(W / 2, 330); x.scale(lp, lp); x.font = '600 190px Fredoka'; x.textBaseline = 'middle'; x.lineJoin = 'round';
      const bw = x.measureText('Bub').width, tw = bw + x.measureText('by').width;
      x.lineWidth = 22; x.strokeStyle = CREAM; x.strokeText('Bubby', -tw / 2, 0);
      x.fillStyle = INK; x.fillText('Bub', -tw / 2, 0); x.fillStyle = RED; x.fillText('by', -tw / 2 + bw, 0); x.restore();
      if (t > T.cta + .25) { x.font = '700 48px Nunito'; x.textAlign = 'center'; x.fillStyle = '#5d5070'; x.fillText('a tiny pixel pet for your browser toolbar', W / 2, 470); x.textAlign = 'left'; }
      if (t > T.cta + .6) {
        const q = back(k01(t, T.cta + .6, T.cta + .85));
        x.save(); x.translate(W / 2, 1390); x.scale(q, q); x.fillStyle = INK; rr(-300, -48, 600, 96, 48); x.fill();
        x.font = '600 50px Pixelify'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = CREAM; x.fillText('free on Chrome + Edge', 0, 2); x.restore();
      }
      cap(t, T.cta + 1.1, [[['which outfit ', INK], ['next?', RED]]], 1520, 76, { stroke: 0 });
    }
    watermark();
    return C.toDataURL('image/jpeg', .95);
  };
}, { T, BEAT, shots });

const frames = Math.round(T.end * FPS);
const silent = join(out, 'video-silent.mp4');
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'medium', '-r', String(FPS), silent], { stdio: ['pipe', 'inherit', 'inherit'] });
for (let f = 0; f < frames; f++) {
  const url = await page.evaluate(t => window.render(t), f / FPS);
  const buf = Buffer.from(url.split(',')[1], 'base64');
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f === Math.round(.75 * FPS)) await writeFile(join(out, 'cover.jpg'), buf);
  if (f % 90 === 0) process.stdout.write(`  ${f}/${frames}\r`);
}
ff.stdin.end();
await new Promise((res, rej) => ff.on('close', c => c ? rej(new Error('ffmpeg ' + c)) : res()));
await close();
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

const mux = (audio, file) => new Promise((res, rej) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-i', join(out, audio),
  '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '44100', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', join(out, file)], { stdio: 'inherit' }).on('close', c => c ? rej(new Error('mux ' + c)) : res()));
await mux('audio-full.wav', 'bubby-shop-tiktok.mp4');
await mux('audio-sfx.wav', 'bubby-shop-tiktok-sfx-only.mp4');
console.log(`\ndist/promo/bubby-shop-tiktok.mp4 · bubby-shop-tiktok-sfx-only.mp4 · cover.jpg (${frames} frames, ${T.end}s)`);
