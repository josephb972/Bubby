// Golden-image check: Bubby without clothes must look exactly as it did before the wardrobe existed.
// Usage: node tools/golden-sprites.mjs           compare with tools/golden-sprites.json
//        node tools/golden-sprites.mjs --write   record the current sprites (only when the base art changes on purpose)
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { openPage, repo } from './lib/page.mjs';

const file = join(repo, 'tools', 'golden-sprites.json');
const { page, errors, close } = await openPage();
const hashes = await page.evaluate(async () => {
  const { petSprite } = await import('/art/sprites.js');
  const fnv = (h, v) => Math.imul(h ^ v, 16777619) >>> 0;
  const bodies = [['seed', {}], ['seed', { crack: true }], ['seed', { wobble: 1, crack: true }], ['seed', { wobble: -1 }], ['baby', {}], ['child', {}]];
  for (const st of ['adult', 'senior']) for (const variant of ['radiant', 'daisy', 'thistle']) for (const chubby of [false, true]) bodies.push([st, { variant, chubby }]);
  const out = {};
  for (const [stage, base] of bodies) {
    let h = 2166136261;
    const poses = stage === 'seed' ? [{}] : [];
    if (stage !== 'seed') for (const mood of ['normal', 'happy', 'sad', 'angry', 'sick', 'sleep']) for (const mouth of [undefined, 'open', 'small', 'flat'])
      for (const blink of [false, true]) for (const look of [-2, -1, 0, 1, 2]) for (const sick of [false, true]) poses.push({ mood, mouth, blink, look, sick });
    for (const pose of poses) {
      const c = petSprite(stage, { ...base, ...pose });
      const pad = c.height - 48; // sprites may carry headroom above the 48×48 body box
      const d = c.getContext('2d').getImageData(0, 0, 48, c.height).data;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < 48; x++) {
        const i = (y * 48 + x) * 4;
        if (y < pad) { if (d[i + 3]) return { error: `${stage} has pixels in the headroom without clothes` }; continue; }
        h = fnv(fnv(fnv(fnv(h, d[i]), d[i + 1]), d[i + 2]), d[i + 3]);
      }
    }
    out[`${stage}|${base.variant || ''}|${base.chubby ? 'chubby' : ''}|${base.crack ? 'crack' : ''}|${base.wobble || ''}`] = h.toString(16);
  }
  return out;
});
await close();
if (hashes.error || errors.length) { console.error('FAIL', hashes.error || errors.join('\n')); process.exit(1); }
if (process.argv.includes('--write')) {
  await writeFile(file, JSON.stringify(hashes, null, 1) + '\n');
  console.log(`Recorded ${Object.keys(hashes).length} sprite bodies → tools/golden-sprites.json`);
} else {
  const want = JSON.parse(await readFile(file, 'utf8'));
  const bad = Object.keys(want).filter(k => want[k] !== hashes[k]);
  console.log(bad.length ? `FAIL  unclothed sprites changed: ${bad.join(', ')}` : `ok    ${Object.keys(want).length} unclothed sprite bodies are pixel-identical to the golden copy`);
  process.exit(bad.length ? 1 : 0);
}
