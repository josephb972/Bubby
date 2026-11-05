// Makes the Chrome Web Store / Edge Add-ons images from the real extension.
// Usage: node tools/store-assets.mjs   (needs Playwright with Chromium) → store/*.png
//   screenshot-1..5.png  1280×800   store screenshots
//   promo-small.png      440×280    small promo tile
//   promo-marquee.png    1400×560   marquee promo tile (optional in the store)
import { createRequire } from 'node:module';
import { mkdtemp, rm, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const ext = join(repo, 'extension');
const out = join(repo, 'store');
await mkdir(out, { recursive: true });

const b64 = async p => (await readFile(join(ext, p))).toString('base64');
const fonts = `
@font-face { font-family: "Fredoka"; font-weight: 600; src: url(data:font/woff2;base64,${await b64('fonts/fredoka-latin-600-normal.woff2')}) format("woff2"); }
@font-face { font-family: "Nunito"; font-weight: 400; src: url(data:font/woff2;base64,${await b64('fonts/nunito-latin-400-normal.woff2')}) format("woff2"); }
@font-face { font-family: "Nunito"; font-weight: 700; src: url(data:font/woff2;base64,${await b64('fonts/nunito-latin-700-normal.woff2')}) format("woff2"); }
@font-face { font-family: "Pixelify Sans"; font-weight: 400; src: url(data:font/woff2;base64,${await b64('fonts/pixelify-sans-latin-400-normal.woff2')}) format("woff2"); }`;
const icon128 = `data:image/png;base64,${await b64('icons/icon-128.png')}`;

/* ---------- 1. Capture the real popup at 2× ---------- */
const profile = await mkdtemp(join(tmpdir(), 'bubby-assets-'));
// Run the browser in a time zone where it is early afternoon, so Bubby is awake with its normal 22:00 bedtime.
let off = (14 - new Date().getUTCHours() + 24) % 24; if (off > 14) off -= 24;
const TZ = off >= 0 ? `Etc/GMT-${off}` : `Etc/GMT+${-off}`;
const ctx = await chromium.launchPersistentContext(profile, {
  channel: 'chromium', headless: true, viewport: { width: 468, height: 600 }, deviceScaleFactor: 2, env: { ...process.env, TZ },
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
});
let [sw] = ctx.serviceWorkers();
if (!sw) sw = await ctx.waitForEvent('serviceworker');
const id = new URL(sw.url()).host;
await sw.evaluate(async () => { for (let i = 0; i < 50 && !(await chrome.storage.local.get('bubby')).bubby; i++) await new Promise(r => setTimeout(r, 100)); });
for (const p of ctx.pages()) if (p.url().includes('welcome')) await p.close();

// Put Bubby in a chosen state, awake in daytime, with nothing "while you were away" to show.
async function setState(patch) {
  await sw.evaluate(async patch => {
    const S = (await chrome.storage.local.get('bubby')).bubby;
    const now = Date.now();
    Object.assign(S, { hunger: 4, happy: 4, poops: [], sick: false, call: null, asleep: false, lights: true, paused: false, ended: null, mistakes: 0, discipline: 100 }, patch);
    S.cfg.bed = 22 * 60; S.cfg.wake = 8 * 60;
    S.lastT = now; S.lastSeenAt = now; S.seenSeq = S.evSeq; S.notifiedSeq = S.evSeq; S.awakeT = 3600;
    await chrome.storage.local.set({ bubby: S });
  }, patch);
}
async function popup(patch, prep) {
  await setState(patch);
  const p = await ctx.newPage();
  await p.setViewportSize({ width: 468, height: 600 });
  await p.goto(`chrome-extension://${id}/popup/popup.html`);
  await p.waitForSelector('#app.toy');
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(700);
  if (prep) await prep(p);
  await p.evaluate(() => document.activeElement && document.activeElement.blur()); // no keyboard focus ring in shots
  await p.waitForTimeout(100);
  const shot = await p.locator('.pdev').screenshot({ type: 'png' });
  await p.close();
  return `data:image/png;base64,${shot.toString('base64')}`;
}

const adult = { stage: 'adult', variant: 'radiant', weight: 24, age: 5 * 86400, stageT: 3600 };
const shots = {};
shots.hero = await popup(adult);
shots.status = await popup({ stage: 'child', weight: 12, hunger: 1, happy: 3, age: 2 * 86400, stageT: 3600, call: { reason: 'hungry', t: 0, counted: false } }, async p => {
  await p.keyboard.press('s'); await p.waitForTimeout(400);
});
shots.catch = await popup({ stage: 'child', weight: 12, age: 2 * 86400, stageT: 3600 }, async p => {
  await p.keyboard.press('p'); await p.waitForTimeout(200);
  await p.keyboard.press('2');
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(900); await p.keyboard.up('ArrowRight');
  await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(1400); await p.keyboard.up('ArrowLeft');
  await p.waitForTimeout(1300);
});

// Pixel sprites for the life-cycle shot and the promo tiles (drawn by the game's own art code).
const spritePage = await ctx.newPage();
await spritePage.goto(`chrome-extension://${id}/welcome/welcome.html`);
const sprites = await spritePage.evaluate(async () => {
  const { petSprite } = await import('/art/sprites.js');
  const big = (stage, o, s = 8) => {
    const src = petSprite(stage, o), c = document.createElement('canvas');
    c.width = c.height = 48 * s; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.drawImage(src, 0, 0, 48 * s, 48 * s); return c.toDataURL();
  };
  return {
    seed: big('seed', { crack: true }), baby: big('baby', { mood: 'happy' }), child: big('child', { mood: 'happy' }),
    radiant: big('adult', { mood: 'happy', variant: 'radiant' }), daisy: big('adult', { mood: 'happy', variant: 'daisy' }),
    thistle: big('adult', { variant: 'thistle' }), senior: big('senior', { mood: 'happy', variant: 'radiant' }),
  };
});
await spritePage.close();
await ctx.close();
await rm(profile, { recursive: true, force: true });

/* ---------- 2. Compose the store images at exact pixel sizes ---------- */
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
const base = `${fonts}
* { box-sizing: border-box; margin: 0; }
body { width: var(--w); height: var(--h); overflow: hidden; color: #3b2f4a; font-family: "Nunito", sans-serif;
  background: radial-gradient(ellipse at 20% 0%, #e6f8f2, transparent 60%), radial-gradient(ellipse at 90% 100%, #fbe7d9, transparent 55%), #bfe6db; }
.pix { image-rendering: pixelated; }
h1 { font: 600 64px/1.05 "Fredoka", sans-serif; letter-spacing: .3px; }
h1 em { font-style: normal; color: #d9504a; }
p.lead { font-size: 26px; line-height: 1.4; color: #5d5070; margin-top: 18px; }
.pod { width: 468px; height: 600px; border-radius: 26px; filter: drop-shadow(0 18px 30px rgba(40, 60, 70, .28)); }
.shot { display: grid; grid-template-columns: 1fr 520px; align-items: center; gap: 40px; height: 100%; padding: 0 70px 0 90px; }
.tag { display: inline-block; font: 400 18px "Pixelify Sans", monospace; background: #fffcf3; border: 2px solid #5e978c; border-radius: 999px; padding: 6px 14px; margin-bottom: 22px; }
ul.pts { list-style: none; padding: 0; margin-top: 26px; display: grid; gap: 12px; font-size: 21px; }
ul.pts li::before { content: "✿"; color: #5e978c; margin-right: 10px; }`;

async function render(name, w, h, css, html) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>:root{--w:${w}px;--h:${h}px}${base}${css}</style></head><body>${html}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  await page.screenshot({ path: join(out, name), type: 'png', clip: { x: 0, y: 0, width: w, height: h } });
  console.log(`store/${name}`);
}
// The live screen inside the 468×600 pod artwork (same numbers as popup.css), and how much to magnify it.
const SCR = { x: 106.5, y: 252.9, w: 147.8, h: 166.7 }, Z = 1.8;
const zoomCss = `.podbox { position: relative; width: 468px; height: 600px; justify-self: center; }
.shot p.lead { max-width: 520px; }
.zoom { position: absolute; left: -36px; top: 300px; width: ${SCR.w * Z}px; height: ${SCR.h * Z}px; border-radius: 16px;
  background-size: ${468 * Z}px ${600 * Z}px; background-position: -${SCR.x * Z}px -${SCR.y * Z}px;
  outline: 7px solid #fffcf3; box-shadow: 0 0 0 9px #5e978c, 0 22px 40px rgba(40, 60, 70, .35); }`;
