// Bubby popup: runs the game live while open, then hands back to the background worker.
import * as Rules from '../core/rules.js';
import { loadState, saveState, updateAction } from '../core/store.js';
import { art, petSprite, SW, GROUND } from '../art/sprites.js';
import { drawScene, catchY } from './scene.js';

const { clamp, rand } = Rules;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let S = null;          // game state (saved)
let A = null;          // current animation { type, t, dur, ... }
let G = null;          // minigame state
let OV = null;         // open overlay
let shownSeq = 0;      // last event shown as a toast
const PET = { x: 40, tx: 40, dir: 1, wait: 1, moving: false };
const IS_WIN = new URLSearchParams(location.search).has('win');
if (IS_WIN) document.body.classList.add('win');

const scene = $('#scene'), ctx = scene.getContext('2d');

/* ---------------- Connection to the background worker ---------------- */
let port = null;
function connect() {
  try {
    port = chrome.runtime.connect({ name: 'popup' });
    port.onMessage.addListener(m => {
      if (m && m.type === 'act') runAction(m.action);
      if (m && m.type === 'cfg' && m.cfg) { Object.assign(S.cfg, m.cfg); persist(); if (!$('#viewSettings').hidden) renderSettings(); }
    });
    port.onDisconnect.addListener(() => { port = null; setTimeout(connect, 400); });
  } catch (e) { port = null; }
}

/* ---------------- Saving ---------------- */
function markSeen() {
  S.seenSeq = S.evSeq; S.notifiedSeq = S.evSeq; S.lastSeenAt = Date.now();
  S.notif.lastKey = Rules.needKey(S); // you've seen it, so no notification for it after closing
}
function persist() {
  if (!S) return;
  markSeen();
  saveState(S);
  updateAction(S);
}

/* ---------------- Sound ---------------- */
let AC = null;
function unlockAudio() {
  if (AC || S.cfg.sound === false) return;
  try { AC = new AudioContext(); } catch (e) { AC = null; }
}
function beep(f, d = .08, vol = .05) {
  if (!AC || S.cfg.sound === false) return;
  try {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'square'; o.frequency.value = f;
    g.gain.setValueAtTime(vol, AC.currentTime); g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + d);
    o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + d + .02);
  } catch (e) {}
}
const later = (ms, fn) => setTimeout(fn, ms);
function beepCall() { beep(1046, .07); later(130, () => beep(1046, .07)); later(260, () => beep(1318, .1)); }
function beepUp() { beep(523, .1); later(120, () => beep(659, .1)); later(240, () => beep(784, .16)); }
function rareFanfare() { beepUp(); [988, 1175, 1319, 1568, 1760, 2093].forEach((f, i) => later(700 + i * 150, () => beep(f, .18, .06))); }

/* ---------------- Toast ---------------- */
let toastT = 0;
const $toast = $('#toast');
function toast(msg) {
  if (!msg) return;
  $toast.textContent = msg; $toast.hidden = false;
  $toast.classList.remove('show'); void $toast.offsetWidth; $toast.classList.add('show');
  toastT = 2.6;
}

/* ---------------- Overlays ---------------- */
const OVS = { feed: '#ovFeed', pick: '#ovPick', play: '#ovPlay', game: '#ovGame', away: '#ovAway', status: '#ovStatus' };
function showOv(name) {
  for (const k in OVS) $(OVS[k]).hidden = k !== name;
  OV = name;
  if (name === 'status') renderStatus();
  const first = name && $(OVS[name]).querySelector('button:not([disabled])');
  if (first && name !== 'game') first.focus({ preventScroll: true });
}
function closeOverlays() { for (const k in OVS) $(OVS[k]).hidden = true; OV = null; }

/* ---------------- Actions ---------------- */
const ANIM = {
  'eat-meal': { type: 'eat', food: 'meal', dur: 1.6 },
  'eat-snack': { type: 'eat', food: 'snack', dur: 1.6 },
  no: { type: 'no', dur: .9 }, scold: { type: 'scold', dur: 1.1 },
  clean: { type: 'clean', dur: 1.2 }, med: { type: 'med', dur: 1.1 }, sparkle: { type: 'sparkle', dur: .7 }, happy: { type: 'happy', dur: .9 },
};

function runAction(a) {
  if (!S) return;
  unlockAudio();
  if (a === 'replant') return replant();
  if (a === 'resume' || a === 'pause') return togglePause();
  if (S.ended || G) return;
  if (a === 'status' || a === 'attn') { beep(880, .03); if (OV === 'status') closeOverlays(); else showOv('status'); return; }
  if (A && A.type !== 'sparkle' && A.type !== 'happy') return;
  closeOverlays();
  beep(880, .03);
  if (a === 'feed' || a === 'play') {
    const no = Rules.canCare(S);
    if (no) return toast(no);
    if (a === 'play' && S.sick) { A = { ...ANIM.no, t: 0 }; return toast('Bubby feels too sick to play'); }
    if (a === 'play') $('#bestCatch').textContent = S.stats.bestCatch ? `Best: ${S.stats.bestCatch} pts` : '20s · gold = 3';
    if (a === 'feed') renderPantry();
    return showOv(a);
  }
  if (a === 'med') {   // the cabinet: Garden Tea plus whatever medicine you bought
    const no = Rules.canCare(S);
    if (no) return toast(no);
    return openPick('med');
  }
  const poopsBefore = S.poops.length;
  const r = Rules.doAction(S, a, Date.now());
  if (a === 'lights') beep(S.lights ? 660 : 330, .08);
  applyResult(r, poopsBefore);
}
// Show what an action did: its message plus any points news, then play its animation.
function applyResult(r, poopsBefore = S.poops.length) {
  const news = S.events.filter(e => e.id > shownSeq && (e.type === 'pts' || e.type === 'info')).map(e => e.text);
  toast([r.msg, ...news].filter(Boolean).join(' · '));
  if (r.anim) {
    const base = r.anim === 'eat' ? { type: 'eat', food: r.food, dur: 1.6 } : ANIM[r.anim];
    A = { ...base, t: 0, poops: poopsBefore };
    if (r.anim === 'clean') { beep(520, .08); later(90, () => beep(440, .1)); }
    if (r.cured) A.after = () => { A = { type: 'happy', t: 0, dur: .8 }; };
  }
  shownSeq = S.evSeq; // e.g. the sickness toast already came from the action message
  persist();
  renderUI();
}

