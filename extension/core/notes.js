// Which notifications Bubby sends, and what they say. Shared by the extension's background worker and the Android
// app (which plans them ahead), so both always send the same ones.
import { needKey, fullName, DISEASES, ITEMS, dosesLeft } from './rules.js';

export const DAILY_LIMIT = 6;            // need notifications per day
export const MIN_GAP = 40 * 60 * 1000;   // between two need notifications

export const NEED_COPY = {
  hungry: { title: 'Bubby is hungry', message: 'Its tummy is empty. Feed it a meal before it gets upset.', buttons: [['meal', 'Feed a meal'], ['open', 'Open Bubby']] },
  sad:    { title: 'Bubby feels lonely', message: 'Play a game together, or cheer it up with a snack.', buttons: [['open', 'Play a game'], ['snack', 'Give a snack']] },
  sleep:  { title: 'Bubby fell asleep', message: 'The lights are still on. Turn them off so it can rest.', buttons: [['lights', 'Turn lights off'], ['open', 'Open Bubby']] },
  sick:   { title: 'Bubby feels sick', message: 'It needs medicine. Some sicknesses take a few doses.', buttons: [['med', 'Give medicine'], ['open', 'Open Bubby']] },   // the text is made specific below
  dirty:  { title: 'Time to clean up', message: 'Bubby’s garden is getting dirty. Clean it before Bubby gets sick.', buttons: [['clean', 'Clean up'], ['open', 'Open Bubby']] },
};

export function dayKey(ms) { const d = new Date(ms); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }

// The notifications to send now, given the events since the last check. Updates S.notif (daily count, last need).
// Returns [{ id, title, message, buttons }]. The caller checks that notifications are on and the pace runs offline.
export function pickNotes(S, newEvents, now) {
  const out = [];
  // Milestones always get through.
  const end = newEvents.find(e => e.type === 'end');
  if (end) return [{ id: 'bubby-life', title: end.text, message: `A new seed is waiting for you. Generation ${S.gen + 1} starts when you plant it.`, buttons: [['open', 'Open Bubby']] }];
  const grew = newEvents.filter(e => e.type === 'evolve').pop();
  if (grew) out.push({ id: 'bubby-life', title: grew.text, message: `Come and see Bubby the ${fullName(S)}.`, buttons: [['open', 'Open Bubby']] });

  // Needs: one notification per new need, with a daily limit, a minimum gap, and quiet hours while Bubby sleeps.
  const key = needKey(S);
  if (!key) { S.notif.lastKey = null; return out; }
  if (key === S.notif.lastKey) return out;
  const today = dayKey(now);
  if (S.notif.day !== today) { S.notif.day = today; S.notif.count = 0; }
  const quiet = S.asleep && key !== 'sleep';
  if (quiet || S.notif.count >= DAILY_LIMIT || now - (S.notif.lastAt || 0) < MIN_GAP) return out;
  S.notif.lastKey = key; S.notif.lastAt = now; S.notif.count++;
  const copy = { id: 'bubby-need', ...NEED_COPY[key] };
  if (key === 'sick') {
    const d = DISEASES[S.disease] || DISEASES.sporecough, n = dosesLeft(S);
    copy.title = `Bubby has ${d.name}`;
    copy.message = `${ITEMS[d.med].name} cures it${n > 1 ? ` (${n} doses)` : ''}. Open Bubby to buy or give it.`;
  }
  out.push(copy);
  return out;
}