const podShot = (img, tag, title, lead, pts = [], zoom = false) => `<div class="shot"><div><span class="tag">${tag}</span><h1>${title}</h1><p class="lead">${lead}</p>${pts.length ? `<ul class="pts">${pts.map(t => `<li>${t}</li>`).join('')}</ul>` : ''}</div>`
  + `<div class="podbox"><img class="pod" src="${img}" alt="">${zoom ? `<div class="zoom" style="background-image:url(${img})"></div>` : ''}</div></div>`;

await render('screenshot-1.png', 1280, 800, '', podShot(shots.hero, 'Virtual pet', 'A tiny pet that lives in your <em>toolbar</em>',
  'Bubby grows up in real time, even while the browser is closed. A quick check-in morning and evening is enough.',
  ['Feed, play, clean up and put it to bed', 'Its face on the toolbar shows how it feels', 'No account, no ads, nothing leaves your computer']));
await render('screenshot-2.png', 1280, 800, zoomCss, podShot(shots.status, 'Status', 'See what Bubby <em>needs</em>',
  'Tap the flashing tile to check its hearts, weight and discipline, plus one button that does exactly what it needs right now.', [], true));
await render('screenshot-3.png', 1280, 800, zoomCss, podShot(shots.catch, 'Minigames', 'Play <em>Seed catch</em>',
  'Steer Bubby under falling seeds for 20 seconds. Gold seeds are worth 3, pebbles cost 2. Or guess which way it will look.', [], true));

