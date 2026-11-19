// Records the TikTok "Bubby's diseases" scenes from the REAL extension popup (nothing redrawn).
// Usage: node tiktok/record.mjs <outDir>   → <outDir>/scene-N.webm + timeline.json   (then tiktok/build.sh)
import { createRequire } from 'node:module';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const ext = join(repo, 'extension');
const out = process.argv[2]; await mkdir(out, { recursive: true });
const W = 1080, H = 1920;

let off = (14 - new Date().getUTCHours() + 24) % 24; if (off > 14) off -= 24;   // early afternoon → Bubby is awake
const TZ = off >= 0 ? `Etc/GMT-${off}` : `Etc/GMT+${-off}`;
const ctx = await chromium.launchPersistentContext('', {
  channel: 'chromium', headless: true, viewport: { width: W, height: H }, deviceScaleFactor: 1, env: { ...process.env, TZ },
  recordVideo: { dir: join(out, 'raw'), size: { width: W, height: H } },
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
});
let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent('serviceworker');
const base = `chrome-extension://${new URL(sw.url()).host}/`;
await sw.evaluate(async () => { for (let i = 0; i < 50 && !(await chrome.storage.local.get('bubby')).bubby; i++) await new Promise(r => setTimeout(r, 100)); });

/* ---------- Video-only layer: scale the pod, add captions / stickers. The game itself is untouched. ---------- */
const CSS = `
html,body{width:${W}px!important;height:${H}px;overflow:hidden;margin:0}
body{background:radial-gradient(ellipse at 50% 30%,#a8dce6,#6fb0c0 70%)!important}
.app{position:absolute;left:0;top:0;width:${W}px;height:${H}px;padding:0}
#photoWrap{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}
#ov{position:fixed;inset:0;pointer-events:none;z-index:99999;font-family:Fredoka,Nunito,sans-serif;color:#3b2f4a}
#ov *{box-sizing:border-box}
.card{position:absolute;left:90px;top:120px;width:900px;background:#fffcf3;border:7px solid #5e978c;border-bottom-width:14px;border-radius:44px;
  padding:58px 34px 28px;text-align:center;box-shadow:0 18px 40px rgba(20,50,60,.35);transform-origin:50% 0}
.card .pill{position:absolute;left:50%;top:-34px;transform:translateX(-50%);background:#d9504a;color:#fffcf3;font:600 44px/1 Fredoka;padding:14px 38px;
  border-radius:999px;border-bottom:7px solid #a8383a;letter-spacing:2px;white-space:nowrap}
.card .nm{font:600 84px/1.05 Fredoka;display:flex;align-items:center;justify-content:center;gap:22px}
.card .nm span.e{font-size:92px}
.card .cz{font:700 40px/1.2 Nunito;color:#5d5070;margin-top:12px}
.card .sv{font:400 38px/1 'Pixelify Sans',monospace;color:#d9504a;margin-top:16px;letter-spacing:3px}
.cap{position:absolute;left:70px;right:150px;top:1600px;text-align:center;font:600 70px/1.08 Fredoka;color:#fff;
  -webkit-text-stroke:16px #3b2f4a;paint-order:stroke fill;transform-origin:50% 50%}
.cap b{color:#ffd34a;font-weight:600}
.hook{position:absolute;left:60px;right:60px;top:110px;text-align:center;font:600 108px/1.04 Fredoka;color:#fff;
  -webkit-text-stroke:20px #3b2f4a;paint-order:stroke fill}
.hook b{color:#ffd34a;font-weight:600}
.stk{position:absolute;font:600 150px/1 Fredoka;color:#fff;-webkit-text-stroke:18px #3b2f4a;paint-order:stroke fill;transform-origin:50% 50%;white-space:nowrap}
.tap{position:absolute;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;border:10px solid #fff;background:rgba(255,255,255,.35);
  box-shadow:0 0 0 4px rgba(59,47,74,.5);animation:tap .55s ease-out forwards}
@keyframes tap{0%{transform:scale(1.5);opacity:0}25%{opacity:1}100%{transform:scale(.7);opacity:0}}
@keyframes pop{0%{transform:scale(.3) rotate(-6deg);opacity:0}55%{transform:scale(1.14) rotate(2deg);opacity:1}100%{transform:scale(1) rotate(0)}}
@keyframes drop{0%{transform:translateY(-300px) scale(.9);opacity:0}60%{transform:translateY(16px);opacity:1}100%{transform:translateY(0)}}
@keyframes flash{0%{opacity:.95}100%{opacity:0}}
@keyframes wob{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}
.flash{position:absolute;inset:0;background:#fff;animation:flash .28s ease-out forwards}
.cta{position:absolute;inset:0;background:rgba(255,252,243,.94);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;
  text-align:center;padding:0 70px;animation:pop .5s cubic-bezier(.2,1.4,.4,1) both}
.cta h1{margin:0;font:600 120px/1.02 Fredoka}.cta h1 em{font-style:normal;color:#d9504a}
.cta p{margin:0;font:700 54px/1.25 Nunito;color:#5d5070}.cta .big{font:600 76px/1.1 Fredoka;color:#3b2f4a}
.cta .pix{font:400 46px/1.2 'Pixelify Sans',monospace;color:#5e978c}
`;
const JS = `
(() => {
  const st = document.createElement('style'); st.textContent = ${JSON.stringify(CSS)}; document.head.append(st);
  const root = document.createElement('div'); root.id = 'ov'; document.body.append(root);
  const wrap = () => document.getElementById('photoWrap');
  const CAMS = { wide: [2.05, 234, 300, 540, 1000], close: [3.7, 180.4, 336, 540, 950], medium: [2.9, 234, 395, 540, 1000] };
  const html = (cls, h, extra) => { const d = document.createElement('div'); d.className = cls; d.innerHTML = h; if (extra) Object.assign(d.style, extra); root.append(d); return d; };
  window.ov = {
    cam(name, ms) { const [s, fx, fy, vx, vy] = CAMS[name], w = wrap();
      w.style.transition = ms ? 'transform ' + ms + 'ms cubic-bezier(.45,0,.15,1)' : 'none';
      w.style.transform = 'translate(' + (vx - fx * s) + 'px,' + (vy - fy * s) + 'px) scale(' + s + ')'; },
    flash() { const f = html('flash', ''); setTimeout(() => f.remove(), 400); },
    hook(h) { this.clear('hook'); html('hook', h).style.animation = 'drop .5s cubic-bezier(.2,1.3,.4,1) both'; },
    card(n, emoji, name, cause, sev) { this.clear('card'); const c = html('card', '<div class="pill">DISEASE #' + n + '</div><div class="nm"><span class="e">' + emoji + '</span><span>' + name + '</span></div><div class="cz">' + cause + '</div><div class="sv">SEVERITY ' + '\\u25A0'.repeat(sev) + '\\u25A1'.repeat(5 - sev) + '</div>');
      c.style.animation = 'drop .55s cubic-bezier(.2,1.3,.4,1) both'; },
    cap(h) { this.clear('cap'); const c = html('cap', h); c.style.animation = 'pop .38s cubic-bezier(.2,1.4,.4,1) both'; },
    sticker(t, x, y, rot) { const s = html('stk', t, { left: x + 'px', top: y + 'px' }); s.style.setProperty('--r', (rot || 0) + 'deg');
      s.style.animation = 'pop .35s cubic-bezier(.2,1.5,.4,1) both'; s.style.transform = 'rotate(' + (rot || 0) + 'deg)'; return s; },
    tap(x, y) { const t = html('tap', '', { left: x + 'px', top: y + 'px' }); setTimeout(() => t.remove(), 700); },
    clear(cls) { root.querySelectorAll(cls ? '.' + cls : ':scope > *').forEach(e => e.remove()); },
    cta(h) { html('cta', h); },
  };
  window.ov.cam('wide', 0);
})();
`;

