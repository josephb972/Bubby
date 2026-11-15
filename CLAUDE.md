# Bubby

A small virtual-pet game. Two parts that do NOT share code or saves:

- `index.html`: the single-file **web game** (its own rules and save in localStorage, draws its own pod in code, PostHog analytics).
- `extension/`: the **launched** Chrome / Edge / Brave extension (Manifest V3, store package v1.0.0 submitted). Real-time pet in the
  toolbar; the popup shows the toy pod artwork (`extension/art/photo/toy.webp`) with the live game on its screen, or a compact
  layout. See `extension/README.md`.

The extension is the product that was launched. Version 1.1.0 adds races, the rare Starling reveal, the Bubbydex, named illnesses
with matching medicine, points and the shop (design in `memory/`). The web game has the same features as a draft (its v1.3 still
needs small-screen polish) and is not the priority. Anything else in `memory/` is still a plan.

## Key files
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
- Regenerate PNG icons with `node tools/make-icons.mjs` (needs Playwright).
- Test by loading `extension/` with "Load unpacked". After changes, run `node tools/check-extension.mjs` (Playwright
  loads the extension into Chromium) and `node tools/check-v11.mjs [screenshot-folder]` (the 1.1 features, both looks).
- Keep existing saves working: saved state is versioned; update `migrate()` in `core/rules.js` when the format changes.
- Don't change Bubby's existing UI design (layouts, colours, fonts, artwork) unless the owner asks. New screens (shop and so on)
  must match it.
- Store package: `node tools/package.mjs` → `dist/` (gitignored). The version submitted to the stores is committed in `release/` (copy the new zip there for each release). Store images: `node tools/store-images.mjs` →
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
- Races are random (`rollRace`, `RARE_CHANCE`). Care quality only decides the adult tier. The Bubbydex must survive resets.
- Work on `claude/practical-faraday-wxk9us`.
