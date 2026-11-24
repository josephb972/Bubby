// Saving the wardrobe and Petals ("meta"), separately from Bubby's own save, so a new seed or "Start over" keeps them.
// Only the popup writes it; the background worker only reads it (to dress the toolbar icon).
import { freshMeta, migrateMeta } from './shop.js';

export const META_KEY = 'bubby-meta';

// Loads the wardrobe. A missing one is created (with the welcome grant, larger for players who already played);
// an unreadable one is set aside under 'bubby-meta-bad' instead of being thrown away.
export async function loadMeta(S, { create = true } = {}) {
  const got = await chrome.storage.local.get(META_KEY);
  const raw = got[META_KEY];
  const m = migrateMeta(raw);
  if (m) return m;
  if (!create) return null;
  if (raw !== undefined) await chrome.storage.local.set({ 'bubby-meta-bad': raw });
  const fresh = freshMeta(Date.now(), S);
  await chrome.storage.local.set({ [META_KEY]: fresh });
  return fresh;
}
export function saveMeta(m) {
  m.rev = (m.rev || 0) + 1;
  return chrome.storage.local.set({ [META_KEY]: m });
}
// Calls fn(meta) when another page (e.g. the fallback window) saved a newer wardrobe.
export function watchMeta(getRev, fn) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[META_KEY]) return;
    const m = migrateMeta(changes[META_KEY].newValue);
    if (m && m.rev > getRev()) fn(m);
  });
}
