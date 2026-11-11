// TikTok photo slideshow (1080×1920 PNGs): a tour of the whole interface with captions.
// Usage: node tools/tiktok-slides.mjs   (needs Playwright with Chromium) → dist/tiktok-slides/slide-01..12.png + captions.txt
// Every screen is a real screenshot of the extension's popup (state set through storage), nothing redrawn.
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const ext = join(repo, 'extension'), out = join(repo, 'dist', 'tiktok-slides');
await mkdir(out, { recursive: true });

/* ---------- Real screenshots of the popup ---------- */
// Early afternoon in the capture time zone, so Bubby is awake with its usual 22:00 bedtime.
let off = (14 - new Date().getUTCHours() + 24) % 24; if (off > 14) off -= 24;
const TZ = off >= 0 ? `Etc/GMT-${off}` : `Etc/GMT+${-off}`;
const ctx = await chromium.launchPersistentContext('', {
  channel: 'chromium', headless: true, viewport: { width: 468, height: 600 }, deviceScaleFactor: 4, env: { ...process.env, TZ },
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
});
let [sw] = ctx.serviceWorkers();
if (!sw) sw = await ctx.waitForEvent('serviceworker');
const base = `chrome-extension://${new URL(sw.url()).host}/`;
await sw.evaluate(async () => { for (let i = 0; i < 50 && !(await chrome.storage.local.get('bubby')).bubby; i++) await new Promise(r => setTimeout(r, 100)); });

// state: fields to set. pace 'quick' keeps tantrums and naps on screen (real-time paces clear them while closed).
// away: events for the "While you were away" card, and how long ago you last looked.
async function capture(state, { pace = 'chill', away = null, then, wait = 700 } = {}) {
  await sw.evaluate(async ({ state, pace, away }) => {
    const S = (await chrome.storage.local.get('bubby')).bubby, now = Date.now();
    Object.assign(S, { hunger: 4, happy: 4, poops: [], sick: false, call: null, asleep: false, lights: true, paused: false, ended: null,
      mistakes: 0, discipline: 50, awakeT: 3600, sleepT: 0, nextPoop: 9999, nextTantrum: 9999 }, state);
    Object.assign(S.cfg, { look: 'toy', bed: 22 * 60, wake: 8 * 60, pace, sound: false });
    S.lastT = now; S.lastSeenAt = now; S.seenSeq = S.evSeq; S.notifiedSeq = S.evSeq;
    if (away) {
      for (const [type, text, reason] of away.events) { S.evSeq++; S.events.push({ id: S.evSeq, t: now, type, text, reason }); }
      S.lastSeenAt = now - away.hours * 3600e3;
    }
    await chrome.storage.local.set({ bubby: S });
  }, { state, pace, away });
  const p = await ctx.newPage();
  await p.goto(base + 'popup/popup.html');
  await p.waitForSelector('#app');
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(wait);
  if (then) await then(p);
  await p.evaluate(() => document.activeElement && document.activeElement.blur());
  await p.waitForTimeout(80);
  const png = await p.locator('.pdev').screenshot();
  await p.close();
  return 'data:image/png;base64,' + png.toString('base64');
}

