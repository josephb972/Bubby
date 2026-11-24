# Bubby extension: launch plan and checklist

Status: extension **v<!-- version -->1.2.0<!-- /version -->** is built and tested; version 1.0.0 was the first store release (see `docs/CHANGELOG.md`). The
store package, images, listing text and privacy policy are ready. What's left needs the owner. Goal: publish on the Chrome Web
Store, then Edge Add-ons.

Tick items as they are done (`[x]`). Owner: **Claude** = can be done in a coding session, **You** = needs the owner.

---

## 1. Fixes before launch (Claude)

- [x] **Fallback window too narrow.** `openBubby` now opens 490×650 for the toy pod and 382×640 for the compact look,
      and the window shows the whole pod (it used to be squeezed into the compact width).
- [x] **Hide the time-skip buttons.** "+1 / +4 / +12 hours" are hidden. To show them for testing, run
      `bubby.dev(true)` in the service worker console (`bubby.dev(false)` hides them). "Test notification" stays.
- [x] **Ask for bedtime on first launch.** Step 4 of the welcome page now has "Goes to bed / Wakes up" fields
      (22:00–08:00 filled in) that save as soon as they change, through the background worker.
- [x] **Store build.** `node tools/package.mjs` → `dist/bubby-<version>.zip` with `manifest.json` at the root and no
      README or hidden files.
- [x] **Version 1.0.0** in `extension/manifest.json`.
- [ ] **High-resolution screens (You).** Checked: at 2× the toy pod artwork looks soft. `toy.webp` is 646×828 but
      shown at 468×600, so 2× screens need at least **936×1200** (1404×1800 also covers 3×). There's no larger copy
      in the repo. Send the original, or a re-export at that size, to swap in.
- [x] `node tools/sim-check.mjs` and the end-to-end checks (`node tools/check-extension.mjs`) pass after the fixes.

## 2. Testing (You)

- [ ] **Full-life playtest** with 3–5 friends on the Chill pace (about 10 days). Ask: too easy, too hard, too naggy?
      How many notifications per day felt like too many?
- [ ] **Windows and macOS**, in **Chrome and Edge**. Check notification buttons on each. On macOS, buttons only show
      when Chrome's notification style is set to "Alerts".
- [ ] **Edge cases:** browser closed overnight, computer asleep, time-zone change, and updating the extension
      (copy the new files over the folder, click ↻) without losing the current Bubby.

## 3. Rights and naming (You)