function togglePause() {
  if (S.ended) return;
  S.paused = !S.paused;
  if (S.paused) { G = null; closeOverlays(); }
  S.lastT = Date.now();
  beep(S.paused ? 330 : 660, .08);
  persist(); renderUI();
}

function replant() {
  const gen = S.ended ? S.ended.gen + 1 : S.gen + 1;
  S = Rules.nextLife(S, gen, Date.now());
  A = null; G = null; shownSeq = S.evSeq;
  $('#ovEnd').hidden = true; closeOverlays();
  toast('A new seed is planted');
  persist(); renderUI();
}

/* ---------------- Minigames ---------------- */
function startGame(kind) {
  closeOverlays();
  const no = Rules.canCare(S);
  if (no) return toast(no);
  if (A || G) return;
  if (kind === 'catch') G = { type: 'catch', phase: 'play', t: 0, left: 20, score: 0, items: [], spawn: .6, px: 50, dir: 1, moving: false, hold: 0, target: null, stun: 0, joy: 0, sec: -1 };
  else G = { type: 'guess', round: 1, score: 0, phase: 'guess', look: 0, t: 0, last: false };
  showOv('game'); $('#ovGame').classList.toggle('catch', G.type === 'catch'); renderGame();
}
function endGame(gain, msg, res) {
  const pts = Rules.finishGame(S, gain, res, Date.now());
  if (pts) msg += ` · +${pts} pts`;
  if (gain) A = { type: 'happy', t: 0, dur: 1 };
  G = null; closeOverlays();
  toast(msg); persist(); renderUI();
}
function guess(d) {
  if (!G || G.type !== 'guess' || G.phase !== 'guess') return;
  G.look = Math.random() < 0.5 ? -1 : 1;
  G.last = G.look === d;
  if (G.last) G.score++;
  G.phase = 'reveal'; G.t = 0;
  beep(G.last ? 880 : 220, .12);
  renderGame();
}
function renderGame() {
  if (!G) return;
  if (G.type === 'catch') {
    $('#gPrompt').textContent = G.phase === 'play' ? `Catch seeds · ${Math.ceil(G.left)}s`
      : G.score >= 20 ? 'Super harvest!' : G.score >= 10 ? 'Nice catch!' : 'Aim for 10 next time';
    $('#gRound').textContent = `${G.score} pts`;
    $('#gScore').hidden = true;
    $('#gLeft').disabled = $('#gRight').disabled = G.phase !== 'play';
    return;
  }
  $('#gScore').hidden = false;
  $('#gRound').textContent = `${Math.min(G.round, 5)}/5`;
  $('#gScore').textContent = `${G.score} right`;
  $('#gPrompt').textContent = G.phase === 'guess' ? 'Which way will Bubby look?'
    : G.phase === 'reveal' ? (G.last ? 'Yes! You got it' : 'Nope, other way')
    : (G.score >= 3 ? `You won ${G.score}/5!` : `Only ${G.score}/5. Try again later`);
  $('#gLeft').disabled = $('#gRight').disabled = G.phase !== 'guess';
}
function updateCatch(rdt) {
  const g = G;
  if (g.phase === 'done') {
    if (g.t > 1.8) {
      const gain = g.score >= 20 ? 2 : g.score >= 10 ? 1 : 0;
      const best = g.score > (S.stats.bestCatch || 0);
      endGame(gain, (best ? 'New best! ' : '') + (gain ? `+${gain} happy, -1g` : 'Good exercise anyway. -1g'), { kind: 'catch', score: g.score });
    }
    return;
  }
  g.left -= rdt; g.joy = Math.max(0, g.joy - rdt); g.stun = Math.max(0, g.stun - rdt);
  g.moving = false;
  if (g.stun <= 0) {
    let dir = g.hold;
    if (!dir && g.target != null) { const d = g.target - g.px; dir = Math.abs(d) < 1.5 ? 0 : Math.sign(d); }
    if (dir) { g.px = clamp(g.px + dir * 58 * rdt, 13, 87); g.dir = dir; g.moving = true; }
  }
  const elapsed = 20 - g.left;
  g.spawn -= rdt;
  if (g.spawn <= 0 && g.left > 1.2) {
    const r = Math.random(), kind = r < .12 ? 'gold' : r < .32 ? 'pebble' : 'seed';
    g.items.push({ x: rand(10, 90), y: -6, vy: rand(20, 30) + elapsed * 1.2, kind, fx: 0 });
    g.spawn = Math.max(.4, .8 - elapsed * .022) * rand(.8, 1.2);
  }
  const cy = catchY(S);
  for (const it of g.items) {
    if (it.fx) { it.fx += rdt; continue; }
    it.y += it.vy * rdt;
    if (it.y >= cy - 3 && it.y <= cy + 8 && Math.abs(it.x - g.px) <= 9) {
      it.fx = .001; it.hit = true;
      if (it.kind === 'pebble') { g.score = Math.max(0, g.score - 2); g.stun = .8; beep(160, .16); }
      else { g.score += it.kind === 'gold' ? 3 : 1; g.joy = .35; beep(it.kind === 'gold' ? 1318 : 988, .05); }
    } else if (it.y >= GROUND - 1) { it.fx = .001; it.y = GROUND - 1; }
  }
  g.items = g.items.filter(it => !it.fx || it.fx < .45);
  if (g.left <= 0) { g.phase = 'done'; g.t = 0; g.items = []; g.moving = false; beep(784, .1); later(120, () => beep(1046, .16)); renderGame(); return; }
  const sec = Math.ceil(g.left);
  if (sec !== g.sec || g.lastScore !== g.score) { g.sec = sec; g.lastScore = g.score; renderGame(); }
}
function updateGame(rdt) {
  if (!G) return;
  G.t += rdt;
  if (G.type === 'catch') return updateCatch(rdt);
  if (G.phase === 'reveal' && G.t > 1.1) {
    if (G.round >= 5) { G.phase = 'done'; G.t = 0; }
    else { G.round++; G.phase = 'guess'; G.look = 0; }
    renderGame();
  } else if (G.phase === 'done' && G.t > 1.6) {
    const win = G.score >= 3;
    endGame(win ? 1 : 0, win ? 'Bubby had fun! +1 happy, -1g' : 'Good exercise anyway. -1g', { kind: 'guess', score: G.score });
  }
}

