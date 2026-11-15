# Bubby: points, shop, illness and medicine (design)

Status: **built** in the extension v1.1.0 (`extension/core/content.js` holds every number, `extension/core/rules.js` the logic)
and drafted in the web game `index.html`. Checked by `node tools/rules-check.mjs`, `node tools/sim-check.mjs` and
`node tools/check-v11.mjs`.

## Principles
1. **Points are earned by playing and never sold.** No purchase, no cash-out, no exchange. They only buy things in the Shop.
2. **Nothing punishes absence.** Illness only comes from the same causes as before (poop, sweets, weight, neglect). Sleeping with
   the lights on gives Moonflu only while the popup is open (or on Quick), never overnight. Time away never costs points.
3. **Reward being there, but cap the farmable parts.** Care and game points have a daily cap; milestones are one-time.
4. **A broke player is never stuck.** Garden Tea is free, cures Spore Cough (2 cups) and soothes every other illness
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
| Spore Syrup | 8 | cures Spore Cough (1 dose) |
| Moss Salve | 10 | cures Itchy Moss (2 doses) |
| Moon Drops | 10 | cures Moonflu (2 doses) |
| Blight Tonic | 25 | cures The Blight (3 doses) |
| Cure-All Elixir | 45 | cures any illness at once |
| Immunity Tonic | 20 | no illness for a while (240 s on Quick; 30 h on Chill) |

A full cure costs: cough 8 (or free with tea), Itchy Moss 20, Moonflu 20, The Blight 75 (or 45 with the Elixir). Stock is capped at 9 per item.

## Illness

| Illness | Severity | Usually from | Medicine | Doses | Drain | Time before Bubby leaves* |
|---|---|---|---|---|---|---|
| Spore Cough | mild | dirty garden (70%) | Spore Syrup / Tea | 1 | ×1.3 | 106% |
| Itchy Moss | medium | sweets, weight, dirty garden (30%) | Moss Salve | 2 | ×1.5 | 100% |
| Moonflu | medium | lit sleep while watched; later: visits | Moon Drops | 2 | ×1.6 | 100% |
| The Blight | severe | neglect | Blight Tonic | 3 | ×2.0 | 81% |

\*of the pace's normal limit (Quick 160 s, Classic 24 h, Chill 48 h). All four are marked `contagious` for the visiting update
(`catchDisease()` is the entry point; a visit passes an illness on, and a sick Bubby's card will carry a badge).

## Races (extension)
Random at Bulb to Bud: five common races equally, plus the rare Starling. Real-time lives last days, so the base rare chance is
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
- Should Immunity Tonics be bought in bulk, or stay one at a time?
- Visiting (v1.2) will need a rule for a contagious visit (warning, quarantine badge) and for who may be infected.
- If a paid tier is added later, it may sell card frames and cosmetics, never points, medicine or illness protection.