// Notification: a generic system notification card, using the extension's real notification copy.
await render('screenshot-4.png', 1280, 800, `
.wrap { display: grid; grid-template-columns: 1fr 560px; align-items: center; gap: 50px; height: 100%; padding: 0 90px; }
.stack { display: grid; gap: 22px; }
.note { background: #fff; border-radius: 16px; box-shadow: 0 14px 34px rgba(40, 60, 70, .22); padding: 18px 20px 14px; font-size: 19px; }
.note .head { display: flex; align-items: center; gap: 10px; color: #6b6577; font-size: 15px; }
.note .head img { width: 22px; height: 22px; }
.note .body { display: grid; grid-template-columns: 1fr 72px; gap: 14px; margin-top: 10px; align-items: center; }
.note b { display: block; font-weight: 700; font-size: 21px; color: #2b2533; }
.note p { color: #4b4558; margin-top: 4px; line-height: 1.35; }
.note .big { width: 72px; height: 72px; }
.note .btns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
.note .btns span { text-align: center; background: #eef0f3; border-radius: 10px; padding: 10px; font-weight: 700; font-size: 17px; color: #2b2533; }
.bar { display: flex; align-items: center; gap: 14px; background: #fffcf3; border: 2px solid #5e978c; border-radius: 14px; padding: 12px 18px; font-size: 18px; width: max-content; }
.badge { position: relative; width: 44px; height: 44px; }
.badge img { width: 44px; height: 44px; }
.badge i { position: absolute; right: -8px; bottom: -6px; background: #d9504a; color: #fff; font: 700 15px/1 "Nunito"; font-style: normal; border-radius: 7px; padding: 3px 6px; }`,
`<div class="wrap"><div><span class="tag">Notifications</span><h1>Polite <em>reminders</em></h1>
<p class="lead">When Bubby really needs you, a notification has a button that fixes it right there. At most 6 a day, never two within 40 minutes, quiet while Bubby sleeps.</p></div>
<div class="stack">
  <div class="note"><div class="head"><img src="${icon128}" alt="">Bubby · now</div>
    <div class="body"><div><b>Bubby is hungry</b><p>Its tummy is empty. Feed it a meal before it gets upset.</p></div><img class="big" src="${icon128}" alt=""></div>
    <div class="btns"><span>Feed a meal</span><span>Open Bubby</span></div></div>
  <div class="note"><div class="head"><img src="${icon128}" alt="">Bubby · 2 hours ago</div>
    <div class="body"><div><b>Time to clean up</b><p>Bubby’s garden is getting dirty. Clean it before Bubby gets sick.</p></div><img class="big" src="${icon128}" alt=""></div>
    <div class="btns"><span>Clean up</span><span>Open Bubby</span></div></div>
  <div class="bar"><span class="badge"><img class="pix" src="${icon128}" alt=""><i>!</i></span>The toolbar badge tells you at a glance</div>
</div></div>`);

