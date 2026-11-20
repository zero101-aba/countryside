extends Node2D
const D = preload("res://scripts/data.gd")
# 田园小镇 · Godot 版 v2（优化版）
# 三区域 / 5 作物与季节 / 17 只动物 / 自主意愿 / 情绪五维 / 委托与成就 / 速度与跳夜 / 服装店 / 存档

const TILE := D.TILE
const W := D.MAP_W
const H := D.MAP_H
const HOUR_SECONDS := D.HOUR_SECONDS

var tiles: PackedInt32Array = PackedInt32Array()
var variant: PackedInt32Array = PackedInt32Array()
var plots := {}
var trees: Array = []
var rocks: Array = []
var buildings: Array = []
var props: Array = []
var animals: Array = []
var astar: AStarGrid2D

var money := 140
var seeds := {"radish": 6, "turnip": 2, "carrot": 1}
var inventory := {"bread": 4, "wood": 3, "fish": 0, "stone": 0, "ore": 0, "egg": 0, "milk": 0, "wool": 0}
var abs_hours := 7.0
var weather := "sunny"
var stage_index := 0
var stage_flags := {"quests": false, "collect": false, "autoskip": false, "speed8": false, "mine": false,
	"fish_bonus": false, "ore_bonus": false, "ai_auto": false, "title": false}
var owned_outfits := {"xiaowei": ["default"], "xiaoyang": ["default"]}
var equipped_outfit := {"xiaowei": "default", "xiaoyang": "default"}
var stats := {"harvested": 0, "planted": 0, "wood": 0, "fish": 0, "mined": 0, "collected": 0, "earned": 0}
var achievements := {}
var quests: Array = []
var quests_done := 0
var bond := 50.0
var auto_sell := true
var auto_skip_night := false
var speed := 1.0
var paused := false
var unlocked := {"village": true, "orchard": false, "forest": false, "lake": false}
var villagers: Array = []
var logs: Array = []
var _last_day := 1

var cam := Vector2(24, 26)
var zoom := 1.9
var dragging := false
var drag_last := Vector2.ZERO
var frames := 0
var selected := 0
var follow := -1
var toast := ""
var toast_t := 0.0
var card_t := 0.0
var hint := D.TIPS[0]

var ui: Control
var theme: Theme
var lbl_money: Label
var lbl_date: Label
var lbl_weather: Label
var lbl_stage: Label
var lbl_hint: Label
var roster: VBoxContainer
var roster_sig := ""
var sheet: PanelContainer
var sheet_title: Label
var sheet_body: VBoxContainer
var sheet_tab := ""
var toast_label: Label
var cmd_edit: LineEdit
var card_panel: PanelContainer
var card_label: Label
var btn_night: Button
var top_panel: PanelContainer
var bottom_panel: PanelContainer
var hint_panel: PanelContainer
var toast_panel: PanelContainer
var dim: ColorRect
var sheet_tabs: HBoxContainer
var tab_buttons := {}
var avatar_cache := {}


func _ready() -> void:
	randomize()
	_build_world()
	_build_villagers()
	_build_ui()
	_load_game()
	_roll_weather()
	_make_quests()
	_log("欢迎来到田园小镇（Godot 优化版）。底部输入框可以直接下令，比如「小伟把3号地浇一下」。")


# ============================================================ 世界
func _build_world() -> void:
	tiles.resize(W * H)
	variant.resize(W * H)
	tiles.fill(0)
	for i in variant.size():
		variant[i] = randi() % 4
	# 纵向河流
	for y in H:
		for x in range(45, 49):
			tiles[y * W + x] = 3
		tiles[y * W + 44] = 4
		tiles[y * W + 49] = 4
	# 东南湖湾
	for y in range(43, 56):
		for x in range(53, 80):
			tiles[y * W + x] = 3
	for x in range(53, 80):
		tiles[42 * W + x] = 4
	for y in range(43, 56):
		tiles[y * W + 52] = 4
	# 两座木桥
	for y in [22, 23]:
		for x in range(44, 50):
			tiles[y * W + x] = 2
	for y in [44, 45]:
		for x in range(44, 53):
			tiles[y * W + x] = 2
	# 道路：西岸主干与横路
	for y in range(0, 56):
		tiles[y * W + 40] = 2
	for x in range(2, 80):
		tiles[22 * W + x] = 2
	for x in range(2, 45):
		tiles[36 * W + x] = 2
	for x in range(49, 79):
		tiles[36 * W + x] = 2
	for x in range(2, 40):
		tiles[28 * W + x] = 2
	for y in range(18, 28):
		tiles[y * W + 40] = 2
	# 东岸：林地路与湖畔路
	for x in range(50, 79):
		tiles[20 * W + x] = 2
		tiles[40 * W + x] = 2
	# 广场与码头
	for y in range(17, 20):
		for x in range(30, 37):
			tiles[y * W + x] = 6
	for y in range(41, 43):
		for x in range(52, 58):
			tiles[y * W + x] = 6
	# 农田 10 × 5
	for r in range(5):
		for c in range(10):
			var px := 4 + c * 2
			var py := 26 + r * 2
			tiles[py * W + px] = 5
			plots[Vector2i(px, py)] = {"state": "grass", "crop": "", "growth": 0.0, "wet_until": 0.0, "announced": false}
	buildings = [
		{"x": 4, "y": 20, "w": 6, "h": 4, "name": "小伟家", "roof": Color("#c0574a")},
		{"x": 12, "y": 20, "w": 5, "h": 4, "name": "小杨家", "roof": Color("#7a5a8a")},
		{"x": 20, "y": 20, "w": 5, "h": 3, "name": "农舍", "roof": Color("#8a6a4a")},
		{"x": 28, "y": 17, "w": 7, "h": 3, "name": "集市", "roof": Color("#c25b4e")},
		{"x": 24, "y": 30, "w": 5, "h": 3, "name": "酒馆", "roof": Color("#a8663c")},
		{"x": 32, "y": 26, "w": 5, "h": 3, "name": "仓库", "roof": Color("#7a6a4a")},
		{"x": 4, "y": 38, "w": 6, "h": 4, "name": "谷仓", "roof": Color("#8a6a4a")},
		{"x": 14, "y": 40, "w": 5, "h": 4, "name": "风车", "roof": Color("#5f7fa8")},
		{"x": 52, "y": 24, "w": 5, "h": 3, "name": "矿工小屋", "roof": Color("#6b6b72")},
		{"x": 54, "y": 34, "w": 5, "h": 3, "name": "渔家", "roof": Color("#5a7a8a")},
	]
	# 果园（西北）
	for r in range(5):
		for c in range(8):
			var tx := 4 + c * 5
			var ty := 3 + r * 3
			trees.append({"x": tx, "y": ty, "chopped": false, "fruit": true})
	# 林地（东北）
	for r in range(7):
		for c in range(6):
			trees.append({"x": 52 + c * 5 + (r % 2) * 2, "y": 3 + r * 4, "chopped": false, "fruit": false})
	# 湖畔柳树
	for i in 7:
		trees.append({"x": 50 + i * 4, "y": 34 + (i % 3), "chopped": false, "fruit": false})
	# 村里零散树
	for p2 in [[2, 24], [2, 32], [30, 45], [36, 50], [20, 50], [8, 47], [42, 30], [42, 12]]:
		trees.append({"x": p2[0], "y": p2[1], "chopped": false, "fruit": randf() < 0.4})
	# 矿点
	for p3 in [[54, 8], [58, 12], [64, 6], [70, 10], [76, 14], [56, 18], [62, 22], [68, 26],
			[74, 20], [60, 28], [66, 30], [72, 4], [78, 24], [52, 14]]:
		rocks.append({"x": p3[0], "y": p3[1], "mined": false, "ore": randf() < 0.45})
	props = [
		{"type": "questboard", "x": 36, "y": 21},
		{"type": "clothshop", "x": 26, "y": 15},
		{"type": "flowerbed", "x": 10, "y": 38},
		{"type": "flowerbed", "x": 30, "y": 44},
		{"type": "flowerbed", "x": 20, "y": 14},
		{"type": "well", "x": 16, "y": 25},
		{"type": "well", "x": 58, "y": 40},
		{"type": "mill", "x": 14, "y": 40},
		{"type": "sign", "x": 43, "y": 21},
		{"type": "sign", "x": 50, "y": 41},
		{"type": "lamp", "x": 30, "y": 22},
		{"type": "lamp", "x": 12, "y": 28},
		{"type": "lamp", "x": 56, "y": 36},
		{"type": "reeds", "x": 53, "y": 41},
		{"type": "reeds", "x": 59, "y": 42},
		{"type": "reeds", "x": 62, "y": 41},
		{"type": "boat", "x": 55, "y": 43},
		{"type": "campfire", "x": 53, "y": 27},
		{"type": "stump", "x": 60, "y": 9},
		{"type": "stump", "x": 68, "y": 17},
		{"type": "bench", "x": 24, "y": 23},
		{"type": "bench", "x": 34, "y": 27},
		{"type": "sign", "x": 41, "y": 36},
	]
	# 牧场：鸡圈 + 牛羊牧场 + 湖鸭
	var herds: Array = [
		{"kind": "chicken", "n": 4, "x": 36.0, "y": 36.0, "product": "egg", "every": 10.0},
		{"kind": "chick", "n": 2, "x": 37.0, "y": 37.5, "product": "", "every": 0.0},
		{"kind": "cow", "n": 2, "x": 8.0, "y": 45.0, "product": "milk", "every": 12.0},
		{"kind": "calf", "n": 1, "x": 11.0, "y": 47.0, "product": "", "every": 0.0},
		{"kind": "sheep", "n": 3, "x": 6.0, "y": 50.0, "product": "wool", "every": 16.0},
		{"kind": "lamb", "n": 1, "x": 10.0, "y": 51.0, "product": "", "every": 0.0},
		{"kind": "duck", "n": 3, "x": 54.0, "y": 38.0, "product": "egg", "every": 11.0},
		{"kind": "duckling", "n": 1, "x": 56.0, "y": 39.5, "product": "", "every": 0.0},
		{"kind": "goose", "n": 2, "x": 52.0, "y": 40.0, "product": "egg", "every": 13.0},
		{"kind": "cat", "n": 1, "x": 24.0, "y": 24.0, "product": "", "every": 0.0},
		{"kind": "dog", "n": 1, "x": 27.0, "y": 22.0, "product": "", "every": 0.0},
	]
	for h in herds:
		for i in h.n:
			animals.append({
				"kind": h.kind, "x": float(h.x) + randf() * 3.0, "y": float(h.y) + randf() * 2.0,
				"tx": float(h.x), "ty": float(h.y), "t": randf() * 4.0, "dir": 1,
				"product": h.product, "every": h.every, "prod_t": randf() * 5.0, "ready": false,
			})
	_build_astar()


func _build_astar() -> void:
	astar = AStarGrid2D.new()
	astar.region = Rect2i(0, 0, W, H)
	astar.cell_size = Vector2(1, 1)
	astar.diagonal_mode = AStarGrid2D.DIAGONAL_MODE_NEVER
	astar.update()
	_refresh_solid()


func _refresh_solid() -> void:
	for y in H:
		for x in W:
			astar.set_point_solid(Vector2i(x, y), _solid(x, y))


func _solid(x: int, y: int) -> bool:
	if x < 0 or y < 0 or x >= W or y >= H:
		return true
	if tiles[y * W + x] == 3:
		return true
	if not _region_open(x, y):
		return true
	for b in buildings:
		if x >= b.x and x < b.x + b.w and y >= b.y and y < b.y + b.h:
			return true
	for tr in trees:
		if tr.x == x and tr.y == y and not tr.chopped:
			return true
	for r in rocks:
		if r.x == x and r.y == y and not r.mined:
			return true
	return false


func _region_open(x: int, y: int) -> bool:
	for reg in D.REGIONS:
		if x >= reg.x0 and x <= reg.x1 and y >= reg.y0 and y <= reg.y1:
			return unlocked[reg.id]
	return true


func _nearest_open(cell: Vector2i) -> Vector2i:
	if not astar.is_point_solid(cell):
		return cell
	for radius in range(1, 4):
		for dy in range(-radius, radius + 1):
			for dx in range(-radius, radius + 1):
				var c := Vector2i(cell.x + dx, cell.y + dy)
				if c.x >= 0 and c.y >= 0 and c.x < W and c.y < H and not astar.is_point_solid(c):
					return c
	return cell


func _path_to(from: Vector2i, to: Vector2i) -> Array:
	var goal := _nearest_open(to)
	if goal == from:
		return []
	var raw: Array = astar.get_id_path(from, goal)
	var out: Array = []
	for i in range(1, raw.size()):
		out.append(raw[i])
	return out


# ============================================================ 村民
func _build_villagers() -> void:
	villagers = [
		{
			"id": "xiaowei", "name": "小伟", "role": "男主角",
			"skin": Color("#f0c9a8"), "hair": Color("#1c1a1a"),
			"shirt": Color("#2a2a30"), "pants": Color("#93aecb"),
			"x": 26.0, "y": 24.0, "dir": "down", "state": "auto", "task": null, "queue": [], "path": [],
			"needs": {"hunger": 20.0, "energy": 86.0, "social": 55.0},
			"emo": {"joy": 45.0, "anger": 5.0, "sadness": 5.0, "anxiety": 6.0, "fatigue": 8.0},
			"trust": 55.0, "traits": ["嘴甜", "心宽", "爱清闲", "有点懒"],
			"thought": "今天也是个好天气。", "thought_t": 0.0, "bob": 0.0,
			"desire": null, "desire_cd": 4.0,
		},
		{
			"id": "xiaoyang", "name": "小杨", "role": "女主角",
			"skin": Color("#f6d6c0"), "hair": Color("#241c22"),
			"shirt": Color("#f4efe6"), "pants": Color("#b9b2a6"),
			"x": 27.0, "y": 25.0, "dir": "down", "state": "auto", "task": null, "queue": [], "path": [],
			"needs": {"hunger": 15.0, "energy": 90.0, "social": 50.0},
			"emo": {"joy": 48.0, "anger": 3.0, "sadness": 4.0, "anxiety": 7.0, "fatigue": 6.0},
			"trust": 58.0, "traits": ["心细", "爱干净", "认真", "嘴硬心软"],
			"thought": "先看看地里的情况。", "thought_t": 0.0, "bob": 0.0,
			"desire": null, "desire_cd": 3.0,
		},
	]


func _colors_for(v: Dictionary) -> Dictionary:
	var c := {
		"skin": v.skin, "hair": v.hair, "shirt": v.get("shirt", Color("#2a2a30")), "pants": v.get("pants", Color("#93aecb")),
		"hat": "", "vest": false, "apron": false, "hood": false, "scarf": false, "logo": false,
		"satchel": false, "tie": "", "hairpin": false, "necklace": false,
	}
	var def := _outfit_def(v.id, equipped_outfit.get(v.id, "default"))
	if def.is_empty():
		return c
	var over: Dictionary = def.c
	for k in over.keys():
		var val = over[k]
		if k == "shirt" or k == "pants" or k == "tie":
			c[k] = Color(val)
		else:
			c[k] = val
	return c


func _outfit_def(vid: String, oid: String) -> Dictionary:
	for o in D.OUTFITS.get(vid, []):
		if o.id == oid:
			return o
	return {}


# ============================================================ 主循环
func _process(delta: float) -> void:
	frames += 1
	var d: float = delta * (0.0 if paused else speed)
	if d > 0.0:
		abs_hours += d / HOUR_SECONDS
		_tick_crops(d)
		_tick_animals(d)
		for v in villagers:
			_tick_villager(v, d)
		_check_stage()
		_check_achievements()
		_check_day()
		var hr_now: float = fmod(abs_hours, 24.0)
		if auto_skip_night and stage_flags.autoskip and hr_now >= 23.0 and hr_now < 23.4:
			_skip_night(true)
	if toast_t > 0.0:
		toast_t -= delta
	if card_t > 0.0:
		card_t -= delta
		card_panel.visible = card_t > 0.0
		card_panel.modulate.a = clamp(card_t / 0.6, 0.0, 1.0)
	_update_hud()
	queue_redraw()
	_auto_camera(delta)
	_smoke(OS.get_cmdline_user_args().has("smoke"))
	if frames == 140:
		var extra := OS.get_cmdline_user_args()
		if extra.has("shop"):
			_open_sheet("clothes")
		if extra.has("quests"):
			_open_sheet("quests")
		if extra.has("stats"):
			_open_sheet("stats")
		if extra.has("farm"):
			cam = Vector2(12, 30)
			zoom = 2.2
		if extra.has("orchard"):
			unlocked.orchard = true
			_refresh_solid()
			cam = Vector2(20, 9)
			zoom = 2.0
		if extra.has("forest"):
			unlocked.forest = true
			_refresh_solid()
			cam = Vector2(62, 14)
			zoom = 2.0
		if extra.has("lake"):
			unlocked.lake = true
			_refresh_solid()
			cam = Vector2(60, 42)
			zoom = 2.0
		if extra.has("closeup"):
			cam = Vector2(26.5, 24.6)
			zoom = 3.4
		if extra.has("night"):
			abs_hours = 21.0
		if extra.has("rain"):
			weather = "rain"
	if frames == 170 and DisplayServer.get_name() != "headless":
		_screenshot()


