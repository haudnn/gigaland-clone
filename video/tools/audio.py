"""Synthesise the score + sfx stems and write timing.json.

Everything is deterministic (seeded). 120 BPM, 60 fps -> 1 beat = 30 frames.
Outputs: audio/music.wav, audio/sfx.wav (48 kHz stereo float), timing.json
"""
import json
import os
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 48000
FPS = 60
BPM = 120
BEAT = 60 / BPM
DUR = 20.0
N = int(SR * DUR)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rng = np.random.default_rng(7)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)


def saw(f, n, phase=0.0):
    t = np.arange(n) / SR
    return 2 * ((t * f + phase) % 1.0) - 1


def env_adsr(n, a, d, s, r, hold):
    e = np.zeros(n)
    ia, idd, ih, ir = int(a * SR), int(d * SR), int(hold * SR), int(r * SR)
    t = 0
    seg = min(ia, n); e[:seg] = np.linspace(0, 1, seg, endpoint=False); t = seg
    seg = min(idd, n - t); e[t:t + seg] = np.linspace(1, s, seg, endpoint=False); t += seg
    seg = max(0, min(ih - ia - idd, n - t)); e[t:t + seg] = s; t += seg
    seg = min(ir, n - t); e[t:t + seg] = np.linspace(s, 0, seg); t += seg
    return e


def place(buf, sig, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= buf.shape[1]:
        return
    sig = sig[: buf.shape[1] - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[0, i:i + len(sig)] += sig * gain * l * 1.414
    buf[1, i:i + len(sig)] += sig * gain * r * 1.414


def bt(beat):
    return beat * BEAT


# --- harmony: F minor. bar -> chord (midi notes) ---
CH = {
    'Fm': [53, 56, 60], 'Db': [49, 53, 56], 'Ab': [56, 60, 63], 'Eb': [51, 55, 58],
}
BARS = ['Fm', 'Db', 'Ab', 'Fm', 'Db', 'Ab', 'Eb', 'Fm', 'Db', 'Fm']
DROP_BEAT = 12          # bar 4 -> 6.0 s
END_BEAT = 36           # bar 10 -> 18.0 s

music = np.zeros((2, N))

# pad
for b, name in enumerate(BARS):
    t0 = bt(b * 4)
    length = 2.0 if b < 9 else 2.0
    n = int((length + 0.6) * SR)
    sig = np.zeros(n)
    for m in CH[name]:
        for det in (-0.08, 0.0, 0.07):
            sig += saw(hz(m + 12) * 2 ** (det / 12), n, rng.random())
    cutoff = 900 if b < 3 else 1500
    sig = lp(sig, cutoff, 2) * env_adsr(n, 0.25, 0.3, 0.8, 0.6, length) / 9
    place(music, sig, t0, 0.32, -0.25)
    place(music, np.roll(sig, 220), t0, 0.32, 0.25)

# arp (16ths) whole film until END
pattern = [0, 1, 2, 3, 2, 1, 2, 3]
for s16 in range(END_BEAT * 4):
    b = s16 // 16
    tones = CH[BARS[b]] + [CH[BARS[b]][0] + 12]
    m = tones[pattern[s16 % 8]] + 12
    n = int(0.22 * SR)
    sig = saw(hz(m), n) * 0.6 + saw(hz(m) * 1.004, n) * 0.4
    e = np.exp(-np.arange(n) / SR / 0.07)
    bright = 2200 if s16 < DROP_BEAT * 4 else 3200
    sig = lp(sig * e, bright, 2)
    acc = 1.0 if s16 % 4 == 0 else 0.7
    place(music, sig, s16 * BEAT / 4, 0.16 * acc, 0.3 if s16 % 2 else -0.3)

# kick
def kick():
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / 0.16) + 0.25 * np.exp(-t / 0.004) * rng.standard_normal(n) * 0.3

KICK = kick()
kick_times = []
for beat in range(4, END_BEAT):           # half time in bars 2-3, four-on-floor from drop
    if beat < DROP_BEAT and beat % 2:
        continue
    kick_times.append(bt(beat))
    place(music, KICK, bt(beat), 0.9 if beat >= DROP_BEAT else 0.7)
kick_times.append(bt(END_BEAT))
place(music, KICK, bt(END_BEAT), 1.0)

# sidechain envelope for bass + pad energy
sc = np.ones(N)
for kt in kick_times:
    i = int(kt * SR); n = int(0.25 * SR)
    seg = 1 - 0.6 * np.exp(-np.arange(min(n, N - i)) / SR / 0.06)
    sc[i:i + len(seg)] = np.minimum(sc[i:i + len(seg)], seg)

# bass (8ths) from drop
bass = np.zeros((2, N))
for e8 in range(DROP_BEAT * 2, END_BEAT * 2):
    b = e8 // 8
    m = CH[BARS[b]][0] - 12
    n = int(0.24 * SR)
    sig = saw(hz(m), n) + 0.5 * np.sin(2 * np.pi * hz(m) / 2 * np.arange(n) / SR)
    sig = lp(sig, 420, 2) * env_adsr(n, 0.004, 0.08, 0.6, 0.05, 0.2)
    place(bass, sig, e8 * BEAT / 2, 0.30 if e8 % 2 else 0.24)
music += bass * sc

# clap on 2 and 4 from drop
def clap():
    n = int(0.25 * SR); t = np.arange(n) / SR
    x = rng.standard_normal(n)
    e = np.exp(-t / 0.09) + 0.6 * np.exp(-((t - 0.012) % 0.011) / 0.003) * (t < 0.035)
    return bp(x, 900, 3200) * e

for beat in range(DROP_BEAT, END_BEAT):
    if beat % 2 == 1:
        place(music, clap(), bt(beat), 0.34)

# hats: offbeat 8ths from bar 2, 16ths (quiet) from drop
def hat(dec):
    n = int(0.08 * SR); t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 7500, 2) * np.exp(-t / dec)

