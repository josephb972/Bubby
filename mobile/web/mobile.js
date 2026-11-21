// Bubby on Android: runs the extension's popup as the whole app.
//
// The popup expects a few browser-extension APIs. This file provides phone versions of them:
//   chrome.storage.local  -> the WebView's localStorage (kept by Android until the app is uninstalled)
//   chrome.action.*       -> nothing (there is no toolbar on a phone)
//   chrome.runtime.connect-> a local "port"; its "test-notify" message sends a real notification
// The extension's background worker wakes every minute to send notifications. A phone app can't do that, so when the
// app goes to the background we look ahead with the same game rules, work out when Bubby will need you, and schedule
// those notifications with Android. When the app comes back they are cancelled and the live game takes over again.
//
// Loaded as a module before popup.js, so `chrome` exists by the time the popup starts.
import { advance, needKey, pace } from '../core/rules.js';
import { pickNotes } from '../core/notes.js';

const KEY = 'bubby';
const Cap = window.Capacitor;
const Notes = Cap && Cap.Plugins && Cap.Plugins.LocalNotifications;
const AppPlugin = Cap && Cap.Plugins && Cap.Plugins.App;
document.documentElement.classList.add('mobile');

/* ---------------- Browser-extension API stand-ins ---------------- */
const ok = v => Promise.resolve(v);
globalThis.chrome = {
  storage: {
    local: {
      get(key) {
        try { const raw = localStorage.getItem(KEY); return ok(key === KEY && raw ? { [KEY]: JSON.parse(raw) } : {}); }
        catch (e) { return ok({}); }
      },
      set(obj) {
        if (obj && KEY in obj) { try { localStorage.setItem(KEY, JSON.stringify(obj[KEY])); } catch (e) { /* full: keep going */ } }
        return ok();
      },
    },
  },
  action: { setBadgeText: ok, setTitle: ok, setBadgeBackgroundColor: ok, setBadgeTextColor: ok, setIcon: ok },
  runtime: {
    id: 'bubby-android',
    getURL: p => new URL('../' + p, location.href).href,
    connect() {
      return {
        postMessage(msg) { if (msg && msg.type === 'test-notify') testNotification(); },
        onMessage: { addListener() {} },
        onDisconnect: { addListener() {} },
      };
    },
    sendMessage: () => ok({ ok: false }),
  },
};

function loadSaved() {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}

/* ---------------- Notifications ---------------- */
const CHANNEL = 'bubby';
const HORIZON = 36 * 3600 * 1000;   // how far ahead to plan
const CHECK = 2 * 60 * 1000;         // how often the plan checks Bubby (the extension checks every minute)
const MAX_NOTES = 12;
let ids = 1;

// Look ahead with the real game rules and return the notifications the extension would have sent.
// Bubby's life has some luck in it (sickness, tantrums), so this is a forecast: the live game catches up exactly
// when the app is opened again.
export function plan(saved, now = Date.now()) {
  if (!saved || !saved.cfg || saved.cfg.notify === false || saved.paused || saved.ended) return [];
  const S = structuredClone(saved);
  if (!pace(S).offline) return [];
  const out = [];
  S.notif.lastKey = needKey(S); // what's on screen now has been seen
  let seq = S.evSeq;
  for (let t = now + CHECK; t <= now + HORIZON && out.length < MAX_NOTES; t += CHECK) {
    advance(S, t);
    const evs = S.events.filter(e => e.id > seq);
    seq = S.evSeq;
    for (const n of pickNotes(S, evs, t)) out.push({ at: t, title: n.title, body: n.message });
    if (S.ended) break;
  }
  return out.slice(0, MAX_NOTES);
}

async function clearAll() {
  if (!Notes) return;
  try {
    const { notifications = [] } = await Notes.getPending();
    if (notifications.length) await Notes.cancel({ notifications: notifications.map(n => ({ id: n.id })) });
  } catch (e) { console.warn('[Bubby] cancel', e); }
}

async function scheduleAhead() {
  if (!Notes) return;
  await clearAll();
  const saved = loadSaved();
  const list = plan(saved);
  if (!list.length) return;
  const silent = saved.cfg.sound === false;
  try {
    await Notes.schedule({
      notifications: list.map(n => ({
        id: ids++, title: n.title, body: n.body, channelId: CHANNEL,
        schedule: { at: new Date(n.at), allowWhileIdle: true },
        smallIcon: 'ic_stat_bubby', iconColor: '#3d7f48', silent,
      })),
    });
  } catch (e) { console.warn('[Bubby] schedule', e); }
}

async function testNotification() {
  if (!Notes) return;
  if (!(await askPermission())) return;
  await Notes.schedule({ notifications: [{
    id: ids++, channelId: CHANNEL, smallIcon: 'ic_stat_bubby', iconColor: '#3d7f48',
    title: 'Bubby says hi!', body: 'Notifications work. Bubby will only ping you when it really needs you.',
    schedule: { at: new Date(Date.now() + 1500), allowWhileIdle: true },
  }] });
}

async function askPermission() {
  try {
    let p = await Notes.checkPermissions();
    if (p.display === 'prompt' || p.display === 'prompt-with-rationale') p = await Notes.requestPermissions();
    return p.display === 'granted';
  } catch (e) { return false; }
}

