from pathlib import Path
p = Path(r'D:\桌面\田园小镇\godot\scripts\main.gd')
t = p.read_text(encoding='utf-8')
anchor = '\t\tif extra.has("night"):'
add = '''\t\tif extra.has("farm"):
\t\t\tcam = Vector2(12, 30)
\t\t\tzoom = 2.2
\t\tif extra.has("orchard"):
\t\t\tunlocked.orchard = true
\t\t\t_refresh_solid()
\t\t\tcam = Vector2(20, 9)
\t\t\tzoom = 2.0
\t\tif extra.has("forest"):
\t\t\tunlocked.forest = true
\t\t\t_refresh_solid()
\t\t\tcam = Vector2(62, 14)
\t\t\tzoom = 2.0
\t\tif extra.has("lake"):
\t\t\tunlocked.lake = true
\t\t\t_refresh_solid()
\t\t\tcam = Vector2(60, 42)
\t\t\tzoom = 2.0
\t\tif extra.has("closeup"):
\t\t\tcam = Vector2(26.5, 24.6)
\t\t\tzoom = 3.4
'''
assert anchor in t
t = t.replace(anchor, add + anchor, 1)
p.write_text(t, encoding='utf-8')
print('shot args added')
