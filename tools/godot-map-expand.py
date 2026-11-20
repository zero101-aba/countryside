from pathlib import Path

# ================= data.gd =================
d = Path(r'D:\桌面\田园小镇\godot\scripts\data.gd')
dt = d.read_text(encoding='utf-8')
dt = dt.replace('const MAP_W := 56\nconst MAP_H := 40', 'const MAP_W := 80\nconst MAP_H := 56')
old_regions = dt[dt.index('const REGIONS := ['):dt.index('const TIPS := [')]
new_regions = '''const REGIONS := [
	{"id": "orchard", "name": "西岭果园", "x0": 0, "y0": 0, "x1": 44, "y1": 17, "unlock": "播种 3 次", "stage": 2},
	{"id": "village", "name": "青禾村", "x0": 0, "y0": 18, "x1": 44, "y1": 55, "unlock": "开局", "stage": -1},
	{"id": "forest", "name": "后山林地", "x0": 49, "y0": 0, "x1": 79, "y1": 31, "unlock": "累计收获 10 次", "stage": 4},
	{"id": "lake", "name": "湖畔渔村", "x0": 49, "y0": 32, "x1": 79, "y1": 55, "unlock": "第 2 天", "stage": -1},
]

'''
dt = dt.replace(old_regions, new_regions, 1)
dt = dt.replace('{"id": "regions3", "name": "走遍小镇", "desc": "解锁全部 3 个区域", "reward": 150},',
                '{"id": "regions4", "name": "走遍小镇", "desc": "解锁全部 4 个区域", "reward": 150},')
dt = dt.replace('''	"点一个村民，他会选中并跟随；点底部输入框直接说人话。",''',
                '''	"点一个村民，他会选中并跟随；点底部输入框直接说人话。",
	"地图更大了：西边果园、南边村庄、东边林地与湖畔渔村。",''')
d.write_text(dt, encoding='utf-8')

# ================= main.gd =================
p = Path(r'D:\桌面\田园小镇\godot\scripts\main.gd')
t = p.read_text(encoding='utf-8')

# ---- 解锁状态：4 区域 ----
t = t.replace('var unlocked := {"village": true, "river": false, "forest": false}',
              'var unlocked := {"village": true, "orchard": false, "forest": false, "lake": false}')

