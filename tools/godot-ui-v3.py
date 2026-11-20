from pathlib import Path

p = Path(r'D:\桌面\田园小镇\godot\scripts\main.gd')
t = p.read_text(encoding='utf-8')

# ---------- 1) 新增字段 ----------
old_field = "var btn_night: Button\n"
new_field = """var btn_night: Button
var top_panel: PanelContainer
var bottom_panel: PanelContainer
var hint_panel: PanelContainer
var toast_panel: PanelContainer
var dim: ColorRect
var sheet_tabs: HBoxContainer
var tab_buttons := {}
var avatar_cache := {}
"""
assert old_field in t
t = t.replace(old_field, new_field, 1)

# ---------- 2) 替换 _build_ui ----------
a = t.index("func _build_ui() -> void:")
b = t.index("func _panel_style(bg: Color")
block_a = '''func _build_ui() -> void:
\ttheme = Theme.new()
\tvar f := SystemFont.new()
\tf.font_names = PackedStringArray(["Microsoft YaHei", "Noto Sans CJK SC", "SimHei", "sans-serif"])
\ttheme.default_font = f
\ttheme.default_font_size = 14

\tui = Control.new()
\tui.size = get_viewport_rect().size
\tui.theme = theme
\tadd_child(ui)

\t# 顶栏：状态胶囊 + 速度 + 跳夜
\ttop_panel = PanelContainer.new()
\ttop_panel.add_theme_stylebox_override("panel", _panel_style(Color("#fbf3df"), Color("#6b4426"), 14))
\tui.add_child(top_panel)
\tvar top_row := HBoxContainer.new()
\ttop_row.add_theme_constant_override("separation", 8)
\ttop_panel.add_child(top_row)
\tlbl_money = _chip(top_row)
\tlbl_date = _chip(top_row)
\tlbl_weather = _chip(top_row)
\tlbl_stage = _chip(top_row)
\tvar spacer := Control.new()
\tspacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
\ttop_row.add_child(spacer)
\tfor pair in [["⏸", 0.0], ["1×", 1.0], ["2×", 2.0], ["4×", 4.0], ["8×", 8.0]]:
\t\tvar b := Button.new()
\t\tb.text = pair[0]
\t\tvar sp: float = pair[1]
\t\tb.custom_minimum_size = Vector2(46, 30)
\t\tb.pressed.connect(func(): _set_speed(sp))
\t\t_style_button(b)
\t\ttop_row.add_child(b)
\tbtn_night = Button.new()
\tbtn_night.text = "🌙 跳夜"
\tbtn_night.visible = false
\tbtn_night.custom_minimum_size = Vector2(84, 30)
\tbtn_night.pressed.connect(func(): _skip_night(false))
\t_style_button(btn_night)
\ttop_row.add_child(btn_night)

\t# 提示条
\thint_panel = PanelContainer.new()
\thint_panel.add_theme_stylebox_override("panel", _panel_style(Color(0.12, 0.14, 0.1, 0.62), Color(0.9, 0.85, 0.7, 0.3), 12))
\tui.add_child(hint_panel)
\tlbl_hint = Label.new()
\tlbl_hint.add_theme_color_override("font_color", Color(0.96, 0.95, 0.88))
\tlbl_hint.add_theme_font_size_override("font_size", 13)
\thint_panel.add_child(lbl_hint)

\t# 底栏：输入 + 传令 + 功能
\tbottom_panel = PanelContainer.new()
\tbottom_panel.add_theme_stylebox_override("panel", _panel_style(Color("#fbf3df"), Color("#6b4426"), 14))
\tui.add_child(bottom_panel)
\tvar brow := HBoxContainer.new()
\tbrow.add_theme_constant_override("separation", 6)
\tbottom_panel.add_child(brow)
\tcmd_edit = LineEdit.new()
\tcmd_edit.placeholder_text = "说句话：小伟把3号地浇一下 / 都去浇水 / 挤奶 / 跳过夜晚"
\tcmd_edit.size_flags_horizontal = Control.SIZE_EXPAND_FILL
\tcmd_edit.custom_minimum_size = Vector2(300, 32)
\tcmd_edit.text_submitted.connect(func(t2): _run_command(t2); cmd_edit.text = "")
\t_style_line_edit(cmd_edit)
\tbrow.add_child(cmd_edit)
\tvar send := Button.new()
\tsend.text = "传令"
\tsend.custom_minimum_size = Vector2(70, 32)
\tsend.pressed.connect(func(): _run_command(cmd_edit.text); cmd_edit.text = "")
\t_style_button(send, true)
\tbrow.add_child(send)
\tfor pair in [["集市", "seed"], ["仓库", "goods"], ["服装", "clothes"], ["委托", "quests"], ["档案", "stats"], ["设置", "settings"]]:
\t\tvar b2 := Button.new()
\t\tb2.text = pair[0]
\t\tb2.custom_minimum_size = Vector2(62, 32)
\t\tvar tab: String = pair[1]
\t\tb2.pressed.connect(func(): _open_sheet(tab))
\t\t_style_button(b2)
\t\tbrow.add_child(b2)

\t# 村民卡片栏
\troster = VBoxContainer.new()
\troster.add_theme_constant_override("separation", 8)
\tui.add_child(roster)

\t# 遮罩
\tdim = ColorRect.new()
\tdim.color = Color(0, 0, 0, 0.38)
\tdim.mouse_filter = Control.MOUSE_FILTER_STOP
\tdim.visible = false
\tdim.gui_input.connect(func(e):
\t\tif e is InputEventMouseButton and e.pressed:
\t\t\t_close_sheet())
\tui.add_child(dim)

\t# 大面板
\tsheet = PanelContainer.new()
\tsheet.visible = false
\tsheet.add_theme_stylebox_override("panel", _panel_style(Color("#fbf3df"), Color("#6b4426"), 18))
\tui.add_child(sheet)
\tvar sbox := VBoxContainer.new()
\tsbox.add_theme_constant_override("separation", 8)
\tsheet.add_child(sbox)
\tvar head := HBoxContainer.new()
\tsbox.add_child(head)
\tsheet_title = Label.new()
\tsheet_title.add_theme_font_size_override("font_size", 18)
\tsheet_title.add_theme_color_override("font_color", Color("#4a3524"))
\tsheet_title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
\thead.add_child(sheet_title)
\tvar close := Button.new()
\tclose.text = "✕ 关闭"
\tclose.custom_minimum_size = Vector2(76, 30)
\tclose.pressed.connect(func(): _close_sheet())
\t_style_button(close)
\thead.add_child(close)
\tsheet_tabs = HBoxContainer.new()
\tsheet_tabs.add_theme_constant_override("separation", 6)
\tsbox.add_child(sheet_tabs)
\tfor pair in [["种子", "seed"], ["仓库", "goods"], ["服装", "clothes"], ["委托", "quests"], ["档案", "stats"], ["设置", "settings"]]:
\t\tvar tb := Button.new()
\t\ttb.text = pair[0]
\t\ttb.custom_minimum_size = Vector2(76, 30)
\t\tvar tab2: String = pair[1]
\t\ttb.pressed.connect(func(): _open_sheet(tab2))
\t\t_style_button(tb)
\t\tsheet_tabs.add_child(tb)
\t\ttab_buttons[tab2] = tb
\tvar scroll := ScrollContainer.new()
\tscroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
\tsbox.add_child(scroll)
\tsheet_body = VBoxContainer.new()
\tsheet_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
\tsheet_body.add_theme_constant_override("separation", 6)
\tscroll.add_child(sheet_body)

\t# 提示条
\ttoast_panel = PanelContainer.new()
\ttoast_panel.visible = false
\ttoast_panel.add_theme_stylebox_override("panel", _panel_style(Color(0.16, 0.13, 0.1, 0.9), Color(0.95, 0.9, 0.75, 0.5), 999))
\tui.add_child(toast_panel)
\ttoast_label = Label.new()
\ttoast_label.add_theme_color_override("font_color", Color(1, 0.98, 0.92))
\ttoast_label.add_theme_font_size_override("font_size", 15)
\ttoast_panel.add_child(toast_label)

\t# 阶段 / 新一天大卡片
\tcard_panel = PanelContainer.new()
\tcard_panel.visible = false
\tcard_panel.add_theme_stylebox_override("panel", _panel_style(Color(0.99, 0.96, 0.9, 0.97), Color("#6b4426"), 16))
\tui.add_child(card_panel)
\tcard_label = Label.new()
\tcard_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
\tcard_label.add_theme_font_size_override("font_size", 22)
\tcard_label.add_theme_color_override("font_color", Color("#4a3524"))
\tcard_panel.add_child(card_label)

\tget_viewport().size_changed.connect(_layout_ui)
\t_layout_ui()


func _layout_ui() -> void:
\tvar vs := get_viewport_rect().size
\tui.size = vs
\tif top_panel:
\t\ttop_panel.position = Vector2(8, 6)
\t\ttop_panel.custom_minimum_size = Vector2(vs.x - 16, 0)
\tif hint_panel:
\t\thint_panel.position = Vector2(220, vs.y - 106)
\t\thint_panel.custom_minimum_size = Vector2(vs.x - 440, 0)
\tif bottom_panel:
\t\tbottom_panel.position = Vector2(8, vs.y - 62)
\t\tbottom_panel.custom_minimum_size = Vector2(vs.x - 16, 0)
\tif roster:
\t\troster.position = Vector2(12, 62)
\t\troster.custom_minimum_size = Vector2(232, 0)
\tif dim:
\t\tdim.position = Vector2.ZERO
\t\tdim.size = vs
\tif sheet:
\t\tvar w: float = min(vs.x - 60.0, 820.0)
\t\tvar h: float = min(vs.y - 40.0, 560.0)
\t\tsheet.position = Vector2((vs.x - w) / 2.0, (vs.y - h) / 2.0)
\t\tsheet.size = Vector2(w, h)
\tif toast_panel:
\t\ttoast_panel.position = Vector2(vs.x / 2.0 - 170.0, vs.y - 146.0)
\t\ttoast_panel.custom_minimum_size = Vector2(340, 0)
\tif card_panel:
\t\tcard_panel.position = Vector2(vs.x / 2.0 - 190.0, vs.y / 2.0 - 70.0)
\t\tcard_panel.custom_minimum_size = Vector2(380, 0)


func _style_line_edit(e: LineEdit) -> void:
\te.add_theme_stylebox_override("normal", _panel_style(Color("#fffdf5"), Color("#6b4426"), 10))
\te.add_theme_stylebox_override("focus", _panel_style(Color("#fffdf5"), Color("#6fae4f"), 10))
\te.add_theme_color_override("font_color", Color("#4a3524"))
\te.add_theme_color_override("font_placeholder_color", Color("#a89372"))


func _avatar_texture(v: Dictionary) -> Texture2D:
\tvar key: String = "%s_%s" % [v.id, equipped_outfit.get(v.id, "default")]
\tif avatar_cache.has(key):
\t\treturn avatar_cache[key]
\tvar img := Image.create(22, 22, false, Image.FORMAT_RGBA8)
\timg.fill(Color(0, 0, 0, 0))
\tvar c := _colors_for(v)
\timg.fill_rect(Rect2i(7, 16, 3, 5), c.pants)
\timg.fill_rect(Rect2i(12, 16, 3, 5), c.pants)
\timg.fill_rect(Rect2i(6, 9, 10, 8), c.shirt)
\tif c.get("vest", false):
\t\timg.fill_rect(Rect2i(6, 9, 3, 8), Color("#6a6a72"))
\t\timg.fill_rect(Rect2i(13, 9, 3, 8), Color("#6a6a72"))
\tif c.get("apron", false):
\t\timg.fill_rect(Rect2i(9, 12, 4, 5), Color("#efe6d2"))
\timg.fill_rect(Rect2i(6, 9, 2, 6), c.shirt.darkened(0.12))
\timg.fill_rect(Rect2i(14, 9, 2, 6), c.shirt.darkened(0.12))
\timg.fill_rect(Rect2i(7, 3, 8, 7), c.skin)
\timg.fill_rect(Rect2i(6, 2, 10, 3), c.hair)
\timg.fill_rect(Rect2i(6, 6, 2, 3), c.hair)
\timg.fill_rect(Rect2i(14, 6, 2, 3), c.hair)
\timg.fill_rect(Rect2i(9, 6, 1, 1), Color("#2a2420"))
\timg.fill_rect(Rect2i(12, 6, 1, 1), Color("#2a2420"))
\tif v.id == "xiaoyang":
\t\timg.fill_rect(Rect2i(8, 1, 6, 3), c.hair)
\tvar hat: String = String(c.get("hat", ""))
\tif hat == "straw":
\t\timg.fill_rect(Rect2i(4, 0, 14, 3), Color("#e0c070"))
\telif hat == "cap":
\t\timg.fill_rect(Rect2i(6, 0, 10, 3), Color("#2f4a5a"))
\telif hat == "helmet":
\t\timg.fill_rect(Rect2i(6, 0, 10, 3), Color("#e8c040"))
\tvar tex := ImageTexture.create_from_image(img)
\tavatar_cache[key] = tex
\treturn tex


func _bar(parent: Node, value: float, fill: Color) -> ProgressBar:
\tvar bar := ProgressBar.new()
\tbar.max_value = 100.0
\tbar.value = clamp(value, 0.0, 100.0)
\tbar.show_percentage = false
\tbar.custom_minimum_size = Vector2(0, 8)
\tbar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
\tvar bg := StyleBoxFlat.new()
\tbg.bg_color = Color("#e7dbc0")
\tbg.set_corner_radius_all(4)
\tvar fg := StyleBoxFlat.new()
\tfg.bg_color = fill
\tfg.set_corner_radius_all(4)
\tbar.add_theme_stylebox_override("background", bg)
\tbar.add_theme_stylebox_override("fill", fg)
\tparent.add_child(bar)
\treturn bar


'''
t = t[:a] + block_a + t[b:]

