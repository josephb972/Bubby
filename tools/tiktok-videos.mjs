// TikTok videos from the real extension: the actual toy pod popup, played and recorded in Chromium.
// Usage: node tools/tiktok-videos.mjs [intro|funny]   (needs Playwright with Chromium, and ffmpeg)
//   → marketing/tiktok/out/bubby-tiktok-1-intro.mp4, bubby-tiktok-2-funny.mp4 (+ a cover .jpg each)
// The extension folder is not changed: a temporary copy gets a recording hook (marketing/tiktok/tap.js)
// and the stage page (marketing/tiktok/stage.*). Sound = Bubby's own beeps (recorded) + synthesized music and effects.
import { createRequire } from 'node:module';
import { cp, mkdir, mkdtemp, readFile, writeFile, rm, appendFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const { chromium } = createRequire(import.meta.url)('playwright');
const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(repo, 'marketing', 'tiktok'), out = join(src, 'out');
const VIDEOS = { intro: 'bubby-tiktok-1-intro', funny: 'bubby-tiktok-2-funny' };
const want = process.argv[2] ? [process.argv[2]] : Object.keys(VIDEOS);
await mkdir(out, { recursive: true });

// 1. Temporary copy of the extension with the recording hook
const work = await mkdtemp(join(tmpdir(), 'bubby-tiktok-'));
const ext = join(work, 'ext');
await cp(join(repo, 'extension'), ext, { recursive: true });
await mkdir(join(ext, 'promo'));
for (const f of ['stage.html', 'stage.js', 'tap.js']) await cp(join(src, f), join(ext, 'promo', f));
const html = join(ext, 'popup', 'popup.html');
await writeFile(html, (await readFile(html, 'utf8')).replace('<script type="module"', '<script src="../promo/tap.js"></script>\n<script type="module"'));
await appendFile(join(ext, 'popup', 'popup.js'),
  '\nwindow.__bubby = { get S() { return S; }, get G() { return G; }, get A() { return A; } };\n');

// Early afternoon in the capture's time zone, so Bubby is awake (bedtime 22:00).
let off = (14 - new Date().getUTCHours() + 24) % 24; if (off > 14) off -= 24;
const TZ = off >= 0 ? `Etc/GMT-${off}` : `Etc/GMT+${-off}`;

const W = 1080, Hh = 1920, FPS = 30;
const ctx = await chromium.launchPersistentContext('', {
  channel: 'chromium', headless: true, viewport: { width: W, height: Hh }, deviceScaleFactor: 1, env: { ...process.env, TZ },
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, '--autoplay-policy=no-user-gesture-required'],
});
let [sw] = ctx.serviceWorkers();
if (!sw) sw = await ctx.waitForEvent('serviceworker');
const base = `chrome-extension://${new URL(sw.url()).host}/`;
await sw.evaluate(async () => { for (let i = 0; i < 50 && !(await chrome.storage.local.get('bubby')).bubby; i++) await new Promise(r => setTimeout(r, 100)); });
for (const p of ctx.pages()) if (p.url().includes('welcome')) await p.close();

