# Test and publish a new Bubby version

Current version: **<!-- version -->1.3.0<!-- /version -->**; the last one known to be submitted is **<!-- submitted -->1.0.0<!-- /submitted -->**. The store steps come from how the Chrome Web Store dashboard worked when this
was written; its labels move around, so if a button has a different name, the idea is the same. Google's own guide is
https://developer.chrome.com/docs/webstore/update (it could not be opened from the coding session, so the steps below are not
checked against it).

## 1. Get the files

```bash
node tools/package.mjs        # builds dist/bubby-<!-- version -->1.3.0<!-- /version -->.zip (needs Node)
```

Or use the `bubby-<!-- version -->1.3.0<!-- /version -->.zip` you were sent. Unzip it into a folder (for example `bubby-<!-- version -->1.3.0<!-- /version -->`). The folder must have
`manifest.json` directly inside it.

## 2. Test it on your own computer (about 15 minutes)

### A. A fresh install
1. In Chrome open `chrome://extensions` (Edge: `edge://extensions`).
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick the folder with `manifest.json`.
4. Pin Bubby (puzzle-piece icon, then the pin).

If you also have the store version installed, **turn it off while testing**. Two copies are two separate Bubbies.

### B. The upgrade test (the one that matters for real players)
Real players have a living Bubby saved by the version in the store. Check that it survives:
1. Unzip the previous version from `release/` (for example `release/bubby-<!-- submitted -->1.0.0<!-- /submitted -->.zip`) into a folder called `bubby-test`. **Load unpacked** it. Play for a minute (feed it, wait for poop).
2. Close the popup. Copy the <!-- version -->1.3.0<!-- /version --> files over the same folder (replace everything).
3. On `chrome://extensions` click the circular arrow (reload) on Bubby, then open Bubby.
4. You should see **the same Bubby**, now a Leafling, with **★ 35 points** (25 starter + 10 for the day) and a welcome toast.
   Click **Errors** on the extensions page: there should be none.

### C. A quick tour of everything new
Open the background worker's console: `chrome://extensions` → Bubby → the blue **service worker** link. These test commands only
exist there (players never see them). **Close the popup first**; it owns the saved game while it is open.

| You want to see | Do this |
|---|---|
| Time skips | `bubby.dev(true)`, then Settings → *Try it out* shows +1 / +4 / +12 hours (real-time paces only) |
| The rare Starling reveal | Settings → Pace → **Chill**. Run `bubby.nextRace('starling')`, then `bubby.skip(13)` (pretends 13 hours passed with Bubby closed; run it again if Bubby was asleep), then open Bubby: the away card and the special reveal play. (The popup's own +12 hours buttons skip the reveal.) |
| Any race, stage and care tier | `bubby.look('mossback', 'adult', 'radiant')`. Races: `leafling mossback puddle shroomling emberling starling`. Stages: `child adult senior`. Tiers: `radiant daisy thistle` |
| An illness and its medicine | `bubby.sick('blight')` (Ague `sporecough`, Scurvy `itchymoss`, Dancing Plague `moonflu`, The Plague `blight`). Press **Medicine**: try the wrong medicine (refused, not used up), then the right one |
| Points and the shop | `bubby.give(200)` then press the **★** button (or **B**). `bubby.stock()` fills the bag with 3 of everything |
| The daily bonus again | In the same console: `chrome.storage.local.get('bubby').then(r => { r.bubby.lastCheckIn = ''; chrome.storage.local.set(r); })`, then open Bubby |
| Notifications | Settings → **Test notification** |
| Reset | Settings → **Start over** (keeps your points and Bubbydex, by design) |

What to look for: all six bodies look different at every stage; the toolbar icon shows the face of the race; medicine messages name the
illness; the shop shows a short historical note under each medicine; nothing is cut off on the pod's small screen; the **Compact** look
(Settings → Look) has the same features.

### D. The automatic checks (on a computer with Node and Playwright)
```bash
node tools/rules-check.mjs     # the rules (races, illness, points, shop, old saves)
node tools/sim-check.mjs       # a careful player still reaches a full life on every pace
node tools/check-extension.mjs # the real extension in Chromium: the 1.0 checks
node tools/check-v11.mjs shots # the 1.1 features, both looks; saves screenshots in ./shots
```

### E. Let friends test it
Send 3 to 5 people the zip and the install steps (A). Ask: is the shop too stingy or too generous? Is the rare Starling too rare?
Does anything confuse you? (Numbers to tune are in `extension/core/content.js`.)

## 3. Publish the update on the Chrome Web Store

Nothing changes about the listing's identity: it is an **update** to the same item, so players keep their Bubby and Chrome updates
them automatically.

1. **The version must go up.** `extension/manifest.json` says `<!-- version -->1.3.0<!-- /version -->`; the store has `<!-- submitted -->1.0.0<!-- /submitted -->`. (A rejected upload usually means the
   version was not higher.)
2. **Build the zip:** `node tools/package.mjs` → `dist/bubby-<!-- version -->1.3.0<!-- /version -->.zip`.
3. Open the **Chrome Web Store Developer Dashboard** (https://chrome.google.com/webstore/devconsole) with the account that
   published Bubby, and click **Bubby**.
4. **Package** tab → **Upload new package** → choose the zip. The dashboard reads the manifest and shows the new version.
5. **Store listing** tab: paste the new description from `docs/STORE-LISTING.md` (it now mentions the races, the illnesses and the
   shop, and says the game is not medical advice). Refresh the screenshots first: `node tools/store-images.mjs`, then upload
   `store/screenshot-1.png` to `-5` (the store takes at most 5; the old compact-look shot is gone).
6. **Privacy** tab: there are **no new permissions** (still `storage`, `alarms`, `notifications`), and Bubby still collects nothing, so
   answers stay as they were. Make sure the privacy policy link points at the updated `docs/PRIVACY.md` (it now lists the points,
   shop items and Bubbydex stored on the device).
7. **Distribution** tab: keep it public. Optionally use **trusted testers** first and send them the store link.
8. Click **Submit for review**. If you are offered a choice, you can publish automatically when approved, or hold it and publish by
   hand. Updates with no new permissions are usually reviewed within a few days.
9. When it goes live, Chrome updates installed copies on its own within a day or so (players can speed it up at
   `chrome://extensions` → **Update**). Their saved Bubby is migrated automatically; the upgrade test in 2B checks exactly that.
10. **Edge Add-ons:** Partner Center → Microsoft Edge → Bubby → **Update** → upload the same zip → submit.
11. **Afterwards:** make sure the zip is in `release/bubby-<!-- version -->1.3.0<!-- /version -->.zip` (commit it), run `node tools/version.mjs submitted <!-- version -->1.3.0<!-- /version -->`, and tick the box in `docs/LAUNCH-CHECKLIST.md`.

**You cannot undo a published version.** If something is wrong, fix it and publish **1.1.1**. Test the zip (section 2) before you
submit.

## 4. If the store pushes back

- **"Misleading or health content":** the listing and the shop say the game is fictional and the history is simplified. Keep the
  disclaimer and never claim that anything in Bubby treats a real illness.
- **A rejection mentions a permission:** there should be none; compare `manifest.json` with the published one.
- **"Single purpose":** unchanged: a virtual pet game in the toolbar.
