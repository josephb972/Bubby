# Bubby: browser extension

Bubby is a tiny pixel pet that lives in your browser toolbar. Its face on the toolbar shows how it feels, a badge
tells you when it needs something, and one click opens a pocket-sized version of the game.

Works in **Chrome, Edge, Brave, Opera, Vivaldi** and other Chromium browsers (version 116 or newer).
Firefox and Safari are not supported yet.

---

## 1. Install it (about 3 minutes)

You load it as an "unpacked" extension: the normal way to try an extension before it's in a store.

1. **Get the files.**
   - Easiest: if you were sent `bubby-extension.zip`, unzip it. You get a folder called `bubby-extension`.
   - Or from GitHub: open the repository, switch to the branch `claude/kind-babbage-d0msqa`, then
     **Code → Download ZIP**, unzip, and use the `extension` folder inside.
   - Or with git:
     ```bash
     git clone -b claude/kind-babbage-d0msqa https://github.com/josephb972/Bubby.git
     ```
     The extension is the `Bubby/extension` folder.
2. **Open the extensions page.** Type one of these into the address bar:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
3. **Turn on Developer mode.** It's a switch in the top-right corner (in Edge it's in the left sidebar).
4. **Click "Load unpacked"** and pick the folder that has `manifest.json` directly inside it
   (`bubby-extension`, or `extension` if you used GitHub).
5. **Pin Bubby.** Click the puzzle-piece icon next to the address bar, then the pin next to Bubby.
   Pinning matters: Bubby's face on the toolbar *is* the widget.

A welcome tab opens and the seed starts sprouting. Keep the folder where it is: the browser loads Bubby from it.

---

## 2. How it works

### The toolbar icon is the widget

| You see | Meaning |
|---|---|
| Bubby's face | Its current mood: smiling, sad, sick (green tint), asleep, or grumpy |
| Red **!** | Bubby is calling: hungry, lonely, or asleep with the lights on |
| Pink **!** | There's poop to clean up |
| Purple **+** | Bubby is sick and needs medicine |
| Blue **z** | Bubby is asleep |
| Grey **II** | Paused |
| **?** | Bubby's life is over and a new seed is waiting |

Hover over the icon to see a sentence explaining what's going on.

### The popup

Click the icon, or press **Alt + Shift + B** from any tab (Option + Shift + B on a Mac).

- **The big button** always shows the most useful thing to do right now, such as *Feed a meal*,
  *Clean up the poop* or *Give medicine*. Most visits are one click or a press of **Enter**.
  Green means all is well, amber means soon, red means now.
- **The six buttons** below it: Feed, Play, Clean, Lights, Medicine, Scold. A red dot marks the ones that would help.
- **Hearts:** hunger and happiness, 4 hearts each.
- **While you were away:** when you open Bubby after a while, a card sums up what happened
  ("Bubby got hungry and called for you", "Bubby pooped twice", "The seed sprouted!").

Keyboard: `F` feed, `P` play, `C` clean, `L` lights, `M` medicine, `D` scold, `1`/`2` choose in menus,
`←` `→` in games, `Enter` big button, `Esc` back.

### Notifications

When the popup is closed, Bubby checks itself once a minute. If it really needs you, you get a system notification
with a button that fixes it directly, such as **Feed a meal**, **Clean up**, **Give medicine** or **Turn lights off**,
so you don't even need to open the popup.

Bubby is polite about it:
- one notification per new need, never two within 40 minutes, at most 6 a day;
- quiet while Bubby sleeps (except one reminder at bedtime to turn off the lights);
- tantrums never notify. They only happen while you're watching.

### Paces (in ⚙ Settings)

| Pace | One life | Time passes… | Good for |
|---|---|---|---|
| **Chill** (default) | about 10 days | in real time, even with the popup closed | a calm toolbar pet; morning and evening check-ins are enough |
| **Classic** | about 4 days | in real time | a real challenge; check in every few hours |
| **Quick** | about 20 minutes | only while the popup is open | seeing the whole life cycle in one sitting |

In Chill and Classic, Bubby sleeps during the **bedtime you set** (default 22:00 to 08:00). You can switch pace at any
time without losing your Bubby.

### Raising a good Bubby

Bubby grows from **Seed → Bulb → Bud → Blossom → Elder**. How it turns out as an adult depends on your care while it was a Bulb and a Bud:

- **Radiant Blossom:** 0–2 care mistakes and 75%+ discipline
- **Daisy Blossom:** a few slips
- **Thistle:** many mistakes, or overweight

