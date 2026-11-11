// "it's a pixel. it can wait": ignore Bubby for a week and it packs up and moves away (the game's neglect ending).
export default ({ S, PET, anim, cue, stop, walk, card }) => {
  Object.assign(S, { stage: 'baby', stageT: 30, hunger: 4, happy: 4 });
  const day1 = 'day 1: I’m going to be the BEST pet parent';
  return {
    duration: 30,
    // [time in seconds, caption (null keeps the current one), what happens]
    beats: [
      [0.0, day1, () => { anim('happy', 1.4); cue('yay'); }],
      [2.6, 'day 2: kinda busy. it’s fine', () => { S.hunger = 2; S.happy = 2; S.poops.push({ t: 0 }); cue('poop'); }],
      [4.4, 'it’s a pixel. it can wait', () => { S.hunger = 1; S.poops.push({ t: 0 }); cue('poop'); }],
      [5.0, null, () => { S.happy = 1; S.poops.push({ t: 0 }); cue('poop'); }],
      [6.0, '*1 missed notification*', () => { S.hunger = 0; S.call = { reason: 'hungry', t: 0 }; cue('call'); }],
      [7.4, '*14 missed notifications*', () => cue('call')],
      [8.6, '*99+ missed notifications*', () => { S.happy = 0; cue('call'); }],
      [9.8, 'it got sick. from the poop. understandable', () => { S.sick = true; S.poops.push({ t: 0 }); cue('sick'); }],
      [12.0, 'fell asleep with the lights on. alone.', () => { S.asleep = true; S.call = { reason: 'sleep', t: 0 }; cue('call'); }],
      [14.0, 'day 6: it’s just… staring at me', () => { S.asleep = false; S.call = { reason: 'hungry', t: 0 }; PET.x = 50; }],
      [16.2, 'wait. where are you going', () => walk(24, 14)],
      [18.3, 'it looked back…', () => walk(27, 5)],
      [19.4, 'nope.', () => walk(-26, 18)],
      [22.6, 'it took nothing. it left the poop.'],
      [24.0, 'it left me a seed. like a breakup letter', () => {
        S.ended = { kind: 'away' }; S.call = null; stop(); cue('sad');
        card('Bubby packed up and moved away', 'After 6 days as a Bulb, Bubby went looking for a better garden. It left a seed behind. Care mistakes: 99+.');
      }],
      [26.6, '“it’s not you. it’s your garden.”'],
      [28.4, day1 + ' (again)', () => { card(null); cue('up'); }],
    ],
    // On-screen clock: [video time, game hours], linear in between.
    clock: [[0, 9], [2.6, 24 + 14], [6, 2 * 24 + 12], [9.8, 3 * 24 + 20], [12, 4 * 24 + 23], [14, 5 * 24 + 10], [24, 5 * 24 + 12],
      [28.39, 5 * 24 + 12.2], [28.4, 8], [30, 8.3]],
    // Count the missed notifications, which is the joke; before that, the speed badge.
    badge: t => t < 6 || t >= 28.4 ? '▶▶ x10000' : `MISSED: ${t < 7.4 ? 1 : t < 8.6 ? 14 : '99+'}`,
    // The music cuts out when Bubby starts staring, so you hear every footstep. It comes back for "day 1 (again)".
    music: t => (t >= 14 && t < 28.4 ? 0 : 1),
  };
};