// Life cycle
await render('screenshot-5.png', 1280, 800, `
.wrap { padding: 0 80px; height: 100%; display: flex; flex-direction: column; justify-content: center; }
.row { display: flex; align-items: flex-end; justify-content: space-between; margin-top: 46px; }
.st { text-align: center; font: 400 22px "Pixelify Sans", monospace; }
.st img { width: 168px; height: 168px; display: block; margin: 0 auto 8px; }
.arrow { font: 600 40px "Fredoka"; color: #5e978c; padding-bottom: 60px; }
.forms { margin-top: 48px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.form { background: #fffcf3; border: 2px solid #5e978c; border-radius: 18px; padding: 12px 18px; display: flex; align-items: center; gap: 12px; font-size: 19px; }
.form img { width: 96px; height: 96px; }
.form b { display: block; font: 600 22px "Fredoka"; white-space: nowrap; }`,
`<div class="wrap"><span class="tag" style="align-self:flex-start">Grow up</span><h1>From a seed to a <em>Blossom</em></h1>
<div class="row">
  <div class="st"><img class="pix" src="${sprites.seed}" alt="">Seed</div><span class="arrow">→</span>
  <div class="st"><img class="pix" src="${sprites.baby}" alt="">Bulb</div><span class="arrow">→</span>
  <div class="st"><img class="pix" src="${sprites.child}" alt="">Bud</div><span class="arrow">→</span>
  <div class="st"><img class="pix" src="${sprites.radiant}" alt="">Blossom</div><span class="arrow">→</span>
  <div class="st"><img class="pix" src="${sprites.senior}" alt="">Elder</div>
</div>
<div class="forms">
  <div class="form"><img class="pix" src="${sprites.radiant}" alt=""><span><b>Radiant Blossom</b>Great care, good manners</span></div>
  <div class="form"><img class="pix" src="${sprites.daisy}" alt=""><span><b>Daisy Blossom</b>A few slips</span></div>
  <div class="form"><img class="pix" src="${sprites.thistle}" alt=""><span><b>Thistle</b>Many mistakes, or overweight</span></div>
</div></div>`);

// Promo tiles
const promo = (w, h, spriteSize, titleSize, leadSize) => `
<div style="height:100%;display:flex;align-items:center;justify-content:center;gap:${Math.round(w * .03)}px;padding:0 ${Math.round(w * .05)}px">
  <img class="pix" src="${sprites.baby}" style="width:${spriteSize}px;height:${spriteSize}px" alt="">
  <div><h1 style="font-size:${titleSize}px">Bub<em>by</em></h1>
  <p class="lead" style="font-size:${leadSize}px;margin-top:${Math.round(leadSize * .35)}px">A tiny pixel pet<br>for your toolbar</p></div>
</div>`;
await render('promo-small.png', 440, 280, '', promo(440, 280, 192, 64, 22));
await render('promo-marquee.png', 1400, 560, '', promo(1400, 560, 384, 128, 40));

await browser.close();