async function setupNotifications() {
  if (!Notes) return;
  try {
    await Notes.createChannel({ id: CHANNEL, name: 'Bubby needs you', description: 'When Bubby is hungry, lonely, sick or grows up', importance: 4, visibility: 1 });
  } catch (e) { /* older Android: no channels */ }
  await askPermission();
  await clearAll(); // the app is open: the live game is in charge
}

/* ---------------- Background and foreground ---------------- */
let hiddenAt = 0;
function wentAway() {
  if (hiddenAt) return;
  hiddenAt = Date.now();
  // popup.js saves on the same event; let it finish first, then plan from what it saved.
  window.dispatchEvent(new Event('pagehide'));
  setTimeout(scheduleAhead, 0);
}
function cameBack() {
  if (!hiddenAt) return;
  const away = Date.now() - hiddenAt;
  hiddenAt = 0;
  clearAll();
  // After a real break, reopen like the extension popup does, so you see "While you were away…".
  if (away > 2 * 60 * 1000) location.reload();
}
document.addEventListener('visibilitychange', () => (document.hidden ? wentAway() : cameBack()));
if (AppPlugin) {
  AppPlugin.addListener('pause', wentAway);
  AppPlugin.addListener('resume', cameBack);
  // Android back button: close settings or an overlay first, then leave the app (Bubby keeps living).
  AppPlugin.addListener('backButton', () => {
    if (!document.getElementById('viewName').hidden) return;   // a newborn needs a name first
    const back = document.querySelector('#viewSettings:not([hidden]) #btnBack, #viewShop:not([hidden]) #btnShopBack');
    if (back) return back.click();
    const close = [...document.querySelectorAll('.ov:not([hidden]) [data-close]')][0];
    if (close) return close.click();
    AppPlugin.minimizeApp();
  });
}

/* ---------------- Phone layout ---------------- */
// mobile.css lays out the screens; this works out two scales:
//   --uiz   text and controls (the popup is designed 360 wide; phones are 360–480 wide)
//   --podz  the toy pod artwork (468×600): as big as fits between the status bar and the bottom sheet
function fit() {
  const root = document.documentElement, app = document.getElementById('app');
  if (!app) return;
  const set = (k, v) => { if (root.style.getPropertyValue(k) !== v) root.style.setProperty(k, v); };
  const main = !document.getElementById('viewMain').hidden;
  root.classList.toggle('scrolls', !(main && app.classList.contains('toy')));
  set('--uiz', Math.min(1.25, Math.max(1, innerWidth / 360)).toFixed(4));
  const wrap = document.getElementById('photoWrap');
  if (main && app.classList.contains('toy') && wrap.clientHeight) {
    const cs = getComputedStyle(wrap);
    const w = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    set('--podz', Math.max(0.4, Math.min(w / 468, h / 600, 1.6)).toFixed(4));
  }
}
addEventListener('resize', fit);

/* ---------------- Mini-game pad ---------------- */
// On the pod, the game's ◀ ▶ buttons sit on the toy's small screen: hard to hit with a thumb. While a game is on,
// the bottom sheet becomes a game pad and the same two buttons move into it, big, one under each thumb. They are the
// game's own buttons (moved, not copied), so holding (Seed catch), tapping (Which way?) and disabling all still work.
// When the game ends they go back.
function gamePad() {
  const ov = document.getElementById('ovGame'), sheet = document.getElementById('compactWrap');
  const L = document.getElementById('gLeft'), R = document.getElementById('gRight');
  let pad = document.getElementById('mPad');
  if (!pad) {
    pad = document.createElement('div');
    pad.id = 'mPad'; pad.className = 'mpad'; pad.setAttribute('role', 'group'); pad.setAttribute('aria-label', 'Game controls');
    pad.addEventListener('contextmenu', e => e.preventDefault()); // a long press is a hold, not a menu
    sheet.appendChild(pad);
  }
  const on = !ov.hidden && document.getElementById('app').classList.contains('toy');
  if (on && L.parentElement !== pad) {
    pad.append(L, R);
    sheet.classList.add('gaming');
  } else if (!on && L.parentElement === pad) {
    const home = ov.querySelector('.g-bot');
    home.insertBefore(L, home.firstChild); home.appendChild(R);
    sheet.classList.remove('gaming');
  }
}

addEventListener('DOMContentLoaded', () => {
  fit();
  const watch = new MutationObserver(fit);
  watch.observe(document.getElementById('app'), { attributes: true, attributeFilter: ['class'] });
  const padWatch = new MutationObserver(gamePad);
  padWatch.observe(document.getElementById('ovGame'), { attributes: true, attributeFilter: ['hidden'] });
  padWatch.observe(document.getElementById('app'), { attributes: true, attributeFilter: ['class'] });
  for (const id of ['viewMain', 'viewSettings', 'viewShop', 'viewName']) watch.observe(document.getElementById(id), { attributes: true, attributeFilter: ['hidden'] });
  watch.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] }); // safe-area sizes arrive late
  new ResizeObserver(fit).observe(document.getElementById('compactWrap')); // the sheet's height decides the pod's
  // The suggestion button's keyboard hint becomes a touch one.
  const hint = document.getElementById('smartHint');
  const touchHint = () => { if (hint.textContent === 'Press Enter') hint.textContent = 'Tap to do it'; };
  new MutationObserver(touchHint).observe(hint, { childList: true, characterData: true, subtree: true });
  touchHint();
  setupNotifications();
});