# ---- 世界生成 ----
a = t.index("func _build_world() -> void:")
b = t.index("func _build_astar() -> void:")
world = '''func _build_world() -> void:
\ttiles.resize(W * H)
\tvariant.resize(W * H)
\ttiles.fill(0)
\tfor i in variant.size():
\t\tvariant[i] = randi() % 4
\t# 纵向河流
\tfor y in H:
\t\tfor x in range(45, 49):
\t\t\ttiles[y * W + x] = 3
\t\ttiles[y * W + 44] = 4
\t\ttiles[y * W + 49] = 4
\t# 东南湖湾
\tfor y in range(43, 56):
\t\tfor x in range(53, 80):
\t\t\ttiles[y * W + x] = 3
\tfor x in range(53, 80):
\t\ttiles[42 * W + x] = 4
\tfor y in range(43, 56):
\t\ttiles[y * W + 52] = 4
\t# 两座木桥
\tfor y in [22, 23]:
\t\tfor x in range(44, 50):
\t\t\ttiles[y * W + x] = 2
\tfor y in [44, 45]:
\t\tfor x in range(44, 53):
\t\t\ttiles[y * W + x] = 2
\t# 道路：西岸主干与横路
\tfor y in range(0, 56):
\t\ttiles[y * W + 40] = 2
\tfor x in range(2, 80):
\t\ttiles[22 * W + x] = 2
\tfor x in range(2, 45):
\t\ttiles[36 * W + x] = 2
\tfor x in range(49, 79):
\t\ttiles[36 * W + x] = 2
\tfor x in range(2, 40):
\t\ttiles[28 * W + x] = 2
\tfor y in range(18, 28):
\t\ttiles[y * W + 40] = 2
\t# 东岸：林地路与湖畔路
\tfor x in range(50, 79):
\t\ttiles[20 * W + x] = 2
\t\ttiles[40 * W + x] = 2
\t# 广场与码头
\tfor y in range(17, 20):
\t\tfor x in range(30, 37):
\t\t\ttiles[y * W + x] = 6
\tfor y in range(41, 43):
\t\tfor x in range(52, 58):
\t\t\ttiles[y * W + x] = 6
\t# 农田 10 × 5
\tfor r in range(5):
\t\tfor c in range(10):
\t\t\tvar px := 4 + c * 2
\t\t\tvar py := 26 + r * 2
\t\t\ttiles[py * W + px] = 5
\t\t\tplots[Vector2i(px, py)] = {"state": "grass", "crop": "", "growth": 0.0, "wet_until": 0.0, "announced": false}
\tbuildings = [
\t\t{"x": 4, "y": 20, "w": 6, "h": 4, "name": "小伟家", "roof": Color("#c0574a")},
\t\t{"x": 12, "y": 20, "w": 5, "h": 4, "name": "小杨家", "roof": Color("#7a5a8a")},
\t\t{"x": 20, "y": 20, "w": 5, "h": 3, "name": "农舍", "roof": Color("#8a6a4a")},
\t\t{"x": 28, "y": 17, "w": 7, "h": 3, "name": "集市", "roof": Color("#c25b4e")},
\t\t{"x": 24, "y": 30, "w": 5, "h": 3, "name": "酒馆", "roof": Color("#a8663c")},
\t\t{"x": 32, "y": 26, "w": 5, "h": 3, "name": "仓库", "roof": Color("#7a6a4a")},
\t\t{"x": 4, "y": 38, "w": 6, "h": 4, "name": "谷仓", "roof": Color("#8a6a4a")},
\t\t{"x": 14, "y": 40, "w": 5, "h": 4, "name": "风车", "roof": Color("#5f7fa8")},
\t\t{"x": 52, "y": 24, "w": 5, "h": 3, "name": "矿工小屋", "roof": Color("#6b6b72")},
\t\t{"x": 54, "y": 34, "w": 5, "h": 3, "name": "渔家", "roof": Color("#5a7a8a")},
\t]
\t# 果园（西北）
\tfor r in range(5):
\t\tfor c in range(8):
\t\t\tvar tx := 4 + c * 5
\t\t\tvar ty := 3 + r * 3
\t\t\ttrees.append({"x": tx, "y": ty, "chopped": false, "fruit": true})
\t# 林地（东北）
\tfor r in range(7):
\t\tfor c in range(6):
\t\t\ttrees.append({"x": 52 + c * 5 + (r % 2) * 2, "y": 3 + r * 4, "chopped": false, "fruit": false})
\t# 湖畔柳树
\tfor i in 7:
\t\ttrees.append({"x": 50 + i * 4, "y": 34 + (i % 3), "chopped": false, "fruit": false})
\t# 村里零散树
\tfor p2 in [[2, 24], [2, 32], [30, 45], [36, 50], [20, 50], [8, 47], [42, 30], [42, 12]]:
\t\ttrees.append({"x": p2[0], "y": p2[1], "chopped": false, "fruit": randf() < 0.4})
\t# 矿点
\tfor p3 in [[54, 8], [58, 12], [64, 6], [70, 10], [76, 14], [56, 18], [62, 22], [68, 26],
\t\t\t[74, 20], [60, 28], [66, 30], [72, 4], [78, 24], [52, 14]]:
\t\trocks.append({"x": p3[0], "y": p3[1], "mined": false, "ore": randf() < 0.45})
\tprops = [
\t\t{"type": "questboard", "x": 36, "y": 21},
\t\t{"type": "clothshop", "x": 26, "y": 15},
\t\t{"type": "flowerbed", "x": 10, "y": 38},
\t\t{"type": "flowerbed", "x": 30, "y": 44},
\t\t{"type": "flowerbed", "x": 20, "y": 14},
\t\t{"type": "well", "x": 16, "y": 25},
\t\t{"type": "well", "x": 58, "y": 40},
\t\t{"type": "mill", "x": 14, "y": 40},
\t\t{"type": "sign", "x": 43, "y": 21},
\t\t{"type": "sign", "x": 50, "y": 41},
\t\t{"type": "lamp", "x": 30, "y": 22},
\t\t{"type": "lamp", "x": 12, "y": 28},
\t\t{"type": "lamp", "x": 56, "y": 36},
\t]
\t# 牧场：鸡圈 + 牛羊牧场 + 湖鸭
\tvar herds: Array = [
\t\t{"kind": "chicken", "n": 4, "x": 36.0, "y": 36.0, "product": "egg", "every": 10.0},
\t\t{"kind": "chick", "n": 2, "x": 37.0, "y": 37.5, "product": "", "every": 0.0},
\t\t{"kind": "cow", "n": 2, "x": 8.0, "y": 45.0, "product": "milk", "every": 12.0},
\t\t{"kind": "calf", "n": 1, "x": 11.0, "y": 47.0, "product": "", "every": 0.0},
\t\t{"kind": "sheep", "n": 3, "x": 6.0, "y": 50.0, "product": "wool", "every": 16.0},
\t\t{"kind": "lamb", "n": 1, "x": 10.0, "y": 51.0, "product": "", "every": 0.0},
\t\t{"kind": "duck", "n": 3, "x": 54.0, "y": 38.0, "product": "egg", "every": 11.0},
\t\t{"kind": "duckling", "n": 1, "x": 56.0, "y": 39.5, "product": "", "every": 0.0},
\t\t{"kind": "goose", "n": 2, "x": 52.0, "y": 40.0, "product": "egg", "every": 13.0},
\t\t{"kind": "cat", "n": 1, "x": 24.0, "y": 24.0, "product": "", "every": 0.0},
\t\t{"kind": "dog", "n": 1, "x": 27.0, "y": 22.0, "product": "", "every": 0.0},
\t]
\tfor h in herds:
\t\tfor i in h.n:
\t\t\tanimals.append({
\t\t\t\t"kind": h.kind, "x": float(h.x) + randf() * 3.0, "y": float(h.y) + randf() * 2.0,
\t\t\t\t"tx": float(h.x), "ty": float(h.y), "t": randf() * 4.0, "dir": 1,
\t\t\t\t"product": h.product, "every": h.every, "prod_t": randf() * 5.0, "ready": false,
\t\t\t})
\t_build_astar()


'''
t = t[:a] + world + t[b:]

