# Bubby

A small virtual-pet game in a single HTML file. Open `index.html` in a browser to play.

Bubby grows from a **Seed** into a **Bulb** (baby), a **Bud** (child), a **Blossom** (adult) and finally an **Elder**.
Keep its hunger and happiness hearts up, clean up poop, give medicine when it is sick, turn the lights off at bedtime
and scold tantrums. Your care mistakes, discipline and weight while it is a Bulb and a Bud decide which adult form it becomes:

- **Radiant Blossom**: 0–2 care mistakes and 75%+ discipline
- **Daisy Blossom**: a few slips
- **Thistle**: many mistakes, or overweight

Play has two minigames: **Which way?** (guess where Bubby looks) and **Seed catch** (steer Bubby under falling seeds for 20 seconds; gold seeds are worth 3, pebbles cost 2).

A full life lasts about 20 minutes at 1× speed (2× and 4× are available). Time only passes while the page is open,
the power button pauses, and progress is saved in the browser's localStorage.

## New in this version

- **Clock:** the subtitle shows a countdown to the next bedtime or growth stage. The status panel shows both.
- **Daily gift:** the first visit each calendar day gives Bubby +1 heart of hunger and happiness, and a day streak grows.
- **Gentle time away:** while the page is closed, hunger and happiness ease down by at most 2 hearts over 8 hours, and never below 1 heart. Bubby does not get sick, make poop, or move away while you are gone.
- **Analytics (PostHog):** anonymous usage events, sent with a random ID stored in this browser. Turn them off with the **Stats** button. To enable, set `PH_KEY` in `index.html` to your PostHog project key. The default placeholder sends nothing.

`prompts/visual-polish-prompt.md` is a ready-to-paste prompt for an art-direction and UI polish pass.
