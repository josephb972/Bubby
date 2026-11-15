# Bubby: Update Roadmap (v1.1 to v1.6)

Status: planning. Nothing here is built yet.
Goal of every update: more fun, more shareable, more reasons to come back tomorrow.
Companion docs: `memory/bubby-monetization-and-marketing.md` (pricing, TikTok plan).

---

## 1. Rules every update follows

1. **One shareable moment per update.** If a player can't screenshot or clip it, it isn't done.
2. **One retention hook per update.** Something that makes tomorrow's visit worth it.
3. **Instrument first.** Each update lists its PostHog events. Ship them with the feature.
4. **Never punish absence.** Diseases, breeding timers, and visits never hurt a Bubby while the page is closed. (`ABSENCE` rules in `index.html` stay.)
5. **No pay-to-win.** Money buys cosmetics and convenience only. No purchasable currency, no purchasable cures, no purchasable breeding speed.
6. **Stay a single HTML file** until the file passes about 200 KB or a backend is needed. Today it is about 90 KB. Save data is merged forward with `Object.assign(fresh(), saved)`, so new fields get defaults without breaking old saves.
7. **No chat, no free text, no personal data** in anything social. Friends are shown with a preset nickname and a Bubby sprite.

---

## 2. Order of work and why

| # | Update | Depends on | Effort | Viral value | Retention value |
|---|---|---|---|---|---|
| 1 | **Many Faces:** races from the Bulb, Bubbydex, jump rope (solo) | none | M | High | High |
| 2 | **Playdates:** visiting through Bubby Cards | races (cards show race) | M | Very high | High |
| 3 | **Sniffles:** diseases and quarantine | visiting | M | High | Medium |
| 4 | **Family Tree:** cross-breeding, special Bubbies | races, visiting | L | Very high | Very high |
| 5 | **Game Night:** more minigames, Seed Wager | visiting (for co-op) | M | Medium | High |
| 6 | **The Lab:** mutant Bubbies (opt-in, seasonal) | breeding | M | Very high (Halloween) | Medium |

Why this order: races and the Bubbydex are the base that every later feature needs and they need no server. Visiting is the social loop. Diseases only make sense once visiting exists. Breeding needs races and is stronger when it can use a friend's Bubby. The dark Lab content ships last, as a seasonal event, once the core is loved.

Suggested cadence: one update every 6 to 8 weeks.
Target months (adjust to real progress): v1.1 Dec 2026, v1.2 Jan to Feb 2027, v1.3 Mar 2027, v1.4 Apr to May 2027, v1.5 Jun to Jul 2027, v1.6 Oct 2027 (Halloween).

---

## 3. The updates

### v1.1 Many Faces: races, Bubbydex, jump rope

**What ships**
- A new **race** is chosen when the Bulb grows into a Bud, based on how the player cared for it as a Bulb. Today only the adult form varies (Radiant, Daisy, Thistle by care quality). Races sit on top of that, so the quality tiers stay.
- Six races (placeholder names):

| Race | How it is earned (Bulb stage) | Look |
|---|---|---|
| Leafling | Balanced care, or default | Current green Bubby |
| Mossback | Very clean, meals only, no snacks | Mossy brown-green |
| Puddle | 3 or more games played | Blue, bouncy |
| Shroomling | 3 or more snacks | Red cap, spots |
| Duskling | Lights off early more than once | Purple, night glow |
| Emberling | Scolded tantrums 2 or more times | Warm orange |

- 6 races x 3 care tiers = **18 forms** to collect.
- **Bubbydex:** a collection page. Found forms in colour, unfound as silhouettes with a one-line hint. Progress shows "7 / 18".
- **Jump rope (solo):** a tap-rhythm minigame, 20 seconds, like Seed catch. Best score saved.

**Build notes**
- Sprites are drawn in code from a palette table (`PAL`, `palette()`, `drawChild`, `drawAdult`). A race is a palette plus one small shape change. Low art cost.
- New fields: `S.race`, `S.sig` (care counters during Bulb), `S.dex` (found forms). Race is set in `evolve()` when going to `child`.
- Keep the old `S.variant` as the care tier.

**Shareable moment:** the race reveal at the Bulb to Bud evolution ("My Bubby became a Duskling").
**Retention hook:** Bubbydex completion; every new life is a chance at a new form.
**PostHog events:** `race_revealed {race}`, `dex_progress {found}`, `game_start {game:'rope'}`.
**Risks:** race rules must feel discoverable, not random. Show the hint in the Bubbydex after a form is found.

---

### v1.2 Playdates: visiting

**The constraint:** there is no backend. Real-time visiting needs servers, accounts, and child-safety work. So version 1 is **asynchronous and link-based**.

