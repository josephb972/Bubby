// A 9:16 short (1080×1920, 30 fps, ~30 s): Bubby's whole life sped up, with captions and chiptune sound.
// Usage: node tools/tiktok-video.mjs   (needs Playwright with Chromium, and ffmpeg) → dist/bubby-tiktok.mp4
// The story and captions live in tools/video/tiktok.js; it draws with the extension's own sprites and scene.
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const ext = join(repo, 'extension'), out = join(repo, 'dist');
await mkdir(out, { recursive: true });
const video = join(out, 'bubby-tiktok-silent.mp4'), audio = join(out, 'bubby-tiktok.wav'), final = join(out, 'bubby-tiktok.mp4');

const run = (cmd, args, input) => new Promise((ok, fail) => {
  const p = spawn(cmd, args, { stdio: [input ? 'pipe' : 'ignore', 'ignore', 'inherit'] });
  p.on('exit', c => c ? fail(new Error(`${cmd} exited ${c}`)) : ok());
  if (input) input(p.stdin);
});

/* ---------- Frames ---------- */
const TYPES = { '.js': 'text/javascript', '.woff2': 'font/woff2', '.html': 'text/html', '.png': 'image/png', '.webp': 'image/webp' };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.route('http://bubby.video/**', async r => {
  const path = new URL(r.request().url()).pathname;
  if (path === '/') return r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset="utf-8"><style>
    @font-face{font-family:Fredoka;font-weight:600;src:url(/fonts/fredoka-latin-600-normal.woff2)}
    @font-face{font-family:"Pixelify Sans";font-weight:600;src:url(/fonts/pixelify-sans-latin-600-normal.woff2)}
    body{margin:0}</style><canvas id="v" width="1080" height="1920"></canvas><script type="module" src="/video/tiktok.js"></script>` });
  const file = path.startsWith('/video/') ? join(repo, 'tools', path) : join(ext, path);
  try { r.fulfill({ contentType: TYPES[extname(file)] || 'application/octet-stream', body: await readFile(file) }); }
  catch { r.fulfill({ status: 404, body: '' }); }
});
page.on('pageerror', e => { console.error(e); process.exit(1); });
await page.goto('http://bubby.video/');
await page.waitForFunction(() => window.ready);
await page.evaluate(() => window.ready);
const { FPS, DURATION } = await page.evaluate(() => ({ FPS: window.FPS, DURATION: window.DURATION }));
const frames = FPS * DURATION;
await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'slow', '-tune', 'animation', '-r', String(FPS), video], async stdin => {
  for (let i = 0; i < frames; i++) {
    const url = await page.evaluate(n => window.frame(n), i);
    const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    if (!stdin.write(buf)) await new Promise(r => stdin.once('drain', r));
    if (i % 90 === 0) process.stdout.write(`\rframes ${i}/${frames}`);
  }
  stdin.end();
  console.log(`\rframes ${frames}/${frames}`);
});
const cues = await page.evaluate(() => window.CUES());
await browser.close();

/* ---------- Sound: the popup's square-wave beeps, plus a little chiptune loop ---------- */
const RATE = 44100, N = RATE * DURATION, mixBuf = new Float32Array(N);
function tone(t, f, d, vol = .16, { wave = 'square', slide = 0, vib = 0 } = {}) {
  const s0 = Math.floor(t * RATE), n = Math.floor((d + .02) * RATE);
  let ph = 0;
  for (let i = 0; i < n && s0 + i < N; i++) {
    const tt = i / RATE, fr = (f + slide * tt / d) * (1 + vib * Math.sin(tt * 2 * Math.PI * 28));
    ph += fr / RATE;
    const x = ph % 1, v = wave === 'square' ? (x < .5 ? 1 : -1) : wave === 'tri' ? 4 * Math.abs(x - .5) - 1 : Math.random() * 2 - 1;
    const env = Math.min(1, tt / .004) * Math.exp(-tt / d * 3.2);
    if (s0 + i >= 0) mixBuf[s0 + i] += v * vol * env;
  }
}
const SFX = {
  up: t => [523, 659, 784].forEach((f, i) => tone(t + i * .12, f, i === 2 ? .2 : .1)),
  poop: t => { tone(t, 150, .32, .2, { slide: -70, vib: .25 }); tone(t + .02, 0, .2, .04, { wave: 'noise' }); },
  clean: t => { tone(t, 520, .08); tone(t + .09, 440, .1); tone(t, 0, .9, .05, { wave: 'noise' }); },
  call: t => { tone(t, 1046, .07); tone(t + .13, 1046, .07); tone(t + .26, 1318, .1); tone(t + .6, 1046, .07); tone(t + .73, 1046, .07); tone(t + .86, 1318, .1); },
  scold: t => { tone(t, 880, .04); tone(t + .06, 220, .28, .2); },
  eat: t => { tone(t, 660, .05); tone(t + .14, 880, .05); tone(t + .28, 660, .05); tone(t + .42, 880, .05); },
  sick: t => { tone(t, 330, .12); tone(t + .14, 260, .3); },
  med: t => { tone(t, 880, .03); tone(t + .08, 523, .12); },
  yay: t => SFX.up(t),
  off: t => tone(t, 330, .1),
  on: t => { tone(t, 660, .1); tone(t + .12, 880, .12); },
  catch: t => tone(t, 1046, .06),
  gold: t => { tone(t, 1318, .06); tone(t + .07, 1568, .1); },
  bonk: t => { tone(t, 120, .3, .24, { slide: -60 }); tone(t, 0, .12, .12, { wave: 'noise' }); },
  end: t => [784, 659, 523, 392, 523].forEach((f, i) => tone(t + i * .2, f, .22, .14)),
};
for (const c of cues) SFX[c.name](c.t);

// 150 bpm loop in C pentatonic; quieter while Bubby sleeps, fades out at the very end.
const E8 = .2, LEAD = [72, 76, 79, 76, 81, 79, 76, 74, 72, 74, 76, 79, 76, 74, 72, 0], BASS = [48, 48, 55, 55, 57, 57, 55, 52];
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const musicVol = t => (t > 16.1 && t < 18.2 ? .35 : 1) * Math.min(1, Math.max(0, (DURATION - t) / 1.5));
for (let i = 0, t = 0; t < DURATION; i++, t = i * E8) {
  const m = LEAD[i % 16]; if (m) tone(t, hz(m), .16, .045 * musicVol(t));
  if (i % 2 === 0) tone(t, hz(BASS[(i / 2) % 8]), .36, .11 * musicVol(t), { wave: 'tri' });
}
const pcm = Buffer.alloc(44 + N * 2);
pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + N * 2, 4); pcm.write('WAVEfmt ', 8); pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22); pcm.writeUInt32LE(RATE, 24); pcm.writeUInt32LE(RATE * 2, 28);
pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34); pcm.write('data', 36); pcm.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) pcm.writeInt16LE(Math.round(Math.tanh(mixBuf[i] * 1.2) * 30000), 44 + i * 2);
await writeFile(audio, pcm);

await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-i', audio, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', final]);
console.log('dist/bubby-tiktok.mp4');
