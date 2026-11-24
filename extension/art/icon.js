// Draws the toolbar icon: Bubby's current face, so you can see its mood at a glance.
import { mk, petSprite, wornSprite, PAD, faceCenter, hasShape, bodyCropY, restingMood } from './sprites.js';
import { outfitFor } from '../core/shop.js';

// Crop Bubby pixel-for-pixel (no scaling keeps the face crisp):
// 16px (normal screens) is a close-up of the face, 32px (high-DPI) shows the whole body.
const BODY = { seed: [24, 32], baby: [24, 32], child: [24, 29], adult: [24, 28], senior: [24, 28] };
export function iconCanvas(stage, o, size) {
  const race = o && o.race, shaped = hasShape(race) && (stage === 'child' || stage === 'adult' || stage === 'senior');
  const [cx, cy] = size <= 16 ? (faceCenter(stage, race) || faceCenter('baby')) : (shaped ? [24, bodyCropY(stage, race)] : (BODY[stage] || BODY.baby));
  // Dressed (1.3.0). A hat or scarf the crop would cut in half is left out; glasses and shirts always fit.
  let spr = o.outfit ? wornSprite(stage, o) : petSprite(stage, o), dy = o.outfit ? PAD : 0;
  if (o.outfit && spr.fit) {
    const top = Math.round(cy - size / 2) + PAD, bottom = top + size - 1, f = { ...o.outfit };
    for (const k of ['head', 'neck']) { const it = f[k] && spr.fit.items[f[k]]; if (it && (it.top - 1 < top || it.bottom + 1 > bottom)) f[k] = null; }
    if (f.head !== o.outfit.head || f.neck !== o.outfit.neck) spr = wornSprite(stage, { ...o, outfit: f });
  }
  const c = mk(size, size), x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.drawImage(spr, Math.round(cx - size / 2), Math.round(cy - size / 2) + dy, size, size, 0, 0, size, size);
  return c;
}

export function iconOptions(S) {
  if (!S || S.ended || S.stage === 'seed') return { stage: 'seed', o: { crack: S && S.stage === 'seed' && S.stageT > 30, race: S && !S.ended ? S.seedRace : null } };
  return { stage: S.stage, o: { mood: restingMood(S), variant: S.variant, chubby: S.chubby, sick: S.sick && !S.asleep ? (S.disease || true) : false, race: S.stage === 'baby' ? S.seedRace : S.race,
    outfit: S.wardrobe ? outfitFor(S.wardrobe, S.stage) : undefined } };
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