/* ---------- Scene runner ---------- */
const timeline = [];
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
async function setState(state, look = 'toy') {
  await sw.evaluate(async ({ state, look }) => {
    const S = (await chrome.storage.local.get('bubby')).bubby, now = Date.now();
    Object.assign(S, { stage: 'child', weight: 12, age: 2 * 86400, stageT: 3600, hunger: 4, happy: 4, poops: [], sick: false, doses: 0, sickT: 0, sickMeter: 0, neglectT: 0, starveT: 0,
      call: null, asleep: false, lights: true, paused: false, ended: null, mistakes: 0, discipline: 0, awakeT: 3600, snacks: [], variant: null, chubby: false, nextPoop: 9999 }, state);
    Object.assign(S.cfg, { look, bed: 22 * 60, wake: 8 * 60, notify: false });
    S.lastT = now; S.lastSeenAt = now; S.seenSeq = S.evSeq; S.notifiedSeq = S.evSeq;
    await chrome.storage.local.set({ bubby: S });
  }, { state, look });
}

async function scene(name, state, dur, fn) {
  if (ONLY && !ONLY.includes(name)) return;
  await setState(state);
  const t0 = Date.now();
  const p = await ctx.newPage();
  await p.goto(base + 'popup/popup.html');
  await p.waitForSelector('#app'); await p.evaluate(() => document.fonts.ready);
  await p.evaluate(JS);
  await p.waitForTimeout(450);
  const ready = (Date.now() - t0) / 1000, tS = Date.now();
  const T = () => (Date.now() - tS) / 1000;
  const sfx = [];
  const api = {
    p, T, sfx: (n) => sfx.push({ t: +T().toFixed(2), n }),
    at: async (t) => { const w = t * 1000 - (Date.now() - tS); if (w > 0) await p.waitForTimeout(w); },
    o: (f, ...a) => p.evaluate(([f, a]) => window.ov[f](...a), [f, a]),
    tap: async (sel) => { const b = await p.locator(sel).boundingBox(); await api.o('tap', b.x + b.width / 2, b.y + b.height / 2); await p.waitForTimeout(120); await p.locator(sel).click(); },
  };
  api.o('flash');
  try { await fn(api); } catch (e) { await p.screenshot({ path: join(out, `fail-${name}.png`) }); throw e; }
  await api.at(dur);
  const vid = p.video(); await p.close();
  const file = `scene-${timeline.length}-${name}.webm`; await vid.saveAs(join(out, file));
  timeline.push({ name, file, ss: +ready.toFixed(2), dur, sfx });
  console.log('recorded', file, 'ss', ready.toFixed(2));
}

