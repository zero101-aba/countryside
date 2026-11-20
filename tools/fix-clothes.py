from pathlib import Path
p = Path(r'D:\桌面\田园小镇\godot\scripts\main.gd')
t = p.read_text(encoding='utf-8')
# 给村民补上基础衣着
t = t.replace('"skin": Color("#f0c9a8"), "hair": Color("#1c1a1a"),',
              '"skin": Color("#f0c9a8"), "hair": Color("#1c1a1a"),\n\t\t\t"shirt": Color("#2a2a30"), "pants": Color("#93aecb"),')
t = t.replace('"skin": Color("#f6d6c0"), "hair": Color("#241c22"),',
              '"skin": Color("#f6d6c0"), "hair": Color("#241c22"),\n\t\t\t"shirt": Color("#f4efe6"), "pants": Color("#b9b2a6"),')
# _colors_for 用本人的基础色
t = t.replace('"skin": v.skin, "hair": v.hair, "shirt": Color("#2a2a30"), "pants": Color("#93aecb"),',
              '"skin": v.skin, "hair": v.hair, "shirt": v.get("shirt", Color("#2a2a30")), "pants": v.get("pants", Color("#93aecb")),')
p.write_text(t, encoding='utf-8')
print('base clothes fixed')