func _auto_camera(delta: float) -> void:
	if follow >= 0 and follow < villagers.size():
		var v: Dictionary = villagers[follow]
		cam = cam.lerp(Vector2(v.x, v.y), clamp(delta * 4.0, 0.0, 1.0))
	cam.x = clamp(cam.x, 6.0, W - 6.0)
	cam.y = clamp(cam.y, 6.0, H - 6.0)


# ============================================================ 农业 / 动物
func _tick_crops(dt: float) -> void:
	var gdt: float = dt / HOUR_SECONDS
	for key in plots.keys():
		var p: Dictionary = plots[key]
		if p.crop == "":
			continue
		if p.wet_until > abs_hours:
			if _season_ok(p.crop):
				p.growth = min(D.CROPS[p.crop].grow, float(p.growth) + gdt)
			if p.growth >= D.CROPS[p.crop].grow and not p.announced:
				p.announced = true
				_log("%s 熟了" % D.CROPS[p.crop].name)


func _season_ok(crop: String) -> bool:
	return D.CROPS[crop].seasons.has(_season())


func _season() -> int:
	return int((_day() - 1) / D.DAYS_PER_SEASON) % 4


func _day() -> int:
	return 1 + int(abs_hours / 24.0)


func _tick_animals(dt: float) -> void:
	var gdt: float = dt / HOUR_SECONDS
	for a in animals:
		a.t = float(a.t) - dt
		if a.t <= 0.0:
			a.t = 2.0 + randf() * 4.0
			a.tx = float(a.x) + (randf() - 0.5) * 4.0
			a.ty = float(a.y) + (randf() - 0.5) * 3.0
		var dx: float = float(a.tx) - float(a.x)
		var dy: float = float(a.ty) - float(a.y)
		var dist: float = sqrt(dx * dx + dy * dy)
		if dist > 0.06:
			var step: float = min(dist, 0.5 * dt)
			a.x = float(a.x) + dx / dist * step
			a.y = float(a.y) + dy / dist * step
			a.dir = 1 if dx >= 0.0 else -1
		if a.product != "" and not a.ready:
			a.prod_t = float(a.prod_t) + gdt
			if a.prod_t >= float(a.every):
				a.ready = true
				a.prod_t = 0.0


# ============================================================ 村民 AI
func _tick_villager(v: Dictionary, dt: float) -> void:
	v.needs.hunger = min(100.0, float(v.needs.hunger) + dt * 0.35)
	v.needs.energy = max(0.0, float(v.needs.energy) - dt * 0.28)
	v.needs.social = max(0.0, float(v.needs.social) - dt * 0.2)
	v.emo.fatigue = clamp(float(v.emo.fatigue) + dt * 0.15, 0.0, 100.0)
	v.emo.joy = clamp(float(v.emo.joy) - dt * 0.05, 0.0, 100.0)
	if v.thought_t > 0.0:
		v.thought_t = float(v.thought_t) - dt
	if v.task != null:
		_run_task(v, dt)
		return
	if v.queue.size() > 0:
		var next: Dictionary = v.queue.pop_front()
		_start(v, next.type, int(next.tx), int(next.ty))
		return
	if v.needs.hunger > 82.0:
		_eat(v)
		return
	if v.needs.energy < 10.0:
		v.state = "rest"
		v.needs.energy = min(100.0, float(v.needs.energy) + dt * 7.0)
		v.thought = "累了，歇会儿。"
		v.thought_t = 2.0
		return
	if _tick_desire(v, dt):
		return
	if randf() < dt * 0.10:
		var job := _pick_job(v)
		if not job.is_empty():
			_start(v, job.type, job.tx, job.ty)


func _eat(v: Dictionary) -> void:
	if inventory.bread > 0:
		inventory.bread -= 1
	else:
		money = max(0, money - 4)
	v.needs.hunger = max(0.0, float(v.needs.hunger) - 65.0)
	_feel(v, "eat")
	v.thought = "吃点东西。"
	v.thought_t = 2.0


func _feel(v: Dictionary, kind: String) -> void:
	match kind:
		"praise":
			v.emo.joy = min(100.0, float(v.emo.joy) + 8.0)
			v.trust = min(100.0, float(v.trust) + 3.0)
		"eat":
			v.emo.joy = min(100.0, float(v.emo.joy) + 4.0)
			v.emo.anxiety = max(0.0, float(v.emo.anxiety) - 6.0)
		"work_like":
			v.emo.joy = min(100.0, float(v.emo.joy) + 4.0)
		"work_hate":
			v.emo.anger = min(100.0, float(v.emo.anger) + 7.0)
		"rest":
			v.emo.fatigue = max(0.0, float(v.emo.fatigue) - 12.0)
			v.emo.joy = min(100.0, float(v.emo.joy) + 2.0)
		"refuse":
			v.emo.anger = min(100.0, float(v.emo.anger) + 5.0)


func _dominant(v: Dictionary) -> String:
	var pairs: Array = [["😊", float(v.emo.joy)], ["😠", float(v.emo.anger)], ["😔", float(v.emo.sadness)],
		["😰", float(v.emo.anxiety)], ["😪", float(v.emo.fatigue)]]
	var best: Array = pairs[0]
	for p in pairs:
		if p[1] > best[1]:
			best = p
	return best[0]


func _pick_job(v: Dictionary) -> Dictionary:
	var best := {}
	var best_d := 999.0
	for key in plots.keys():
		var p: Dictionary = plots[key]
		var d: float = abs(key.x - v.x) + abs(key.y - v.y)
		if p.crop != "" and p.growth >= D.CROPS[p.crop].grow and d < best_d:
			best = {"type": "harvest", "tx": key.x, "ty": key.y}
			best_d = d
	if not best.is_empty():
		return best
	for key in plots.keys():
		var p: Dictionary = plots[key]
		var d: float = abs(key.x - v.x) + abs(key.y - v.y)
		if p.crop != "" and p.wet_until <= abs_hours and d < best_d:
			best = {"type": "water", "tx": key.x, "ty": key.y}
			best_d = d
	if not best.is_empty():
		return best
	if v.id == "xiaoyang":
		for key in plots.keys():
			var p: Dictionary = plots[key]
			if p.state == "plowed" and p.crop == "" and _seeds_total() > 0:
				return {"type": "plant", "tx": key.x, "ty": key.y}
	return {}


func _seeds_total() -> int:
	var n := 0
	for k in seeds.keys():
		n += int(seeds[k])
	return n


# ---- 自主意愿 ----
func _tick_desire(v: Dictionary, dt: float) -> bool:
	if v.desire != null:
		var des: Dictionary = v.desire
		var dist: float = abs(float(des.x) - float(v.x)) + abs(float(des.y) - float(v.y))
		if dist > 1.4:
			if v.path.is_empty():
				v.path = _path_to(Vector2i(int(v.x), int(v.y)), Vector2i(int(des.x), int(des.y)))
				if v.path.is_empty():
					v.desire = null
					v.desire_cd = 6.0
					return false
				v.state = "wander"
			_walk(v, dt)
			return true
		v.path = []
		v.state = "auto"
		if des.kind == "market" and not des.get("done", false):
			_do_market(v, des)
			des.done = true
		des.timer = (float(des.timer) if des.has("timer") else float(des.hold)) - dt
		if des.timer <= 0.0:
			v.desire = null
			v.desire_cd = 8.0 + randf() * 10.0
			if des.id == "riverside":
				_feel(v, "rest")
				v.needs.energy = min(100.0, float(v.needs.energy) + 8.0)
			elif des.id == "flowers":
				_feel(v, "praise")
			else:
				_feel(v, "work_like")
		return true
	v.desire_cd = float(v.desire_cd) - dt
	if v.desire_cd > 0.0:
		return false
	v.desire_cd = 6.0 + randf() * 6.0
	var des := _pick_desire(v)
	if des.is_empty():
		return false
	if des.kind == "work":
		return _start(v, des.type, int(des.x), int(des.y))
	v.desire = des
	v.thought = "%s %s" % [des.emoji, des.label]
	v.thought_t = 2.5
	return true


func _pick_desire(v: Dictionary) -> Dictionary:
	var options: Array = []
	var hr: float = fmod(abs_hours, 24.0)
	if v.id == "xiaowei":
		if weather != "storm" and unlocked.lake:
			options.append({"id": "riverside", "label": "去湖边坐坐", "emoji": "🎣", "kind": "spot",
				"x": 57.0, "y": 41.0, "hold": 5.0, "line": "湖边风不错。"})
		if hr > 6.0 and hr < 20.0 and weather != "storm" and unlocked.lake:
			options.append({"id": "fish", "label": "钓两条鱼", "emoji": "🐟", "kind": "work", "type": "fish", "x": 57, "y": 41})
		if _sellable_total() > 0 and hr > 8.0 and hr < 18.0:
			options.append({"id": "sell", "label": "去集市卖点东西", "emoji": "💰", "kind": "market",
				"x": 31.0, "y": 21.0, "hold": 2.5, "act": "sell", "line": "换点钱回来。"})
		if v.needs.energy < 55.0:
			options.append({"id": "nap", "label": "打个盹", "emoji": "💤", "kind": "spot",
				"x": 6.0, "y": 24.0, "hold": 5.0, "line": "眯一会儿。"})
	else:
		var dry := _first_dry_plot()
		if not dry.is_empty():
			options.append({"id": "tend", "label": "去照看庄稼", "emoji": "💧", "kind": "work", "type": "water", "x": dry.x, "y": dry.y})
		if _seeds_total() <= 2 and money >= 6 and hr > 8.0 and hr < 18.0:
			options.append({"id": "buyseed", "label": "去集市买种子", "emoji": "🌱", "kind": "market",
				"x": 31.0, "y": 21.0, "hold": 2.5, "act": "buy", "line": "种子不多了。"})
		options.append({"id": "flowers", "label": "去看看花", "emoji": "🌼", "kind": "spot",
			"x": 20.0, "y": 14.0, "hold": 4.0, "line": "开得真好。"})
		if hr > 8.0 and hr < 19.0:
			options.append({"id": "tidy", "label": "去收拾一下", "emoji": "🧹", "kind": "spot",
				"x": 6.0, "y": 22.0, "hold": 4.0, "line": "收拾干净才舒服。"})
	if v.needs.social < 60.0:
		var other: Dictionary = villagers[1] if v.id == "xiaowei" else villagers[0]
		if other.task == null:
			options.append({"id": "chat", "label": "想找%s说说话" % other.name, "emoji": "💬", "kind": "spot",
				"x": float(other.x), "y": float(other.y), "hold": 4.0, "line": "聊两句。"})
	if options.is_empty():
		return {}
	return options[randi() % options.size()]


func _first_dry_plot() -> Dictionary:
	for key in plots.keys():
		var p: Dictionary = plots[key]
		if p.crop != "" and p.wet_until <= abs_hours and p.growth < D.CROPS[p.crop].grow:
			return {"x": key.x, "y": key.y}
	return {}


func _sellable_total() -> int:
	var n := 0
	for k in ["wood", "fish", "stone", "ore", "egg", "milk", "wool"]:
		n += int(inventory.get(k, 0))
	return n


func _do_market(v: Dictionary, des: Dictionary) -> void:
	if des.act == "buy":
		var best := _best_seed()
		if best == "":
			return
		var n := 2 if money >= D.CROPS[best].seed * 2 else 1
		money -= D.CROPS[best].seed * n
		seeds[best] = int(seeds.get(best, 0)) + n
		v.thought = "买了%s种子×%d" % [D.CROPS[best].name, n]
		v.thought_t = 4.0
		_log("%s 在集市买了%s种子×%d" % [v.name, D.CROPS[best].name, n])
		_feel(v, "work_like")
		return
	var key := ""
	var most := 0
	for k in ["wood", "fish", "stone", "ore", "egg", "milk", "wool"]:
		if int(inventory.get(k, 0)) > most:
			most = int(inventory[k])
			key = k
	if key == "":
		return
	var n: int = min(most, 5)
	inventory[key] = most - n
	var gain: int = _price(key) * n
	money += gain
	stats.earned += gain
	v.thought = "卖了%d个%s +%dG" % [n, D.ITEM_NAME[key], gain]
	v.thought_t = 4.0
	_log("%s 在集市卖了%d个%s +%dG" % [v.name, n, D.ITEM_NAME[key], gain])
	_feel(v, "work_like")


func _best_seed() -> String:
	var season := _season()
	for k in D.CROPS.keys():
		if D.CROPS[k].seasons.has(season) and int(seeds.get(k, 0)) > 0 and money >= D.CROPS[k].seed:
			return k
	for k in D.CROPS.keys():
		if D.CROPS[k].seasons.has(season) and money >= D.CROPS[k].seed:
			return k
	return ""


func _price(kind: String) -> int:
	var base: int = D.ITEM_PRICE.get(kind, 0)
	if kind == "fish" and stage_flags.fish_bonus:
		return int(round(base * 1.2))
	if kind == "ore" and stage_flags.ore_bonus:
		return int(round(base * 1.3))
	return base


# ============================================================ 任务
func _start(v: Dictionary, type: String, tx: int, ty: int) -> bool:
	if type == "collect" and not stage_flags.collect:
		_show_toast("牧场还没开张：先播种 3 次")
		return false
	if type == "mine" and not stage_flags.mine:
		_show_toast("后山矿洞还没开：先累计收获 10 次")
		return false
	if type == "fish" and not unlocked.lake:
		_show_toast("湖畔渔村还没解锁：第 2 天开放")
		return false
	if _refuse(v):
		return false
	v.task = {"type": type, "tx": tx, "ty": ty, "stage": "toWork", "t": 0.0,
		"dur": {"plow": 1.6, "plant": 1.0, "water": 1.2, "harvest": 1.5, "chop": 3.0,
			"fish": 4.0, "mine": 3.0, "collect": 2.0}.get(type, 1.5)}
	v.path = _path_to(Vector2i(int(v.x), int(v.y)), Vector2i(tx, ty))
	if v.path.is_empty() and abs(float(tx) - float(v.x)) + abs(float(ty) - float(v.y)) > 1.5:
		v.task = null
		_show_toast("%s 过不去那边" % v.name)
		return false
	v.state = "task"
	return true


func _refuse(v: Dictionary) -> bool:
	if float(v.emo.anger) > 72.0 and randf() < 0.5:
		_feel(v, "refuse")
		v.thought = "现在不想动。"
		v.thought_t = 3.0
		_show_toast("%s 现在不想干活" % v.name)
		_log("%s 拒绝了这次安排" % v.name)
		return true
	return false


func _run_task(v: Dictionary, dt: float) -> void:
	var t: Dictionary = v.task
	if t.stage == "toWork":
		if v.path.size() > 0:
			_walk(v, dt)
			if v.path.is_empty():
				t.stage = "working"
				t.t = 0.0
		else:
			t.stage = "working"
			t.t = 0.0
		return
	t.t = float(t.t) + dt
	v.thought = _work_thought(t.type)
	v.thought_t = 0.6
	if float(t.t) >= float(t.dur):
		_finish_work(v, t)


func _walk(v: Dictionary, dt: float) -> void:
	if v.path.is_empty():
		return
	var next: Vector2i = v.path[0]
	var target := Vector2(next.x + 0.5, next.y + 0.5)
	var dv := target - Vector2(v.x, v.y)
	var dist: float = dv.length()
	var step: float = min(dist, 3.0 * dt)
	if dist > 0.01:
		v.x = float(v.x) + dv.x / dist * step
		v.y = float(v.y) + dv.y / dist * step
		if abs(dv.x) > abs(dv.y):
			v.dir = "right" if dv.x > 0.0 else "left"
		else:
			v.dir = "down" if dv.y > 0.0 else "up"
		v.bob = float(v.bob) + step * 6.0
	if dist <= 0.08:
		v.path.remove_at(0)


