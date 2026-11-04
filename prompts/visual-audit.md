# Bubby: visual audit (Pass 1)

**Method.** `prompts/shots/capture.js` serves `index.html?debug`, seeds `Math.random`, freezes time with `page.clock`, injects a crafted `bubby.save.v1` with `addInitScript` and drives transient states (animations, minigames) through the debug hook. It renders 58 states at 390×844 and 1280×900, in light and dark schemes, at `deviceScaleFactor: 2` (232 device shots plus 4 full-page shots). Contact sheets are in `prompts/shots/`.

**Baseline facts from the harness:** 0 console errors, no horizontal scroll at 390 px, and 14 touch targets under 44×44 px per viewport (the tiles are 46×39, the power button 24×24, the speed buttons 35×23, the chips 27 px tall).

**Concept art.** The two concept images were not attached to this session. The direction below comes from the existing art: the scalloped mint shell, the cream bezel, the silver leaf charm, the plant-creature stages and the README.

Impact runs 1–5 and effort is S/M/L. The table is sorted by priority (impact ÷ effort).

| ID | State / screen | Problem | Why it hurts appeal | Proposed fix | Effort | Impact |
|---|---|---|---|---|---|---|
| A1 | Every scene state | The 100×75 canvas is stretched to fill its grid cell: 1.89 × 1.88 CSS px per art pixel, which comes out as 3.78 device px at 2×. Art pixels render as mixed 3- and 4-px rows and columns, and they aren't square. | Wobbly, uneven pixels are the first thing that makes pixel art look cheap. Outlines flicker in thickness as Bubby walks. | Compute the screen layout in JS: pick the integer scale k (in device pixels) that fits 46–62 % of the device width, size the scene to exactly 100k × 75k device px, and resize the SVG screen recess to wrap it. Fall back to letterboxing. | M | 5 |
| P1 | Every frame | `petSprite()` redraws and re-outlines the pet with `getImageData` 60× per second. | It wastes battery and risks dropped frames on mid-range phones. | Cache sprites by a pose key. | S | 4 |
| A2 | Toasts on Blossom / Elder, evolve, scold | Two-line toasts at the top of the scene cover the adult's petals and the Elder's face (`toast-long`, `evolve-elder-mid`, `scold`). Each new toast replaces the last one instantly. | Text covers the face, the most important thing on screen, at exactly the emotional moments. | Shorter one-line copy and a smaller pixel font, a toast band that stays above the head line, and a queue so toasts show in order. Evolution text moves into a name card. | S | 4 |
| A3 | "Which way?" (all phases) | The `0 right` score pill sits on Bubby's feet and body. | It reads as a bug and hides the reveal animation. | Move the score into the top HUD, keep the arrows at the edges and add a selection glow. | S | 4 |
| G5 | Status while Bubby calls | The call callout is clipped at the bottom of the card ("…Feed it a meal." cut off, scroll bar). | Clipped text looks broken. | Redesign Status as a compact dashboard with short hint copy. | S | 4 |
| A7 | Phone: tiles, power, speed, sound, reset | Touch targets of 46×39, 24×24, 35×23 and 84×27 px. | Mis-taps on a care game feel unfair. | Tiles ≥ 44 px tall from the new layout, a 44 px hit area on power, 44 px-tall controls. | S | 4 |
| B1 | Guide: life strip, forms, legend | 48 px sprites shown at 56 CSS px and 16 px icons at 22 px, so the scale isn't an integer. | The guide is the first impression on desktop, and it looks blurry and smeared. | Crop sprites to their bounding box and show them at exactly 2×. Show icons at 2×. | S | 4 |
| F4 | Lights off / asleep | A flat 80 % navy wash: Bubby is almost invisible, and the stars are static dots. | Night should be the coziest moment, but it reads as "screen broken". | Use a night palette with a moon, moonlight rim, twinkling stars and the shooting-star surprise. Keep Bubby readable at about 55 % darkness. | S | 4 |
| D5 | Feed, play, clean, medicine | Care has no visible reward. A meal shows chomping and a toast. The clean wave is a flat blue bar. | Care that you can't see doesn't feel good, and visible care is what brings players back. | Floating hearts on feed and play wins, sparkles and a grass shimmer behind the clean wave, a soft glow for medicine. | S | 4 |
| C1 | Idle | A whole-sprite 1 px hard bob at 1.6 Hz. | It looks mechanical, not alive. | A 2-frame breathing squash (body ±1 px) with the head following a frame later. | S | 4 |
| C2 | Idle, blink | A fixed blink every 3.4 s. The eyes look only in the walking direction. | Robotic. | Randomized blinks (sometimes doubled), and eyes that glance at the nearest poop, the food, falling seeds or the pointer. | S | 4 |
| B7 | Tiles + legend | The icons have no shared language: Discipline is a pencil, Clean is the poop sprite itself, Play is a duck, Status is a sun and Lights is a desk lamp. | Players can't tell what a tile does, and "Clean" looks like "Poop". | Redraw a coherent 16×16 set on a shared grid with top-left light and tinted outlines: fork & spoon, heart meter, bell, bottle, shower, bulb, ball, "!" bubble. | M | 4 |
| B3 | All sprites | `outline()` applies the same `#3b2f4a` outline to every edge of every sprite. | It looks like a coloring book, with no volume and no light. | Selective outline: each outline pixel takes a darkened, hue-shifted tint of the fill next to it, lighter on the top-left (lit) edges. | M | 4 |
| B4/B5 | All sprites | Shading mixes colors toward white or black, with one highlight blob per shape and no shadow side. There is no palette discipline (90+ ad-hoc hexes). | Flat, pillow-shaded and muddy. | A 32-color master palette with 3–4 step ramps, hue-shifted (shadows go cool/purple, highlights warm). The `EB()` helper shades every body ellipse with a top-left light. Sprites are quantized to the palette. | M | 4 |
| F1 | Every scene | The background is a flat green field with speckles: no horizon, no sky, no depth. The pot floats in the middle of the lawn. | The world feels empty, and nothing rewards looking. | Layers: a sky band, far hills, mid bushes, the ground, and foreground grass blades that sway. The bushes parallax slightly with Bubby. The pot moves to the back layer. | M | 5 |
| A4 | 4 poops | Poop slot 4 (88, 56) is drawn on top of the flower pot. | A muddled silhouette. | New poop slots along the ground line, clear of the pot. | S | 3 |
| C5/C6 | Hatch and every evolution | The hatch flash lasts 0.2 s at 80 % white and is barely visible. Evolution is old/new sprite flicker plus a long toast. | Evolution is the payoff of the whole game, and it feels like an afterthought. | A ceremony: anticipation wobble, a white silhouette flashing between the old and new forms with accelerating tempo, a light burst with rays, rising petals, a reveal hop and a name card that slides in. | M | 5 |
| C3/C7 | Walking | Every stage walks with the same 1 px bob, and the petals and leaves are static. | Stages don't feel like different ages. | Per-stage gaits: the Bulb hops with squash on landing, the Bud waddles, the Blossom bounces with petal lag, the Elder shuffles with a cane tap. The leaves sway. | M | 4 |
| D1 | Every press | Every press gives the same 880 Hz blip. The tiles don't bounce and nothing happens in the scene. | Presses feel dead, with no tactile delight. | The cap dips and its highlight shifts, the tile does a squash bounce, a pixel puff appears in the scene, and each action has its own chiptune blip. | S | 4 |
| D4 | Seed catch | No score popups, no combo and no new-best moment. | The minigame never escalates or peaks. | Pixel "+1"/"+3" floaters, a gold glint, a combo counter with rising pitch, and confetti plus a fanfare on a new best. | M | 4 |
| D3 | Pebble hit, scold | No impact. | The pebble doesn't hurt and the scold doesn't land. | A 60 ms hit-stop and a 1-art-pixel screen shake (off with reduced motion). | S | 3 |
| E2 | Screen | A matte rectangle: no glass, no backlight. | It doesn't read as an LCD toy. | Glass reflection, a pixel-grid texture aligned to art pixels, an inner shadow, and a backlight that dims with lights off. | S | 4 |
| E1/E3 | Shell, buttons, chain | Flat gradients with offset-copy shadows, no material texture. The caps have no rim specular. The chain links are flat. | It reads as clip-art, not a premium toy. | Matte noise (feTurbulence), a specular rim along the top-left scallops, ambient occlusion where the bezel meets the body, glossy caps with a rim light, and shaded chain links. | M | 4 |
| A8 | Physical buttons | The FEED label touches the PLAY cap and the SLEEP label touches the CLEAN cap. | The bottom of the toy looks cramped. | Spread the arc, tighten the label type and set each label under its own cap. | S | 3 |
| F2 | Day cycle | It is always flat noon. | No sense of time, and no cue that bedtime is coming. | The sky follows Bubby's waking day: warm morning, bright noon, golden evening as bedtime nears, and a blue night. This is a readability cue as well as mood. | M | 4 |
| F3 | Ambient | Nothing happens unless you act. | No reason to check in. | Pollen motes, an occasional butterfly, a rare ladybug crossing, and a shooting star at night. All cheap and non-blocking. | M | 3 |
| D6 | Attention tile | A hard on/off blink every 0.4 s. | It's harsh and reads as an error. | An eased pulse (scale plus glow), with a gentle fade under reduced motion. | S | 3 |
| G1 | Status, Feed and Play menus, end card | Web cards: white boxes with a thin border, no cursor. | They break the illusion that the menu is inside the toy. | Pixel 9-slice frames (`border-image` generated on canvas), a ▶ selection cursor on focus and hover, a 2 px spacing grid, and an ease-out-back pop-in. | M | 4 |
| G2 | Status | A plain definition list in tiny text. | Status should be a moment of pride. | A dashboard: hearts that fill in sequence, weight shown with a scale icon, the discipline bar as a growing vine, and mistakes as leaves. | M | 3 |
| G3 | All overlays | Pixel-font sizes in `cqw` land on fractional pixels (Pixelify Sans looks soft at 10.37 px). | Soft text clashes with crisp pixels. | Set font sizes in whole px from the layout pass (`--fs`, `--fs-s`). | S | 3 |
| A6 | End screens | The card covers the whole garden, including the seed. | It hides the "it left a seed behind" payoff. | A compact card at the bottom, with the seed, a sign or a bindle, and sparkles visible above it. | S | 3 |
| C4 | Expressions | Normal, sad and sick are hard to tell apart at 1×. | Moods carry the emotional loop. | Stronger faces: sad gets droopy eyes and a tear, angry gets a vein mark and a stomp, happy gets closed arcs, a wide mouth and blush, sick gets a green tint, sweat and a wavy mouth. | S | 3 |
| H2 | Guide: adult forms | All forms are shown up front, with nothing to collect. | A missed collection loop. | Collectible cards: forms not yet raised appear as silhouettes and unlock once raised. The record lives in a new optional key, `bubby.dex.v1`, separate from the save. | M | 4 |
| H1 | Guide column | Generic web styling that doesn't share the device's art direction. | The page around the toy feels like a template. | Pixel-framed cards, pixel accents on headings and the same palette. | M | 3 |
| H4 | Speed / sound | Generic pills. | They don't look like part of the product. | A hardware-style segmented slider and a speaker toggle with pixel icons. | S | 3 |
| B6 | Poop, pot, seeds, food | Only Bubby has a contact shadow. | Objects float. | A soft 1-px-tall contact shadow under every grounded object. | S | 3 |
| P2 | Reduced motion | Only the toast and cap transitions respect it. | Accessibility. | An RM flag disables shake, parallax, particles and ambient life, and keeps state changes visible. | S | 3 |
| A5 | Pause | White text on a 55 % wash over green is about 4.3:1 contrast. | Readability. | A darker wash inside a pixel frame card. | S | 2 |
| H5 | Desktop | The device is capped at 380 px, with lots of dead space at 1280. | The hero is undersized. | Allow up to 420 px when the viewport is tall enough, still integer-snapped. | S | 2 |

