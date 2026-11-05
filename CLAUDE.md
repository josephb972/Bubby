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
- Test by loading `extension/` with "Load unpacked". After changes, run `node tools/e2e-check.mjs` (Playwright loads
  the extension into Chromium; use `viewport: null` when checking real window sizes, and `deviceScaleFactor`, not
  `--force-device-scale-factor`, for 2× captures).
- Keep existing saves working: saved state is versioned; update `migrate()` in `core/rules.js` when the format changes.
- Store package: `node tools/build-store.mjs` → `dist/bubby-<version>.zip` (gitignored). `--unpacked` makes
  `bubby-extension.zip` (gitignored) for testers.
- Store images: `node tools/store-assets.mjs` → `store/` (committed). Re-run after visible UI changes. Listing text and
  privacy answers: `docs/STORE-LISTING.md`; keep them true to what the code does.
- Time-skip buttons are hidden developer tools (`S.cfg.dev`): tap the Settings title 5 times, or `bubby.dev(true)`.
