# Bubby

A small virtual-pet game. Three parts (the web game shares no code or saves with the other two):

- `index.html`: the single-file **web game** (its own rules and save in localStorage, draws its own pod in code, PostHog analytics).
- `extension/`: the **launched** Chrome / Edge / Brave extension (Manifest V3). Real-time pet in the
  toolbar; the popup shows the toy pod artwork (`extension/art/photo/toy.webp`) with the live game on its screen, or a compact
  layout. See `extension/README.md`.
- `mobile/`: the **Android app** (Capacitor). It runs the extension's popup and game code (copied in at build time, never
  forked) with a phone layer and a phone-shaped layout; see `mobile/README.md`. Build the test APK with
  `cd mobile && npm install && npm run apk`; check with `node tools/check-mobile.mjs`.

The extension is the product that was launched. Version 1.3.0 adds clothes (11 items, each sold in four sizes, one per stage:
Bulb, Bud, Blossom, Elder; fitted to every race body) and garden decor, bought with points in the Shop's Clothes and Garden
sections (`core/shop.js`, `art/wardrobe.js`, `art/decor.js`, `popup/closet.js`). Version 1.2.0 gives every Bubby a personality (five traits and two quirks, leaning
its race's way, discovered as it grows, shown under Status → Nature) and 82 little things it does on its own while you watch.
Version 1.1.2 hatches the egg while you watch, asks for a name (ID card),
keeps every Bubby's card in a photo album and starts a newborn with empty hearts. Version 1.1.1 plants every seed with a random race, so the egg and Bulb already
wear its colours. Version 1.1.0 adds races, the rare Starling reveal, the Bubbydex, named illnesses
with matching medicine, points and the shop (design in `memory/`). The web game has the same features as a draft (its v1.3 still
needs small-screen polish) and is not the priority. Anything else in `memory/` is still a plan.

## Version (read this first)
- **Current version: <!-- version -->1.3.0<!-- /version -->.** `extension/manifest.json` is the single source of truth. The last version known to be submitted to the
  stores is **<!-- submitted -->1.0.0<!-- /submitted -->** (confirm in the store dashboard). History: `docs/CHANGELOG.md`.
- **Whenever there is a new version, do all of this in the same change (the owner asked for it every time):**
  1. `node tools/version.mjs bump X.Y.Z "short title"` sets the manifest and every version marker in the docs and memory and starts the changelog entry.
  2. Fill in the new `docs/CHANGELOG.md` entry (added, changed, saves, checks, what the owner must do).
  3. Update `memory/` (status lines, designs that changed) and the "what is in this version" lines in this file.
  4. Update `docs/STORE-LISTING.md` (description, screenshots) and re-run `node tools/store-images.mjs` if anything visible changed; update `docs/PRIVACY.md` if what is stored changes.
  5. Keep old saves working (`migrate()` in `core/rules.js`) and run every check: `rules-check`, `sim-check`, `check-extension`, `check-v11`, then `node tools/version.mjs` (it fails if any doc is out of step).
  6. `node tools/package.mjs`, copy `dist/bubby-X.Y.Z.zip` to `release/`, commit, push, and send the owner the zip.
  7. When the owner says it is submitted: `node tools/version.mjs submitted X.Y.Z`.

## Key files
- `docs/CHANGELOG.md`: what changed in each version, and whether it has been submitted.
- `docs/TEST-AND-PUBLISH.md`: how to test a build (including the upgrade test and the console test helpers) and publish an update.
- `docs/LAUNCH-CHECKLIST.md`: extension launch plan. Read it at the start of a session about the extension and tick items off.
- `memory/bubby-monetization-and-marketing.md`: monetization options (Bubby Plus ranked 1, cosmetic packs ranked 2), marketing plan, TikTok strategy.
- `memory/bubby-update-roadmap.md`: planned updates v1.1 to v1.6, with order, rules, risks, and PostHog events.
- `memory/bubby-points-and-shop.md`: points economy, caps, prices, and illness and medicine rules (built in extension 1.1.0).
- `prompts/visual-polish-prompt.md`: art-direction prompt.
- `README.md`: player-facing description of the web game.

## Working on the extension

- Game rules live in `extension/core/rules.js` (pure, no DOM; shared by popup and background worker).
- After changing rules or pacing, run `node tools/rules-check.mjs` and `node tools/sim-check.mjs` (a sensible player must still reach a full life).
- Game content and numbers (races, illnesses, items, points) are in `extension/core/content.js`.
- Personality (race leanings, traits, quirks, and their effect on the rules: `mods()`) is `extension/core/persona.js`; the passive
  behaviours are `extension/core/behaviors.js` (catalogue and weights) and `extension/popup/behave.js` (animations; props in
  `art/props.js`). Behaviours are cosmetic only. Design: `docs/PERSONALITY-PLAN.md`.
- Regenerate PNG icons with `node tools/make-icons.mjs` (needs Playwright).
- Test by loading `extension/` with "Load unpacked". After changes, run `node tools/check-extension.mjs` (Playwright
  loads the extension into Chromium) and `node tools/check-v11.mjs [screenshot-folder]` (the 1.1 features, both looks).
- Keep existing saves working: saved state is versioned; update `migrate()` in `core/rules.js` when the format changes.
- Don't change Bubby's existing UI design (layouts, colours, fonts, artwork) unless the owner asks. New screens (shop and so on)
  must match it. The Android app's phone layout (owner's request, Nov 2026) lives only in `mobile/web/mobile.css` and reuses
  the popup's own elements; keep the extension's `popup.css` as it is for the app's sake.
- Store package: `node tools/package.mjs` → `dist/` (gitignored). `release/` keeps the exact zip of every version built for the stores (the changelog says which were submitted). Store images: `node tools/store-images.mjs` →
  `store/` (committed; re-run after visible changes). Listing and privacy text: `docs/STORE-LISTING.md`, `docs/PRIVACY.md`.
- Time-skip buttons are hidden test tools: `bubby.dev(true)` in the service worker console shows them.
- `bubby-extension.zip` is a local build artifact (gitignored).

## Working on the web game (`index.html`)
- Keep it a single HTML file unless the user asks otherwise.
- Analytics events go through `track()`. Never send personal data. The Stats button must keep working.
- Game balance and decay rules are in `STAGE` and `ABSENCE`.

## Rules for every version
- Don't make absence punish the player. Illness and other bad things only happen during active play.
- Paid features must never change difficulty or revive a dead Bubby. Cosmetics only. Points are earned, never bought with money.
- Illness names: old historical diseases in a cartoon, clearly fictional way, with the "not medical advice" note. Never an illness that still stigmatises people today (leprosy) and never a sexually transmitted infection.
- Races are random: a common race is picked when the seed is planted (`seedRace`, the egg and Bulb wear its colours), and `rollRace` makes the Bud that race or, by `RARE_CHANCE`, the rare Starling. Care quality only decides the adult tier. The Bubbydex must survive resets.
- Work on `claude/practical-faraday-wxk9us`.
