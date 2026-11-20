from pathlib import Path

p = Path(r'D:\桌面\田园小镇\godot\scripts\main.gd')
t = p.read_text(encoding='utf-8')

# ============ 1) 村民立绘：更细的身体 / 四方向 / 表情 / 工具 / 名牌 ============
a = t.index("func _draw_villager(")
b = t.index("# ============================================================ UI")
villager = '''func _draw_villager(v: Dictionary, z: float, is_sel: bool) -> void:
\tvar p := _w2s(v.x, v.y)
\tvar c := _colors_for(v)
\tvar ph: float = sin(float(v.bob))
\tvar moving: bool = v.state == "task" or v.state == "wander"
\tvar swing: float = ph * 2.0 if moving else 0.0
\tvar back: bool = v.dir == "up"
\tvar side: bool = v.dir == "left" or v.dir == "right"
\tvar fx: float = 1.0 if v.dir == "right" else (-1.0 if v.dir == "left" else 0.0)
\t# 影子
\tdraw_rect(Rect2(p + Vector2(-8, -2) * z, Vector2(16 * z, 4 * z)), Color(0, 0, 0, 0.18))
\tif is_sel:
\t\tdraw_arc(p + Vector2(0, -1), 15.0 * z, 0.0, TAU, 28, Color(1.0, 0.85, 0.35, 0.95), 2.0)
\t# 腿与鞋
\tdraw_rect(Rect2(p + Vector2(-5 + swing * 0.4, -10) * z, Vector2(4 * z, 9 * z)), c.pants)
\tdraw_rect(Rect2(p + Vector2(1 - swing * 0.4, -10) * z, Vector2(4 * z, 9 * z)), c.pants)
\tdraw_rect(Rect2(p + Vector2(-5 + swing * 0.4, -10) * z, Vector2(4 * z, 2 * z)), c.pants.darkened(0.16))
\tdraw_rect(Rect2(p + Vector2(1 - swing * 0.4, -10) * z, Vector2(4 * z, 2 * z)), c.pants.darkened(0.16))
\tdraw_rect(Rect2(p + Vector2(-6 + swing * 0.5, -3) * z, Vector2(6 * z, 3 * z)), Color("#3a2f28"))
\tdraw_rect(Rect2(p + Vector2(1 - swing * 0.5, -3) * z, Vector2(6 * z, 3 * z)), Color("#3a2f28"))
\tdraw_rect(Rect2(p + Vector2(-6 + swing * 0.5, -1) * z, Vector2(6 * z, 1 * z)), Color("#9a8a78"))
\tdraw_rect(Rect2(p + Vector2(1 - swing * 0.5, -1) * z, Vector2(6 * z, 1 * z)), Color("#9a8a78"))
\t# 身体与衣服
\tdraw_rect(Rect2(p + Vector2(-6, -20) * z, Vector2(12 * z, 11 * z)), c.shirt)
\tdraw_rect(Rect2(p + Vector2(-6, -20) * z, Vector2(3 * z, 11 * z)), c.shirt.darkened(0.14))
\tdraw_rect(Rect2(p + Vector2(3, -20) * z, Vector2(3 * z, 11 * z)), c.shirt.lightened(0.08))
\tdraw_rect(Rect2(p + Vector2(-2, -20) * z, Vector2(4 * z, 2 * z)), c.skin.darkened(0.1))
\tif c.vest:
\t\tdraw_rect(Rect2(p + Vector2(-6, -20) * z, Vector2(4 * z, 11 * z)), Color("#6a6a72"))
\t\tdraw_rect(Rect2(p + Vector2(2, -20) * z, Vector2(4 * z, 11 * z)), Color("#6a6a72"))
\t\tdraw_rect(Rect2(p + Vector2(-1, -20) * z, Vector2(2 * z, 11 * z)), c.shirt)
\tif c.apron:
\t\tdraw_rect(Rect2(p + Vector2(-4, -18) * z, Vector2(8 * z, 4 * z)), Color("#efe6d2"))
\t\tdraw_rect(Rect2(p + Vector2(-5, -14) * z, Vector2(10 * z, 5 * z)), Color("#efe6d2"))
\tif c.tie is Color:
\t\tdraw_rect(Rect2(p + Vector2(-1, -19) * z, Vector2(2 * z, 8 * z)), c.tie)
\tif c.scarf:
\t\tdraw_rect(Rect2(p + Vector2(-6, -21) * z, Vector2(12 * z, 2 * z)), Color("#c25b4e"))
\tif c.logo:
\t\tdraw_rect(Rect2(p + Vector2(-3, -17) * z, Vector2(6 * z, 4 * z)), Color("#f2c14e"))
\t\tdraw_rect(Rect2(p + Vector2(-1, -16) * z, Vector2(2 * z, 2 * z)), Color("#2a2a30"))
\tif c.satchel:
\t\tdraw_rect(Rect2(p + Vector2(-8, -16) * z, Vector2(4 * z, 6 * z)), Color("#8a5c35"))
\t\tdraw_rect(Rect2(p + Vector2(-8, -16) * z, Vector2(4 * z, 1 * z)), Color("#5a3d24"))
\t# 手臂与手
\tdraw_rect(Rect2(p + Vector2(-8, -19 + swing * 0.6) * z, Vector2(3 * z, 8 * z)), c.shirt)
\tdraw_rect(Rect2(p + Vector2(5, -19 - swing * 0.6) * z, Vector2(3 * z, 8 * z)), c.shirt)
\tdraw_rect(Rect2(p + Vector2(-8, -12 + swing * 0.6) * z, Vector2(3 * z, 3 * z)), c.skin)
\tdraw_rect(Rect2(p + Vector2(5, -12 - swing * 0.6) * z, Vector2(3 * z, 3 * z)), c.skin)
\t# 头（含耳朵、下颌阴影）
\tdraw_rect(Rect2(p + Vector2(-5, -31) * z, Vector2(10 * z, 11 * z)), c.skin)
\tdraw_rect(Rect2(p + Vector2(-5, -22) * z, Vector2(10 * z, 2 * z)), c.skin.darkened(0.1))
\tif side:
\t\tvar ex: float = 5.0 * fx
\t\tdraw_rect(Rect2(p + Vector2(ex - 1, -26) * z, Vector2(2 * z, 3 * z)), c.skin.darkened(0.08))
\telse:
\t\tdraw_rect(Rect2(p + Vector2(-7, -26) * z, Vector2(2 * z, 3 * z)), c.skin.darkened(0.08))
\t\tdraw_rect(Rect2(p + Vector2(5, -26) * z, Vector2(2 * z, 3 * z)), c.skin.darkened(0.08))
\t# 头发：小伟短刺、小杨丸子头 + 刘海
\tvar hair: Color = c.hair
\tif v.id == "xiaowei":
\t\tdraw_rect(Rect2(p + Vector2(-6, -33) * z, Vector2(12 * z, 4 * z)), hair)
\t\tdraw_rect(Rect2(p + Vector2(-6, -30) * z, Vector2(2 * z, 5 * z)), hair)
\t\tdraw_rect(Rect2(p + Vector2(4, -30) * z, Vector2(2 * z, 5 * z)), hair)
\t\tdraw_rect(Rect2(p + Vector2(-5, -34) * z, Vector2(3 * z, 2 * z)), hair)
\t\tdraw_rect(Rect2(p + Vector2(0, -35) * z, Vector2(3 * z, 3 * z)), hair)
\t\tdraw_rect(Rect2(p + Vector2(3, -34) * z, Vector2(3 * z, 2 * z)), hair)
\telse:
\t\tdraw_rect(Rect2(p + Vector2(-6, -33) * z, Vector2(12 * z, 3 * z)), hair)
\t\tdraw_rect(Rect2(p + Vector2(-6, -30) * z, Vector2(2 * z, 7 * z)), hair)
\t\tdraw_rect(Rect2(p + Vector2(4, -30) * z, Vector2(2 * z, 7 * z)), hair)
\t\tdraw_rect(Rect2(p + Vector2(-5, -30) * z, Vector2(10 * z, 2 * z)), hair)
\t\tdraw_rect(Rect2(p + Vector2(-2, -37) * z, Vector2(5 * z, 4 * z)), hair)
\t\tdraw_rect(Rect2(p + Vector2(-3, -36) * z, Vector2(7 * z, 2 * z)), hair)
\t# 脸（背面不画）
\tif not back:
\t\tvar expr := _expression(v)
\t\tvar eye_y: float = -27.0
\t\tif side:
\t\t\tdraw_rect(Rect2(p + Vector2(1 * fx - 1, eye_y) * z, Vector2(2 * z, 2 * z)), Color("#fdfaf2"))
\t\t\tdraw_rect(Rect2(p + Vector2(1 * fx - 0.4, eye_y + 0.4) * z, Vector2(1 * z, 1 * z)), Color("#2a2420"))
\t\telse:
\t\t\tdraw_rect(Rect2(p + Vector2(-4, eye_y) * z, Vector2(3 * z, 2 * z)), Color("#fdfaf2"))
\t\t\tdraw_rect(Rect2(p + Vector2(1, eye_y) * z, Vector2(3 * z, 2 * z)), Color("#fdfaf2"))
\t\t\tdraw_rect(Rect2(p + Vector2(-3, eye_y + 0.3) * z, Vector2(1.4 * z, 1.4 * z)), Color("#2a2420"))
\t\t\tdraw_rect(Rect2(p + Vector2(1.8, eye_y + 0.3) * z, Vector2(1.4 * z, 1.4 * z)), Color("#2a2420"))
\t\t# 眉毛随情绪
\t\tvar brow_y: float = -29.0
\t\tif expr == "angry":
\t\t\tdraw_rect(Rect2(p + Vector2(-4, brow_y + 0.6) * z, Vector2(3 * z, 1 * z)), hair.darkened(0.2))
\t\t\tdraw_rect(Rect2(p + Vector2(1, brow_y + 0.6) * z, Vector2(3 * z, 1 * z)), hair.darkened(0.2))
\t\telif expr == "sad" or expr == "worried":
\t\t\tdraw_rect(Rect2(p + Vector2(-4, brow_y - 0.4) * z, Vector2(3 * z, 1 * z)), hair.darkened(0.2))
\t\t\tdraw_rect(Rect2(p + Vector2(1, brow_y - 0.4) * z, Vector2(3 * z, 1 * z)), hair.darkened(0.2))
\t\telse:
\t\t\tdraw_rect(Rect2(p + Vector2(-4, brow_y) * z, Vector2(3 * z, 1 * z)), hair.darkened(0.2))
\t\t\tdraw_rect(Rect2(p + Vector2(1, brow_y) * z, Vector2(3 * z, 1 * z)), hair.darkened(0.2))
\t\t# 嘴
\t\tvar mouth := Color("#8a4a44")
\t\tif v.id == "xiaoyang":
\t\t\tmouth = Color("#d86a7a")
\t\t\tif not side:
\t\t\t\tdraw_rect(Rect2(p + Vector2(-6, -24) * z, Vector2(2 * z, 1 * z)), Color(0.9, 0.6, 0.65, 0.5))
\t\t\t\tdraw_rect(Rect2(p + Vector2(4, -24) * z, Vector2(2 * z, 1 * z)), Color(0.9, 0.6, 0.65, 0.5))
\t\tif expr == "happy":
\t\t\tdraw_rect(Rect2(p + Vector2(-2, -23) * z, Vector2(4 * z, 1 * z)), mouth)
\t\t\tdraw_rect(Rect2(p + Vector2(-3, -24) * z, Vector2(1 * z, 1 * z)), mouth)
\t\t\tdraw_rect(Rect2(p + Vector2(2, -24) * z, Vector2(1 * z, 1 * z)), mouth)
\t\telif expr == "sad":
\t\t\tdraw_rect(Rect2(p + Vector2(-2, -24) * z, Vector2(4 * z, 1 * z)), mouth)
\t\t\tdraw_rect(Rect2(p + Vector2(-3, -25) * z, Vector2(1 * z, 1 * z)), mouth)
\t\t\tdraw_rect(Rect2(p + Vector2(2, -25) * z, Vector2(1 * z, 1 * z)), mouth)
\t\telif expr == "tired":
\t\t\tdraw_rect(Rect2(p + Vector2(-1, -24) * z, Vector2(3 * z, 2 * z)), mouth.darkened(0.2))
\t\telse:
\t\t\tdraw_rect(Rect2(p + Vector2(-2, -24) * z, Vector2(4 * z, 1 * z)), mouth)
\t# 帽子
\tvar hat: String = String(c.hat)
\tif hat == "straw":
\t\tdraw_rect(Rect2(p + Vector2(-9, -34) * z, Vector2(18 * z, 3 * z)), Color("#e0c070"))
\t\tdraw_rect(Rect2(p + Vector2(-5, -37) * z, Vector2(10 * z, 3 * z)), Color("#c9b884"))
\telif hat == "cap":
\t\tdraw_rect(Rect2(p + Vector2(-6, -36) * z, Vector2(12 * z, 4 * z)), Color("#2f4a5a"))
\t\tdraw_rect(Rect2(p + Vector2(4 * (1.0 if fx >= 0 else -1.0), -33) * z, Vector2(7 * z, 2 * z)), Color("#26404e"))
\telif hat == "helmet":
\t\tdraw_rect(Rect2(p + Vector2(-6, -36) * z, Vector2(12 * z, 5 * z)), Color("#e8c040"))
\t\tdraw_rect(Rect2(p + Vector2(-2, -35) * z, Vector2(4 * z, 3 * z)), Color("#fff2b0"))
\tif c.hood:
\t\tdraw_rect(Rect2(p + Vector2(-7, -33) * z, Vector2(14 * z, 4 * z)), Color("#3a3a46"))
\tif c.hairpin:
\t\tdraw_rect(Rect2(p + Vector2(4, -33) * z, Vector2(3 * z, 2 * z)), Color("#f2c14e"))
\tif c.necklace:
\t\tdraw_rect(Rect2(p + Vector2(-3, -21) * z, Vector2(6 * z, 1 * z)), Color("#f2c14e"))
\t# 手里的工具
\tif v.task != null and v.task.stage == "working":
\t\t_draw_tool(v, p, z, c)
\t# 工作进度环
\tif v.task != null and v.task.stage == "working":
\t\tvar prog: float = clamp(float(v.task.t) / float(v.task.dur), 0.0, 1.0)
\t\tdraw_arc(p + Vector2(0, -36) * z, 8.0 * z, -PI / 2.0, -PI / 2.0 + TAU * prog, 20, Color(0.45, 0.85, 0.4, 0.95), 3.0)
\t# 名牌
\tvar tag: String = "%s %s" % [_dominant(v), v.name]
\tvar tw: float = theme.default_font.get_string_size(tag, HORIZONTAL_ALIGNMENT_LEFT, -1, 11).x + 10.0
\tdraw_rect(Rect2(p + Vector2(-tw / 2.0, -48 * z), Vector2(tw, 15.0)), Color(0.99, 0.96, 0.9, 0.9))
\tdraw_rect(Rect2(p + Vector2(-tw / 2.0, -48 * z), Vector2(tw, 15.0)), Color(0.42, 0.35, 0.24, 0.35))
\tdraw_string(theme.default_font, p + Vector2(-tw / 2.0 + 5.0, -37 * z), tag, HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Color(0.29, 0.21, 0.15))
\t# 想法气泡
\tif v.thought_t > 0.0:
\t\tvar txt: String = v.thought
\t\tvar wpx: float = theme.default_font.get_string_size(txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 12).x + 14.0
\t\tdraw_rect(Rect2(p + Vector2(-wpx / 2.0, -66 * z), Vector2(wpx, 17.0)), Color(0.99, 0.97, 0.92, 0.96))
\t\tdraw_rect(Rect2(p + Vector2(-3, -50 * z), Vector2(6, 5)), Color(0.99, 0.97, 0.92, 0.96))
\t\tdraw_string(theme.default_font, p + Vector2(-wpx / 2.0 + 7.0, -53 * z), txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color(0.24, 0.18, 0.14))


func _expression(v: Dictionary) -> String:
\tif float(v.emo.fatigue) > 62.0:
\t\treturn "tired"
\tif float(v.emo.anger) > 55.0:
\t\treturn "angry"
\tif float(v.emo.sadness) > 55.0:
\t\treturn "sad"
\tif float(v.emo.anxiety) > 62.0:
\t\treturn "worried"
\tif float(v.emo.joy) > 58.0:
\t\treturn "happy"
\treturn "neutral"


func _draw_tool(v: Dictionary, p: Vector2, z: float, c: Dictionary) -> void:
\tvar prog: float = clamp(float(v.task.t) / float(v.task.dur), 0.0, 1.0)
\tvar ang: float = sin(prog * PI * 3.0) * 0.5
\tvar hx := p + Vector2(7, -12) * z
\tmatch v.task.type:
\t\t"plow":
\t\t\tdraw_line(hx, hx + Vector2(4, -10).rotated(ang) * z, Color("#8a5c35"), 2.0 * z)
\t\t\tdraw_rect(Rect2(hx + Vector2(3, -12).rotated(ang) * z, Vector2(4 * z, 2 * z)), Color("#b8b0a4"))
\t\t"chop":
\t\t\tdraw_line(hx, hx + Vector2(3, -11).rotated(ang) * z, Color("#8a5c35"), 2.0 * z)
\t\t\tdraw_rect(Rect2(hx + Vector2(1, -13).rotated(ang) * z, Vector2(5 * z, 4 * z)), Color("#c0c0c8"))
\t\t"mine":
\t\t\tdraw_line(hx, hx + Vector2(2, -11).rotated(ang) * z, Color("#8a5c35"), 2.0 * z)
\t\t\tdraw_line(hx + Vector2(-4, -11).rotated(ang) * z, hx + Vector2(6, -11).rotated(ang) * z, Color("#b8b0a4"), 2.0 * z)
\t\t"water":
\t\t\tdraw_rect(Rect2(hx + Vector2(-2, 0) * z, Vector2(7 * z, 6 * z)), Color("#5aa8d8"))
\t\t\tdraw_rect(Rect2(hx + Vector2(4, 1) * z, Vector2(5 * z, 2 * z)), Color("#5aa8d8"))
\t\t\tfor i in 3:
\t\t\t\tdraw_rect(Rect2(hx + Vector2(9 + i, 5 + i * 2) * z, Vector2(1 * z, 2 * z)), Color(0.4, 0.7, 0.95, 0.8))
\t\t"fish":
\t\t\tdraw_line(hx, hx + Vector2(14, -14) * z, Color("#6b5a44"), 1.0 * z)
\t\t\tdraw_rect(Rect2(hx + Vector2(13, -15) * z, Vector2(3 * z, 3 * z)), Color("#d84a3a"))
\t\t"harvest", "collect":
\t\t\tdraw_rect(Rect2(hx + Vector2(-3, 0) * z, Vector2(8 * z, 5 * z)), Color("#c9ab7c"))
\t\t\tdraw_rect(Rect2(hx + Vector2(-3, 0) * z, Vector2(8 * z, 1 * z)), Color("#8a5c35"))
\t\t_:
\t\t\tdraw_rect(Rect2(hx + Vector2(-2, -2) * z, Vector2(6 * z, 7 * z)), Color("#efe6d2"))


'''
t = t[:a] + villager + t[b:]

