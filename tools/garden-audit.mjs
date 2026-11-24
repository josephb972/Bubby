// Garden decor audit: every decor item stays in its slot, never touches the poop spots or the middle of Bubby's walk,
// poop and falling seeds stay readable on every lawn, and the default garden is pixel-identical to the original.
// Usage: node tools/garden-audit.mjs   → dist/audit/garden.png
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { openPage, repo } from './lib/page.mjs';

const out = join(repo, 'dist', 'audit');
await mkdir(out, { recursive: true });
const { page, errors, close } = await openPage();
const res = await page.evaluate(async () => {
  const D = await import('/art/decor.js'), { art } = await import('/art/sprites.js'), { deltaE } = await import('/art/wardrobe.js');
  const { drawScene } = await import('/popup/scene.js'), Rules = await import('/core/rules.js'), { CATALOG, FREE_HOME } = await import('/core/shop.js');
  const fails = [], notes = [];
  const canvas = () => { const c = document.createElement('canvas'); c.width = 100; c.height = 75; return c; };
  const data = c => c.getContext('2d').getImageData(0, 0, 100, 75).data;

  // 1. Default garden == the original background
  const a = canvas(); D.drawBack(a.getContext('2d'), { ground: 'meadow', centre: 'pot' });
  const b = canvas(); b.getContext('2d').drawImage(art().BG, 0, 0);
  const da = data(a), db = data(b);
  let diff = 0; for (let i = 0; i < da.length; i++) if (da[i] !== db[i]) diff++;
  if (diff) fails.push(`default garden differs from the original background (${diff} values)`);

  // 2. Each item stays in its zone and out of the reserved areas
  const inRect = (x, y, [x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  for (const it of CATALOG.filter(i => i.kind === 'home' && !['ground', 'ambient'].includes(i.slot))) {
    const base = canvas(), withIt = canvas();
    D.drawBack(base.getContext('2d'), { ground: 'meadow', centre: it.slot === 'centre' ? null : 'pot' });
    D.drawBack(withIt.getContext('2d'), { ground: 'meadow', centre: it.slot === 'centre' ? it.id : 'pot', [it.slot]: it.id });
    const p = data(base), q = data(withIt);
    let px = 0, outZone = 0, reserved = 0;
    const zone = D.ZONES[it.slot];
    for (let i = 0; i < p.length; i += 4) {
      if (p[i] === q[i] && p[i + 1] === q[i + 1] && p[i + 2] === q[i + 2]) continue;
      const x = (i / 4) % 100, y = (i / 4 / 100) | 0;
      px++;
      if (!inRect(x, y, zone)) outZone++;
      if (D.RESERVED.some(r => inRect(x, y, r))) reserved++;
    }
    if (px < 10) fails.push(`${it.id}: barely visible (${px} px)`);
    if (outZone) fails.push(`${it.id}: ${outZone} px outside its ${it.slot} zone`);
    if (reserved) fails.push(`${it.id}: ${reserved} px on a poop spot or Bubby's walk`);
  }
  // Ambient effects are light: a handful of pixels per frame, over many frames
  for (const id of ['butterflies', 'petals']) {
    let worst = 0;
    for (let t = 0; t < 60; t += .7) {
      const base = canvas(), withIt = canvas();
      D.drawBack(base.getContext('2d'), {}); D.drawBack(withIt.getContext('2d'), {}); D.drawAmbient(withIt.getContext('2d'), { ambient: id }, t);
      const p = data(base), q = data(withIt); let n = 0;
      for (let i = 0; i < p.length; i += 4) if (p[i] !== q[i] || p[i + 1] !== q[i + 1] || p[i + 2] !== q[i + 2]) n++;
      worst = Math.max(worst, n);
    }
    if (worst > 50) fails.push(`${id}: too busy (${worst} px in one frame)`);
    notes.push(`${id}: at most ${worst} px per frame`);
  }

  // 3. Poop and seeds readable on every lawn (they also have an ink outline)
  const things = { poop: '#ff8fc0', 'poop shade': '#e9679f', seed: '#a8693a', 'gold seed': '#ffc93c', pebble: '#8e959e' };
  for (const [g, st] of Object.entries(D.GROUNDS)) for (const [k, col] of Object.entries(things)) {
    const d = deltaE(col, st.base);
    if (d < 20) fails.push(`${g} lawn: ${k} ${col} too close to the grass ${st.base} (ΔE ${d.toFixed(1)})`);
  }

  // 4. Contact sheet: every item in a real scene, with four poops, Bubby at both ends of its walk, and at night
  const S0 = Rules.fresh(1, { pace: 'chill' }, Date.now());
  Object.assign(S0, { stage: 'child', race: 'leafling', seedRace: 'leafling', poops: [{ t: 0 }, { t: 0 }, { t: 0 }, { t: 0 }], lights: true });
  const ALL = ['S', 'M', 'L', 'XL'];
  const scene = (home, petX, night, G = null) => {
    const c = canvas(), S = { ...S0, lights: !night, asleep: night,
      wardrobe: { owned: { beanie: ALL, tee: ALL }, equip: { head: 'beanie', face: null, neck: null, body: 'tee' }, home: { ...FREE_HOME, ...home }, news: {} } };
    drawScene(c.getContext('2d'), S, null, G, { x: petX, moving: false, dir: 1 }, 1.2);
    return c;
  };
  const rows = [
    ...Object.keys(D.GROUNDS).map(g => ({ label: g, home: { ground: g } })),
    ...CATALOG.filter(i => i.kind === 'home' && i.slot !== 'ground' && i.price).map(i => ({ label: i.id, home: { [i.slot]: i.id } })),
    { label: 'everything', home: { ground: 'clover', sky: 'bunting', back: 'tree', centre: 'lantern', floor: 'flowerbed', path: 'stones', ambient: 'fireflies' } },
  ];
  const G = { type: 'catch', px: 40, items: [{ x: 20, y: 30, kind: 'seed' }, { x: 55, y: 22, kind: 'gold' }, { x: 75, y: 40, kind: 'pebble' }, { x: 88, y: 12, kind: 'seed' }], moving: false, dir: 1, stun: 0, joy: 0, phase: 'play' };
  const cols = [['Bubby left', h => scene(h, 16, false)], ['Bubby right', h => scene(h, 60, false)], ['seed catch', h => scene(h, 40, false, G)], ['night', h => scene(h, 40, true)]];
  const Z = 3, sheet = document.createElement('canvas');
  sheet.width = 110 + cols.length * (100 * Z + 8); sheet.height = 20 + rows.length * (75 * Z + 8);
  const x = sheet.getContext('2d'); x.fillStyle = '#f6eedb'; x.fillRect(0, 0, sheet.width, sheet.height); x.imageSmoothingEnabled = false;
  x.fillStyle = '#3b2f4a'; x.font = '12px sans-serif';
  cols.forEach(([t], i) => x.fillText(t, 110 + i * (100 * Z + 8), 14));
  rows.forEach((r, j) => {
    x.fillText(r.label, 6, 20 + j * (75 * Z + 8) + 110);
    cols.forEach(([, f], i) => x.drawImage(f(r.home), 110 + i * (100 * Z + 8), 20 + j * (75 * Z + 8), 100 * Z, 75 * Z));
  });
  return { fails, notes, sheet: sheet.toDataURL() };
});
await close();
await writeFile(join(out, 'garden.png'), Buffer.from(res.sheet.split(',')[1], 'base64'));
const fails = [...errors.map(e => 'page error: ' + e), ...res.fails];
for (const n of res.notes) console.log('      ' + n);
for (const f of fails) console.log('FAIL  ' + f);
console.log(`${fails.length ? 'FAIL' : 'ok  '}  garden decor checked · contact sheet in dist/audit/garden.png`);
process.exit(fails.length ? 1 : 0);
