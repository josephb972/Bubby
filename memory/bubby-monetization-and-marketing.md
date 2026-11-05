# Bubby: Monetization and Marketing Plan

Status: planning. Nothing here is built except the analytics and daily-gift groundwork in `index.html`.
Analytics: PostHog (EU host), anonymous events, Stats toggle in the game.

---

## Part 1. Monetization

### Ranked options

1. **Bubby Plus, a one-time unlock ($3.99).** Recommended first paid product.
2. **Cosmetic packs ($0.99–$2.99 each).** Recommended second. Highest margin in pet games.

Ads, subscriptions, and sponsored items are parked (see the end of this part).

---

### #1 Bubby Plus: one-time unlock, $3.99

**What the player gets**
- Home-screen widget (iOS and Android), once the native app exists
- Cloud save and sync across devices (needs a backend)
- Extra evolution forms, shown as "Plus" variants
- No Stats prompt, and a "Bubby+" badge on the subtitle (cosmetic only)

**What the player never loses**
- The full core game stays free: every stage, every care action, both minigames, all endings.
- Plus never changes difficulty, decay, or death rules. A paid player can't buy survival.

**Why it ranks first**
- Single purchase, no recurring churn to manage.
- Pet-game players are used to one-time purchases on apps like Tamagotchi-style titles.
- Clear visual upsell: a widget that shows Bubby on the home screen is easy to understand in one screenshot.

**Pricing and tests**
- Launch at $3.99. Test $2.99 and $4.99 with a small cohort in the store listing.
- Show the price with a one-line benefit ("Put Bubby on your home screen").
- Offer one free trial of the widget for 7 days, so people feel it before paying. Only if the widget is cheap to run.

**Payments and fees (verify current terms before launch)**
- Chrome extension or web: Stripe or Paddle, roughly 5–7% effective fee. Paddle handles EU VAT as merchant of record.
- iOS and Android: store billing, about 15% for small developers (under $1M/year). Both stores also take about 15% of cosmetic purchases.

**Illustrative revenue** (assumes 2% of installers buy Plus at $3.99)

| Installs | Buyers | Gross | Approx. net after fees |
|---|---|---|---|
| 10,000 | 200 | $798 | ~$750 (web) / ~$680 (store) |
| 100,000 | 2,000 | $7,980 | ~$7,500 / ~$6,800 |
| 1,000,000 | 20,000 | $79,800 | ~$75,000 / ~$68,000 |

These are planning assumptions, not market data. Replace them with real conversion once PostHog shows it.

**Gate before building**
- D7 retention above roughly 15–20%, measured in PostHog (`install` to `session_start` return).
- At least 500 installs, so the conversion number means something.

---

### #2 Cosmetic packs: $0.99–$2.99 each

**Pack ideas**
- **Outfits:** hats, bows, scarves. Shown on all stages that have a head.
- **Room themes:** garden backgrounds (night garden, snow garden, rainy patio). Changes only the scene art.
- **Minigame skins:** a different catcher or seed style for "Seed catch".
- **Seasonal bundles:** one new pack per season, returned only while it's active. Good urgency, but never remove a purchased item.

**Rules**
- Cosmetics only. No gameplay boost, no faster growth, no revival of a dead Bubby.
- Purchased items are kept forever, including after a reset.
- Price tiers: single item $0.99, pack of 3 $1.99, seasonal bundle $2.99.

**Expected economics**
- Cosmetic buyers are a smaller slice than Plus buyers, but they buy repeatedly.
- Plan on 1 pack per month, rotating between outfit, theme, and minigame skin.

**Implementation notes**
- Items stored in `S.cosmetics` (array of IDs) once the entitlement system exists.
- The entitlement check must be server-side for real money. Client-side flags can be edited, so a local flag is only fine for free unlocks.

---

### Parked (not recommended now)