for (const v of want) {
  const name = VIDEOS[v];
  const page = await ctx.newPage();
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto(`${base}promo/stage.html?v=${v}`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 30000 });
  await page.waitForTimeout(600);

  // 2. Record with the DevTools screencast (full-quality JPEG frames with timestamps)
  const fdir = join(work, v); await mkdir(fdir);
  const frames = [];
  const cdp = await ctx.newCDPSession(page);
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const t = metadata.timestamp ? metadata.timestamp * 1000 : Date.now();
    const file = join(fdir, `f${String(frames.length).padStart(5, '0')}.jpg`);
    frames.push({ t, file });
    writeFile(file, Buffer.from(data, 'base64'));
    try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch (e) {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: Hh, everyNthFrame: 1 });
  await page.waitForTimeout(500);
  await page.evaluate(() => { window.__go(); });
  await page.waitForFunction(() => window.__done, null, { timeout: 120000, polling: 100 });
  await page.waitForTimeout(150);
  await cdp.send('Page.stopScreencast');
  await new Promise(r => setTimeout(r, 400));
  const { t0, end, cues, err } = await page.evaluate(() => ({ t0: window.__t0, end: window.__end, cues: window.__cues, err: window.__err }));
  if (err) throw new Error(err);
  await page.close();
  const len = (end - t0) / 1000;
  const fps = frames.filter(f => f.t >= t0 && f.t <= end).length / len;
  console.log(`${v}: ${len.toFixed(1)} s, ${frames.length} frames (${fps.toFixed(1)} fps captured), ${cues.length} sound cues`);

  // 3. Frames → constant 30 fps (each output frame shows the latest captured frame)
  const list = [];
  let i = 0;
  for (let n = 0; n < Math.round(len * FPS); n++) {
    const t = t0 + n * 1000 / FPS;
    while (i + 1 < frames.length && frames[i + 1].t <= t) i++;
    list.push(frames[i].file);
  }
  const lst = join(work, v + '.txt');
  await writeFile(lst, list.map(f => `file '${f}'\nduration ${1 / FPS}`).join('\n') + '\n');

  // 4. Sound
  const wav = join(work, v + '.wav');
  await writeFile(wav, mixAudio(v, cues.map(c => ({ ...c, t: (c.t - t0) / 1000 })), len));

  // 5. Encode
  const mp4 = join(out, name + '.mp4');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-i', wav,
    '-vf', `fps=${FPS},format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'high',
    '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-ar', '44100',
    '-shortest', '-movflags', '+faststart', mp4]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', v === 'intro' ? '0.6' : '0.5', '-i', mp4, '-frames:v', '1', '-q:v', '2', join(out, name + '-cover.jpg')]);
  console.log('marketing/tiktok/out/' + name + '.mp4');
}
await ctx.close();
await rm(work, { recursive: true, force: true });

/* ================= Audio: Bubby's beeps + original chiptune bed + effects ================= */
function mixAudio(v, cues, len) {
  const SR = 44100, N = Math.ceil((len + .5) * SR);
  const music = new Float32Array(N), fx = new Float32Array(N), duck = new Float32Array(N).fill(1);
  const at = t => Math.max(0, Math.round(t * SR));
  const midi = m => 440 * 2 ** ((m - 69) / 12);
  let seed = 7; const noise = () => { seed = (seed * 16807) % 2147483647; return seed / 1073741823.5 - 1; };
  const sq = (ph, duty = .5) => (ph % 1) < duty ? 1 : -1;
  const tri = ph => 1 - 4 * Math.abs((ph % 1) - .5);
  function add(buf, t0, dur, fn) { // fn(t) → sample
    const s0 = at(t0), n = Math.round(dur * SR);
    for (let k = 0; k < n && s0 + k < buf.length; k++) buf[s0 + k] += fn(k / SR);
  }
  function tone(buf, t0, dur, f, vol, wave = 'sq', { att = .004, dec = 0, f2 = f, duty = .5 } = {}) {
    let ph = 0;
    add(buf, t0, dur, t => {
      const fr = f + (f2 - f) * (t / dur); ph += fr / SR;
      const env = Math.min(1, t / att) * (dec ? Math.exp(-t / dec) : Math.min(1, (dur - t) / .01));
      const w = wave === 'sq' ? sq(ph, duty) : wave === 'tri' ? tri(ph) : Math.sin(2 * Math.PI * ph);
      return w * env * vol;
    });
  }

  // Music bed (original): I–V–vi–IV arpeggios, bass, light drums
  const M = v === 'funny' ? { bpm: 136, key: 5 } : { bpm: 122, key: 0 };
  const mStart = (cues.find(c => c.k === 'music') || { t: 0 }).t;
  const beat = 60 / M.bpm, s16 = beat / 4;
  const chords = [[0, 4, 7, 12], [-1, 2, 7, 11], [-3, 0, 4, 9], [-3, 0, 5, 9]], roots = [0, 7, 9, 5];
  for (let bar = 0; mStart + bar * 4 * beat < len; bar++) {
    const ch = chords[bar % 4], root = roots[bar % 4], tb = mStart + bar * 4 * beat;
    for (let s = 0; s < 16; s++) {
      const t = tb + s * s16; if (t > len) break;
      const n = ch[[0, 1, 2, 3, 2, 1, 2, 3][s % 8]] + 72 + M.key;
      tone(music, t, s16 * .9, midi(n), .045, 'sq', { dec: .07, duty: .25 });
      if (s % 2 === 0) tone(music, t, s16 * 1.7, midi(36 + M.key + root + (v === 'funny' ? (s % 4 ? 12 : 0) : (s % 8 === 6 ? 12 : 0))), .17, 'tri', { dec: .25 });
      if (s % 8 === 0 || s === 10) add(music, t, .2, x => Math.sin(2 * Math.PI * (45 * x + 60 * (1 - Math.exp(-x * 25)) / 25 * 1)) * Math.exp(-x * 14) * .55);
      if (s % 8 === 4) add(music, t, .14, x => noise() * Math.exp(-x * 30) * .2);
      if (s % 2 === 1) add(music, t, .03, x => noise() * Math.exp(-x * 120) * .07);
    }
  }
  // Melody hook every second phrase (original)
  const mel = [[0, 7], [2, 9], [4, 7], [6, 4], [8, 5], [10, 4], [12, 2], [14, 0]];
  for (let ph = 1; mStart + ph * 16 * beat < len; ph += 2) {
    for (const [st, n] of mel) {
      const t = mStart + ph * 16 * beat + st * beat / 2 + (st >= 8 ? 4 * beat : 0);
      if (t < len) tone(music, t, beat * .45, midi(84 + M.key + n), .03, 'tri', { dec: .2 });
    }
  }

  for (const c of cues) {
    const t = c.t; if (t < -.05 || t > len) continue;
    switch (c.k) {
      case 'beep': tone(fx, Math.max(0, t), c.d + .01, c.f, Math.min(.3, c.v * 5), 'sq', { dec: c.d / 2.5 }); break;
      case 'pop': tone(fx, t, .09, 420, .35, 'sine', { f2: 1150, dec: .05 }); break;
      case 'pop2': tone(fx, t, .07, 720, .22, 'sine', { f2: 1500, dec: .035 }); break;
      case 'tap': add(fx, t, .02, x => noise() * Math.exp(-x * 400) * .25); tone(fx, t, .04, 1900, .08, 'sine', { dec: .01 }); break;
      case 'whoosh': { let lp = 0; add(fx, t, .5, x => { const k = .02 + .25 * Math.sin(Math.PI * x / .5); lp += k * (noise() - lp); return lp * Math.sin(Math.PI * x / .5) * .9; }); break; }
      case 'sparkle': [1568, 2093, 2637, 3136, 4186].forEach((f, j) => tone(fx, t + j * .055, .25, f, .09, 'tri', { dec: .08 })); break;
      case 'ding': tone(fx, t, 1.4, 1318.5, .22, 'sine', { dec: .45 }); tone(fx, t, 1.4, 1975.5, .12, 'sine', { dec: .3 }); tone(fx, t + .12, 1.2, 2637, .08, 'sine', { dec: .3 }); break;
      case 'boom': {
        add(fx, t, 1.3, x => { const ph = 2 * Math.PI * (42 * x + 70 * (1 - Math.exp(-x * 6)) / 6); return Math.tanh(Math.sin(ph) * 2.2) * Math.exp(-x * 2.6) * .8; });
        add(fx, t, .02, x => noise() * Math.exp(-x * 300) * .5);
        for (let k = at(t); k < Math.min(N, at(t + .9)); k++) duck[k] = Math.min(duck[k], .35 + .65 * ((k - at(t)) / (.9 * SR)) ** 2);
        break;
      }
      case 'sad': { // wah, wah, wah, waaah (original)
        const notes = [[0, 392, .34], [.38, 370, .34], [.76, 349, .34], [1.14, 330, 1.05]];
        for (const [o, f, d] of notes) {
          let ph = 0, lp = 0;
          add(fx, t + o, d, x => {
            const vib = o > 1 ? 1 + .018 * Math.sin(2 * Math.PI * 6 * x) * Math.min(1, x / .3) : 1;
            ph += f * vib * (1 - .03 * x / d) / SR;
            const saw = 2 * (ph % 1) - 1; lp += .18 * (saw - lp);
            const env = Math.min(1, x / .03) * Math.min(1, (d - x) / .08) * (0.6 + .4 * Math.min(1, x / .12));
            return lp * env * .55;
          });
        }
        for (let k = at(t); k < Math.min(N, at(t + 2.3)); k++) duck[k] = Math.min(duck[k], .15);
        break;
      }
      case 'rewind': {
        let ph = 0;
        add(fx, t, .9, x => { const f = 900 - 650 * (x / .9) + 220 * Math.sin(2 * Math.PI * 14 * x); ph += f / SR; return (sq(ph) * .13 + noise() * .06) * Math.min(1, (.9 - x) / .1); });
        break;
      }
    }
  }
  // Mix: music under effects, fade in/out
  const out = new Int16Array(N);
  for (let k = 0; k < N; k++) {
    const t = k / SR;
    const fade = Math.min(1, Math.max(0, (t - mStart) / .08)) * Math.min(1, Math.max(0, (len - t) / .6));
    const s = Math.tanh((music[k] * .7 * duck[k] * fade + fx[k]) * 1.1);
    out[k] = Math.round(s * 30000);
  }
  const head = Buffer.alloc(44);
  head.write('RIFF', 0); head.writeUInt32LE(36 + N * 2, 4); head.write('WAVEfmt ', 8); head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20); head.writeUInt16LE(1, 22); head.writeUInt32LE(SR, 24); head.writeUInt32LE(SR * 2, 28);
  head.writeUInt16LE(2, 32); head.writeUInt16LE(16, 34); head.write('data', 36); head.writeUInt32LE(N * 2, 40);
  return Buffer.concat([head, Buffer.from(out.buffer)]);
}