for e16 in range(16, END_BEAT * 4):
    t = e16 * BEAT / 4
    if e16 % 4 == 2:
        place(music, hat(0.03), t, 0.15, 0.35)
    elif e16 >= DROP_BEAT * 4 and e16 % 2 == 1:
        place(music, hat(0.012), t, 0.06, -0.35)

# riser into the drop (4.0 -> 6.0 s)
n = int(2.0 * SR); t = np.arange(n) / SR
noise = rng.standard_normal(n)
riser = np.zeros(n)
for k in range(8):                                   # piecewise sweep
    a, b_ = k * n // 8, (k + 1) * n // 8
    lo = 300 * (1.6 ** k); riser[a:b_] = bp(noise, lo, min(lo * 2.2, 16000))[a:b_]
riser *= (t / 2.0) ** 2.2
place(music, riser, 4.0, 0.22)

# drop impact (sub boom) + end hit
def boom(dec=0.7):
    n = int(1.6 * SR); t = np.arange(n) / SR
    f = 38 + 30 * np.exp(-t / 0.08)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / dec)

place(music, boom(), bt(DROP_BEAT), 0.55)
place(music, boom(1.0), bt(END_BEAT), 0.6)

# end chord stab with long tail
n = int(2.0 * SR)
stab = np.zeros(n)
for m in CH['Fm'] + [65, 72]:
    stab += saw(hz(m + 12), n, rng.random()) + saw(hz(m + 12) * 1.003, n, rng.random())
stab = lp(stab, 2600, 2) * np.exp(-np.arange(n) / SR / 0.55) / 10
place(music, stab, bt(END_BEAT), 0.55)

# reverb (exp-decay noise IR) on the whole music bus, mixed wet 18 %
ir_n = int(1.6 * SR)
ir = rng.standard_normal((2, ir_n)) * np.exp(-np.arange(ir_n) / SR / 0.45)
ir = lp(ir, 5000)
ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True))
wet = np.stack([fftconvolve(music[c], ir[c])[:N] for c in range(2)])
music = music * 0.86 + wet * 0.18
music = hp(music, 28)

# fade the last 0.4 s so the file ends on silence
fade = int(0.4 * SR)
music[:, -fade:] *= np.linspace(1, 0, fade) ** 2

# ---------------- SFX ----------------
sfx = np.zeros((2, N))
events = []


def whoosh(peak_t, length=0.55, gain=0.20, pan=0.0, label='whoosh'):
    n = int(length * SR); t = np.arange(n) / SR
    x = rng.standard_normal(n)
    x = bp(x, 1100, 4200)
    pk = length * 0.7
    e = np.where(t < pk, (t / pk) ** 2.5, np.exp(-(t - pk) / 0.07))
    pans = np.linspace(-0.6, 0.6, n) if pan == 0 else np.full(n, pan)
    l, r = np.cos((pans + 1) * np.pi / 4), np.sin((pans + 1) * np.pi / 4)
    i = int((peak_t - pk) * SR)
    sfx[0, i:i + n] += x * e * gain * l * 1.414
    sfx[1, i:i + n] += x * e * gain * r * 1.414
    events.append({'type': label, 'time': round(peak_t, 4), 'frame': round(peak_t * FPS)})


