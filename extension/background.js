// Toolbar click: open Bubby in a tab, or focus the one that is already open
// (two tabs would race on the same saved game). getContexts needs no extra permission.
chrome.action.onClicked.addListener(async () => {
  const url = chrome.runtime.getURL('bubby.html');
  const ctxs = await chrome.runtime.getContexts({ contextTypes: ['TAB'], documentUrls: [url] });
  if (ctxs.length) { await chrome.tabs.update(ctxs[0].tabId, { active: true }); await chrome.windows.update(ctxs[0].windowId, { focused: true }); }
  else await chrome.tabs.create({ url });
});