func _work_thought(type: String) -> String:
	return {"plow": "一锄一锄来。", "plant": "种子埋下去。", "water": "水得浇透。", "harvest": "收成不错。",
		"chop": "再来两下。", "fish": "等浮漂动。", "mine": "这石头里有矿。", "collect": "把牧产收回去。"}.get(type, "干活。")


func _finish_work(v: Dictionary, t: Dictionary) -> void:
	var key := Vector2i(t.tx, t.ty)
	match t.type:
		"plow":
			if plots.has(key):
				plots[key].state = "plowed"
			_log("%s 开垦了一块地" % v.name)
		"plant":
			var best := _best_seed()
			if plots.has(key) and best != "" and int(seeds.get(best, 0)) > 0:
				plots[key].state = "planted"
				plots[key].crop = best
				plots[key].growth = 0.0
				plots[key].wet_until = abs_hours + 8.0
				plots[key].announced = false
				seeds[best] = int(seeds[best]) - 1
				stats.planted += 1
				_log("%s 种下了%s" % [v.name, D.CROPS[best].name])
		"water":
			if plots.has(key):
				plots[key].wet_until = abs_hours + 16.0
			_log("%s 浇好了水" % v.name)
		"harvest":
			if plots.has(key) and plots[key].crop != "":
				var crop: Dictionary = D.CROPS[plots[key].crop]
				var gain: int = crop.sell
				money += gain
				stats.earned += gain
				stats.harvested += 1
				plots[key].crop = ""
				plots[key].growth = 0.0
				plots[key].state = "plowed"
				plots[key].announced = false
				_log("%s 收获了%s +%dG" % [v.name, crop.name, gain])
		"chop":
			for tr in trees:
				if tr.x == t.tx and tr.y == t.ty:
					tr.chopped = true
			inventory.wood += 2
			stats.wood += 2
			_log("%s 砍了两根木头" % v.name)
		"fish":
			inventory.fish += 1
			stats.fish += 1
			_log("%s 钓上来一条鱼" % v.name)
		"mine":
			for r in rocks:
				if r.x == t.tx and r.y == t.ty:
					r.mined = true
			inventory.ore += 1
			stats.mined += 1
			_log("%s 挖到了矿石" % v.name)
		"collect":
			for a in animals:
				if a.ready and abs(float(a.x) - t.tx) < 2.5 and abs(float(a.y) - t.ty) < 2.5:
					a.ready = false
					a.prod_t = 0.0
					inventory[a.product] = int(inventory.get(a.product, 0)) + 1
					stats.collected += 1
					_log("%s 收了%s" % [v.name, D.ITEM_NAME.get(a.product, a.product)])
					break
	v.task = null
	v.state = "auto"
	v.thought = "干完了。"
	v.thought_t = 1.6
	_feel(v, "work_like")
	_refresh_solid()
	_check_stage()
	_check_achievements()


# ============================================================ 阶段 / 成就 / 委托 / 日结
func _check_stage() -> void:
	while stage_index < D.STAGES.size():
		var st: Dictionary = D.STAGES[stage_index]
		var done := false
		match st.feature:
			"quests": done = stats.harvested >= 1
			"collect": done = stats.planted >= 3
			"speed8": done = stats.earned >= 150
			"mine": done = stats.harvested >= 10
			"fish_bonus": done = stats.fish >= 5
			"ore_bonus": done = stats.mined >= 10
			"ai_auto": done = bond >= 60.0
			"title": done = _all_regions()
		if not done:
			break
		stage_flags[st.feature] = true
		if st.feature == "collect":
			stage_flags.autoskip = true
		if st.feature == "collect":
			unlocked.orchard = true
		if st.feature == "mine":
			unlocked.forest = true
		stage_index += 1
		_log("阶段解锁：%s — %s" % [st.name, st.unlock])
		_show_card("阶段 %d · %s" % [stage_index, st.name], "解锁：%s" % st.unlock)
		_refresh_solid()


func _check_achievements() -> void:
	for a in D.ACHIEVEMENTS:
		if achievements.has(a.id):
			continue
		if _ach_done(a.id):
			achievements[a.id] = _day()
			if int(a.reward) > 0:
				money += int(a.reward)
				stats.earned += int(a.reward)
			_log("成就达成：%s" % a.name)
			_show_toast("🏆 成就达成：%s" % a.name)


func _ach_done(id: String) -> bool:
	match id:
		"harvest10": return stats.harvested >= 10
		"wood30": return stats.wood >= 30
		"fish20": return stats.fish >= 20
		"mine20": return stats.mined >= 20
		"animal20": return stats.collected >= 20
		"quest10": return quests_done >= 10
		"money1000": return money >= 1000
		"regions3": return _all_regions()
		"bond70": return bond >= 70.0
	return false


func _all_regions() -> bool:
	for r in D.REGIONS:
		if not unlocked[r.id]:
			return false
	return true


func _make_quests() -> void:
	quests = []
	var pool: Array = [
		{"id": "harvest", "text": "收获 3 次", "goal": 3, "reward": 60},
		{"id": "water", "text": "浇水 3 次", "goal": 3, "reward": 45},
		{"id": "fish", "text": "钓 2 条鱼", "goal": 2, "reward": 55},
		{"id": "wood", "text": "砍 4 根木头", "goal": 4, "reward": 50},
		{"id": "collect", "text": "收 3 次牧产", "goal": 3, "reward": 65},
	]
	pool.shuffle()
	for i in 3:
		var q: Dictionary = pool[i].duplicate()
		q.done = 0
		q.claimed = false
		quests.append(q)


func _quest_progress() -> void:
	for q in quests:
		if q.claimed:
			continue
		match q.id:
			"harvest":
				q.done = min(q.goal, stats.harvested - int(q.get("base", 0)))
			"water":
				q.done = min(q.goal, int(stats.planted * 0.5) + int(q.get("base", 0)))
			"fish":
				q.done = min(q.goal, stats.fish - int(q.get("base", 0)))
			"wood":
				q.done = min(q.goal, int(stats.wood / 2.0) - int(q.get("base", 0)))
			"collect":
				q.done = min(q.goal, stats.collected - int(q.get("base", 0)))


var _day_earned := 0
var _day_harvested := 0

func _check_day() -> void:
	var day := _day()
	if _last_day == day:
		return
	_last_day = day
	_roll_weather()
	_make_quests()
	if day >= 2 and not unlocked.lake:
		unlocked.lake = true
		_show_card("发现新区域", "湖畔渔村")
		_log("解锁区域：湖畔渔村")
	_refresh_solid()
	_show_card("第 %d 天" % day, "昨日收入 +%dG · 收获 %d" % [_day_earned, _day_harvested])
	_day_earned = 0
	_day_harvested = 0


func _roll_weather() -> void:
	var r := randf()
	weather = "sunny" if r < 0.68 else ("rain" if r < 0.92 else "storm")
	if weather == "rain":
		_log("今天下雨，地会自己湿")
	elif weather == "storm":
		_log("今天有暴雨，不能钓鱼砍树")


# ============================================================ 指令
func _run_command(text: String) -> void:
	var t := text.strip_edges()
	if t == "":
		return
	_log("东家：%s" % t)
	if t.contains("跳") and t.contains("夜"):
		_skip_night(false)
		return
	if t.contains("停下") or t.contains("都停"):
		for v in villagers:
			v.task = null
			v.queue = []
			v.path = []
			v.state = "auto"
		_show_toast("都停下了")
		return
	if t.contains("谁在") or t.contains("状态") or t.contains("汇报"):
		for v in villagers:
			var doing := "空闲" if v.task == null else _verb(v.task.type)
			_log("%s：%s（饱食 %d / 精力 %d）" % [v.name, doing, int(v.needs.hunger), int(v.needs.energy)])
		_show_toast("已汇报")
		return
	var who := -1
	for i in villagers.size():
		if t.contains(villagers[i].name):
			who = i
			break
	var type := ""
	for pair in [["挖矿", "mine"], ["砍树", "chop"], ["收获", "harvest"], ["浇水", "water"], ["播种", "plant"],
			["开垦", "plow"], ["钓鱼", "fish"], ["收牧产", "collect"], ["挤奶", "collect"], ["收蛋", "collect"],
			["剪羊毛", "collect"], ["采集", "chop"]]:
		if t.contains(pair[0]):
			type = pair[1]
			break
	if type == "":
		_show_toast("没听懂：可以说「小伟把3号地浇一下」「都去浇水」「挤奶」")
		return
	var targets := _targets_for(type, t)
	if targets.is_empty():
		_show_toast("没有可以执行的目标")
		return
	var order: Array = villagers if who < 0 else [villagers[who]]
	var free: Array = []
	for v in order:
		if v.task == null and v.queue.size() < 3:
			free.append(v)
	var idx := 0
	for target in targets:
		var v: Dictionary = free[idx] if idx < free.size() else order[idx % order.size()]
		idx += 1
		if v.task != null:
			if v.queue.size() < 3:
				v.queue.append({"type": type, "tx": target.x, "ty": target.y})
			continue
		_start(v, type, target.x, target.y)


func _targets_for(type: String, text: String) -> Array:
	var out: Array = []
	if type == "collect":
		for a in animals:
			if a.ready:
				out.append(Vector2i(int(a.x), int(a.y)))
		if out.is_empty():
			_show_toast("还没有可以收的牧产")
		return out
	if type == "fish":
		if not unlocked.lake:
			_show_toast("湖畔渔村还没解锁：第 2 天开放")
			return out
		return [Vector2i(57, 41)]
	if type == "mine":
		for r in rocks:
			if not r.mined and r.x >= 49 and r.y <= 31:
				out.append(Vector2i(r.x, r.y))
		if out.is_empty():
			_show_toast("后山没有可挖的矿了")
		return out.slice(0, 3)
	if type == "chop":
		for tr in trees:
			if not tr.chopped:
				out.append(Vector2i(tr.x, tr.y))
		return out.slice(0, 3)
	var num := _number_in(text)
	if num > 0:
		var keys: Array = plots.keys()
		if num <= keys.size():
			out.append(keys[num - 1])
		return out
	for key in plots.keys():
		var p: Dictionary = plots[key]
		match type:
			"plow":
				if p.state == "grass" and p.crop == "":
					out.append(key)
			"plant":
				if p.state == "plowed" and p.crop == "":
					out.append(key)
			"water":
				if p.crop != "" and p.wet_until <= abs_hours:
					out.append(key)
			"harvest":
				if p.crop != "" and p.growth >= D.CROPS[p.crop].grow:
					out.append(key)
	if out.is_empty():
		match type:
			"harvest": _show_toast("还没有成熟的作物")
			"plow": _show_toast("没有需要开垦的地")
			"plant": _show_toast("没有翻好待种的地")
			"water": _show_toast("现在没有要浇的地")
	if out.size() > 6:
		out = out.slice(0, 6)
	return out


func _number_in(text: String) -> int:
	var digits := ""
	for ch in text:
		if ch >= "0" and ch <= "9":
			digits += ch
	if digits != "":
		return int(digits)
	var cn := {"一": 1, "二": 2, "两": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10}
	for k in cn.keys():
		if text.contains(k + "号") or text.contains("第" + k):
			return cn[k]
	return 0


func _verb(type: String) -> String:
	return {"plow": "开垦", "plant": "播种", "water": "浇水", "harvest": "收获", "chop": "砍树",
		"fish": "钓鱼", "mine": "挖矿", "collect": "收牧产"}.get(type, type)


func _skip_night(auto: bool) -> void:
	var hr: float = fmod(abs_hours, 24.0)
	if hr >= 6.0 and hr < 19.0:
		if not auto:
			_show_toast("现在不是夜晚")
		return
	var target: float = abs_hours - hr + (30.0 if hr >= 19.0 else 6.0)
	var steps := int((target - abs_hours) * HOUR_SECONDS * 60.0)
	var dt := 1.0 / 60.0
	for i in min(steps, 2400):
		abs_hours += dt / HOUR_SECONDS
		_tick_crops(dt)
		_tick_animals(dt)
		for v in villagers:
			_tick_villager(v, dt)
	_show_card("天亮了", "第 %d 天 06:00" % _day())
	_log("跳过了夜晚")


# ============================================================ 存档
func _save_game() -> void:
	var data := {
		"money": money, "seeds": seeds, "inventory": inventory, "abs_hours": abs_hours,
		"weather": weather, "stage_index": stage_index, "stage_flags": stage_flags,
		"owned_outfits": owned_outfits, "equipped_outfit": equipped_outfit, "stats": stats,
		"achievements": achievements, "bond": bond, "quests": quests, "quests_done": quests_done,
		"unlocked": unlocked, "auto_sell": auto_sell, "auto_skip_night": auto_skip_night,
		"villagers": [], "plots": [], "trees": [], "rocks": [], "animals": [],
	}
	for v in villagers:
		data.villagers.append({"id": v.id, "x": v.x, "y": v.y, "needs": v.needs, "emo": v.emo, "trust": v.trust})
	for key in plots.keys():
		var p: Dictionary = plots[key]
		data.plots.append({"x": key.x, "y": key.y, "state": p.state, "crop": p.crop,
			"growth": p.growth, "wet": p.wet_until, "announced": p.announced})
	for tr in trees:
		data.trees.append({"x": tr.x, "y": tr.y, "chopped": tr.chopped})
	for r in rocks:
		data.rocks.append({"x": r.x, "y": r.y, "mined": r.mined})
	for a in animals:
		data.animals.append({"ready": a.ready, "prod_t": a.prod_t})
	var f := FileAccess.open("user://tianyuan_save.json", FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(data))
		f.close()


func _load_game() -> void:
	if not FileAccess.file_exists("user://tianyuan_save.json"):
		return
	var f := FileAccess.open("user://tianyuan_save.json", FileAccess.READ)
	if f == null:
		return
	var parsed = JSON.parse_string(f.get_as_text())
	f.close()
	if typeof(parsed) != TYPE_DICTIONARY:
		return
	money = int(parsed.get("money", money))
	seeds = parsed.get("seeds", seeds)
	inventory = parsed.get("inventory", inventory)
	abs_hours = float(parsed.get("abs_hours", abs_hours))
	weather = parsed.get("weather", weather)
	stage_index = int(parsed.get("stage_index", stage_index))
	stage_flags = parsed.get("stage_flags", stage_flags)
	owned_outfits = parsed.get("owned_outfits", owned_outfits)
	equipped_outfit = parsed.get("equipped_outfit", equipped_outfit)
	stats = parsed.get("stats", stats)
	achievements = parsed.get("achievements", achievements)
	bond = float(parsed.get("bond", bond))
	quests = parsed.get("quests", quests)
	quests_done = int(parsed.get("quests_done", quests_done))
	var loaded_unlocked: Dictionary = parsed.get("unlocked", {})
	for k2 in loaded_unlocked.keys():
		if unlocked.has(k2):
			unlocked[k2] = loaded_unlocked[k2]
	auto_sell = parsed.get("auto_sell", auto_sell)
	auto_skip_night = parsed.get("auto_skip_night", auto_skip_night)
	_last_day = _day()
	for sv in parsed.get("villagers", []):
		for v in villagers:
			if v.id == sv.id:
				v.x = sv.x
				v.y = sv.y
				v.needs = sv.needs
				v.emo = sv.emo
				v.trust = sv.get("trust", v.trust)
	for sp in parsed.get("plots", []):
		var key := Vector2i(int(sp.x), int(sp.y))
		if plots.has(key):
			plots[key].state = sp.state
			plots[key].crop = sp.crop
			plots[key].growth = sp.growth
			plots[key].wet_until = sp.wet
			plots[key].announced = sp.get("announced", false)
	for st in parsed.get("trees", []):
		for tr in trees:
			if tr.x == int(st.x) and tr.y == int(st.y):
				tr.chopped = st.chopped
	for sr in parsed.get("rocks", []):
		for r in rocks:
			if r.x == int(sr.x) and r.y == int(sr.y):
				r.mined = sr.mined
	var idx := 0
	for sa in parsed.get("animals", []):
		if idx < animals.size():
			animals[idx].ready = sa.get("ready", false)
			animals[idx].prod_t = sa.get("prod_t", 0.0)
		idx += 1
	_refresh_solid()


# ============================================================ 绘制
func _w2s(x: float, y: float) -> Vector2:
	return (Vector2(x, y) - cam) * TILE * zoom + get_viewport_rect().size * 0.5


