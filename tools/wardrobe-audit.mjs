// Wardrobe fit audit: renders every garment on every body (Bulb, Bud, the three Blossoms and Elders, chubby or not)
// in every pose, and fails if anything doesn't fit. Also writes contact sheets for a person to review.
// Usage: node tools/wardrobe-audit.mjs   → dist/audit/wardrobe.png, dist/audit/wardrobe-poses.png
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { openPage, repo } from './lib/page.mjs';

const out = join(repo, 'dist', 'audit');
await mkdir(out, { recursive: true });
const { page, errors, close } = await openPage();
const res = await page.evaluate(async () => {
  const { petSprite, PAD } = await import('/art/sprites.js');
  const { GARMENTS, rig, colourway } = await import('/art/wardrobe.js');
  const { deltaE } = await import('/art/pixel.js');
  const MIN_CONTRAST = 25;
  const bodies = [['baby', {}], ['child', {}]];
  for (const st of ['adult', 'senior']) for (const variant of ['radiant', 'daisy', 'thistle']) for (const chubby of [false, true]) bodies.push([st, { variant, chubby }]);
  const poses = [];
  for (const mood of ['normal', 'happy', 'sad', 'angry', 'sick', 'sleep']) for (const look of [-2, -1, 0, 1, 2]) poses.push({ mood, look, sick: mood === 'sick' });
  poses.push({ mood: 'normal', blink: true }, { mood: 'normal', mouth: 'open' });
  const fails = [], name = (st, o) => `${st}${o.variant ? '/' + o.variant : ''}${o.chubby ? '/chubby' : ''}`;
  const px = c => c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let renders = 0;
  for (const [id, g] of Object.entries(GARMENTS)) {
    for (const [st, b] of bodies) {
      const r = rig(st, b.variant, b.chubby), cw = colourway(g, r);
      const under = r.under[g.slot === 'face' ? 'head' : g.slot];
      if (!g.eyewear && deltaE(cw.base, under) < MIN_CONTRAST) fails.push(`${id} on ${name(st, b)}: colour ${cw.base} too close to ${under} (ΔE ${deltaE(cw.base, under).toFixed(1)})`);
      for (const pose of poses) {
        const o = { ...b, ...pose };
        const dressed = petSprite(st, { ...o, outfit: { [g.slot]: id } }); renders++;
        const where = `${id} on ${name(st, b)} (${pose.mood}${pose.look ? ' look ' + pose.look : ''})`;
        if (g.eyewear) {
          // Eyewear: only changes pixels inside the face box, follows the eyes, and is actually visible.
          const bare = petSprite(st, o), a = px(dressed), z = px(bare), [x0, y0, x1, y1] = r.face;
          let changed = 0, outside = 0;
          for (let i = 0; i < a.length; i += 4) {
            if (a[i] === z[i] && a[i + 1] === z[i + 1] && a[i + 2] === z[i + 2] && a[i + 3] === z[i + 3]) continue;
            const X = (i / 4) % 48, Y = ((i / 4) / 48 | 0) - PAD;
            changed++;
            if (X < x0 - 1 || X > x1 + 1 || Y < y0 - 1 || Y > y1 + 1) outside++;
          }
          if (changed < 8) fails.push(`${where}: eyewear barely visible (${changed} px)`);
          if (outside) fails.push(`${where}: eyewear spills ${outside} px outside the face`);
          continue;
        }
        const f = dressed.fit && dressed.fit.items[id];
        if (!f) { fails.push(`${where}: not drawn`); continue; }
        if (f.faceHits) fails.push(`${where}: ${f.faceHits} px over the face`);
        if (f.pixels < 6) fails.push(`${where}: barely visible (${f.pixels} px)`);
        if (f.edge) fails.push(`${where}: touches the sprite edge (no room for the outline)`);
        if (!f.touches) fails.push(`${where}: floats (doesn't touch Bubby)`);
        if (f.orphans) fails.push(`${where}: ${f.orphans} stray pixel(s)`);
      }
    }
  }
  // Contact sheets
  const S = 3, cellW = 48 * S + 12, cellH = (48 + PAD) * S + 26;
  const rows = [...Object.keys(GARMENTS).map(id => ({ label: id, fit: { [GARMENTS[id].slot]: id } })),
    { label: 'outfit A', fit: { head: 'beanie', face: 'shades', neck: 'scarf', body: 'overalls' } },
    { label: 'outfit B', fit: { head: 'crown', face: 'hearts', neck: 'bowtie', body: 'sweater' } },
    { label: 'outfit C', fit: { head: 'wizard', neck: 'bowtie', body: 'tee' } },
    { label: 'outfit D', fit: { head: 'petalbow', face: 'shades', body: 'tee' } }];
  const sheet = (rowsArr, cols, draw) => {
    const c = document.createElement('canvas'); c.width = 90 + cols.length * cellW; c.height = 24 + rowsArr.length * cellH;
    const x = c.getContext('2d'); x.fillStyle = '#f6eedb'; x.fillRect(0, 0, c.width, c.height); x.imageSmoothingEnabled = false;
    x.font = '12px sans-serif'; x.fillStyle = '#3b2f4a';
    cols.forEach((t, i) => x.fillText(t, 90 + i * cellW + 4, 16));
    rowsArr.forEach((row, j) => {
      x.fillStyle = '#3b2f4a'; x.fillText(row.label, 6, 24 + j * cellH + cellH / 2);
      cols.forEach((col, i) => {
        const X = 90 + i * cellW, Y = 24 + j * cellH;
        x.fillStyle = j % 2 ? '#9ad67f' : '#a6dc8d'; x.fillRect(X + 2, Y + 2, cellW - 4, cellH - 6);
        x.drawImage(draw(row, i), X + 6, Y + 4, 48 * S, (48 + PAD) * S);
      });
    });
    return c.toDataURL();
  };
  const main = sheet(rows, bodies.map(([st, b]) => name(st, b).replace('senior', 'elder').replace('adult/', '')), (row, i) => {
    const [st, b] = bodies[i]; return petSprite(st, { ...b, mood: 'normal', outfit: row.fit });
  });
  const moods = ['normal', 'happy', 'sad', 'angry', 'sick', 'sleep'];
  const poseRows = bodies.filter((_, i) => i < 3 || i === 5 || i === 7 || i === 13).map(([st, b]) => ({ label: name(st, b).replace('senior', 'elder'), st, b }));
  const posesSheet = sheet(poseRows.flatMap(r => [{ ...r, fit: rows[11].fit }, { ...r, fit: rows[12].fit, label: '' }]), [...moods, 'look -2', 'look +2'], (row, i) => {
    const pose = i < 6 ? { mood: moods[i], sick: moods[i] === 'sick' } : { mood: 'normal', look: i === 6 ? -2 : 2 };
    return petSprite(row.st, { ...row.b, ...pose, outfit: row.fit });
  });
  return { fails, renders, main, posesSheet };
});
await close();
await writeFile(join(out, 'wardrobe.png'), Buffer.from(res.main.split(',')[1], 'base64'));
await writeFile(join(out, 'wardrobe-poses.png'), Buffer.from(res.posesSheet.split(',')[1], 'base64'));
const fails = [...errors.map(e => 'page error: ' + e), ...res.fails];
for (const f of fails.slice(0, 60)) console.log('FAIL  ' + f);
if (fails.length > 60) console.log(`… and ${fails.length - 60} more`);
console.log(`${fails.length ? 'FAIL' : 'ok  '}  ${res.renders} dressed sprites checked · contact sheets in dist/audit/`);
process.exit(fails.length ? 1 : 0);
