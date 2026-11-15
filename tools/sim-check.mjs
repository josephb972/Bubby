// Plays whole Bubby lives in fast-forward to check the real-time pacing.
// Usage: node tools/sim-check.mjs
import * as R from '../extension/core/rules.js';

const MIN = 60 * 1000;
function life(paceId, player, { days = 20, seed } = {}) {
  const start = new Date('2026-11-02T09:00:00').getTime();
  const S = R.fresh(1, { pace: paceId }, start);
  let t = start, n = 0, calls = 0, lastKey = null, checks = 0, games = 0;
  const end = start + days * 24 * 60 * MIN;
  while (t < end && !S.ended) {
    t = start + (++n) * 5 * MIN;
    R.advance(S, t);
    const key = R.needKey(S);
    if (key && key !== lastKey) calls++;
    lastKey = key;
    if (player(new Date(t), t)) {
      checks++;
      // A sensible player: fix whatever the smart button says, play when happy is low.
      for (let i = 0; i < 6; i++) {
        const need = R.topNeed(S);
        if (!need.act || need.tone === 'ok') break;
        if (need.act === 'play') { R.finishGame(S, 1); games++; continue; }
        if (['replant', 'resume'].includes(need.act)) break;
        R.doAction(S, need.act, t);
      }
      if (S.hunger < 3 && !S.asleep && S.stage !== 'seed' && S.lights) R.doAction(S, 'meal', t);
      if (S.happy < 3 && !S.asleep && S.stage !== 'seed' && S.lights && !S.sick) { R.finishGame(S, 1); games++; }
      // Spend ~40 seconds with the popup open: tantrums only happen while you watch.
      for (let i = 0; i < 40; i++) {
        R.advance(S, t + i * 1000, { game: false, busy: false });
        if (S.call && S.call.reason === 'tantrum') R.doAction(S, 'scold', t + i * 1000);
      }
    }
  }
  const days_ = ((S.ended ? S.ended.age : S.age) / 86400).toFixed(1);
  return { pace: paceId, ended: S.ended ? S.ended.kind : 'alive', days: days_, form: S.variant || S.stage, mistakes: S.mistakes, sick: S.stats.sick, needAlerts: calls, checks, games, discipline: S.discipline };
}

const awake = d => d.getHours() >= 8 && d.getHours() <= 22;
const players = {
  'every 30 min (awake hours)': d => awake(d) && d.getMinutes() % 30 === 0,
  'every 2 hours': d => awake(d) && d.getHours() % 2 === 0 && d.getMinutes() === 0,
  '3 times a day + bedtime': d => [8, 13, 19, 22].includes(d.getHours()) && d.getMinutes() === 0,
  'morning + evening': d => [8, 20].includes(d.getHours()) && d.getMinutes() === 0,
  'never': () => false,
};
const rows = [];
for (const p of ['classic', 'chill']) for (const [name, fn] of Object.entries(players)) {
  const runs = Array.from({ length: 8 }, () => life(p, fn));
  const pick = k => runs.map(r => r[k]);
  const avg = k => (pick(k).reduce((a, b) => a + +b, 0) / runs.length).toFixed(1);
  const forms = pick('form').reduce((m, f) => (m[f] = (m[f] || 0) + 1, m), {});
  const ends = pick('ended').reduce((m, f) => (m[f] = (m[f] || 0) + 1, m), {});
  rows.push({ pace: p, player: name, 'life days': avg('days'), ends: JSON.stringify(ends), forms: JSON.stringify(forms), mistakes: avg('mistakes'), discipline: avg('discipline'), 'sick times': avg('sick'), 'alerts/day': (avg('needAlerts') / Math.max(1, avg('days'))).toFixed(1) });
}
console.table(rows);
