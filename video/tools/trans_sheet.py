import sys
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]
evs=[('headline_land',60),('editor_out',100),('button_land',150),('plate_open',276),('cross_80',354),('header_snap',360),('dive',480),('heart_hover',570),('pullback',600),('collections_in',690),('tile0',720),('guide_in',870),('glyph_swing',900),('fly_to_camera',960),('end_hit',1080)]
im0=Image.open(f'{d}/00000.png'); portrait=im0.height>im0.width
tw,th=(180,320) if portrait else (320,180)
cols=9
sh=Image.new('RGB',(cols*tw,len(evs)*(th+16)),(0,0,0)); dr=ImageDraw.Draw(sh)
for r,(name,fr) in enumerate(evs):
    for c,off in enumerate(range(-12,15,3)):
        f=min(1199,max(0,fr+off))
        x,y=c*tw,r*(th+16); sh.paste(Image.open(f'{d}/{f:05d}.png').convert('RGB').resize((tw,th)),(x,y)); dr.text((x+3,y+th+2),f'{name} f{f}',fill=(255,230,0))
sh.save(out)
