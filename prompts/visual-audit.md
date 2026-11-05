# Bubby visual audit (Pass 1)

Method: every state in the brief was rendered at 390×844 and 1280×900, light and dark, `deviceScaleFactor: 2`, with Playwright. Saves were injected into `localStorage['bubby.save.v1']`. A virtual clock and a seeded `Math.random` make the frames reproducible. The "before" frames are in `prompts/shots/*before*` (contact sheets). The concept art was not attached to this session, so "match the concept" is judged against the mint scalloped body, cream bezel, silver leaf charm and pastel tile palette already present in the file.

Effort: S ≤ 1h, M ≤ half a day, L = larger. Impact: 1–5.

| ID | State / screen | Problem | Why it hurts appeal | Proposed fix | Effort | Impact |
|---|---|---|---|---|---|---|
| A01 | Whole screen, every state | The 100×75 canvas is stretched to a fractional factor (≈1.89 css px at 390 wide, ≈3.78 device px at DPR 2). Pixels alternate between 3 and 4 device px. | Uneven pixels shimmer and look sloppy; this is the first thing a pixel-art fan notices. | Size the device from an integer-scale step, so the scene is exactly N device px per art pixel. Set tile and overlay metrics from the same unit. | M | 5 |
| A02 | All sprites | Uniform near-black outline (`#3b2f4a`) and flat two-tone fills (ring + fill); no highlight or shadow ramps. | Reads as "clip-art", not hand-shaded; lacks the soft charm of the shell. | Selective, hue-shifted outline (tinted from the neighbouring fill, lighter on the lit top-left). Automatic 3-step ramps with warm highlights and cool-purple shadows. | M | 5 |
| A03 | All sprites, performance | `petSprite()` rebuilds a canvas and calls `getImageData` every frame. | Risk of jank on phones; blocks adding more animation. | Cache sprites by state key. | S | 4 |
| A04 | Idle | Idle is a 1px bob and a fixed 3.4 s blink. No gaze, no fidgets. | Bubby feels like a looping GIF rather than a creature. | Breathing squash, randomized blinks, eyes that glance at poop, food and the pointer, idle fidgets (hop, look-around, shimmy, stretch). | M | 5 |
| A05 | Walking, all stages | Every stage slides sideways with the same 1px bob. | Stages feel identical in motion. | Bulb hops, Bud waddles, Blossom bounces, Elder shuffles with cane taps and dust. | M | 4 |
| A06 | Petals and leaves | The sprite is rigid; no follow-through. | Flat, no weight. | Slice at the waist: a spring-driven top slice (anticipation, squash and stretch, lag). | M | 4 |
| A07 | Hatch flash, evolutions | A 1.8 s flicker between old and new sprite, a white frame and sparkles, plus a 2-line toast over the sky. | The biggest emotional beat in the game is a flicker. | Ceremony: silhouette flashing, light burst, rising petals, reveal pose, name card that slides in. The 1.8 s `A` timing is kept. | M | 5 |
| A08 | Seed wobble and crack | The wobble is a 1px swap and the crack is a 6px line. | Anticipation is weak. | Rocking with growing amplitude, glowing crack, light leaks, tiny shell chips. | S | 3 |
| A09 | Expressions | Happy, sad and angry differ by a few pixels; sick is only a green tint plus a skull; the sad mouth sits on the blush. | Moods are unreadable at 1× scale. | Larger distinct eyes and brows, tears, anger mark, spiral eyes for sick, sweat drop, blush on happy. | M | 4 |
| A10 | Care feedback | Feeding, playing and medicine show only a toast, a bite animation and sparkles. | Care has no reward. | Floating hearts, crumbs, sparkle trails, medicine glow, fresh-grass shimmer after cleaning. | M | 5 |
| A11 | Button presses | Hardware buttons dip, but tiles do not react and there is no particle or distinct sound. | Presses feel thin. | Layered feedback: cap dip and highlight shift, tile bounce, pixel burst, per-action chiptune blip. | S | 4 |
| A12 | Minigame (catch) | No "+N" numbers, no combo or escalating pitch, no new-best celebration, no hit-stop on the pebble. | The loop lacks reward. | Floating numbers, gold glints, combo counter and pitch ladder, hit-stop plus 1px shake on pebble hit, confetti on a new best. | M | 5 |
| A13 | Minigame HUD | The ◀ ▶ buttons float over the garden where Bubby walks; they overlap Bubby at the screen edges and are 42×34 px. | Overlap and small touch targets. | Move the controls into the bottom tile row (44 px tall) so nothing covers the playfield. | S | 5 |
| A14 | Toasts | Two-line toasts at the top overlap petals and the status icons; only one toast at a time; long sentences. | Covers Bubby's face; noisy. | Short copy (≤ 26 chars), a sky-band toast lane, max 2 stacked, deferred while a menu is open. | S | 5 |
| A15 | Overlay typography | Fonts and spacing in `cqw` give fractional sizes (≈11.7 px), so the pixel font is blurry; no shared 2 px grid. | Blurry pixel text. | Size everything from the art-pixel unit `--u`; font sizes are multiples of 2 px. | M | 4 |
| A16 | Menus (Status, Feed, Play) | They look like web cards: thin ink border, white rounded boxes. | Breaks the toy illusion. | A pixel 9-slice frame drawn in code, a ▶ selection cursor, pressable pixel buttons. | M | 4 |
| A17 | Status screen | A plain table with a purple bar and tiny hearts. | The most-visited screen is the dullest. | Animated heart fill, a pixel scale for weight, a growing vine for discipline. | M | 4 |
| A18 | Attention tile | Hard-blinks between two colours via JS toggling. | Harsh, not charming. | A CSS ease-in-out pulse plus an icon bounce; static emphasis under reduced motion. | S | 3 |
| A19 | Garden | A flat tiled grass field with a pot; no depth, no atmosphere, no day/night. | Static; little reason to look again. | A sky band, far hills, mid bushes, swaying foreground blades; pollen, butterflies; a day/night grade with a moon, stars and a shooting star; ladybug surprise. | L | 5 |
| A20 | Contact shadow | A single flat ellipse regardless of hop height. | Bubby floats. | A two-tone soft shadow that shrinks with height. | S | 2 |
| A21 | Shell material | Flat gradient fill; no texture, rim light or ambient occlusion. | Looks like vector art, not soft-touch plastic. | SVG filters: grain, specular rim on the scalloped edge, AO under the bezel, inner shadow in the recess. | M | 4 |
| A22 | Screen glass | No glass, no LCD grid, no backlight. | The screen reads as a picture, not a device. | A glass reflection, a faint pixel grid and a backlight glow that dims at night. | S | 3 |
| A23 | Hardware labels | FEED, PLAY, CLEAN and SLEEP labels touch the neighbouring cap and the bezel. | Collisions; looks unfinished. | Reposition the labels, give them a text-shadow, keep them clear of caps and bezel. | S | 4 |
| A24 | Power button | The 25 px hit area is below the 44×44 touch minimum. | Hard to hit on phones. | An invisible hit-area extension. | S | 3 |
| A25 | Screen tile row | The 42 px tile row is below 44 px; the tile tint clashes with the palette. | Touch size. | Tile rows of 22 art pixels (44 px). | S | 3 |
| A26 | Chain and charm | The chain and caps have no specular or shadow; the chain is static. | The charm feels flat. | Link highlights, a drop shadow, a gentle sway on presses. | S | 2 |
| A27 | Guide column | Plain translucent panels and system-ish text; the life cycle is a static strip. | Does not share the device's art direction. | Pixel-framed collectible cards; unearned forms are silhouettes (new optional `bubby.collection.v1` key). | M | 4 |
| A28 | Speed and sound controls | Generic outline pills ("Sound off"). | Look like leftover web UI. | Toy-like switch pills in the device palette with icons. | S | 3 |
| A29 | End screens | A text card with the same layout as a menu. | A sad or proud moment is flat. | A framed card, a sprouting new seed, and (garden) a gentle confetti shower. | S | 3 |
| A30 | Pause screen | A flat grey overlay. | Unremarkable. | A dim plus a pixel pause icon and a soft text pulse. | S | 2 |
| A31 | Focus and accessibility | There is no focus ring on the hardware buttons' labels; contrast of muted text (≈4.5:1) is borderline. | Keyboard users and low-vision users. | Visible rings on every control; darker muted tokens (≥ 4.5:1 checked by script). | S | 3 |
| A32 | Reduced motion | Only the toast is covered. | Accessibility. | Disable shake, parallax and particles; keep icon-based state changes. | S | 3 |
| A33 | Hearts / poop icons | The poop is a pink swirl and there is no stink or fly cue; the skull is static. | State urgency is not charming. | Wavy stink lines, a bobbing skull, soft shadows. | S | 2 |
| A34 | Sound design | One square wave blip for everything. | No audio identity. | Triangle, pulse and noise voices; per-action motifs; combo pitch ladder. | S | 3 |

## Rejected up front

- **Rasterised gradients or images for the shell:** the brief forbids image files; SVG filters do the job.
- **A longer evolution ceremony:** this would extend the paused game clock, which counts as a timing change; the 1.8 s `A.dur` is kept and the name card outlives it.
- **A real-time "check back" nag or streaks:** these are dark patterns, so they are out.