# ---------- 3) 替换 _update_hud 里的提示 / 卡片部分 ----------
a = t.index("\tlbl_hint.text = hint")
b = t.index("func _open_sheet(tab: String) -> void:")
block_b = '''\thint = D.TIPS[int(Time.get_ticks_msec() / 12000) % D.TIPS.size()]
\tlbl_hint.text = hint
\ttoast_label.text = toast
\ttoast_panel.visible = toast_t > 0.0
\tbtn_night.visible = hr >= 19.0 or hr < 6.0
\t_quest_progress()
\tvar sig := ""
\tfor v in villagers:
\t\tsig += "%s|%s|%d|%d|%s|%d|%s;" % [v.name, _verb(v.task.type) if v.task != null else "空闲",
\t\t\tint(v.needs.hunger), int(v.needs.energy), v.thought, selected, equipped_outfit.get(v.id, "")]
\tif sig != roster_sig:
\t\troster_sig = sig
\t\tfor c in roster.get_children():
\t\t\tc.queue_free()
\t\tfor i in villagers.size():
\t\t\tvar v: Dictionary = villagers[i]
\t\t\tvar is_sel: bool = i == selected
\t\t\tvar pc := PanelContainer.new()
\t\t\tpc.add_theme_stylebox_override("panel", _panel_style(
\t\t\t\tColor("#f4f9ec") if is_sel else Color("#fbf3df"),
\t\t\t\tColor("#6fae4f") if is_sel else Color("#6b4426"), 12))
\t\t\tpc.mouse_filter = Control.MOUSE_FILTER_STOP
\t\t\tvar idx: int = i
\t\t\tpc.gui_input.connect(func(e):
\t\t\t\tif e is InputEventMouseButton and e.pressed:
\t\t\t\t\tselected = idx
\t\t\t\t\tfollow = idx
\t\t\t\t\t_show_toast("跟随 %s" % villagers[idx].name))
\t\t\troster.add_child(pc)
\t\t\tvar row := HBoxContainer.new()
\t\t\trow.add_theme_constant_override("separation", 8)
\t\t\tpc.add_child(row)
\t\t\tvar av := TextureRect.new()
\t\t\tav.texture = _avatar_texture(v)
\t\t\tav.custom_minimum_size = Vector2(44, 44)
\t\t\tav.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
\t\t\trow.add_child(av)
\t\t\tvar col := VBoxContainer.new()
\t\t\tcol.size_flags_horizontal = Control.SIZE_EXPAND_FILL
\t\t\tcol.add_theme_constant_override("separation", 3)
\t\t\trow.add_child(col)
\t\t\tvar l1 := Label.new()
\t\t\tl1.text = "%s %s  %s" % [_dominant(v), v.name, _verb(v.task.type) if v.task != null else "空闲"]
\t\t\tl1.add_theme_color_override("font_color", Color("#4a3524"))
\t\t\tcol.add_child(l1)
\t\t\t_bar(col, float(v.needs.hunger), Color("#e0a13c"))
\t\t\t_bar(col, float(v.needs.energy), Color("#5aa8d8"))
\t\t\tvar l3 := Label.new()
\t\t\tl3.text = v.thought
\t\t\tl3.add_theme_font_size_override("font_size", 12)
\t\t\tl3.add_theme_color_override("font_color", Color("#836b4e"))
\t\t\tl3.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
\t\t\tl3.custom_minimum_size = Vector2(150, 0)
\t\t\tcol.add_child(l3)


'''
t = t[:a] + block_b + t[b:]

