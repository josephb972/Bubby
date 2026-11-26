// Kawaii TikTok / Reels / Shorts video for the clothes update: the cutest Bubby (a Daisy Leafling) gets dressed in the cutest
// outfit, one piece per beat, with a cuteness meter, a polaroid reveal, all four sizes, and the brand outro.
// Everything is the real game: its art code (wornSprite) and a screenshot of the real popup. Music and sounds are generated here.
// Usage: node tools/kawaii-video.mjs   (needs Playwright with Chromium, and ffmpeg)
//   → dist/kawaii/bubby-kawaii-tiktok.mp4         1080×1920, 30 fps, original music-box soundtrack, -14 LUFS
//     dist/kawaii/bubby-kawaii-tiktok-sfx-only.mp4  same picture, sound effects only (to add a trending sound in TikTok)
//     dist/kawaii/cover.jpg                         cover frame
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { openPage, repo } from './lib/page.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const out = join(repo, 'dist', 'kawaii'), ext = join(repo, 'extension');
await mkdir(out, { recursive: true });
const FPS = 30, BPM = 120, BEAT = 60 / BPM;
// Every scene starts on a beat (a beat is half a second)
const T = { bow: 2.5, glasses: 4.5, sweater: 6.5, tie: 8.5, crown: 10.5, reveal: 12.5, sizes: 16, cta: 19.5, end: 22.5 };

