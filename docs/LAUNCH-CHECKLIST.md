# Bubby extension: launch plan and checklist

Status at time of writing: extension **v0.3.1** works end to end in Chromium (toy pod and compact looks, real-time
paces, background ticks, notifications with action buttons). Goal: publish **v1.0.0** on the Chrome Web Store, then
Edge Add-ons.

Tick items as they are done (`[x]`). Owner: **Claude** = can be done in a coding session, **You** = needs the owner.

---

## 1. Fixes before launch (Claude)

- [ ] **Fallback window too narrow.** When a notification can't open the popup, `background.js` (`openBubby`) opens
      a window at 380×660. The toy pod is 468px wide, so it gets cut off. Resize it to fit the toy pod (about 490×640)
      and check the compact look still centers.
- [ ] **Hide the time-skip buttons.** The "+1 / +4 / +12 hours" buttons in Settings → Try it out are test tools and
      let players cheat. Put them behind a hidden developer switch; keep "Test notification".
- [ ] **Ask for bedtime on first launch.** Add a one-time bedtime question (defaults 22:00–08:00) to the welcome page
      or the first popup open, so nobody gets surprise lights reminders at night.
- [ ] **Store build.** Add a script that makes a store zip with `manifest.json` at the zip root (the "Load unpacked"
      zip keeps a `bubby-extension/` folder). Leave out `README.md` and anything not needed at runtime.
- [ ] **Version 1.0.0** in `extension/manifest.json`.
- [ ] **High-resolution screens:** check the toy pod artwork (`extension/art/photo/toy.webp`, 646×828) still looks
      sharp at 2× (Retina-type) scaling; re-export from the original at higher resolution if it looks soft.
- [ ] Run `node tools/sim-check.mjs` and the end-to-end checks again after the fixes.

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
- [ ] **Name check:** search the Chrome Web Store for existing "Bubby" extensions.
- [ ] Listing wording: describe it as "a virtual pet"; don't mention or imitate other brands (e.g. Tamagotchi).

## 4. Chrome Web Store listing

- [ ] **Register as a Chrome Web Store developer** (one-time US$5 fee). (You)
- [ ] **Store assets** (Claude can make them from the game):
  - [x] 128×128 icon (`extension/icons/icon-128.png`)
  - [ ] At least one 1280×800 screenshot (toy pod, status card, Seed catch, a notification)
  - [ ] Small promo tile, 440×280
  - [ ] Short description (one line) and long description
  - [ ] Category
- [ ] **Privacy section:**
  - [ ] Declare that no user data is collected (true: everything stays in `chrome.storage.local`, no network requests).
  - [ ] One-line reason per permission: `storage` (save the pet), `alarms` (update Bubby once a minute while the popup
        is closed), `notifications` (tell you when Bubby needs care).
  - [ ] Privacy policy page (for example a GitHub page): "Bubby stores your pet only in your browser and sends nothing
        anywhere."
- [ ] **Submit for review.** Usually a few days; only three permissions helps it go through.
- [ ] **Edge Add-ons** (free): submit the same package.
- [ ] Firefox: needs a small port (background script format, `browser_specific_settings`). After launch.

## 5. Right after launch

- [ ] Add a "Send feedback" link in Settings and keep an eye on reviews.
- [ ] **Save compatibility:** any change to the saved state must keep existing Bubbies working. Saves are versioned
      (`v: 2` in `core/rules.js`); add a step in `migrate()` whenever the format changes.
- [ ] Then the phone plan: an installable web app first, then home-screen widgets (iOS WidgetKit, Android Glance)
      with a native wrapper.

---

## Reference

- Extension guide (install, test drive, troubleshooting): `extension/README.md`
- Game rules and paces: `extension/core/rules.js`; balance check: `node tools/sim-check.mjs`
- Background worker console helpers (chrome://extensions → Bubby → service worker): `bubby.skip(6)`,
  `bubby.tick()`, `bubby.act('meal')`, `bubby.state()`