# ---------- 4) 面板打开 / 关闭 / 渲染（带标签页与遮罩） ----------
a = t.index("func _open_sheet(tab: String) -> void:")
b = t.index("func _sheet_seed() -> void:")
block_c = '''func _open_sheet(tab: String) -> void:
\tsheet_tab = tab
\tsheet.visible = true
\tdim.visible = true
\tfor k in tab_buttons.keys():
\t\tvar b: Button = tab_buttons[k]
\t\tb.add_theme_stylebox_override("normal", _panel_style(
\t\t\tColor("#6fae4f") if k == tab else Color("#fff8e6"), Color("#6b4426"), 10))
\t\tb.add_theme_color_override("font_color", Color("#ffffff") if k == tab else Color("#4a3524"))
\t_render_sheet()


func _close_sheet() -> void:
\tsheet.visible = false
\tdim.visible = false


func _render_sheet() -> void:
\tfor c in sheet_body.get_children():
\t\tc.queue_free()
\tmatch sheet_tab:
\t\t"seed": _sheet_seed()
\t\t"goods": _sheet_goods()
\t\t"clothes": _sheet_clothes()
\t\t"quests": _sheet_quests()
\t\t"stats": _sheet_stats()
\t\t"settings": _sheet_settings()


'''
t = t[:a] + block_c + t[b:]

