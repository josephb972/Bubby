# Bubby: points, shop, illness and medicine (design)

Status: **built** in the extension v1.1.0 (`extension/core/content.js` holds every number, `extension/core/rules.js` the logic)
and drafted in the web game `index.html`. Checked by `node tools/rules-check.mjs`, `node tools/sim-check.mjs` and
`node tools/check-v11.mjs`.

## Principles
1. **Points are earned by playing and never sold.** No purchase, no cash-out, no exchange. They only buy things in the Shop.
2. **Nothing punishes absence.** Illness only comes from the same causes as before (poop, sweets, weight, neglect). Sleeping with
   the lights on gives Dancing Plague only while the popup is open (or on Quick), never overnight. Time away never costs points.
3. **Reward being there, but cap the farmable parts.** Care and game points have a daily cap; milestones are one-time.
4. **A broke player is never stuck.** Garden Tea is free, cures Ague (2 cups) and soothes every other illness
   (it slows the clock to a quarter), so there is always time to earn the right medicine.
5. **Money never touches this loop.** Paid features stay cosmetic (see `bubby-monetization-and-marketing.md`).

## Ways to earn

| Source | Points | Limit |
|---|---|---|
| Open Bubby on a new day | 10, plus 2 per streak day (max 20) | once a day |
| Streak milestones | 3 days: 10, 7: 30, 14: 60, 30: 150 | once each, restart with the streak |
| Meal or snack | 1 | care cap |
| Shop food | 2 | care cap |
| Poop cleaned | 1 each | care cap |
| Good night's sleep (lights off) | 3 | care cap |
| Scolding a real tantrum | 2 | care cap |
| "Which way?" | 2 per right guess, +3 for 5/5 | game cap |
| Seed catch | 1 per 2 score, +5 for a new best | game cap |
| Curing an illness | 5 | none (needs an illness) |
| Growing up | Bud 10, Blossom 25, Elder 20, full life 30 | once per life |
| Rare Starling | 50 | once per rare |
| Bubbydex | new race 5, new adult form 15 | once each |
| Daily quests | 8 each, +10 for all three | 3 a day |
| Goals | 5 to 150 each (15 goals) | once each |

**Daily caps:** care 30, game 60 (per real calendar day, in the player's time zone). Over the cap, the game says so once and stops paying.

## What it costs

| Item | Price | Does |
|---|---|---|
| Garden Salad | 6 | +1 hunger, +½ happy, no weight |
| Sunberry Pie | 10 | +1 hunger, +1 happy, never a toothache |
| Hearty Stew | 14 | +2 hunger |
| Golden Feast | 30 | fills hunger and happiness |
| Cinchona Bark | 8 | cures Ague (1 dose) |
| Lime Juice | 10 | cures Scurvy (2 doses) |
| Valerian Root | 10 | cures Dancing Plague (2 doses) |
| Four Thieves Vinegar | 25 | cures The Plague (3 doses) |
| Theriac | 45 | cures any illness at once |
| Plague Doctor’s Posy | 20 | no illness for a while (240 s on Quick; 30 h on Chill) |

A full cure costs: cough 8 (or free with tea), Scurvy 20, Dancing Plague 20, The Plague 75 (or 45 with the Elixir). Stock is capped at 9 per item.

## Illness

| Illness | Severity | Usually from | Medicine | Doses | Drain | Time before Bubby leaves* |
|---|---|---|---|---|---|---|
| Ague | mild | dirty garden (70%) | Cinchona Bark / Tea | 1 | ×1.3 | 106% |
| Scurvy | medium | sweets, weight, dirty garden (30%) | Lime Juice | 2 | ×1.5 | 100% |
| Dancing Plague | medium | lit sleep while watched; later: visits | Valerian Root | 2 | ×1.6 | 100% |
| The Plague | severe | neglect | Four Thieves Vinegar | 3 | ×2.0 | 81% |

\*of the pace's normal limit (Quick 160 s, Classic 24 h, Chill 48 h). All four are marked `contagious` for the visiting update
(`catchDisease()` is the entry point; a visit passes an illness on, and a sick Bubby's card will carry a badge).

## Naming (decided 16 Nov 2026)
The illnesses are old diseases that once swept medieval towns, drawn as cartoon sniffles, and each medicine is named after the
old remedy. Internal ids stay `sporecough`, `itchymoss`, `moonflu`, `blight` so saves keep working.

| Illness | Fits because | Medicine (id) |
|---|---|---|
| Ague | fevers and chills once blamed on marsh air: a dirty garden | Cinchona Bark (`syrup`), the real source of quinine; Garden Tea is the herbal free cure |
| Scurvy | sailors' disease from too little fresh food: too many sweets | Lime Juice (`salve`), vitamin C |
| Dancing Plague | the 1518 Strasbourg dancing mania: a restless night | Valerian Root (`drops`), an old herb for sleep |
| The Plague | the Black Death, 1347 to 1351: neglect | Four Thieves Vinegar (`tonic`), a legendary remedy |
| (cure-all) | | Theriac (`elixir`), the medieval cure-all |
| (protection) | | Plague Doctor's Posy (`shield`), sweet herbs against bad air |

**Left out on purpose:** leprosy (still affects people today, and the word is a stigma), cholera, tuberculosis and malaria by name
(still killing people), and any sexually transmitted infection. Smallpox ("the Pox", eradicated) is a good future name for a
contagious illness spread by visits. **Reach:** historical disease names are common in family games (Plague Inc., The Oregon Trail,
Assassin's Creed). Keep it cartoon, keep the disclaimer, never claim a real cure, and word social posts about "medieval history"
and "pet game" rather than "cure" or "treatment". This is judgement, not a ruling: check the current Chrome Web Store policies
and any future app-store age-rating questionnaire (they ask about medical references) before each submission.

## Races (extension)
Random at Bulb to Bud: five common races equally, plus the rare Starling. Each race has its own body plan (flower, tortoise, droplet, mushroom, flame, star); the care tier changes colour and decoration on every body. Real-time lives last days, so the base rare chance is
higher on slow paces (Quick 5%, Classic 8%, Chill 12%) and every miss in a row adds 5% (cap 60%), reset on a rare. Care quality
still decides Radiant / Daisy / Thistle. Old Bubbies become Leaflings (their original look).

## Checks and what they showed
- `rules-check`: 102 checks on races, illness and medicine, absence, points, quests, goals, shop, carry-over and old saves.
- `sim-check`: with a sensible player (collects daily points, buys the matching medicine) **every player who checks in reaches a
  full life on every pace, as in v1.0.0**. A player who never checks in still ends exactly as before.
- Simulated income is about 90 to 140 points a day for an engaged player, with 500+ left over at the end of a life, because the
  simulated player never spends on food or tonics. Real play should be lower. **Tune with real data**: if points pile up,
  lower `CAPS` or raise prices; if the shop feels stingy, do the opposite. All numbers are in `content.js`.

## Open questions
- Is the Blight (3 doses, 75 points) too harsh? The Elixir (45) is the cheaper cure, which is intended.
- Should Plague Doctor’s Posys be bought in bulk, or stay one at a time?
- Visiting (v1.2) will need a rule for a contagious visit (warning, quarantine badge) and for who may be infected.
- If a paid tier is added later, it may sell card frames and cosmetics, never points, medicine or illness protection.
