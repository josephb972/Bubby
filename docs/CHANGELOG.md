# Bubby changelog

Newest first. `extension/manifest.json` holds the current version; `node tools/version.mjs` checks that every doc agrees with it.
Each entry says whether that version has been submitted to the stores (set with `node tools/version.mjs submitted X.Y.Z`).

## 1.3.0 (24 Nov 2026): Clothes in a size for every stage, and garden decor
Status: built and tested; **not submitted**. Package: `release/bubby-1.3.0.zip`. Android test build: `dist/bubby-android-1.3.0.apk` (version code 10300, signed with the test key, so it installs over 1.2.0).

Owner's request: a shop where players buy clothes for Bubby (fitting every race and every stage perfectly, with a different
size to buy for each stage of growing up) and decorations for its garden, everything in the Android app as well.

**Added**
- **Clothes** (`core/shop.js`, art in `art/wardrobe.js`): 11 items in four slots: Petal bow (a gift), Beanie, Little crown,
  Wizard hat (head); Sunglasses, Heart glasses (face); Bow tie, Cosy scarf (neck); Striped tee, Overalls, Heart sweater (body).
- **A size for every stage:** Bulb, Bud, Blossom and Elder. Each size is bought separately (Bulb ×0.4, Bud ×0.65 of the
  Blossom price) and kept for every future Bubby at that stage, of any race. Pick an item once and Bubby wears the size that
  fits as it grows. Prices in points: common 24 / 39 / 60 / 60, rare 48 / 78 / 120 / 120, wizard hat 80 / 130 / 200 / 200.
- **Fit on every body:** garments are drawn from each body's measurements: the classic bodies (every Bulb, the Leafling Bud and
  Blossom) use measured rigs, the other races (Mossback, Puddle, Shroomling, Emberling, Starling) are measured from their own
  pixels. Shirts are painted on the visible body only, nothing but glasses touches the face, glasses follow the eyes, an Elder's
  own glasses step aside for shop glasses, and each garment picks the colourway that stands out on that body.
- **Growing out of clothes:** when Bubby grows and has no size of what it wears, the old piece pops off and floats away at the
  end of the growing-up flash, a toast says which size to get, the ★ button gets a dot, and the Shop opens on that item with a
  note. It is also noticed when Bubby grew up while the popup was closed (in "while you were away", or as a toast).
- **Garden decor** (`art/decor.js`): 3 lawns (Clover, Snow, Autumn), Bunting, Apple tree, Sunflowers, Mushroom house, Lantern
  (glows at night), Garden gnome, Birdbath, Flower patch, Lily pond, Stepping stones, and ambience (Butterflies, Fireflies that
  glow at night, Petal breeze), 80 to 180 points. Each sits in a fixed spot that never covers the poop, the falling seeds or
  Bubby; the default Meadow and flower pot are pixel-identical to before. Ambience pauses during games and with reduced motion.
- **Shop screen:** the Shop tab has three sections: Food & medicine (as before), Clothes and Garden. Clothes shows each item in
  its four sizes, each drawn on Bubby's own race; a live preview (pinned while you scroll) tries things on before buying, and
  Blossom and Elder sizes show on all three forms before Bubby has grown. Buying asks once more to confirm and can be undone
  for 10 seconds; a "Wearing now" list takes things off. Buying counts for the Shopper goal.
- **Welcome gift:** every Bubby, new or from an older save, gets the Petal bow in all four sizes, worn, with a toast.
- The toolbar icon shows the outfit (a hat or scarf the crop would cut in half is left out).
- Checks: `tools/wardrobe-audit.mjs` (every garment on every race, stage, form, chubby and pose: 29,568 sprites, plus a check
  that Bubby without clothes is pixel-identical to before), `tools/garden-audit.mjs`, `tools/test-shop.mjs`, and new clothes
  and garden steps in `tools/check-mobile.mjs`.

**Changed**
- Bubby is drawn in the garden with `wornSprite` (8 px of headroom for hats, clothes put on before the ink outline);
  `petSprite` is unchanged (album, ID card, Bubbydex, tests). Status bubbles sit above a hat.