/* ---------- 1. A real screenshot of the popup with this outfit (for the outro) ---------- */
console.log('capturing the real popup…');
let podShot;
{
  const ctx = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true, viewport: { width: 468, height: 600 }, deviceScaleFactor: 2,
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`] });
  let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const base = `chrome-extension://${new URL(sw.url()).host}/`;
  await sw.evaluate(async () => { for (let i = 0; i < 50 && !(await chrome.storage.local.get('bubby')).bubby; i++) await new Promise(r => setTimeout(r, 100)); });
  await sw.evaluate(async () => {
    const S = (await chrome.storage.local.get('bubby')).bubby, now = Date.now(), d = new Date();
    const ALL = ['S', 'M', 'L', 'XL'];
    Object.assign(S, { name: 'Mochi', hatchedAt: now - 5 * 86400e3, hunger: 4, happy: 4, poops: [], sick: false, disease: null, doses: 0, call: null, asleep: false, lights: true, paused: false, ended: null, mistakes: 0, discipline: 100, awakeT: 3600,
      stage: 'adult', variant: 'daisy', race: 'leafling', seedRace: 'leafling', weight: 24, age: 5 * 86400, stageT: 3600, points: 240, streak: 3, streakMs: 3,
      lastCheckIn: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      persona: { axes: { energy: 2, appetite: 0, manners: 2, nerve: 1, health: 0 }, quirks: ['cuddlebug', 'songbird'], known: { q: 1, axes: ['energy'] } }, journal: [],
      wardrobe: { owned: { petalbow: ALL, hearts: ALL, sweater: ALL, bowtie: ALL, crown: ALL, meadow: ['*'], pot: ['*'], tree: ['*'], bunting: ['*'], flowerbed: ['*'], butterflies: ['*'] },
        equip: { head: 'crown', face: 'hearts', neck: 'bowtie', body: 'sweater' }, home: { ground: 'meadow', sky: 'bunting', back: 'tree', centre: 'pot', floor: 'flowerbed', ambient: 'butterflies' }, news: {} } });
    Object.assign(S.cfg, { look: 'toy', bed: 22 * 60, wake: 8 * 60 });
    S.lastT = now; S.lastSeenAt = now; S.seenSeq = S.evSeq; S.notifiedSeq = S.evSeq;
    await chrome.storage.local.set({ bubby: S });
  });
  const p = await ctx.newPage();
  await p.setViewportSize({ width: 468, height: 600 });
  await p.goto(base + 'popup/popup.html'); await p.waitForSelector('#app'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(900);
  podShot = 'data:image/png;base64,' + (await p.locator('.pdev').screenshot()).toString('base64');
  await ctx.close();
}

/* ---------- 2. The soundtrack: a music box (original), and the sound effects ---------- */
console.log('composing the music box…');
const SR = 44100, N = Math.ceil(T.end * SR);
const music = new Float32Array(N), sfx = new Float32Array(N);
const midi = m => 440 * 2 ** ((m - 69) / 12);
let seed = 7; const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
// A music-box / glockenspiel note: a sine with a few quiet overtones and a quick pluck
function bell(buf, at, f, vol = .2, dur = .9) {
  const s0 = Math.floor(at * SR), n = Math.floor(dur * SR);
  for (let i = 0; i < n && s0 + i < N; i++) {
    const t = i / SR, env = Math.min(1, t / .004) * Math.exp(-t * 4.2);
    buf[s0 + i] += (Math.sin(2 * Math.PI * f * t) + .35 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t * 9) + .14 * Math.sin(6 * Math.PI * f * t) * Math.exp(-t * 14)) * env * vol;
  }
}
function soft(buf, at, dur, f, vol, { to = null, wave = 'sine', a = .01, r = .06 } = {}) {
  const s0 = Math.floor(at * SR), n = Math.floor((dur + r) * SR);
  let ph = 0;
  for (let i = 0; i < n && s0 + i < N; i++) {
    const t = i / SR, fr = to ? f * (to / f) ** Math.min(1, t / dur) : f;
    ph = (ph + fr / SR) % 1;
    const v = wave === 'sine' ? Math.sin(ph * 2 * Math.PI) : wave === 'tri' ? 4 * Math.abs(ph - .5) - 1 : noise();
    buf[s0 + i] += v * Math.min(1, t / a) * (t > dur ? Math.max(0, 1 - (t - dur) / r) : 1) * vol;
  }
}
function puff(buf, at, vol = .12, dur = .22) {   // a soft "poof": filtered noise
  const s0 = Math.floor(at * SR), n = Math.floor(dur * SR); let lp = 0;
  for (let i = 0; i < n && s0 + i < N; i++) { const t = i / SR; lp += (noise() - lp) * .12; buf[s0 + i] += lp * Math.exp(-t * 16) * vol * 3; }
}
// I – vi – IV – V in C, with a sweet little tune on top
const CHORDS = [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 67]];
const TUNE = [[79, 0, 76, 79], [76, 0, 72, 76], [77, 0, 74, 72], [74, 76, 79, 0]];
for (let bar = 0; bar * 4 * BEAT < T.end - .3; bar++) {
  const ch = CHORDS[bar % 4], t0 = bar * 4 * BEAT;
  for (let e = 0; e < 8; e++) { const t = t0 + e * BEAT / 2; if (t < T.end - .4) bell(music, t, midi(ch[e % 4] + 12), .075 + (e % 2 ? 0 : .02), .7); }
  for (const b of [0, 2]) soft(music, t0 + b * BEAT, BEAT * .9, midi(ch[0] - 12), .16, { wave: 'tri', r: .12 });
  if (bar >= 1) TUNE[bar % 4].forEach((m, i) => { if (m) bell(music, t0 + i * BEAT, midi(m + 12), .11, 1.1); });
  for (let e = 0; e < 8; e++) soft(music, t0 + e * BEAT / 2 + .02, .02, 5200, .012, { wave: 'noise', r: .02 });   // a very soft tick
  if (bar >= 2) for (const b of [1, 3]) puff(music, t0 + b * BEAT, .05, .09);
}
for (const m of [72, 76, 79, 84]) bell(music, T.end - 1.4, midi(m), .09, 1.4);   // the last chord rings
const chime = (at, notes, step = .07, vol = .09) => notes.forEach((m, i) => bell(sfx, at + i * step, midi(m), vol, .8));
// the hook: a bubble pop
soft(sfx, .02, .1, 500, .1, { to: 1400 });
// one poof and a sparkle per outfit piece, on the beat (the pitch climbs with the cuteness)
[T.bow, T.glasses, T.sweater, T.tie].forEach((t, i) => {
  puff(sfx, t, .14); soft(sfx, t, .12, 380 + i * 60, .1, { to: 1100 + i * 140 });
  chime(t + .05, [84 + i, 88 + i, 91 + i, 96 + i], .06, .09);
  soft(sfx, t + .3, .08, 260, .06, { to: 360 });                              // a little squeak when Bubby bounces
});
// the crown upgrade
puff(sfx, T.crown, .2, .3); chime(T.crown, [72, 76, 79, 84, 88, 91, 96], .06, .1); soft(sfx, T.crown, .5, 300, .08, { to: 1500 });
// the reveal: a big kira-kira glissando and a heart pop
chime(T.reveal, [79, 83, 86, 91, 95, 98, 103], .055, .09);
for (let k = 0; k < 6; k++) soft(sfx, T.reveal + .7 + k * .22, .05, 1500 + k * 180, .05);
// the four sizes pop in
[0, 1, 2, 3].forEach(i => { const t = T.sizes + i * BEAT; puff(sfx, t, .1, .16); soft(sfx, t, .1, 420 + i * 90, .09, { to: 900 + i * 90 }); chime(t + .04, [84 + i * 2, 91 + i * 2], .06, .08); });
// the outro
chime(T.cta, [72, 76, 79, 84], .12, .12); chime(T.cta + 1.1, [88, 91, 96], .09, .09);
function wav(buf) {
  let peak = 0; for (const v of buf) peak = Math.max(peak, Math.abs(v));
  const g = peak ? .89 / peak : 1, b = Buffer.alloc(44 + buf.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + buf.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(buf.length * 2, 40);
  for (let i = 0; i < buf.length; i++) b.writeInt16LE(Math.round(Math.tanh(buf[i] * g * 1.1) * 32000), 44 + i * 2);
  return b;
}
const full = new Float32Array(N); for (let i = 0; i < N; i++) full[i] = music[i] * .8 + sfx[i];
await writeFile(join(out, 'audio-full.wav'), wav(full));
await writeFile(join(out, 'audio-sfx.wav'), wav(sfx));

/* ---------- 3. The frames ---------- */
console.log('rendering frames…');
const { page, errors, close } = await openPage();
await page.setViewportSize({ width: 1080, height: 1920 });
await page.evaluate(async ({ T, BEAT, podShot }) => {
  const st = document.createElement('style');
  st.textContent = ['fredoka-latin-600-normal:Fredoka:600', 'nunito-latin-700-normal:Nunito:700'].map(s => { const [f, n, w] = s.split(':'); return `@font-face{font-family:${n};font-weight:${w};src:url(/fonts/${f}.woff2)}`; }).join('');
  document.head.appendChild(st);
  await Promise.all(['600 80px Fredoka', '700 40px Nunito'].map(f => document.fonts.load(f)));
  const { wornSprite, PAD } = await import('/art/sprites.js');
  const img = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
  const POD = await img(podShot);
  const W = 1080, H = 1920, C = document.createElement('canvas'); C.width = W; C.height = H; document.body.appendChild(C);
  const x = C.getContext('2d');
  const PINK = '#ff7fb0', DPINK = '#d94f86', LAV = '#b9a4ff', MINT = '#8fe3c8', INK = '#5a3b6e', CREAM = '#fffaf5';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), k01 = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const outQ = t => 1 - (1 - t) ** 3, back = t => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2;
  const L = { race: 'leafling', variant: 'daisy' };
  const rr = (X, Y, w, h, r) => { x.beginPath(); x.roundRect(X, Y, w, h, r); };

  /* --- kawaii shapes --- */
  function heart(cx, cy, s, fill, stroke) {
    x.save(); x.translate(cx, cy); x.scale(s / 30, s / 30); x.beginPath();
    x.moveTo(0, 10); x.bezierCurveTo(-34, -12, -16, -32, 0, -14); x.bezierCurveTo(16, -32, 34, -12, 0, 10); x.closePath();
    if (stroke) { x.lineWidth = 7; x.lineJoin = 'round'; x.strokeStyle = stroke; x.stroke(); }
    x.fillStyle = fill; x.fill(); x.restore();
  }
  function sparkle(cx, cy, s, col, rot = 0) {
    x.save(); x.translate(cx, cy); x.rotate(rot); x.fillStyle = col; x.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? s * .22 : s; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    x.closePath(); x.fill(); x.restore();
  }
  function cloud(cx, cy, s, alpha) {
    x.save(); x.globalAlpha = alpha; x.fillStyle = '#fff';
    for (const [dx, dy, r] of [[-1.2, .2, .7], [-.4, -.35, .9], [.5, -.2, .8], [1.2, .25, .6], [0, .35, 1.2]]) { x.beginPath(); x.arc(cx + dx * s, cy + dy * s, r * s * .7, 0, 7); x.fill(); }
    x.restore();
  }
  function background(t, tone = 0) {
    const g = x.createLinearGradient(0, 0, 0, H);
    const tops = [['#ffd9ec', '#f3dcff', '#d9ecff'], ['#fff0c9', '#ffd9ec', '#f3dcff']][tone];
    g.addColorStop(0, tops[0]); g.addColorStop(.55, tops[1]); g.addColorStop(1, tops[2]);
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(255,255,255,.35)';                                         // soft polka dots, drifting up
    for (let i = 0; i < 40; i++) { const px = (i * 211) % W, py = ((i * 137) - t * 24 * (1 + i % 3 * .4)) % (H + 80); x.beginPath(); x.arc(px, (py + H + 80) % (H + 80) - 40, 14 + (i % 4) * 8, 0, 7); x.fill(); }
    for (const [i, cy] of [[0, 380], [1, 900], [2, 1500]]) cloud(((t * (14 + i * 6) + i * 420) % (W + 500)) - 250, cy, 70 + i * 12, .55);
    for (let i = 0; i < 14; i++) {                                                  // hearts and stars floating up
      const px = (i * 173 + 90) % W + Math.sin(t * .8 + i) * 24, py = H + 60 - ((t * (50 + i % 4 * 18) + i * 150) % (H + 140));
      if (i % 3) heart(px, py, 22 + (i % 3) * 8, ['#ffc2dc', '#e3d6ff', '#fff'][i % 3]); else sparkle(px, py, 16, '#fff', t + i);
    }
  }
  /* --- text: white, with a thick pink outline and a soft shadow --- */
  function say(segs, cx, cy, size, { pop = 1, rot = 0, stroke = 20 } = {}) {
    x.save(); x.translate(cx, cy); x.rotate(rot); x.scale(pop, pop);
    x.font = `600 ${size}px Fredoka`; x.textBaseline = 'middle'; x.lineJoin = 'round';
    const w = segs.reduce((s, [t]) => s + x.measureText(t).width, 0);
    let px = -w / 2;
    for (const [t, col] of segs) {
      x.lineWidth = stroke; x.strokeStyle = DPINK; x.strokeText(t, px, 8);                  // shadow
      x.strokeStyle = PINK; x.strokeText(t, px, 0); x.fillStyle = col || '#fff'; x.fillText(t, px, 0);
      px += x.measureText(t).width;
    }
    x.restore();
  }
  const cap = (t, at, segs, y, size, o = {}) => { if (t < at || (o.until && t >= o.until)) return; say(segs, W / 2, y, size, { ...o, pop: .5 + .5 * back(k01(t, at, at + .25)) }); };
  /* --- Bubby --- */
  function bubby(stage, opts, cx, ground, sc, { squash = 1, rot = 0 } = {}) {
    const spr = wornSprite(stage, opts);
    x.save(); x.imageSmoothingEnabled = false; x.translate(cx, ground); x.rotate(rot); x.scale(1 / squash, squash);
    x.drawImage(spr, -24 * sc, -(48 + PAD) * sc + 2 * sc, 48 * sc, (48 + PAD) * sc);
    x.restore();
  }
  function shadow(cx, cy, w, k = 1) { x.save(); x.fillStyle = `rgba(150,90,170,${.18 * k})`; x.beginPath(); x.ellipse(cx, cy, w, w * .16, 0, 0, 7); x.fill(); x.restore(); }
  function poof(cx, cy, age, s = 1) {            // a puff of pastel circles and sparkles
    if (age < 0 || age > .8) return;
    const p = age / .8, cols = ['#fff', '#ffb3d1', '#c9b8ff', '#bfe9ff', '#fff3a8'];
    x.save(); x.globalAlpha = 1 - p;
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + age, r = (30 + 160 * outQ(p)) * s; x.fillStyle = cols[i % 5]; x.beginPath(); x.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r * .8, (24 - 16 * p) * s, 0, 7); x.fill(); }
    for (let i = 0; i < 5; i++) sparkle(cx + Math.cos(i * 1.26 + 1) * 190 * outQ(p) * s, cy + Math.sin(i * 1.26 + 1) * 150 * outQ(p) * s, 26 * (1 - p) * s, '#fff', age * 3);
    x.restore();
  }
  function logo(cx, cy, size) {
    x.save(); x.font = `600 ${size}px Fredoka`; x.textBaseline = 'middle'; x.lineJoin = 'round';
    const a = x.measureText('Bub').width, w = a + x.measureText('by').width;
    x.lineWidth = size * .14; x.strokeStyle = '#fff'; x.strokeText('Bubby', cx - w / 2, cy);
    x.fillStyle = INK; x.fillText('Bub', cx - w / 2, cy); x.fillStyle = DPINK; x.fillText('by', cx - w / 2 + a, cy); x.restore();
  }
  function watermark() {
    x.save(); x.font = '600 44px Fredoka'; x.textBaseline = 'middle';
    x.fillStyle = 'rgba(255,255,255,.88)'; rr(52, 196, 190, 68, 34); x.fill();
    const a = x.measureText('Bub').width; x.fillStyle = INK; x.fillText('Bub', 80, 231); x.fillStyle = DPINK; x.fillText('by', 80 + a, 231); x.restore();
  }
  /* --- the cuteness meter --- */
  function meter(t, level) {                    // level 0..100
    const mx = 170, my = 330, mw = 700, mh = 58;
    x.save(); x.fillStyle = 'rgba(255,255,255,.9)'; rr(mx - 8, my - 8, mw + 16, mh + 16, 38); x.fill();
    x.strokeStyle = PINK; x.lineWidth = 6; rr(mx - 8, my - 8, mw + 16, mh + 16, 38); x.stroke();
    const f = (mw * level) / 100;
    if (f > 4) { const g = x.createLinearGradient(mx, 0, mx + mw, 0); g.addColorStop(0, '#ffb3d1'); g.addColorStop(1, level >= 100 ? '#ffd56a' : PINK); x.fillStyle = g; rr(mx, my, Math.max(mh * .8, f), mh, 27); x.fill(); }
    heart(mx + mw + 4, my + mh / 2, 54 + (level >= 100 ? Math.sin(t * 14) * 4 : 0), level >= 100 ? '#ffd56a' : PINK, '#fff');
    x.font = '600 40px Fredoka'; x.textBaseline = 'middle'; x.fillStyle = INK; x.textAlign = 'center';
    x.fillText(level >= 100 ? 'MAX CUTENESS!!' : `cuteness ${Math.round(level)}%`, mx + mw / 2, my + mh / 2 + 2); x.textAlign = 'left';
    x.restore();
  }
  const PIECES = [['petalbow', T.bow, 'petal bow', [33, 10]], ['hearts', T.glasses, 'heart glasses', [24, 22]], ['sweater', T.sweater, 'heart sweater', [24, 42]],
    ['bowtie', T.tie, 'bow tie', [24, 33]], ['crown', T.crown, 'little crown', [24, 6]]];
  const SLOT = { petalbow: 'head', crown: 'head', hearts: 'face', sweater: 'body', bowtie: 'neck' };
  function outfitAt(t) {
    const o = {};
    for (const [id, at] of PIECES) if (t >= at) o[SLOT[id]] = id;
    return o;
  }
  const levelAt = t => clamp(PIECES.filter(([, at]) => t >= at).length * 20, 0, 100) * 1;
  // A hop on every beat, squashing when it lands
  function hop(t, amp = 34) { const p = (t % BEAT) / BEAT, s = Math.sin(p * Math.PI); return { dy: -amp * s, squash: 1 - .09 * (1 - s) ** 3 }; }

  window.render = function (t) {
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.textAlign = 'left';
    const sc = 13, gy = 1290;
    if (t < T.bow) {
      /* HOOK */
      background(t);
      const h = hop(t), blink = (t % 2.4) < .12;
      shadow(W / 2, gy + 6, 230 - h.dy * -1.2);
      bubby('adult', { ...L, mood: blink ? 'normal' : 'happy', blink, outfit: {} }, W / 2, gy + h.dy, sc, { squash: h.squash });
      say([['dressing up my tiny pet']], W / 2, 470, 78, { pop: .85 + .15 * back(k01(t, 0, .2)) });
      say([['in the ', '#fff'], ['cutest', '#fff6a8'], [' outfit', '#fff']], W / 2, 600, 96, { pop: .85 + .15 * back(k01(t, .08, .3)), rot: -.02 });
      heart(220, 760, 54, PINK, '#fff'); heart(860, 740, 44, LAV, '#fff'); sparkle(800, 880, 30, '#fff', t);
      if (t > 1.3) cap(t, 1.3, [[' ready? ', '#fff']], 1560, 76);
    } else if (t < T.reveal) {
      /* BUILDING THE OUTFIT: one piece per beat-pair */
      background(t, t >= T.crown ? 1 : 0);
      const outfit = outfitAt(t), h = hop(t - T.bow), gb = 1330, sb = 14;
      const last = PIECES.filter(([, at]) => t >= at).pop(), age = t - last[1];
      const pop = 1 + .16 * (1 - back(k01(age, 0, .35))) * (age < .35 ? 1 : 0), squash = age < .35 ? 1 + .2 * Math.sin(k01(age, 0, .35) * Math.PI) : h.squash;
      // the puff goes behind Bubby, so it never smudges the face
      for (const [, at, , [ax, ay]] of PIECES) { if (t >= at) { const sx = W / 2 + (ax - 24) * sb, sy = gb + h.dy - (48 + PAD) * sb + (ay + PAD) * sb; poof(sx, sy, t - at, 1.2); } }
      shadow(W / 2, gb + 6, 245);
      x.save(); x.translate(W / 2, gb + h.dy); x.scale(pop, pop); x.translate(-W / 2, -(gb + h.dy));
      bubby('adult', { ...L, mood: 'happy', outfit }, W / 2, gb + h.dy, sb, { squash });
      x.restore();
      // the level climbs smoothly to the next 20
      const lvl = PIECES.reduce((s, [, at]) => s + 20 * outQ(k01(t, at, at + .6)), 0);
      meter(t, lvl);
      // the item sticker
      const [, , name] = last, sp = back(k01(age, 0, .3));
      x.save(); x.translate(W / 2, 1530); x.rotate(-.03 + Math.sin(t * 3) * .01); x.scale(sp, sp);
      x.font = '600 62px Fredoka'; const w = x.measureText('+ ' + name).width + 120;
      x.fillStyle = '#fff'; rr(-w / 2, -54, w, 108, 54); x.fill(); x.strokeStyle = PINK; x.lineWidth = 8; rr(-w / 2, -54, w, 108, 54); x.stroke();
      x.fillStyle = INK; x.textBaseline = 'middle'; x.textAlign = 'center'; x.fillText('+ ' + name, 12, 4); heart(-w / 2 + 44, 0, 36, PINK); x.restore();
      if (last[0] === 'crown') cap(t, T.crown, [['outfit upgrade!', '#fff6a8']], 470, 92);
      else cap(t, T.bow, [[['so soft…', 'so sweet…', 'so fancy…', 'so cute…'][PIECES.indexOf(last)], '#fff']], 470, 92);
    } else if (t < T.sizes) {
      /* REVEAL: a polaroid */
      background(t, 1);
      const k = back(k01(t, T.reveal, T.reveal + .45)), z = .92 + .04 * k01(t, T.reveal + .5, T.sizes);
      const cx = W / 2, cy = 1070;
      x.save(); x.translate(cx, cy); x.rotate(-.035 * k); x.scale(k * z, k * z);
      x.shadowColor = 'rgba(120,60,150,.3)'; x.shadowBlur = 50; x.shadowOffsetY = 24;
      x.fillStyle = CREAM; rr(-400, -520, 800, 1040, 28); x.fill(); x.shadowColor = 'transparent';
      const g = x.createLinearGradient(0, -480, 0, 300); g.addColorStop(0, '#ffe1f0'); g.addColorStop(1, '#e4d8ff'); x.fillStyle = g; rr(-360, -480, 720, 720, 14); x.fill();
      x.save(); rr(-360, -480, 720, 720, 14); x.clip();
      for (let i = 0; i < 9; i++) sparkle(-300 + (i * 157) % 600, -400 + (i * 97) % 560, 14 + i % 3 * 6, '#fff', t * 2 + i);
      x.restore();
      const h = hop(t - T.reveal, 40);
      shadow(0, 200, 200);
      bubby('adult', { ...L, mood: 'happy', outfit: { head: 'crown', face: 'hearts', neck: 'bowtie', body: 'sweater' } }, 0, 200 + h.dy, 11, { squash: h.squash });
      x.font = '600 74px Fredoka'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = INK; x.fillText('outfit of the day', 0, 360);
      x.font = '700 42px Nunito'; x.fillStyle = DPINK; x.fillText('Mochi the Daisy Leafling', 0, 440);
      x.fillStyle = 'rgba(255,200,220,.85)'; x.save(); x.rotate(.05); x.fillRect(-90, -540, 180, 56); x.restore();   // tape
      x.restore();
      poof(W / 2, 900, t - T.reveal, 1.6);
      for (let i = 0; i < 9; i++) { const a = T.reveal + .2 + i * .1, p = k01(t, a, a + 1.4); if (p > 0 && p < 1) { x.save(); x.globalAlpha = 1 - p; heart(W / 2 + (i - 4) * 90, 700 - 420 * outQ(p) - (i % 2) * 60, 40, [PINK, LAV, '#fff'][i % 3], '#fff'); x.restore(); } }
      meter(t, 100);
      cap(t, T.reveal + .3, [['MAX ', '#fff6a8'], ['cuteness', '#fff']], 470, 100);   // above the polaroid, which now starts lower
    } else if (t < T.cta) {
      /* SIZES */
      background(t, 0);
      cap(t, T.sizes, [['every stage gets']], 440, 88);
      cap(t, T.sizes + .2, [['its own ', '#fff'], ['size', '#fff6a8']], 550, 100);
      cap(t, T.sizes + 2.3, [['it grows up with you ♡', '#fff']], 665, 54, { stroke: 14 });
      const cells = [['baby', 'Bulb', 'S', undefined], ['child', 'Bud', 'M', undefined], ['adult', 'Blossom', 'L', 'daisy'], ['senior', 'Elder', 'XL', 'daisy']];
      cells.forEach(([stage, name, tag, variant], i) => {
        const at = T.sizes + i * BEAT, a = back(k01(t, at, at + .35));
        if (t < at) return;
        const col = i % 2, row = (i / 2) | 0, cx = 300 + col * 480, cy = 960 + row * 395;
        const h = hop(t - at + .0, 22);
        poof(cx, cy - 40, t - at, .8);
        x.save(); x.translate(cx, cy); x.scale(a, a);
        x.fillStyle = 'rgba(255,255,255,.7)'; rr(-215, -185, 430, 370, 40); x.fill(); x.strokeStyle = [PINK, LAV, MINT, '#ffd56a'][i]; x.lineWidth = 8; rr(-215, -185, 430, 370, 40); x.stroke();
        shadow(0, 92, 100);
        bubby(stage, { race: 'leafling', variant, mood: 'happy', outfit: { head: 'crown', face: 'hearts', neck: 'bowtie', body: 'sweater' } }, 0, 98 + h.dy, 5.8, { squash: h.squash });
        x.font = '600 48px Fredoka'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = INK; x.fillText(name, 0, 140);
        x.fillStyle = [PINK, LAV, MINT, '#ffd56a'][i]; rr(150, -178, 84, 58, 29); x.fill(); x.fillStyle = '#fff'; x.font = '600 36px Fredoka'; x.fillText(tag, 192, -148);
        x.restore();
      });
    } else {
      /* OUTRO */
      background(t, 1);
      const k = outQ(k01(t, T.cta, T.cta + .5)), lk = back(k01(t, T.cta, T.cta + .35));
      x.save(); x.translate(W / 2, 360); x.scale(lk, lk); logo(0, 0, 200); x.restore();
      if (t > T.cta + .2) { x.font = '700 46px Nunito'; x.textAlign = 'center'; x.fillStyle = '#7a5a95'; x.fillText('a tiny pixel pet to dress up', W / 2, 500); x.textAlign = 'left'; }
      const pw = 470 * 1.18, ph = 600 * 1.18;
      x.save(); x.shadowColor = 'rgba(120,60,150,.3)'; x.shadowBlur = 50; x.shadowOffsetY = 20;
      x.translate(0, (1 - k) * 1300); rr((W - pw) / 2, 590, pw, ph, 36); x.clip(); x.imageSmoothingEnabled = true; x.drawImage(POD, (W - pw) / 2, 590, pw, ph); x.restore();
      for (let i = 0; i < 6; i++) { const p = k01(t, T.cta + .6 + i * .12, T.cta + 1.8 + i * .12); if (p > 0 && p < 1) { x.save(); x.globalAlpha = 1 - p; heart((i % 2 ? 150 : 930) + Math.sin(t * 3 + i) * 20, 1250 - 500 * outQ(p) + i * 14, 40, [PINK, LAV, '#fff'][i % 3], '#fff'); x.restore(); } }
      if (t > T.cta + .6) {
        const q = back(k01(t, T.cta + .6, T.cta + .9));
        x.save(); x.translate(W / 2, 1400); x.scale(q, q); x.fillStyle = INK; rr(-330, -52, 660, 104, 52); x.fill();
        x.font = '600 50px Fredoka'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff'; x.fillText('free · Chrome + Android', 0, 3); x.restore();
      }
      cap(t, T.cta + 1.1, [['which outfit ', INK], ['next?', DPINK]], 1540, 74, { stroke: 0 });
    }
    if (t >= T.bow) watermark();
    return C.toDataURL('image/jpeg', .95);
  };
}, { T, BEAT, podShot });