**What ships**
- **Bubby Card:** a small snapshot of a Bubby (race, tier, stage, nickname preset, cosmetics, health flag). Stored as compact JSON in a link fragment (`#card=...`) and as a shareable PNG drawn from the game canvas, with the Web Share API on phones.
- **Visit:** open a friend's card link and their Bubby walks into your garden for about 60 seconds. Both gardens give a heart and a toast. One reward per friend per day.
- **Friend list:** up to 10 cards saved locally.
- **Co-op jump rope:** take turns on the same rope with a visiting Bubby (turn-based, no network).
- **Honest limit:** visits are one-way until the friend opens your card too. The UI says so and prompts a card swap.

**Safety by design:** no chat, no names beyond presets, no accounts, no data leaves the browser except anonymous analytics.

**Shareable moment:** the card image and the visiting animation.
**Retention hook:** daily visit reward per friend; "friend streak".
**PostHog events:** `card_shared`, `card_opened`, `visit_started`, `visit_completed`, `friend_added`.
**Viral loop:** card link in a message, friend opens game, plays, sends their own card back. Track installs from card links with a `src=card` parameter.
**Risks:** link length (keep the payload under about 600 bytes); a link can be tampered with, so validate and clamp every field when a card is opened.

---

### v1.3 Sniffles: diseases and quarantine

**Content decision (please review):** use **fictional, garden-themed diseases**, not real ones.
- "Plague" can stay in spirit as **The Blight** or **Spore Plague**.
- **Do not use real sexually transmitted infection names** (chlamydia and similar). They risk a higher age rating, moderation limits and reduced reach on TikTok, store review problems, and brand damage with a pet game that kids may play. Fictional names give the same comedy and sharing value.

| Disease | Severity | Doses | Contagious |
|---|---|---|---|
| Spore Cough | mild | 1 | yes |
| Itchy Moss | medium | 2 | yes |
| Moonflu | medium | 2 | yes |
| The Blight | severe | 3 | yes, highest |

**Rules**
- A sick Bubby shows a coloured badge on its Bubby Card ("contagious").
- Visiting while contagious gives the host's Bubby a chance to catch it, after a short incubation. The game warns before a risky visit.
- **Quarantine:** a sick Bubby can stay home and recover. Visiting with a sick card is allowed but shows a warning to both players.
- **Never while away.** Catching a disease only happens during an active visit session, never while the page is closed.
- Cure uses the existing medicine action. **Garden Tonic** (a preventive) is earned from minigames, never sold.
- Disease never causes a Bubby to leave on its own. The existing neglect rules still apply only to active play.

**Shareable moment:** "Patient zero" card with the badge; "I caught it from my friend's Bubby" clips.
**Retention hook:** outbreak weekends (calendar-based events, no server needed), plus the need to check friends' health badges.
**PostHog events:** `disease_caught {disease, source}`, `disease_cured`, `risky_visit_confirmed`, `quarantine_chosen`.
**Risks:** tone. Keep it cute and clearly fictional. Don't show real-world medical imagery.

---

### v1.4 Family Tree: cross-breeding and special Bubbies

