"""Build contact sheets from capture.js output.

python3 prompts/shots/sheet.py single <shotsDir> <combo> <out.png> [cols] [crop]
python3 prompts/shots/sheet.py pair <beforeDir> <afterDir> <combo> <out.png> [cols] [crop]

crop: 'device' (whole toy) or 'screen' (the LCD only, nearest-neighbour so pixels stay crisp).
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont

# Screen rect inside the device PNG, as fractions (matches .screen in index.html, slightly padded).
SCREEN = (0.225, 0.290, 0.775, 0.678)


def font(sz):
    for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf']:
        if os.path.exists(p):
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()


def load(path, crop, w):
    im = Image.open(path).convert('RGB')
    if crop == 'screen':
        W, H = im.size
        im = im.crop((int(W * SCREEN[0]), int(H * SCREEN[1]), int(W * SCREEN[2]), int(H * SCREEN[3])))
        return im.resize((w, round(im.height * w / im.width)), Image.NEAREST if im.width <= w else Image.LANCZOS)
    return im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)


def names(d, combo):
    return sorted(f[:-4] for f in os.listdir(os.path.join(d, combo)) if f.endswith('.png') and not f.startswith('_'))


def grid(cells, cols, title, out):
    """cells: list of (label, [images])."""
    f, ft = font(18), font(28)
    cw = sum(im.width for im in cells[0][1]) + 8 * (len(cells[0][1]) - 1)
    ch = max(im.height for _, ims in cells for im in ims) + 30
    rows = (len(cells) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * (cw + 16) + 16, rows * (ch + 16) + 64), (246, 244, 238))
    d = ImageDraw.Draw(sheet)
    d.text((16, 16), title, fill=(40, 40, 50), font=ft)
    for i, (lab, ims) in enumerate(cells):
        x, y = 16 + (i % cols) * (cw + 16), 64 + (i // cols) * (ch + 16)
        d.text((x, y), lab, fill=(40, 40, 50), font=f)
        xx = x
        for im in ims:
            sheet.paste(im, (xx, y + 26)); xx += im.width + 8
    sheet.save(out, quality=86, optimize=True) if out.endswith(".jpg") else sheet.save(out, optimize=True)
    print(out, sheet.size)


if __name__ == '__main__':
    mode = sys.argv[1]
    if mode == 'single':
        d, combo, out = sys.argv[2:5]
        cols = int(sys.argv[5]) if len(sys.argv) > 5 else 8
        crop = sys.argv[6] if len(sys.argv) > 6 else 'device'
        w = 300 if crop == 'device' else 300
        cells = [(n, [load(os.path.join(d, combo, n + '.png'), crop, w)]) for n in names(d, combo)]
        grid(cells, cols, f'{os.path.basename(d.rstrip("/"))} · {combo}', out)
    elif mode == 'pair':
        b, a, combo, out = sys.argv[2:6]
        cols = int(sys.argv[6]) if len(sys.argv) > 6 else 4
        crop = sys.argv[7] if len(sys.argv) > 7 else 'device'
        w = 240 if crop == 'device' else 300
        ns = names(a, combo)
        def pic(d, n):
            f = os.path.join(d, combo, n + '.png')
            if os.path.exists(f): return load(f, crop, w)
            ref = load(os.path.join(a, combo, n + '.png'), crop, w); im = Image.new('RGB', ref.size, (226, 222, 214))
            ImageDraw.Draw(im).text((12, ref.height // 2 - 10), 'new state', fill=(120, 116, 110), font=font(18)); return im
        cells = [(n + ('   before | after' if os.path.exists(os.path.join(b, combo, n + '.png')) else '   (new) | after'), [pic(b, n), pic(a, n)]) for n in ns]
        grid(cells, cols, f'Before / after · {combo}', out)


def pages(dirs, out):
    """Full-page shots for every combo, side by side, one row per directory."""
    rows = []
    for d in dirs:
        ims = []
        for combo in ['phone-light', 'phone-dark', 'desk-light', 'desk-dark']:
            p = os.path.join(d, combo, '_page.png')
            if os.path.exists(p):
                im = Image.open(p).convert('RGB'); h = 1400
                ims.append(im.resize((round(im.width * h / im.height), h), Image.LANCZOS))
        rows.append((os.path.basename(d.rstrip('/')), ims))
    W = max(sum(i.width + 16 for i in ims) for _, ims in rows) + 16
    sheet = Image.new('RGB', (W, len(rows) * 1460 + 16), (246, 244, 238)); dr = ImageDraw.Draw(sheet)
    for r, (lab, ims) in enumerate(rows):
        x = 16; dr.text((16, 16 + r * 1460), lab, fill=(40, 40, 50), font=font(28))
        for im in ims: sheet.paste(im, (x, 56 + r * 1460)); x += im.width + 16
    sheet.save(out, quality=86, optimize=True); print(out, sheet.size)


if __name__ == '__main__' and sys.argv[1] == 'pages':
    pages(sys.argv[3:], sys.argv[2])