# ---------- 5) 卡片淡出 ----------
old_card = """\tif card_t > 0.0:
\t\tcard_t -= delta
\t\tcard_panel.visible = card_t > 0.0"""
new_card = """\tif card_t > 0.0:
\t\tcard_t -= delta
\t\tcard_panel.visible = card_t > 0.0
\t\tcard_panel.modulate.a = clamp(card_t / 0.6, 0.0, 1.0)"""
assert old_card in t
t = t.replace(old_card, new_card, 1)

# ---------- 6) 关面板时也走 _close_sheet ----------
t = t.replace('close.pressed.connect(func(): sheet.visible = false)', 'close.pressed.connect(func(): _close_sheet())')
t = t.replace("\tsheet.visible = false\n\tdim.visible = false\n\n\nfunc _render_sheet", "\tsheet.visible = false\n\tdim.visible = false\n\n\nfunc _render_sheet")

# ---------- 7) _style_button 支持主按钮高亮 ----------
old_style = """func _style_button(b: Button) -> void:
\tif b.custom_minimum_size.x < 58.0:
\t\tb.custom_minimum_size.x = 58.0
\tb.add_theme_stylebox_override("normal", _panel_style(Color("#fff8e6"), Color("#6b4426"), 10))"""
new_style = """func _style_button(b: Button, primary: bool = false) -> void:
\tif b.custom_minimum_size.x < 58.0:
\t\tb.custom_minimum_size.x = 58.0
\tif primary:
\t\tb.add_theme_stylebox_override("normal", _panel_style(Color("#6fae4f"), Color("#3f6b2f"), 10))
\t\tb.add_theme_stylebox_override("hover", _panel_style(Color("#7cc35a"), Color("#3f6b2f"), 10))
\t\tb.add_theme_stylebox_override("pressed", _panel_style(Color("#5c9642"), Color("#3f6b2f"), 10))
\t\tb.add_theme_stylebox_override("disabled", _panel_style(Color("#cfd8c4"), Color("#8a9a7a"), 10))
\t\tb.add_theme_color_override("font_color", Color("#ffffff"))
\t\treturn
\tb.add_theme_stylebox_override("normal", _panel_style(Color("#fff8e6"), Color("#6b4426"), 10))"""
assert old_style in t
t = t.replace(old_style, new_style, 1)

# ---------- 8) 新增 cmd_edit 字段 ----------
t = t.replace("var toast_label: Label\n", "var toast_label: Label\nvar cmd_edit: LineEdit\n", 1)

p.write_text(t, encoding='utf-8')
print('ui rewritten, lines =', len(t.splitlines()))
