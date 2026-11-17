# Bubby changelog

Newest first. `extension/manifest.json` holds the current version; `node tools/version.mjs` checks that every doc agrees with it.
Each entry says whether that version has been submitted to the stores (set with `node tools/version.mjs submitted X.Y.Z`).

## 1.1.0 (17 Nov 2026): races, illnesses, points and the shop
Status: built and tested; **not yet confirmed as submitted**. Package: `release/bubby-1.1.0.zip`.

**Added**
- Six races picked at random when the Bulb becomes a Bud, each with its own body: Leafling (flower), Mossback (tortoise), Puddle
  (droplet), Shroomling (mushroom), Emberling (flame spirit) and the rare Starling (star) with a long special reveal. A pity counter
  raises the rare chance after every miss (Quick 5%, Classic 8%, Chill 12%, +5% per miss).
- The Bubbydex: every race in every adult form (18), kept across lives.
- Four illnesses named after old diseases (Ague, Scurvy, Dancing Plague, The Plague), each with its own medicine named after the old
  remedy, free Garden Tea, Theriac (cure-all) and the Plague Doctor's Posy (protection). A short true note on each and a "not medical
  advice" line. Leprosy and sexually transmitted infections are left out on purpose.
- Points: daily visit and streak, care, games, daily quests, goals, with daily caps; the shop (better food, medicine, protection).
  Points are earned, never sold.
- A medicine picker and pantry sized for the pod's small screen; the toolbar tooltip and notifications name the illness.
- Test helpers in the service worker console: `give`, `stock`, `nextRace`, `look`, `sick`.

**Changed**
- Illness only comes from the same causes as before; lights left on overnight never cause illness while you are away.
- The rare reveal always plays when you open Bubby, before the "while you were away" card.
- Store listing, privacy wording and five new screenshots.

**Saves:** format `v: 2` unchanged. A 1.0.0 save opens as a Leafling that keeps its form, with 25 starter points; an ongoing sickness
becomes Ague. (Checked by `tools/rules-check.mjs` and `tools/check-v11.mjs`.)

**Checks:** `rules-check` 111, `sim-check` (everyone who checks in still reaches a full life), `check-extension`, `check-v11` (both looks,
the upgrade from a 1.0.0 save, the rare reveal with the popup open and closed).

**Owner still to do:** playtest with friends (is the shop generous enough, is the Starling rare enough?), upload the zip, update the
listing from `docs/STORE-LISTING.md`.

## 1.0.0 (5 Nov 2026): first store release
Status: recorded in the project notes as submitted (commit `3190cfd`); **confirm in the store dashboard**. Package: `release/bubby-1.0.0.zip`.

- A pixel pet in the toolbar: its face shows its mood, a badge shows what it needs, and the popup is the toy pod with the live game on
  its screen (or a compact layout).
- Real-time lives on three paces (Quick about 20 minutes, Classic about 4 days, Chill about 10 days), bedtime, and notifications with
  buttons that fix the need on the spot.
- Seed catch and "Which way?", care mistakes decide Radiant, Daisy or Thistle, and a welcome page that asks for bedtime.
- Store package, images, listing text and privacy policy.
