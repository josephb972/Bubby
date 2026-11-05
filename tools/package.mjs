// Packages the extension for the Chrome Web Store and Edge Add-ons.
// Usage: node tools/package.mjs   → dist/bubby-<version>.zip, with manifest.json at the zip root.
// Only runtime files go in: README.md and hidden files are left out. Needs only Node.js.
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(repo, 'extension');
const skip = name => name.startsWith('.') || /^readme\.md$/i.test(name);

async function files(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (skip(e.name)) continue;
    const p = join(dir, e.name);
    out.push(...(e.isDirectory() ? await files(p) : [p]));
  }
  return out;
}

const table = Array.from({ length: 256 }, (_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
const crc32 = buf => { let c = ~0; for (const b of buf) c = table[(c ^ b) & 255] ^ (c >>> 8); return ~c >>> 0; };

// A plain "stored" zip (no compression): the images and fonts are already compressed, and every store accepts it.
function zip(entries) {
  const parts = [], dir = [];
  let at = 0;
  for (const { name, data } of entries) {
    const n = Buffer.from(name), crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(10, 4); local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0x21, 12); // date 1980-01-01, so the same files always give the same zip
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(n.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(10, 4); central.writeUInt16LE(10, 6); central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0x21, 14); central.writeUInt32LE(crc, 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(n.length, 28); central.writeUInt32LE(at, 42);
    parts.push(local, n, data); dir.push(central, n);
    at += 30 + n.length + data.length;
  }
  const size = dir.reduce((s, b) => s + b.length, 0), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(size, 12); end.writeUInt32LE(at, 16);
  return Buffer.concat([...parts, ...dir, end]);
}

const manifest = JSON.parse(await readFile(join(src, 'manifest.json'), 'utf8'));
if (manifest.description.length > 132) throw new Error('The manifest description must be 132 characters or fewer for the stores.');
const names = (await files(src)).map(p => relative(src, p).split(sep).join('/'));
for (const f of [manifest.background.service_worker, manifest.action.default_popup, ...Object.values(manifest.icons)]) {
  if (!names.includes(f)) throw new Error(`manifest.json points to a missing file: ${f}`);
}
names.sort((a, b) => (a === 'manifest.json' ? -1 : b === 'manifest.json' ? 1 : a.localeCompare(b)));
const entries = await Promise.all(names.map(async name => ({ name, data: await readFile(join(src, name)) })));
const out = join(repo, 'dist', `bubby-${manifest.version}.zip`);
await mkdir(dirname(out), { recursive: true });
const buf = zip(entries);
await writeFile(out, buf);
console.log(`${relative(repo, out)}: Bubby ${manifest.version}, ${entries.length} files, ${Math.round(buf.length / 1024)} KB`);
