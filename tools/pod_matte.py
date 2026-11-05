"""Kept for reference: rebuilds the pod photo embedded in index.html from the source image.
Soft matte for the pod photo, then crop, blank the glass, encode and swap the data URI in index.html.
python3 -I pod_matte.py <scratchpad> [--no-patch]
- Background likelihood is continuous (hue + saturation ramps), so the photo's own anti-aliasing becomes
  smooth alpha instead of a 1-px staircase.
- Only backdrop connected to the border, or enclosed by the chain, can become transparent.
- Edge colours are un-mixed from the local backdrop colour (no blue fringe).
- A soft contact shadow is kept around the pod body only (not around the chain links)."""
import sys, base64, re, numpy as np
from PIL import Image, ImageDraw, ImageFilter
SP = sys.argv[1]
src = SP + '/pod2/src.png'
f32 = lambda im: np.asarray(im).astype(np.float32)
def blur(a, r):  # separable gaussian blur of a float array, in numpy
    if r <= 0: return a
    n = int(r * 3 + .5); x = np.arange(-n, n + 1, dtype=np.float32); k = np.exp(-x * x / (2 * r * r)); k /= k.sum()
    p = np.pad(a, ((n, n), (n, n)), mode='edge')
    t = sum(k[i] * p[:, i:i + a.shape[1]] for i in range(2 * n + 1))
    return sum(k[i] * t[i:i + a.shape[0], :] for i in range(2 * n + 1))
def ss(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)
def morph(mask, size, op):
    im = Image.fromarray((mask * 255).astype(np.uint8))
    return f32(im.filter(ImageFilter.MaxFilter(size) if op == 'dilate' else ImageFilter.MinFilter(size))) > 127

im = f32(Image.open(src).convert('RGB')) / 255
H, W = im.shape[:2]
r, g, b = im[..., 0], im[..., 1], im[..., 2]
mx, mn = im.max(-1), im.min(-1); d = np.maximum(mx - mn, 1e-6)
h = np.where(mx == r, (60 * ((g - b) / d)) % 360, np.where(mx == g, 60 * ((b - r) / d) + 120, 60 * ((r - g) / d) + 240))
sat = d / np.maximum(mx, 1e-6)
bgp = ss(175, 186, h) * (1 - ss(206, 216, h)) * ss(.13, .25, sat)          # 0 = pod, 1 = backdrop

# Connected backdrop region (from the borders and from inside the chain loop).
m = Image.fromarray(((bgp > .5) * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
arr = np.asarray(m)
seeds = [(0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1), (W // 2, H - 1), (0, H // 2), (W - 1, H // 2)]
for y in range(20, 560, 4):
    for x in range(500, 1000, 4):
        if arr[y, x] == 255: seeds.append((x, y))
for sd in seeds:
    if m.getpixel(sd) == 255: ImageDraw.floodfill(m, sd, 128)
region = np.asarray(m) == 128
zone = morph(region, 7, 'dilate')                  # where soft alpha may apply
deep = morph(region, 5, 'erode')                   # certainly backdrop

a = np.where(zone, 1 - bgp, 1.0)
a = np.where(deep, 0, a)
a = np.clip(blur(a, .6), 0, 1)
a = np.where(a > .985, 1, np.where(a < .02, 0, a))

# The moulded pod body is a smooth shape: give it a geometric edge (blur the silhouette, re-threshold with
# a ~2px ramp). Thin parts (chain, ring) keep the colour-based matte above.
pod_bin = (~region).astype(np.float32)
body_open = morph(morph(pod_bin > .5, 17, 'erode'), 17, 'dilate')
bodyzone = morph(body_open, 11, 'dilate')
a_geo = ss(.44, .64, blur(pod_bin, 3.2))
a = np.where(bodyzone, a_geo, a)
a = np.where(a > .985, 1, np.where(a < .02, 0, a))

# Local backdrop colour, for un-mixing edge pixels: P = a*F + (1-a)*B  =>  F = (P - (1-a)*B) / a
conf = morph(region, 9, 'erode').astype(np.float32)
B = np.dstack([blur(im[..., c] * conf, 8) for c in range(3)]) / np.maximum(blur(conf, 8), 1e-3)[..., None]
F = (im - (1 - a)[..., None] * B) / np.maximum(a, .05)[..., None]
F = np.clip(F, 0, 1)
# Very faint edge pixels get colour pulled from just inside the pod instead (un-mixing is noisy there).
inner = morph(a > .98, 5, 'erode').astype(np.float32)
pulled = np.dstack([blur(im[..., c] * inner, 3) for c in range(3)]) / np.maximum(blur(inner, 3), 1e-3)[..., None]
w = ss(.12, .45, a)[..., None]
F = F * w + pulled * (1 - w)
F = np.where((bodyzone & (a < 1))[..., None], pulled, F)   # body edge: colour from just inside
F = np.where((a >= 1)[..., None], im, F)

# Contact shadow: backdrop darkening relative to its unshadowed level, only near the pod body.
lum = .3 * r + .59 * g + .11 * b
ref = np.percentile(lum[region], 90)
shadow = np.clip((1 - lum / ref) * 1.3, 0, .6) * region
body = morph(morph(a > .9, 17, 'erode'), 17, 'dilate')        # opening removes the thin chain
near = np.clip(blur(morph(body, 9, 'dilate').astype(np.float32), 22) * 2, 0, 1)
shadow = blur(shadow * near * .85, 2)
alpha = np.clip(a + (1 - a) * shadow, 0, 1)
sh_col = np.array([.05, .17, .2], np.float32)
wa = (a / np.maximum(alpha, 1e-6))[..., None]
rgb = F * wa + sh_col * (1 - wa)
out = Image.fromarray((np.dstack([rgb, alpha]) * 255 + .5).clip(0, 255).astype(np.uint8), 'RGBA')

# Crop to the published frame (body box is x 60..530 of the 216,60-offset keyed frame used for geometry).
OX, OY = 216, 60                                    # earlier keyed-image offset; geometry is measured there
X0, Y0, X1, Y1 = 50 + OX, 0 + OY, 700 + OX, 850 + OY
crop = out.crop((X0, Y0, X1, Y1))
ca = f32(crop)
hh, ww = ca.shape[:2]
yy, xx = np.mgrid[0:hh, 0:ww]
edge = np.clip(np.minimum.reduce([xx / 20, (ww - 1 - xx) / 20, (hh - 1 - yy) / 24]), 0, 1)
solid = ca[..., 3] > 235
ca[..., 3] = np.where(solid, ca[..., 3], ca[..., 3] * edge)
crop = Image.fromarray(ca.clip(0, 255).astype(np.uint8), 'RGBA')
ImageDraw.Draw(crop).rounded_rectangle([189 - 50, 335, 409 - 50, 578], radius=12, fill=(35, 38, 46, 255))
crop.save(SP + '/pod2/pod-final.png')
crop.save(SP + '/pod2/pod.webp', 'WEBP', quality=82, alpha_quality=100, method=6)
print('webp bytes', len(open(SP + '/pod2/pod.webp', 'rb').read()))
if '--no-patch' not in sys.argv:
    b64 = base64.b64encode(open(SP + '/pod2/pod.webp', 'rb').read()).decode()
    s = open('index.html').read()
    s2, n = re.subn(r'--pod: url\("data:image/webp;base64,[A-Za-z0-9+/=]+"\);', '--pod: url("data:image/webp;base64,' + b64 + '");', s)
    assert n == 1, n
    open('index.html', 'w').write(s2); print('patched index.html', len(s2))
