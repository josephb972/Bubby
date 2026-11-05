# Bubby: what to paste into the store dashboards

Works for the Chrome Web Store and Edge Add-ons. Everything here is true of the code; update it if the code changes.

- **Upload:** `dist/bubby-1.0.0.zip`, made by `node tools/package.mjs`.
- **Images:** `store/`, made by `node tools/store-images.mjs` from the real popup.

## Listing

| Field | Value |
|---|---|
| Name | Bubby (from `manifest.json`) |
| Summary | A tiny pixel pet that lives in your browser toolbar. Feed it, play with it, and watch it grow. (from `manifest.json`, 94 of 132 characters) |
| Category | Lifestyle → Games (Lifestyle → Just for Fun also fits) |
| Language | English |
| Icon | `extension/icons/icon-128.png` |
| Screenshots, in order | `store/screenshot-1.png` toy pod · `-2` status card · `-3` Seed catch · `-4` compact look (all 1280×800) |
| Small promo tile | `store/promo-small.png` (440×280) |
| Marquee (optional) | `store/promo-marquee.png` (1400×560) |

### Description

```
Bubby is a tiny pixel virtual pet for your browser toolbar.

It starts as a seed and grows, in real time, into a Bulb, a Bud, a Blossom and at last a wise old Elder. Its face on the toolbar shows how it feels, and a small badge tells you when it needs something. Click it, and a pocket-sized toy opens with Bubby living on its screen.

Take care of it
• Feed it meals and snacks, play games, clean up after it, give medicine when it's sick, and turn off the lights at bedtime.
• Scold its tantrums so it grows up well behaved.
• How you raise it decides who it becomes: a Radiant Blossom, a Daisy Blossom or a Thistle.

It lives while you're away
• Bubby keeps going even when the browser is closed. When you come back, a short card tells you what happened.
• When it really needs you, a notification has a button that fixes it on the spot, like "Feed a meal" or "Clean up".

Calm, not naggy
• Chill pace (the default): one life is about 10 days; a check-in in the morning and the evening is enough.
• Classic pace: about 4 days, for more of a challenge. Quick pace: a whole life in about 20 minutes while the popup is open.
• Bubby sleeps during the bedtime you choose and stays quiet at night.
• At most 6 care reminders a day, never two within 40 minutes, and you can turn them off.

Two minigames
• Seed catch: catch falling seeds for 20 seconds. Gold seeds are worth 3, pebbles cost 2.
• Which way?: guess which way Bubby will look.

Private
• No account, no ads, no tracking. Your pet is saved only in your browser, and Bubby sends nothing over the internet.

Tip: pin Bubby to your toolbar (puzzle-piece icon → pin) so its face is always in view. Alt+Shift+B opens it from any tab.
```

## Privacy practices

**Single purpose:** Bubby is a virtual pet game in the browser toolbar: you look after a small pixel creature that grows
up over time.

| Permission | Why Bubby needs it |
|---|---|
| `storage` | To save your pet and your Bubby settings in the browser. |
| `alarms` | To update Bubby once a minute while the popup is closed, so it lives in real time and its toolbar face stays current. |
| `notifications` | To tell you when Bubby needs care, with buttons that fix it directly. Can be turned off in Bubby's settings. |

- **Host permissions / content scripts:** none.
- **Remote code:** No. All code is in the package.
- **Data collected:** none of the listed types. Tick the three certifications (no selling or transferring user data, no
  use unrelated to the single purpose, no use for creditworthiness or lending).
- **Privacy policy URL:** the public address of `docs/PRIVACY.md` (see the checklist).

## Distribution

Free · all regions · Public (or Unlisted for a soft launch with friends).

## Edge Add-ons extras

- **Search terms:** virtual pet, pixel pet, toolbar pet, cute game, plant pet, digital pet, idle game
- **Notes for certification** (also usable as Chrome's test instructions):
  > No account or setup needed. Click the toolbar icon to open the pet; it sprouts from a seed after about a minute.
  > Settings (gear icon, bottom right of the popup) has a "Test notification" button.