func _draw() -> void:
	var view := get_viewport_rect().size
	draw_rect(Rect2(Vector2.ZERO, view), Color("#2f4a2a"))
	var z: float = zoom
	var full: float = TILE * z
	var x0: int = max(0, int(cam.x - view.x / (2.0 * full)) - 1)
	var x1: int = min(W - 1, int(cam.x + view.x / (2.0 * full)) + 1)
	var y0: int = max(0, int(cam.y - view.y / (2.0 * full)) - 1)
	var y1: int = min(H - 1, int(cam.y + view.y / (2.0 * full)) + 1)
	for y in range(y0, y1 + 1):
		for x in range(x0, x1 + 1):
			var p := _w2s(x, y)
			var t: int = tiles[y * W + x]
			var v: int = variant[y * W + x]
			var col := Color("#79b45a")
			match t:
				1: col = Color("#b98b57")
				2: col = Color("#c9ab7c")
				3: col = Color("#4f8fc8")
				4: col = Color("#e0cfa0")
				5: col = Color("#8a6039")
				6: col = Color("#b0aa9a")
			col = col.lightened(0.03 * float(v))
			draw_rect(Rect2(p, Vector2(full + 0.5, full + 0.5)), col)
			if t == 3:
				var wave: float = sin(Time.get_ticks_msec() / 700.0 + x * 0.7 + y * 0.3)
				draw_rect(Rect2(p + Vector2(2, 10 + wave * 2.0) * z, Vector2((TILE - 6) * z, 1.5 * z)), Color(0.85, 0.93, 1.0, 0.35))
			elif t == 2 and v == 1:
				draw_rect(Rect2(p + Vector2(5, 12) * z, Vector2(4 * z, 2 * z)), Color("#b79a6c"))
	for b in buildings:
		_draw_building(b, z, full)
	for pr in props:
		_draw_prop(pr, z, full)
	for key in plots.keys():
		if key.x < x0 or key.x > x1 or key.y < y0 or key.y > y1:
			continue
		_draw_plot(key, z, full)
	for tr in trees:
		if tr.x >= x0 and tr.x <= x1 and tr.y >= y0 and tr.y <= y1:
			_draw_tree(tr, z)
	for r in rocks:
		if r.x >= x0 and r.x <= x1 and r.y >= y0 and r.y <= y1:
			_draw_rock(r, z)
	for a in animals:
		if a.x >= x0 - 1 and a.x <= x1 + 1 and a.y >= y0 - 1 and a.y <= y1 + 1:
			_draw_animal(a, z)
	for i in villagers.size():
		_draw_villager(villagers[i], z, i == selected)
	_draw_sky(view)
	var hr: float = fmod(abs_hours, 24.0)
	if hr >= 18.5 or hr < 6.5:
		for b in buildings:
			var p := _w2s(b.x + 1.0, b.y + 1.0)
			draw_rect(Rect2(p + Vector2(6, 6) * z, Vector2(6 * z, 5 * z)), Color(1.0, 0.86, 0.5, 0.75))
	_draw_weather(view)
	_draw_season(view)


func _draw_sky(view: Vector2) -> void:
	var hr: float = fmod(abs_hours, 24.0)
	var a := 0.0
	var tint := Color(0.08, 0.12, 0.3)
	if hr >= 17.0 and hr < 19.0:
		a = (hr - 17.0) / 2.0 * 0.35
		tint = Color(0.9, 0.5, 0.3)
	elif hr >= 19.0 or hr < 5.0:
		a = 0.44
	elif hr >= 5.0 and hr < 7.0:
		a = (7.0 - hr) / 2.0 * 0.35
		tint = Color(0.9, 0.6, 0.4)
	if a > 0.0:
		draw_rect(Rect2(Vector2.ZERO, view), Color(tint.r, tint.g, tint.b, a))


func _draw_weather(view: Vector2) -> void:
	if weather != "rain" and weather != "storm":
		return
	var heavy := weather == "storm"
	var t: float = Time.get_ticks_msec() / 1000.0
	var layers: Array = [[70, 160.0, 9.0, 0.35], [90, 260.0, 6.0, 0.5]] if heavy else [[40, 120.0, 7.0, 0.3], [34, 200.0, 5.0, 0.45]]
	for L in layers:
		var count: int = L[0]
		var spd: float = L[1]
		var ln: float = L[2]
		var alpha: float = L[3]
		for i in count:
			var x: float = fmod(i * 97.13 + t * spd * 0.35, view.x + 40.0) - 20.0
			var y: float = fmod(i * 41.3 + t * spd, view.y + 30.0) - 15.0
			draw_line(Vector2(x, y), Vector2(x - ln * 0.35, y + ln), Color(0.82, 0.9, 1.0, alpha), 1.0)
	for i in (14 if heavy else 7):
		var phase: float = fmod(t * 1.6 + i * 0.37, 1.0)
		if phase > 0.4:
			continue
		var sx: float = fmod(i * 137.5, view.x)
		var sy: float = view.y - 12.0 - fmod(i * 53.0, 60.0)
		var r: float = 1.0 + phase * 4.0
		draw_arc(Vector2(sx, sy), r, 0.0, TAU, 12, Color(0.82, 0.9, 1.0, (0.4 - phase) * 0.8), 1.0)
	if heavy and sin(t * 2.3) > 0.9965:
		draw_rect(Rect2(Vector2.ZERO, view), Color(0.9, 0.94, 1.0, 0.22))


func _draw_season(view: Vector2) -> void:
	var season := _season()
	var t: float = Time.get_ticks_msec() / 1000.0
	if season == 3:
		for i in 26:
			var sx: float = fmod(i * 53.7 + t * 9.0 * (1 + i % 3), view.x)
			var sy: float = fmod(i * 91.3 + t * 14.0 * (1 + i % 2), view.y)
			draw_rect(Rect2(Vector2(sx, sy), Vector2(2, 2)), Color(1, 1, 1, 0.85))
	elif season == 2:
		for i in 14:
			var sx: float = fmod(i * 71.3 + t * 20.0, view.x)
			var sy: float = fmod(i * 47.7 + t * 26.0, view.y)
			draw_rect(Rect2(Vector2(sx, sy), Vector2(3, 2)), Color(0.9, 0.55, 0.25, 0.8))
	elif season == 0:
		for i in 8:
			var sx: float = fmod(i * 89.3 + t * 12.0, view.x)
			var sy: float = fmod(i * 61.7 + t * 16.0, view.y)
			draw_rect(Rect2(Vector2(sx, sy), Vector2(2, 2)), Color(1.0, 0.8, 0.9, 0.7))


func _draw_plot(key: Vector2i, z: float, full: float) -> void:
	var p := _w2s(key.x, key.y)
	var plot: Dictionary = plots[key]
	var wet: bool = plot.wet_until > abs_hours
	var soil := Color("#5e3f28") if wet else Color("#96693c")
	draw_rect(Rect2(p + Vector2(2, 3) * z, Vector2(full - 4 * z, full - 5 * z)), soil)
	draw_rect(Rect2(p + Vector2(2, 3) * z, Vector2(full - 4 * z, 2 * z)), soil.lightened(0.12))
	if plot.crop == "":
		return
	var crop: Dictionary = D.CROPS[plot.crop]
	var prog: float = clamp(float(plot.growth) / float(crop.grow), 0.0, 1.0)
	var cx := p + Vector2(full * 0.5, full - 4 * z)
	draw_rect(Rect2(cx + Vector2(-1 * z, -3 * z), Vector2(2 * z, 3 * z)), crop.leaf.darkened(0.2))
	if prog < 0.34:
		draw_rect(Rect2(cx + Vector2(-3 * z, -6 * z), Vector2(6 * z, 3 * z)), crop.leaf)
		draw_rect(Rect2(cx + Vector2(-1 * z, -8 * z), Vector2(2 * z, 3 * z)), crop.leaf.lightened(0.1))
	elif prog < 0.7:
		draw_rect(Rect2(cx + Vector2(-5 * z, -8 * z), Vector2(10 * z, 5 * z)), crop.leaf)
		draw_rect(Rect2(cx + Vector2(-3 * z, -11 * z), Vector2(6 * z, 4 * z)), crop.leaf.lightened(0.12))
	elif prog < 1.0:
		draw_rect(Rect2(cx + Vector2(-6 * z, -10 * z), Vector2(12 * z, 7 * z)), crop.leaf)
		draw_rect(Rect2(cx + Vector2(-3 * z, -13 * z), Vector2(6 * z, 4 * z)), crop.leaf.lightened(0.15))
	else:
		draw_rect(Rect2(cx + Vector2(-6 * z, -11 * z), Vector2(12 * z, 8 * z)), crop.leaf)
		match plot.crop:
			"radish":
				draw_rect(Rect2(cx + Vector2(-4 * z, -6 * z), Vector2(8 * z, 5 * z)), crop.color)
			"turnip":
				draw_rect(Rect2(cx + Vector2(-4 * z, -7 * z), Vector2(8 * z, 6 * z)), crop.color)
				draw_rect(Rect2(cx + Vector2(-3 * z, -9 * z), Vector2(6 * z, 2 * z)), crop.color.lightened(0.2))
			"carrot":
				draw_colored_polygon(PackedVector2Array([
					cx + Vector2(-3 * z, -8 * z), cx + Vector2(3 * z, -8 * z), cx + Vector2(0, -2 * z)]), crop.color)
			"strawberry":
				draw_rect(Rect2(cx + Vector2(-4 * z, -7 * z), Vector2(8 * z, 5 * z)), crop.color)
				draw_rect(Rect2(cx + Vector2(-2 * z, -9 * z), Vector2(4 * z, 2 * z)), crop.leaf)
			"pumpkin":
				draw_rect(Rect2(cx + Vector2(-6 * z, -8 * z), Vector2(12 * z, 6 * z)), crop.color)
				draw_rect(Rect2(cx + Vector2(-2 * z, -10 * z), Vector2(4 * z, 2 * z)), crop.leaf.darkened(0.2))
		var glow: float = 0.4 + 0.4 * sin(Time.get_ticks_msec() / 300.0)
		draw_rect(Rect2(cx + Vector2(6 * z, -14 * z), Vector2(2 * z, 2 * z)), Color(1, 1, 0.7, glow))


func _draw_building(b: Dictionary, z: float, full: float) -> void:
	var p := _w2s(b.x, b.y)
	var w: float = b.w * full
	var h: float = b.h * full
	draw_rect(Rect2(p + Vector2(3, 4) * z, Vector2(w, h)), Color(0, 0, 0, 0.18))
	draw_rect(Rect2(p, Vector2(w, h)), Color("#e8d6b0"))
	draw_rect(Rect2(p, Vector2(w, h * 0.5)), b.roof)
	draw_colored_polygon(PackedVector2Array([
		p + Vector2(-4 * z, h * 0.5), p + Vector2(w * 0.5, -6 * z), p + Vector2(w + 4 * z, h * 0.5)]), b.roof.darkened(0.15))
	draw_rect(Rect2(p + Vector2(w * 0.44, h * 0.5), Vector2(w * 0.12, h * 0.5)), Color("#6b4526"))
	draw_rect(Rect2(p + Vector2(w * 0.12, h * 0.6), Vector2(w * 0.16, h * 0.24)), Color("#8fc4e8"))
	draw_rect(Rect2(p + Vector2(w * 0.72, h * 0.6), Vector2(w * 0.16, h * 0.24)), Color("#8fc4e8"))


func _draw_prop(pr: Dictionary, z: float, full: float) -> void:
	var p := _w2s(pr.x, pr.y)
	match pr.type:
		"questboard":
			draw_rect(Rect2(p + Vector2(3, 4) * z, Vector2(16 * z, 14 * z)), Color("#8a5c35"))
			draw_rect(Rect2(p + Vector2(5, 6) * z, Vector2(12 * z, 9 * z)), Color("#e8dcc0"))
			draw_rect(Rect2(p + Vector2(7, 8) * z, Vector2(8 * z, 2 * z)), Color("#b0a080"))
		"clothshop":
			draw_rect(Rect2(p + Vector2(2, 6) * z, Vector2(20 * z, 14 * z)), Color("#a9743f"))
			for i in 6:
				draw_rect(Rect2(p + Vector2(2 + i * 3.4, 3) * z, Vector2(3.6 * z, 4 * z)),
					Color("#f2c7d4") if i % 2 == 0 else Color("#fbf3df"))
			var cols: Array = [Color("#d98aa8"), Color("#5f8f4a"), Color("#4e6d8a"), Color("#e8c060")]
			for i in cols.size():
				draw_rect(Rect2(p + Vector2(5 + i * 4, 9) * z, Vector2(3.4 * z, 6 * z)), cols[i])
		"flowerbed":
			draw_rect(Rect2(p + Vector2(3, 10) * z, Vector2(18 * z, 8 * z)), Color("#8a6039"))
			var flowers: Array = [Color("#f2a0c0"), Color("#f2c14e"), Color("#e07a90"), Color("#b8a0e0"), Color("#f2f0ea")]
			for i in 5:
				var ox: float = 4.0 + i * 3.4
				draw_rect(Rect2(p + Vector2(ox, 6) * z, Vector2(2 * z, 5 * z)), Color("#5f9a48"))
				draw_rect(Rect2(p + Vector2(ox - 1, 4) * z, Vector2(4 * z, 3 * z)), flowers[i])
		"well":
			draw_rect(Rect2(p + Vector2(2, 8) * z, Vector2(20 * z, 12 * z)), Color("#9a948a"))
			draw_rect(Rect2(p + Vector2(6, 10) * z, Vector2(12 * z, 8 * z)), Color("#3f5f7a"))
			draw_rect(Rect2(p + Vector2(1, 2) * z, Vector2(22 * z, 3 * z)), Color("#8a5c35"))
		"mill":
			draw_rect(Rect2(p + Vector2(6, 4) * z, Vector2(12 * z, 18 * z)), Color("#e8d6b0"))
			draw_colored_polygon(PackedVector2Array([
				p + Vector2(3, 6) * z, p + Vector2(12, -4) * z, p + Vector2(21, 6) * z]), Color("#8a6a4a"))
			var ang: float = Time.get_ticks_msec() / 900.0
			for i in 4:
				var a: float = ang + i * PI / 2.0
				draw_line(p + Vector2(12, 10) * z, p + Vector2(12 + cos(a) * 10.0, 10 + sin(a) * 10.0) * z, Color("#d8cbb0"), 2.0 * z)
		"sign":
			draw_rect(Rect2(p + Vector2(10, 10) * z, Vector2(3 * z, 10 * z)), Color("#8a5c35"))
			draw_rect(Rect2(p + Vector2(3, 5) * z, Vector2(17 * z, 7 * z)), Color("#c9ab7c"))
		"reeds":
			for i in 3:
				draw_rect(Rect2(p + Vector2(4 + i * 4, 8) * z, Vector2(2 * z, 12 * z)), Color("#4f8f48"))
				draw_rect(Rect2(p + Vector2(3 + i * 4, 6) * z, Vector2(4 * z, 3 * z)), Color("#8a6a4a"))
		"boat":
			draw_colored_polygon(PackedVector2Array([
				p + Vector2(2, 10) * z, p + Vector2(20, 10) * z, p + Vector2(16, 16) * z, p + Vector2(6, 16) * z]), Color("#8a5c35"))
			draw_rect(Rect2(p + Vector2(4, 8) * z, Vector2(14 * z, 2 * z)), Color("#c9ab7c"))
			draw_line(p + Vector2(11, 8) * z, p + Vector2(11, 0) * z, Color("#6b5a44"), 1.0 * z)
		"campfire":
			draw_rect(Rect2(p + Vector2(4, 14) * z, Vector2(14 * z, 3 * z)), Color("#5a4a3a"))
			var fl: float = 0.6 + 0.4 * sin(Time.get_ticks_msec() / 160.0)
			draw_colored_polygon(PackedVector2Array([
				p + Vector2(11, 6 + fl) * z, p + Vector2(7, 15) * z, p + Vector2(15, 15) * z]), Color("#e8823c"))
			draw_colored_polygon(PackedVector2Array([
				p + Vector2(11, 9 + fl) * z, p + Vector2(9, 15) * z, p + Vector2(13, 15) * z]), Color("#f2c14e"))
		"stump":
			draw_rect(Rect2(p + Vector2(6, 12) * z, Vector2(12 * z, 8 * z)), Color("#6b4526"))
			draw_rect(Rect2(p + Vector2(6, 11) * z, Vector2(12 * z, 3 * z)), Color("#c9ab7c"))
		"bench":
			draw_rect(Rect2(p + Vector2(3, 12) * z, Vector2(18 * z, 3 * z)), Color("#a9743f"))
			draw_rect(Rect2(p + Vector2(4, 15) * z, Vector2(3 * z, 6 * z)), Color("#8a5c35"))
			draw_rect(Rect2(p + Vector2(17, 15) * z, Vector2(3 * z, 6 * z)), Color("#8a5c35"))
		"lamp":
			draw_rect(Rect2(p + Vector2(10, 8) * z, Vector2(3 * z, 14 * z)), Color("#5a4a3a"))
			var hr: float = fmod(abs_hours, 24.0)
			var on: bool = hr >= 18.5 or hr < 6.5
			draw_rect(Rect2(p + Vector2(7, 3) * z, Vector2(9 * z, 6 * z)), Color(1.0, 0.9, 0.6) if on else Color("#8a8a8a"))


