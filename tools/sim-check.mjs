// Plays whole Bubby lives in fast-forward to check the real-time pacing.
// Since 1.1 the player also collects the daily points and buys the right medicine when Bubby is ill, like a sensible
// real player, so survival here should match version 1.0.0 (every player who checks in reaches a full life).
// Usage: node tools/sim-check.mjs
import * as R from '../extension/core/rules.js';

const MIN = 60 * 1000;
// Treat an illness the way a sensible player would: tea for a cough, otherwise buy the matching medicine
// (or the Cure-All when that is cheaper), and soothe with tea while saving up.
function treat(S, t, tally) {
  for (let i = 0; i < 8 && S.sick; i++) {
    const d = R.DISEASES[S.disease];
    if (R.bestMed(S) === 'tea' && S.disease !== 'sporecough') {
      const n = Math.ceil(S.doses - 1e-6), med = R.ITEMS[d.med];
      const useElixir = med.price * n > R.ITEMS.elixir.price;
      const id = useElixir ? 'elixir' : d.med, count = useElixir ? 1 : n;
      let bought = 0;
      for (let k = 0; k < count; k++) if (R.buy(S, id, t).ok) bought++;
      tally.bought += bought;
      if (!bought && !(S.inv[id] > 0)) { R.doAction(S, 'med', t); break; }   // can't afford it yet: soothe with tea
    }
    R.doAction(S, 'med', t);
  }
}
function life(paceId, player, { days = 20, seed } = {}) {
  const start = new Date('2026-11-02T09:00:00').getTime();
  const S = R.fresh(1, { pace: paceId }, start);
  let t = start, n = 0, calls = 0, lastKey = null, checks = 0, games = 0;
  const tally = { bought: 0 };
  const end = start + days * 24 * 60 * MIN;
  while (t < end && !S.ended) {
    t = start + (++n) * 5 * MIN;
    R.advance(S, t);
    const key = R.needKey(S);
    if (key && key !== lastKey) calls++;
    lastKey = key;
    if (player(new Date(t), t)) {
      checks++;
      R.checkIn(S, t);   // opening Bubby pays the daily points
      // A sensible player: fix whatever the smart button says, play when happy is low.
      for (let i = 0; i < 6; i++) {
        const need = R.topNeed(S);
        if (!need.act || need.tone === 'ok') break;
        if (need.act === 'med') { treat(S, t, tally); continue; }
        if (need.act === 'play') { R.finishGame(S, 1, { kind: 'guess', score: 4 }, t); games++; continue; }
        if (['replant', 'resume'].includes(need.act)) break;
        R.doAction(S, need.act, t);
      }
      if (S.hunger < 3 && !S.asleep && S.stage !== 'seed' && S.lights) R.doAction(S, 'meal', t);
      if (S.happy < 3 && !S.asleep && S.stage !== 'seed' && S.lights && !S.sick) { R.finishGame(S, 1, { kind: 'guess', score: 4 }, t); games++; }
      // Spend ~40 seconds with the popup open: tantrums only happen while you watch.
      for (let i = 0; i < 40; i++) {
        R.advance(S, t + i * 1000, { game: false, busy: false });
        if (S.call && S.call.reason === 'tantrum') R.doAction(S, 'scold', t + i * 1000);
      }
    }
  }
  const days_ = ((S.ended ? S.ended.age : S.age) / 86400).toFixed(1);
  const lived = Math.max(1, +days_);
  return { pace: paceId, ended: S.ended ? S.ended.kind : 'alive', days: days_, form: S.variant || S.stage, mistakes: S.mistakes, sick: S.stats.sick, needAlerts: calls, checks, games, discipline: S.discipline, pts: S.tot.earned || 0, ptsPerDay: (S.tot.earned || 0) / lived, bought: tally.bought, left: S.points };
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
  rows.push({ pace: p, player: name, 'life days': avg('days'), ends: JSON.stringify(ends), forms: JSON.stringify(forms), mistakes: avg('mistakes'), discipline: avg('discipline'), 'sick times': avg('sick'), 'alerts/day': (avg('needAlerts') / Math.max(1, avg('days'))).toFixed(1), 'pts/day': avg('ptsPerDay'), 'meds bought': avg('bought'), 'pts left': avg('left') });
}
console.table(rows);
