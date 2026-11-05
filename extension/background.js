// Bubby's background worker.
// Wakes once a minute, brings Bubby up to date, updates the toolbar icon and badge, and sends a
// notification when Bubby really needs you. While the popup is open, the popup runs the game instead.
import { advance, doAction, pace, needKey, stageName } from './core/rules.js';
import { loadState, saveState, updateAction } from './core/store.js';
import * as store from './core/store.js';

const ALARM = 'bubby-tick';
const NOTE = 'bubby-need';
const DAILY_LIMIT = 6;            // need notifications per day
const MIN_GAP = 40 * 60 * 1000;   // between two need notifications
let popupPort = null;

// Run state changes one at a time so two wake-ups never overwrite each other.
let chain = Promise.resolve();
const serial = fn => (chain = chain.then(fn).catch(e => console.error('[Bubby]', e)));

async function ensureAlarm() {
  if (!(await chrome.alarms.get(ALARM))) await chrome.alarms.create(ALARM, { periodInMinutes: 1, delayInMinutes: 0.5 });
}

chrome.runtime.onInstalled.addListener(details => serial(async () => {
  await ensureAlarm();
  const S = await loadState();
  advance(S, Date.now());
  await saveState(S);
  await updateAction(S);
  if (details.reason === 'install') chrome.tabs.create({ url: chrome.runtime.getURL('welcome/welcome.html') });
}));
chrome.runtime.onStartup.addListener(() => serial(async () => { await ensureAlarm(); await tick(); }));
chrome.alarms.onAlarm.addListener(a => { if (a.name === ALARM) serial(tick); });
ensureAlarm();

async function tick() {
  if (popupPort) return; // the open popup is driving the game
  const S = await loadState();
  advance(S, Date.now());
  await maybeNotify(S);
  await saveState(S);
  await updateAction(S);
}

/* ---------- Notifications ---------- */
const NEED_COPY = {
  hungry: { title: 'Bubby is hungry', message: 'Its tummy is empty. Feed it a meal before it gets upset.', buttons: [['meal', 'Feed a meal'], ['open', 'Open Bubby']] },
  sad:    { title: 'Bubby feels lonely', message: 'Play a game together, or cheer it up with a snack.', buttons: [['open', 'Play a game'], ['snack', 'Give a snack']] },
  sleep:  { title: 'Bubby fell asleep', message: 'The lights are still on. Turn them off so it can rest.', buttons: [['lights', 'Turn lights off'], ['open', 'Open Bubby']] },
  sick:   { title: 'Bubby feels sick', message: 'It needs medicine. Some sicknesses take a few doses.', buttons: [['med', 'Give medicine'], ['open', 'Open Bubby']] },
  dirty:  { title: 'Time to clean up', message: 'Bubby’s garden is getting dirty. Clean it before Bubby gets sick.', buttons: [['clean', 'Clean up'], ['open', 'Open Bubby']] },
};

function dayKey(ms) { const d = new Date(ms); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }

async function show(id, { title, message, buttons = [] }, S, silent) {
  S.notif.actions = buttons.map(b => b[0]);
  S.notif.actionsFor = id;
  await chrome.notifications.create(id, {
    type: 'basic', iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
    title, message, priority: 1, silent: !!silent || S.cfg.sound === false,
    buttons: buttons.map(b => ({ title: b[1] })),
  });
}

async function maybeNotify(S) {
  const now = Date.now();
  const newEvents = S.events.filter(e => e.id > S.notifiedSeq);
  S.notifiedSeq = S.evSeq;
  if (!S.cfg.notify || !pace(S).offline) return;

  // Milestones always get through.
  const end = newEvents.find(e => e.type === 'end');
  if (end) { await show('bubby-life', { title: end.text, message: `A new seed is waiting for you. Generation ${S.gen + 1} starts when you plant it.`, buttons: [['open', 'Open Bubby']] }, S); return; }
  const grew = newEvents.filter(e => e.type === 'evolve').pop();
  if (grew) await show('bubby-life', { title: grew.text, message: `Come and see Bubby the ${stageName(S)}.`, buttons: [['open', 'Open Bubby']] }, S);

  // Needs: one notification per new need, with a daily limit, a minimum gap, and quiet hours while Bubby sleeps.
  const key = needKey(S);
  if (!key) { S.notif.lastKey = null; return; }
  if (key === S.notif.lastKey) return;
  const today = dayKey(now);
  if (S.notif.day !== today) { S.notif.day = today; S.notif.count = 0; }
  const quiet = S.asleep && key !== 'sleep';
  if (quiet || S.notif.count >= DAILY_LIMIT || now - (S.notif.lastAt || 0) < MIN_GAP) return;
  S.notif.lastKey = key; S.notif.lastAt = now; S.notif.count++;
  const copy = { ...NEED_COPY[key] };
  if (key === 'sick' && S.doses > 1) copy.message = `It needs ${S.doses} doses of medicine.`;
  await show(NOTE, copy, S);
}

