# Bubby extension: launch plan and checklist

Status: extension **v1.0.0** is ready to package (`node tools/build-store.mjs` → `dist/bubby-1.0.0.zip`). All the
coding fixes are done and checked; store images and listing text are ready in `store/` and `docs/STORE-LISTING.md`.
What's left needs the owner: testing on real machines, rights, registering and submitting. Goal: publish **v1.0.0** on
the Chrome Web Store, then Edge Add-ons.

Tick items as they are done (`[x]`). Owner: **Claude** = can be done in a coding session, **You** = needs the owner.

---

## 1. Fixes before launch (Claude)

- [x] **Fallback window too narrow.** `openBubby` in `background.js` now opens 490×650 for the toy pod and 382×640 for
      the compact look, and the window then fits itself exactly to its content (`fitWindow` in `popup.js`), including
      the title bar on each OS. Checked for both looks in `tools/e2e-check.mjs`.
- [x] **Hide the time-skip buttons.** "+1 / +4 / +12 hours" are now hidden developer tools: tap the **Settings** title
      5 times (or `bubby.dev(true)` in the service worker console) to show them. "Test notification" stays visible.
- [x] **Ask for bedtime on first launch.** The welcome page asks "When do you go to bed?" (defaults 22:00–08:00) and
      saves it through the background worker (also reaches an open popup). Settings still lets you change it.
- [x] **Store build.** `node tools/build-store.mjs` makes `dist/bubby-<version>.zip` with `manifest.json` at the root,
      without `README.md` or dotfiles, and checks the manifest's files exist. `--unpacked` makes the "Load unpacked" zip.
- [x] **Version 1.0.0** in `extension/manifest.json`.
- [ ] **High-resolution screens (You: needs the original artwork).** Checked: at 2× (Retina-type) scaling the toy pod
      artwork looks soft next to the crisp text and pixel screen. `toy.webp` is 646×828 but is shown at 468×600, so 2×
      screens need **at least 936×1200** (1404×1800 also covers 3× phones/tablets). No larger copy exists in the repo
      history. Send the original image (or a re-export at 1404×1800) and Claude can swap it in; at the same quality
      setting the file stays well under 200 KB.
- [x] Run `node tools/sim-check.mjs` and the end-to-end checks again after the fixes. Both pass; the end-to-end checks
      are now a script, `node tools/e2e-check.mjs`.
- [x] Also fixed: the footer next to the toy pod wrapped "Grows up in 1 day 23 h" so the "h" sat alone on a line.

## 2. Testing (You)

- [ ] **Full-life playtest** with 3–5 friends on the Chill pace (about 10 days). Ask: too easy, too hard, too naggy?
      How many notifications per day felt like too many? Give them `bubby-extension.zip`
      (`node tools/build-store.mjs --unpacked`).
- [ ] **Windows and macOS**, in **Chrome and Edge**. Check notification buttons on each. On macOS, buttons only show
      when Chrome's notification style is set to "Alerts". Also click a notification body once: if the browser opens
      the small fallback window instead of the popup, check it fits the toy pod without scrollbars.
- [ ] **Edge cases:** browser closed overnight, computer asleep, time-zone change, and updating the extension
      (copy the new files over the folder, click ↻) without losing the current Bubby.

## 3. Rights and naming (You)

- [ ] **Toy pod artwork:** confirm you own it or are allowed to use it commercially (if it came from an AI image tool,
      check that tool's terms).
- [x] Fonts: SIL Open Font License, license files bundled in `extension/fonts/OFL-LICENSES.txt`.
- [x] **Name check** (done 5 Nov 2026): web searches found no Chrome Web Store extension named "Bubby". Nearby names
      exist (Bubble Bunny, Bubbles theme, Cubby, My Pet Buddy), none a conflict. Do a last search in the store itself
      just before submitting, since search engines lag behind the store.
- [x] Listing wording: the listing text in `docs/STORE-LISTING.md` calls it "a virtual pet" and names no other brands;
      the extension's own text doesn't either (checked).

## 4. Chrome Web Store listing

- [ ] **Register as a Chrome Web Store developer** (one-time US$5 fee). (You)
- [x] **Store assets** (made from the real extension by `node tools/store-assets.mjs`):
  - [x] 128×128 icon (`extension/icons/icon-128.png`)
  - [x] Five 1280×800 screenshots: `store/screenshot-1.png` (toy pod) to `-5` (status card, Seed catch,
        notifications, life cycle)
  - [x] Small promo tile, 440×280 (`store/promo-small.png`); bonus marquee 1400×560 (`store/promo-marquee.png`)
  - [x] Short description (one line, from the manifest) and long description: `docs/STORE-LISTING.md`
  - [x] Category: Lifestyle → Games (or Lifestyle → Just for Fun)
- [x] **Privacy section** (answers ready to paste in `docs/STORE-LISTING.md`):
  - [x] Declare that no user data is collected (true: everything stays in `chrome.storage.local`, no network requests).
  - [x] One-line reason per permission: `storage`, `alarms`, `notifications`, plus single-purpose and remote-code
        answers.
  - [x] Privacy policy text: `docs/PRIVACY.md`.
  - [ ] **Publish the privacy policy at a public URL (You).** Easiest: make the GitHub repository public and link to
        `docs/PRIVACY.md`, or turn on GitHub Pages (Settings → Pages → deploy from branch, folder `/docs`).
- [ ] **Submit for review (You):** upload `dist/bubby-1.0.0.zip`, paste the listing text, upload the images, answer the
      privacy tab. Usually a few days; only three permissions helps it go through.
- [ ] **Edge Add-ons** (free, You): submit the same package. Search terms and certification notes are in
      `docs/STORE-LISTING.md`.
- [ ] Firefox: needs a small port (background script format, `browser_specific_settings`). After launch.

## 5. Right after launch

- [x] Add a "Send feedback" link in Settings. It appears only in store installs and opens Bubby's own Chrome Web Store
      support page or Edge Add-ons page (worked out from the installed extension, so no URL to fill in later).
- [ ] Keep an eye on reviews and the store's support tab. (You)
- [ ] **Save compatibility:** any change to the saved state must keep existing Bubbies working. Saves are versioned
      (`v: 2` in `core/rules.js`); add a step in `migrate()` whenever the format changes. (Ongoing rule. The new
      settings `bedAsked` and `dev` are optional and filled in from defaults, so existing saves still load.)
- [ ] Then the phone plan: an installable web app first, then home-screen widgets (iOS WidgetKit, Android Glance)
      with a native wrapper.

---

## Reference

- Extension guide (install, test drive, troubleshooting): `extension/README.md`
- Store listing text and privacy answers: `docs/STORE-LISTING.md`; privacy policy: `docs/PRIVACY.md`
- Game rules and paces: `extension/core/rules.js`; balance check: `node tools/sim-check.mjs`
- End-to-end checks: `node tools/e2e-check.mjs`; store package: `node tools/build-store.mjs`; store images:
  `node tools/store-assets.mjs`
- Background worker console helpers (chrome://extensions → Bubby → service worker): `bubby.skip(6)`,
  `bubby.tick()`, `bubby.act('meal')`, `bubby.dev(true)`, `bubby.state()`