---

# Outcome (Passes 2 and 3)

## Status of every item

| ID | Impact | Status | Notes |
|---|---|---|---|
| A1 | 5 | Fixed | `layout()` snaps the scene to k device px per art pixel: k = 4 at DPR 2, 6 at DPR 3, 2 at DPR 1, 5 at DPR 2.625. The LCD is 200×150 CSS px at common DPRs, and the SVG recess wraps it. |
| F1 | 5 | Fixed | Sky band, far hills, hedge with the pot, lawn, swaying foreground grass, parallax on the hills and bushes. |
| C5/C6 | 5 | Fixed | A 3.2 s ceremony with an anticipation wobble, white silhouettes alternating faster and faster, a burst with rays, rising petals (shell fragments when hatching), a reveal hop and a name card in the sky band. |
| P1 | 4 | Fixed | Pet sprites are cached by pose. `draw()` averages 0.5 ms (p95 1 ms) at 4× CPU throttle and holds 60 fps. |
| A2 | 4 | Fixed | One-line copy of at most 30 characters, a 2-deep queue, and the toast stays in the sky band. The harness checks every state and finds no toast over Bubby's head or face. |
| A3 | 4 | Fixed | The score moved into the HUD. |
| G5 | 4 | Fixed | Compact dashboard with short hint copy. Nothing is clipped. |
| A7 | 4 | Fixed | Tiles are 50×44, the speed buttons 48×44, sound and reset 44 tall. Power has a 46 px hit area, verified by hit-testing. |
| B1 | 4 | Fixed | Guide sprites are cropped and shown at exactly 2×. The life strip wraps on narrow phones instead of scaling. |
| F4 | 4 | Fixed | Night is a multiply grade with a moon, twinkling stars and shooting stars. Bubby stays readable. |
| D5 | 4 | Fixed | Hearts, crumbs, clean-wave foam and spray plus a grass shimmer, a medicine glow ring and bubbles. |
| C1/C2 | 4 | Fixed | 2-frame breathing with follow-through, random blinks (some doubled), glances at seeds, food, the pointer and poop, idle fidgets. |
| B7 | 4 | Fixed | One icon family: fork & spoon, clipboard heart, wagging finger, bottle, shower, bulb, ball, "!" bubble. |
| B3 | 4 | Fixed | Selective outline: the lit side takes the deepest step of the fill's ramp, the shadow side is ink. |
| B4/B5 | 4 | Fixed, with a deviation | Top-left form shading (`EB`) and quantization to the master palette. **The palette has 46 colors, not 24–32**: 11 materials × 4 steps, plus ink and white. Getting down to 32 would force the Bulb's teal, the leaves and the lawn to share a ramp, which would kill figure–ground contrast. The sky gradient and the time-of-day grade are lighting on top of the palette, by design. |
| C3/C7 | 4 | Fixed | The Bulb hops with squash on landing, the Bud waddles, the Blossom bounces with trailing petals, the Elder shuffles with a cane tap. Leaves and petals lag a beat. |
| D1 | 4 | Fixed | Every press bounces its tile and throws pixels into the scene. Each action has its own chiptune phrase, and the cap highlight shifts when pressed. |
| D4 | 4 | Fixed | +1/+3/−2 pixel numbers, a gold glint, a combo counter with rising pitch, and confetti plus a fanfare on a new best. |
| E1/E3 | 4 | Fixed | Matte grain, a specular rim, AO, a recess gradient, glossy caps and shaded chain links. |
| E2 | 4 | Fixed | Glass sheen, inner shadow, an LCD grid aligned to art pixels (only at k ≥ 3, where a hairline grid doesn't overpower the art), and a night vignette. |
| F2 | 4 | Fixed, reinterpreted | The sky follows **Bubby's waking day** (morning right after waking, golden evening as bedtime nears) rather than the 60 s in-game `DAY`. A full sky cycle every minute would be frantic, while this version also tells you bedtime is coming. |
| G1 | 4 | Fixed | 9-slice SVG pixel frames, a bobbing cursor, pressed bevels, ease-out-back pop-ins. |
| H2 | 4 | Fixed | Six collectible cards (3 Blossoms, 3 Elders). Unraised forms show as silhouettes with "???" and the hint. Stored in the optional `bubby.dex.v1` key; the existing save is not touched. |
| A4, A6, A8, B6, C4, D3, D6, F3, G2, G3, H1, H4, P2, A5 | 2–3 | Fixed | See the commits. |
| H5 | 2 | Rejected | Integer snapping gives a 200 CSS px LCD at common DPRs whatever the shell width. A bigger shell would only add bezel. |
| B3 (hand AA) | n/a | Rejected | Sprites move over a background that is time-graded and parallaxing, so external anti-aliasing pixels would halo. Internal AA on the largest curves is left for a hand-pixelled pass. |

## Verification (Pass 3)

- **Shots:** 63 states × {390×844, 1280×900} × {light, dark} at DPR 2, plus full-page shots. Contact sheets: `before-after-phone-light.jpg`, `before-after-desk-dark.jpg`, `before-after-screens.jpg` (LCD close-ups), `before-after-pages.jpg`. `before-*.jpg` are the Pass 1 sheets. Run `node prompts/shots/capture.js <label> <dir>`, then `python3 prompts/shots/sheet.py pair <before> <after> <combo> <out>`.
- **Console errors:** 0 across all 252 page loads, plus a 10-state reduced-motion run with 0 errors.
- **Horizontal scroll:** none at 390 px (also checked at 320 and 360).
- **Overlaps:** none. The harness tests the toast, name card, game HUD and arrows against Bubby's head and face in every state, and the hardware buttons and labels against each other.
- **Behavior:** a full life (seed → Thistle → Elder → returned to the garden → replant) at 4× has no errors, and the collection records it. Keyboard play works (F/1, P/2 with arrows, S, Esc). An old-format save and an old hot-reload `PET` load unchanged.
- **Rules untouched:** `STAGE`, `fresh()`, `load()`, `healthyMax`, `catchY` and the scoring arithmetic are byte-identical to the original. The only changes inside rule functions are copy and presentation calls.

## Known trade-offs and what remains

- Hit-stop freezes the minigame for 70 ms per pebble, so a round with pebbles runs slightly longer in real time. Score and timer rules are unchanged.
- The evolution ceremony takes 3.2 s instead of 1.8 s. Game time is paused during evolution in both versions, so stage timing is unaffected.
- When no integer scale fits (unusual zoom levels, DPR 1.25), the LCD falls back to proportional scaling.
- Sick Radiant/Thistle forms quantize to brownish tones. They read as unwell, but a dedicated sick ramp would look more deliberate.
- The concept images were not available in this session, so the direction follows the existing art.
- Still open: internal anti-aliasing on the 48 px sprites, an Elder-specific sit/rest fidget, and music.

---

# Follow-up: the photographed toy pod

The SVG shell is replaced by the supplied product photo. The buttons and the screen are live on top of it.

- **The photo:** keyed out of its blue studio backdrop. Only backdrop-blue connected to the border or enclosed by the chain counts as background, so the blue Sleep cap and pink Feed cap stay intact. Edges are choked and de-fringed. The backdrop's darkening is kept only as a soft contact shadow near the body, so the pod sits on the light and the dark page alike. The baked-in screen art is blanked. The image is embedded once as a 75 KB WebP data URI (`--pod`), so `index.html` stays a single file.
- **Buttons:** each cap is a circular cut-out of the same photo (`placeButtons()`, coordinates in `POD.btn`) sitting over a dark socket. On hover it catches a highlight. On press it sinks into the socket with a shifted highlight and inner shadow, then bounces back. Power glows amber while paused. The labels are the ones printed on the photo, and every button keeps its `aria-label`.
- **Screen:** the live LCD fills the photo's glass (`POD.glass`). The 100×75 scene is still snapped to an integer number of device pixels per art pixel, letterboxed by the dark rim: 3× at DPR 2 and 5× at DPR 3 on a 390 px phone (the pod runs nearly edge to edge there), and 2× at DPR 1 or 4× at DPR 2 on desktop (the pod is 470 px wide).
- **Trade-off:** the photo's screen is about 40 % of the pod's width (the SVG shell's was 53 %). On a 390 px phone the LCD is therefore 150–167 px wide instead of 200, and the tiles are 37–41 px wide by 28–35 px tall. Their hit areas extend invisibly over the bezel to 44 px tall, which the harness checks by hit-testing; their width can't reach 44 without overlapping each other. The Feed and Play menus moved Back into the title row, and the HUD prompts were shortened, so everything fits at the smaller size.
- **Verification:** 0 console errors in 252 loads plus the reduced-motion pass, no horizontal scroll, no overlay over Bubby's face in any state, and a full life completes. `draw()` stays under about 1 ms (p95) at 4× CPU throttle.
