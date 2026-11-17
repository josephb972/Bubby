# Bubby on TikTok: two launch videos

Both videos are recorded from the **real extension** (toy pod look, live game, real buttons and messages), not mocked up.
Rebuild them after any visible change:

```bash
node tools/tiktok-videos.mjs          # both; or: node tools/tiktok-videos.mjs intro | funny
```

Output in `out/`: 1080×1920, 30 fps, H.264 + AAC, loudness −14 LUFS (TikTok's level), plus a cover frame each.
Sound is Bubby's own in-game beeps (recorded as they happen), an original chiptune and synthesized effects, so there
are no music-licensing problems. Scenes are scripted in `stage.js`.

> **Before posting:** the CTA says "Free on Chrome · link in bio". Post only once the Chrome Web Store listing is live and
> the link is in the bio (see `docs/LAUNCH-CHECKLIST.md`). Until then, use the "waitlist" CTA variant below.

---

## Video 1: "It grew up" (intro, 38 s): `out/bubby-tiktok-1-intro.mp4`

**Job:** explain the whole concept to cold viewers through nostalgia. Tamagotchi is the shortcut everyone over 25 already
has in their head.

| Time | On screen (real popup) | Caption |
|---|---|---|
| 0.0 | Close-up: the seed wobbling like an egg | **Remember Tamagotchi? 🥚** (hook) |
| 2.3 | Seed cracks → Bulb, pull back to the full toy pod | It's back… and it lives in your **browser** 👀 |
| 4.5 | Bubby wandering | Meet Bubby 🌱 a tiny pet for your toolbar |
| 6.5 | Card: **1997 vs 2026** | keychain → toolbar · beeped in class → max 6 polite pings a day · died at school → your bedtime + a pause button · batteries → free, zero data collected |
| 11 | Card: **How you raise it = who it becomes** | Seed › Bulb › Bud › Elder, then 3 Blossoms: **Radiant** (perfect parent 😇), **Daisy** (you tried 🙂), **Thistle** (raised on snacks + chaos 💀) |
| 16 | **Seed catch** played live | 2 mini games 🎮 · gold = 3 pts, pebbles = ouch |
| 21 | **Which way?** played live | guess where it looks 👀 |
| 24 | 3 snacks → real "Too many sweets! Bubby has a toothache" | And yes, it gets **sick** 🤒 · 🦷 Toothache. |
| 28 | Sick Bubby by old poop → two doses of medicine → "All better!" | Ignore the poop? 💩 It gets sick. · Medicine time 💊 |
| 33 | Radiant Blossom, full pod | **Can YOU raise a Radiant Blossom? 👑** · Free on Chrome · link in bio · Comment what yours became 👇 |

**Post caption:**
> The 90s egg pet grew up and moved into my browser 🥚➡️🌱 It gets hungry, throws fake tantrums, gets toothaches from
> snacks, and turns into a Thistle if you're a bad parent. Free Chrome extension, link in bio. What did yours become? 👇

**Hashtags:** `#tamagotchi #virtualpet #90skids #nostalgia #pixelart #chromeextension #cozygames #indiegame #desksetup #productivity`

---

## Video 2: "My browser pet LEFT ME" (funny, 36 s): `out/bubby-tiktok-2-funny.mp4`

**Job:** entertain first, sell second. It's a story-time video ("everything I did wrong") where every punchline is a
real game mechanic. The last frame matches the first, so it loops and replays push watch time up.

| Time | On screen (real popup) | Caption |
|---|---|---|
| 0.0 | The real ending card: "Bubby packed up and moved away… Care mistakes: 9" + sad trombone | **My browser pet LEFT ME 😭** · here's everything I did wrong 👇 |
| 3.1 | ⏪ 4 DAYS EARLIER | |
| 4 | Feed → Snack ×3 → "Too many sweets! Bubby has a toothache" | Day 1: it looked sad, so I gave it **snacks** 🍬 · 🦷 toothache. on DAY ONE. |
| 9 | Bubby poops twice, live | Day 2: it pooped during my **Zoom call** 💩 · twice. in 4K. |
| 13 | Attention tile flashes (a tantrum) → Status: hearts are full | Then it **SCREAMED** for attention 📢 · …its hearts were FULL 🤨 |
| 18 | Discipline → "Bubby behaves now. Discipline 25%" | Faking it? **Scolded.** ✅ · discipline +25% 📈 |
| 21 | Discipline again → "That wasn't fair. Bubby is upset" | Then I scolded it again. **Just in case.** · (it was NOT acting out) 😬 |
| 24 | The real "While you were away · 9 h" card | Day 3: I worked **one** full day 💼 · the receipts 🧾 |
| 28 | Live evolution: "Bubby blossomed into a Thistle!" | Day 4: it grew up into a… **THISTLE** 🌵 · (that's the bad ending btw) |
| 32 | Back to the ending card (loops) | Day 5: it **packed up and left** 🧳 · Think you'd do better? 😤 · Free on Chrome · link in bio |

**Post caption:**
> 4 days. 9 care mistakes. 1 Thistle. My browser pet packed its bags 🧳 In my defence it FAKED being hungry first.
> Free Chrome extension, link in bio. Bet you can't get a Radiant Blossom 👑

**Hashtags:** `#virtualpet #storytime #tamagotchi #fail #pixelart #chromeextension #cozygames #workfromhome #relatable #indiegame`

---

## Posting playbook

- **Order:** post the funny video first (it can reach the widest audience), the intro 2–3 days later, then pin both.
  Whichever does better after 48 h, make two more in that style.
- **Voice:** both videos work without sound (all on-screen text). For more reach, add TikTok's built-in **text-to-speech**
  on the top captions in the TikTok editor, and optionally a trending sound at 5–10% under the original audio.
- **Cover:** `out/*-cover.jpg`, or pick in TikTok: the "LEFT ME" frame for the funny one, "Remember Tamagotchi?" for the intro.
- **First comment (pin it):** "What would YOU name yours? Best name gets a shout-out in the next video 🌱" (gives people a
  reason to comment, which TikTok rewards).
- **Reply with videos:** answer comments like "mine became a Thistle too 😭" with a quick Stitch/Reply video. Cheap, and
  it keeps the account active.
- **Best times:** weekday evenings (18:00–21:00 local) and Sunday afternoon; post 3–5× a week for the first month.

### Alternative hooks to A/B test (swap the first caption in `stage.js`, re-run)
- Intro: "POV: your Tamagotchi got a remote job 💻" · "The 90s egg pet, but it lives in your toolbar 🥚" ·
  "Things Gen Z will never understand: 🥚"
- Funny: "I got dumped by a pixel plant 🌱💔" · "Rate my parenting: 1/10 🌵" · "My browser pet filed for emancipation 🧳"

### CTA variants
- Before the store link is live: "Launching on Chrome soon · follow so you don't miss it 🔔"
- Engagement: "Comment what yours became 👇" (intro) · "Think you'd do better? 😤" (funny)

### Brand note
"Tamagotchi" is only used as a comparison in captions and text ("Remember Tamagotchi?"), never as Bubby's name, and none
of its logos or artwork are used. The store listing (`docs/STORE-LISTING.md`) stays brand-free.
