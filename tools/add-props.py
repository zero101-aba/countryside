from pathlib import Path
p = Path(r'D:\桌面\田园小镇\godot\scripts\main.gd')
t = p.read_text(encoding='utf-8')
# 增加湖畔 / 林地 / 村里的细节道具
t = t.replace('''\t\t{"type": "lamp", "x": 56, "y": 36},
\t]''', '''\t\t{"type": "lamp", "x": 56, "y": 36},
\t\t{"type": "reeds", "x": 53, "y": 41},
\t\t{"type": "reeds", "x": 59, "y": 42},
\t\t{"type": "reeds", "x": 62, "y": 41},
\t\t{"type": "boat", "x": 55, "y": 43},
\t\t{"type": "campfire", "x": 53, "y": 27},
\t\t{"type": "stump", "x": 60, "y": 9},
\t\t{"type": "stump", "x": 68, "y": 17},
\t\t{"type": "bench", "x": 24, "y": 23},
\t\t{"type": "bench", "x": 34, "y": 27},
\t\t{"type": "sign", "x": 41, "y": 36},
\t]''')
# 绘制这些道具
anchor = '\t\t"lamp":'
add = '''\t\t"reeds":
\t\t\tfor i in 3:
\t\t\t\tdraw_rect(Rect2(p + Vector2(4 + i * 4, 8) * z, Vector2(2 * z, 12 * z)), Color("#4f8f48"))
\t\t\t\tdraw_rect(Rect2(p + Vector2(3 + i * 4, 6) * z, Vector2(4 * z, 3 * z)), Color("#8a6a4a"))
\t\t"boat":
\t\t\tdraw_colored_polygon(PackedVector2Array([
\t\t\t\tp + Vector2(2, 10) * z, p + Vector2(20, 10) * z, p + Vector2(16, 16) * z, p + Vector2(6, 16) * z]), Color("#8a5c35"))
\t\t\tdraw_rect(Rect2(p + Vector2(4, 8) * z, Vector2(14 * z, 2 * z)), Color("#c9ab7c"))
\t\t\tdraw_line(p + Vector2(11, 8) * z, p + Vector2(11, 0) * z, Color("#6b5a44"), 1.0 * z)
\t\t"campfire":
\t\t\tdraw_rect(Rect2(p + Vector2(4, 14) * z, Vector2(14 * z, 3 * z)), Color("#5a4a3a"))
\t\t\tvar fl: float = 0.6 + 0.4 * sin(Time.get_ticks_msec() / 160.0)
\t\t\tdraw_colored_polygon(PackedVector2Array([
\t\t\t\tp + Vector2(11, 6 + fl) * z, p + Vector2(7, 15) * z, p + Vector2(15, 15) * z]), Color("#e8823c"))
\t\t\tdraw_colored_polygon(PackedVector2Array([
\t\t\t\tp + Vector2(11, 9 + fl) * z, p + Vector2(9, 15) * z, p + Vector2(13, 15) * z]), Color("#f2c14e"))
\t\t"stump":
\t\t\tdraw_rect(Rect2(p + Vector2(6, 12) * z, Vector2(12 * z, 8 * z)), Color("#6b4526"))
\t\t\tdraw_rect(Rect2(p + Vector2(6, 11) * z, Vector2(12 * z, 3 * z)), Color("#c9ab7c"))
\t\t"bench":
\t\t\tdraw_rect(Rect2(p + Vector2(3, 12) * z, Vector2(18 * z, 3 * z)), Color("#a9743f"))
\t\t\tdraw_rect(Rect2(p + Vector2(4, 15) * z, Vector2(3 * z, 6 * z)), Color("#8a5c35"))
\t\t\tdraw_rect(Rect2(p + Vector2(17, 15) * z, Vector2(3 * z, 6 * z)), Color("#8a5c35"))
'''
assert anchor in t
t = t.replace(anchor, add + anchor, 1)
p.write_text(t, encoding='utf-8')
print('props added')
