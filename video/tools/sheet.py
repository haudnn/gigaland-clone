import sys, glob
from PIL import Image, ImageDraw
src, dst = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 4
tw = int(sys.argv[4]) if len(sys.argv) > 4 else 480
fs = sorted(glob.glob(src + '/*.png'))
im0 = Image.open(fs[0]); th = int(tw * im0.height / im0.width)
rows = (len(fs) + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw, rows * (th + 18)), (0, 0, 0)); d = ImageDraw.Draw(sheet)
for i, f in enumerate(fs):
    x, y = (i % cols) * tw, (i // cols) * (th + 18)
    sheet.paste(Image.open(f).convert('RGB').resize((tw, th)), (x, y)); d.text((x + 4, y + th + 2), f.split('/')[-1], fill=(255, 255, 0))
sheet.save(dst)
