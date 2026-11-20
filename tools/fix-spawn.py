from pathlib import Path
p = Path(r'D:\桌面\田园小镇\godot\scripts\main.gd')
t = p.read_text(encoding='utf-8')
# 出生点与默认镜头改到村庄
t = t.replace('"x": 26.0, "y": 13.0, "dir": "down"', '"x": 26.0, "y": 24.0, "dir": "down"')
t = t.replace('"x": 27.0, "y": 14.0, "dir": "down"', '"x": 27.0, "y": 25.0, "dir": "down"')
t = t.replace('var cam := Vector2(17, 11)', 'var cam := Vector2(24, 26)')
# _start：目标不可达就放弃
t = t.replace('''\tv.path = _path_to(Vector2i(int(v.x), int(v.y)), Vector2i(tx, ty))
\tv.state = "task"
\treturn true''', '''\tv.path = _path_to(Vector2i(int(v.x), int(v.y)), Vector2i(tx, ty))
\tif v.path.is_empty() and abs(float(tx) - float(v.x)) + abs(float(ty) - float(v.y)) > 1.5:
\t\tv.task = null
\t\t_show_toast("%s 过不去那边" % v.name)
\t\treturn false
\tv.state = "task"
\treturn true''')
# _tick_desire：走不到就放弃念头
t = t.replace('''\t\t\tif v.path.is_empty():
\t\t\t\tv.path = _path_to(Vector2i(int(v.x), int(v.y)), Vector2i(int(des.x), int(des.y)))
\t\t\t\tv.state = "wander"
\t\t\t_walk(v, dt)
\t\t\treturn true''', '''\t\t\tif v.path.is_empty():
\t\t\t\tv.path = _path_to(Vector2i(int(v.x), int(v.y)), Vector2i(int(des.x), int(des.y)))
\t\t\t\tif v.path.is_empty():
\t\t\t\t\tv.desire = null
\t\t\t\t\tv.desire_cd = 6.0
\t\t\t\t\treturn false
\t\t\t\tv.state = "wander"
\t\t\t_walk(v, dt)
\t\t\treturn true''')
# 湖边意愿需要先解锁
t = t.replace('''\tif v.id == "xiaowei":
\t\tif weather != "storm":
\t\t\toptions.append({"id": "riverside", "label": "去河边坐坐"''', '''\tif v.id == "xiaowei":
\t\tif weather != "storm" and unlocked.lake:
\t\t\toptions.append({"id": "riverside", "label": "去湖边坐坐"''')
t = t.replace('if hr > 6.0 and hr < 20.0 and weather != "storm":\n\t\t\toptions.append({"id": "fish"',
              'if hr > 6.0 and hr < 20.0 and weather != "storm" and unlocked.lake:\n\t\t\toptions.append({"id": "fish"')
p.write_text(t, encoding='utf-8')
print('spawn/camera/guard patched')
