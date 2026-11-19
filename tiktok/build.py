# Cuts the recorded scenes together and adds a chiptune track + sound effects → tiktok/bubby-diseases-tiktok.mp4
# Usage: python3 tiktok/build.py <runDir> <outFile>
import json, math, random, struct, subprocess, sys, os
run, outf = sys.argv[1], sys.argv[2]
tl = json.load(open(os.path.join(run, 'timeline.json')))
SR = 44100
random.seed(7)

# 1) video: trim every scene to its planned length, then concat
parts = []
for i, s in enumerate(tl):
    o = os.path.join(run, f'cut{i}.mp4')
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', str(s['ss']), '-t', str(s['dur']), '-i', os.path.join(run, s['file']),
                    '-vf', 'fps=30,scale=1080:1920,setsar=1', '-an', '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-pix_fmt', 'yuv420p', o], check=True)
    parts.append(o)
lst = os.path.join(run, 'list.txt'); open(lst, 'w').write(''.join(f"file '{p}'\n" for p in parts))
vid = os.path.join(run, 'video.mp4')
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', vid], check=True)
total = sum(s['dur'] for s in tl)

# 2) audio
N = int(total * SR) + SR
buf = [0.0] * N
def add(t, samples, g=1.0):
    i0 = int(t * SR)
    for k, v in enumerate(samples):
        if i0 + k < N: buf[i0 + k] += v * g
def env(n, a=.005, r=.6):
    return [min(1, k / (a * SR + 1)) * math.exp(-k / (n * r)) for k in range(n)]
def sq(f, d, duty=.5, vol=.5):
    n = int(d * SR); e = env(n, .004, .5)
    return [vol * e[k] * (1 if (k * f / SR) % 1 < duty else -1) for k in range(n)]
def sine(f0, f1, d, vol=.6):
    n = int(d * SR); e = env(n, .004, .5); ph = 0; o = []
    for k in range(n):
        f = f0 + (f1 - f0) * k / n; ph += 2 * math.pi * f / SR; o.append(vol * e[k] * math.sin(ph))
    return o
def noise(d, vol=.5, lp=.2, sweep=False):
    n = int(d * SR); y = 0; o = []
    for k in range(n):
        a = lp * (1 + 3 * (k / n)) if sweep else lp
        y += min(1, a) * (random.uniform(-1, 1) - y)
        w = math.sin(math.pi * k / n) if sweep else math.exp(-k / (n * .35))
        o.append(vol * y * w * 2)
    return o
def saw(f0, f1, d, vol=.35):
    n = int(d * SR); ph = 0; o = []
    for k in range(n):
        f = f0 + (f1 - f0) * k / n; ph = (ph + f / SR) % 1; o.append(vol * (ph * 2 - 1) * min(1, k / 800) * min(1, (n - k) / 2000))
    return o
def seq(notes, d, vol=.4):
    out = []
    for f in notes: out += sq(f, d, .5, vol)
    return out
SFX = {
    'whoosh': lambda: noise(.4, .55, .12, True), 'pop': lambda: sine(500, 1000, .09), 'ding': lambda: seq([1047, 1319, 1568], .09, .45) + sq(2093, .3, .5, .35),
    'tap': lambda: sq(880, .05, .5, .4), 'splash': lambda: noise(.55, .6, .35) + [], 'sad': lambda: saw(392, 380, .3) + saw(370, 360, .3) + saw(349, 340, .3) + saw(311, 230, .8),
    'munch': lambda: noise(.07, .8, .5) + [0] * 2000 + noise(.07, .8, .5) + [0] * 2000 + noise(.07, .8, .5), 'boing': lambda: sine(200, 700, .15) + sine(700, 250, .25),
    'scold': lambda: sq(180, .12, .5, .5) + [0] * 1500 + sq(140, .2, .5, .5), 'gulp': lambda: sine(350, 120, .13, .8) + [0] * 2500 + sine(300, 90, .15, .8),
    'win': lambda: seq([523, 659, 784, 1047, 784, 1047], .1, .45) + sq(1319, .45, .5, .4),
}
off = 0
for s in tl:
    for e in s['sfx']: add(off + e['t'], SFX[e['n']](), .9)
    off += s['dur']
# music: bouncy chiptune loop, 124 bpm
beat = 60 / 124; step = beat / 2
bass = [131, 131, 196, 196, 175, 175, 196, 196]
lead = [523, 0, 659, 784, 0, 659, 587, 0, 523, 0, 659, 880, 0, 784, 659, 0, 587, 0, 698, 880, 0, 784, 698, 0, 659, 587, 523, 0, 392, 0, 0, 0]
t = 0; i = 0
while t < total:
    b = bass[(i // 2) % len(bass)]
    add(t, sq(b, step * .9, .25, .3), .22)
    f = lead[i % len(lead)]
    if f: add(t, sq(f, step * .8, .5, .3), .13)
    if i % 2 == 0: add(t, noise(.03, .5, .6), .12)   # tick hat
    t += step; i += 1
peak = max(abs(v) for v in buf) or 1
pcm = struct.pack('<%dh' % N, *[int(max(-1, min(1, v / peak * .9)) * 32767) for v in buf])
wav = os.path.join(run, 'audio.wav')
import wave
with wave.open(wav, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm)
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', vid, '-i', wav, '-t', str(total), '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', outf], check=True)
print('done', outf, round(total, 1), 's')
