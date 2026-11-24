// Opens a Chromium page that can import the extension's modules (served over a local HTTP server),
// for tools that need a real canvas: the wardrobe audit, the golden-sprite check and the contact sheets.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

export const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ext = join(repo, 'extension');
const TYPES = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2' };

export async function openPage() {
  const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
    const file = join(ext, path);
    if (!file.startsWith(ext)) { res.writeHead(403); res.end(); return; }
    try {
      const body = path ? await readFile(file) : '<!doctype html><meta charset="utf-8"><body></body>';
      res.writeHead(200, { 'content-type': path ? TYPES[extname(file)] || 'application/octet-stream' : 'text/html' });
      res.end(body);
    } catch (e) { res.writeHead(404); res.end(); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const { chromium } = createRequire(import.meta.url)('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  return { page, errors, close: async () => { await browser.close(); server.close(); } };
}