const bud = { stage: 'child', weight: 12, age: 2 * 86400, stageT: 3600 };
const shots = {
  pod: await capture({ stage: 'adult', variant: 'radiant', weight: 24, age: 5 * 86400, stageT: 3600 }),
  hungry: await capture({ ...bud, hunger: 0, happy: 2, call: { reason: 'hungry', t: 0, counted: false } }),
  poop: await capture({ ...bud, hunger: 3, happy: 3, poops: [{ t: 0 }, { t: 0 }, { t: 0 }] }),
  tantrum: await capture({ ...bud, awakeT: 0, stageT: 10, call: { reason: 'tantrum', t: 0, counted: false } }, { pace: 'quick', then: p => p.keyboard.press('s') }),
  sick: await capture({ ...bud, hunger: 3, happy: 2, sick: true, doses: 2 }),
  feed: await capture(bud, { then: p => p.keyboard.press('f') }),
  game: await capture(bud, { then: async p => {
    await p.keyboard.press('p'); await p.waitForTimeout(200); await p.keyboard.press('2');
    await p.keyboard.down('ArrowRight'); await p.waitForTimeout(900); await p.keyboard.up('ArrowRight');
    await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(1400); await p.keyboard.up('ArrowLeft');
    await p.waitForTimeout(1200);
  } }),
  night: await capture({ ...bud, stageT: 10, asleep: true, lights: false }, { pace: 'quick' }),
  away: await capture({ ...bud, hunger: 1, happy: 1, poops: [{ t: 0 }, { t: 0 }] }, { away: { hours: 9, events: [
    ['call', 'Bubby is hungry. Feed it a meal.', 'hungry'], ['poop', 'Bubby pooped.'], ['poop', 'Bubby pooped.'], ['poop', 'Bubby pooped.'],
    ['sick', 'Bubby feels sick. It needs medicine.'],
  ] } }),
  end: await capture({ ...bud, ended: { kind: 'away', age: 6 * 86400, stage: 'child', name: 'Bud', mistakes: 11, gen: 1, day: 6 } }),
};

// Sprites straight from the extension's art code: toolbar faces and the three grown-up forms.
const page0 = await ctx.newPage();
await page0.goto(base + 'welcome/welcome.html');
const sprites = await page0.evaluate(async () => {
  const { petSprite, art } = await import('/art/sprites.js');
  const { iconCanvas } = await import('/art/icon.js');
  const big = (c, s) => { const o = document.createElement('canvas'); o.width = c.width * s; o.height = c.height * s; const x = o.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, o.width, o.height); return o.toDataURL(); };
  const faces = [['happy'], ['sad'], ['sick', true], ['sleep'], ['angry']].map(([mood, sick]) => big(iconCanvas('child', { mood: sick ? 'sick' : mood, sick: !!sick }, 32), 6));
  const { BG } = art();
  const forms = ['radiant', 'daisy', 'thistle'].map(v => {
    const c = document.createElement('canvas'); c.width = 60; c.height = 60; const x = c.getContext('2d');
    x.drawImage(BG, -20, -15); x.drawImage(petSprite('adult', { mood: 'happy', variant: v }), 6, 6);
    return big(c, 5);
  });
  return { faces, forms, bulb: big(petSprite('baby', { mood: 'happy' }), 8) };
});
await ctx.close();