function updatePet(rdt) {
  PET.moving = false;
  if (S.stage === 'seed' || S.ended || A || G || S.asleep || S.paused || (S.call && S.call.reason === 'tantrum')) return;
  if (PET.wait > 0) { PET.wait -= rdt; return; }
  const sp = S.stage === 'senior' ? 5 : (S.sick ? 3 : (S.stage === 'baby' ? 7 : 9));
  const d = PET.tx - PET.x;
  if (Math.abs(d) < .5) { PET.wait = .8 + Math.random() * 2.6; PET.tx = 16 + Math.random() * 44; }
  else { PET.dir = Math.sign(d); PET.x += PET.dir * Math.min(Math.abs(d), sp * rdt); PET.moving = true; }
}

/* ---------------- Events from the simulation ---------------- */
// A Bulb that becomes a rare race gets the long special reveal; every other growth is the short one.
function evolveAnim(e) { return { type: 'evolve', t: 0, dur: e.rare ? 4.4 : 1.8, from: e.from, to: e.to, race: e.race, rare: !!e.rare }; }
function handleEvents() {
  if (S.evSeq <= shownSeq) return;
  const msgs = [];   // one toast for the whole batch, so a later event never wipes out an earlier one
  const say = t => { if (t) msgs.push(t); };
  for (const e of S.events) {
    if (e.id <= shownSeq) continue;
    switch (e.type) {
      case 'evolve': G = null; closeOverlays(); A = evolveAnim(e); if (e.rare) rareFanfare(); else beepUp(); say(e.text); break;
      case 'end': G = null; A = null; closeOverlays(); showEnd(); break;
      case 'call': beepCall(); if (e.reason !== 'tantrum') say(e.text); break;
      case 'poop': beep(200, .08); break;
      case 'sick': beep(330, .12); later(140, () => beep(260, .18)); say(e.text); break;
      default: say(e.text);
    }
  }
  if (msgs.length) toast(msgs.slice(-2).join(' · '));
  shownSeq = S.evSeq;
  persist();
}