func _draw_tree(tr: Dictionary, z: float) -> void:
	var p := _w2s(tr.x, tr.y)
	if tr.chopped:
		draw_rect(Rect2(p + Vector2(7, 15) * z, Vector2(10 * z, 5 * z)), Color("#8a5c35"))
		draw_rect(Rect2(p + Vector2(9, 13) * z, Vector2(6 * z, 3 * z)), Color("#c9ab7c"))
		return
	draw_rect(Rect2(p + Vector2(5, 2) * z, Vector2(14 * z, 20 * z)), Color(0, 0, 0, 0.12))
	draw_rect(Rect2(p + Vector2(10, 12) * z, Vector2(4 * z, 10 * z)), Color("#6b4526"))
	draw_rect(Rect2(p + Vector2(2, 3) * z, Vector2(20 * z, 11 * z)), Color("#2f5f2f"))
	draw_rect(Rect2(p + Vector2(4, 1) * z, Vector2(16 * z, 9 * z)), Color("#3f7a3a"))
	draw_rect(Rect2(p + Vector2(6, 0) * z, Vector2(12 * z, 6 * z)), Color("#5f9a48"))
	if tr.fruit:
		for i in 3:
			draw_rect(Rect2(p + Vector2(6 + i * 5, 5 + (i % 2) * 3) * z, Vector2(3 * z, 3 * z)), Color("#d84a5a"))


func _draw_rock(r: Dictionary, z: float) -> void:
	var p := _w2s(r.x, r.y)
	if r.mined:
		draw_rect(Rect2(p + Vector2(7, 16) * z, Vector2(10 * z, 3 * z)), Color("#8a8274"))
		return
	draw_rect(Rect2(p + Vector2(4, 20) * z, Vector2(16 * z, 3 * z)), Color(0, 0, 0, 0.16))
	draw_rect(Rect2(p + Vector2(4, 8) * z, Vector2(16 * z, 13 * z)), Color("#4a4a52"))
	draw_rect(Rect2(p + Vector2(5, 8) * z, Vector2(14 * z, 11 * z)), Color("#9a948a"))
	draw_rect(Rect2(p + Vector2(7, 6) * z, Vector2(10 * z, 6 * z)), Color("#b8b0a4"))
	if r.ore:
		draw_rect(Rect2(p + Vector2(9, 11) * z, Vector2(3 * z, 3 * z)), Color("#f2c14e"))
		draw_rect(Rect2(p + Vector2(13, 13) * z, Vector2(2 * z, 2 * z)), Color("#e8b830"))


func _draw_animal(a: Dictionary, z: float) -> void:
	var p := _w2s(a.x, a.y)
	var sd: float = float(z * a.dir)
	draw_rect(Rect2(p + Vector2(-6, -1) * z, Vector2(12 * z, 2 * z)), Color(0, 0, 0, 0.16))
	match a.kind:
		"chicken", "chick":
			var w: float = 9.0 if a.kind == "chicken" else 6.0
			draw_rect(Rect2(p + Vector2(-w / 2, -8) * z, Vector2(w * z, 6 * z)), Color("#f2c14e"))
			draw_rect(Rect2(p + Vector2(-w / 2, -8) * z, Vector2(w * z, 2 * z)), Color("#ffe08a"))
			draw_rect(Rect2(p + Vector2(sd * 2 - 2, -12) * z, Vector2(4 * z, 4 * z)), Color("#ffe08a"))
			draw_rect(Rect2(p + Vector2(sd * 2, -13) * z, Vector2(2 * z, 2 * z)), Color("#d84a3a"))
			draw_rect(Rect2(p + Vector2(-2, -2) * z, Vector2(2 * z, 2 * z)), Color("#e8823c"))
		"duck", "duckling", "goose":
			var wd: float = 10.0 if a.kind == "goose" else 8.0
			draw_rect(Rect2(p + Vector2(-wd / 2, -8) * z, Vector2(wd * z, 6 * z)), Color("#f6f2e8"))
			draw_rect(Rect2(p + Vector2(sd * 2, -13) * z, Vector2(3 * z, 6 * z)), Color("#ffffff"))
			draw_rect(Rect2(p + Vector2(sd * 3, -13) * z, Vector2(3 * z, 2 * z)), Color("#e8823c"))
		"cow", "calf":
			var sc: float = 1.0 if a.kind == "cow" else 0.7
			draw_rect(Rect2(p + Vector2(-9 * sc, -10 * sc) * z, Vector2(18 * sc * z, 7 * sc * z)), Color("#f6f2e8"))
			draw_rect(Rect2(p + Vector2(-9 * sc, -10 * sc) * z, Vector2(7 * sc * z, 4 * sc * z)), Color("#3a3a40"))
			draw_rect(Rect2(p + Vector2(sd * 4, -15 * sc) * z, Vector2(6 * sc * z, 5 * sc * z)), Color("#f6f2e8"))
			draw_rect(Rect2(p + Vector2(-8 * sc, -3) * z, Vector2(2 * z, 3 * z)), Color("#3a3a40"))
			draw_rect(Rect2(p + Vector2(6 * sc, -3) * z, Vector2(2 * z, 3 * z)), Color("#3a3a40"))
		"sheep", "lamb":
			var ss: float = 1.0 if a.kind == "sheep" else 0.68
			draw_rect(Rect2(p + Vector2(-8 * ss, -11 * ss) * z, Vector2(16 * ss * z, 9 * ss * z)), Color("#f6f2e8"))
			draw_rect(Rect2(p + Vector2(-7 * ss, -14 * ss) * z, Vector2(14 * ss * z, 5 * ss * z)), Color("#ffffff"))
			draw_rect(Rect2(p + Vector2(sd * 5, -13 * ss) * z, Vector2(4 * ss * z, 4 * ss * z)), Color("#3a3a40"))
		"cat":
			draw_rect(Rect2(p + Vector2(-5, -7) * z, Vector2(10 * z, 5 * z)), Color("#9aa0a8"))
			draw_rect(Rect2(p + Vector2(sd * 2, -11) * z, Vector2(5 * z, 5 * z)), Color("#b8bcc0"))
			draw_rect(Rect2(p + Vector2(sd * 2, -13) * z, Vector2(2 * z, 2 * z)), Color("#b8bcc0"))
		"dog":
			draw_rect(Rect2(p + Vector2(-6, -8) * z, Vector2(12 * z, 6 * z)), Color("#b98b57"))
			draw_rect(Rect2(p + Vector2(sd * 3, -13) * z, Vector2(6 * z, 6 * z)), Color("#d8b06a"))
			draw_rect(Rect2(p + Vector2(sd * 3, -15) * z, Vector2(3 * z, 3 * z)), Color("#b98b57"))
	if a.ready:
		var bob: float = sin(Time.get_ticks_msec() / 400.0) * 1.5
		draw_rect(Rect2(p + Vector2(-3, -20 + bob) * z, Vector2(6 * z, 6 * z)), Color("#fff8e6"))
		var ic: Color = {"egg": Color("#f2c14e"), "milk": Color("#f6f2e8"), "wool": Color("#f0ece0")}.get(a.product, Color("#fff8e6"))
		draw_rect(Rect2(p + Vector2(-2, -19 + bob) * z, Vector2(4 * z, 4 * z)), ic)


func _draw_villager(v: Dictionary, z: float, is_sel: bool) -> void:
	var p := _w2s(v.x, v.y)
	var c := _colors_for(v)
	var ph: float = sin(float(v.bob))
	var moving: bool = v.state == "task" or v.state == "wander"
	var swing: float = ph * 2.0 if moving else 0.0
	var back: bool = v.dir == "up"
	var side: bool = v.dir == "left" or v.dir == "right"
	var fx: float = 1.0 if v.dir == "right" else (-1.0 if v.dir == "left" else 0.0)
	# 影子
	draw_rect(Rect2(p + Vector2(-8, -2) * z, Vector2(16 * z, 4 * z)), Color(0, 0, 0, 0.18))
	if is_sel:
		draw_arc(p + Vector2(0, -1), 15.0 * z, 0.0, TAU, 28, Color(1.0, 0.85, 0.35, 0.95), 2.0)
	# 腿与鞋
	draw_rect(Rect2(p + Vector2(-5 + swing * 0.4, -10) * z, Vector2(4 * z, 9 * z)), c.pants)
	draw_rect(Rect2(p + Vector2(1 - swing * 0.4, -10) * z, Vector2(4 * z, 9 * z)), c.pants)
	draw_rect(Rect2(p + Vector2(-5 + swing * 0.4, -10) * z, Vector2(4 * z, 2 * z)), c.pants.darkened(0.16))
	draw_rect(Rect2(p + Vector2(1 - swing * 0.4, -10) * z, Vector2(4 * z, 2 * z)), c.pants.darkened(0.16))
	draw_rect(Rect2(p + Vector2(-6 + swing * 0.5, -3) * z, Vector2(6 * z, 3 * z)), Color("#3a2f28"))
	draw_rect(Rect2(p + Vector2(1 - swing * 0.5, -3) * z, Vector2(6 * z, 3 * z)), Color("#3a2f28"))
	draw_rect(Rect2(p + Vector2(-6 + swing * 0.5, -1) * z, Vector2(6 * z, 1 * z)), Color("#9a8a78"))
	draw_rect(Rect2(p + Vector2(1 - swing * 0.5, -1) * z, Vector2(6 * z, 1 * z)), Color("#9a8a78"))
	# 身体与衣服
	draw_rect(Rect2(p + Vector2(-6, -20) * z, Vector2(12 * z, 11 * z)), c.shirt)
	draw_rect(Rect2(p + Vector2(-6, -20) * z, Vector2(3 * z, 11 * z)), c.shirt.darkened(0.14))
	draw_rect(Rect2(p + Vector2(3, -20) * z, Vector2(3 * z, 11 * z)), c.shirt.lightened(0.08))
	draw_rect(Rect2(p + Vector2(-2, -20) * z, Vector2(4 * z, 2 * z)), c.skin.darkened(0.1))
	if c.vest:
		draw_rect(Rect2(p + Vector2(-6, -20) * z, Vector2(4 * z, 11 * z)), Color("#6a6a72"))
		draw_rect(Rect2(p + Vector2(2, -20) * z, Vector2(4 * z, 11 * z)), Color("#6a6a72"))
		draw_rect(Rect2(p + Vector2(-1, -20) * z, Vector2(2 * z, 11 * z)), c.shirt)
	if c.apron:
		draw_rect(Rect2(p + Vector2(-4, -18) * z, Vector2(8 * z, 4 * z)), Color("#efe6d2"))
		draw_rect(Rect2(p + Vector2(-5, -14) * z, Vector2(10 * z, 5 * z)), Color("#efe6d2"))
	if c.tie is Color:
		draw_rect(Rect2(p + Vector2(-1, -19) * z, Vector2(2 * z, 8 * z)), c.tie)
	if c.scarf:
		draw_rect(Rect2(p + Vector2(-6, -21) * z, Vector2(12 * z, 2 * z)), Color("#c25b4e"))
	if c.logo:
		draw_rect(Rect2(p + Vector2(-3, -17) * z, Vector2(6 * z, 4 * z)), Color("#f2c14e"))
		draw_rect(Rect2(p + Vector2(-1, -16) * z, Vector2(2 * z, 2 * z)), Color("#2a2a30"))
	if c.satchel:
		draw_rect(Rect2(p + Vector2(-8, -16) * z, Vector2(4 * z, 6 * z)), Color("#8a5c35"))
		draw_rect(Rect2(p + Vector2(-8, -16) * z, Vector2(4 * z, 1 * z)), Color("#5a3d24"))
	# 手臂与手
	draw_rect(Rect2(p + Vector2(-8, -19 + swing * 0.6) * z, Vector2(3 * z, 8 * z)), c.shirt)
	draw_rect(Rect2(p + Vector2(5, -19 - swing * 0.6) * z, Vector2(3 * z, 8 * z)), c.shirt)
	draw_rect(Rect2(p + Vector2(-8, -12 + swing * 0.6) * z, Vector2(3 * z, 3 * z)), c.skin)
	draw_rect(Rect2(p + Vector2(5, -12 - swing * 0.6) * z, Vector2(3 * z, 3 * z)), c.skin)
	# 头（含耳朵、下颌阴影）
	draw_rect(Rect2(p + Vector2(-5, -31) * z, Vector2(10 * z, 11 * z)), c.skin)
	draw_rect(Rect2(p + Vector2(-5, -22) * z, Vector2(10 * z, 2 * z)), c.skin.darkened(0.1))
	if side:
		var ex: float = 5.0 * fx
		draw_rect(Rect2(p + Vector2(ex - 1, -26) * z, Vector2(2 * z, 3 * z)), c.skin.darkened(0.08))
	else:
		draw_rect(Rect2(p + Vector2(-7, -26) * z, Vector2(2 * z, 3 * z)), c.skin.darkened(0.08))
		draw_rect(Rect2(p + Vector2(5, -26) * z, Vector2(2 * z, 3 * z)), c.skin.darkened(0.08))
	# 头发：小伟短刺、小杨丸子头 + 刘海
	var hair: Color = c.hair
	if v.id == "xiaowei":
		draw_rect(Rect2(p + Vector2(-6, -33) * z, Vector2(12 * z, 4 * z)), hair)
		draw_rect(Rect2(p + Vector2(-6, -30) * z, Vector2(2 * z, 5 * z)), hair)
		draw_rect(Rect2(p + Vector2(4, -30) * z, Vector2(2 * z, 5 * z)), hair)
		draw_rect(Rect2(p + Vector2(-5, -34) * z, Vector2(3 * z, 2 * z)), hair)
		draw_rect(Rect2(p + Vector2(0, -35) * z, Vector2(3 * z, 3 * z)), hair)
		draw_rect(Rect2(p + Vector2(3, -34) * z, Vector2(3 * z, 2 * z)), hair)
	else:
		draw_rect(Rect2(p + Vector2(-6, -33) * z, Vector2(12 * z, 3 * z)), hair)
		draw_rect(Rect2(p + Vector2(-6, -30) * z, Vector2(2 * z, 7 * z)), hair)
		draw_rect(Rect2(p + Vector2(4, -30) * z, Vector2(2 * z, 7 * z)), hair)
		draw_rect(Rect2(p + Vector2(-5, -30) * z, Vector2(10 * z, 2 * z)), hair)
		draw_rect(Rect2(p + Vector2(-2, -37) * z, Vector2(5 * z, 4 * z)), hair)
		draw_rect(Rect2(p + Vector2(-3, -36) * z, Vector2(7 * z, 2 * z)), hair)
	# 脸（背面不画）
	if not back:
		var expr := _expression(v)
		var eye_y: float = -27.0
		if side:
			draw_rect(Rect2(p + Vector2(1 * fx - 1, eye_y) * z, Vector2(2 * z, 2 * z)), Color("#fdfaf2"))
			draw_rect(Rect2(p + Vector2(1 * fx - 0.4, eye_y + 0.4) * z, Vector2(1 * z, 1 * z)), Color("#2a2420"))
		else:
			draw_rect(Rect2(p + Vector2(-4, eye_y) * z, Vector2(3 * z, 2 * z)), Color("#fdfaf2"))
			draw_rect(Rect2(p + Vector2(1, eye_y) * z, Vector2(3 * z, 2 * z)), Color("#fdfaf2"))
			draw_rect(Rect2(p + Vector2(-3, eye_y + 0.3) * z, Vector2(1.4 * z, 1.4 * z)), Color("#2a2420"))
			draw_rect(Rect2(p + Vector2(1.8, eye_y + 0.3) * z, Vector2(1.4 * z, 1.4 * z)), Color("#2a2420"))
		# 眉毛随情绪
		var brow_y: float = -29.0
		if expr == "angry":
			draw_rect(Rect2(p + Vector2(-4, brow_y + 0.6) * z, Vector2(3 * z, 1 * z)), hair.darkened(0.2))
			draw_rect(Rect2(p + Vector2(1, brow_y + 0.6) * z, Vector2(3 * z, 1 * z)), hair.darkened(0.2))
		elif expr == "sad" or expr == "worried":
			draw_rect(Rect2(p + Vector2(-4, brow_y - 0.4) * z, Vector2(3 * z, 1 * z)), hair.darkened(0.2))
			draw_rect(Rect2(p + Vector2(1, brow_y - 0.4) * z, Vector2(3 * z, 1 * z)), hair.darkened(0.2))
		else:
			draw_rect(Rect2(p + Vector2(-4, brow_y) * z, Vector2(3 * z, 1 * z)), hair.darkened(0.2))
			draw_rect(Rect2(p + Vector2(1, brow_y) * z, Vector2(3 * z, 1 * z)), hair.darkened(0.2))
		# 嘴
		var mouth := Color("#8a4a44")
		if v.id == "xiaoyang":
			mouth = Color("#d86a7a")
			if not side:
				draw_rect(Rect2(p + Vector2(-6, -24) * z, Vector2(2 * z, 1 * z)), Color(0.9, 0.6, 0.65, 0.5))
				draw_rect(Rect2(p + Vector2(4, -24) * z, Vector2(2 * z, 1 * z)), Color(0.9, 0.6, 0.65, 0.5))
		if expr == "happy":
			draw_rect(Rect2(p + Vector2(-2, -23) * z, Vector2(4 * z, 1 * z)), mouth)
			draw_rect(Rect2(p + Vector2(-3, -24) * z, Vector2(1 * z, 1 * z)), mouth)
			draw_rect(Rect2(p + Vector2(2, -24) * z, Vector2(1 * z, 1 * z)), mouth)
		elif expr == "sad":
			draw_rect(Rect2(p + Vector2(-2, -24) * z, Vector2(4 * z, 1 * z)), mouth)
			draw_rect(Rect2(p + Vector2(-3, -25) * z, Vector2(1 * z, 1 * z)), mouth)
			draw_rect(Rect2(p + Vector2(2, -25) * z, Vector2(1 * z, 1 * z)), mouth)
		elif expr == "tired":
			draw_rect(Rect2(p + Vector2(-1, -24) * z, Vector2(3 * z, 2 * z)), mouth.darkened(0.2))
		else:
			draw_rect(Rect2(p + Vector2(-2, -24) * z, Vector2(4 * z, 1 * z)), mouth)
	# 帽子
	var hat: String = String(c.hat)
	if hat == "straw":
		draw_rect(Rect2(p + Vector2(-9, -34) * z, Vector2(18 * z, 3 * z)), Color("#e0c070"))
		draw_rect(Rect2(p + Vector2(-5, -37) * z, Vector2(10 * z, 3 * z)), Color("#c9b884"))
	elif hat == "cap":
		draw_rect(Rect2(p + Vector2(-6, -36) * z, Vector2(12 * z, 4 * z)), Color("#2f4a5a"))
		draw_rect(Rect2(p + Vector2(4 * (1.0 if fx >= 0 else -1.0), -33) * z, Vector2(7 * z, 2 * z)), Color("#26404e"))
	elif hat == "helmet":
		draw_rect(Rect2(p + Vector2(-6, -36) * z, Vector2(12 * z, 5 * z)), Color("#e8c040"))
		draw_rect(Rect2(p + Vector2(-2, -35) * z, Vector2(4 * z, 3 * z)), Color("#fff2b0"))
	if c.hood:
		draw_rect(Rect2(p + Vector2(-7, -33) * z, Vector2(14 * z, 4 * z)), Color("#3a3a46"))
	if c.hairpin:
		draw_rect(Rect2(p + Vector2(4, -33) * z, Vector2(3 * z, 2 * z)), Color("#f2c14e"))
	if c.necklace:
		draw_rect(Rect2(p + Vector2(-3, -21) * z, Vector2(6 * z, 1 * z)), Color("#f2c14e"))
	# 手里的工具
	if v.task != null and v.task.stage == "working":
		_draw_tool(v, p, z, c)
	# 工作进度环
	if v.task != null and v.task.stage == "working":
		var prog: float = clamp(float(v.task.t) / float(v.task.dur), 0.0, 1.0)
		draw_arc(p + Vector2(0, -36) * z, 8.0 * z, -PI / 2.0, -PI / 2.0 + TAU * prog, 20, Color(0.45, 0.85, 0.4, 0.95), 3.0)
	# 名牌
	var tag: String = "%s %s" % [_dominant(v), v.name]
	var tw: float = theme.default_font.get_string_size(tag, HORIZONTAL_ALIGNMENT_LEFT, -1, 11).x + 10.0
	draw_rect(Rect2(p + Vector2(-tw / 2.0, -48 * z), Vector2(tw, 15.0)), Color(0.99, 0.96, 0.9, 0.9))
	draw_rect(Rect2(p + Vector2(-tw / 2.0, -48 * z), Vector2(tw, 15.0)), Color(0.42, 0.35, 0.24, 0.35))
	draw_string(theme.default_font, p + Vector2(-tw / 2.0 + 5.0, -37 * z), tag, HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Color(0.29, 0.21, 0.15))
	# 想法气泡
	if v.thought_t > 0.0:
		var txt: String = v.thought
		var wpx: float = theme.default_font.get_string_size(txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 12).x + 14.0
		draw_rect(Rect2(p + Vector2(-wpx / 2.0, -66 * z), Vector2(wpx, 17.0)), Color(0.99, 0.97, 0.92, 0.96))
		draw_rect(Rect2(p + Vector2(-3, -50 * z), Vector2(6, 5)), Color(0.99, 0.97, 0.92, 0.96))
		draw_string(theme.default_font, p + Vector2(-wpx / 2.0 + 7.0, -53 * z), txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color(0.24, 0.18, 0.14))


