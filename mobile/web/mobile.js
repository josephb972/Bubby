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
import { advance, needKey, pace, stageName } from '../core/rules.js';
import { NEED_COPY, DAILY_LIMIT, MIN_GAP, dayKey } from '../core/notes.js';

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
  const notif = { ...S.notif, lastKey: needKey(S) }; // what's on screen now has been seen
  let seq = S.evSeq;
  for (let t = now + CHECK; t <= now + HORIZON && out.length < MAX_NOTES; t += CHECK) {
    advance(S, t);
    const evs = S.events.filter(e => e.id > seq);
    seq = S.evSeq;
    const end = evs.find(e => e.type === 'end');
    if (end) { out.push({ at: t, title: end.text, body: `A new seed is waiting for you. Generation ${S.gen + 1} starts when you plant it.` }); break; }
    const grew = evs.filter(e => e.type === 'evolve').pop();
    if (grew) out.push({ at: t, title: grew.text, body: `Come and see Bubby the ${stageName(S)}.` });

    const key = needKey(S);
    if (!key) { notif.lastKey = null; continue; }
    if (key === notif.lastKey) continue;
    const today = dayKey(t);
    if (notif.day !== today) { notif.day = today; notif.count = 0; }
    const quiet = S.asleep && key !== 'sleep';
    if (quiet || notif.count >= DAILY_LIMIT || t - (notif.lastAt || 0) < MIN_GAP) continue;
    notif.lastKey = key; notif.lastAt = t; notif.count++;
    const copy = NEED_COPY[key];
    out.push({ at: t, title: copy.title, body: key === 'sick' && S.doses > 1 ? `It needs ${S.doses} doses of medicine.` : copy.message });
  }
  return out;
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
    const back = document.querySelector('#viewSettings:not([hidden]) #btnBack');
    if (back) return back.click();
    const close = [...document.querySelectorAll('.ov:not([hidden]) [data-close]')][0];
    if (close) return close.click();
    AppPlugin.minimizeApp();
  });
}

/* ---------------- Fit the toy pod to the phone screen ---------------- */
// The popup is designed at a fixed size (468×600 toy pod, 360 wide compact look and settings). Scale it as a whole
// (CSS zoom, see mobile.css) to fit the screen, without changing the design.
function fit() {
  const body = document.body, app = document.getElementById('app');
  if (!body || !app) return;
  const toy = body.classList.contains('toy');
  const main = document.getElementById('viewSettings').hidden;
  const cs = getComputedStyle(document.documentElement);
  const px = n => parseFloat(cs.getPropertyValue(n)) || 0;
  const availW = innerWidth - px('--safe-l') - px('--safe-r') - 12;
  const availH = innerHeight - px('--safe-t') - px('--safe-b') - 12;
  let z = availW / (toy ? 468 : 360);
  if (toy && main) z = Math.min(z, availH / 600); // the whole pod on screen at once
  z = Math.max(0.5, Math.min(z, 3));
  const root = document.documentElement, v = z.toFixed(4);
  if (root.style.getPropertyValue('--fit') !== v) root.style.setProperty('--fit', v);
  root.classList.toggle('scrolls', !(toy && main));
}
addEventListener('resize', fit);
addEventListener('DOMContentLoaded', () => {
  fit();
  const watch = new MutationObserver(fit);
  watch.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  watch.observe(document.getElementById('viewSettings'), { attributes: true, attributeFilter: ['hidden'] });
  watch.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] }); // safe-area sizes arrive late
  setupNotifications();
});
