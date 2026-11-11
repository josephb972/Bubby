// "raising a virtual pet at 10,000x speed": Bubby's whole life, seed to seed, in 30 seconds.
export default ({ S, anim, grow, cue, stop, catchGame }) => {
  Object.assign(S, { stageT: 6, hunger: 3, happy: 3 });
  return {
    duration: 30,
    // [time in seconds, caption (null keeps the current one), what happens]
    beats: [
      [0.0, 'raising a virtual pet at 10,000x speed'],
      [2.2, 'it’s a baby!! \u{1F97A}', () => { grow('baby'); S.hunger = 3; S.happy = 3; }],
      [4.0, '4 seconds old. already pooping', () => { S.poops.push({ t: 0 }); cue('poop'); }],
      [4.7, null, () => { S.poops.push({ t: 0 }); cue('poop'); }],
      [5.5, 'it’s fine. it’s fine.', () => { anim('clean', 1.2, { poops: S.poops.length }); S.poops = []; cue('clean'); }],
      [7.0, 'full hearts. still screaming.', () => { S.hunger = 4; S.happy = 4; S.call = { reason: 'tantrum', t: 0 }; cue('call'); }],
      [8.5, 'DISCIPLINE.', () => { S.call = null; S.discipline = 25; anim('scold', 1.1); cue('scold'); }],
      [9.7, 'ok one snack as an apology', () => { anim('eat', .75, { food: 'snack' }); cue('eat'); }],
      [10.5, 'two snacks', () => { anim('eat', .75, { food: 'snack' }); cue('eat'); }],
      [11.3, 'three snacks??', () => { anim('eat', .75, { food: 'snack' }); cue('eat'); }],
      [12.1, 'toothache. obviously.', () => { S.sick = true; S.hunger = 3; S.happy = 2; cue('sick'); }],
      [13.4, 'medicine time \u{1F48A}', () => { anim('med', 1); cue('med'); }],
      [14.4, null, () => { anim('med', .9); S.sick = false; cue('med'); }],
      [15.3, 'cured. no lessons learned', () => { anim('happy', .8); S.happy = 3; cue('yay'); }],
      [16.1, '8 hours of sleep in 2 seconds', () => { S.lights = false; S.asleep = true; cue('off'); }],
      [18.2, null, () => { S.lights = true; S.asleep = false; S.hunger = 2; cue('on'); }],
      [18.6, 'woke up a whole different size', () => grow('child')],
      [20.4, 'minigame time \u{1F3AE}', () => catchGame([[.15, 34, 'seed'], [.75, 64, 'seed'], [1.25, 44, 'gold'], [1.85, 58, 'pebble'], [2.35, 22, 'seed'], [2.7, 80, 'seed']])],
      [23.15, 'caught a pebble with its face'],
      [24.3, 'and after all that love it grew up to be…', () => { stop(); S.variant = 'thistle'; grow('adult'); }],
      [25.6, 'a thistle.'],
      [26.6, 'elder era. hips don’t lie anymore', () => grow('senior')],
      [28.2, 'it left a seed. here we go again \u{1F331}', () => { S.ended = { kind: 'garden' }; stop(); cue('end'); }],
    ],
    // On-screen clock: [video time, game hours], linear in between.
    clock: [[0, 8], [16.1, 21.9], [18.2, 31], [24.3, 3 * 24 + 9], [26.6, 5 * 24 + 15], [28.2, 7 * 24 + 18], [30, 7 * 24 + 18]],
    music: t => (t > 16.1 && t < 18.2 ? .35 : 1),
  };
};
