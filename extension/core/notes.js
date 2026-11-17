// Notification wording and pacing, shared by the extension's background worker and the Android app.
export const DAILY_LIMIT = 6;            // need notifications per day
export const MIN_GAP = 40 * 60 * 1000;   // between two need notifications

export const NEED_COPY = {
  hungry: { title: 'Bubby is hungry', message: 'Its tummy is empty. Feed it a meal before it gets upset.', buttons: [['meal', 'Feed a meal'], ['open', 'Open Bubby']] },
  sad:    { title: 'Bubby feels lonely', message: 'Play a game together, or cheer it up with a snack.', buttons: [['open', 'Play a game'], ['snack', 'Give a snack']] },
  sleep:  { title: 'Bubby fell asleep', message: 'The lights are still on. Turn them off so it can rest.', buttons: [['lights', 'Turn lights off'], ['open', 'Open Bubby']] },
  sick:   { title: 'Bubby feels sick', message: 'It needs medicine. Some sicknesses take a few doses.', buttons: [['med', 'Give medicine'], ['open', 'Open Bubby']] },
  dirty:  { title: 'Time to clean up', message: 'Bubby’s garden is getting dirty. Clean it before Bubby gets sick.', buttons: [['clean', 'Clean up'], ['open', 'Open Bubby']] },
};

export function dayKey(ms) { const d = new Date(ms); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
