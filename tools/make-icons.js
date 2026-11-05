// Renders the extension icons from the game itself (Bubby the Radiant Blossom on the garden).
// usage: node tools/make-icons.js   (needs playwright + python3 with Pillow)
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'extension', 'icons');
fs.mkdirSync(out, { recursive: true });
const save = { v: 1, gen: 1, speed: 1, stage: 'adult', variant: 'radiant', stageT: 30, age: 360, hunger: 4, happy: 4, discipline: 100, weight: 20, poops: [], sick: false, doses: 0, sickT: 0, sickCounted: false, sickMeter: 0, neglectT: 0, starveT: 0, asleep: false, lights: true, awakeT: 5, sleepT: 0, call: null, mistakes: 0, snacks: [], chubby: false, ended: null, paused: false, nextPoop: 500, nextTantrum: 900, soundOn: false, stats: {} };
(async () => {
  const br = await chromium.launch();
  const page = await (await br.newContext({ viewport: { width: 500, height: 900 }, deviceScaleFactor: 4 })).newPage();
  await page.addInitScript(`let vt=1000,q=[];performance.now=()=>vt;window.requestAnimationFrame=c=>{q.push(c);return 1};window.__adv=ms=>{const e=vt+ms;while(vt<e){vt=Math.min(e,vt+16.7);const r=q;q=[];r.forEach(f=>f(vt))}};window.claude={hot:{snapshot:f=>{window.__snap=f},ready:c=>{window.__start=c}}};localStorage.setItem('bubby.save.v1',${JSON.stringify(JSON.stringify(save))})`);
  await page.goto('file://' + path.join(root, 'index.html')); await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => { window.__start(); const o = window.__snap(); o.PET.x = 50; o.PET.tx = 50; o.PET.wait = 99; o.A = { type: 'happy', t: .3, dur: 99 }; window.__adv(150); });
  const r = await page.evaluate(() => { const b = document.querySelector('#scene').getBoundingClientRect(), s = b.width / 100; return { x: b.left + 24 * s, y: b.top + 17 * s, w: 52 * s, h: 52 * s }; });
  await page.screenshot({ path: path.join(out, 'src.png'), clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
  await br.close();
  execFileSync('python3', ['-c', `
from PIL import Image, ImageDraw
src = Image.open(r'${path.join(out, 'src.png')}').convert('RGBA')
for n in (16, 32, 48, 128):
    S = 512; bg = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(bg)
    d.rounded_rectangle((0, 0, S - 1, S - 1), radius=S // 5, fill=(191, 230, 219, 255))
    sp = src.resize((int(S * .92), int(S * .92)), Image.NEAREST); bg.alpha_composite(sp, ((S - sp.width) // 2, (S - sp.height) // 2 + 4))
    m = Image.new('L', (S, S), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, S - 1, S - 1), radius=S // 5, fill=255); bg.putalpha(m)
    bg.resize((n, n), Image.LANCZOS).save(r'${out}/icon%d.png' % n)
`]);
  fs.unlinkSync(path.join(out, 'src.png')); console.log('icons written to', out);
})();
