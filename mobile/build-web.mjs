// Builds the Android app's web files (www/) from the extension: the popup becomes the whole app.
// Usage: node build-web.mjs   (then `npx cap sync android`; `npm run apk` does all of it)
import { cp, rm, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ext = join(here, '..', 'extension');
const www = join(here, 'www');

await rm(www, { recursive: true, force: true });
await mkdir(www, { recursive: true });
for (const dir of ['core', 'art', 'popup', 'fonts', 'icons']) await cp(join(ext, dir), join(www, dir), { recursive: true });
await cp(join(here, 'web'), join(www, 'mobile'), { recursive: true });

// The popup page, plus the phone layer: loaded before popup.js so the browser-extension APIs exist when it starts.
const page = join(www, 'popup', 'popup.html');
let html = await readFile(page, 'utf8');
const css = '<link rel="stylesheet" href="popup.css">';
const js = '<script type="module" src="popup.js"></script>';
if (!html.includes(css) || !html.includes(js)) throw new Error('popup.html changed: update build-web.mjs');
html = html
  .replace('<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">')
  .replace(css, `${css}\n<link rel="stylesheet" href="../mobile/mobile.css">`)
  .replace(js, `<script type="module" src="../mobile/mobile.js"></script>\n${js}`);
await writeFile(page, html);
await writeFile(join(www, 'index.html'),
  '<!doctype html><meta charset="utf-8"><title>Bubby</title><script>location.replace("popup/popup.html")</script>\n');
console.log('www/ built from extension/');
