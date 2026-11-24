// Draws the toolbar icon: Bubby's current face, so you can see its mood at a glance.
import { mk, petSprite, FACE, PAD, restingMood } from './sprites.js';
import { outfitFor } from '../core/shop.js';

// Crop Bubby pixel-for-pixel (no scaling keeps the face crisp):
// 16px (normal screens) is a close-up of the face, 32px (high-DPI) shows the whole body.
const BODY = { seed: [24, 32], baby: [24, 32], child: [24, 29], adult: [24, 28], senior: [24, 28] };
export function iconCanvas(stage, o, size) {
  const [cx, cy] = size <= 16 ? (FACE[stage] || FACE.baby) : (BODY[stage] || BODY.baby);
  let spr = petSprite(stage, o);
  // A hat or scarf that the crop would cut in half is left out of the icon (eyewear and shirts always fit).
  if (o.outfit && spr.fit) {
    const top = Math.round(cy - size / 2) + PAD, bottom = top + size - 1, f = { ...o.outfit };
    for (const k of ['head', 'neck']) { const it = f[k] && spr.fit.items[f[k]]; if (it && (it.top - 1 < top || it.bottom + 1 > bottom)) f[k] = null; }
    if (f.head !== o.outfit.head || f.neck !== o.outfit.neck) spr = petSprite(stage, { ...o, outfit: f });
  }
  const c = mk(size, size), x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.drawImage(spr, Math.round(cx - size / 2), Math.round(cy - size / 2) + PAD, size, size, 0, 0, size, size);
  return c;
}

export function iconOptions(S, M) {
  if (!S || S.ended || S.stage === 'seed') return { stage: 'seed', o: { crack: S && S.stage === 'seed' && S.stageT > 30 } };
  return { stage: S.stage, o: { mood: restingMood(S), variant: S.variant, chubby: S.chubby, sick: S.sick && !S.asleep, outfit: M ? outfitFor(M, S.stage) : undefined } };
}

export function actionImageData(S, M) {
  const { stage, o } = iconOptions(S, M);
  const out = {};
  for (const size of [16, 32]) {
    const c = iconCanvas(stage, o, size);
    out[size] = c.getContext('2d').getImageData(0, 0, size, size);
  }
  return out;
}
