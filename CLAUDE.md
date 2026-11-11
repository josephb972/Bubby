# Bubby

A small virtual-pet game. Two parts:

- `index.html`: the original single-file web game (its own rules and save, in localStorage).
- `extension/`: the Chrome / Edge / Brave extension (Manifest V3). Real-time pet in the toolbar; popup shows the toy
  pod artwork with the live game on its screen (or a compact layout). See `extension/README.md`.

## Current plan

**Launch plan and checklist: [`docs/LAUNCH-CHECKLIST.md`](docs/LAUNCH-CHECKLIST.md).** Read it at the start of a
session about the extension, work through open items, and tick them off (`[x]`) as they are done.

## Working on the extension

- Game rules live in `extension/core/rules.js` (pure, no DOM; shared by popup and background worker).
- After changing rules or pacing, run `node tools/sim-check.mjs`.
- Regenerate PNG icons with `node tools/make-icons.mjs` (needs Playwright).
- Test by loading `extension/` with "Load unpacked". After changes, run `node tools/check-extension.mjs` (Playwright
  loads the extension into Chromium).
- Keep existing saves working: saved state is versioned; update `migrate()` in `core/rules.js` when the format changes.
- Don't change Bubby's UI design (layouts, colours, fonts, artwork) unless the owner asks.
- Store package: `node tools/package.mjs` → `dist/` (gitignored). Store images: `node tools/store-images.mjs` →
  `store/` (committed; re-run after visible changes). Listing and privacy text: `docs/STORE-LISTING.md`, `docs/PRIVACY.md`.
- TikTok/short videos (9:16, ~30 s): `node tools/tiktok-video.mjs [story]` → `dist/bubby-<story>.mp4` (needs ffmpeg).
  Stories (captions, timing, events): `tools/video/stories/` (`life`, `moving-out`, `snacks`: toy pod look); engine: `tools/video/tiktok.js`.
  TikTok photo slideshow of the interface: `node tools/tiktok-slides.mjs` → `dist/tiktok-slides/` (13 slides + caption).
- Time-skip buttons are hidden test tools: `bubby.dev(true)` in the service worker console shows them.
- `bubby-extension.zip` is a local build artifact (gitignored).
