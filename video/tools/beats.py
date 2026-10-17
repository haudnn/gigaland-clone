"""Detect beats/onsets in the rendered music and check them against timing.json.
Also measures each sfx event's band level vs the music in the same band.
Writes detected beats into timing.json['detected'] and prints a report."""
import json, os
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, find_peaks

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = json.load(open(os.path.join(ROOT, 'timing.json')))
FPS = T['fps']

def load(p):
    sr, x = wavfile.read(os.path.join(ROOT, p))
    x = x.astype(np.float64)
    if x.dtype.kind == 'i' or np.abs(x).max() > 2: x /= 32768.0
    return sr, x.mean(axis=1)

sr, m = load('audio/music_only.wav')
hop = 128
# spectral-flux onset envelope (low band = kick)
low = sosfilt(butter(2, 400, 'low', fs=sr, output='sos'), m)
frames = len(low) // hop
env = np.array([np.sqrt(np.mean(low[i*hop:(i+1)*hop]**2)) for i in range(frames)])
flux = np.maximum(0, np.diff(env, prepend=env[0]))
peaks, _ = find_peaks(flux, height=flux.max()*0.5, distance=int(0.3*sr/hop))
onsets = peaks * hop / sr
# tempo by autocorrelation of flux
ac = np.correlate(flux - flux.mean(), flux - flux.mean(), 'full')[len(flux)-1:]
lags = np.arange(len(ac)) * hop / sr
rng = (lags > 0.3) & (lags < 1.0)
period = lags[rng][np.argmax(ac[rng])]
bpm = 60 / period
grid = [b['time'] for b in T['beats']]
# local kick onset near each expected beat: max rise of a fine low-band envelope within +-120 ms
fh = 32
fenv = np.array([np.sqrt(np.mean(low[i*fh:(i+1)*fh]**2)) for i in range(len(low)//fh)])
dfe = np.diff(fenv, prepend=fenv[0])
errs = []
kick_beats = [b for b in range(4, 36) if b >= 12 or b % 2 == 0] + [36]  # schedule from audio.py
for g in [b * 0.5 for b in kick_beats]:
    i0, i1 = max(0, int((g-0.12)*sr/fh)), int((g+0.12)*sr/fh)
    seg = dfe[i0:i1]
    e_ = ((i0 + np.argmax(seg))*fh/sr - g) * FPS
    errs.append(e_)
    if abs(e_) > 1: print(f'  off-grid kick near {g:.2f}s: {e_:+.2f} f')
errs = np.array(errs)
print(f'detected tempo {bpm:.2f} BPM (target {T["bpm"]})')
print(f'kicks found on {len(errs)} beats; offset frames mean {errs.mean():+.2f}, max |{np.abs(errs).max():.2f}|')
T['detected'] = {'bpm': round(float(bpm), 2), 'kick_onsets_s': [round(float(o), 4) for o in onsets],
                 'max_offset_frames': round(float(np.abs(errs).max()), 2)}

# sfx vs music in-band level at each event (+-60 ms)
_, mix = load('audio/mix.wav')
_, sfx = wavfile.read(os.path.join(ROOT, 'audio/sfx_raw.wav')); sfx = sfx.mean(axis=1)
_, mus = wavfile.read(os.path.join(ROOT, 'audio/music_raw.wav')); mus = mus.mean(axis=1)
bands = {'whoosh': (1100, 4200), 'headline_land': (1100, 4200), 'button_land': (3000, 7000), 'header_snap': (650, 1900),
         'tile_land': (4500, 5500), 'glyph_swing': (180, 600)}
print('event          t     sfx-vs-music in band (dB)')
rows = []
for e in T['sfx']:
    lo, hi = bands.get(e['type'], (1000, 4000))
    sos = butter(4, [lo, hi], 'band', fs=sr, output='sos')
    i0, i1 = int((e['time'] - 0.06) * sr), int((e['time'] + 0.06) * sr)
    a = sosfilt(sos, sfx)[i0:i1]; b = sosfilt(sos, mus)[i0:i1]
    d = 20*np.log10(np.sqrt(np.mean(a**2))+1e-9) - 20*np.log10(np.sqrt(np.mean(b**2))+1e-9)
    rows.append((e['type'], e['time'], round(float(d), 1)))
    print(f'{e["type"]:14s} {e["time"]:5.2f} {d:+6.1f}')
T['sfx_band_margin_db'] = rows
json.dump(T, open(os.path.join(ROOT, 'timing.json'), 'w'), indent=1)
