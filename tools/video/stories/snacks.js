// "I show love the only way I know how": the toy pod, a Daisy Blossom, and far too many snacks.
// Every snack is the game's real one (+2g, +1 happy); past 32g the status screen calls it "heavy" and the real
// chubby sprite kicks in. The video then exaggerates: Bubby is drawn wider as it gains (see fat below).
export default ({ S, PET, anim, cue, stop, walk, catchGame, press, pop }) => {
  Object.assign(S, { stage: 'adult', variant: 'daisy', stageT: 60, weight: 24, hunger: 4, happy: 3, discipline: 50 });
  PET.x = 46; PET.tx = 46; PET.wait = 1.5;
  const snack = (fast = false) => {
    anim('eat', fast ? .26 : .8, { food: 'snack' });
    S.weight += 2; S.happy = Math.min(4, S.happy + 1); S.chubby = S.weight > 32;
    press('feed'); pop('+2g'); cue(fast ? 'nom' : 'eat');
  };
  const rapid = Array.from({ length: 12 }, (_, i) => [20.8 + i * .28, i === 4 ? 'and another' : i === 8 ? 'AND ANOTHER' : null, () => snack(i > 0)]);
  return {
    frame: 'pod',
    duration: 29,
    // [time in seconds, caption (null keeps the current one), what happens]
    beats: [
      [0.0, 'POV: I show love the only way I know how'],
      [2.0, 'a little snack \u{1F9C1}', () => snack()],
      [3.1, 'a little snack for my little snack', () => snack()],
      [4.2, 'it looked hungry. it was not hungry', () => snack()],
      [5.3, null, () => snack()],
      [6.0, 'okay I lost count', () => snack()],
      [6.6, null, () => snack()],
      [7.1, null, () => snack()],
      [7.8, 'toothache. who could have seen this coming', () => { S.sick = true; S.doses = 2; cue('sick'); }],
      [9.0, 'medicine \u{1F48A}', () => { anim('med', .9); press('med'); cue('med'); }],
      [10.0, null, () => { anim('med', .6); press('med'); S.sick = false; cue('med'); }],
      [10.7, 'and a snack for being so brave', () => snack()],
      [12.0, 'walking is cardio now', () => { PET.speed = 2.2; PET.wait = 0; PET.tx = 62; }],
      [14.0, 'it needed a break after 4 pixels', () => walk(PET.x)],
      [15.2, 'exercise time \u{1F3C3}', () => {
        press('play'); cue('on');
        catchGame([[.1, 18, 'seed'], [.45, 86, 'seed'], [.75, 26, 'gold'], [1.0, PET.x + 2, 'seed'], [1.4, 80, 'seed'], [1.9, 14, 'seed'], [2.3, 88, 'gold']], { speed: 1.5, reach: 14 });
      }],
      [17.6, 'caught 1 seed. by standing there. being wide.'],
      [19.4, 'LOST 1 GRAM \u{1F389}', () => { stop(); walk(46); S.weight -= 1; pop('-1g'); anim('happy', 1.2); cue('yay'); }],
      [20.8, 'we celebrated with a snack'],
      ...rapid,
      [24.4, 'wait.', () => cue('bonk')],
      [25.0, 'it doesn’t fit in the toy anymore', () => cue('sad')],
      [27.0, '10/10 parenting. no notes.'],
    ],
    // Pod view at the start and the end, close-up of the screen in between.
    camera: t => t < .8 ? 0 : t < 2 ? (t - .8) / 1.2 : t < 25 ? 1 : t < 26.3 ? 1 - (t - 25) / 1.3 : 0,
    // How much wider Bubby is drawn: a little per snack at first, then a lot.
    fat: S => { const d = Math.max(0, S.weight - 24); return 1 + d * .03 + d * d * .001; },
    meter: S => ({ text: `WEIGHT ${S.weight}g ${S.weight > 32 ? '(heavy)' : '(healthy)'}`, hot: S.weight > 32 }),
    music: t => (t >= 24.4 ? 0 : 1),
  };
};