Care mistakes come from leaving a call unanswered too long (about 2½ hours in Classic, about 3¾ hours in Chill) or
leaving Bubby sick too long. Discipline comes from scolding **tantrums**: when Bubby calls but both hearts look fine,
it's acting out, so press **Scold**. Scolding a well-behaved Bubby only upsets it. Meals before snacks (too many sweets
cause a toothache), and clean poop quickly or Bubby gets sick.

---

## 3. A 10-minute test drive

1. **Watch it sprout (1 min).** Open the popup. The seed wobbles, cracks, and becomes Bubby the Bulb.
2. **Use the big button.** Feed a meal, then try **Play → Seed catch**: drag on the garden or hold the arrow keys.
   Gold seeds are worth 3 and pebbles cost 2.
3. **Skip ahead.** ⚙ Settings → **+4 hours**. You'll get a "While you were away" card, and Bubby will probably be
   hungry or have pooped. Fix it with the big button and watch the toolbar badge clear.
4. **Check notifications.** ⚙ Settings → **Test notification**. If nothing appears, see Troubleshooting below.
5. **Try a real background notification.** Close the popup, then:
   1. Go to `chrome://extensions` and click the **service worker** link on the Bubby card (next to "Inspect views"). A console opens.
   2. Type `bubby.skip(6)` and press Enter.

   Six hours pass for Bubby with the popup closed. Within a second you should see a notification such as
   *"Bubby is hungry"* with a **Feed a meal** button. Click the button, and the badge clears without opening Bubby.
   If Bubby happens to be in its bedtime for that window, it stays quiet. Change the bedtime in settings, or use
   `bubby.skip(2)`.
6. **See a whole life.** ⚙ Settings → **Quick**. Bubby goes through every stage in about 20 minutes of open-popup time.
   Switch back to Chill when you're done.

Other console helpers: `bubby.tick()` runs a background check now, `bubby.act('clean')` does what a notification button
does, and `bubby.state()` shows the saved game.

---

## 4. Troubleshooting

- **I can't see Bubby on the toolbar.** Pin it (puzzle-piece icon → pin).
- **No notifications.**
  - Make sure **Notifications** is ticked in Bubby's settings and you're not on the Quick pace.
  - Allow your browser to show notifications. On Windows: *Settings → System → Notifications*, turn on your browser.
    On macOS: *System Settings → Notifications →* your browser, and set the style to **Alerts** so the buttons appear.
  - Turn off Do Not Disturb / Focus.
  - Bubby is quiet while asleep, waits 40 minutes between notifications, and sends at most 6 a day.
- **Clicking a notification opens a small window instead of the popup.** Some browsers only open extension popups when
  you click the icon. The window is the same game.
- **The browser was closed for a while.** Bubby still lived through that time. It catches up the moment the browser
  starts again, and the summary card tells you what happened. Notifications only arrive while the browser is running.
- **I changed the code and nothing happened.** On `chrome://extensions`, click the ↻ reload arrow on the Bubby card,
  then reopen the popup. Reloading keeps your Bubby. **Removing** the extension deletes it.
- **Something looks broken.** On `chrome://extensions`, click **Errors** on the Bubby card. Please share what it says.

---

## 5. What's inside

```
extension/
  manifest.json        Manifest V3: permissions are only storage, alarms and notifications
  background.js        service worker: once-a-minute check, toolbar icon and badge, notifications
  core/rules.js        the game rules (shared by popup and background), paces, catch-up simulation
  core/store.js        saving, plus toolbar badge, tooltip and icon
  art/sprites.js       all pixel art, drawn in code (works in the popup and in the background)
  art/icon.js          Bubby's live toolbar face
  popup/               the popup: layout, styles, game loop, minigames, settings
  welcome/             first-run page
  icons/               static icons (rebuild with `node tools/make-icons.mjs`)
  fonts/               bundled fonts (SIL Open Font License, see fonts/OFL-LICENSES.txt)
```

Nothing leaves your computer: no accounts, no analytics, no network requests. Bubby is saved in the browser's
extension storage.

**How time works.** The game state records the last moment it was updated. Whenever the popup opens or the background
wakes up, `advance()` replays the missed time in small steps using the same rules, so Bubby behaves the same whether
you watched or not. While the popup is open it runs the game live and the background stays out of the way.

**Developer checks.** These need Node.js; the icon rebuild also needs Playwright.
- `node tools/sim-check.mjs` plays 80 simulated lives (players who check in every 30 minutes, every
  2 hours, 3 times a day, morning and evening, or never) and prints how often each ends up Radiant, Daisy or
  Thistle, how sick Bubby got, and how many notifications a day each player would get.
- `node tools/make-icons.mjs` regenerates the PNG icons from the pixel art.

The original single-file game (`index.html` at the repository root) still works on its own. It keeps its own save,
separate from the extension.