func _expression(v: Dictionary) -> String:
	if float(v.emo.fatigue) > 62.0:
		return "tired"
	if float(v.emo.anger) > 55.0:
		return "angry"
	if float(v.emo.sadness) > 55.0:
		return "sad"
	if float(v.emo.anxiety) > 62.0:
		return "worried"
	if float(v.emo.joy) > 58.0:
		return "happy"
	return "neutral"


func _draw_tool(v: Dictionary, p: Vector2, z: float, c: Dictionary) -> void:
	var prog: float = clamp(float(v.task.t) / float(v.task.dur), 0.0, 1.0)
	var ang: float = sin(prog * PI * 3.0) * 0.5
	var hx := p + Vector2(7, -12) * z
	match v.task.type:
		"plow":
			draw_line(hx, hx + Vector2(4, -10).rotated(ang) * z, Color("#8a5c35"), 2.0 * z)
			draw_rect(Rect2(hx + Vector2(3, -12).rotated(ang) * z, Vector2(4 * z, 2 * z)), Color("#b8b0a4"))
		"chop":
			draw_line(hx, hx + Vector2(3, -11).rotated(ang) * z, Color("#8a5c35"), 2.0 * z)
			draw_rect(Rect2(hx + Vector2(1, -13).rotated(ang) * z, Vector2(5 * z, 4 * z)), Color("#c0c0c8"))
		"mine":
			draw_line(hx, hx + Vector2(2, -11).rotated(ang) * z, Color("#8a5c35"), 2.0 * z)
			draw_line(hx + Vector2(-4, -11).rotated(ang) * z, hx + Vector2(6, -11).rotated(ang) * z, Color("#b8b0a4"), 2.0 * z)
		"water":
			draw_rect(Rect2(hx + Vector2(-2, 0) * z, Vector2(7 * z, 6 * z)), Color("#5aa8d8"))
			draw_rect(Rect2(hx + Vector2(4, 1) * z, Vector2(5 * z, 2 * z)), Color("#5aa8d8"))
			for i in 3:
				draw_rect(Rect2(hx + Vector2(9 + i, 5 + i * 2) * z, Vector2(1 * z, 2 * z)), Color(0.4, 0.7, 0.95, 0.8))
		"fish":
			draw_line(hx, hx + Vector2(14, -14) * z, Color("#6b5a44"), 1.0 * z)
			draw_rect(Rect2(hx + Vector2(13, -15) * z, Vector2(3 * z, 3 * z)), Color("#d84a3a"))
		"harvest", "collect":
			draw_rect(Rect2(hx + Vector2(-3, 0) * z, Vector2(8 * z, 5 * z)), Color("#c9ab7c"))
			draw_rect(Rect2(hx + Vector2(-3, 0) * z, Vector2(8 * z, 1 * z)), Color("#8a5c35"))
		_:
			draw_rect(Rect2(hx + Vector2(-2, -2) * z, Vector2(6 * z, 7 * z)), Color("#efe6d2"))


# ============================================================ UI
func _build_ui() -> void:
	theme = Theme.new()
	var f := SystemFont.new()
	f.font_names = PackedStringArray(["Microsoft YaHei", "Noto Color Emoji", "Noto Sans CJK SC", "SimHei"])
	theme.default_font = f
	theme.default_font_size = 15

	ui = Control.new()
	ui.size = get_viewport_rect().size
	ui.theme = theme
	add_child(ui)

	# ---------- 顶栏 ----------
	var top := _wood_box(18, 6)
	top_panel = top.outer
	ui.add_child(top_panel)
	var top_row := HBoxContainer.new()
	top_row.add_theme_constant_override("separation", 8)
	top.body.add_child(top_row)
	lbl_money = _chip(top_row, "🪙")
	lbl_date = _chip(top_row, "📅")
	lbl_weather = _chip(top_row, "☀")
	lbl_stage = _chip(top_row, "🌱")
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top_row.add_child(spacer)
	for pair in [["⏸", 0.0], ["▶", 1.0], ["⏩", 2.0], ["4×", 4.0], ["8×", 8.0]]:
		var b := Button.new()
		b.text = pair[0]
		var sp: float = pair[1]
		b.custom_minimum_size = Vector2(44, 34)
		b.pressed.connect(func(): _set_speed(sp))
		_style_button(b, true)
		top_row.add_child(b)
	btn_night = Button.new()
	btn_night.text = "🌙 跳夜"
	btn_night.visible = false
	btn_night.custom_minimum_size = Vector2(90, 34)
	btn_night.pressed.connect(func(): _skip_night(false))
	_style_button(btn_night, true)
	top_row.add_child(btn_night)

	# ---------- 提示条 ----------
	var hint := _wood_box(14, 4)
	hint_panel = hint.outer
	hint_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui.add_child(hint_panel)
	lbl_hint = Label.new()
	lbl_hint.add_theme_color_override("font_color", Color("#5a4326"))
	lbl_hint.add_theme_font_size_override("font_size", 13)
	hint.body.add_child(lbl_hint)

	# ---------- 底栏 ----------
	var bottom := _wood_box(18, 6)
	bottom_panel = bottom.outer
	ui.add_child(bottom_panel)
	var brow := HBoxContainer.new()
	brow.add_theme_constant_override("separation", 8)
	bottom.body.add_child(brow)
	cmd_edit = LineEdit.new()
	cmd_edit.placeholder_text = "说句话：小伟把3号地浇一下 / 都去浇水 / 挤奶 / 跳过夜晚"
	cmd_edit.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	cmd_edit.custom_minimum_size = Vector2(280, 34)
	cmd_edit.text_submitted.connect(func(t2): _run_command(t2); cmd_edit.text = "")
	_style_line_edit(cmd_edit)
	brow.add_child(cmd_edit)
	var send := Button.new()
	send.text = "➤ 传令"
	send.custom_minimum_size = Vector2(92, 34)
	send.pressed.connect(func(): _run_command(cmd_edit.text); cmd_edit.text = "")
	_style_button(send, true)
	brow.add_child(send)
	var divider := VSeparator.new()
	brow.add_child(divider)
	for pair in [["🏪", "seed", "集市"], ["📦", "goods", "仓库"], ["👕", "clothes", "服装"],
		["📜", "quests", "委托"], ["🏆", "stats", "档案"], ["⚙", "settings", "设置"]]:
		var b2 := Button.new()
		b2.text = pair[0]
		b2.tooltip_text = pair[2]
		b2.custom_minimum_size = Vector2(40, 34)
		var tab: String = pair[1]
		b2.pressed.connect(func(): _open_sheet(tab))
		_style_button(b2)
		brow.add_child(b2)

	# ---------- 村民卡片栏 ----------
	roster = VBoxContainer.new()
	roster.add_theme_constant_override("separation", 10)
	ui.add_child(roster)

	# ---------- 遮罩 ----------
	dim = ColorRect.new()
	dim.color = Color(0, 0, 0, 0.42)
	dim.mouse_filter = Control.MOUSE_FILTER_STOP
	dim.visible = false
	dim.gui_input.connect(func(e):
		if e is InputEventMouseButton and e.pressed:
			_close_sheet())
	ui.add_child(dim)

	# ---------- 大面板 ----------
	var sheetbox := _wood_box(20, 8)
	sheet = sheetbox.outer
	sheet.visible = false
	ui.add_child(sheet)
	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 8)
	sheetbox.body.add_child(head)
	sheet_title = Label.new()
	sheet_title.add_theme_font_size_override("font_size", 19)
	sheet_title.add_theme_color_override("font_color", Color("#fdf5e2"))
	sheet_title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(sheet_title)
	var close := Button.new()
	close.text = "✕"
	close.custom_minimum_size = Vector2(44, 32)
	close.pressed.connect(func(): _close_sheet())
	_style_button(close)
	head.add_child(close)
	sheet_tabs = HBoxContainer.new()
	sheet_tabs.add_theme_constant_override("separation", 6)
	sheetbox.body.add_child(sheet_tabs)
	for pair in [["🌱 种子", "seed"], ["📦 仓库", "goods"], ["👕 服装", "clothes"],
		["📜 委托", "quests"], ["🏆 档案", "stats"], ["⚙ 设置", "settings"]]:
		var tb := Button.new()
		tb.text = pair[0]
		tb.custom_minimum_size = Vector2(112, 32)
		var tab2: String = pair[1]
		tb.pressed.connect(func(): _open_sheet(tab2))
		sheet_tabs.add_child(tb)
		tab_buttons[tab2] = tb
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	sheetbox.body.add_child(scroll)
	sheet_body = VBoxContainer.new()
	sheet_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sheet_body.add_theme_constant_override("separation", 6)
	scroll.add_child(sheet_body)

	# ---------- 浮动提示 ----------
	var toastbox := _wood_box(999, 5)
	toast_panel = toastbox.outer
	toast_panel.visible = false
	toast_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui.add_child(toast_panel)
	toast_label = Label.new()
	toast_label.add_theme_color_override("font_color", Color("#4a3524"))
	toast_label.add_theme_font_size_override("font_size", 15)
	toastbox.body.add_child(toast_label)

	# ---------- 阶段 / 新一天卡片 ----------
	var cardbox := _wood_box(18, 8)
	card_panel = cardbox.outer
	card_panel.visible = false
	card_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui.add_child(card_panel)
	card_label = Label.new()
	card_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	card_label.add_theme_font_size_override("font_size", 22)
	card_label.add_theme_color_override("font_color", Color("#4a3524"))
	cardbox.body.add_child(card_label)

	get_viewport().size_changed.connect(_layout_ui)
	_layout_ui()


func _layout_ui() -> void:
	var vs := get_viewport_rect().size
	ui.size = vs
	if top_panel:
		top_panel.position = Vector2(10, 8)
		top_panel.custom_minimum_size = Vector2(vs.x - 20, 0)
	if hint_panel:
		hint_panel.position = Vector2(vs.x / 2.0 - 300.0, vs.y - 112)
		hint_panel.custom_minimum_size = Vector2(600, 0)
	if bottom_panel:
		bottom_panel.position = Vector2(10, vs.y - 66)
		bottom_panel.custom_minimum_size = Vector2(vs.x - 20, 0)
	if roster:
		roster.position = Vector2(14, 66)
		roster.custom_minimum_size = Vector2(250, 0)
	if dim:
		dim.position = Vector2.ZERO
		dim.size = vs
	if sheet:
		var w: float = min(vs.x - 80.0, 860.0)
		var h: float = min(vs.y - 60.0, 580.0)
		sheet.position = Vector2((vs.x - w) / 2.0, (vs.y - h) / 2.0)
		sheet.size = Vector2(w, h)
	if toast_panel:
		toast_panel.position = Vector2(vs.x / 2.0 - 170.0, vs.y - 156.0)
		toast_panel.custom_minimum_size = Vector2(340, 0)
	if card_panel:
		card_panel.position = Vector2(vs.x / 2.0 - 200.0, vs.y / 2.0 - 80.0)
		card_panel.custom_minimum_size = Vector2(400, 0)


