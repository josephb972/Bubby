# Bubby — visual polish prompt

Paste everything below the line into a new Claude Code session on this repository. Attach the two original concept images (the device mockup and the "Plant Creature Evolution Scheme") with it.

---

<role>
You are a senior game artist and UI/UX designer who has shipped cozy pixel-art virtual-pet games. You have three areas of expertise: pixel-art craft (palette ramps, hue shifting, selective outlining, hand-placed anti-aliasing), game feel ("juice": anticipation, squash and stretch, hit-stop, particles, easing), and toy design (soft-touch plastic, specular highlights, LCD screens). You review like an art director and implement like a front-end engineer.
</role>

<context>
Bubby is a virtual-pet game in a single file, `index.html` (HTML, CSS and vanilla JS, no build step). It has three layers:
- **Device shell:** inline SVG drawn as a scalloped mint body with a cream bezel, a silver leaf charm and a chain.
- **Screen:** a 100×75 low-resolution canvas scaled up with `image-rendering: pixelated`, plus two rows of 16×16 icon tiles drawn on canvas. Sprites are drawn in code with ellipse and rectangle helpers (`E`, `ER`, `R`, `P`), then auto-outlined by `outline()`.
- **HTML overlays:** toasts, the Status / Feed / Play menus, the minigame HUD, the pause screen and the end screen. They use Pixelify Sans and sizes in container-query units (`cqw`).

The life cycle is Seed → Bulb → Bud → Blossom (Radiant, Daisy or Thistle form, optionally chubby) → Elder. The two minigames are "Which way?" and "Seed catch". The attached concept art is the visual source of truth: match its silhouette, palette mood and charm, then go beyond it.
</context>

<goal>
Make Bubby irresistible to look at and touch, so that its art direction, animation and feedback alone make players want to keep it open and check on it again. **Do not change the game rules, timings, balance or save format.** Every improvement must be visual, motion, sound-design or interaction feedback. Aim for "compulsively delightful", not manipulative: no guilt-tripping copy, fake urgency, nagging pop-ups or other dark patterns.
</goal>

<process>
Work in three passes. Do not skip the audit.

**Pass 1: Audit.** Render every state below at 390×844 and 1280×900, in light and dark color schemes, at `deviceScaleFactor: 2`, using the pre-installed Playwright. To reach a state quickly, inject a crafted save into `localStorage['bubby.save.v1']` with `addInitScript` before load. Then write a prioritized audit table to `prompts/visual-audit.md` with these columns: ID, state/screen, problem, why it hurts appeal, proposed fix, effort (S/M/L), impact (1–5).

States to capture:
- Seed (with wobble and crack), the hatch flash, and every evolution transition
- Bulb, Bud, each adult form, chubby, Elder
- Idle, walking, blinking, happy, sad, angry/tantrum, sick (skull), asleep with lights on and with lights off
- 1 to 4 poops, the clean wave, eating a meal and a snack, refusing food, medicine, scolding
- Status, Feed and Play menus; both minigames in every phase; pause; the "moved away" and "returned to the garden" end screens
- Toasts; the guide column (life-cycle strip, icon legend, adult forms); the speed and sound controls

**Pass 2: Implement** the fixes, highest impact ÷ effort first. Commit in small, themed commits.

**Pass 3: Verify.** Re-render the same states and save before/after contact sheets to `prompts/shots/`. Confirm that there are zero console errors, no horizontal scroll at 390px, and no element overlapping another one it shouldn't. Report what changed, what you rejected and why, and what remains.
</process>

<review_checklist>
Inspect each area for the problems listed and fix what you find.

