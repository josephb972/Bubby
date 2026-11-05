// Save/load and toolbar badge helpers shared by the popup and the background worker.
import { fresh, migrate, stageName, topNeed, CALL_TEXT } from './rules.js';
import { actionImageData } from '../art/icon.js';

export const KEY = 'bubby';

export async function loadState() {
  const got = await chrome.storage.local.get(KEY);
  return migrate(got[KEY]) || fresh();
}
export function saveState(S) {
  return chrome.storage.local.set({ [KEY]: S });
}

// Badge text, colour and tooltip for the toolbar button.
export function badgeFor(S) {
  const name = S.ended ? 'Bubby' : `Bubby the ${stageName(S)}`;
  if (S.ended) return { text: '?', color: '#7d6b9e', title: `${name}: a new seed is waiting to be planted` };
  if (S.paused) return { text: 'II', color: '#7f8894', title: `${name} is paused` };
  if (S.call) return { text: '!', color: '#d9504a', title: `${name}: ${CALL_TEXT[S.call.reason]}` };
  if (S.sick) return { text: '+', color: '#8a5cc7', title: `${name} is sick. Give medicine.` };
  if (S.poops.length) return { text: '!', color: '#e9679f', title: `${name}: there's poop to clean up` };
  if (S.asleep) return { text: 'z', color: '#3f679a', title: `${name} is sleeping` };
  const need = topNeed(S);
  if (S.stage === 'seed') return { text: '', color: '#3d7f48', title: `${name} is about to sprout` };
  return { text: '', color: '#3d7f48', title: need.tone === 'warn' ? `${name} could use some care. ${need.label}?` : `${name} is doing fine` };
}

let lastIconKey = '';
export let lastIconError = null;
export async function updateAction(S) {
  const b = badgeFor(S);
  const tasks = [
    chrome.action.setBadgeText({ text: b.text }),
    chrome.action.setTitle({ title: b.title }),
  ];
  if (b.text) tasks.push(chrome.action.setBadgeBackgroundColor({ color: b.color }));
  if (chrome.action.setBadgeTextColor && b.text) tasks.push(chrome.action.setBadgeTextColor({ color: '#ffffff' }));
  const key = [S.stage, S.variant, S.chubby, S.sick, S.asleep, S.call && S.call.reason, Math.ceil(S.hunger), Math.ceil(S.happy), S.poops.length, !!S.ended].join('|');
  if (key !== lastIconKey) {
    try {
      tasks.push(chrome.action.setIcon({ imageData: actionImageData(S) }).then(() => { lastIconError = null; }, e => { lastIconError = String(e); lastIconKey = ''; }));
      lastIconKey = key;
    } catch (e) { lastIconError = String(e); /* keep the static icon */ }
  }
  await Promise.allSettled(tasks);
}