const frames = Math.round(T.end * FPS);
const silent = join(out, 'video-silent.mp4');
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'medium', '-r', String(FPS), silent], { stdio: ['pipe', 'inherit', 'inherit'] });
for (let f = 0; f < frames; f++) {
  const url = await page.evaluate(t => window.render(t), f / FPS);
  const buf = Buffer.from(url.split(',')[1], 'base64');
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f === Math.round(13.4 * FPS)) await writeFile(join(out, 'cover.jpg'), buf);   // the polaroid reveal
  if (f % 90 === 0) process.stdout.write(`  ${f}/${frames}\r`);
}
ff.stdin.end();
await new Promise((res, rej) => ff.on('close', c => c ? rej(new Error('ffmpeg ' + c)) : res()));
await close();
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

const mux = (audio, file) => new Promise((res, rej) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-i', join(out, audio),
  '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '44100', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', join(out, file)], { stdio: 'inherit' })
  .on('close', c => c ? rej(new Error('mux ' + c)) : res()));
await mux('audio-full.wav', 'bubby-kawaii-tiktok.mp4');
await mux('audio-sfx.wav', 'bubby-kawaii-tiktok-sfx-only.mp4');
console.log(`\ndist/kawaii/bubby-kawaii-tiktok.mp4 · bubby-kawaii-tiktok-sfx-only.mp4 · cover.jpg (${frames} frames, ${T.end}s)`);
