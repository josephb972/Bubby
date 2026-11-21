# Personality & behaviours: design plan

Status: **built in extension 1.2.0** (owner chose: gradual reveal, everything at once, and, once the 1.1 races were in, the
races instead of separate seed kinds).

**Races instead of seed kinds.** Section 1 below was written before the extension had races. In 1.2.0 the races from 1.1
(content.js) carry the leanings instead (`LEAN` in `core/persona.js`): Leafling Playful +1 and Sweet, Mossback Serious and
Hardy, Puddle Delicate and Picky, Shroomling Timid and Peckish, Emberling Bratty and Brave. The personality is rolled from the
seed's race when it is planted; a Bud that becomes the rare Starling keeps it and sees rare behaviours twice as often. There are
no seed-kind colours (the egg already wears the race's colours) and no family line (races stay random). The first quirk shows
when the egg hatches. Numbers are starting values to
tune with `node tools/sim-check.mjs`. What differs from the proposal below:

- 82 behaviours: the 72 in the catalogue plus a sneeze (when sick or the garden is dirty), 2 Bulb, 4 Elder and
  3 special-day ones.
- The full personality is on its own screen, opened from **Status → Nature** (it didn't fit in Settings without
  scrolling). The journal count ("Seen: 12 of 82 habits") is shown there.
- Neat-freak and Mud-pie are never rolled together.
- Reveal: Bulb reveals the first quirk, Bud the second, a temperament trait has a 40% chance of being revealed each
  time Bubby does a behaviour that shows it, and Blossom reveals everything that's left.

## Goals

1. **Every Bubby feels like a different individual**, from the moment the seed is planted.
2. **Personality changes how you care for it**, but no Bubby is strictly "worse": every trait is a trade-off.
3. **Bubby looks alive when you open the popup**: it does its own little things (60+ behaviours), and what it
   does hints at who it is and how it feels.
4. **A reason to open the popup again**: rare behaviours, a journal to fill, and a personality you discover over time.

## 1. Seed kind (the "race")

Today the only "race" is the adult form, which is decided by care quality at adulthood. That's too late to drive
personality, so a **seed kind** is rolled when the seed is planted. It shows on the seed (shell colour) and in the name,
and it biases the personality roll. The adult form (Radiant / Daisy / Thistle) stays as it is, earned by care, and
adds its own small behaviour flavour later in life.

| Kind | Rarity | Temperament bias | Likely quirks | Flavour |
|---|---|---|---|---|
| **Sun Seed** | common | Playful +1, Brave +1 | Show-off, Songbird, Jokester | Loud, sporty, sunbathes |
| **Honey Seed** | common | Peckish +1, Sweet +1 | Cuddlebug, Jokester, Sleepyhead | Food, cuddles, naps |
| **Thorn Seed** | common | Bratty +1, Hardy +1 | Diva, Explorer, Mud-pie | Attitude, rough-and-tumble |
| **Moon Seed** | uncommon | Serious +1, Timid +1 | Dreamer, Night owl, Bookworm | Quiet, stargazing, reads |
| **Dew Seed** | uncommon | Delicate +1, Picky +1 | Neat-freak, Dreamer, Cuddlebug | Gentle, clean, sensitive |
| **Star Seed** | rare (≈1 in 20) | random, wider spread | any | Extra chance of rare behaviours; collector bait |

Optional later: when you replant, the new seed inherits the kind 50% of the time ("family line"). This gives
`gen` meaning and makes "breeding" for a favourite kind a long-term goal.

## 2. Personality = temperament (5 sliders) + quirks (2 tags)

Two layers keep it readable and balanced:

- **Temperament** is five two-sided sliders, each from −2 to +2 (0 = neutral). Both ends are named, so every value is a
  personality and not a "low score". These are the only ones that change the numbers.
- **Quirks** are two flavour tags. They mostly change which behaviours show up, with at most one tiny rule each.

Roll: each slider = kind bias + a centre-weighted random value (−2…+2, mostly −1/0/+1), clamped to ±2.

### Temperament sliders and their effects

| Slider | − end | + end | Effect per point (starting values) |
|---|---|---|---|
| **Energy** | Serious | Playful | Happiness drains 8% faster per Playful point. Games give 20% more happiness per point. Serious: drains slower, games give less, and a correct scold gives +5 extra discipline per point |
| **Appetite** | Picky | Peckish (foodie) | Hunger drains 8% faster per Peckish point; meals also give +0.1 happiness per point and snacks 10% more. Picky: drains slower, but has an 8% chance per point to push a meal away (no cost, try again) |
| **Manners** | Sweet | Bratty | Tantrums come 15% sooner per Bratty point; a scold gives 4 less discipline per point (harder to raise a Radiant). Sweet: fewer tantrums, but an unfair scold hurts more |
| **Nerve** | Timid (scaredy) | Brave | Timid: lights off while awake drains happiness 50% faster per point, and pebbles stun longer in seed-catch. Brave: the dark doesn't bother it, but its sickness meter from old poop rises 5% faster per point (it pokes at things) |
| **Health** | Delicate | Hardy | Hardy: sickness meter rises 12% slower per point, but needs one extra dose at +2. Delicate: gets sick more easily, but a cure *raises* happiness instead of lowering it, and it needs one fewer dose at −2 |

Guard rails:
- Combined drain multipliers are clamped (hunger ×0.85–1.20, happiness ×0.85–1.25) so no roll breaks the
  "3–5 check-ins a day" promise.
- `sim-check` runs the worst combination (Playful +2, Peckish +2, Bratty +2, Delicate −2, Timid −2) and the
  easiest one, on every pace.

### Quirks (two per Bubby)

| Quirk | Tiny rule (optional) | Behaviours it boosts |
|---|---|---|
| **Jokester** | none | jokes, pranks, silly faces |
| **Diva** (sassy) | none | poses, mirror, hair flips, "hmph" |
| **Dreamer** | none | daydreams, clouds, stargazing |
| **Neat-freak** | poop drains happiness ×1.5, cleaning gives +0.5 happiness | baths, sweeping, brushing |
| **Mud-pie** (messy) | poop bothers it half as much, poops 10% more often | digging, rolling in mud |
| **Cuddlebug** | none (later: tapping gives a little more joy) | waving, hearts, hugging a plushie |
| **Explorer** | none | magnifying glass, climbing, bug-watching |
| **Songbird** | none | singing, humming, dancing |
| **Show-off** | none | tricks, cartwheels, juggling |
| **Sleepyhead** | Quick pace: stays awake 10% less | yawns, naps, nodding off |
| **Night owl** | none | telescope, moth-watching, evening activity |
| **Bookworm** | none | reading, writing, thinking |

### Personality title

The title is built from the strongest slider pole and the first quirk, for example **"Bratty Songbird"**,
**"Timid Bookworm"** or **"Peckish Jokester"**. It's shown in Settings → stats, and in the end-of-life summary.

### Discover it over time (recommended)

You don't see everything at hatch. The kind is known from planting. The first quirk is revealed at Bulb, the
second at Bud, and the sliders are revealed one by one the first time Bubby does a behaviour tied to them
("You noticed: Bubby is **Timid**"). By Blossom, everything is known. This turns the first days into "getting to know
your Bubby", and the reveal toasts are a reason to come back.

## 3. Passive behaviours

### How they run

- **Popup only, purely cosmetic.** Behaviours never change hunger, happiness or anything else, so they can't
  break balance (even "eating an apple" is just for show).
- **When:** Bubby is awake, the lights are on, no care animation or minigame is running. The first behaviour starts
  4–8 s after you open the popup, so it always feels alive; after that, one every 12–30 s, each lasting 2–6 s.
  Between behaviours, the current walk-around continues.
- **Mood tells:** some behaviours only happen in certain states (crying when happiness < 1.5, tummy rumble when
  hunger < 1.5, yawning near bedtime, sneezing when Delicate and the garden is dirty). They are soft hints that
  come before the real call, which is good teaching without more notifications.
- **Interrupts:** any button, a tap on Bubby, or a call stops the behaviour right away.
- **Weight of each behaviour:**
  `w = rarity × Π(1 + 0.35 × slider × affinity) × quirk boost (×2.5) × kind boost (×1.5) × form boost (×1.3)
  × stage filter × mood/time gate × novelty (×1.5 if never seen)`. The last 6 behaviours are excluded, so it never
  repeats too soon. Rarity: common 10, uncommon 4, rare 1, legendary 0.2.
- **Every Bubby can do every behaviour** (apart from stage limits such as Elders knitting); personality only changes
  how often.

### While you were away

The background picks 1–3 behaviours that "happened" while the popup was closed, with the same weights, and adds
them to the "while you were away" summary ("Bubby chased a butterfly and fell over"). They are never notifications,
and at most 3 a day.

### Journal (collection)

Each behaviour seen for the first time is saved. Settings → stats shows "Behaviours seen: 23 / 72". The rare
and legendary ones are what make people open the popup "just to check". Later it can become a page with a silhouette
for each one not yet found.

### Art toolkit (so 60+ behaviours stay affordable)

Each behaviour is a short data script built from shared pieces, not a hand-drawn animation:

- **Poses:** bob, hop, jump, squash/stretch, lean, shake, spin (sprite flip), lie down, tiptoe, run, walk to x.
- **Faces:** existing moods and mouths, plus `look`, blink, and closed eyes.
- **Props (16×16 or smaller, drawn in code in the current pixel style):** ball, flower, butterfly, book, bubble wand,
  tub, broom, mirror, sunglasses, hat, umbrella, cloud, telescope, apple, cookie, lollipop, juice, kite, jump rope,
  yo-yo, magnifier, plushie, watering can, teacup, knitting, diary, bug, bird, about 30 in all.
- **Particles:** hearts, notes, sparkles, tears, sweat drop, bubbles, Zs, dust, "!", "?", "…" and "ha".
- **Optional speech bubble:** one or two words in the pixel font ("hehe", "hmph", "yum").

This is new art in the same style. Layouts, colours and fonts stay as they are.

### Catalogue (72 behaviours)

Boost codes: **P** Playful, **S** Serious, **F** Peckish, **K** Picky, **B** Bratty, **W** Sweet, **V** Brave,
**T** Timid, **H** Hardy, **D** Delicate. Quirks are named. Rarity: C common, U uncommon, R rare, L legendary.

**Play**
| # | Behaviour | Boosted by | Rarity |
|---|---|---|---|
| 1 | Kicks a ball around | P, Sun | C |
| 2 | Bounces a ball on its head (drops it) | P, Show-off | U |
| 3 | Chases a butterfly | P, Explorer | C |
| 4 | Jump rope | P | U |
| 5 | Spins until dizzy and wobbles | P, Jokester | C |
| 6 | Blows bubbles and pops them | P, Dreamer | C |
| 7 | Flies a kite | P, Sun | R |
| 8 | Plays peekaboo behind a big leaf | P, Cuddlebug | U |
| 9 | Cartwheel | P, Show-off | U |
| 10 | Yo-yo (gets tangled) | P, Jokester | U |

**Food (none change hunger)**
| # | Behaviour | Boosted by | Rarity |
|---|---|---|---|
| 11 | Munches an apple | F, Honey | C |
| 12 | Sneaks a cookie, looks around guiltily | F, B | U |
| 13 | Licks a lollipop | F | C |
| 14 | Daydreams of cake (thought bubble) | F, Dreamer | C |
| 15 | Tummy rumbles (only when hunger < 1.5) | F | gate |
| 16 | Sips a juice box | F, Honey | C |
| 17 | Catches a falling berry in its mouth | F, P | R |
| 18 | Sniffs the air, follows a smell | F, Explorer | U |
| 19 | Pokes at a veggie and pushes it away | K | C |

**Garden and nature**
| # | Behaviour | Boosted by | Rarity |
|---|---|---|---|
| 20 | Picks a flower and smells it | W, Dew | C |
| 21 | Waters itself with a watering can | H, Neat-freak | U |
| 22 | Sunbathes with leaves spread out | Sun, S | C |
| 23 | Watches a ladybug crawl by | Explorer, Dreamer | C |
| 24 | Digs a little hole | Mud-pie, V | C |
| 25 | Plants a tiny seed and pats the soil | W, S | U |
| 26 | Blows on a dandelion | Dreamer | U |
| 27 | Rolls in the grass | P, Mud-pie | C |
| 28 | A bird lands on its head | W, Cuddlebug | R |
| 29 | Watches clouds drift past | Dreamer, S | C |

**Clean and tidy**
| # | Behaviour | Boosted by | Rarity |
|---|---|---|---|
| 30 | Takes a bath in a tub with bubbles | Neat-freak, Dew | U |
| 31 | Showers under its own rain cloud | Neat-freak, H | U |
| 32 | Brushes its teeth | Neat-freak, S | C |
| 33 | Sweeps the garden with a broom | Neat-freak, S | C |
| 34 | Combs its leaves or petals | Diva, Neat-freak | C |
| 35 | Shakes off water like a puppy | P, Mud-pie | U |

**Calm and serious**
| # | Behaviour | Boosted by | Rarity |
|---|---|---|---|
| 36 | Reads a book | S, Bookworm, Moon | C |
| 37 | Meditates and floats a little | S, Moon | U |
| 38 | Stretches / yoga | S, H | C |
| 39 | Writes in its diary | S, Bookworm | U |
| 40 | Does push-ups | H, V | C |
| 41 | Ponders ("?" over its head) | S, Bookworm | C |
| 42 | Looks through a telescope (evening only) | Night owl, Moon | R |

**Jokester**
| # | Behaviour | Boosted by | Rarity |
|---|---|---|---|
| 43 | Tells a joke and laughs at itself ("ha!") | Jokester | C |
| 44 | Fake sneeze, then grins | Jokester, B | U |
| 45 | Makes a silly face at you | Jokester, P | C |
| 46 | Puts on a fake moustache disguise | Jokester | R |
| 47 | Juggles three seeds and drops them | Jokester, Show-off | U |
| 48 | Pretends to be a statue, then wiggles | Jokester, P | U |

**Diva (sassy)**
| # | Behaviour | Boosted by | Rarity |
|---|---|---|---|
| 49 | Petal flip | Diva | C |
| 50 | Poses with sunglasses | Diva, Show-off | U |
| 51 | Admires itself in a hand mirror | Diva | C |
| 52 | "Hmph!" and turns its back to you | Diva, B | C |
| 53 | Taps its foot impatiently | Diva, B | C |
| 54 | Eye-roll | Diva, Thorn | U |

**Bratty**
| # | Behaviour | Boosted by | Rarity |
|---|---|---|---|
| 55 | Stomps around | B, Thorn | C |
| 56 | Kicks the dirt | B | C |
| 57 | Blows a raspberry at you | B, Jokester | U |
| 58 | Sulks with arms crossed | B | C |
| 59 | Throws its toy, then wants it back | B, P | U |

**Timid and brave**
| # | Behaviour | Boosted by | Rarity |
|---|---|---|---|
| 60 | Startled by a falling leaf, jumps | T, Moon | C |
| 61 | Hides from a tiny bug | T | C |
| 62 | Shivers at a passing cloud's shadow | T, D | U |
| 63 | Tiptoes across the garden | T | C |
| 64 | Hugs a plushie nervously | T, Cuddlebug | U |
| 65 | Marches with a stick like a sword | V, Sun | C |
| 66 | Inspects things with a magnifying glass | V, Explorer | U |

**Feelings and body (mostly mood-gated)**
| # | Behaviour | Boosted by | Rarity |
|---|---|---|---|
| 67 | Cries quietly (only when happiness < 1.5) | D, W | gate |
| 68 | Yawns and nods off standing up (near bedtime) | Sleepyhead | gate |
| 69 | Hiccups | F, Jokester | U |
| 70 | Hums / sings (music notes) | Songbird | C |
| 71 | Happy dance (only when both hearts ≥ 3) | P, Songbird | gate |
| 72 | Waves at you / heart eyes | W, Cuddlebug | C |

**Stage and season extras** (on top of the 72):
- **Bulb:** wobbles and falls on its bottom, crawls.
- **Elder:** knits, sips tea, naps in a rocking chair, stretches a sore back.
- **Date-based (legendary-feeling, cheap to add):** catches snowflakes in winter, a pumpkin hat around Halloween,
  a party hat on the Bubby's own day count milestones (day 3, day 7).
- **Form flavour:** Radiant boosts Show-off and play, Daisy boosts calm and garden, Thistle boosts Diva and Bratty.

## 4. Save format

These fields are added to the state, with no version bump. `migrate()` already builds on `fresh()`, so an existing
Bubby gets a personality rolled when it loads.

```js
persona: { kind: 'sun', axes: { energy: 1, appetite: 0, manners: -1, nerve: 2, health: 0 },
           quirks: ['jokester', 'songbird'], known: { kind: true, q: 0, axes: [] } },
seen: [],          // behaviour ids seen at least once (journal)
```

Existing Bubbies reveal everything at once ("You got to know Bubby better!"), since they are already grown.

## 5. Code layout

- `extension/core/persona.js`: pure. Seed kinds, sliders, quirks, `rollPersona(kind?)`, `mods(S)` → the multipliers
  `rules.js` uses (hunger and happy drain, meal, snack and game gains, tantrum interval, discipline gain, sickness
  rate, doses, fear of the dark). Also `title(S)`.
- `extension/core/behaviors.js`: pure data. The catalogue (id, category, rarity, boosts, gate, stage) and
  `pickBehavior(S, recent, ctx)`. Shared by the popup and the background ("while you were away" lines).
- `extension/art/props.js`: the props and particles.
- `extension/popup/behave.js`: plays a behaviour script (pose, prop, particles, bubble). `scene.js` draws it in the
  same slot as `A`.
- `rules.js`: multiply the existing rates by `mods(S)`. Six to eight small edits, no new mechanics.

## 6. Build order

1. **Personality core:** `persona.js`, plugging the multipliers into `rules.js`, migration, the title and kind in
   Settings → stats, the seed colour per kind, and sim-check with worst and best rolls.
2. **Behaviour engine plus the first 20 behaviours:** the ones that need few props (spin, hop, cry, yawn, stomp,
   hmph, silly face, sing, dance, wave, sunbathe, startle, tiptoe, ponder, flower, ball, apple, butterfly, bubbles,
   book).
3. **Reveal toasts and journal count.**
4. **The rest of the catalogue in batches of about 15**, then the "while you were away" lines, then stage and season
   extras.
5. **Later:** family line on replant, and the journal page.

Each step ships on its own and can be tested with `check-extension.mjs`. Re-run `store-images.mjs` after step 2.

## Launch timing

The store submission is close. Recommended: launch as is, then ship this as the first big update ("Every
Bubby has a personality now"). That gives the store listing a "what's new" moment and a reason for early users to
come back. If you'd rather launch with it, do steps 1–2 first: those carry most of the "wow".