**What ships**
- **Garden Journal:** remembers your last 5 lives (race, tier, traits) so you can breed with your own past Bubbies.
- **Breeding:** pick two adult or Elder Bubbies (your own journal entries, or a friend's card). The result is a new seed with a **hybrid** race.
- **Recipes:** 8 to 10 special Bubbies, hidden until tried. Examples:

| Parents | Hybrid (placeholder) |
|---|---|
| Puddle + Emberling | Steamling |
| Mossback + Shroomling | Truffle |
| Duskling + Leafling | Glowmoth |
| Puddle + Duskling | Moonpond |
| Two Radiant tiers of any race | Rainbowling |

- **Traits** inherit: palette blend, one favourite minigame, one disease resistance.
- **Cooldown:** one breeding per real day (retention, and never sold).
- Bubbydex grows to include hybrids.

**Shareable moment:** the recipe reveal ("I bred X and Y and got THIS"). This is the best TikTok format in the roadmap.
**Retention hook:** daily breeding slot; hunting for hidden recipes; asking friends for a card to complete a pair.
**PostHog events:** `breed_started {parentA, parentB}`, `hybrid_unlocked {hybrid}`, `recipe_attempt {result}`.
**Risks:** make sure the journal needs no server (it is local). Breeding with a friend's card only reads the card, it never changes their game.

---

### v1.5 Game Night: more minigames and Seed Wager

**What ships**
- **Memory pairs:** flip and match garden items.
- **Hot potato:** pass a seed between two Bubbies before it pops (visit-only, turn-based).
- **Seed Wager:** an optional double-or-nothing on a **skill** minigame result, played with free in-game **Seeds** (earned from minigames and daily gifts).
- Jump rope co-op gets leaderboards among saved friends (local).

**Wager rules (important)**
- **Skill-based, not chance-based.** No slots, dice, card draws, or random payouts.
- Seeds are **free to earn and can never be bought**, sold, or exchanged for money.
- Capped daily wager, no loss that harms the Bubby.
- Call it **Double or Nothing** in the UI and store text, not "betting" or "gambling".
- **Before shipping:** answer the current Apple and Google rating questionnaires honestly for simulated gambling. If either rates it as mature, decide then whether to keep the wager or ship it only in a mature-rated build.

**Shareable moment:** the wager win or lose reaction.
**Retention hook:** Seeds economy gives short-term goals (tonics, hints, free cosmetics).
**PostHog events:** `game_start {game}`, `wager_made {amount}`, `wager_result {won}`, `seeds_balance`.

---

### v1.6 The Lab: mutant Bubbies (opt-in, seasonal)

**Framing (please review):** dark, funny, pixel horror-lite. Never gore. Never mocks real disabilities. In the UI use **Mutant** and **Unstable**, not "deformed".

**What ships**
- The **Moonlit Lab** is an opt-in toggle, off by default, with a short content note.
- **Three Mutants**, unlocked through a clear, risky choice, not by accident:

| Mutant | Look | Quirk |
|---|---|---|
| Gloop | melted slime blob | Slow in Seed catch but scores double |
| Twinge | two fused sprouts, two faces | Faces show different moods |
| Hollow | glitchy, face missing, pixel static | Short life, cannot visit |

- **How:** breeding the same lineage three times in a row ("inbreeding"), or using a Lab serum earned from minigames. The game warns before the third pairing.
- **Consequences:** a Garden Reputation meter. Friends' Bubbies show disapproving emotes toward a Lab garden.
- **Redemption path:** care for a Mutant for several days and it can mend into a normal hybrid. This keeps it a story, not cruelty.
- Ships for Halloween 2027, then stays available behind the toggle.

**Shareable moment:** "Don't breed these" reveals; Halloween TikTok series.
**PostHog events:** `lab_opt_in`, `mutant_created {mutant, cause}`, `mutant_mended`.
**Risks:** age ratings and store review (see section 5), and TikTok ad restrictions on horror, so promote organically.

---

## 4. Cross-cutting plan

### Bubby Card format (v1.2 onward)
`{ v, race, tier, stage, nick, cosmetics, sick, disease, journalHint }`, compact JSON, base64url, under about 600 bytes. Validate and clamp every field on open.

### Save data
Add fields as defaults in `fresh()`: `race`, `sig`, `dex`, `journal`, `friends`, `seeds`, `lab`. Old saves keep working.

### Cosmetic pack per update (ties to monetization)
- Many Faces: race-coloured scarves
- Playdates: card frames and backgrounds
- Sniffles: doctor hat, mask, tonic bottle skins
- Family Tree: nursery themes
- Game Night: arcade skins
- The Lab: spooky outfits

Bubby Plus can add card frames and extra journal slots (convenience and look only, never power).

### Backend, later (v2.0)
Real-time visits, outbreak events, cloud sync, and leaderboards need a small backend (for example a serverless API and database). Plan child-safety and privacy first: no chat, no personal data, age screen, and a review for COPPA and GDPR for children.

---

## 5. Risks to check before each release

| Risk | Where | Action |
|---|---|---|
| Real disease names | v1.3 | Use fictional names only |
| Simulated gambling rating | v1.5 | Skill-based only, free currency, answer store questionnaires honestly |
| Horror and "deformed" wording | v1.6 | Opt-in, no gore, call them Mutants, redemption path |
| Children's privacy | v1.2+ | No chat, presets only, anonymous analytics, review before any backend |
| Tampered card links | v1.2+ | Validate and clamp card fields |
| TikTok policy | v1.3, v1.6 | Promote organically, avoid health-claim wording, label AI content |

---

## 6. What to measure (PostHog)

Calibrate the targets below against real data. They are starting hypotheses, not facts.

| Question | Metric | Starting target |
|---|---|---|
| Are races fun? | `race_revealed` per active player; share of players who start a second life | 40% start a second life |
| Is the viral loop working? | Card shares per weekly active player; visits completed per sender | 5% share, 1.5 visits per sender |
| Does it bring friends? | New installs from `src=card` links per sharing player | 0.2 or more |
| Does it retain? | D7 and D30 retention for players with 1 or more friends vs none | Friends cohort clearly higher |
| Is breeding sticky? | Daily breeding-slot use | 30% of actives |

**Go or no-go gates**
- Do not build Playdates until Many Faces shows a rising D7.
- Do not build Family Tree until visiting shows at least 1 completed visit per sender.
- Do not ship Seed Wager or the Lab before the store rating review is done.

---

## 7. Open decisions
1. Approve the fictional disease names, or suggest alternatives (section 3, v1.3).
2. Confirm Seed Wager stays skill-based with free Seeds only, and is called Double or Nothing.
3. Confirm the Lab is opt-in and off by default, and Mutants have a redemption path.
4. Decide when the single HTML file should split, or a backend should start (suggested after v1.4).
5. Confirm race names and the six care triggers before art work starts.