func _style_line_edit(e: LineEdit) -> void:
	e.add_theme_stylebox_override("normal", _panel_style(Color("#fffdf5"), Color("#6b4426"), 10))
	e.add_theme_stylebox_override("focus", _panel_style(Color("#fffdf5"), Color("#6fae4f"), 10))
	e.add_theme_color_override("font_color", Color("#4a3524"))
	e.add_theme_color_override("font_placeholder_color", Color("#a89372"))


func _avatar_texture(v: Dictionary) -> Texture2D:
	var key: String = "%s_%s" % [v.id, equipped_outfit.get(v.id, "default")]
	if avatar_cache.has(key):
		return avatar_cache[key]
	var img := Image.create(26, 30, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	var c := _colors_for(v)
	var skin: Color = c.skin
	var hair: Color = c.hair
	# 肩与衣服
	img.fill_rect(Rect2i(5, 21, 16, 9), c.shirt)
	img.fill_rect(Rect2i(5, 21, 4, 9), c.shirt.darkened(0.14))
	if c.get("vest", false):
		img.fill_rect(Rect2i(5, 21, 5, 9), Color("#6a6a72"))
		img.fill_rect(Rect2i(16, 21, 5, 9), Color("#6a6a72"))
	if c.get("apron", false):
		img.fill_rect(Rect2i(9, 22, 8, 8), Color("#efe6d2"))
	img.fill_rect(Rect2i(11, 18, 4, 4), skin.darkened(0.08))
	# 头
	img.fill_rect(Rect2i(6, 6, 14, 14), skin)
	img.fill_rect(Rect2i(6, 17, 14, 3), skin.darkened(0.1))
	img.fill_rect(Rect2i(4, 11, 2, 5), skin.darkened(0.08))
	img.fill_rect(Rect2i(20, 11, 2, 5), skin.darkened(0.08))
	# 头发
	if v.id == "xiaowei":
		img.fill_rect(Rect2i(5, 3, 16, 6), hair)
		img.fill_rect(Rect2i(5, 8, 3, 7), hair)
		img.fill_rect(Rect2i(18, 8, 3, 7), hair)
		img.fill_rect(Rect2i(7, 1, 4, 3), hair)
		img.fill_rect(Rect2i(12, 0, 4, 4), hair)
		img.fill_rect(Rect2i(16, 1, 4, 3), hair)
	else:
		img.fill_rect(Rect2i(4, 2, 18, 7), hair)
		img.fill_rect(Rect2i(4, 8, 3, 11), hair)
		img.fill_rect(Rect2i(19, 8, 3, 11), hair)
		img.fill_rect(Rect2i(6, 8, 14, 3), hair)
		img.fill_rect(Rect2i(9, 0, 8, 3), hair)
		img.fill_rect(Rect2i(10, -1 + 1, 6, 2), hair)
	# 五官
	var expr := _expression(v)
	img.fill_rect(Rect2i(9, 12, 3, 3), Color("#fdfaf2"))
	img.fill_rect(Rect2i(15, 12, 3, 3), Color("#fdfaf2"))
	img.fill_rect(Rect2i(10, 13, 1, 1), Color("#2a2420"))
	img.fill_rect(Rect2i(16, 13, 1, 1), Color("#2a2420"))
	var brow := hair.darkened(0.2)
	if expr == "angry":
		img.fill_rect(Rect2i(9, 11, 3, 1), brow)
		img.fill_rect(Rect2i(15, 11, 3, 1), brow)
	elif expr == "sad" or expr == "worried":
		img.fill_rect(Rect2i(9, 10, 3, 1), brow)
		img.fill_rect(Rect2i(15, 10, 3, 1), brow)
	else:
		img.fill_rect(Rect2i(9, 11, 3, 1), brow)
		img.fill_rect(Rect2i(15, 11, 3, 1), brow)
	var mouth := Color("#8a4a44") if v.id == "xiaowei" else Color("#d86a7a")
	if expr == "happy":
		img.fill_rect(Rect2i(12, 17, 3, 1), mouth)
	elif expr == "tired":
		img.fill_rect(Rect2i(12, 17, 3, 2), mouth.darkened(0.2))
	else:
		img.fill_rect(Rect2i(12, 17, 3, 1), mouth)
	if v.id == "xiaoyang":
		img.fill_rect(Rect2i(7, 15, 3, 2), Color(0.9, 0.6, 0.65, 0.45))
		img.fill_rect(Rect2i(17, 15, 3, 2), Color(0.9, 0.6, 0.65, 0.45))
	# 帽子
	var hat: String = String(c.get("hat", ""))
	if hat == "straw":
		img.fill_rect(Rect2i(2, 5, 22, 3), Color("#e0c070"))
		img.fill_rect(Rect2i(8, 1, 10, 4), Color("#c9b884"))
	elif hat == "cap":
		img.fill_rect(Rect2i(5, 1, 16, 4), Color("#2f4a5a"))
		img.fill_rect(Rect2i(16, 4, 8, 2), Color("#26404e"))
	elif hat == "helmet":
		img.fill_rect(Rect2i(5, 1, 16, 5), Color("#e8c040"))
		img.fill_rect(Rect2i(11, 2, 4, 3), Color("#fff2b0"))
	if c.get("scarf", false):
		img.fill_rect(Rect2i(5, 19, 16, 2), Color("#c25b4e"))
	if c.get("hairpin", false):
		img.fill_rect(Rect2i(18, 4, 3, 2), Color("#f2c14e"))
	var tex := ImageTexture.create_from_image(img)
	avatar_cache[key] = tex
	return tex


func _bar(parent: Node, value: float, fill: Color) -> ProgressBar:
	var bar := ProgressBar.new()
	bar.max_value = 100.0
	bar.value = clamp(value, 0.0, 100.0)
	bar.show_percentage = false
	bar.custom_minimum_size = Vector2(0, 8)
	bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var bg := StyleBoxFlat.new()
	bg.bg_color = Color("#e7dbc0")
	bg.set_corner_radius_all(4)
	var fg := StyleBoxFlat.new()
	fg.bg_color = fill
	fg.set_corner_radius_all(4)
	bar.add_theme_stylebox_override("background", bg)
	bar.add_theme_stylebox_override("fill", fg)
	parent.add_child(bar)
	return bar


func _panel_style(bg: Color, border: Color, radius: int, shadow: int = 0) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.border_color = border
	sb.set_border_width_all(2)
	sb.set_corner_radius_all(radius)
	sb.content_margin_left = 10
	sb.content_margin_right = 10
	sb.content_margin_top = 6
	sb.content_margin_bottom = 6
	if shadow > 0:
		sb.shadow_size = shadow
		sb.shadow_color = Color(0.15, 0.1, 0.05, 0.35)
		sb.shadow_offset = Vector2(0, 2)
	return sb


func _wood_style(radius: int = 16) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color("#8a5c35")
	sb.border_color = Color("#5a3d24")
	sb.set_border_width_all(3)
	sb.set_corner_radius_all(radius)
	sb.shadow_size = 10
	sb.shadow_color = Color(0.12, 0.08, 0.04, 0.4)
	sb.shadow_offset = Vector2(0, 3)
	return sb


func _inset_style(radius: int = 12) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color("#fdf5e2")
	sb.border_color = Color("#d9c49a")
	sb.set_border_width_all(2)
	sb.set_corner_radius_all(radius)
	sb.content_margin_left = 8
	sb.content_margin_right = 8
	sb.content_margin_top = 6
	sb.content_margin_bottom = 6
	return sb


func _row_style(highlight: bool = false) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color("#f7e3b0") if highlight else Color("#fdf5e2")
	sb.border_color = Color("#d8a02e") if highlight else Color("#e6d6b4")
	sb.set_border_width_all(2)
	sb.set_corner_radius_all(10)
	sb.content_margin_left = 8
	sb.content_margin_right = 8
	sb.content_margin_top = 5
	sb.content_margin_bottom = 5
	return sb


func _tab_style(active: bool) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color("#fdf5e2") if active else Color("#7a5a3a")
	sb.border_color = Color("#cbb894") if active else Color("#5a3d24")
	sb.set_border_width_all(2)
	sb.set_corner_radius_all(10)
	sb.content_margin_left = 12
	sb.content_margin_right = 12
	sb.content_margin_top = 5
	sb.content_margin_bottom = 5
	return sb


func _wood_box(radius: int = 16, pad: int = 6, rivets: bool = false) -> Dictionary:
	var outer := PanelContainer.new()
	outer.add_theme_stylebox_override("panel", _wood_style(radius))
	var margin := MarginContainer.new()
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, pad)
	outer.add_child(margin)
	var inner := PanelContainer.new()
	inner.add_theme_stylebox_override("panel", _inset_style(radius - 4))
	margin.add_child(inner)
	var body := VBoxContainer.new()
	body.add_theme_constant_override("separation", 6)
	inner.add_child(body)
	if rivets:
		var dec := Decor.new()
		dec.kind = "rivets"
		dec.mouse_filter = Control.MOUSE_FILTER_IGNORE
		outer.add_child(dec)
	return {"outer": outer, "inner": inner, "body": body}


func _icon_tile(icon: String, bg: Color, size: int = 34) -> PanelContainer:
	var pc := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.border_color = Color("#5a3d24")
	sb.set_border_width_all(2)
	sb.set_corner_radius_all(8)
	pc.add_theme_stylebox_override("panel", sb)
	pc.custom_minimum_size = Vector2(size, size)
	var l := Label.new()
	l.text = icon
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	l.add_theme_font_size_override("font_size", 18)
	pc.add_child(l)
	return pc


func _row(icon: String, icon_bg: Color, title: String, sub: String, btn: String, cb: Callable,
		disabled: bool = false, highlight: bool = false, btn2: String = "", cb2: Callable = Callable()) -> void:
	var pc := PanelContainer.new()
	pc.add_theme_stylebox_override("panel", _row_style(highlight))
	sheet_body.add_child(pc)
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 10)
	pc.add_child(h)
	if icon != "":
		h.add_child(_icon_tile(icon, icon_bg))
	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 2)
	h.add_child(col)
	var t1 := Label.new()
	t1.text = title
	t1.add_theme_color_override("font_color", Color("#4a3524"))
	col.add_child(t1)
	if sub != "":
		var t2 := Label.new()
		t2.text = sub
		t2.add_theme_font_size_override("font_size", 12)
		t2.add_theme_color_override("font_color", Color("#8a7250"))
		col.add_child(t2)
	if btn != "":
		var b := Button.new()
		b.text = btn
		b.custom_minimum_size = Vector2(84, 30)
		b.disabled = disabled
		if not disabled:
			b.pressed.connect(cb)
		_style_button(b, not disabled)
		h.add_child(b)
	if btn2 != "":
		var b2 := Button.new()
		b2.text = btn2
		b2.custom_minimum_size = Vector2(74, 30)
		if cb2.is_valid():
			b2.pressed.connect(cb2)
		_style_button(b2)
		h.add_child(b2)


func _style_button(b: Button, primary: bool = false) -> void:
	if b.custom_minimum_size.x < 58.0:
		b.custom_minimum_size.x = 58.0
	if primary:
		var on := _panel_style(Color("#6fae4f"), Color("#3f6b2f"), 9)
		on.border_width_bottom = 4
		var hov := _panel_style(Color("#7cc35a"), Color("#3f6b2f"), 9)
		hov.border_width_bottom = 4
		var pre := _panel_style(Color("#5c9642"), Color("#3f6b2f"), 9)
		pre.border_width_bottom = 2
		b.add_theme_stylebox_override("normal", on)
		b.add_theme_stylebox_override("hover", hov)
		b.add_theme_stylebox_override("pressed", pre)
		b.add_theme_stylebox_override("disabled", _panel_style(Color("#cfd8c4"), Color("#8a9a7a"), 9))
		b.add_theme_color_override("font_color", Color("#ffffff"))
		b.add_theme_color_override("font_hover_color", Color("#ffffff"))
		b.add_theme_color_override("font_pressed_color", Color("#f0f6e8"))
		b.add_theme_color_override("font_disabled_color", Color("#7d8a70"))
		return
	b.add_theme_stylebox_override("normal", _panel_style(Color("#fff8e6"), Color("#6b4426"), 9))
	b.add_theme_stylebox_override("hover", _panel_style(Color("#fdf1d6"), Color("#6b4426"), 9))
	b.add_theme_stylebox_override("pressed", _panel_style(Color("#efdfbc"), Color("#6b4426"), 9))
	b.add_theme_stylebox_override("disabled", _panel_style(Color("#e6ddc8"), Color("#a89878"), 9))
	b.add_theme_color_override("font_color", Color("#4a3524"))
	b.add_theme_color_override("font_hover_color", Color("#4a3524"))
	b.add_theme_color_override("font_pressed_color", Color("#3a2a18"))
	b.add_theme_color_override("font_focus_color", Color("#4a3524"))
	b.add_theme_color_override("font_disabled_color", Color("#9a8a6a"))


func _chip(parent: HBoxContainer, icon: String = "") -> Label:
	var pc := PanelContainer.new()
	pc.add_theme_stylebox_override("panel", _panel_style(Color("#fff8e6"), Color("#6b4426"), 999))
	parent.add_child(pc)
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 5)
	pc.add_child(h)
	if icon != "":
		var ic := Label.new()
		ic.text = icon
		ic.add_theme_font_size_override("font_size", 14)
		h.add_child(ic)
	var l := Label.new()
	l.add_theme_color_override("font_color", Color("#4a3524"))
	h.add_child(l)
	return l


func _set_speed(sp: float) -> void:
	if sp == 8.0 and not stage_flags.speed8:
		_show_toast("8× 还没解锁：累计收入 150G")
		return
	speed = sp
	paused = sp == 0.0
	_show_toast("已暂停" if sp == 0.0 else "%d 倍速" % int(sp))


func _show_toast(text: String) -> void:
	toast = text
	toast_t = 2.2


func _show_card(title: String, sub: String) -> void:
	card_label.text = "%s\n%s" % [title, sub]
	card_panel.visible = true
	card_t = 2.6


func _log(text: String) -> void:
	logs.append(text)
	if logs.size() > 80:
		logs.pop_front()


func _update_hud() -> void:
	var day := _day()
	var hr: float = fmod(abs_hours, 24.0)
	var clock := "%02d:%02d" % [int(hr), int((hr - int(hr)) * 60.0)]
	lbl_money.text = "金币 %d" % money
	lbl_date.text = "%s 第%d天 %s" % [D.SEASONS[_season()], day, clock]
	lbl_weather.text = {"sunny": "晴", "rain": "雨", "storm": "暴雨"}.get(weather, weather)
	var next := "已全部解锁"
	if stage_index < D.STAGES.size():
		next = "%s → %s" % [D.STAGES[stage_index].cond, D.STAGES[stage_index].unlock]
	lbl_stage.text = "阶段 %d/8 · %s" % [stage_index, D.STAGES[mini(stage_index, 7)].name]
	lbl_stage.tooltip_text = "下一个：" + next
	hint = D.TIPS[int(Time.get_ticks_msec() / 12000) % D.TIPS.size()]
	lbl_hint.text = hint
	toast_label.text = toast
	toast_panel.visible = toast_t > 0.0
	btn_night.visible = hr >= 19.0 or hr < 6.0
	_quest_progress()
	var sig := ""
	for v in villagers:
		sig += "%s|%s|%d|%d|%s|%d|%s;" % [v.name, _verb(v.task.type) if v.task != null else "空闲",
			int(v.needs.hunger), int(v.needs.energy), v.thought, selected, equipped_outfit.get(v.id, "")]
	if sig != roster_sig:
		roster_sig = sig
		for c in roster.get_children():
			c.queue_free()
		for i in villagers.size():
			var v: Dictionary = villagers[i]
			var is_sel: bool = i == selected
			var box := _wood_box(14, 5, true)
			var pc: PanelContainer = box.outer
			pc.custom_minimum_size = Vector2(250, 0)
			if is_sel:
				pc.add_theme_stylebox_override("panel", _panel_style(Color("#6fae4f"), Color("#3f6b2f"), 14, 10))
			pc.mouse_filter = Control.MOUSE_FILTER_STOP
			var idx: int = i
			pc.gui_input.connect(func(e):
				if e is InputEventMouseButton and e.pressed:
					selected = idx
					follow = idx
					_show_toast("跟随 %s" % villagers[idx].name))
			roster.add_child(pc)
			var row := HBoxContainer.new()
			row.add_theme_constant_override("separation", 8)
			box.body.add_child(row)
			var frame := PanelContainer.new()
			frame.add_theme_stylebox_override("panel", _panel_style(Color("#e9f2dd"), Color("#5f8f4a"), 10))
			row.add_child(frame)
			var av := TextureRect.new()
			av.texture = _avatar_texture(v)
			av.custom_minimum_size = Vector2(52, 52)
			av.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
			frame.add_child(av)
			var col := VBoxContainer.new()
			col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			col.add_theme_constant_override("separation", 3)
			row.add_child(col)
			var plate := PanelContainer.new()
			plate.add_theme_stylebox_override("panel", _panel_style(Color("#f3e6c8"), Color("#cbb894"), 8))
			col.add_child(plate)
			var name_row := HBoxContainer.new()
			name_row.add_theme_constant_override("separation", 6)
			plate.add_child(name_row)
			var l1 := Label.new()
			l1.text = "%s %s" % [_dominant(v), v.name]
			l1.add_theme_color_override("font_color", Color("#4a3524"))
			name_row.add_child(l1)
			var l2 := Label.new()
			l2.text = _verb(v.task.type) if v.task != null else "空闲"
			l2.add_theme_font_size_override("font_size", 12)
			l2.add_theme_color_override("font_color", Color("#7c5230"))
			name_row.add_child(l2)
			var bar_row := HBoxContainer.new()
			bar_row.add_theme_constant_override("separation", 4)
			col.add_child(bar_row)
			var ic1 := Label.new()
			ic1.text = "🍎"
			ic1.add_theme_font_size_override("font_size", 12)
			bar_row.add_child(ic1)
			_bar(bar_row, float(v.needs.hunger), Color("#e0a13c"))
			var bar_row2 := HBoxContainer.new()
			bar_row2.add_theme_constant_override("separation", 4)
			col.add_child(bar_row2)
			var ic2 := Label.new()
			ic2.text = "⚡"
			ic2.add_theme_font_size_override("font_size", 12)
			bar_row2.add_child(ic2)
			_bar(bar_row2, float(v.needs.energy), Color("#5aa8d8"))
			var l3 := Label.new()
			l3.text = v.thought
			l3.add_theme_font_size_override("font_size", 12)
			l3.add_theme_color_override("font_color", Color("#836b4e"))
			l3.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			l3.custom_minimum_size = Vector2(180, 0)
			col.add_child(l3)