- [ ] **Toy pod artwork:** confirm you own it or are allowed to use it commercially (if it came from an AI image tool,
      check that tool's terms).
- [x] Fonts: SIL Open Font License, license files bundled in `extension/fonts/OFL-LICENSES.txt`.
- [x] **Name check** (5 Nov 2026): web searches found no store extension called "Bubby"; similar names (Bubble Bunny,
      Cubby, My Pet Buddy) aren't conflicts. Search the store itself once more just before submitting.
- [x] Listing wording: `docs/STORE-LISTING.md` calls it "a virtual pet" and names no other brands.

## 4. Chrome Web Store listing

- [ ] **Register as a Chrome Web Store developer** (one-time US$5 fee). (You)
- [x] **Store assets** (`node tools/store-images.mjs`, screenshots of the real popup):
  - [x] 128×128 icon (`extension/icons/icon-128.png`)
  - [x] Four 1280×800 screenshots: toy pod, status card, Seed catch, compact look (`store/screenshot-1..4.png`).
        No notification shot: a real system notification can't be captured automatically, and a drawn one wouldn't be
        the real UI. Add your own screenshot of one if you'd like (1280×800).
  - [x] Small promo tile, 440×280 (`store/promo-small.png`), plus optional marquee 1400×560
  - [x] Short description (one line) and long description: `docs/STORE-LISTING.md`
  - [x] Category: Lifestyle → Games
- [x] **Privacy section** (answers in `docs/STORE-LISTING.md`):
  - [x] Declare that no user data is collected (true: everything stays in `chrome.storage.local`, no network requests).
  - [x] One-line reason per permission: `storage`, `alarms`, `notifications`.
  - [x] Privacy policy text: `docs/PRIVACY.md`.
  - [ ] **Put the privacy policy at a public URL (You):** make the repository public and link to `docs/PRIVACY.md`, or
        turn on GitHub Pages for the `/docs` folder.
- [ ] **Submit for review.** Usually a few days; only three permissions helps it go through.
- [ ] **Edge Add-ons** (free): submit the same package.
- [ ] Firefox: needs a small port (background script format, `browser_specific_settings`). After launch.

## 5. Right after launch

- [ ] Add a "Send feedback" link in Settings and keep an eye on reviews.
- [ ] **Save compatibility:** any change to the saved state must keep existing Bubbies working. Saves are versioned
      (`v: 2` in `core/rules.js`); add a step in `migrate()` whenever the format changes.
- [ ] Then the phone plan: an installable web app first, then home-screen widgets (iOS WidgetKit, Android Glance)
      with a native wrapper.

## 6. Android app (test build)

See `mobile/README.md`. The extension's popup runs in a Capacitor app; notifications are planned ahead with the game
rules when the app goes to the background.

- [x] Android project (`mobile/`), Bubby launcher icons and splash, notification icon, fixed test signing key.
- [x] Phone-size checks pass (`node tools/check-mobile.mjs`): toy pod fits, taps, saving, notification forecast.
- [x] Brought up to extension 1.1.0 (races, illnesses, shop); the app's version now follows the manifest.
- [x] Phone layout: full-width pod with faded photo edges, bottom sheet (hearts, need button, status line),
      full-screen Settings and Shop, egg app icon, dark status-bar icons.
- [x] Mini-game arrows move into a big thumb pad in the bottom sheet during a game (owner's request).
- [ ] **Install the test APK on your phone (You)** and play for a few days. Check: does the pod fit your screen,
      do notifications arrive while the app is closed (also after a restart), does the sound work?
- [ ] Notification buttons (Feed a meal, Clean up…) like the extension's.
- [ ] Home-screen widget with Bubby's face (Android Glance).
- [ ] Play Store: developer account (US$25 one-time), private upload key, store listing, privacy policy URL.

---

## 6. Version 1.1.0: races, illnesses, points and the shop

- [x] **Built (Claude):** races with a rare Starling reveal and the Bubbydex; four illnesses with matching medicine, Garden
      Tea and the Theriac; points, daily quests, goals and the shop. Rules in `core/rules.js` and `core/content.js`.
- [x] **Checked (Claude):** `node tools/rules-check.mjs` (102 checks), `node tools/sim-check.mjs` (everyone who checks in still
      reaches a full life, as in 1.0.0), `node tools/check-extension.mjs` and `node tools/check-v11.mjs` (the real extension in
      Chromium, both looks).
- [x] Privacy policy wording updated (more is stored on the device; still nothing collected).
- [ ] **Playtest (You):** 3–5 friends on Chill for a few days. Is the shop too stingy or too generous? (`PTS` and `CAPS` in
      `core/content.js`.) Is the rare Starling too rare? (`RARE_BASE`, `RARE_PITY`.)
- [ ] **Refresh the store images (You or Claude):** `node tools/store-images.mjs`, and update the listing text from
      `docs/STORE-LISTING.md`.
- [ ] **Upload `dist/bubby-1.1.0.zip` as an update (You)**, then copy it into `release/`.
- [x] Races have their own body shapes; illnesses use historical names (see `memory/bubby-points-and-shop.md`, *Naming*).
- [ ] **Before submitting:** follow `docs/TEST-AND-PUBLISH.md` (test, then publish the update).
- [ ] Decide what comes next: visiting (v1.2) needs a server or shareable Bubby Cards; see `memory/bubby-update-roadmap.md`.

---

## Reference

- Extension guide (install, test drive, troubleshooting): `extension/README.md`
- Game rules and paces: `extension/core/rules.js`; balance check: `node tools/sim-check.mjs`
- Store package: `node tools/package.mjs`; store images: `node tools/store-images.mjs`; end-to-end checks:
  `node tools/check-extension.mjs` and `node tools/check-v11.mjs`; rules checks: `node tools/rules-check.mjs`;
  listing text: `docs/STORE-LISTING.md`
- Background worker console helpers (chrome://extensions → Bubby → service worker): `bubby.skip(6)`,
  `bubby.tick()`, `bubby.act('meal')`, `bubby.dev(true)`, `bubby.state()`
