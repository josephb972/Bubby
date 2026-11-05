# Bubby: store listing (Chrome Web Store and Edge Add-ons)

Copy and paste from here into the developer dashboards. Everything below matches what the extension actually does.

**Package:** run `node tools/build-store.mjs` and upload `dist/bubby-1.0.0.zip` (it has `manifest.json` at the root).
**Images:** `store/` (rebuild with `node tools/store-assets.mjs`).

---

## Store listing tab

**Name:** Bubby (comes from `manifest.json`)

**Summary / short description** (comes from `manifest.json`, 132 characters max, currently 94):

> A tiny pixel pet that lives in your browser toolbar. Feed it, play with it, and watch it grow.

**Category:** Lifestyle → **Games**. (Lifestyle → *Just for Fun* also fits; pick one.)

**Language:** English

**Detailed description:**

```
Bubby is a tiny pixel virtual pet that lives in your browser toolbar.

Plant a seed and watch it grow, in real time, into a Bulb, a Bud, a Blossom and finally a wise old Elder. Its face on the toolbar shows how it feels, and a small badge tells you when it needs something. One click opens a pocket-sized toy where you take care of it.

HOW IT WORKS
• Feed it meals and snacks, play games, clean up after it, give medicine when it's sick, and turn off the lights at bedtime.
• Bubby keeps living while your browser is closed. When you come back, a short summary tells you what happened while you were away.
• How you raise it decides who it becomes: a Radiant Blossom, a Daisy Blossom or a Thistle.
• When it needs you, Bubby sends a notification with a button that fixes it right there, like "Feed a meal" or "Clean up".

CALM BY DESIGN
• Chill pace (default): one life lasts about 10 days, and checking in morning and evening is enough.
• Classic pace: about 4 days, for a real challenge. Quick pace: the whole life in about 20 minutes, for when you want to see everything.
• Bubby sleeps during the bedtime you choose and stays quiet at night.
• At most 6 care reminders a day, never two within 40 minutes. You can turn them off.

MINIGAMES
• Seed catch: steer Bubby under falling seeds for 20 seconds. Gold seeds are worth 3, pebbles cost 2.
• Which way?: guess which way Bubby will look.

PRIVATE
• No account, no ads, no tracking. Bubby sends nothing over the internet.
• Your pet is saved only in your browser's extension storage.

Tip: pin Bubby to your toolbar (puzzle-piece icon → pin) so you can always see its face. Open it from any tab with Alt+Shift+B.
```

**Graphic assets** (all in `store/`):

| Store field | File | Size |
|---|---|---|
| Store icon | `extension/icons/icon-128.png` | 128×128 |
| Screenshots (upload in this order) | `screenshot-1.png` toy pod · `screenshot-2.png` status card · `screenshot-3.png` Seed catch · `screenshot-4.png` notifications · `screenshot-5.png` life cycle | 1280×800 each |
| Small promo tile | `promo-small.png` | 440×280 |
| Marquee promo tile (optional) | `promo-marquee.png` | 1400×560 |

**Official URL / homepage:** leave empty, or use the GitHub repository once it is public.
**Support URL:** leave empty to use the store's built-in support tab (Bubby's "Send feedback" link in Settings opens it).

---

## Privacy practices tab

**Single purpose:**

> Bubby is a virtual pet game in the browser toolbar: you take care of a small pixel creature that grows up over time.

**Permission justifications:**

| Permission | Justification |
|---|---|
| `storage` | Saves your pet (its stage, hearts, settings) in the browser so it is still there next time. |
| `alarms` | Updates Bubby once a minute while the popup is closed, so it keeps living in real time and the toolbar icon stays current. |
| `notifications` | Tells you when Bubby needs care (hungry, sick, needs cleaning, lights still on at bedtime), with buttons that fix it directly. Can be turned off in Settings. |

No host permissions, no content scripts.

**Remote code:** No, I am not using remote code. (All code is in the package; there are no network requests.)

**Data usage:** tick **none** of the data types (Bubby collects no personally identifiable information, health, financial,
authentication, personal communications, location, web history, user activity or website content). Then tick all three
certifications:

- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** publish `docs/PRIVACY.md` (for example with GitHub Pages, or as a public GitHub file link) and paste its URL.

---

## Distribution tab

- **Visibility:** Public (or Unlisted for a soft launch with friends first).
- **Regions:** All regions.
- **Pricing:** Free.

---

## Edge Add-ons (Microsoft Partner Center)

Use the same zip, descriptions, images and privacy answers. Edge asks for a **search terms** list; suggested:
`virtual pet, pixel pet, toolbar pet, cute game, idle game, plant pet, digital pet`.
Edge also has a "Notes for certification" box; suggested text:

> No account or setup needed. Click the toolbar icon to open the pet. Settings (gear icon, bottom right of the popup)
> has a "Test notification" button. The pet starts as a seed and sprouts after about a minute.

---

## Notes for reviewers (Chrome "Test instructions", optional)

Same text as the Edge certification notes above.