func _open_sheet(tab: String) -> void:
	sheet_tab = tab
	sheet.visible = true
	dim.visible = true
	for k in tab_buttons.keys():
		var b: Button = tab_buttons[k]
		b.add_theme_stylebox_override("normal", _tab_style(k == tab))
		b.add_theme_stylebox_override("hover", _tab_style(k == tab))
		b.add_theme_stylebox_override("pressed", _tab_style(k == tab))
		b.add_theme_color_override("font_color", Color("#4a3524") if k == tab else Color("#f3e6c8"))
		b.add_theme_color_override("font_hover_color", Color("#4a3524") if k == tab else Color("#ffffff"))
	_render_sheet()


func _close_sheet() -> void:
	sheet.visible = false
	dim.visible = false


func _render_sheet() -> void:
	for c in sheet_body.get_children():
		c.queue_free()
	match sheet_tab:
		"seed": _sheet_seed()
		"goods": _sheet_goods()
		"clothes": _sheet_clothes()
		"quests": _sheet_quests()
		"stats": _sheet_stats()
		"settings": _sheet_settings()


func _sheet_seed() -> void:
	sheet_title.text = "集市 · 种子"
	var icons := {"radish": "🥕", "turnip": "🥬", "carrot": "🥕", "strawberry": "🍓", "pumpkin": "🎃"}
	for k in D.CROPS.keys():
		var crop: Dictionary = D.CROPS[k]
		var key: String = k
		var season_ok: bool = crop.seasons.has(_season())
		_row(String(icons.get(k, "🌱")), Color("#e9f2dd"),
			"%s种子" % crop.name,
			"%dG · 持有 %d · %s" % [int(crop.seed), int(seeds.get(k, 0)), "当季" if season_ok else "非当季"],
			"购买", func():
				if money >= int(D.CROPS[key].seed):
					money -= int(D.CROPS[key].seed)
					seeds[key] = int(seeds.get(key, 0)) + 1
					_show_toast("买了%s种子" % D.CROPS[key].name)
				else:
					_show_toast("钱不够")
				_render_sheet(),
			money < int(crop.seed), not season_ok)
	_row("🍞", Color("#f3e6c8"), "面包", "8G · 持有 %d" % int(inventory.bread), "买一个", func():
		if money >= 8:
			money -= 8
			inventory.bread += 1
			_show_toast("买了一个面包")
		_render_sheet(), money < 8)


func _sheet_goods() -> void:
	sheet_title.text = "仓库 · 卖货"
	var icons := {"wood": "🪵", "fish": "🐟", "stone": "🪨", "ore": "⛏", "egg": "🥚", "milk": "🥛", "wool": "🧶"}
	for k in ["wood", "fish", "stone", "ore", "egg", "milk", "wool"]:
		var n: int = int(inventory.get(k, 0))
		var key: String = k
		_row(String(icons.get(k, "📦")), Color("#f0e4cc"),
			"%s ×%d" % [D.ITEM_NAME[k], n], "单价 %dG" % _price(k),
			"卖 1", func():
				if int(inventory.get(key, 0)) > 0:
					inventory[key] = int(inventory[key]) - 1
					money += _price(key)
					stats.earned += _price(key)
					_show_toast("卖了 1 个%s" % D.ITEM_NAME[key])
				_render_sheet(),
			n <= 0, false,
			"全卖", func():
				var have: int = int(inventory.get(key, 0))
				if have > 0:
					money += _price(key) * have
					stats.earned += _price(key) * have
					inventory[key] = 0
					_show_toast("卖了 %d 个%s" % [have, D.ITEM_NAME[key]])
				_render_sheet())


func _sheet_clothes() -> void:
	sheet_title.text = "服装店 · 每到新阶段上新"
	for v in villagers:
		var tag := Label.new()
		tag.text = "— %s（关系 %.0f）—" % [v.name, bond]
		tag.add_theme_color_override("font_color", Color("#5a4326"))
		sheet_body.add_child(tag)
		for o in D.OUTFITS.get(v.id, []):
			var owned: bool = owned_outfits[v.id].has(o.id)
			var worn: bool = equipped_outfit[v.id] == o.id
			var locked: bool = stage_index < int(o.stage)
			var over: Dictionary = o.c
			var vid: String = v.id
			var oid: String = o.id
			var status := "已穿" if worn else ("已拥有 · 可换" if owned else ("第 %d 阶段 · %dG" % [int(o.stage), int(o.price)]))
			_row("👕", Color(over.get("shirt", "#2a2a30")), o.name, "%s · %s" % [o.desc, status],
				"已穿" if worn else ("穿上" if owned else "购买"),
				func(): _buy_or_wear(vid, oid),
				worn or locked or (not owned and money < int(o.price)), worn)


func _buy_or_wear(vid: String, oid: String) -> void:
	var def := _outfit_def(vid, oid)
	if def.is_empty():
		return
	if not owned_outfits[vid].has(oid):
		if stage_index < int(def.stage):
			_show_toast("第 %d 阶段才解锁" % int(def.stage))
			return
		if money < int(def.price):
			_show_toast("钱不够")
			return
		money -= int(def.price)
		owned_outfits[vid].append(oid)
	equipped_outfit[vid] = oid
	avatar_cache.clear()
	for v in villagers:
		if v.id == vid:
			_log("%s 换上了「%s」" % [v.name, def.name])
	_show_toast("换上了 %s" % def.name)
	if sheet.visible and sheet_tab == "clothes":
		_render_sheet()


func _sheet_quests() -> void:
	sheet_title.text = "每日委托 · 已完成 %d 份" % quests_done
	if not stage_flags.quests:
		_row("🔒", Color("#e6ddc8"), "委托板还没开张", "收获 1 次后解锁", "", Callable(), true)
		return
	for q in quests:
		var qq: Dictionary = q
		var ready: bool = int(q.done) >= int(q.goal) and not q.claimed
		_row("📜", Color("#f3e6c8"), q.text, "进度 %d/%d · 奖励 %dG" % [mini(int(q.done), int(q.goal)), int(q.goal), int(q.reward)],
			"已领" if q.claimed else "领取",
			func():
				if not qq.claimed and int(qq.done) >= int(qq.goal):
					qq.claimed = true
					money += int(qq.reward)
					stats.earned += int(qq.reward)
					quests_done += 1
					_show_toast("委托奖励 +%dG" % int(qq.reward))
					_log("完成委托：%s +%dG" % [qq.text, int(qq.reward)])
				_render_sheet(),
			q.claimed or not ready, ready)


func _sheet_stats() -> void:
	sheet_title.text = "小镇档案"
	_row("🌱", Color("#e9f2dd"), "阶段 %d/8 · %s" % [stage_index, D.STAGES[mini(stage_index, 7)].name],
		"下一个：%s → %s" % [D.STAGES[mini(stage_index, 7)].cond, D.STAGES[mini(stage_index, 7)].unlock], "", Callable())
	_row("🪙", Color("#f7e3b0"), "%dG" % money, "累计收入 %dG" % stats.earned, "", Callable())
	_row("🌾", Color("#f0e4cc"), "收获 %d · 播种 %d" % [stats.harvested, stats.planted],
		"钓鱼 %d · 挖矿 %d · 木头 %d · 牧产 %d" % [stats.fish, stats.mined, stats.wood, stats.collected], "", Callable())
	_row("💗", Color("#f7d9e0"), "小伟 ↔ 小杨 %.0f" % bond, "关系值随相处与 AI 对话变化", "", Callable())
	_row("🗺", Color("#dce9f2"), "青禾村%s 西岭果园%s 后山林地%s 湖畔渔村%s" % [
		"✔" if unlocked.village else "✘", "✔" if unlocked.orchard else "✘",
		"✔" if unlocked.forest else "✘", "✔" if unlocked.lake else "✘"],
		"区域随天数与阶段解锁", "", Callable())
	var t := Label.new()
	t.text = "成就 %d/%d" % [achievements.size(), D.ACHIEVEMENTS.size()]
	t.add_theme_color_override("font_color", Color("#5a4326"))
	sheet_body.add_child(t)
	for a in D.ACHIEVEMENTS:
		var got: bool = achievements.has(a.id)
		_row("🏆" if got else "🔒", Color("#f7e3b0") if got else Color("#e6ddc8"), a.name, a.desc,
			("+%dG" % int(a.reward)) if (got and int(a.reward) > 0) else "", Callable(), true)
	var lt := Label.new()
	lt.text = "近期事件"
	lt.add_theme_color_override("font_color", Color("#5a4326"))
	sheet_body.add_child(lt)
	for line in logs.slice(max(0, logs.size() - 12)):
		_row("", Color.WHITE, line, "", "", Callable())


func _sheet_settings() -> void:
	sheet_title.text = "设置"
	_row("🌙", Color("#dce0f2"), "夜晚自动跳过", "第 2 阶段解锁" if not stage_flags.autoskip else "到 23:00 自动跳到次日 6:00",
		"开" if auto_skip_night else "关",
		func():
			if not stage_flags.autoskip:
				_show_toast("夜晚自动跳过还没解锁：先播种 3 次")
				return
			auto_skip_night = not auto_skip_night
			_render_sheet(),
		not stage_flags.autoskip, auto_skip_night)
	_row("💰", Color("#f7e3b0"), "自动出售收获", "开启后收获直接换钱", "开" if auto_sell else "关",
		func():
			auto_sell = not auto_sell
			_render_sheet(), false, auto_sell)
	_row("💾", Color("#dce9f2"), "存档", "user://tianyuan_save.json", "保存", func():
		_save_game()
		_show_toast("已存档"), false, false, "读取", func():
		_load_game()
		_show_toast("已读档"))


func _row_text(k: String, val: String) -> Label:
	var l := Label.new()
	l.text = "%s：%s" % [k, val]
	l.add_theme_color_override("font_color", Color("#4a3524"))
	return l


func _muted(text: String) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", 12)
	l.add_theme_color_override("font_color", Color("#836b4e"))
	return l


# ============================================================ 输入
func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP:
			zoom = clamp(zoom + 0.25, 1.0, 5.0)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			zoom = clamp(zoom - 0.25, 1.0, 5.0)
		elif event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				var clicked := _villager_at(event.position)
				if clicked >= 0:
					selected = clicked
					follow = clicked
					_show_toast("跟随 %s" % villagers[clicked].name)
				else:
					var cell := _s2w(event.position)
					var near_cloth := false
					var near_board := false
					for pr in props:
						if abs(pr.x - cell.x) < 2.0 and abs(pr.y - cell.y) < 2.0:
							if pr.type == "clothshop":
								near_cloth = true
							elif pr.type == "questboard":
								near_board = true
					if near_cloth:
						_open_sheet("clothes")
					elif near_board:
						_open_sheet("quests")
					else:
						dragging = true
						drag_last = event.position
			else:
				dragging = false
	elif event is InputEventMouseMotion and dragging:
		var delta: Vector2 = event.position - drag_last
		drag_last = event.position
		cam -= delta / (TILE * zoom)
		follow = -1
	elif event is InputEventKey and event.pressed and event.keycode == KEY_SPACE:
		_skip_night(false)


func _s2w(screen: Vector2) -> Vector2:
	return (screen - get_viewport_rect().size * 0.5) / (TILE * zoom) + cam


func _villager_at(screen: Vector2) -> int:
	for i in villagers.size():
		var p := _w2s(villagers[i].x, villagers[i].y)
		if screen.distance_to(Vector2(p.x, p.y - 12 * zoom)) < 22.0 * zoom:
			return i
	return -1


# ============================================================ 自检 / 截图
var smoke_done := false

func _smoke(on: bool) -> void:
	if not on:
		return
	if frames == 30 and not smoke_done:
		smoke_done = true
		money = 2000
		stats.harvested = 12
		stats.planted = 5
		stats.fish = 6
		stats.mined = 12
		stats.earned = 800
		bond = 62.0
		stage_index = 7
		stage_flags.mine = true
		_check_stage()
		_refresh_solid()
		_buy_or_wear("xiaowei", "farm")
		_buy_or_wear("xiaoyang", "festival")
		_run_command("都去浇水")
		_run_command("小伟把1号地开垦")
		_run_command("小杨去钓鱼")
		_skip_night(false)
	if frames == 260:
		var info: Array = []
		for v in villagers:
			info.append("%s@%.1f,%.1f:%s" % [v.name, v.x, v.y, "task" if v.task != null else v.state])
		print("SMOKE money=%d stage=%d flags=%s ach=%d seeds=%s stats=%s outfit=%s unlocked=%s" % [
			money, stage_index, str(stage_flags), achievements.size(), str(seeds), str(stats),
			str(equipped_outfit), str(unlocked)])
		print("SMOKE villagers=%s plots=%d animals=%d quests=%s" % [str(info), plots.size(), animals.size(),
			str(quests.map(func(q): return "%s:%d/%d" % [q.id, q.done, q.goal]))])


func _screenshot() -> void:
	var img := get_viewport().get_texture().get_image()
	var dir := DirAccess.open("res://")
	if dir and not dir.dir_exists("shots"):
		dir.make_dir("shots")
	img.save_png("res://shots/godot-02.png")










# ============================================================ 装饰
class Decor extends Control:
	var kind := "rivets"

	func _draw() -> void:
		if kind == "rivets":
			var s := size
			for p in [Vector2(9, 9), Vector2(s.x - 9, 9), Vector2(9, s.y - 9), Vector2(s.x - 9, s.y - 9)]:
				draw_circle(p, 3.0, Color("#d8b06a"))
				draw_circle(p, 1.4, Color("#8a5c35"))
		elif kind == "corner":
			_leaf(Vector2(12, 12), -0.7)
			_leaf(Vector2(24, 8), -0.2)
			_leaf(Vector2(8, 24), -1.1)
			draw_circle(Vector2(20, 18), 3.5, Color("#f2f0ea"))
			draw_circle(Vector2(20, 18), 1.6, Color("#f2c14e"))

	func _leaf(pos: Vector2, rot: float) -> void:
		var pts := PackedVector2Array()
		for i in 12:
			var a: float = TAU * float(i) / 12.0
			pts.append(pos + Vector2(cos(a) * 4.0, sin(a) * 8.0).rotated(rot))
		draw_colored_polygon(pts, Color("#5f9a48"))
		draw_line(pos, pos + Vector2(0, 7).rotated(rot), Color("#3f7a3a"), 1.0)
