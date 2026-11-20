from PIL import Image, ImageDraw, ImageFont
import os
base = r'D:\桌面\田园小镇\shots'
files = [('200-village.png','青禾村 · 村庄与农田'),('201-forest.png','后山林地 · 松树/白桦/矿洞'),('202-river.png','清溪河岸 · 垂柳与磨坊'),('203-fishing.png','河边渔村 · 湖湾与码头')]
W,H = 390,844
gap, margin, top = 12, 12, 64
canvas = Image.new('RGB',(margin*2+W*2+gap, top+H*2+gap+margin),(28,23,20))
d = ImageDraw.Draw(canvas)
try:
    font = ImageFont.truetype(r'C:\Windows\Fonts\msyh.ttc', 24)
    small = ImageFont.truetype(r'C:\Windows\Fonts\msyh.ttc', 16)
except Exception:
    font = ImageFont.load_default(); small = font
d.text((margin, 16), '田园小镇 · 区域地图', font=font, fill=(242,226,200))
for i,(fn,label) in enumerate(files):
    im = Image.open(os.path.join(base,fn)).convert('RGB').resize((W,H), Image.LANCZOS)
    x = margin + (i%2)*(W+gap)
    y = top + (i//2)*(H+gap)
    canvas.paste(im,(x,y))
    # 标签底
    d.rectangle((x, y, x+W, y+30), fill=(20,16,12))
    d.text((x+10, y+5), label, font=small, fill=(242,226,200))
out = os.path.join(base,'210-map-atlas.png')
canvas.save(out)
print(out, canvas.size)
