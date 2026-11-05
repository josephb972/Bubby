// Builds the Chrome Web Store / Edge Add-ons package: a zip with manifest.json at its root.
// Usage: node tools/build-store.mjs              → dist/bubby-<version>.zip (for store upload)
//        node tools/build-store.mjs --unpacked   → bubby-extension.zip (a bubby-extension/ folder, for "Load unpacked")
// Needs only Node.js (no zip tool). Leaves out README.md, dotfiles and anything else not needed at runtime.
import { readFile, readdir, writeFile, mkdir, stat } from 'node:fs/promises';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(repo, 'extension');
const unpacked = process.argv.includes('--unpacked');
const EXCLUDE = [/^README\.md$/i, /(^|\/)\./, /(^|\/)Thumbs\.db$/i, /\.map$/i];

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else if (e.isFile()) out.push(p);
  }
  return out;
}

// CRC-32 (zlib.crc32 exists from Node 22.2; this fallback covers older versions).
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = zlib.crc32 || (buf => { let c = 0xffffffff; for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; });

function dosTime(d) {
  return { time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() };
}

function makeZip(entries) {
  const locals = [], centrals = [];
  let offset = 0;
  for (const { name, data, mtime } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const deflated = zlib.deflateRawSync(data, { level: 9 });
    const useDeflate = deflated.length < data.length;
    const body = useDeflate ? deflated : data;
    const crc = crc32(data), { time, date } = dosTime(mtime);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(0x0800, 6);
    head.writeUInt16LE(useDeflate ? 8 : 0, 8); head.writeUInt16LE(time, 10); head.writeUInt16LE(date, 12);
    head.writeUInt32LE(crc, 14); head.writeUInt32LE(body.length, 18); head.writeUInt32LE(data.length, 22);
    head.writeUInt16LE(nameBuf.length, 26); head.writeUInt16LE(0, 28);
    locals.push(head, nameBuf, body);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(0x0800, 8);
    cen.writeUInt16LE(useDeflate ? 8 : 0, 10); cen.writeUInt16LE(time, 12); cen.writeUInt16LE(date, 14);
    cen.writeUInt32LE(crc, 16); cen.writeUInt32LE(body.length, 20); cen.writeUInt32LE(data.length, 24);
    cen.writeUInt16LE(nameBuf.length, 28); cen.writeUInt32LE(offset, 42);
    centrals.push(cen, nameBuf);
    offset += head.length + nameBuf.length + body.length;
  }
  const cenSize = centrals.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cenSize, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

const manifest = JSON.parse(await readFile(join(src, 'manifest.json'), 'utf8'));
// Quick sanity checks: everything the manifest points at must be in the package.
const needed = [manifest.background.service_worker, manifest.action.default_popup, ...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon)];
for (const f of needed) await stat(join(src, f)).catch(() => { throw new Error(`manifest.json refers to a missing file: ${f}`); });
if ((manifest.description || '').length > 132) throw new Error('manifest description is longer than 132 characters (store limit)');

const files = (await walk(src))
  .map(p => relative(src, p).split(sep).join('/'))
  .filter(rel => !EXCLUDE.some(re => re.test(rel)))
  .sort((a, b) => (a === 'manifest.json' ? -1 : b === 'manifest.json' ? 1 : a.localeCompare(b)));
const prefix = unpacked ? 'bubby-extension/' : '';
const entries = await Promise.all(files.map(async rel => {
  const p = join(src, rel);
  return { name: prefix + rel, data: await readFile(p), mtime: (await stat(p)).mtime };
}));

const outPath = unpacked ? join(repo, 'bubby-extension.zip') : join(repo, 'dist', `bubby-${manifest.version}.zip`);
await mkdir(dirname(outPath), { recursive: true });
const zip = makeZip(entries);
await writeFile(outPath, zip);
const total = entries.reduce((n, e) => n + e.data.length, 0);
console.log(`${relative(repo, outPath)}: Bubby ${manifest.version}, ${entries.length} files, ${(total / 1024).toFixed(0)} KB unpacked, ${(zip.length / 1024).toFixed(0)} KB zipped`);