def click(t0, gain=0.14, label='click'):
    n = int(0.05 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 4200 * t) * np.exp(-t / 0.006) + bp(rng.standard_normal(n), 3000, 7000) * np.exp(-t / 0.004) * 0.6
    place(sfx, x, t0, gain)
    events.append({'type': label, 'time': round(t0, 4), 'frame': round(t0 * FPS)})


def clack(t0, gain=0.35, label='impact'):
    n = int(0.3 * SR); t = np.arange(n) / SR
    x = bp(rng.standard_normal(n), 650, 1900, 3) * np.exp(-t / 0.05)
    x += np.sin(2 * np.pi * 900 * t) * np.exp(-t / 0.03) * 0.5
    place(sfx, x, t0, gain)
    events.append({'type': label, 'time': round(t0, 4), 'frame': round(t0 * FPS)})


def tick(t0, gain=0.16, label='tick'):
    n = int(0.03 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 5000 * t) * np.exp(-t / 0.006)
    place(sfx, x, t0, gain, 0.2)
    events.append({'type': label, 'time': round(t0, 4), 'frame': round(t0 * FPS)})


def thunk(t0, gain=0.3, label='thunk'):
    n = int(0.35 * SR); t = np.arange(n) / SR
    f = 260 + 160 * np.exp(-t / 0.02)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.08)
    place(sfx, bp(x, 180, 600), t0, gain)
    events.append({'type': label, 'time': round(t0, 4), 'frame': round(t0 * FPS)})


whoosh(1.0, 0.45, 0.14, label='headline_land')  # code string lands as the hero headline
whoosh(2.0, 0.55, 0.20)                       # editor falls away -> hero
click(2.5, label='button_land')               # highlight lands as the Explore button
whoosh(4.6, 0.55, 0.18)                       # button expands into the full-frame 80 plate
clack(6.0, label='header_snap')               # plate collapses into the header: solid on the drop
whoosh(8.0, 0.55, 0.20)                       # dive into the New Items card
whoosh(10.0, 0.5, 0.18)                       # pull back to the row of 4
whoosh(11.5, 0.55, 0.30)                      # -> Hot Collections
for k in range(5):
    tick(12.0 + k * 0.25, label='tile_land')  # 8th-note stagger
whoosh(14.5, 0.55, 0.30)                      # -> guide card
thunk(15.0, label='glyph_swing')              # cursor hover starts the -25deg swing
whoosh(16.0, 0.6, 0.22)                       # icon tile flies to camera -> full-frame type

os.makedirs(os.path.join(ROOT, 'audio'), exist_ok=True)
wavfile.write(os.path.join(ROOT, 'audio/music_raw.wav'), SR, music.T.astype(np.float32))
wavfile.write(os.path.join(ROOT, 'audio/sfx_raw.wav'), SR, sfx.T.astype(np.float32))

beats = [{'beat': b, 'time': round(bt(b), 4), 'frame': b * 30} for b in range(int(DUR / BEAT))]
timing = {
    'fps': FPS, 'bpm': BPM, 'duration_s': DUR, 'frames': int(DUR * FPS), 'frames_per_beat': 30,
    'beats': beats,
    'drop': {'time': bt(DROP_BEAT), 'frame': DROP_BEAT * 30},
    'end_hit': {'time': bt(END_BEAT), 'frame': END_BEAT * 30},
    'voice': [],
    'sfx': events,
    'scenes': [
        {'id': 'code', 'in': 0, 'out': 120},
        {'id': 'hero', 'in': 120, 'out': 276},
        {'id': 'eighty', 'in': 276, 'out': 360},
        {'id': 'scroll', 'in': 360, 'out': 480},
        {'id': 'items', 'in': 480, 'out': 690},
        {'id': 'collections', 'in': 690, 'out': 870},
        {'id': 'guide', 'in': 870, 'out': 960},
        {'id': 'type', 'in': 960, 'out': 1080},
        {'id': 'end', 'in': 1080, 'out': 1200},
    ],
    'actions': {
        'headline_land': 60, 'editor_out': 120, 'button_land': 150, 'plate_open': 276,
        'header_snap': 360, 'dive': 480, 'avatar_hover': 516, 'hover': 540, 'heart_hover': 570, 'pullback': 600,
        'collections_in': 690, 'tile0': 720, 'tile_step': 15, 'guide_in': 870, 'guide_hover': 900,
        'glyph_swing': 900, 'fly_to_camera': 960, 'type_a': 975, 'type_b': 996, 'end_hit': 1080,
    },
}
with open(os.path.join(ROOT, 'timing.json'), 'w') as f:
    json.dump(timing, f, indent=1)
print('ok', len(events), 'sfx events')