/* ---------------- "While you were away" ---------------- */
function fmtDur(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${Math.max(1, m)} min`;
  const h = Math.floor(m / 60), mm = m % 60;
  if (h < 24) return mm ? `${h} h ${mm} min` : `${h} h`;
  const d = Math.floor(h / 24), hh = h % 24;
  return `${d} day${d > 1 ? 's' : ''}${hh ? ` ${hh} h` : ''}`;
}
function summarize(evs) {
  const lines = [], n = t => evs.filter(e => e.type === t).length;
  for (const e of evs) if (e.type === 'evolve' || e.type === 'end') lines.push(e.text);
  const reasons = new Set(evs.filter(e => e.type === 'call').map(e => e.reason));
  if (reasons.has('hungry')) lines.push('Bubby got hungry and called for you.');
  if (reasons.has('sad')) lines.push('Bubby felt lonely.');
  if (reasons.has('sleep')) lines.push('Bubby fell asleep with the lights on.');
  const p = n('poop'); if (p) lines.push(`Bubby pooped ${p === 1 ? 'once' : p + ' times'}.`);
  if (n('sick')) lines.push('Bubby got sick.');
  if (n('wake')) lines.push(n('wake') > 1 ? `Bubby slept ${n('wake')} nights.` : 'Bubby had a good night’s sleep.');
  else if (n('sleep')) lines.push('Bubby went to sleep.');
  const m = n('mistake'); if (m) lines.push(`${m} care mistake${m > 1 ? 's' : ''} while you were gone.`);
  if (!lines.length) lines.push('Bubby pottered around the garden. All good!');
  return lines.slice(0, 6);
}
function showAway(evs, ms) {
  const list = $('#awayList'); list.textContent = '';
  for (const t of summarize(evs)) { const li = document.createElement('li'); li.textContent = t; list.appendChild(li); }
  $('#awayFor').textContent = fmtDur(ms);
  $toast.hidden = true; toastT = 0;
  showOv('away');
}

function showEnd() {
  const e = S.ended; if (!e) return;
  $('#endTitle').textContent = e.kind === 'garden' ? 'Bubby returned to the garden' : 'Bubby packed up and moved away';
  $('#endText').textContent = (e.kind === 'garden'
    ? `A full life of ${e.day} days as a ${e.name}. It left a seed behind for you.`
    : `After ${e.day} days as a ${e.name}, Bubby went looking for a better garden. It left a seed behind.`)
    + ` Care mistakes: ${e.mistakes}.`;
  $('#ovEnd').hidden = false;
}

/* ---------------- UI rendering ---------------- */
let HEART = null;
function hearts(el, v, label) {
  const n = Math.ceil(v - 1e-3);
  if (el.dataset.n !== String(n)) {
    el.dataset.n = String(n);
    el.innerHTML = [0, 1, 2, 3].map(i => `<img src="${i < n ? HEART.full : HEART.empty}" alt="">`).join('');
    el.setAttribute('aria-label', `${label}: ${n} of 4 hearts`);
  }
  return n;
}

/* ---------------- Toy pod: tiles, status screen, layout ---------------- */
const TILES = [
  ['feed', 'Feed', '#f7c6d0'], ['status', 'Status', '#fbe6a2'], ['scold', 'Discipline', '#cfe8b8'], ['med', 'Medicine', '#ddd2f2'],
  ['clean', 'Clean', '#ecd5f3'], ['lights', 'Lights', '#fbd8b6'], ['play', 'Play', '#c9e2f4'], ['attn', 'Attention', '#fde3c6'],
];
function buildTiles() {
  TILES.forEach(([k, label, col], i) => {
    const b = document.createElement('button');
    b.className = 'tile'; b.dataset.act = k; b.style.setProperty('--t', col);
    b.setAttribute('aria-label', label); b.title = label;
    const c = document.createElement('canvas'); c.width = c.height = 16; drawIcon(c, k); b.appendChild(c);
    $(i < 4 ? '#tilesTop' : '#tilesBot').appendChild(b);
  });
}
// Looks: "toy" = the toy pod artwork (default), "compact" = the first extension layout.
function applyLook() {
  const toy = S.cfg.look !== 'compact';
  $('#app').classList.toggle('toy', toy);
  document.body.classList.toggle('toy', toy);
  const slot = $(toy ? '#toySlot' : '#compactSlot');
  if ($('#sceneWrap').parentElement !== slot) slot.appendChild($('#sceneWrap'));
}
function sickLine() {
  const d = Rules.DISEASES[S.disease] || Rules.DISEASES.sporecough, n = Rules.dosesLeft(S);
  return `${d.name} (${d.sev}). Needs ${Rules.ITEMS[d.med].name}: ${n} dose${n === 1 ? '' : 's'}.`;
}
function renderStatus() {
  if (OV !== 'status') return;
  $('#stName').textContent = Rules.fullName(S);
  $('#stRace').textContent = S.race && Rules.RACES[S.race] ? Rules.RACES[S.race].name + (Rules.RACES[S.race].rare ? ' ★' : '') : '–';
  const hm = Rules.healthyMax(S.stage);
  $('#stWeight').textContent = S.stage === 'seed' ? '–' : `${S.weight}g ${S.weight > hm ? '(heavy)' : '(healthy)'}`;
  hearts($('#stHunger'), S.stage === 'seed' ? 4 : S.hunger, 'Hunger');
  hearts($('#stHappy'), S.stage === 'seed' ? 4 : S.happy, 'Happy');
  $('#stDisc').style.width = S.discipline + '%'; $('#stDiscN').textContent = S.discipline + '%';
  $('#stMist').textContent = S.mistakes;
  let msg, ok = false;
  if (S.stage === 'seed') { msg = 'The seed is about to sprout.'; ok = true; }
  else if (S.call) msg = Rules.CALL_TEXT[S.call.reason];
  else if (S.sick) msg = sickLine();
  else if (S.poops.length) msg = 'There is poop to clean up.';
  else if (S.asleep) { msg = 'Bubby is sleeping soundly.'; ok = true; }
  else if (S.hunger <= 1) msg = 'Bubby is getting hungry.';
  else if (S.happy <= 1) msg = 'Bubby could use some fun.';
  else { msg = 'Bubby is doing fine.'; ok = true; }
  // The advice line doubles as the button that does it.
  const need = Rules.topNeed(S), c = $('#stCall');
  const go = !!need.act && need.tone !== 'ok' && need.tone !== 'calm';
  if (go) {
    const why = {
      meal: S.hunger <= 0 ? 'Bubby is starving!' : 'Bubby is getting hungry.',
      clean: 'There is poop to clean up.',
      med: sickLine(),
      play: S.happy <= 0 ? 'Bubby feels lonely.' : 'Bubby could use some fun.',
      lights: S.asleep ? 'Bubby fell asleep with the lights on.' : 'It\u2019s dark, but Bubby is awake.',
    }[need.act];
    if (why) msg = why;
  }
  c.textContent = go ? `${msg} \u25B8 ${need.label}` : msg;
  c.classList.toggle('ok', ok && !go); c.classList.toggle('go', go);
  c.disabled = !go; c.dataset.need = go ? need.act : '';
}
function hhmm(min) { const h = Math.floor(min / 60) % 24, m = Math.round(min % 60); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; }
function drawIcon(canvas, key) {
  const c = canvas.getContext('2d'); c.clearRect(0, 0, 16, 16);
  const img = art().ICONS[key]; if (img) c.drawImage(img, 0, 0);
}
const SMART_ICON = { meal: 'meal', play: 'play', clean: 'clean', med: 'med', lights: 'lights', scold: 'scold', replant: 'catch', resume: 'play' };
let lastSmart = '';

function renderUI() {
  if (!S) return;
  const P = Rules.pace(S);
  $('#sub').textContent = `Gen ${S.gen} · ${S.ended ? 'New seed' : Rules.fullName(S)} · Day ${Rules.dayNumber(S)}`;
  renderPoints();
  const low = n => n <= 1 && S.stage !== 'seed' && !S.ended;
  $('#mHunger').parentElement.classList.toggle('low', low(hearts($('#mHunger'), S.stage === 'seed' ? 4 : S.hunger, 'Hunger')));
  $('#mHappy').parentElement.classList.toggle('low', low(hearts($('#mHappy'), S.stage === 'seed' ? 4 : S.happy, 'Happy')));
  $('#photoSub').textContent = $('#sub').textContent;
  renderStatus();
  $('#mDisc').style.width = S.discipline + '%'; $('#mDiscN').textContent = S.discipline + '%';
  const hm = Rules.healthyMax(S.stage);
  $('#mWeight').textContent = S.stage === 'seed' ? '–' : `${S.weight}g${S.weight > hm ? ' (heavy)' : ''}`;
  $('#mMist').textContent = S.mistakes;

  // Smart button
  const need = Rules.topNeed(S);
  const smart = $('#smart');
  const key = need.act + need.label + need.tone;
  if (key !== lastSmart) {
    lastSmart = key;
    smart.dataset.tone = need.tone; smart.dataset.do = need.act || '';
    smart.setAttribute('aria-disabled', String(!need.act));
    $('#smartLabel').textContent = need.label;
    $('#smartHint').textContent = need.act ? (need.happy ? 'All hearts full. Fancy a game?' : 'Press Enter') : (S.call ? 'Check its hearts. Is it acting out?' : 'Nothing to do right now');
    drawIcon($('#smartIcon'), SMART_ICON[need.act] || (S.call ? 'scold' : (S.asleep ? 'lights' : 'catch')));
  }
  // Dots on the action buttons that would help right now
  const needs = { feed: S.hunger <= 1, clean: S.poops.length > 0, med: S.sick, lights: (S.asleep && S.lights) || (!S.asleep && !S.lights), play: S.happy <= 1 && !S.sick };
  const live = !S.ended && S.stage !== 'seed' && !S.paused;
  $$('.act').forEach(b => b.classList.toggle('need', live && !!needs[b.dataset.act]));
  $$('[data-act="lights"]').forEach(b => b.classList.toggle('on', S.lights));

  for (const b of [$('#btnPause'), ...$$('[data-act="pause"]')]) {
    b.setAttribute('aria-pressed', String(!!S.paused));
    b.setAttribute('aria-label', S.paused ? 'Resume' : 'Pause');
  }
  $('#ovPause').hidden = !S.paused;
  if (!S.ended) $('#ovEnd').hidden = true;

  // Footer: what happens next
  let foot;
  if (S.ended) foot = 'A new generation is ready to begin.';
  else if (S.paused) foot = 'Paused. Bubby won’t get hungry while you’re away.';
  else if (!P.clock) foot = 'Quick pace · time stops when this window closes';
  else {
    const left = P.dur[S.stage] - S.stageT;
    const grow = Rules.STAGE[S.stage].next || S.stage === 'seed' ? `Grows up in ${fmtDur(Math.max(60000, left * 1000))}` : `Elder years: ${fmtDur(Math.max(60000, left * 1000))} left`;
    foot = `${P.label} · ${S.asleep ? `asleep until ${hhmm(S.cfg.wake)}` : `bedtime ${hhmm(S.cfg.bed)}`} · ${grow}`;
  }
  $('#foot').textContent = foot;
  $('#photoFoot').textContent = foot.split(' \u00b7 ').join('\n');
}

/* ---------------- Points ---------------- */
let lastPts = null;
function renderPoints() {
  $$('[data-pts]').forEach(e => { e.textContent = S.points; });
  const sp = $('#shopPts'); if (sp) sp.textContent = `★ ${S.points} point${S.points === 1 ? '' : 's'}`;
  if (lastPts !== null && S.points > lastPts) {
    const n = S.points - lastPts;
    $$('[data-gain]').forEach(g => { g.textContent = `+${n}`; g.classList.remove('show'); void g.offsetWidth; g.classList.add('show'); });
  }
  lastPts = S.points;
}

/* ---------------- Medicine cabinet and pantry: one item at a time on the small screen ---------------- */
let PICK = { mode: 'med', ids: [], i: 0 };
function iconCanvas(id) {
  const c = document.createElement('canvas'); c.width = c.height = 16; drawIcon(c, id);
  return c;
}
function openPick(mode) {
  const ids = Rules.pickIds(S, mode);
  if (!ids.length) return;
  // Start on the medicine that fits the illness
  const best = mode === 'med' && S.sick ? ids.indexOf(Rules.bestMed(S)) : -1;
  PICK = { mode, ids, i: Math.max(0, best) };
  showOv('pick'); renderPick();
}
function renderPick() {
  const ids = PICK.ids = Rules.pickIds(S, PICK.mode);
  if (!ids.length) { closeOverlays(); renderPantry(); return; }
  PICK.i = ((PICK.i % ids.length) + ids.length) % ids.length;
  const id = ids[PICK.i], isTea = id === 'tea', it = isTea ? Rules.TEA : Rules.ITEMS[id], med = PICK.mode === 'med';
  const d = S.sick ? (Rules.DISEASES[S.disease] || Rules.DISEASES.sporecough) : null, note = $('#pickNote');
  $('#pickTitle').textContent = med ? 'Medicine' : 'Pantry';
  $('#pickCount').textContent = `${PICK.i + 1} of ${ids.length}`;
  if (med) {
    const n = d ? Rules.dosesLeft(S) : 0;
    note.textContent = d ? `${d.name}: needs ${Rules.ITEMS[d.med].name} ×${n}` : S.immuneT > 0 ? 'Healthy and protected.' : 'Bubby is healthy.';
    note.classList.toggle('ok', !d);
  }
  note.hidden = !med;
  const rec = med && d && (id === d.med || id === 'elixir' || (isTea && d.med === 'syrup'));
  const card = $('#pickCard'); card.textContent = '';
  card.classList.toggle('rec', !!rec);
  card.appendChild(iconCanvas(id));
  const info = document.createElement('div');
  info.innerHTML = `<b>${it.name}${isTea ? '' : ` ×${S.inv[id]}`}${rec ? ' <span class="tag">★</span>' : ''}</b><small>${shortDesc(id, it)}</small>`;
  card.appendChild(info);
  $('#pickUse').textContent = med ? (id === 'shield' ? 'Drink' : 'Give') : 'Feed';
  $$('#ovPick [data-pick]').forEach(b => { b.disabled = ids.length < 2; });
}
// One short line for the small screen (the shop has the full text)
function shortDesc(id, it) {
  if (id === 'tea') return `Free. ${Rules.DISEASES[Rules.TEA.cures[0]].name}, 2 cups`;
  if (it.kind === 'food') return [it.hunger && `+${it.hunger} hunger`, it.happy && `+${it.happy} happy`].filter(Boolean).join(' ');
  if (id === 'elixir') return 'Cures any illness';
  if (id === 'shield') return 'Protects from illness';
  return `Cures ${Rules.DISEASES[it.cures[0]].name}`;
}
function usePick() {
  const id = PICK.ids[PICK.i];
  if (!id || G) return;
  closeOverlays();
  const poops = S.poops.length;
  applyResult(Rules.useItem(S, id, Date.now()), poops);
}
function renderPantry() {
  const ids = Rules.pickIds(S, 'food'), b = $('#btnPantry');
  b.hidden = !ids.length;
  b.textContent = `Pantry (${ids.reduce((a, id) => a + (S.inv[id] || 0), 0)})`;
  $('#pantryHint').hidden = ids.length > 0;
}

/* ---------------- Shop, daily quests, goals and the Bubbydex ---------------- */
let SHOP_TAB = 'shop';
function openShop(tab) {
  if (G) return toast('Finish the game first');
  closeOverlays();
  if (tab) SHOP_TAB = tab;
  $('#shopMsg').textContent = '';
  renderShop();
  $('#viewMain').hidden = true; $('#viewSettings').hidden = true; $('#viewShop').hidden = false;
  $('#btnShopBack').focus();
}
function closeShop() { $('#viewShop').hidden = true; $('#viewMain').hidden = false; renderUI(); }
function copyCanvas(src) {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}
function shopRow(id) {
  const it = Rules.ITEMS[id], n = S.inv[id] || 0, row = document.createElement('div');
  row.className = 'shop-row';
  row.appendChild(iconCanvas(id));
  const info = document.createElement('div');
  const lore = Rules.loreOf(id);
  info.innerHTML = `<b>${it.name}</b><small>${it.desc}${n ? ` · you have ${n}` : ''}</small>${lore ? `<small class="lore">${lore}</small>` : ''}`;
  row.appendChild(info);
  const b = document.createElement('button');
  b.className = 'buy'; b.dataset.buy = id;
  b.textContent = n >= Rules.MAX_STACK ? 'Full' : `${it.price} pts`;
  b.disabled = n >= Rules.MAX_STACK || S.points < it.price;
  b.setAttribute('aria-label', `Buy ${it.name} for ${it.price} points`);
  row.appendChild(b);
  return row;
}
function renderShop() {
  renderPoints();
  $$('#shopTabs [data-tab]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tab === SHOP_TAB)));
  const body = $('#shopBody'); body.textContent = '';
  const P = Rules.PTS, C = Rules.CAPS;
  if (SHOP_TAB === 'shop') {
    for (const [title, ids] of [['Better food', Rules.foodIds()], ['Medicine', Rules.medIds().filter(k => k !== 'shield')], ['Protection', ['shield']]]) {
      const sec = document.createElement('section'); sec.className = 'shop-sec';
      sec.innerHTML = `<h3>${title}</h3>`;
      ids.forEach(id => sec.appendChild(shopRow(id)));
      body.appendChild(sec);
    }
    const tip = document.createElement('p'); tip.className = 'note';
    tip.textContent = `Every illness needs its own medicine. Garden Tea is free and always in the cabinet, but it only cures ${Rules.DISEASES.sporecough.name}, slowly. Points are earned by caring for Bubby and are never sold. ${Rules.DISCLAIMER}`;
    body.appendChild(tip);
  } else if (SHOP_TAB === 'today') {
    const Q = Rules.ensureQuests(S, Date.now()), d = Rules.ptsDay(S, Date.now());
    const sec = document.createElement('section'); sec.className = 'shop-sec';
    sec.innerHTML = `<h3>Daily quests</h3>`;
    for (const q of Q.list) {
      const r = document.createElement('div'); r.className = 'quest' + (q.done ? ' done' : '');
      r.innerHTML = `<span>${q.done ? '✓ ' : ''}${q.text}</span><small>${q.have}/${q.need} · +${P.quest} pts</small>`;
      sec.appendChild(r);
    }
    const bonus = document.createElement('p'); bonus.className = 'note';
    bonus.textContent = `Finish all three for +${P.questAll} bonus points. New quests every day.`;
    sec.appendChild(bonus);
    body.appendChild(sec);
    const ways = document.createElement('section'); ways.className = 'shop-sec';
    ways.innerHTML = `<h3>Ways to earn</h3><ul class="earn">
      <li><b>Open Bubby each day:</b> ${P.daily} pts, plus ${P.streakStep} per streak day (up to ${P.daily + P.streakStep * P.streakSteps}). Streak bonuses at 3, 7, 14 and 30 days. Streak now: ${S.streak || 0}.</li>
      <li><b>Care</b> (${d.care}/${C.care} today): meal or snack ${P.meal}, shop food ${P.premium}, each poop cleaned ${P.clean}, a good night's sleep ${P.sleep}, scolding a tantrum ${P.scold}.</li>
      <li><b>Games</b> (${d.game}/${C.game} today): Which way? ${P.guess} per right guess, +${P.guessPerfect} for 5/5. Seed catch: 1 per ${P.catchDiv} score, +${P.catchBest} for a new best.</li>
      <li><b>Curing an illness:</b> ${P.cure} pts.</li>
      <li><b>Growing up:</b> Bud ${P.bud}, Blossom ${P.blossom}, Elder ${P.elder}, a full life ${P.garden}. A rare Starling ${P.rare}.</li>
      <li><b>Bubbydex:</b> a new race ${P.dexRace}, a new adult form ${P.dexForm}.</li>
      <li><b>Goals:</b> one-time rewards, see the Goals tab.</li></ul>`;
    body.appendChild(ways);
  } else if (SHOP_TAB === 'goals') {
    const sec = document.createElement('section'); sec.className = 'shop-sec';
    const done = Rules.GOALS.filter(g => S.ach[g.id]).length;
    sec.innerHTML = `<h3>Goals <small>${done} / ${Rules.GOALS.length}</small></h3>`;
    for (const g of Rules.GOALS) {
      const got = !!S.ach[g.id], v = Math.min(g.of, g.val(S)), r = document.createElement('div');
      r.className = 'quest' + (got ? ' done' : '');
      r.innerHTML = `<span>${got ? '✓ ' : ''}<b>${g.name}</b> · ${g.desc}</span><small>${got ? 'Done' : `${v}/${g.of}`} · +${g.pts} pts</small>`;
      sec.appendChild(r);
    }
    body.appendChild(sec);
  } else {
    const sec = document.createElement('section'); sec.className = 'shop-sec';
    sec.innerHTML = `<h3>Bubbydex <small>${Rules.dexFound(S)} / ${Rules.DEX_TOTAL}</small></h3>
      <p class="note">When a Bulb grows into a Bud it becomes a random race. One race is very rare (${Math.round(Rules.rareChance(S) * 100)}% for your next Bud, and it grows with every miss). Raise each race to every adult form to fill the dex.</p>`;
    for (const [id, r] of Object.entries(Rules.RACES)) {
      const seen = S.dex.includes(id), row = document.createElement('div');
      row.className = 'dex-row' + (r.rare ? ' rare' : '');
      row.innerHTML = `<b>${seen ? r.name + (r.rare ? ' ★' : '') : '???'}<small>${r.rare ? 'Very rare' : seen ? 'Race found' : 'Not found yet'}</small></b>`;
      for (const [v, vn] of Rules.TIERS) {
        const got = S.dex.includes(`${id}:${v}`), f = document.createElement('figure');
        f.className = got ? '' : 'locked';
        f.appendChild(copyCanvas(petSprite('adult', { variant: v, race: id, mood: 'normal' })));
        f.insertAdjacentHTML('beforeend', `<figcaption>${got ? vn : '?'}</figcaption>`);
        row.appendChild(f);
      }
      sec.appendChild(row);
    }
    body.appendChild(sec);
  }
}
function buyItem(id) {
  const r = Rules.buy(S, id, Date.now());
  const news = S.events.filter(e => e.id > shownSeq && e.type === 'pts').map(e => e.text);
  $('#shopMsg').textContent = [r.msg, ...news].join(' ');
  shownSeq = S.evSeq;
  if (r.ok) beep(988, .06);
  persist(); renderShop();
}

/* ---------------- Settings ---------------- */
function toMin(v) { const [h, m] = v.split(':').map(Number); return h * 60 + m; }
function renderSettings() {
  const box = $('#paces');
  box.textContent = '';
  for (const [id, p] of Object.entries(Rules.PACES).reverse()) {
    const l = document.createElement('label'); l.className = 'pace';
    l.innerHTML = `<input type="radio" name="pace" value="${id}"><b>${p.label}</b><small>${p.blurb}</small>`;
    l.querySelector('input').checked = S.cfg.pace === id;
    box.appendChild(l);
  }
  $$('input[name="look"]').forEach(r => { r.checked = r.value === (S.cfg.look === 'compact' ? 'compact' : 'toy'); });
  $('#inBed').value = hhmm(S.cfg.bed); $('#inWake').value = hhmm(S.cfg.wake);
  $('#inNotify').checked = S.cfg.notify !== false; $('#inSound').checked = S.cfg.sound !== false;
  const clock = Rules.pace(S).clock;
  $('#grpBed').disabled = !clock;
  $('#inNotify').disabled = !clock;
  $('#devSkip').hidden = !S.cfg.dev; // test tool only: bubby.dev(true) in the service worker console
  $$('[data-skip]').forEach(b => { b.disabled = !clock || !!S.ended || S.paused; });
}
function openSettings() { closeOverlays(); G = null; renderSettings(); $('#viewMain').hidden = true; $('#viewSettings').hidden = false; $('#btnBack').focus(); }
function closeSettings() { $('#viewSettings').hidden = true; $('#viewMain').hidden = false; resetBox(); renderUI(); }
const RESET_HTML = '<button class="chip" id="btnTestNote">Test notification</button><button class="chip danger" id="btnReset">Start over</button>';
function resetBox() { $('#resetBox').innerHTML = RESET_HTML; }

function skipAhead(hours) {
  const before = S.evSeq, ms = hours * 3600 * 1000;
  S.lastT -= ms;
  Rules.advance(S, Date.now()); // simulate as if the popup had been closed
  shownSeq = S.evSeq;
  closeSettings();
  const evs = S.events.filter(e => e.id > before);
  if (S.ended) showEnd(); else showAway(evs, ms);
  persist(); renderUI();
}

/* ---------------- Wiring ---------------- */
function wire() {
  $('#viewMain').addEventListener('click', e => {
    const t = e.target;
    const act = t.closest('[data-act]'); if (act) return runAction(act.dataset.act);
    const pk = t.closest('[data-pick]'); if (pk) { PICK.i += +pk.dataset.pick; return renderPick(); }
    if (t.closest('[data-use]')) return usePick();
    if (t.closest('[data-pantry]')) return openPick('food');
    if (t.closest('[data-shop]')) return openShop('shop');
    if (t.closest('[data-close]')) return closeOverlays();
    const d = t.closest('[data-do]'); if (d && d.id !== 'smart') return runAction(d.dataset.do);
    const g = t.closest('[data-g]'); if (g) return guess(+g.dataset.g);
    const pg = t.closest('[data-game]'); if (pg) return startGame(pg.dataset.game);
  });
  $('#smart').addEventListener('click', () => { const a = $('#smart').dataset.do; if (a) runAction(a); });
  $('#btnPause').addEventListener('click', () => runAction('pause'));
  $('#btnSettings').addEventListener('click', openSettings);
  $('#btnSettingsPhoto').addEventListener('click', openSettings);
  $('#btnShop').addEventListener('click', () => openShop());
  $('#btnShopPhoto').addEventListener('click', () => openShop());
  $('#btnShopBack').addEventListener('click', closeShop);
  $('#shopTabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { SHOP_TAB = b.dataset.tab; $('#shopMsg').textContent = ''; renderShop(); } });
  $('#shopBody').addEventListener('click', e => { const b = e.target.closest('[data-buy]'); if (b) buyItem(b.dataset.buy); });
  $('#stCall').addEventListener('click', () => { const a = $('#stCall').dataset.need; closeOverlays(); if (a) runAction(a); });
  $('#looks').addEventListener('change', e => { if (e.target.name === 'look') { S.cfg.look = e.target.value; applyLook(); persist(); } });
  $('#btnBack').addEventListener('click', closeSettings);
  $('#btnAwayOk').addEventListener('click', () => closeOverlays());
  $('#btnReplant').addEventListener('click', replant);

  // Settings
  $('#paces').addEventListener('change', e => {
    if (e.target.name !== 'pace') return;
    Rules.setPace(S, e.target.value); S.lastT = Date.now();
    persist(); renderSettings(); toast(`${Rules.PACES[S.cfg.pace].label} pace`);
  });
  $('#inBed').addEventListener('change', e => { if (e.target.value) { S.cfg.bed = toMin(e.target.value); S.cfg.bedAsked = true; persist(); } });
  $('#inWake').addEventListener('change', e => { if (e.target.value) { S.cfg.wake = toMin(e.target.value); S.cfg.bedAsked = true; persist(); } });
  $('#inNotify').addEventListener('change', e => { S.cfg.notify = e.target.checked; persist(); });
  $('#inSound').addEventListener('change', e => { S.cfg.sound = e.target.checked; if (S.cfg.sound) { unlockAudio(); beep(880, .05); } persist(); });
  $$('[data-skip]').forEach(b => b.addEventListener('click', () => { if (S.cfg.dev) skipAhead(+b.dataset.skip); }));
  $('#resetBox').addEventListener('click', e => {
    const id = e.target.id;
    if (id === 'btnTestNote') {
      if (port) port.postMessage({ type: 'test-notify' });
      e.target.textContent = 'Sent! Check your notifications';
    } else if (id === 'btnReset') {
      $('#resetBox').innerHTML = '<button class="chip danger" id="btnResetYes">Yes, lose this Bubby</button><button class="chip" id="btnResetNo">Keep Bubby</button>';
      $('#btnResetNo').focus();
    } else if (id === 'btnResetYes') {
      S = Rules.nextLife(S, 1, Date.now()); A = null; G = null; shownSeq = S.evSeq;
      persist(); closeSettings(); toast('A new seed is planted');
    } else if (id === 'btnResetNo') resetBox();
  });

  // Keyboard
  const KEYS = { f: 'feed', p: 'play', c: 'clean', l: 'lights', m: 'med', d: 'scold', s: 'status', a: 'attn' };
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (!$('#viewSettings').hidden) { if (e.key === 'Escape') { e.preventDefault(); closeSettings(); } return; }
    if (!$('#viewShop').hidden) { if (e.key === 'Escape') { e.preventDefault(); closeShop(); } return; }
    const k = e.key.toLowerCase();
    if (k === 'b') { e.preventDefault(); return openShop(); }
    if (OV === 'pick' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); PICK.i += e.key === 'ArrowLeft' ? -1 : 1; return renderPick(); }
    if (G && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      if (G.type === 'catch') { G.hold = e.key === 'ArrowLeft' ? -1 : 1; G.target = null; } else guess(e.key === 'ArrowLeft' ? -1 : 1);
      return;
    }
    if (e.key === 'Escape') { if (OV && OV !== 'game') { e.preventDefault(); closeOverlays(); } return; }
    if (OV === 'feed' && (k === '1' || k === '2')) return runAction(k === '1' ? 'meal' : 'snack');
    if (OV === 'play' && (k === '1' || k === '2')) return startGame(k === '1' ? 'guess' : 'catch');
    if (e.key === 'Enter' && !(e.target.closest && e.target.closest('button'))) { e.preventDefault(); $('#smart').click(); return; }
    if (KEYS[k]) runAction(KEYS[k]);
  });
  document.addEventListener('keyup', e => {
    if (G && G.type === 'catch' && ((e.key === 'ArrowLeft' && G.hold < 0) || (e.key === 'ArrowRight' && G.hold > 0))) G.hold = 0;
  });

  // Seed catch: hold the arrow buttons, or drag on the garden
  const holdOn = d => e => { if (G && G.type === 'catch') { e.preventDefault(); G.hold = d; G.target = null; } };
  const holdOff = () => { if (G && G.type === 'catch') G.hold = 0; };
  [['#gLeft', -1], ['#gRight', 1]].forEach(([id, d]) => {
    const b = $(id);
    b.addEventListener('pointerdown', holdOn(d));
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, holdOff));
  });
  let steering = false;
  const steer = e => {
    if (!G || G.type !== 'catch') return;
    const r = scene.getBoundingClientRect();
    G.target = clamp((e.clientX - r.left) / r.width * SW, 13, 87);
  };
  scene.addEventListener('pointerdown', e => { if (G && G.type === 'catch') { steering = true; steer(e); try { scene.setPointerCapture(e.pointerId); } catch (_) {} } });
  scene.addEventListener('pointermove', e => { if (steering) steer(e); });
  ['pointerup', 'pointercancel'].forEach(ev => scene.addEventListener(ev, () => { steering = false; if (G && G.type === 'catch') G.target = null; }));

  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
  window.addEventListener('pagehide', persist);
}

/* ---------------- Main loop ---------------- */
let lastFrame = performance.now(), uiT = 0, saveT = 0, prevBlink = false;
function frame(nowP) {
  const rdt = Math.min(.25, Math.max(0, (nowP - lastFrame) / 1000)); lastFrame = nowP;
  Rules.advance(S, Date.now(), document.hidden ? null : { game: !!G, busy: !!A });
  if (A && !S.paused) { A.t += rdt; if (A.t >= A.dur) { const f = A.after; A = null; if (f) f(); } }
  if (!S.paused) { updateGame(rdt); updatePet(rdt); }
  handleEvents();
  drawScene(ctx, S, A, G, PET, nowP / 1000);
  if (toastT > 0) { toastT -= rdt; if (toastT <= 0) $toast.hidden = true; }
  const blinkOn = !!S.call && !S.ended && ((nowP / 1000 * 2.5) | 0) % 2 === 0;
  if (blinkOn !== prevBlink) { prevBlink = blinkOn; const t = $('.tile[data-act="attn"]'); if (t) t.classList.toggle('alert', blinkOn); }
  uiT += rdt; saveT += rdt;
  if (uiT > .25) { uiT = 0; Rules.checkGoals(S, Date.now()); renderUI(); }
  if (saveT > 1.5) { saveT = 0; persist(); }
  requestAnimationFrame(frame);
}

async function boot() {
  S = await loadState();
  const now = Date.now();
  const seenBefore = S.seenSeq || 0, lastSeen = S.lastSeenAt || 0;
  Rules.advance(S, now); // catch up on the time Bubby spent alone
  const ci = Rules.checkIn(S, now); // opening Bubby on a new day pays points and keeps the streak
  Rules.checkGoals(S, now);
  shownSeq = S.evSeq;
  const ciText = !ci.newDay ? '' : `${ci.gift ? 'Bubby missed you! Daily gift: +1 heart and ' : 'Daily bonus: '}+${ci.daily} pts. Streak: ${S.streak} day${S.streak === 1 ? '' : 's'}${ci.mile ? `. ${ci.mile}-day bonus +${ci.milePts}!` : ''}`;

  const a = art();
  HEART = { full: a.HEART_FULL.toDataURL(), empty: a.HEART_EMPTY.toDataURL() };
  $$('canvas[data-icon]').forEach(c => drawIcon(c, c.dataset.icon));
  buildTiles();
  applyLook();
  wire();
  renderUI();

  const away = S.events.filter(e => e.id > seenBefore);
  if (S.ended) showEnd();
  else if (!lastSeen && S.stage === 'seed') toast(`A seed! It sprouts in a minute. ${ciText}`.trim());
  else if (away.length && (!lastSeen || now - lastSeen > 2 * 60 * 1000)) {
    const goAway = () => showAway(away, now - (lastSeen || S.born || now));
    const rareAway = away.filter(e => e.type === 'evolve' && e.rare).pop();
    if (rareAway) {
      // The reveal first (the away card would cover it), then the summary
      A = { ...evolveAnim(rareAway), after: goAway };
      toast(rareAway.text + (ciText ? ' · ' + ciText : ''));
    } else {
      goAway();
      const grew = away.filter(e => e.type === 'evolve').pop();
      if (grew) A = evolveAnim(grew);
      if (ciText) toast(ciText);
    }
  } else if (ciText && lastSeen) toast(ciText);
  // A rare reveal always plays, even when Bubby grew up only a minute after you closed it (no away card then)
  const rareNews = away.filter(e => e.type === 'evolve' && e.rare).pop();
  if (rareNews && !A && !S.ended) { A = evolveAnim(rareNews); toast(rareNews.text); }
  persist();
  connect();
  requestAnimationFrame(t => { lastFrame = t; frame(t); });
}
boot();
