from PIL import Image
from pathlib import Path

src = Image.open(r'D:\桌面\田园小镇\shots\260-ui-portrait.png').convert('RGB')
w, h = src.size
side = min(w, h)
# 取画面偏上部分（能看到村庄和 HUD），更像游戏图标
top = int(h * 0.16)
if top + side > h:
    top = h - side
box = ((w - side) // 2, top, (w - side) // 2 + side, top + side)
icon = src.crop(box)
out = Path(r'D:\桌面\田园小镇\icons')
out.mkdir(exist_ok=True)
for size in (192, 512):
    icon.resize((size, size), Image.LANCZOS).save(out / f'icon-{size}.png')
print('icons written', list(out.iterdir()))
