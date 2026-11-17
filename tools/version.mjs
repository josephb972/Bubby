// Keeps the version in step everywhere. extension/manifest.json is the single source of truth.
//   node tools/version.mjs                      check that every doc, the changelog and release/ agree with the manifest
//   node tools/version.mjs bump 1.2.0 "Title"   set the manifest and every version marker, start the changelog entry
//   node tools/version.mjs submitted 1.1.0      record that this version was submitted to the stores
// Docs carry the version between markers, for example  <!-- version -->1.1.0<!-- /version -->  (invisible when rendered), and
// the last submitted version between  <!-- submitted -->1.0.0<!-- /submitted --> .
import { readFile, writeFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const at = p => join(repo, p);
const MANIFEST = 'extension/manifest.json', CHANGELOG = 'docs/CHANGELOG.md';
// Files that must carry a version marker (the project instructions, the docs and the memory)
const WITH_VERSION = ['CLAUDE.md', 'extension/README.md', 'docs/LAUNCH-CHECKLIST.md', 'docs/STORE-LISTING.md', 'docs/TEST-AND-PUBLISH.md',
  'memory/bubby-update-roadmap.md', 'memory/bubby-points-and-shop.md', 'mobile/README.md'];
const WITH_SUBMITTED = ['CLAUDE.md', 'docs/TEST-AND-PUBLISH.md'];
const V = /<!-- version -->(.*?)<!-- \/version -->/g, SUB = /<!-- submitted -->(.*?)<!-- \/submitted -->/g;
const semver = /^\d+\.\d+\.\d+$/;
const cmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
const exists = p => access(at(p)).then(() => true, () => false);
const read = p => readFile(at(p), 'utf8');
const manifestVersion = async () => JSON.parse(await read(MANIFEST)).version;

async function check() {
  const v = await manifestVersion();
  let bad = 0;
  const ok = (cond, msg) => { console.log(`${cond ? 'ok  ' : 'FAIL'}  ${msg}`); if (!cond) bad++; };
  ok(semver.test(v), `manifest version is ${v}`);
  for (const f of WITH_VERSION) {
    const found = [...(await read(f)).matchAll(V)].map(m => m[1]);
    ok(found.length > 0 && found.every(x => x === v), `${f} says ${found.length ? [...new Set(found)].join(', ') : '(no version marker)'}`);
  }
  const subs = [];
  for (const f of WITH_SUBMITTED) {
    const found = [...(await read(f)).matchAll(SUB)].map(m => m[1]);
    ok(found.length > 0, `${f} records the last submitted version: ${[...new Set(found)].join(', ') || '(no marker)'}`);
    subs.push(...found);
  }
  ok(new Set(subs).size <= 1, 'the last submitted version is the same everywhere');
  const log = await read(CHANGELOG), top = (log.match(/^## (\d+\.\d+\.\d+)/m) || [])[1];
  ok(top === v, `the changelog's newest entry is ${top || '(none)'}`);
  ok(await exists(`release/bubby-${v}.zip`), `release/bubby-${v}.zip exists (build it with node tools/package.mjs and copy it there)`);
  const subV = subs[0];
  if (subV) ok(await exists(`release/bubby-${subV}.zip`), `release/bubby-${subV}.zip (the last submitted version) is kept`);
  if (subV && cmp(v, subV) < 0) ok(false, `the manifest (${v}) is older than the last submitted version (${subV})`);
  console.log(bad ? `\n${bad} problem(s): the version is out of step.` : `\nAll in step at version ${v}.`);
  process.exit(bad ? 1 : 0);
}

async function bump(next, title) {
  if (!semver.test(next || '')) throw new Error('Give a version like 1.2.0');
  const cur = await manifestVersion();
  if (cmp(next, cur) <= 0) throw new Error(`${next} is not higher than the current ${cur} (the store needs a higher version each time)`);
  let m = await read(MANIFEST);
  m = m.replace(/("version"\s*:\s*")[^"]+(")/, `$1${next}$2`);
  await writeFile(at(MANIFEST), m);
  for (const f of WITH_VERSION) await writeFile(at(f), (await read(f)).replace(V, `<!-- version -->${next}<!-- /version -->`));
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const entry = `## ${next} (${date})${title ? `: ${title}` : ''}\nStatus: in progress; **not submitted**. Package: \`release/bubby-${next}.zip\` (build it with \`node tools/package.mjs\`).\n\n**Added**\n- \n\n**Changed**\n- \n\n**Saves:** \n\n**Checks:** \n\n**Owner still to do:** \n\n`;
  const log = await read(CHANGELOG), i = log.search(/^## \d/m);
  await writeFile(at(CHANGELOG), log.slice(0, i) + entry + log.slice(i));
  console.log(`Version is now ${next}. Next:
  1. fill in the new entry in ${CHANGELOG}
  2. update memory/, the store listing text and screenshots (node tools/store-images.mjs), PRIVACY.md if what is stored changed
  3. run the checks (rules-check, sim-check, check-extension, check-v11), then node tools/package.mjs
  4. copy dist/bubby-${next}.zip to release/, run node tools/version.mjs, commit, push, send the owner the zip`);
}

async function submitted(v) {
  if (!semver.test(v || '')) throw new Error('Give the submitted version like 1.1.0');
  for (const f of WITH_SUBMITTED) await writeFile(at(f), (await read(f)).replace(SUB, `<!-- submitted -->${v}<!-- /submitted -->`));
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  let log = await read(CHANGELOG);
  const re = new RegExp(`(^## ${v.replace(/\./g, '\\.')}[^\\n]*\\n)Status:[^\\n]*`, 'm');
  if (!re.test(log)) throw new Error(`No changelog entry for ${v}`);
  log = log.replace(re, `$1Status: submitted to the stores on ${date}. Package: \`release/bubby-${v}.zip\`.`);
  await writeFile(at(CHANGELOG), log);
  console.log(`Recorded ${v} as submitted (${date}).`);
}

const [cmd, a, b] = process.argv.slice(2);
try {
  if (!cmd) await check();
  else if (cmd === 'bump') await bump(a, b);
  else if (cmd === 'submitted') await submitted(a);
  else throw new Error('Use: node tools/version.mjs [bump X.Y.Z "Title" | submitted X.Y.Z]');
} catch (e) { console.error(e.message); process.exit(1); }