# ---- 坐标相关补丁 ----
repl = [
    ('"x": 45.0, "y": 30.0, "hold": 5.0, "line": "河边风不错。"', '"x": 57.0, "y": 41.0, "hold": 5.0, "line": "湖边风不错。"'),
    ('"type": "fish", "x": 45, "y": 28', '"type": "fish", "x": 57, "y": 41'),
    ('"x": 6.0, "y": 7.5, "hold": 5.0', '"x": 6.0, "y": 24.0, "hold": 5.0'),
    ('"x": 17.0, "y": 11.5, "hold": 4.0', '"x": 20.0, "y": 14.0, "hold": 4.0'),
    ('"x": 8.0, "y": 7.0, "hold": 4.0', '"x": 6.0, "y": 22.0, "hold": 4.0'),
    ('"x": 27.0, "y": 12.6, "hold": 2.5', '"x": 31.0, "y": 21.0, "hold": 2.5'),
    ('return [Vector2i(45, 28)]', 'return [Vector2i(57, 41)]'),
    ('if not r.mined and r.x >= 34 and r.y <= 25:', 'if not r.mined and r.x >= 49 and r.y <= 31:'),
    ('if day >= 2 and not unlocked.river:\n\t\tunlocked.river = true', 'if day >= 2 and not unlocked.lake:\n\t\tunlocked.lake = true'),
    ('\t\t_show_card("发现新区域", "清溪河岸")\n\t\t_log("解锁区域：清溪河岸")', '\t\t_show_card("发现新区域", "湖畔渔村")\n\t\t_log("解锁区域：湖畔渔村")'),
    ('_show_toast("清溪河岸还没解锁：第 2 天开放")', '_show_toast("湖畔渔村还没解锁：第 2 天开放")'),
    ('_show_toast("清溪河岸还没解锁：第 2 天开放")\n\t\t\treturn out', '_show_toast("湖畔渔村还没解锁：第 2 天开放")\n\t\t\treturn out'),
    ('"青禾村%s 清溪河岸%s 后山林地%s" % [\n\t\t"✔" if unlocked.village else "✘", "✔" if unlocked.river else "✘", "✔" if unlocked.forest else "✘"]',
     '"青禾村%s 西岭果园%s 后山林地%s 湖畔渔村%s" % [\n\t\t"✔" if unlocked.village else "✘", "✔" if unlocked.orchard else "✘",\n\t\t"✔" if unlocked.forest else "✘", "✔" if unlocked.lake else "✘"]'),
    ('"区域随天数与阶段解锁"', '"区域随天数与阶段解锁"'),
]
for old, new in repl:
    t = t.replace(old, new)

# 阶段解锁：果园随「牧歌」、林地随「进山」
t = t.replace('''\t\tif st.feature == "mine":
\t\t\tunlocked.forest = true''', '''\t\tif st.feature == "collect":
\t\t\tunlocked.orchard = true
\t\tif st.feature == "mine":
\t\t\tunlocked.forest = true''')

# 读档：合并 4 区域键
t = t.replace('\tunlocked = parsed.get("unlocked", unlocked)',
              '\tvar loaded_unlocked: Dictionary = parsed.get("unlocked", {})\n\tfor k2 in loaded_unlocked.keys():\n\t\tif unlocked.has(k2):\n\t\t\tunlocked[k2] = loaded_unlocked[k2]')

p.write_text(t, encoding='utf-8')
print('map + regions updated, lines =', len(t.splitlines()))
