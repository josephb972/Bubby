// Draws Bubby's garden on the 100×75 pixel screen (ported from the original game).
import { SW, SH, GROUND, E, R, P, petSprite, headTop, art, restingMood } from '../art/sprites.js';
import { pace, RACES, RARE_RACE } from '../core/rules.js';

function sparkles(sx, cx, cy, t, r = 16) {
  for (let i = 0; i < 6; i++) {
    const a = t * 3 + i * Math.PI / 3, px = Math.round(cx + Math.cos(a) * r), py = Math.round(cy + Math.sin(a) * r * .7);
    sx.fillStyle = i % 2 ? '#ffffff' : '#ffe14a';
    sx.fillRect(px, py, 1, 1); sx.fillRect(px - 1, py, 3, 1); sx.fillRect(px, py - 1, 1, 3);
  }
}

/* ---- The rare-race moment: dim garden, spinning rays and glow (behind Bubby), then a shockwave and falling stars (in front) ---- */
function evolveBack(sx, px, time, A) {
  const cy = GROUND - 24, t = A.t, fade = Math.min(1, t / .5) * Math.min(1, (A.dur - t) / .9);
  R(sx, 0, 0, SW, SH, `rgba(30,12,80,${(fade * .55).toFixed(2)})`);
  sx.globalAlpha = fade;
  for (let i = 0; i < 12; i++) {
    const ang = time * .9 + i * Math.PI / 6;
    for (let r = 12; r < 56; r += 4) {
      if (((r >> 2) + i) % 2) continue;
      P(sx, [Math.round(px + Math.cos(ang) * r), Math.round(cy + Math.sin(ang) * r * .75)], i % 2 ? '#fff3b0' : '#d7c6ff');
    }
  }
  sx.globalAlpha = .1 * fade;
  for (let r = 26; r >= 10; r -= 4) E(sx, px, cy, r, r * .85, '#ffe9a8');
  sx.globalAlpha = 1;
}
function evolveFront(sx, px, time, A, S) {
  const cy = GROUND - 24, t = A.t;
  if (A.rare) {
    if (t > 1.3 && t < 2.6) {
      const rr = (t - 1.3) * 38;
      for (let a = 0; a < Math.PI * 2; a += .1) P(sx, [Math.round(px + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr * .75)], '#ffe066');
    }
    for (let i = 0; i < 16; i++) {
      const bx = (i * 37 + 11) % SW, by = Math.round(((time * 14 + i * 23) % (SH + 10)) - 5);
      P(sx, [bx, by, bx - 1, by, bx + 1, by, bx, by - 1, bx, by + 1], i % 3 ? '#fff3b0' : '#ffffff');
    }
    sparkles(sx, px, cy, time, 20 + Math.sin(time * 6) * 2);
    if (t < .25) R(sx, 0, 0, SW, SH, 'rgba(255,255,255,.85)');
    return;
  }
  sparkles(sx, px, cy, time, 18 + Math.sin(time * 6) * 2);
  if (t < .2) R(sx, 0, 0, SW, SH, 'rgba(255,255,255,.8)');
  // A short ring in the race's colour when a Bulb grows into a Bud
  const race = RACES[A.race || S.race];
  if (A.to === 'child' && race && t > .4 && t < 1.6) {
    const rr = (t - .4) * 30;
    for (let a = 0; a < Math.PI * 2; a += .14) P(sx, [Math.round(px + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr * .75)], race.tint);
  }
}
// Starlings keep a gold twinkle for life
function twinkle(sx, px, cy, time) {
  for (let i = 0; i < 5; i++) {
    if (((time * 1.6 + i * .7) | 0) % 3 !== 0) continue;
    const a = i * 2.4 + 1, bx = Math.round(px + Math.cos(a) * 17), by = Math.round(cy + Math.sin(a) * 15);
    P(sx, [bx, by, bx - 1, by, bx + 1, by, bx, by - 1, bx, by + 1], '#ffe066');
  }
}