- **Ads:** banner ads on a new-tab or widget page will get the extension uninstalled and reviewed badly. Rewarded ads (watch to skip a night) are the only ad format worth testing later, and only as opt-in.
- **Subscription ($1.99/mo):** pet games rarely keep subscribers. Revisit only if cosmetic buyers come back every month.
- **Sponsored items:** later, at scale, with clear disclosure.
- **Avoid:** NFTs, loot boxes, paid revival of a dead Bubby, and any pressure that targets children.

---

## Part 2. Marketing plan

### Positioning
"A virtual pet that grows with you, and misses you a little when you're away, but never punishes you for it."

### Launch sequence
1. **Weeks 1–4, free launch.** Chrome Web Store extension, free. Measure D1, D7, and D30 in PostHog. Collect reviews.
2. **Weeks 5–8, short-form video push** (see Part 3). Build the audience while the game is free.
3. **Week 9, Bubby Plus launch.** Announce to the existing audience first, then the store listing.
4. **Month 4–6, widget.** Ship iOS and Android widgets as the Plus upsell.
5. **Ongoing, cosmetics.** One pack per month, timed with the short-form calendar.

### Channels, in order of priority
1. **TikTok and YouTube Shorts** (primary, detailed in Part 3)
2. **Reddit:** r/WebGames, r/tamagotchi, r/indiegaming, r/SideProject. Share progress posts, ask for feedback, don't spam links.
3. **Product Hunt** at the Plus launch.
4. **Chrome Web Store SEO:** title and short description with "virtual pet", "tamagotchi", "focus companion". Screenshots show the evolutions.
5. **Creator partnerships:** small pet and cozy-game creators, paid per install or per sale.

### Metrics to watch (PostHog)
- Installs per week
- D1, D7, D30 retention (cohorts by install week)
- Action taps per session (`action_tap`)
- Evolution rate (`evolved` by stage)
- Return rate after time away (`away_return`) and daily gift claims (`daily_gift`)
- Plus conversion, once Plus exists

---

## Part 3. TikTok strategy

### Core idea
Every video is about the **Bubby outcome**. The format is always a question or a reveal:
- "I raised a Bubby for 20 minutes. Here's what it became."
- "Why does Bubby turn into Thistle? (It's the poop.)"
- "Ranking every Bubby evolution."
- "Things I learned from 500 Bubbies."

Target length: 15–30 seconds. Captions on everything, since most viewers watch muted.

### Content pillars (weekly mix)
| Pillar | Share | Example |
|---|---|---|
| Evolution reveals | 30% | Seed to Blossom time-lapse, final form reveal |
| Care tips and "why it happened" | 25% | "Your Bubby went Thistle because of one thing" |
| Daily gift and streak | 15% | "Day 30 streak. Bubby's gift is the best part." |
| Pixel art and animation | 15% | Sprite close-ups, idle animations, frame-by-frame |
| Community and polls | 15% | "Which form should I unlock next?" |

### Video production route A: Claude only

Claude can't generate video footage directly, so this route uses Claude to write, plan, and build the video from the game itself and from code-rendered graphics.

**Tools needed:** a screen recorder, a phone camera for the widget later, and a basic video editor (CapCut, DaVinci Resolve, or any editor that takes captions).

**Workflow**
1. **Ask Claude for the script.** Give it a hook, a 3-beat structure, and a caption list. Example prompt: "Write a 25-second TikTok script for a Bubby that turns into Thistle. Hook in the first 2 seconds, 3 beats, caption on every beat, end with a question."
2. **Record the real game.** Screen-record `index.html` at 2× speed so an evolution happens in 30–60 seconds. Use the Stats toggle off during recording if you don't want analytics noise.
3. **Have Claude build the animated overlays.** Claude can write HTML/CSS/JS or SVG for title cards, countdown graphics, and "Bubby's stats" panels. Render them with a headless browser (Playwright) into PNG or MP4 frames, then drop them into the editor.
4. **Caption and cut in an editor.** Use Claude to write the caption timings as an SRT file, and import it.
5. **Batch 5 videos per week** from one recording session. Claude can produce scripts for all five in one prompt.