1. **Overlap and layout integrity**
   - Do toasts, speech bubbles, skull and Zz icons, the minigame HUD and the arrow buttons collide with Bubby, poops, the flower pot or each other at every stage size (the baby is short, the adult's petals are tall)?
   - Is there a single, clear z-order? Do physical buttons and their labels collide with each other or the bezel?
   - Are touch targets at least 44×44 CSS px on phones? Does the screen keep its aspect ratio and stay clear of the safe areas?
2. **Pixel-art fidelity**
   - Snap the scene to an integer scale factor (letterbox if needed) so pixels are uniform squares, never mixed 2- and 3-pixel widths.
   - Keep one coherent limited palette (about 24–32 colors) with 3–4 step ramps per material, and hue-shift shadows toward cool/purple and highlights toward warm/yellow instead of only darkening or lightening.
   - Use selective outlining: tinted outlines darker than the fill, not uniform black; lighter outlines where light hits. Remove pillow shading and banding. Hand-place anti-aliasing on curves of large sprites.
   - Keep one consistent light source (top-left). Add a soft contact shadow under every grounded object.
   - Icons need a shared grid, stroke weight, light direction and readable silhouettes at 16×16. Each tile color should belong to the palette.
3. **Character appeal and animation**
   - Bubby should feel alive: a 2-frame breathing idle, randomized blinks, eyes that glance at poops, food and the cursor, small personality fidgets when idle, and a stage-specific walk cycle (the Bulb hops, the Bud waddles, the Blossom bounces, the Elder shuffles with the cane).
   - Apply squash and stretch, anticipation and follow-through to petals and leaves (secondary motion).
   - Make expressions distinct at a glance, with more readable moods at 1× scale.
   - Evolution should be a ceremony: silhouette flashing, a light burst, rising petals, a reveal pose, and a name card that slides in.
4. **Game feel ("juice")**
   - Every press gets immediate, layered feedback: the physical button dips with a highlight shift, the tile bounces, a pixel particle burst, and a matching chiptune blip.
   - Use eased tweens (ease-out-back for pop-ins, ease-in-out for moves), never linear.
   - Use tiny screen shakes and 40–80 ms hit-stop for the pebble hit and scolding.
   - Make catches satisfying: floating "+1"/"+3" pixel numbers, gold-seed glints, a combo counter with escalating pitch, and a confetti or sparkle crescendo on a new best score.
   - Make care visible: hearts float up when Bubby is fed or played with, the cleaning wave leaves sparkles and a fresh-grass shimmer, and medicine gives a gentle glow.
5. **Device and material rendering**
   - The shell should read as a premium toy: soft-touch matte plastic with a subtle noise texture, a specular rim highlight along the scalloped edge, ambient occlusion where the bezel meets the body, and a slight inner shadow on the screen recess.
   - The screen should read as glass: a faint glass reflection, an optional LCD pixel-grid texture, and a backlight glow that dims at night.
   - Make the button caps and the chain more tactile.
   - Keep the device colors fixed across themes; only the page background adapts.
6. **World and atmosphere**
   - Give the garden depth: parallax layers (far hills or sky band, mid bushes, foreground grass blades that sway), drifting pollen or dust motes, and occasional butterflies.
   - Shift the palette with the in-game day: warm morning, bright noon, golden evening, and a blue night with a moon and twinkling stars.
   - Add small, rare surprises (a ladybug crossing, a shooting star at night) that reward checking in. Keep each one cheap and non-blocking.
7. **UI and overlays**
   - Every screen needs a clear hierarchy: one focal point, consistent spacing on a 2-pixel grid, and pixel-font sizes that land on whole device pixels.
   - Menus should feel like part of the toy (pixel frames, 9-slice borders, a selection cursor), not web cards.
   - Turn the Status screen into a delightful dashboard: animated heart fill, a weight shown as a little scale icon, the discipline bar as a growing vine.
   - Toasts should be shorter, stack predictably, and never cover Bubby's face.
   - The attention icon should pulse with easing, not hard-blink.
8. **The page around the device**
   - The guide column should share the device's art direction (pixel accents, the same palette), with collectible-style cards for each life stage and adult form. Show forms not yet earned as silhouettes, unlocked once raised (store that in a new optional localStorage key, never in the existing save).
   - Make the speed and sound controls look like part of the product.
</review_checklist>

<constraints>
- Keep everything in `index.html`. No image files or new libraries; draw art in code or embed small data URIs. Load fonts only from Google Fonts.
- Do not change `STAGE` timings, decay rates, thresholds, scoring or the `bubby.save.v1` schema. Old saves must still load.
- Keep 60 fps on a mid-range phone. Cache static sprites, avoid per-frame `getImageData` where a cached sprite works, and respect `prefers-reduced-motion` (disable shake, parallax and particles, keep state changes visible).
- Keep accessibility: visible focus states, `aria-label`s, keyboard controls, and text contrast of at least 4.5:1 on overlays.
- The page is published without its `<!doctype>`/`<html>`/`<head>`/`<body>` wrapper (everything between the `page:start` and `page:end` markers is extracted), so keep page content between those markers.
</constraints>

<definition_of_done>
- Every audit item with impact ≥ 4 is fixed, or explicitly rejected with a reason.
- Before/after contact sheets exist for all states listed above.
- There are no overlaps, clipped text or console errors, and no horizontal scroll at 390px.
- In a side-by-side with the concept art, a first-time viewer would say the game looks finished, cohesive and charming.
</definition_of_done>
