# Bubby changelog

Newest first. `extension/manifest.json` holds the current version; `node tools/version.mjs` checks that every doc agrees with it.
Each entry says whether that version has been submitted to the stores (set with `node tools/version.mjs submitted X.Y.Z`).

## 1.1.2 (17 Nov 2026): hatch, name and ID card, photo album, a hungry newborn
Status: built and tested; **not submitted**. Package: `release/bubby-1.1.2.zip`. Android test build: `dist/bubby-android-1.1.2.apk`.

Owner's requests: show the race name, start a newborn with empty hearts so you feed and play with it first, name it when the egg
hatches with a little ID card, and keep every Bubby's card in a photo album.

**Added**
- **Naming and ID card.** When the egg hatches, "It hatched!" asks for a name (up to 14 characters, or "Surprise me"). The ID card
  shows a photo of Bubby in its current form, its name, race and form, generation, birthday (the hatch) and age. The photo updates
  as it grows. Time stops while you choose. A Bubby from an older version is asked for a name the next time you open it.
- **Photo album** (★ Shop, Album tab): the current Bubby's card, then every Bubby that has left (full life, moved away or Start
  over) with its last form, birthday and the day it left. Kept across lives, like the Bubbydex (up to 200 cards).
- The name is used in the subtitle ("Pip · Puddle Bulb · Day 2"), the status card, the end card and notifications
  ("Pip is hungry").
- The race name shows from the egg on ("Puddle Seed", "Puddle Bulb").

**Changed**
- **A newborn starts hungry and bored** (hunger and happy at 0): the first things you do are feed it and play with it.
- **The egg waits for you.** On Chill and Classic the egg is ready after a minute but only hatches while Bubby is open, so a
  hungry newborn is never alone (and absence still never hurts). If it's ready while you're away you get one notification:
  "Your egg is ready to hatch!". Quick pace was already paused while closed.
- "Start over" puts the current Bubby's card in the album first.
- Welcome page: "open Bubby to watch it hatch and give it a name".

**Saves:** format `v: 2` unchanged. New fields `name`, `hatchedAt`, `eggReady` and `album` (kept across lives) come from `fresh()`
in `migrate()`. Older hatched Bubbies have no name, so they are asked for one; their birthday is the day they were planted.
Privacy policy updated: the name and album are stored on the device only.

**Checks:** `rules-check` 137 (19 new: newborn hearts, birthday, race name, name cleaning and length, ID card, named notifications,
album on start over and on a finished life, kept across lives, old saves asked for a name, the egg waits and sends one
notification, an unattended life still ends after hatching), `sim-check` (every sensible player still reaches a full life; the
simulated player names, feeds and plays with the newborn), `check-extension`, `check-v11` (an old Bubby is asked for a name),
`check-mobile` (hatch, name, hungry newborn, album, start over).

**Owner still to do:** play through a hatch on the phone and in the browser, then submit 1.1.2 (instead of 1.1.0/1.1.1 if those
haven't gone in yet).

## 1.1.1 (17 Nov 2026): every Bubby wears its race's colours from the start
Status: built and tested; **not submitted**. Package: `release/bubby-1.1.1.zip`.

Why: the owner restarted 7 times and always got the same Bulb. The race was only picked when the Bulb became a Bud (12 hours in
on Chill), so every new Bubby looked the same for its first half day.

**Added**
- Every new seed is planted with a random common race (`seedRace`). Its egg and Bulb wear that race's colours: green (Leafling,
  the original look and the logo), sage (Mossback), blue (Puddle), tan with red stripes (Shroomling), orange (Emberling).
- **Android app:** the same, plus everything since 1.1.0 (phone layout, game pad); test APK `dist/bubby-android-1.1.1.apk`.

**Changed**
- At the Bud, the rare Starling is still rolled with the same chance and pity counter, so any Bulb can still turn into a
  Starling as a surprise; otherwise the Bud becomes the seed's race. The odds of every race are unchanged.
- Bubbydex note: explains that the egg and Bulb show the race.

**Saves:** format `v: 2` unchanged. A seed or Bulb saved before 1.1.1 gets a seed race when it loads (from `fresh()` in
`migrate()`); Buds and older keep their race.

**Checks:** `rules-check` 118 (7 new: seed races are common only and evenly spread, the Bud becomes the seed's race unless rare,
the rare roll and miss counter still work, old saves and new lives get a seed race), `sim-check`, `check-extension`, `check-v11`,
`check-mobile`.

**Owner still to do:** test it (Start over a few times: the egg colour should change), then submit 1.1.1 instead of 1.1.0 if
1.1.0 hasn't gone in yet.

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
- **Android app (test build, `mobile/`)**: the same game on a phone, with a phone layout (full-width toy pod, bottom sheet
  with hearts and the "what Bubby needs" button, full-screen Settings and Shop), notifications planned ahead with the
  same rules and wording (`core/notes.js`, now shared with the background worker), the egg as its icon, and a big
  thumb pad for the mini-games' arrows. Not in a
  store: installed from `dist/bubby-android-1.1.0.apk`.

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