/* ---------- Slides ---------- */
const font = async (fam, w, f) => `@font-face{font-family:"${fam}";font-weight:${w};src:url(data:font/woff2;base64,${(await readFile(join(ext, 'fonts', f))).toString('base64')})}`;
const icon = 'data:image/png;base64,' + (await readFile(join(ext, 'icons', 'icon-128.png'))).toString('base64');
const css = [await font('Fredoka', 600, 'fredoka-latin-600-normal.woff2'), await font('Nunito', 400, 'nunito-latin-400-normal.woff2'),
  await font('Nunito', 700, 'nunito-latin-700-normal.woff2')].join('') + `
*{box-sizing:border-box;margin:0} body{width:1080px;height:1920px;overflow:hidden;color:#3b2f4a;font-family:Nunito,"Noto Color Emoji",sans-serif;
  background:radial-gradient(ellipse at 30% 0%,#dcf4ed,transparent 60%),#bfe6db}
.page{height:100%;display:flex;flex-direction:column;align-items:center;padding:190px 70px 0}
.head{font:600 74px/1.32 Fredoka,"Noto Color Emoji",sans-serif;text-align:center}
.head span{background:#fff;padding:2px 22px;border-radius:18px;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.head em{font-style:normal;color:#d9504a}
.sub{margin-top:30px;font:700 42px/1.3 Nunito,"Noto Color Emoji",sans-serif;text-align:center;color:#fff;
  text-shadow:0 3px 0 #3b2f4a,0 -3px 0 #3b2f4a,3px 0 0 #3b2f4a,-3px 0 0 #3b2f4a,3px 3px 0 #3b2f4a,-3px -3px 0 #3b2f4a,3px -3px 0 #3b2f4a,-3px 3px 0 #3b2f4a,0 8px 18px rgba(0,0,0,.25)}
.stage{flex:1;width:100%;display:flex;align-items:center;justify-content:center;padding-bottom:300px}
.pod{width:820px;border-radius:44px;filter:drop-shadow(0 22px 40px rgba(40,60,70,.3))}
.zoom{border-radius:30px;border:14px solid #fffcf3;box-shadow:0 0 0 4px #5e978c,0 22px 44px rgba(40,60,70,.3)}
.pix{image-rendering:pixelated}
.n{position:absolute;right:40px;top:120px;font:600 34px Fredoka;color:#5e978c}
.note{background:#fff;border-radius:32px;padding:30px 34px;width:860px;box-shadow:0 22px 44px rgba(40,60,70,.25);font-size:34px}
.note .app{display:flex;align-items:center;gap:14px;color:#6b5d78;font-size:28px} .note .app img{width:40px;height:40px}
.note b{display:block;font-size:40px;margin-top:16px} .note p{color:#5d5070;margin-top:6px;line-height:1.35}
.note .btns{display:flex;gap:16px;margin-top:24px} .note .btns i{flex:1;font-style:normal;text-align:center;background:#eef5f2;border-radius:16px;padding:16px;font-weight:700}
.bar{display:flex;align-items:center;gap:22px;background:#f1f3f4;border-radius:999px;padding:18px 22px 18px 40px;width:900px;box-shadow:0 22px 44px rgba(40,60,70,.25)}
.bar .url{flex:1;height:64px;border-radius:999px;background:#fff}
.tb{position:relative;width:104px;height:104px;border-radius:24px;background:#fff;display:grid;place-items:center;box-shadow:0 0 0 5px #d9504a}
.tb img{width:84px}
.badge{position:absolute;right:-12px;bottom:-12px;min-width:46px;height:46px;border-radius:12px;color:#fff;font:600 34px/46px Fredoka;text-align:center;padding:0 8px}
.faces{display:grid;grid-template-columns:repeat(5,1fr);gap:26px;margin-top:70px}
.face{display:flex;flex-direction:column;align-items:center;gap:14px;font:600 30px Fredoka;color:#3b2f4a}
.face div{position:relative;background:#fff;border-radius:28px;padding:14px}
.face img{width:150px;display:block}
.forms{display:flex;gap:26px}
.form{display:flex;flex-direction:column;align-items:center;gap:18px;font:600 36px Fredoka}
.form img{width:300px;border-radius:24px;border:8px solid #fffcf3;box-shadow:0 0 0 3px #5e978c,0 14px 30px rgba(40,60,70,.25)}`;

// The live screen inside the toy pod (same numbers as popup.css), cut out and shown large.
const SCR = { x: 106.5, y: 252.9, w: 147.8, h: 166.7 };
const zoom = (src, zw = 860) => { const Z = zw / SCR.w; return `<div class="zoom" style="width:${zw + 28}px;height:${SCR.h * Z + 28}px;background:url(${src}) -${SCR.x * Z}px -${SCR.y * Z}px/${468 * Z}px ${600 * Z}px no-repeat;background-origin:content-box"></div>`; };
const pod = src => `<img class="pod" src="${src}">`;
const head = h => `<p class="head">${h.split('\n').map(l => `<span>${l}</span>`).join('<br>')}</p>`;

const notif = `<div class="note"><div class="app"><img src="${icon}">Bubby · now</div><b>Bubby is hungry</b>
  <p>Its tummy is empty. Feed it a meal before it gets upset.</p><div class="btns"><i>Feed a meal</i><i>Open Bubby</i></div></div>`;
