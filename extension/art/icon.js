// Draws the toolbar icon: Bubby's current face, so you can see its mood at a glance.
import { mk, petSprite, FACE, restingMood } from './sprites.js';

// Crop Bubby pixel-for-pixel (no scaling keeps the face crisp):
// 16px (normal screens) is a close-up of the face, 32px (high-DPI) shows the whole body.
const BODY = { seed: [24, 32], baby: [24, 32], child: [24, 29], adult: [24, 28], senior: [24, 28] };
export function iconCanvas(stage, o, size) {
  const spr = petSprite(stage, o);
  const [cx, cy] = size <= 16 ? (FACE[stage] || FACE.baby) : (BODY[stage] || BODY.baby);
  const c = mk(size, size), x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.drawImage(spr, Math.round(cx - size / 2), Math.round(cy - size / 2), size, size, 0, 0, size, size);
  return c;
}

export function iconOptions(S) {
  if (!S || S.ended || S.stage === 'seed') return { stage: 'seed', o: { crack: S && S.stage === 'seed' && S.stageT > 30 } };
  return { stage: S.stage, o: { mood: restingMood(S), variant: S.variant, chubby: S.chubby, sick: S.sick && !S.asleep } };
}

export function actionImageData(S) {
  const { stage, o } = iconOptions(S);
  const out = {};
  for (const size of [16, 32]) {
    const c = iconCanvas(stage, o, size);
    out[size] = c.getContext('2d').getImageData(0, 0, size, size);
  }
  return out;
}