/* ---------- The script ---------- */
// 0 · hook
await scene('hook', {}, 3.8, async ({ o, at, sfx }) => {
  sfx('whoosh');
  await o('hook', 'Rating my <b>pixel pet’s</b> DISEASES \u{1FA7A}'); sfx('pop');
  await at(1.4); await o('cap', 'and <b>every single one</b><br>is my fault'); sfx('pop');
  await at(2.6); await o('cam', 'close', 1100); sfx('whoosh');
});

// 1 · poop-itis
await scene('poop', { stage: 'child', hunger: 3, happy: 2, sick: true, doses: 2, poops: [{ t: 9999 }, { t: 9999 }, { t: 9999 }, { t: 9999 }], mistakes: 2 }, 6.2, async ({ o, at, sfx, tap }) => {
  await o('cam', 'wide', 0); sfx('whoosh');
  await o('card', 1, '\u{1F4A9}', 'Poop-itis', 'Cause: you “forgot” to clean', 2); sfx('ding');
  await at(1.3); await o('cam', 'close', 900); sfx('whoosh');
  await at(1.7); await o('cap', 'Symptoms: <b>green face</b><br>+ a tiny skull'); sfx('pop');
  await at(3.6); await o('clear', 'cap'); await tap('.tile[data-act="clean"]'); sfx('splash');
  await at(4.6); await o('cap', 'Still sick tho.<br><b>Cleaning ≠ cure</b> \u{1F480}'); sfx('sad');
});

// 2 · sugar tooth-ache (real snack presses; the 3rd one is rigged to trigger so the video is deterministic)
await scene('sweets', { stage: 'child', hunger: 2, happy: 2 }, 9.8, async ({ o, at, sfx, tap, p }) => {
  await p.evaluate(() => { Math.random = () => 0.1; });
  await o('cam', 'wide', 0); sfx('whoosh');
  await o('card', 2, '\u{1F36C}', 'Sugar Tooth-ache', 'Cause: “just one more snack”', 3); sfx('ding');
  await at(1.2); await o('cam', 'close', 900); sfx('whoosh');
  const rounds = [[2.2, '\u{1F36C}×1', 640, 1230, -8], [4.3, '\u{1F36C}×2', 640, 1230, 6], [6.4, '\u{1F36C}×3!!', 600, 1230, -5]];
  for (const [t, txt, x, y, r] of rounds) {
    await at(t); await tap('.tile[data-act="feed"]'); sfx('tap');
    await at(t + .5); await tap('[data-do="snack"]'); sfx('munch');
    await at(t + .8); await o('sticker', txt, x - 150, y, r); sfx('pop');
  }
  await at(7.7); await o('clear', 'stk'); sfx('sad');
  await o('cap', 'Bubby: <b>“my TEETH??”</b> \u{1F62D}'); sfx('pop');
});