# ============ 2) 头像：更接近人物设定 ============
a = t.index("func _avatar_texture(")
b = t.index("func _bar(")
avatar = '''func _avatar_texture(v: Dictionary) -> Texture2D:
\tvar key: String = "%s_%s" % [v.id, equipped_outfit.get(v.id, "default")]
\tif avatar_cache.has(key):
\t\treturn avatar_cache[key]
\tvar img := Image.create(26, 30, false, Image.FORMAT_RGBA8)
\timg.fill(Color(0, 0, 0, 0))
\tvar c := _colors_for(v)
\tvar skin: Color = c.skin
\tvar hair: Color = c.hair
\t# 肩与衣服
\timg.fill_rect(Rect2i(5, 21, 16, 9), c.shirt)
\timg.fill_rect(Rect2i(5, 21, 4, 9), c.shirt.darkened(0.14))
\tif c.get("vest", false):
\t\timg.fill_rect(Rect2i(5, 21, 5, 9), Color("#6a6a72"))
\t\timg.fill_rect(Rect2i(16, 21, 5, 9), Color("#6a6a72"))
\tif c.get("apron", false):
\t\timg.fill_rect(Rect2i(9, 22, 8, 8), Color("#efe6d2"))
\timg.fill_rect(Rect2i(11, 18, 4, 4), skin.darkened(0.08))
\t# 头
\timg.fill_rect(Rect2i(6, 6, 14, 14), skin)
\timg.fill_rect(Rect2i(6, 17, 14, 3), skin.darkened(0.1))
\timg.fill_rect(Rect2i(4, 11, 2, 5), skin.darkened(0.08))
\timg.fill_rect(Rect2i(20, 11, 2, 5), skin.darkened(0.08))
\t# 头发
\tif v.id == "xiaowei":
\t\timg.fill_rect(Rect2i(5, 3, 16, 6), hair)
\t\timg.fill_rect(Rect2i(5, 8, 3, 7), hair)
\t\timg.fill_rect(Rect2i(18, 8, 3, 7), hair)
\t\timg.fill_rect(Rect2i(7, 1, 4, 3), hair)
\t\timg.fill_rect(Rect2i(12, 0, 4, 4), hair)
\t\timg.fill_rect(Rect2i(16, 1, 4, 3), hair)
\telse:
\t\timg.fill_rect(Rect2i(4, 2, 18, 7), hair)
\t\timg.fill_rect(Rect2i(4, 8, 3, 11), hair)
\t\timg.fill_rect(Rect2i(19, 8, 3, 11), hair)
\t\timg.fill_rect(Rect2i(6, 8, 14, 3), hair)
\t\timg.fill_rect(Rect2i(9, 0, 8, 3), hair)
\t\timg.fill_rect(Rect2i(10, -1 + 1, 6, 2), hair)
\t# 五官
\tvar expr := _expression(v)
\timg.fill_rect(Rect2i(9, 12, 3, 3), Color("#fdfaf2"))
\timg.fill_rect(Rect2i(15, 12, 3, 3), Color("#fdfaf2"))
\timg.fill_rect(Rect2i(10, 13, 1, 1), Color("#2a2420"))
\timg.fill_rect(Rect2i(16, 13, 1, 1), Color("#2a2420"))
\tvar brow := hair.darkened(0.2)
\tif expr == "angry":
\t\timg.fill_rect(Rect2i(9, 11, 3, 1), brow)
\t\timg.fill_rect(Rect2i(15, 11, 3, 1), brow)
\telif expr == "sad" or expr == "worried":
\t\timg.fill_rect(Rect2i(9, 10, 3, 1), brow)
\t\timg.fill_rect(Rect2i(15, 10, 3, 1), brow)
\telse:
\t\timg.fill_rect(Rect2i(9, 11, 3, 1), brow)
\t\timg.fill_rect(Rect2i(15, 11, 3, 1), brow)
\tvar mouth := Color("#8a4a44") if v.id == "xiaowei" else Color("#d86a7a")
\tif expr == "happy":
\t\timg.fill_rect(Rect2i(12, 17, 3, 1), mouth)
\telif expr == "tired":
\t\timg.fill_rect(Rect2i(12, 17, 3, 2), mouth.darkened(0.2))
\telse:
\t\timg.fill_rect(Rect2i(12, 17, 3, 1), mouth)
\tif v.id == "xiaoyang":
\t\timg.fill_rect(Rect2i(7, 15, 3, 2), Color(0.9, 0.6, 0.65, 0.45))
\t\timg.fill_rect(Rect2i(17, 15, 3, 2), Color(0.9, 0.6, 0.65, 0.45))
\t# 帽子
\tvar hat: String = String(c.get("hat", ""))
\tif hat == "straw":
\t\timg.fill_rect(Rect2i(2, 5, 22, 3), Color("#e0c070"))
\t\timg.fill_rect(Rect2i(8, 1, 10, 4), Color("#c9b884"))
\telif hat == "cap":
\t\timg.fill_rect(Rect2i(5, 1, 16, 4), Color("#2f4a5a"))
\t\timg.fill_rect(Rect2i(16, 4, 8, 2), Color("#26404e"))
\telif hat == "helmet":
\t\timg.fill_rect(Rect2i(5, 1, 16, 5), Color("#e8c040"))
\t\timg.fill_rect(Rect2i(11, 2, 4, 3), Color("#fff2b0"))
\tif c.get("scarf", false):
\t\timg.fill_rect(Rect2i(5, 19, 16, 2), Color("#c25b4e"))
\tif c.get("hairpin", false):
\t\timg.fill_rect(Rect2i(18, 4, 3, 2), Color("#f2c14e"))
\tvar tex := ImageTexture.create_from_image(img)
\tavatar_cache[key] = tex
\treturn tex


'''
t = t[:a] + avatar + t[b:]

p.write_text(t, encoding='utf-8')
print('characters rewritten, lines =', len(t.splitlines()))
