// TikTok stage: plays the real Bubby popup (toy pod look) in an iframe and directs it scene by scene.
// Opened by tools/tiktok-videos.mjs as promo/stage.html?v=intro|funny inside a temporary copy of the extension.
import { petSprite } from '../art/sprites.js';

const $ = s => document.querySelector(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const D = 86400, H = 3600;
const cues = window.__cues = [];
const cue = (k, o = {}) => cues.push({ t: Date.now(), k, ...o });

let ifr = null;
window.addEventListener('message', e => {
  const d = e.data;
  if (d && d.beep && ifr && e.source === ifr.contentWindow) cues.push({ t: d.t, k: 'beep', f: d.f, d: d.d, v: d.v });
});
const B = () => ifr.contentWindow.__bubby;
const doc = () => ifr.contentDocument;

/* ---------- Camera (pod is 468×600 CSS px; stage is 1080×1920) ---------- */
const CAMS = {
  full:   { s: 1.78, cx: 234, cy: 300, x: 540, y: 1010 },
  mid:    { s: 3.15, cx: 190, cy: 375, x: 540, y: 1000 },
  screen: { s: 5.85, cx: 180.4, cy: 336.3, x: 540, y: 1000 },
  hook:   { s: 4.4, cx: 180.4, cy: 345, x: 540, y: 1010 },
};
function cam(name, ms = 700) {
  const c = typeof name === 'string' ? CAMS[name] : name, el = $('#cam');
  el.style.transitionDuration = ms + 'ms';
  el.style.transform = `translate(${c.x - c.cx * c.s}px, ${c.y - c.cy * c.s}px) scale(${c.s})`;
}

/* ---------- Load a scene into the real popup ---------- */
async function pod(state = {}, after) {
  const now = Date.now();
  if (ifr) ifr.contentWindow.__frozen = true; // the old popup must not overwrite the new save
  const S = (await chrome.storage.local.get('bubby')).bubby;
  Object.assign(S, {
    stage: 'child', stageT: H, age: 1.3 * D, weight: 12, hunger: 4, happy: 4, discipline: 0, mistakes: 0,
    poops: [], sick: false, doses: 0, sickT: 0, sickCounted: false, sickMeter: 0, neglectT: 0, starveT: 0,
    call: null, asleep: false, lights: true, awakeT: H, paused: false, ended: null, variant: null, chubby: false,
    snacks: [], nextPoop: 1e7, nextTantrum: 1e7, events: [], evSeq: 0, gen: 1,
  }, state);
  S.cfg = { ...S.cfg, pace: 'chill', look: 'toy', sound: true, notify: false, bed: 22 * 60, wake: 8 * 60, bedAsked: true, dev: false };
  S.stats = { ...S.stats, bestCatch: 0 };
  S.lastT = now;
  if (!('lastSeenAt' in state)) S.lastSeenAt = now;
  if (!('seenSeq' in state)) S.seenSeq = S.evSeq;
  S.notifiedSeq = S.evSeq;
  await chrome.storage.local.set({ bubby: S });
  const f = document.createElement('iframe');
  f.style.opacity = 0;
  f.src = '../popup/popup.html';
  $('#cam').appendChild(f);
  await new Promise(r => f.addEventListener('load', r, { once: true }));
  for (let i = 0; i < 200 && !(f.contentWindow.__bubby && f.contentWindow.__bubby.S); i++) await wait(20);
  await f.contentWindow.document.fonts.ready;
  if (after) after(f.contentWindow.__bubby);
  await wait(250);
  const old = ifr; ifr = f; f.style.opacity = 1;
  if (old) setTimeout(() => old.remove(), 150);
}

/* ---------- Effects ---------- */
function cap(id, html) {
  const el = $('#' + id);
  if (!html) { if (el.classList.contains('on')) { el.classList.remove('on'); el.classList.add('off'); } return; }
  el.innerHTML = id === 'low' ? `<span>${html}</span>` : `<div>${html}</div>`;
  el.classList.remove('on', 'off'); void el.offsetWidth; el.classList.add('on');
  cue(id === 'top' ? 'pop' : 'pop2');
}
function flash() { const f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
function card(html) {
  if (!html) { $('#card').classList.remove('on'); return; }
  $('#panel').innerHTML = html; $('#card').classList.add('on'); cue('whoosh');
}
async function reveal(sel, gap, k = 'pop2') {
  for (const el of document.querySelectorAll(sel)) { el.classList.add('in'); cue(k); await wait(gap); }
}
async function tap(sel, { hold = 250 } = {}) {
  const el = doc().querySelector(sel);
  if (!el) throw new Error('no ' + sel);
  const r = el.getBoundingClientRect(), fr = ifr.getBoundingClientRect(), k = fr.width / 468;
  const d = document.createElement('div'); d.className = 'tap';
  d.style.left = fr.left + (r.left + r.width / 2) * k + 'px'; d.style.top = fr.top + (r.top + r.height / 2) * k + 'px';
  $('#fx').appendChild(d); setTimeout(() => d.remove(), 700);
  cue('tap'); await wait(120); el.click(); await wait(hold);
}
// Cut an animation short so the next tap goes through (the popup ignores taps mid-animation).
const skipAnim = () => { const b = B(); if (b.A) b.A.t = b.A.dur; };
// Make the game's dice land a certain way for one beat (Math.random of the popup).
function rig(v) { const w = ifr.contentWindow, R = w.Math.random; w.Math.random = () => v; return () => { w.Math.random = R; }; }

// Seed catch autopilot: steer like a player would (drag on the garden), going for reachable seeds and dodging pebbles.
let pilot = 0;
function autopilot(on) {
  clearInterval(pilot); if (!on) return;
  pilot = setInterval(() => {
    const g = B() && B().G; if (!g || g.type !== 'catch' || g.phase !== 'play') return;
    const cy = 33; // catchY for a Bud
    let best = null;
    for (const it of g.items) {
      if (it.fx || it.kind === 'pebble') continue;
      const eta = (cy - it.y) / it.vy; if (eta < -0.05) continue;
      if (Math.abs(it.x - g.px) / 58 > eta + .08) continue;
      const s = (it.kind === 'gold' ? 3 : 1) / (eta + .25);
      if (!best || s > best.s) best = { x: it.x, s };
    }
    let tx = best ? best.x : g.px;
    for (const it of g.items) {
      if (it.fx || it.kind !== 'pebble') continue;
      const eta = (cy - it.y) / it.vy;
      if (eta > -0.05 && eta < .45 && Math.abs(it.x - tx) < 11) tx = it.x < 50 ? it.x + 20 : it.x - 20;
    }
    g.hold = 0; g.target = Math.max(13, Math.min(87, tx));
  }, 30);
}

function sprite(stage, o, px) {
  const c = document.createElement('canvas'); c.width = c.height = px;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(petSprite(stage, o), 0, 0, px, px);
  return `<img src="${c.toDataURL()}" width="${px}" height="${px}" alt="">`;
}

/* ================= Video 1: the intro ================= */
async function intro() {
  await pod({ stage: 'seed', stageT: 0, age: 0, weight: 1 });
  cam('hook', 0);
  return async () => {
    B().S.stageT = 60 - 2.3; // the seed sprouts on cue
    cue('boom'); cue('music');
    cap('top', 'Remember <em>Tamagotchi?</em> 🥚');
    await wait(2300);
    flash(); cue('sparkle');
    cap('top', 'It’s back… and it lives in your <em>browser</em> 👀');
    await wait(500); cam('full', 900);
    await wait(1500);
    cap('low', 'Meet <b>Bubby</b> 🌱 a tiny pet for your toolbar');
    await wait(2100);

    cap('top'); cap('low');
    card(`<h2>1997 vs <em>2026</em></h2><div class="vs">
      <div class="head">🥚<small>the egg</small></div><div class="head">🌱<small>Bubby</small></div>
      <div class="c old">Lived on your keychain</div><div class="c new">Lives in your browser toolbar</div>
      <div class="c old">Beeped in the middle of class</div><div class="c new">Polite pings, max 6 a day</div>
      <div class="c old">Died while you were at school</div><div class="c new">Sleeps on <b>your</b> bedtime + a pause button</div>
      <div class="c old">Needed batteries</div><div class="c new">Free. Zero data collected.</div></div>`);
    await wait(500);
    await reveal('.vs .c', 480);
    await wait(800);

    card(`<h2>How you raise it = <em>who it becomes</em></h2>
      <div class="line">
        <div class="mon">${sprite('seed', {}, 120)}<b>Seed</b></div><div class="arrow">›</div>
        <div class="mon">${sprite('baby', { mood: 'happy' }, 120)}<b>Bulb</b></div><div class="arrow">›</div>
        <div class="mon">${sprite('child', { mood: 'happy' }, 120)}<b>Bud</b></div><div class="arrow">›</div>
        <div class="mon">${sprite('senior', { variant: 'radiant' }, 120)}<b>Elder</b></div>
      </div>
      <div class="sep">3 different Blossoms 👇</div>
      <div class="forms">
        <div class="mon f">${sprite('adult', { variant: 'radiant', mood: 'happy' }, 220)}<b>Radiant</b><small>perfect parent 😇</small></div>
        <div class="mon f">${sprite('adult', { variant: 'daisy', mood: 'happy' }, 220)}<b>Daisy</b><small>you tried 🙂</small></div>
        <div class="mon f">${sprite('adult', { variant: 'thistle' }, 220)}<b>Thistle</b><small>raised on snacks + chaos 💀</small></div>
      </div>`);
    await wait(350);
    await reveal('.line .mon', 260);
    await wait(250);
    await reveal('.forms .mon', 650);
    await wait(1100);

    // Mini game 1: Seed catch, live
    await pod({ stage: 'child', hunger: 4, happy: 2 });
    cam('mid', 0);
    card();
    cap('top', '2 mini games 🎮');
    await wait(500);
    await tap('.hot[data-act="play"]');
    await tap('[data-game="catch"]');
    autopilot(true);
    cam('screen', 700);
    await wait(400);
    cap('low', '<b>Seed catch:</b> gold = 3 pts, pebbles = ouch');
    await wait(3700);
    autopilot(false);

    // Mini game 2: Which way?
    await pod({ stage: 'child', hunger: 4, happy: 2 });
    cam('mid', 0);
    cap('low', '<b>Which way?</b> guess where it looks 👀');
    await tap('.hot[data-act="play"]', { hold: 150 });
    await tap('[data-game="guess"]', { hold: 500 });
    let undo = rig(.2);
    await tap('#gLeft', { hold: 60 }); undo();
    await wait(1600);

    // Sickness 1: too many sweets
    await pod({ stage: 'child', hunger: 4, happy: 2, age: 1.6 * D });
    cam('mid', 0);
    cap('top', 'And yes, it gets <em>sick</em> 🤒');
    cap('low', 'Too many snacks? 🍬🍬🍬');
    await tap('.hot[data-act="feed"]', { hold: 120 });
    await tap('[data-do="snack"]', { hold: 700 }); skipAnim();
    await tap('.hot[data-act="feed"]', { hold: 120 });
    await tap('[data-do="snack"]', { hold: 650 }); skipAnim();
    await tap('.hot[data-act="feed"]', { hold: 120 });
    undo = rig(.1);
    await tap('[data-do="snack"]', { hold: 60 }); undo();
    cam('screen', 500);
    cap('low', '🦷 <b>Toothache.</b>');
    cue('boom');
    await wait(1900);

    // Sickness 2: poop left too long, then medicine
    await pod({ stage: 'child', hunger: 3, happy: 2, age: 1.9 * D, sick: true, doses: 2, poops: [{ t: 3 * H, warned: true }, { t: 2 * H, warned: true }, { t: H }] });
    cam('mid', 0);
    cap('low', 'Ignore the poop? 💩 It gets sick.');
    await wait(1100);
    cap('low', 'Medicine time 💊');
    await tap('.tile[data-act="med"]', { hold: 1150 });
    await tap('.tile[data-act="med"]', { hold: 200 });
    cue('sparkle');
    await wait(900);

    // CTA
    await pod({ stage: 'adult', variant: 'radiant', weight: 24, age: 5.2 * D, hunger: 4, happy: 4 });
    cam('full', 0); flash(); cue('ding');
    cap('top', 'Can YOU raise a <em>Radiant Blossom?</em> 👑');
    cap('low', 'Free on Chrome · <b>link in bio</b> 🔗');
    await wait(1200);
    $('#tag').classList.add('on'); cue('pop2');
    await wait(1300);
    cap('low', 'Comment what yours became 👇');
    await wait(2000);
  };
}

/* ================= Video 2: funny, with the real mechanics ================= */
const ENDED = { stage: 'adult', variant: 'thistle', weight: 26, age: 4.6 * D, mistakes: 9, discipline: 25,
  ended: { kind: 'away', age: 4.6 * D, stage: 'adult', name: 'Thistle', mistakes: 9, gen: 1, day: 4 } };
async function funny() {
  await pod(ENDED);
  cam('screen', 0);
  return async () => {
    cue('boom'); cue('sad');
    cap('top', 'My browser pet <em>LEFT ME</em> 😭');
    await wait(1600);
    cap('low', 'here’s everything I did wrong 👇');
    await wait(1500);

    // Rewind
    $('#rew').innerHTML = '<div class="t">⏪ 4 DAYS EARLIER<small>Day 1</small></div>'; $('#rew').classList.add('on'); cue('rewind');
    cap('top'); cap('low');
    await pod({ stage: 'child', hunger: 3, happy: 1, age: 1.2 * D });
    cam('mid', 0);
    await wait(250);
    $('#rew').classList.remove('on'); cue('music');

    // Day 1: snacks
    cap('top', 'Day 1: it looked sad, so I gave it <em>snacks</em> 🍬');
    await wait(500);
    await tap('.hot[data-act="feed"]', { hold: 150 });
    await tap('[data-do="snack"]', { hold: 750 }); skipAnim();
    await tap('.hot[data-act="feed"]', { hold: 120 });
    await tap('[data-do="snack"]', { hold: 650 }); skipAnim();
    await tap('.hot[data-act="feed"]', { hold: 120 });
    let undo = rig(.1);
    await tap('[data-do="snack"]', { hold: 60 }); undo();
    cam('screen', 450);
    await wait(250);
    cue('boom');
    cap('low', '🦷 toothache. on <em>DAY ONE.</em>');
    await wait(1900);

    // Day 2: poop, live
    await pod({ stage: 'child', hunger: 4, happy: 4, age: 2.3 * D });
    cam('screen', 0);
    cap('low');
    cap('top', 'Day 2: it pooped during my <em>Zoom call</em> 💩');
    await wait(900);
    B().S.nextPoop = .1;
    await wait(1100);
    B().S.nextPoop = .1;
    await wait(400);
    cue('boom');
    cap('low', 'twice. in 4K.');
    await wait(1500);

    // Day 2: tantrum (a fake-out call), live
    B().S.nextTantrum = .1;
    cap('low');
    cap('top', 'Then it <em>SCREAMED</em> for attention 📢');
    cam('mid', 500);
    await wait(1500);
    await tap('.tile[data-act="status"]', { hold: 300 });
    cam('screen', 500);
    cap('low', '…its hearts were <em>FULL</em> 🤨');
    await wait(2300);
    cam('mid', 400);
    await wait(250);
    await tap('.tile[data-act="scold"]', { hold: 300 });
    cam('screen', 400);
    cap('top', 'Faking it? <em>Scolded.</em> ✅');
    cap('low', 'discipline +25% 📈');
    await wait(1900);
    cam('mid', 300);
    await wait(250);
    await tap('.tile[data-act="scold"]', { hold: 200 });
    cam('screen', 300);
    cap('top', 'Then I scolded it again. <em>Just in case.</em>');
    await wait(500);
    cue('boom');
    cap('low', '(it was NOT acting out) 😬');
    await wait(2000);

    // Day 3: away all day, the real "While you were away" card
    const now = Date.now();
    const ev = [
      ['call', 'Bubby is hungry. Feed it a meal.', { reason: 'hungry' }], ['poop', 'Bubby pooped.'], ['poop', 'Bubby pooped.'],
      ['dirty', 'The garden is getting dirty.'], ['sick', 'Bubby feels sick. It needs medicine.'],
      ['mistake', 'Bubby waited a long time for you.'], ['mistake', 'Bubby stayed sick too long.'],
    ].map(([type, text, x], i) => ({ id: i + 1, t: now - (8 - i) * H * 1000, type, text, ...(x || {}) }));
    await pod({ stage: 'child', hunger: 0, happy: 1, age: 3.4 * D, sick: true, doses: 2, mistakes: 6, discipline: 25,
      poops: [{ t: 6 * H, warned: true }, { t: 3 * H, warned: true }], call: { reason: 'hungry', t: 4 * H, counted: true },
      events: ev, evSeq: ev.length, seenSeq: 0, lastSeenAt: now - 9 * H * 1000 });
    cam('screen', 0); flash();
    cap('low');
    cap('top', 'Day 3: I worked <em>one</em> full day 💼');
    await wait(1500);
    cap('low', 'the receipts 🧾');
    await wait(2200);

    // Day 4: grows up into a Thistle, live
    await pod({ stage: 'child', hunger: 3, happy: 3, age: 4.05 * D, mistakes: 9, discipline: 25, weight: 21, stageT: 2 * D - 1.3 });
    cam('screen', 0);
    cap('low');
    cap('top', 'Day 4: it grew up into a…');
    await wait(1900);
    cue('boom');
    cap('top', 'Day 4: it grew up into a… <em>THISTLE</em> 🌵');
    cap('low', '(that’s the bad ending btw)');
    await wait(2300);

    // Day 5: back to the first frame (loops)
    await pod(ENDED);
    cam('screen', 0); cue('sad');
    cap('top', 'Day 5: it <em>packed up and left</em> 🧳');
    cap('low', 'Think you’d do better? 😤');
    await wait(1900);
    cap('low', 'Free on Chrome · <b>link in bio</b> 🔗');
    await wait(2400);
  };
}

const V = new URLSearchParams(location.search).get('v') || 'intro';
const run = await (V === 'funny' ? funny() : intro());
await document.fonts.ready;
window.__ready = true;
window.__go = async () => {
  window.__t0 = Date.now();
  try { await run(); } catch (e) { window.__err = String(e && e.stack || e); }
  window.__end = Date.now();
  window.__done = true;
};