function moodNow(S, A, G) {
  let mood = restingMood(S), mouth;
  if (mood === 'happy') mood = 'normal';
  if (S.asleep) return { mood: 'sleep' };
  if (A && A.type === 'eat') mouth = (A.t * 5 | 0) % 2 ? 'open' : 'small';
  else if (A && A.type === 'no') { mood = 'angry'; mouth = 'flat'; }
  else if (A && A.type === 'scold') mood = 'sad';
  else if (A && (A.type === 'happy' || A.type === 'evolve')) mood = 'happy';
  else if (G && G.type === 'catch') mood = G.stun > 0 ? 'angry' : (G.joy > 0 || (G.phase === 'done' && G.score >= 10)) ? 'happy' : (G.phase === 'done' ? 'sad' : 'normal');
  else if (G && G.phase !== 'guess') mood = G.last || (G.phase === 'done' && G.score >= 3) ? 'happy' : 'sad';
  return { mood, mouth };
}

export function catchY(S) { return GROUND - 46 + headTop(S.stage, S.race) + 3; }

export function drawScene(sx, S, A, G, PET, time) {
  const { BG, POOP, ICONS, BANG, SKULL, PUFF, BUBBLE, ZED, SEEDI, GOLDSEED, PEBBLE, STARS, SLOTS } = art();
  const blit = (img, x, y) => sx.drawImage(img, Math.round(x), Math.round(y));
  sx.clearRect(0, 0, SW, SH);
  sx.drawImage(BG, 0, 0);

  if (S.ended) {
    blit(petSprite('seed', {}), 50 - 24, GROUND - 44);
    sparkles(sx, 50, GROUND - 16, time, 14);
    return;
  }

  // Poop, washed away progressively by the cleaning wave
  const wave = A && A.type === 'clean' ? SW + 14 - (A.t / A.dur) * (SW + 34) : null;
  const poopCount = A && A.type === 'clean' ? A.poops : S.poops.length;
  for (let i = 0; i < poopCount; i++) {
    const [px, py] = SLOTS[i % 4];
    if (wave !== null && px - 6 > wave) continue;
    blit(POOP, px - 6, py - 10);
  }

  // Bubby
  let stage = S.stage;
  if (A && A.type === 'evolve' && A.t < 1.3 && ((A.t * 8) | 0) % 2 === 0 && A.from) stage = A.from;
  const px = stage === 'seed' ? 50 : (G ? (G.type === 'catch' ? G.px : 50) : PET.x);
  let o = {}, bob = 0, shake = 0;
  if (stage === 'seed') {
    const prog = S.stage === 'seed' ? S.stageT / pace(S).dur.seed : 1;
    if (prog > .45) o.wobble = (((time * (prog > .8 ? 10 : 4)) | 0) % 2) ? 1 : -1;
    o.crack = prog > .65;
  } else {
    const mn = moodNow(S, A, G);
    o = { mood: mn.mood, mouth: mn.mouth, variant: S.variant, chubby: S.chubby, sick: S.sick && !S.asleep ? (S.disease || true) : false, blink: !S.asleep && (time % 3.4) < .13, race: S.race, fl: (S.race === 'emberling' || S.race === 'starling') ? ((time * 3) | 0) % 2 : 0 };
    o.look = G ? (G.type === 'catch' ? (G.moving ? G.dir : 0) : (G.phase === 'reveal' ? G.look * 2 : 0)) : (PET.moving ? PET.dir : 0);
    if (S.asleep) bob = ((time * 1.1) | 0) % 2;
    else if (A && A.type === 'happy') bob = -(((time * 8) | 0) % 2) * 2;
    else if (S.call && S.call.reason === 'tantrum') bob = -(((time * 7) | 0) % 2);
    else if (PET.moving || (G && G.moving)) bob = -(((time * 6) | 0) % 2);
    else bob = -(((time * 1.6) | 0) % 2);
    if (A && A.type === 'no') shake = (((A.t * 12) | 0) % 2) ? 1 : -1;
  }
  if (A && A.type === 'evolve' && A.rare) evolveBack(sx, px, time, A);
  const spr = petSprite(stage, o);
  if (stage !== 'seed') E(sx, px, GROUND + 1.5, 9, 1.6, 'rgba(64,120,52,.45)');
  blit(spr, px - 24 + shake, GROUND - 46 + bob);
  if (S.race === RARE_RACE && stage !== 'seed' && !(A && A.type === 'evolve' && A.rare)) twinkle(sx, px, GROUND - 24, time);
  const top = GROUND - 46 + headTop(stage, S.race) + bob;

  // Action effects
  if (A) {
    const k = A.t / A.dur;
    if (A.type === 'eat') {
      const bites = Math.min(3, (A.t / .5) | 0), img = ICONS[A.food], w = 16 - bites * 5;
      if (w > 0) sx.drawImage(img, 0, 0, w, 16, Math.round(px + 11), GROUND - 15, w, 16);
    }
    if (A.type === 'clean' && wave !== null) {
      R(sx, Math.round(wave), 0, 12, SH, '#7fc6f0'); R(sx, Math.round(wave), 0, 3, SH, '#d6f0ff');
      for (let i = 0; i < 6; i++) P(sx, [Math.round(wave) + 4 + (i * 3) % 7, (i * 13 + (time * 40 | 0)) % SH], '#ffffff');
    }
    if (A.type === 'med') blit(ICONS.med, px + 9, top - 6 - Math.round(Math.sin(k * Math.PI) * 4));
    if (A.type === 'scold' && ((A.t * 6) | 0) % 2 === 0) blit(BANG, px + 10, top - 4);
    if (A.type === 'evolve') evolveFront(sx, px, time, A, S);
    if (A.type === 'sparkle' || A.type === 'happy') sparkles(sx, px, GROUND - 20, time, 15);
  }

  // Seed-catch items fall in front of Bubby
  if (G && G.type === 'catch') {
    for (const it of G.items) {
      const img = it.kind === 'gold' ? GOLDSEED : it.kind === 'pebble' ? PEBBLE : SEEDI;
      if (!it.fx) blit(img, it.x - img.width / 2, it.y - img.height / 2);
      else if (it.hit && it.kind !== 'pebble') sparkles(sx, it.x, it.y, time + it.fx * 6, 3 + it.fx * 10);
      else if (it.hit) { if (((it.fx * 10) | 0) % 2 === 0) blit(BANG, px + 10, top - 4); }
      else P(sx, [Math.round(it.x) - 2, GROUND - 1, Math.round(it.x) + 2, GROUND - 1, Math.round(it.x), GROUND - 2], '#e9f6dd');
    }
  }

  // Night
  if (!S.lights) {
    R(sx, 0, 0, SW, SH, 'rgba(18,20,48,.8)');
    for (let i = 0; i < STARS.length; i++) { if (((time * 1.3 + i * .7) | 0) % 3 !== 0) P(sx, STARS[i], '#fff6c8'); }
  }

  // Status bubbles
  if (stage !== 'seed') {
    if (S.asleep) {
      const f = time * .9 % 1;
      sx.globalAlpha = 1 - f * .7; blit(ZED, px + 9 + f * 4, top - 2 - f * 8);
      sx.globalAlpha = 1 - ((f + .5) % 1) * .7; blit(ZED, px + 9 + ((f + .5) % 1) * 4, top - 2 - ((f + .5) % 1) * 8);
      sx.globalAlpha = 1;
    }
    if (S.sick && !(A && A.type === 'med')) blit(SKULL, px + 9, top - 4 + (((time * 2) | 0) % 2));
    if (S.call && S.call.reason === 'tantrum' && !S.asleep) { if (((time * 3) | 0) % 2) blit(PUFF, px + 11, top + 1); }
    else if (S.call && !S.asleep && !G && ((time * 2.5) | 0) % 2 && !S.sick) blit(BUBBLE, px - 18, top - 2);
  }
}