**Claude-only templates**
- **The Thistle reveal:** 0–2s hook text ("My Bubby became Thistle"). 2–10s recording of the care mistakes. 10–20s Thistle reveal with the score panel. 20–25s "Here's what I should've done."
- **The streak:** 0–2s "Day 30 of Bubby". 2–12s daily-gift toast and heart meter. 12–20s "Come back tomorrow" card. Last frame: question.
- **The ranking:** five cuts from Seed to Elder, numbered captions, ends with "which one is yours?"

**Limits of route A:** no realistic footage, no talking-presenter shots, and animation is limited to what Claude can render in code. That's fine for a pixel-art game. Lean into it.

### Video production route B: Claude and Higgsfield (not yet connected)

**Status:** No Higgsfield MCP tool is connected to this session, so this route is a plan. Connect the Higgsfield MCP server first, then confirm its tool names and parameters before use. Don't rely on the names below until they've been checked.

**Division of labor**
- **Claude:** writes scripts, shot lists, prompts, captions, and the edit plan. Keeps the prompts consistent across shots. Checks that the output matches the game's pixel style.
- **Higgsfield:** generates short AI video clips for the parts a screen recording can't show: a character's reaction, a cozy garden shot, an "Elder" moment, a pet sitting in a window at night.

**Workflow**
1. **Define the character once.** Claude writes a fixed character sheet for Bubby: colours from the game palette, the pixel style, the stage forms, and the mood. Reuse the same description in every prompt so the look stays consistent.
2. **Shot list from Claude.** Each shot gets: duration (3–5 seconds), camera, action, and the reference frame from the game.
3. **Generate with Higgsfield.** Start with a reference frame from the game (a screenshot) so the style matches. Generate 2–3 variants per shot and keep the best.
4. **Assemble.** Cut AI shots with real screen recordings. Keep AI shots under 40% of any video so the game itself stays the star.
5. **Captions and review.** Claude writes captions and checks the final edit list for timing.

**Example shot list (25-second video)**
| Time | Shot | Source |
|---|---|---|
| 0–2s | Hook text on a black screen: "My Bubby became Thistle" | Claude card |
| 2–6s | Higgsfield: sprouting seed, pixel style, soft light | Higgsfield, from a game frame |
| 6–14s | Screen recording of care at 2× speed | Real game |
| 14–20s | Higgsfield: Bubby's "Thistle" reaction, looking tired | Higgsfield |
| 20–25s | Score card and question caption | Claude card |

**Brand and safety rules for AI video**
- Label AI-generated shots as AI-generated, in the caption or on-screen, per TikTok's rules for AI content.
- Never show AI-generated people as real people. Bubby is a pixel creature, so this is easy to keep.
- Don't generate anything that looks like an existing character or brand.
- Keep the pixel style: reject outputs that look like a different art style.

### Posting cadence and schedule
- **Week 1–2:** 3 videos per week, to find the format. Start with the Thistle reveal and the ranking.
- **Week 3–8:** 5 videos per week. Batch-produce on Sundays.
- **Plus launch week:** 1 video per day for 5 days, focused on the widget and home-screen reveal.

### Hashtags and sounds
- Core tags: #virtualpet #tamagotchi #indiegame #pixelart #cozygaming
- Rotate 2 niche tags per video, for example #focusbuddy or #pixelpet.
- Use trending sounds only when they fit the video's tone. Don't use them just for reach.

### Measuring TikTok
- Track watch-through rate and completions first. Short videos rarely go viral on follows alone.
- Each video should link to the store listing or the game URL in bio.
- Compare install and `session_start` counts in PostHog against the video's posting time, using a UTM parameter on the game link (added later, once the store page is live).

---

## Open decisions
1. Confirm Higgsfield MCP is connected before Route B production.
2. Decide the Plus price ($2.99, $3.99, or $4.99) after the first 500 installs.
3. Decide whether the widget comes first on iOS or Android.
4. Confirm the EU consent approach for default-on Stats before EU traffic grows.
