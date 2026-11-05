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
- Test by loading `extension/` with "Load unpacked"; Playwright Chromium can load it with
  `--load-extension` for automated checks.
- Keep existing saves working: saved state is versioned; update `migrate()` in `core/rules.js` when the format changes.
- `bubby-extension.zip` is a local build artifact (gitignored).