**Saves:** the wardrobe is `S.wardrobe` (owned sizes, what's worn, the garden), in `META_KEYS`, so it carries over to every new
seed and "Start over" like the points. Older saves get a wardrobe with the welcome gift in `migrate()`; a damaged one is
repaired (unknown items are kept but never drawn).

**Checks:** rules-check 158 passed, sim-check, check-extension, check-v11, check-mobile, test-shop (20), wardrobe-audit
(29,568 dressed sprites), garden-audit: all pass. One check-mobile run out of eight had an intermittent failure that didn't
come back in seven reruns.

**Owner still to do:** try the Android test build and the zip; look at the clothes contact sheets
(`node tools/wardrobe-audit.mjs` → `dist/audit/`); then submit when happy.

## 1.2.0 (21 Nov 2026): Personalities and 82 things Bubby does on its own
Status: built and tested; **not submitted**. Package: `release/bubby-1.2.0.zip`. Android test build: `dist/bubby-android-1.2.0.apk`.

Owner's request: give every Bubby its own personality (playful, bratty, serious, sassy, foodie, jokester, scaredy cat…), shaped by
its race, that changes how fast it gets hungry or sad, how much food and games help, how often it gets sick and so on; and over
60 little things it does on its own at random moments (a bath, crying, playing with a ball, picking flowers, eating…) that every
Bubby can do, with race and personality making some more likely. Owner chose: reveal the personality gradually, build it all at
once, and use the existing races (not a separate "seed kind"). Design: `docs/PERSONALITY-PLAN.md`.

**Added**
- **Personality** (`core/persona.js`), rolled when the seed is planted and leaning its race's way: five traits with a name at each
  end (Serious/Playful, Picky/Peckish, Sweet/Bratty, Timid/Brave, Delicate/Hardy, each −2 to +2) and two quirks out of twelve
  (Jokester, Diva, Dreamer, Neat-freak, Mud-pie, Cuddlebug, Explorer, Songbird, Show-off, Sleepyhead, Night owl, Bookworm).
  Leanings: Leafling Playful and Sweet, Mossback Serious and Hardy, Puddle Delicate and Picky, Shroomling Timid and Peckish,
  Emberling Bratty and Brave. A Bud that turns out to be a Starling keeps its personality and sees rare behaviours twice as often.
- **What the traits change** (every one a trade-off, capped): hunger and happiness drain (±8% a step), happiness from won
  games (±20%), meals and snacks, a Picky Bubby sometimes pushing a meal away (never when really hungry, no cost), time between
  tantrums and discipline from a scold, fear of the dark, how fast poop and weight make it ill, medicine doses (±1 at the ends)
  and whether a cure cheers it up. Quirks: a Neat-freak minds poop more and loves a clean-up, a Mud-pie the opposite, a
  Sleepyhead goes to bed a little sooner on Quick.
- **Getting to know it:** the first quirk shows when the egg hatches, the second when it becomes a Bud, a trait has a 40% chance of
  showing each time Bubby does something that gives it away ("You noticed: Pip is Timid!"), and everything is known by Blossom.
  **Status → Nature** ("Playful Jokester ▸") opens a Personality screen with what you know (hover a trait to see what it does).
- **82 things Bubby does on its own** (`core/behaviors.js`, animations in `popup/behave.js`, props in `art/props.js`): every 12–30
  seconds while you watch, for 2–6 seconds. Play, food, garden, cleaning, calm, jokes, sass, bratty, timid and brave, feelings, Bulb
  and Elder only, and three special days (snow in winter, a pumpkin hat around Halloween, a party hat on days 3 and 7). Personality,
  race, adult form, stage, mood and the date decide which ones show most. Crying, tummy rumbles, yawning and sneezing only happen
  when Bubby is sad, hungry, sleepy or getting ill: soft hints before it calls. They never change hearts, points or anything else.
- **Journal:** the Personality screen counts the behaviours you've seen ("12 of 82 habits"); rare ones get a toast. Kept across
  lives, like the Bubbydex. "While you were away" mentions one to three things Bubby did.

**Changed**
- Medicine doses and the happiness change on a cure now depend on the Delicate/Hardy trait.
- Seed catch: a pebble stuns a Timid Bubby a little longer.

**Saves:** format `v: 2` unchanged. New fields `persona` and `journal` (kept across lives) come from `fresh()`. An older Bubby gets
a personality from its own race when it loads, with what its stage would already have shown revealed, and a one-time message.
Privacy policy updated: the personality and journal are stored on the device only.

**Checks:** `rules-check` 158 (21 new: races lean the personality, two different quirks, each trait's effect, a picky eater never
refuses when really hungry, doses and cures, reveals at hatch, Bud and Blossom, journal carried over, old saves, every behaviour has
an animation, personality shifts what Bubby does, sad Bubbies cry and happy ones don't), `sim-check` (every sensible player still
reaches a full life; a new table plays the hardest and easiest possible personality), `check-extension` (the Personality screen opens
and fits), `check-v11`, `check-mobile` (the Personality screen opens and fits on a phone, no errors while behaviours play).

**Owner still to do:** watch Bubby for a few minutes on the phone and in the browser (it should do something every 12–30 seconds),
check Status → Nature, then submit 1.2.0. Numbers to tune are at the top of `core/persona.js` (`mods`).

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