// 3 · neglect-itis
await scene('neglect', { stage: 'child', hunger: 0, happy: 0, sick: true, doses: 2, call: { reason: 'hungry', t: 0, counted: false }, mistakes: 7, discipline: 0 }, 5.4, async ({ o, at, sfx, tap }) => {
  await o('cam', 'wide', 0); sfx('whoosh');
  await o('card', 3, '\u{1F636}', 'Neglect-itis', 'Cause: “I’ll feed it after this episode”', 4); sfx('ding');
  await at(1.2); await o('cam', 'close', 900); sfx('whoosh');
  await at(2.0); await tap('.tile[data-act="status"]'); sfx('tap');
  await at(2.6); await o('cap', 'Hearts: <b>0</b>. Mistakes: <b>7</b>.<br>Guilt: ∞'); sfx('pop');
});

// 4 · chonk-itis
await scene('chonk', { stage: 'adult', variant: 'thistle', chubby: true, weight: 58, age: 5 * 86400, stageT: 3600, hunger: 4, happy: 4, mistakes: 3 }, 5.2, async ({ o, at, sfx, tap }) => {
  await o('cam', 'wide', 0); sfx('whoosh');
  await o('card', 4, '\u{1F354}', 'Chonk-itis', 'Cause: meals + snacks + “it looked hungry”', 1); sfx('ding');
  await at(1.2); await o('cam', 'close', 900); sfx('whoosh');
  await at(1.9); await o('cap', 'Symptoms: <b>round</b>.<br>very round.'); sfx('pop');
  await at(3.1); await tap('.tile[data-act="status"]'); sfx('tap');
  await at(3.6); await o('cap', 'Weight: 58g <b>(heavy)</b><br>Doctor says: still cute'); sfx('boing');
});

// 5 · terrible twos
await scene('tantrum', { stage: 'baby', weight: 6, age: 5 * 3600, hunger: 3, happy: 3, nextTantrum: 0.3 }, 6.0, async ({ o, at, sfx, tap }) => {
  await o('cam', 'wide', 0); sfx('whoosh');
  await o('card', 5, '\u{1F621}', 'Terrible Twos', 'Cause: being a baby', 3); sfx('ding');
  await at(1.2); await o('cam', 'close', 900); sfx('whoosh');
  await at(1.9); await o('cap', 'Cure: <b>yell at it</b>.<br>The game has a button for this.'); sfx('pop');
  await at(4.0); await tap('.tile[data-act="scold"]'); sfx('scold');
  await at(4.6); await o('cap', 'Parenting in <b>8 pixels</b> \u{1F62D}'); sfx('pop');
});

// 6 · the cure: 3 doses
await scene('cure', { stage: 'adult', variant: 'daisy', weight: 24, age: 5 * 86400, stageT: 3600, hunger: 3, happy: 3, sick: true, doses: 3 }, 6.4, async ({ o, at, sfx, tap }) => {
  await o('cam', 'wide', 0); sfx('whoosh');
  await o('card', 6, '\u{1F48A}', 'The Cure', 'Medicine. 3 doses. No refunds.', 1); sfx('ding');
  await at(1.2); await o('cam', 'close', 900); sfx('whoosh');
  for (const [t, c] of [[2.0, 'Dose 1: <b>“gulp”</b>'], [3.2, 'Dose 2: <b>“gulp”</b>'], [4.4, 'Dose 3: <b>ALL BETTER!</b> ✨']]) {
    await at(t); await tap('.tile[data-act="med"]'); sfx('gulp'); await o('cap', c);
  }
  await at(4.5); sfx('win');
});

// 7 · final boss + call to action
await scene('leaves', { stage: 'child', ended: { kind: 'away', age: 3 * 86400, stage: 'child', name: 'Bud', mistakes: 9, gen: 1, day: 3 }, mistakes: 9 }, 9.0, async ({ o, at, sfx }) => {
  await o('cam', 'wide', 0); sfx('whoosh');
  await o('card', 7, '\u{1F9F3}', 'Moving-Out-itis', 'Cause: all of the above', 5); sfx('ding');
  await at(1.2); await o('cam', 'close', 900); sfx('whoosh');
  await at(1.9); await o('cap', 'Ignore it long enough<br>and Bubby <b>moves out</b>'); sfx('sad');
  await at(4.4); await o('flash'); await o('clear'); sfx('whoosh');
  await o('cam', 'wide', 0);
  await o('cta', '<h1>Which one does<br><em>YOUR</em> Bubby have?</h1><div class="big">Comment the number \u{1F447}</div><p>Bubby · a tiny pixel pet<br>for your toolbar</p><div class="pix">Chrome · Edge · Brave</div>'); sfx('ding');
});

await writeFile(join(out, 'timeline.json'), JSON.stringify(timeline, null, 1));
await ctx.close();
