"""Measured quality bar for one render: python3 tools/qa.py out/frames_16x9 out/r1_16x9.mp4 [sheetdir]
- duration/size/fps from ffprobe
- frozen detection from consecutive-frame difference
- brand colour presence
- loudness / true peak of the muxed audio
- writes contact sheets: every 0.2 s (critic), 2 fps silent sheet (sound-off read), 16-frame deliverable sheet"""
import json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw

frames_dir, mp4 = sys.argv[1], sys.argv[2]
sheet_dir = sys.argv[3] if len(sys.argv) > 3 else os.path.dirname(mp4)
tag = os.path.splitext(os.path.basename(mp4))[0]
files = sorted(f for f in os.listdir(frames_dir) if f.endswith('.png'))
rep = {}

pr = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate,nb_frames,duration', '-of', 'json', mp4]))
v = [s for s in pr['streams'] if s['codec_type'] == 'video'][0]
rep['video'] = {'w': v['width'], 'h': v['height'], 'fps': v['r_frame_rate'], 'frames': int(v['nb_frames']), 'duration': float(v['duration'])}

# motion: mean abs diff on 1/8 downscale
prev = None; diffs = []
for f in files:
    im = np.asarray(Image.open(os.path.join(frames_dir, f)).convert('L').reduce(8), dtype=np.float32)
    if prev is not None: diffs.append(float(np.abs(im - prev).mean()))
    prev = im
diffs = np.array(diffs)
still = diffs < 0.08          # visually frozen (sub-perceptual change)
runs, cur = [], 0
for i, s in enumerate(still):
    if s: cur += 1
    else:
        if cur: runs.append((i - cur + 1, cur))
        cur = 0
if cur: runs.append((len(still) - cur + 1, cur))
rep['frozen_total_s'] = round(float(still.sum()) / 60, 3)
rep['longest_still'] = max(runs, key=lambda r: r[1]) if runs else None
rep['still_runs_over_0.5s'] = [(s, round(n / 60, 2)) for s, n in runs if n > 30]
rep['diff_percentiles'] = [round(float(np.percentile(diffs, p)), 3) for p in (5, 25, 50, 75, 95)]

# frame one: not black/empty, has detail
f0 = np.asarray(Image.open(os.path.join(frames_dir, files[0])).convert('RGB'), dtype=np.float32)
rep['frame0'] = {'mean_luma': round(float(f0.mean()), 1), 'std': round(float(f0.std()), 1)}

# brand colours: share of pixels within dE<12 (RGB) of each brand colour across sampled frames
brand = {'#8364E2': (131, 100, 226), '#403f83': (64, 63, 131), '#212428': (33, 36, 40), '#282b2f': (40, 43, 47), '#ec7498': (236, 116, 152)}
hits = {k: 0 for k in brand}
for f in files[::30]:
    im = np.asarray(Image.open(os.path.join(frames_dir, f)).convert('RGB').reduce(4), dtype=np.float32)
    for k, c in brand.items():
        if (np.linalg.norm(im - np.array(c), axis=2) < 12).mean() > 0.0005: hits[k] += 1
rep['brand_colour_frames_of_%d' % len(files[::30])] = hits

# audio
out = subprocess.run(['ffmpeg', '-hide_banner', '-i', mp4, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
summ = out[out.rfind('Summary:'):]
def grab(key):
    for line in summ.splitlines():
        if line.strip().startswith(key): return line.split(':')[1].strip()
rep['audio'] = {'integrated': grab('I:'), 'true_peak': grab('Peak:'), 'lra': grab('LRA:')}

# contact sheets
def sheet(idx, cols, tw, path, label=True):
    ims = [Image.open(os.path.join(frames_dir, files[i])).convert('RGB') for i in idx]
    th = int(tw * ims[0].height / ims[0].width); pad = 16 if label else 0
    rows = (len(ims) + cols - 1) // cols
    sh = Image.new('RGB', (cols * tw, rows * (th + pad)), (0, 0, 0)); d = ImageDraw.Draw(sh)
    for k, (i, im) in enumerate(zip(idx, ims)):
        x, y = (k % cols) * tw, (k // cols) * (th + pad)
        sh.paste(im.resize((tw, th)), (x, y))
        if label: d.text((x + 3, y + th + 2), f'{i / 60:.2f}s f{i}', fill=(255, 230, 0))
    sh.save(path)
os.makedirs(sheet_dir, exist_ok=True)
portrait = rep['video']['h'] > rep['video']['w']
n = len(files)
for part in range(4):  # every 0.2 s, split in 4 sheets of 25
    idx = list(range(part * 300, min(n, part * 300 + 300), 12))
    sheet(idx, 5 if not portrait else 7, 384 if not portrait else 270, f'{sheet_dir}/{tag}_crit_{part}.png')
sheet(list(range(0, n, 30)), 5 if not portrait else 8, 384 if not portrait else 240, f'{sheet_dir}/{tag}_soundoff.png', label=False)
sheet([int(i) for i in np.linspace(0, n - 1, 16)], 4, 480 if not portrait else 270, f'{sheet_dir}/{tag}_contact.png')
json.dump(rep, open(f'{sheet_dir}/{tag}_qa.json', 'w'), indent=1)
print(json.dumps(rep, indent=1))