const BADGE = { happy: null, sad: ['!', '#d9504a'], sick: ['+', '#8a5cc8'], sleep: ['z', '#4a7fd0'], angry: ['!', '#d9504a'] };
const faces = `<div style="display:flex;flex-direction:column;align-items:center">
  <div class="bar"><div class="url"></div><div class="tb"><img class="pix" src="${sprites.faces[1]}"><span class="badge" style="background:#d9504a">!</span></div></div>
  <div class="faces">${['happy', 'sad', 'sick', 'sleep', 'angry'].map((m, i) => `<div class="face"><div><img class="pix" src="${sprites.faces[i]}">${BADGE[m] ? `<span class="badge" style="background:${BADGE[m][1]}">${BADGE[m][0]}</span>` : ''}</div>${['fine', 'hungry', 'sick', 'asleep', 'mad at you'][i]}</div>`).join('')}</div></div>`;
const forms = `<div class="forms">${['Radiant', 'Daisy', 'Thistle'].map((n, i) => `<div class="form"><img class="pix" src="${sprites.forms[i]}">${n}</div>`).join('')}</div>`;
const cta = `<div style="display:flex;flex-direction:column;align-items:center;gap:40px"><img class="pix" src="${sprites.bulb}" style="width:420px">
  <p class="head" style="font-size:120px"><span>Bub<em>by</em></span></p></div>`;

// [headline (\n = new line), subline, picture]
const SLIDES = [
  ['your childhood\nkeychain pet didn’t die', 'it moved into your browser. and it’s been waiting for you \u{1F440}', pod(shots.pod)],
  ['it lives in your toolbar now', 'its face IS the icon. you will know when it’s mad at you.', faces],
  ['it texts you when it’s hungry', 'mid-meeting. every time. with a button that feeds it for you.', `<div style="display:flex;flex-direction:column;align-items:center;gap:50px">${notif}${zoom(shots.hungry, 520)}</div>`],
  ['yes. it still poops.', 'and yes, you still have to clean it. some things never change \u{1F4A9}', zoom(shots.poop)],
  ['it throws tantrums\nwith FULL hearts', 'it’s testing you. you’re supposed to scold it. this is parenting now.', zoom(shots.tantrum)],
  ['meal or snack?', 'pick snack 3 times in a row and find out \u{1F36C}', zoom(shots.feed)],
  ['you found out.', 'toothache. medicine takes 2 doses. it is not grateful.', zoom(shots.sick)],
  ['the minigame', 'catch the seeds. gold ones are worth 3. pebbles go straight to the face.', zoom(shots.game)],
  ['it has a bedtime', 'lights off or it sleeps badly and blames you in the morning \u{1F319}', zoom(shots.night)],
  ['it keeps a diary\nof what you missed', 'close it for 9 hours and come back to this. the guilt is free.', zoom(shots.away)],
  ['how you raise it =\nwhat it becomes', 'good parent: Radiant. okay parent: Daisy. you: probably Thistle.', forms],
  ['ignore it and\nit MOVES OUT', 'no dying. it packs up, leaves you a seed, and goes. somehow worse.', zoom(shots.end)],
  ['adopt yours now', 'free on the Chrome Web Store \u{1F331}\nsearch “Bubby”. no ads. no account.\ncomment which form yours becomes \u{1F447}', cta],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
for (const [i, [h, sub, pic]] of SLIDES.entries()) {
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>${css}</style><div class="page">${head(h)}<p class="sub">${sub.replace(/\n/g, '<br>')}</p><div class="stage">${pic}</div></div>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(50);
  const file = `slide-${String(i + 1).padStart(2, '0')}.png`;
  await page.screenshot({ path: join(out, file) });
  console.log('dist/tiktok-slides/' + file);
}
await browser.close();

// The post's caption and hashtags, ready to paste.
await writeFile(join(out, 'captions.txt'), `did you have one of these as a kid?? \u{1F97A} I made one that lives in your browser. it’s called Bubby and it already hates my sleep schedule. it’s free on the Chrome Web Store, search “Bubby” \u{1F331}

#virtualpet #nostalgia #y2k #90skids #2000skids #pixelart #indiedev #chromeextension #cozygames #gamedev
`);
console.log('dist/tiktok-slides/captions.txt');
