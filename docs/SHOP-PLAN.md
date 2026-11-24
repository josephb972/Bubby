# Bubby shop: clothes and home decoration

Status: **Phase 0 and Phase 1 built (extension v1.1.0)**, plus part of Phase 2 (11 clothes, 16 paid decor items,
ambient effects). Waiting on the owner's playtest. Scope: the extension (`extension/`). The original `index.html` game keeps its own
rules and is not touched unless the owner asks.

Goal: players spend an earned currency on **clothes for Bubby** (a separate size for each growth stage) and
**decorations for Bubby's garden**, and it always looks right: every garment fits every form of Bubby at every stage,
every decoration sits well in the 100×75 pixel garden, and nothing about the care game's balance changes.

---

## 0. Decisions made in this plan (change any of them before building)

| # | Decision | Why |
|---|----------|-----|
| D1 | **In-game currency only, no real money.** Currency is called **Petals** (placeholder name). | The Chrome Web Store has no in-app payments for extensions, and taking payment elsewhere adds store-policy and privacy risk. Revisit only if the owner wants a supporter pack. |
| D2 | **Purely cosmetic.** Clothes and decor never change hunger, happiness, discipline, evolution or pace. | Keeps `core/rules.js` untouched, so `node tools/sim-check.mjs` stays valid and nothing is pay-to-win. |
| D3 | **The wardrobe and money live outside Bubby's save** (new storage key `bubby-meta`). | Bubby's save is thrown away on "Plant the new seed" and "Start over". Items must survive that, otherwise one click destroys a player's collection. |
| D4 | **Four sizes: Bulb (S), Bud (M), Blossom (L), Elder (XL).** Each size is bought separately, as asked. The seed has no body, so no clothes (decor still shows). | Matches the four bodies in `art/sprites.js`. Elder shares Blossom's body but has its own shifted petals, glasses and cane, so it gets its own size. |
| D5 | **Sizes are reusable in every future generation.** Each new Bubby starts as a Bulb again. | This is what makes buying several sizes fair: a Bulb-size hat is worn again every generation. |
| D6 | **Clothes are drawn by code, not image files** (like all of Bubby's art today). | Fit is calculated per body, the package stays tiny, no asset-rights issues, and every combination can be tested automatically. |
| D7 | **Optional, to confirm:** owners of a garment get **40% off the next size**. | The brief says sizes are bought separately; this keeps that, but softens the "my Bubby just grew and now it's naked" moment. Built but **off** (`SIZE_UP_DISCOUNT = 0` in `core/shop.js`); set it to `0.4` to turn it on. |

---

## 1. What exists today (facts the plan is built on)

- Bubby is drawn in `extension/art/sprites.js` as a **48×48 sprite** per stage, then given a 1px `INK` outline.
  `petSprite(stage, o)` caches by stage + mood + variant + chubby + sick + blink + look.
- Four bodies: **baby** (round body, sprout on top), **child** (body plus a tall flower bud), **adult** and **senior**
  (face disc inside a ring of petals, small body, arms, feet).
- "Races" = the three adult forms **radiant / daisy / thistle** (different palette, thistle has 10 smaller petals and a
  bigger ring, radiant has wings and a rainbow belly patch) plus **chubby** (body, arms and wings are 2px wider; chosen
  once at the child→adult change) plus the **senior** look (washed-out colours, glasses, cane, lower petals).
  Variant is only known at adult; baby and child have none.
- Where things are: head tops `HEADTOP = seed 23, baby 17, child 9, adult 5, senior 5`. Adult head disc is centred at
  (24,21) r8.5, body at (24,39). The face is drawn at a stage-specific spot (`FACE`).
- The garden (`scene.js`) is a 100×75 canvas: grass background, a pot at (82,34), four poop slots
  `[80,64] [90,64] [70,65] [88,56]`, Bubby walks only between x≈16 and 60, the seed-catch game drops items across the
  full width, and night darkens everything.
- The toolbar icon (`art/icon.js`) crops a 16px face or a 32px body from the same sprite, in the background worker
  (OffscreenCanvas).
- There is **no currency, no inventory and no shop** yet. `replant()` and "Start over" both call `Rules.fresh()`.
- Life lengths (Chill pace): Bulb 12 h, Bud 2 d, Blossom 5 d, Elder 2.5 d. (Classic: 6 h, 20 h, 2 d, 1 d. Quick: minutes.)

---

## 2. How clothes are made to fit perfectly

Fit can't rely on "draw it and hope". Three layers of protection:

### 2.1 Garments are built from a body rig, not from fixed pixels

A new module `art/wardrobe.js` holds one **rig** per stage (and per adult variant where it differs). A rig is a small
table of anchors read from the real drawing code, for example:

```
rig.adult = { headCx: 24, headTop: 5, crownW: (variant) => ..., neckY: 29,
              body: {cx: 24, cy: 39, rx: 7.5 + ch, ry: 6.5}, faceSafe: {x0: 17, y0: 18, x1: 31, y1: 28},
              feetY: 45, armL/armR: ..., sproutHole: null }
```

Garments are functions `draw(x, rig, colorway)`. They use the rig numbers, so a shirt for the chubby Blossom is wider
by exactly the amount the body is wider. The same garment function gives four sizes, but each size is still its own
**product** (own price, own owned/not-owned flag).

### 2.2 Three kinds of garment, with different guarantees

| Kind | Examples | Guarantee |
|------|----------|-----------|
| **A. Painted-on** (clipped to the body's own shape with `source-atop`) | shirts, stripes, overalls, onesies, spots, face paint | **Cannot spill outside Bubby by construction**, for any race, size or chubby. |
| **B. Anchored overlays** (drawn at rig anchors, may overhang on purpose) | hats, bows, scarves, glasses, bow ties | Checked by the automatic fit audit (2.3). Each has a maximum overhang. |
| **C. Hand-fitted per stage** (fallback) | anything B can't make look good procedurally | Authored pixel by pixel for each stage, still audited. Use sparingly. |

### 2.3 Automatic fit audit: `tools/wardrobe-audit.mjs`

Renders every garment × every stage × all three adult variants × chubby on/off × senior × moods (normal, happy, sad,
sleep, sick, blink) × eye "look" offsets −2…2, in Chromium (Playwright, like `check-extension.mjs`). **Fails the build** if:

1. **Spill:** a kind-A garment has any pixel outside the body mask (the 1px outline is allowed).
2. **Face:** any non-eyewear garment touches the face-safe rectangle; eyewear covers only the eye rows and moves with `look`.
3. **Overhang:** a kind-B garment extends past its allowed margin, or past the 48×48 canvas edge (the outline needs 1px).
4. **Gap:** a hat or collar floats with a gap between it and the head or neck.
5. **Contrast:** garment colour vs the body colour under it is too close (ΔE below 25, e.g. a red scarf on a radiant red
   body). The item then must supply another colourway; each variant gets the best-contrasting one automatically.
6. **Orphans:** stray single pixels that weren't authored.
7. **Rules untouched:** the unclothed sprite is pixel-identical to today's (golden image), so adding clothes can't
   break the base art.

It also writes a **contact sheet PNG** (`store/`-style, not committed) with every combination at 4×, so a human
reviews the look in one glance. Nothing ships until the sheet has been looked at.

### 2.4 Per-body details that will bite if forgotten

| Body | Trap | Solution |
|------|------|----------|
| Bulb | Sprout leaves on top; body is a blob with no neck | Hat sits on the top of the body, with a **sprout hole** (the sprout is drawn again on top, so the leaves poke through). No neck items; a bow tie sits on the upper chest. |
| Bud | Tall flower bud (y 10–26) above the body, face on the body, not on the bud | Hat anchors to the bud's top and is narrower than the bud; scarf goes between bud and body. |
| Blossom | Head ring of petals; thistle ring is wider (10 petals, radius 11.5) | Hat width comes from the **ring width per variant**; three hat widths per size. Wings on radiant sit behind the body, so back items are drawn *before* the body and the wings are hidden/shifted (or the cape is disabled on radiant: set per item). |
| Chubby Blossom/Elder | Body, arms, wings 2px wider; head unchanged | Rig adds `ch` to body-related widths only, never to hats. |
| Elder | Senior always wears glasses; cane at x 35+ch; lower petals 1px lower; washed-out palette | Chosen eyewear replaces the built-in glasses (never two pairs). No held items (cane's hand). Hat anchor is the same as Blossom; garments stay vivid (not washed out), so they still look like treats. |
| Evolve flash | The scene alternates the old and new sprite for 1.3 s | Outfit is resolved **per stage**, so the flash shows the old size on the old body and the new size on the new body. |
| Sick | A green tint is applied to the whole sprite | Garments get the same tint (it's applied after compositing); the audit includes the sick pose. |
| Sleep, blink, look | Faces change every frame | Faces are drawn first; eyewear is drawn after and reads the same `look` offset. |
| Toolbar icon | 16px crops only the face | Icon shows hats and eyewear only if they're inside the crop; otherwise it stays clean. The 32px body crop shows the full outfit. Check at both sizes. |

### 2.5 Engine change (small, safe)

- Garments are composited **before** the outline pass, so they get the same 1px ink outline as Bubby (they look drawn
  by the same hand).
- Sprite size grows from 48×48 to **48×56 with 8px headroom** (drawn 8px lower inside it; the three places that draw it
  shift up by 8). Today an adult's head top is at y=5, which leaves almost no room for a hat. The golden-image test proves
  the unclothed pixels don't move.
- Cache: keep the base body and garment layers separate, then composite. Key = stage, mood parts, variant, chubby,
  sick, blink, look, and a short **outfit signature**. Raise the cache clear limit from 300 and add a count of
  entries to the debug helper so a cache storm can be spotted.

---

## 3. The size system (the part players must understand instantly)

- Every garment card shows **four size chips**: Bulb, Bud, Blossom, Elder, each with a tiny sprite of that body wearing
  the item. States: **owned**, **buy** (with price), **current** (a ring on the size Bubby is now).
- Bubby always wears the item in the size that matches its **current** stage. If that size isn't owned, Bubby simply goes
  without it (no broken or stretched clothes, ever) and the closet shows "needs Blossom size".
- **Equip is by item, not by size.** Choose "Beanie" once; when Bubby grows, the owned Blossom beanie appears
  automatically.
- **Outgrown moment** (the emotional peak, so design it carefully): when Bubby evolves and the worn item has no size
  for the new stage, a cheerful toast says "Bubby grew out of its Beanie! Get the Bud size?" with a shortcut to that
  item. The old garment does a small pop-off animation, not a sad one. In the "while you were away" list it appears as
  "Bubby grew out of its Beanie". **No extra system notification** (the daily notification budget is for care needs only).
- **Buy for later:** future sizes can be bought early (a "for later" chip). Past sizes can still be bought (they're used
  in the next generation).
- **Try before you buy:** every item and every size is previewed on the live Bubby, or, if the size is for a different
  stage, on a small sprite of that stage. Before adulthood the variant is unknown, so adult sizes show a three-form
  strip (Radiant / Daisy / Thistle) so nobody buys a hat blind.
- **Starter gift:** one free item (e.g. a leaf bow) in **all four sizes**, so everybody sees the system working and
  understands sizes in the first minute.

---

## 4. Currency and prices

### 4.1 Earning Petals (no new chore, and no farming)

| Source | Petals | Limit |
|--------|--------|-------|
| Seed catch result | `round(score / 2)`, min 1, max 12 | First **3 paid games per day** |
| Which way? (won) | 3 | Counts within the same 3 per day |
| First care action of the day (any real feed, clean, medicine…) | 5 | Once per day |
| New best catch score | +5 | Each time the best improves |
| Bubby evolves | +20 | Per evolution |
| Full life (returned to the garden) | +60 | Per life |
| Bubby moves away | +15 | Consolation, never zero |
| First time using each shop feature | small | One-off, teaches the shop |

A casual player (3–5 check-ins a day) earns about **30–40 Petals a day**, about **350 per Chill life**. Rewards are
claimed by the **popup only** (it reads `S.events` and remembers the last claimed event id in `bubby-meta`), so the
background worker and the popup never both write the wallet.

### 4.2 Price table (single source of truth in `core/shop.js`, tunable)

| Rarity | Blossom-size price | Examples |
|--------|-------------------|----------|
| Common | 40 | beanie, sunglasses, bow tie, scarf, striped tee |
| Rare | 80 | little crown, heart glasses, overalls, heart sweater |
| Epic | 150 | wizard hat |

Size multipliers: **Bulb ×0.4, Bud ×0.65, Blossom ×1.0, Elder ×1.0**, rounded. So a common item is 16 / 26 / 40 / 40,
and the whole family costs 122 (about 4 days of casual play). With D7 on, the 2nd, 3rd and 4th size cost 60% for owners.
(The first draft had 30 / 60 / 110; `sim-economy` showed a hardcore player finishing in 48 days, so prices went up.)

Bulb is cheap on purpose: that stage lasts only 12 hours (Chill) or minutes (Quick). It's mainly used from the second
generation on.

Decor: lawns 100, bunting 50, back props 80–120, centrepieces 80, corner 50–90, path 50, ambient effects 120.

Built catalogue: 11 clothes (one free gift) and 18 decor items (two free defaults), **3,464 Petals** for everything.
`sim-economy`: a casual player (31 Petals a day) completes it around day 110, a hardcore one (55 a day) around day 62,
and an idle one still earns 14 a day from Bubby growing up.

### 4.3 Economy safety

- Everything is tested with **`tools/sim-economy.mjs`**: simulated casual, hardcore and idle players over 120 days.
  Targets: first purchase within the **first session**, something new to buy every 0.5–3.5 days early on (the
  simulated shopper buys the cheapest thing first, often a Bulb size, so this is faster than "an item every 2–3
  days"), no player can finish the catalogue in under 60 days with the daily caps, and an idle player still earns.
- **Clock cheating:** the caps are keyed to the local date, and a clock that goes backwards is ignored (`lastEarnAt`).
  The game is offline and single-player, so a determined player editing storage can't be stopped and isn't harmed;
  just don't make it easy by accident (time-zone changes must not pay twice or lock a player out for a day).
- **No pressure mechanics:** no streak loss, no timers on items, no "limited time" shop, nothing sold that Bubby needs.
- **Accidental buys:** a confirm step that shows balance before and after, plus **10 seconds of Undo** after buying
  (full refund within that window only).
- **Can't afford:** show "12 more Petals" and a hint on how to earn them, never a dead button.
- **Welcome grant:** 30 Petals for everyone, and existing players (saves from v1.0.0) get 3 more per past win
  (`stats.wins`, capped at 150), so nobody who has played a lot starts at zero.

---

## 5. Home decoration

### 5.1 The garden is built from fixed slots (no free placement)

Free dragging looks messy and breaks the poop, the pot and the games. Instead the 100×75 garden has **named slots**,
and each decor item belongs to exactly one slot type:

| Slot | Area | What goes there | Notes |
|------|------|-----------------|-------|
| **Ground** | whole background | lawn themes: meadow (free, today's), clover, autumn, sand, snow, dusk | Replaces the grass tile; keeps the noise pattern so it stays "Bubby's grass". |
| **Back row** | y 4–30, three spots | fence, hedge, tree, windmill, bunting, rainbow | Drawn behind Bubby. Never lower than y 30. |
| **Centrepiece** | where the pot is (82,34) | pot (free, today's), birdbath, gnome, lantern, mini windmill | One item. |
| **Floor accents** | left part, x < 64, y 52–64, three spots | flower patch, stepping stones, mushrooms, toy ball | **Never** x 66–96 where poop appears. |
| **Ambient** | whole garden, 1 effect | butterflies, falling petals/leaves, fireflies (night), snow | Slow, tiny, low-contrast, behind items. |

### 5.2 Hard rules (so nothing can go wrong gameplay-wise)

1. **Poop must stay obvious:** the four poop slots and a 4px margin around them are reserved; no decor pixel is drawn
   there. Decor on the same ground colour must also keep contrast against the pink poop (audit-checked).
2. **Seed catch must stay readable:** decor is drawn first; falling seeds, gold seeds and pebbles are always on top.
   Ambient effects are **switched off during the minigame**. The audit checks seed/pebble/gold contrast against each
   ground theme (a brown seed on an autumn lawn is the classic trap; the autumn theme keeps seed colours distinct).
3. **Bubby must stay the star:** nothing taller than the back-row limit; Bubby's walking lane (x 16–60, ground line
   y 67) is free of tall props; colours of props are slightly less saturated than Bubby's.
4. **Night:** the darkness overlay covers decor, **except glow items** (lantern, fireflies, windows) which are drawn
   after it so they glow. The stars stay.
5. **Cleaning wave and evolve flash** pass over decor without hiding it permanently.
6. **Reduced motion:** ambient effects are static when the system asks for reduced motion.
7. **Pet in sleep, sick, paused:** decor stays; ambient pauses with the game.
8. **Both looks** (toy pod and compact) draw the same canvas, so decor works in both with no extra work.

### 5.3 Making it beautiful

- Reuse the existing palette families (grass greens, ink `#3b2f4a`, the warm/cool pairs already used by Bubby), three
  tones per material (shade, base, light), light from the **upper left**, the same as the existing sprites.
- The same code-drawn pixel style (`E`, `ER`, `R`, `P` helpers), 1px ink outline on props, no anti-aliasing, no gradients.
- Two-frame idle animation at the existing 1.6 Hz cadence, so props feel alive but calm.
- Themes are **coherent sets** (e.g. "Autumn": ground + tree + leaves + lantern) with a small "complete the set" cue,
  not a random pile.
- A **garden contact sheet** (`tools/shop-sheet.mjs`): each decor item and set on the scene with four poops, Bubby at
  the left and right limits, a falling-seed frame, and the night overlay, at 4×.

---

## 6. Screens and flow (new, matching the existing look: Fredoka and Pixelify, ink and pastel)

- **Entry:** a small **bag icon** in the corner opposite the settings gear on the toy pod (it must not touch the
  five photo hot-spots), and a third round button next to pause and settings in the compact look. Nothing existing moves.
- **Shop view** (a full view like Settings, so the pod artwork isn't altered):
  top **live preview** (the real garden with Bubby); tabs **Clothes · Home · Closet**; wallet chip with the Petal count.
- **Clothes:** slot filter (Head, Face, Neck, Body); item cards with the four size chips; "Wear" / "Buy" / "Preview".
- **Home:** slot filter; "Place" / "Buy" / "Preview"; sets shown together.
- **Closet:** what you own; a doll view with the four slots; "needs another size" flags; **Take everything off** button.
- **Keyboard and screen readers:** everything reachable by Tab, items have names and states ("Beanie, Blossom size, owned"),
  contrast meets AA, and nothing relies on colour alone (owned has a tick, not just a green border).
- **Seed and ended states:** shop opens; clothes can be bought but the preview says "Bubby is still a seed" and shows the
  small sprite of the next stage.
- **Paused / asleep / popup closing mid-purchase:** a purchase is a single write; either it happened or it didn't.

---

## 7. Data and code structure

```
extension/core/shop.js      catalogue data, sizes, prices, earn rules, canBuy/buy/equip (pure, no DOM)
extension/core/meta.js      load / save / migrate for `bubby-meta` (separate from the pet save)
extension/art/wardrobe.js   rigs + garment draw functions
extension/art/decor.js      decor draw functions and slot map
extension/art/sprites.js    petSprite(stage, o) takes an outfit signature (small change)
extension/popup/shop.js     shop view; popup.css gets a shop section
extension/popup/scene.js    drawScene(…, look) draws ground, back row, centrepiece, floor, ambient, glow
extension/art/icon.js       icon reads the outfit (hats and eyewear only when they fit the crop)
tools/wardrobe-audit.mjs    fit audit and contact sheet (2.3)
tools/sim-economy.mjs       economy simulation (4.3)
tools/shop-sheet.mjs        garden contact sheet (5.3)
```

`bubby-meta` (version 1):

```js
{ v: 1, petals: 40, lifetime: 40, owned: { 'beanie': ['S','M'], 'leafbow': ['S','M','L','XL'] },
  equip: { head: 'beanie', face: null, neck: 'leafbow', body: null },
  home: { ground: 'meadow', back: [null,null,null], centre: 'pot', floor: [null,null,null], ambient: null },
  claimedSeq: 0, earned: { day: '2026-11-24', games: 0, firstCare: false }, lastEarnAt: 0, seen: {} }
```

- **Never stored inside the pet save.** `migrate()` for the pet save needs no change.
- Unknown item ids (e.g. after a downgrade) are kept in `owned` but ignored when drawing, so a newer version's items
  come back after an update.
- **One writer at a time:** only the popup writes `bubby-meta`; the background worker only reads it (for the icon). The
  popup re-reads it on `chrome.storage.onChanged` so two open windows (the toolbar popup and the fallback window) agree.
- **Backup:** Settings gets "Copy wardrobe code" and "Paste wardrobe code" (a short, checksummed string), because
  `chrome.storage.local` is cleared if the extension is uninstalled. `chrome.storage.sync` is a later option; it needs a
  privacy-policy change and conflict handling.
- **Start over** keeps the wardrobe and Petals and says so; a separate "Reset shop" in Settings needs a typed confirmation.
- **No new permissions, no network.** The privacy statement stays true; add one line to `docs/PRIVACY.md` that purchases
  are stored only in local storage.

---

## 8. What can go wrong, and the plan for each

### Fit and looks
| Risk | Plan |
|------|------|
| A hat is cut off at the top of the adult sprite | 8px headroom (2.5); the audit's canvas-edge check. |
| A garment covers the eyes or mouth, or glasses don't follow where Bubby looks | Face-safe rectangle; eyewear reads the `look` offset; audit covers all `look` and mood values. |
| Clothes don't suit a rare form (thistle, chubby, senior radiant wings) | The audit renders **every** combination; the contact sheet is reviewed by a person before release. |
| Colour clash (red scarf on a red body) | Colourways with automatic contrast choice and a ΔE check. |
| Garment looks "stuck on" or in a different style | Composited before the outline; same helpers and palette; style rules in 5.3; a reviewer checklist. |
| Two items fight for the same space (hat + sprout, glasses + senior glasses, cape + wings) | Slot rules, `conflicts` field per item, and an explicit "sprout hole" and "replace glasses" behaviour. |
| Clothes disappear or jump during evolution | Outfit resolved per stage; evolve-flash test with an outfit. |
| Item invisible on the 16px toolbar icon, or breaks the icon | Icon shows an item only if it fits the crop; test at 16 and 32. |
| Soft or blurry on high-DPI screens | Everything is canvas pixel art with `image-rendering: pixelated`, unaffected by the pod photo issue; check at 2×. |

### Economy and fairness
| Risk | Plan |
|------|------|
| Players grind games for Petals | Daily cap of 3 paid games; reward capped; no care benefit from extra play beyond today's rules. |
| Too slow / too fast to earn | `sim-economy` targets; prices live in one table; a "Petals" tuning pass after the playtest (add to the existing 3–5 friends test). |
| Bulb sizes feel like a waste (12 h) | Cheap (×0.4), reused each generation, and shown that way ("worn every new Bubby"). |
| Bubby grows and loses its outfit, player feels punished | The outgrown moment (section 3), optional 40% off next size (D7), starter gift in all sizes. |
| Wrong purchase | Confirm + 10 s undo. |
| Lost progress when Bubby dies or on "Start over" | Wardrobe is separate (D3); start over keeps it. |
| Reinstall wipes everything | Wardrobe code backup; a note in the shop. |
| Existing players start at zero | Welcome grant (4.3). |
| Double-claim of rewards (popup and worker, or two windows) | Popup is the only writer; `claimedSeq` makes claiming idempotent; unit test that claims twice. |
| Clock changes (time zone, travel, daylight saving) | Local date key plus "clock went backwards" guard; test cases in `sim-economy`. |

### Game and UI
| Risk | Plan |
|------|------|
| Decor hides poop, or makes it hard to see | Reserved poop areas; audit contrast vs poop on every ground. |
| Decor camouflages falling seeds, or covers Bubby in the games | Decor behind items; ambient off in games; seed contrast check per ground. |
| Cluttered, ugly garden when everything is bought | Fixed slots, limited counts, sets, and reserved Bubby lane. |
| Shop crowds the pod and breaks the artwork | Corner button plus a separate view; no change to the photo hot-spots; screenshot test of both looks. |
| Popup slows down | Layers cached; ambient is a few sprites; frame-time check in `check-extension.mjs`. |
| Stale save shape or a downgraded extension | Versioned `bubby-meta`; unknown ids preserved; defensive loaders (a corrupt meta loads as a fresh one and the bad copy is kept under `bubby-meta-bad`). |
| Storage quota | A wardrobe is under 2 KB; the limit is 10 MB. |
| Notifications become spammy | No new notifications from the shop, ever. |

### Store, legal and process
| Risk | Plan |
|------|------|
| Review rejection | No new permissions, no remote code, no payments; the description says "earned in play"; update the privacy line. |
| Misleading listing | Update `docs/STORE-LISTING.md` and re-run `node tools/store-images.mjs` (screenshots must show the real shop). |
| Rights | All art is drawn in code by this project; fonts are already OFL. |
| Regression in the pet itself | `rules.js` unchanged; `sim-check` and `check-extension` must pass; the golden image of the unclothed sprites; save compatibility test with a v1.0.0 save. |
| Scope creep | Phased plan below; each phase ships on its own. |

---

## 9. Phases and checklist

Tick items as they are done. Owner: **Claude** = a coding session, **You** = needs the owner.

### Phase 0: groundwork (no visible change)
- [x] D1–D7 built as written above (D7 off), currency called Petals. Change any of them if you disagree. (You)
- [x] Headroom refactor of `petSprite` plus golden-image test showing the unclothed sprites are pixel-identical. (Claude)
- [x] `core/meta.js` with load, save, migrate, backup code, and unit tests (including corrupt data and a v1.0.0 save). (Claude)
- [x] Rig table in `art/wardrobe.js` for baby, child, adult, senior (+ variants, chubby). (Claude)
- [x] `tools/wardrobe-audit.mjs` working with a dummy garment. (Claude)

### Phase 1: MVP (about 6 clothes, 6 decor, one release)
- [x] 1 starter item in four sizes (free) plus 5 more items across Head, Face, Neck, Body. (Claude)
- [x] Fit audit passes and the contact sheet is reviewed by Claude (4,928 dressed sprites). (Claude)
- [ ] Look at the contact sheets yourself: `node tools/wardrobe-audit.mjs`, `node tools/garden-audit.mjs` → `dist/audit/`. (You)
- [x] Earning rules and the welcome grant; `sim-economy` targets met. (Claude)
- [x] Shop view, closet, size chips, outgrown moment, undo. (Claude)
- [x] 2 ground themes, 2 back props, 1 centrepiece, 1 floor accent in the slot system; poop/seed audits pass. (Claude)
- [x] Icon support; evolve-flash and sick/sleep checks. (Claude)
- [x] Extend `node tools/check-extension.mjs` (buy, equip, evolve with outfit, replant keeps wardrobe, start over keeps wardrobe). (Claude)
- [x] Version 1.1.0, store images, listing and privacy line updated. (Claude)
- [ ] Playtest with 3–5 friends: is earning too slow, are sizes understood, do clothes look good? (You)

### Phase 2: full catalogue (about 20 clothes, 16 decor)
- [ ] More items and sets. Done so far: 11 clothes, 16 paid decor items, ambient effects (butterflies, fireflies, falling petals). (Claude)
- [ ] Optional D7 discount on, if the playtest shows the grow-out moment stings. (Claude)
- [ ] Accessibility pass (keyboard, screen reader, contrast). Done so far: tabs with arrow keys, labelled size chips and wallet, focus kept after each change, Escape and B shortcuts, reduced motion freezes ambient effects. Still to do: a screen-reader run-through. (Claude)

### Phase 3: later
- [ ] Seasonal sets (no limited-time pressure: they come back every year).
- [ ] Optional wardrobe sync across devices (`chrome.storage.sync`).
- [ ] Phone version reuses the same catalogue and rigs.

---

## 10. Definition of done for any new item

1. Drawn from the rig; all four sizes defined with prices from the table.
2. Passes `wardrobe-audit` (or the decor audits) with no waivers.
3. Reviewed on the contact sheet in all forms, including thistle, chubby and Elder.
4. Looks right on the toolbar icon (or is hidden there on purpose).
5. Has a clear name, a one-line description and an accessible label.
6. `node tools/sim-check.mjs` and `node tools/check-extension.mjs` still pass.
