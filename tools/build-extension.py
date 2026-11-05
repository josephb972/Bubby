#!/usr/bin/env python3
"""Build the Chrome/Edge (Manifest V3) extension from index.html.

Why a build step: extension pages forbid inline <script> and the store dislikes remote resources, so
this extracts the game script into game.js and bundles the Latin subset of the Google Fonts locally.

usage: python3 tools/build-extension.py     (needs curl + network on first run for the fonts)
Icons are produced separately by tools/make-icons.js (they need a browser).
"""
import json, os, re, subprocess, sys, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'extension')
VERSION = '1.0.0'
FONT_URL = ('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Nunito:wght@400;600;700'
            '&family=Pixelify+Sans:wght@400;600&display=swap')
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

def curl(url, dest=None):
    cmd = ['curl', '-sSfL', '-A', UA, url] + (['-o', dest] if dest else [])
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode: sys.exit(f'curl failed for {url}: {r.stderr.decode()}')
    return r.stdout.decode() if not dest else None

def build_fonts():
    os.makedirs(f'{OUT}/fonts', exist_ok=True)
    css = curl(FONT_URL)
    blocks = re.findall(r'/\* ([\w-]+) \*/\s*(@font-face \{.*?\})', css, re.S)
    out, seen = [], {}
    for subset, block in blocks:
        if subset != 'latin': continue          # the game is English-only
        url = re.search(r'url\((https://[^)]+)\)', block).group(1)
        if url not in seen:
            name = f'f{len(seen) + 1}.woff2'; seen[url] = name
            curl(url, f'{OUT}/fonts/{name}')
        out.append(block.replace(url, f'fonts/{seen[url]}'))
    open(f'{OUT}/fonts.css', 'w').write('\n'.join(out) + '\n')
    print(f'fonts: {len(out)} faces, {len(seen)} files')

def build_page():
    src = open(f'{ROOT}/index.html').read()
    style = re.search(r'<style>(.*?)</style>', src, re.S).group(1)
    body = re.search(r'</style>(.*?)<script>', src, re.S).group(1)
    script = re.search(r'<script>(.*?)</script>', src, re.S).group(1)
    open(f'{OUT}/game.js', 'w').write(script.strip() + '\n')
    html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Bubby</title>
<link rel="stylesheet" href="fonts.css">
<style>{style}</style>
</head>
<body>
{body.strip()}
<script src="game.js"></script>
</body>
</html>
'''
    open(f'{OUT}/bubby.html', 'w').write(html)

def build_misc():
    icons = {str(n): f'icons/icon{n}.png' for n in (16, 32, 48, 128)}
    manifest = {
        'manifest_version': 3, 'name': 'Bubby: Pixel Garden Pet', 'version': VERSION,
        'description': 'A cozy pixel virtual pet that grows from a seed. Feed it, play with it and keep its garden clean.',
        'action': {'default_title': 'Open Bubby', 'default_icon': icons},
        'icons': icons,
        'background': {'service_worker': 'background.js'},
        'content_security_policy': {'extension_pages': "script-src 'self'; object-src 'self'"},
    }
    open(f'{OUT}/manifest.json', 'w').write(json.dumps(manifest, indent=2) + '\n')
    open(f'{OUT}/background.js', 'w').write('''// Toolbar click: open Bubby in a tab, or focus the one that is already open
// (two tabs would race on the same saved game). getContexts needs no extra permission.
chrome.action.onClicked.addListener(async () => {
  const url = chrome.runtime.getURL('bubby.html');
  const ctxs = await chrome.runtime.getContexts({ contextTypes: ['TAB'], documentUrls: [url] });
  if (ctxs.length) { await chrome.tabs.update(ctxs[0].tabId, { active: true }); await chrome.windows.update(ctxs[0].windowId, { focused: true }); }
  else await chrome.tabs.create({ url });
});
''')

def zip_it():
    z = f'{ROOT}/bubby-extension-{VERSION}.zip'
    with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED) as zf:
        for d, _, fs in os.walk(OUT):
            for f in fs:
                p = os.path.join(d, f); zf.write(p, os.path.relpath(p, OUT))
    print('zip:', z, os.path.getsize(z) // 1024, 'KB')

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    if '--zip-only' not in sys.argv:
        build_fonts(); build_page(); build_misc()
    if os.path.isdir(f'{OUT}/icons'): zip_it()
    else: print('icons missing: run node tools/make-icons.js, then python3 tools/build-extension.py --zip-only')
