# Bubby for Android

Current version: <!-- version -->1.1.2<!-- /version --> (the same as the extension: `android/app/build.gradle` reads
`extension/manifest.json`, and versionCode is 1.1.0 → 10100).

The Android app runs the extension's game (rules, art, popup) in a native app made with
[Capacitor](https://capacitorjs.com). The game code is not forked: `build-web.mjs` copies `extension/core`, `art`,
`popup`, `fonts` and `icons` at build time and adds a phone layer (`web/`), so every extension update reaches the app
with `npm run apk`.

## The phone layout

The popup is a 468×600 (about 3:4) window; phones are about 9:20. The app keeps Bubby's look and arranges it for a
phone:

- **Main screen (toy pod):** the pod artwork fills the screen width, edge to edge. Its photo edges fade into a matching
  sky-blue screen, so there's no picture-in-a-box. It sits centred between the status bar and a **bottom sheet**.
- **Bottom sheet:** cream, rounded top with a handle (Material bottom sheet). It holds the hunger and happy hearts,
  discipline, weight and mistakes, the big "what Bubby needs" button (it turns orange or red and says
  "Tap to do it"), and the "grows up in…" line. These are the compact look's own elements, so the game keeps them up to
  date.
- **Mini-games:** while a game is on, the bottom sheet becomes a game pad: the game's ◀ ▶ buttons move out of the
  pod's small screen into two big yellow buttons, one under each thumb (hold for Seed catch, tap for Which way?).
  Dragging on the garden still steers in Seed catch. The pod stays where it is; the arrows go back when the game ends.
- **Settings and Shop:** full-width scrolling screens, larger text (scaled to the phone's width), and a title bar that
  stays on screen.
- **Naming screen (1.1.2):** full screen like Settings, with a bigger ID card and name field; the back button can't skip it.
- **Compact look:** scaled to the screen width and centred.
- System bars: the app draws behind the status and navigation bars, with dark icons on the light background.

## Install the test build on your phone

1. Get `bubby-android-<version>.apk` (built with `npm run apk`, copied to `dist/`) onto the phone (download it in the Claude app or from wherever it was shared,
   or send it to yourself by email or Google Drive).
2. Open the file from the notification or the **Files / Downloads** app.
3. Android asks to allow installs from that app (Chrome, Files, Gmail…): tap **Settings → Allow from this source**,
   go back, tap **Install**. If Play Protect warns about an unknown app, tap **More details → Install anyway**
   (it does this for any app that isn't from the Play Store).
4. Open **Bubby** and allow notifications when asked.

Updating: install a newer test APK over the old one; Bubby keeps living. Uninstalling the app deletes Bubby.

## What's different from the extension

| Extension | Android app |
|---|---|
| Toolbar icon and badge | The app icon (no live face or badge yet) |
| Background worker checks Bubby every minute | When you leave the app, it looks ahead with the same game rules and schedules the notifications Bubby would send (same wording, 6 a day, 40 min apart, quiet at night). Opening the app cancels them and the live game catches up. |
| Notification buttons (Feed a meal…) | Tap the notification to open Bubby (buttons: later) |
| Welcome page | Not shown; bedtime 22:00–08:00 to start, change it under ⚙ |
| Keyboard shortcuts and hints | Hidden; "Press Enter" reads "Tap to do it" |
| `chrome.storage.local` | The app's own storage (`localStorage` in its WebView) |

Bubby has some luck in its life (sickness, tantrums), so the scheduled notifications are a forecast: now and then one
might arrive a little early or late compared with what the game shows when you open it.

Phone back button: closes settings or a menu first, then sends the app to the background.

## Build it yourself

Needs Node.js 22+, JDK 21 and the Android SDK (platform 36, build-tools 36). Android Studio installs the SDK, or use
the command-line tools and set `ANDROID_HOME`.

```bash
cd mobile
npm install
npm run apk
```

The APK is `mobile/android/app/build/outputs/apk/debug/app-debug.apk`. With a phone plugged in (USB debugging on):
`adb install -r android/app/build/outputs/apk/debug/app-debug.apk`. To open the project in Android Studio:
`npm run sync`, then open `mobile/android`.

- After changing the extension's popup, rules or art: `npm run apk` again (it copies the current extension files).
- Check the phone layer without a phone: `node mobile/build-web.mjs && node tools/check-mobile.mjs [screenshot-dir]`
  (phone-sized Chromium: the pod fits, taps work, the save works, the notification forecast).
- App icons and splash screens: `node tools/make-android-icons.mjs` (from the same pixel art as the extension icons).

### Signing

Test builds are signed with `android/bubby-test.keystore` (password `bubby-test`), which is in the repository on
purpose: any computer builds an APK that installs over the previous one. **Don't use it for the Play Store.** A store
release needs a new private upload key that is kept out of the repository.

## Files

- `web/mobile.js`: phone versions of the extension APIs the popup uses, notification planning (with
  `extension/core/notes.js`, the same choice and wording as the extension), the layout's two scales (`--podz` for the
  pod, `--uiz` for text), back button.
- `web/mobile.css`: the phone layout described above. The extension's popup.css is untouched.
- `build-web.mjs`: builds `www/` (gitignored) from `extension/` + `web/`.
- `capacitor.config.json`: app id `app.bubby.pet`, name, notification icon.
- `android/`: the native project (generated by `npx cap add android`, then given Bubby's egg icons, splash,
  notification icon, version from the manifest, and signing).
