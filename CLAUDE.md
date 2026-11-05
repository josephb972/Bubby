# Bubby project memory

Bubby is a single-file virtual-pet game (`index.html`). No build step, no package.json, progress saved in localStorage.

## Key files
- `index.html`: the whole game, with PostHog analytics configured (EU host, project key set).
- `README.md`: player-facing description.
- `memory/bubby-monetization-and-marketing.md`: monetization options (Bubby Plus ranked 1, cosmetic packs ranked 2), marketing plan, and TikTok strategy with Claude-only and Claude plus Higgsfield routes.
- `prompts/visual-polish-prompt.md`: art-direction prompt.

## Conventions
- Keep the game a single HTML file unless the user asks otherwise.
- Analytics events go through `track()`. Never send personal data. The Stats button must keep working.
- Game balance and decay rules are in `STAGE` and `ABSENCE`. Don't make absence punish the player.
- Paid features must never change difficulty or revive a dead Bubby. Cosmetics only.
- Work on `claude/practical-faraday-wxk9us`.