// Fallback window (outer size, so it includes the title bar and borders): the toy pod is 468×600, the compact look
// 360 wide. A little extra room covers window frames on Windows, macOS and Linux.
const WIN_SIZE = { toy: { width: 490, height: 650 }, compact: { width: 382, height: 640 } };
async function openBubby() {
  try { await chrome.action.openPopup(); return; } catch (e) { /* not available or no focused window */ }
  const S = await loadState();
  const size = WIN_SIZE[S.cfg.look === 'compact' ? 'compact' : 'toy'];
  await chrome.windows.create({ url: chrome.runtime.getURL('popup/popup.html?win=1'), type: 'popup', ...size, focused: true });
}

async function quickAction(action) {
  if (popupPort) { popupPort.postMessage({ type: 'act', action }); return; }
  const S = await loadState();
  advance(S, Date.now());
  const r = doAction(S, action);
  S.notif.lastKey = needKey(S);
  S.notifiedSeq = S.evSeq;
  await saveState(S);
  await updateAction(S);
  await chrome.notifications.create('bubby-done', {
    type: 'basic', iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
    title: r.ok ? 'Done!' : 'Hmm…', message: r.msg || 'Bubby is fine.', priority: 0, silent: true,
  });
  setTimeout(() => chrome.notifications.clear('bubby-done'), 5000);
}

chrome.notifications.onClicked.addListener(id => { chrome.notifications.clear(id); openBubby(); });
chrome.notifications.onButtonClicked.addListener((id, index) => serial(async () => {
  chrome.notifications.clear(id);
  const S = await loadState();
  const action = S.notif.actionsFor === id ? (S.notif.actions || [])[index] : 'open';
  if (!action || action === 'open') { await openBubby(); return; }
  await quickAction(action);
}));

/* ---------- Popup connection ---------- */
chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'popup') return;
  popupPort = port;
  chrome.notifications.clear(NOTE);
  port.onMessage.addListener(msg => {
    if (msg && msg.type === 'test-notify') {
      serial(async () => {
        const S = await loadState();
        // Not saved: the open popup owns the state right now.
        await show('bubby-test', { title: 'Bubby says hi!', message: 'Notifications work. Bubby will only ping you when it really needs you.', buttons: [['open', 'Open Bubby']] }, S);
      });
    }
  });
  port.onDisconnect.addListener(() => { if (popupPort === port) popupPort = null; });
});

/* ---------- Settings changed from another extension page (the welcome page's bedtime question) ---------- */
// Saved through the same queue as the background updates. If the popup is open it owns the state, so it is told too.
function setCfg(patch) {
  return serial(async () => {
    const S = await loadState();
    Object.assign(S.cfg, patch);
    await saveState(S);
    await updateAction(S);
    if (popupPort) popupPort.postMessage({ type: 'cfg', cfg: patch });
  });
}
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (!msg || msg.type !== 'set-bedtime' || sender.id !== chrome.runtime.id) return;
  const ok = v => Number.isInteger(v) && v >= 0 && v < 1440;
  if (!ok(msg.bed) || !ok(msg.wake) || msg.bed === msg.wake) { reply({ ok: false }); return; }
  setCfg({ bed: msg.bed, wake: msg.wake, bedAsked: true }).then(() => reply({ ok: true }));
  return true; // reply asynchronously
});

// Handy from the service worker console (chrome://extensions → Bubby → "service worker"):
//   bubby.skip(6)           pretend 6 hours passed with the popup closed, then run the background update
//   bubby.tick()            run the background update now
//   bubby.act('meal')       do what a notification button does (meal, snack, clean, med, lights)
//   bubby.dev(true)         show the time-skip test buttons in Settings → Try it out (bubby.dev(false) hides them)
//   bubby.state()           show the saved state
self.bubby = {
  dev: (on = true) => setCfg({ dev: !!on }).then(() => `Time-skip buttons ${on ? 'shown' : 'hidden'}. Reopen the popup's settings.`),
  tick: () => serial(tick),
  skip: hours => serial(async () => {
    const S = await loadState();
    S.lastT -= hours * 3600 * 1000;
    S.notif.lastAt = 0; S.notif.lastKey = null;
    await saveState(S);
    await tick();
    const after = await loadState();
    return { stage: after.stage, hunger: +after.hunger.toFixed(2), happy: +after.happy.toFixed(2), poops: after.poops.length, sick: after.sick, asleep: after.asleep, call: after.call && after.call.reason };
  }),
  act: a => serial(() => quickAction(a)),
  state: () => loadState(),
  iconError: () => store.lastIconError,
};
