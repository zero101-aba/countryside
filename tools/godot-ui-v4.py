from pathlib import Path

p = Path(r'D:\桌面\田园小镇\godot\scripts\main.gd')
t = p.read_text(encoding='utf-8')

# ============ S1: 样式助手（替换 _panel_style ... _chip） ============
a = t.index("func _panel_style(bg: Color")
b = t.index("func _set_speed(sp: float) -> void:")
styles = '''func _panel_style(bg: Color, border: Color, radius: int, shadow: int = 0) -> StyleBoxFlat:
\tvar sb := StyleBoxFlat.new()
\tsb.bg_color = bg
\tsb.border_color = border
\tsb.set_border_width_all(2)
\tsb.set_corner_radius_all(radius)
\tsb.content_margin_left = 10
\tsb.content_margin_right = 10
\tsb.content_margin_top = 6
\tsb.content_margin_bottom = 6
\tif shadow > 0:
\t\tsb.shadow_size = shadow
\t\tsb.shadow_color = Color(0.15, 0.1, 0.05, 0.35)
\t\tsb.shadow_offset = Vector2(0, 2)
\treturn sb


func _wood_style(radius: int = 16) -> StyleBoxFlat:
\tvar sb := StyleBoxFlat.new()
\tsb.bg_color = Color("#8a5c35")
\tsb.border_color = Color("#5a3d24")
\tsb.set_border_width_all(3)
\tsb.set_corner_radius_all(radius)
\tsb.shadow_size = 10
\tsb.shadow_color = Color(0.12, 0.08, 0.04, 0.4)
\tsb.shadow_offset = Vector2(0, 3)
\treturn sb


func _inset_style(radius: int = 12) -> StyleBoxFlat:
\tvar sb := StyleBoxFlat.new()
\tsb.bg_color = Color("#fdf5e2")
\tsb.border_color = Color("#d9c49a")
\tsb.set_border_width_all(2)
\tsb.set_corner_radius_all(radius)
\tsb.content_margin_left = 8
\tsb.content_margin_right = 8
\tsb.content_margin_top = 6
\tsb.content_margin_bottom = 6
\treturn sb


func _row_style(highlight: bool = false) -> StyleBoxFlat:
\tvar sb := StyleBoxFlat.new()
\tsb.bg_color = Color("#f7e3b0") if highlight else Color("#fdf5e2")
\tsb.border_color = Color("#d8a02e") if highlight else Color("#e6d6b4")
\tsb.set_border_width_all(2)
\tsb.set_corner_radius_all(10)
\tsb.content_margin_left = 8
\tsb.content_margin_right = 8
\tsb.content_margin_top = 5
\tsb.content_margin_bottom = 5
\treturn sb


func _tab_style(active: bool) -> StyleBoxFlat:
\tvar sb := StyleBoxFlat.new()
\tsb.bg_color = Color("#fdf5e2") if active else Color("#7a5a3a")
\tsb.border_color = Color("#cbb894") if active else Color("#5a3d24")
\tsb.set_border_width_all(2)
\tsb.set_corner_radius_all(10)
\tsb.content_margin_left = 12
\tsb.content_margin_right = 12
\tsb.content_margin_top = 5
\tsb.content_margin_bottom = 5
\treturn sb


func _wood_box(radius: int = 16, pad: int = 6, rivets: bool = false) -> Dictionary:
\tvar outer := PanelContainer.new()
\touter.add_theme_stylebox_override("panel", _wood_style(radius))
\tvar margin := MarginContainer.new()
\tfor side in ["left", "right", "top", "bottom"]:
\t\tmargin.add_theme_constant_override("margin_" + side, pad)
\touter.add_child(margin)
\tvar inner := PanelContainer.new()
\tinner.add_theme_stylebox_override("panel", _inset_style(radius - 4))
\tmargin.add_child(inner)
\tvar body := VBoxContainer.new()
\tbody.add_theme_constant_override("separation", 6)
\tinner.add_child(body)
\tif rivets:
\t\tvar dec := Decor.new()
\t\tdec.kind = "rivets"
\t\tdec.mouse_filter = Control.MOUSE_FILTER_IGNORE
\t\touter.add_child(dec)
\treturn {"outer": outer, "inner": inner, "body": body}


func _icon_tile(icon: String, bg: Color, size: int = 34) -> PanelContainer:
\tvar pc := PanelContainer.new()
\tvar sb := StyleBoxFlat.new()
\tsb.bg_color = bg
\tsb.border_color = Color("#5a3d24")
\tsb.set_border_width_all(2)
\tsb.set_corner_radius_all(8)
\tpc.add_theme_stylebox_override("panel", sb)
\tpc.custom_minimum_size = Vector2(size, size)
\tvar l := Label.new()
\tl.text = icon
\tl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
\tl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
\tl.add_theme_font_size_override("font_size", 18)
\tpc.add_child(l)
\treturn pc


func _row(icon: String, icon_bg: Color, title: String, sub: String, btn: String, cb: Callable,
\t\tdisabled: bool = false, highlight: bool = false, btn2: String = "", cb2: Callable = Callable()) -> void:
\tvar pc := PanelContainer.new()
\tpc.add_theme_stylebox_override("panel", _row_style(highlight))
\tsheet_body.add_child(pc)
\tvar h := HBoxContainer.new()
\th.add_theme_constant_override("separation", 10)
\tpc.add_child(h)
\tif icon != "":
\t\th.add_child(_icon_tile(icon, icon_bg))
\tvar col := VBoxContainer.new()
\tcol.size_flags_horizontal = Control.SIZE_EXPAND_FILL
\tcol.add_theme_constant_override("separation", 2)
\th.add_child(col)
\tvar t1 := Label.new()
\tt1.text = title
\tt1.add_theme_color_override("font_color", Color("#4a3524"))
\tcol.add_child(t1)
\tif sub != "":
\t\tvar t2 := Label.new()
\t\tt2.text = sub
\t\tt2.add_theme_font_size_override("font_size", 12)
\t\tt2.add_theme_color_override("font_color", Color("#8a7250"))
\t\tcol.add_child(t2)
\tif btn != "":
\t\tvar b := Button.new()
\t\tb.text = btn
\t\tb.custom_minimum_size = Vector2(84, 30)
\t\tb.disabled = disabled
\t\tif not disabled:
\t\t\tb.pressed.connect(cb)
\t\t_style_button(b, not disabled)
\t\th.add_child(b)
\tif btn2 != "":
\t\tvar b2 := Button.new()
\t\tb2.text = btn2
\t\tb2.custom_minimum_size = Vector2(74, 30)
\t\tif cb2.is_valid():
\t\t\tb2.pressed.connect(cb2)
\t\t_style_button(b2)
\t\th.add_child(b2)


func _style_button(b: Button, primary: bool = false) -> void:
\tif b.custom_minimum_size.x < 58.0:
\t\tb.custom_minimum_size.x = 58.0
\tif primary:
\t\tvar on := _panel_style(Color("#6fae4f"), Color("#3f6b2f"), 9)
\t\ton.border_width_bottom = 4
\t\tvar hov := _panel_style(Color("#7cc35a"), Color("#3f6b2f"), 9)
\t\thov.border_width_bottom = 4
\t\tvar pre := _panel_style(Color("#5c9642"), Color("#3f6b2f"), 9)
\t\tpre.border_width_bottom = 2
\t\tb.add_theme_stylebox_override("normal", on)
\t\tb.add_theme_stylebox_override("hover", hov)
\t\tb.add_theme_stylebox_override("pressed", pre)
\t\tb.add_theme_stylebox_override("disabled", _panel_style(Color("#cfd8c4"), Color("#8a9a7a"), 9))
\t\tb.add_theme_color_override("font_color", Color("#ffffff"))
\t\tb.add_theme_color_override("font_hover_color", Color("#ffffff"))
\t\tb.add_theme_color_override("font_pressed_color", Color("#f0f6e8"))
\t\tb.add_theme_color_override("font_disabled_color", Color("#7d8a70"))
\t\treturn
\tb.add_theme_stylebox_override("normal", _panel_style(Color("#fff8e6"), Color("#6b4426"), 9))
\tb.add_theme_stylebox_override("hover", _panel_style(Color("#fdf1d6"), Color("#6b4426"), 9))
\tb.add_theme_stylebox_override("pressed", _panel_style(Color("#efdfbc"), Color("#6b4426"), 9))
\tb.add_theme_stylebox_override("disabled", _panel_style(Color("#e6ddc8"), Color("#a89878"), 9))
\tb.add_theme_color_override("font_color", Color("#4a3524"))
\tb.add_theme_color_override("font_hover_color", Color("#4a3524"))
\tb.add_theme_color_override("font_pressed_color", Color("#3a2a18"))
\tb.add_theme_color_override("font_focus_color", Color("#4a3524"))
\tb.add_theme_color_override("font_disabled_color", Color("#9a8a6a"))


func _chip(parent: HBoxContainer, icon: String = "") -> Label:
\tvar pc := PanelContainer.new()
\tpc.add_theme_stylebox_override("panel", _panel_style(Color("#fff8e6"), Color("#6b4426"), 999))
\tparent.add_child(pc)
\tvar h := HBoxContainer.new()
\th.add_theme_constant_override("separation", 5)
\tpc.add_child(h)
\tif icon != "":
\t\tvar ic := Label.new()
\t\tic.text = icon
\t\tic.add_theme_font_size_override("font_size", 14)
\t\th.add_child(ic)
\tvar l := Label.new()
\tl.add_theme_color_override("font_color", Color("#4a3524"))
\th.add_child(l)
\treturn l


'''
t = t[:a] + styles + t[b:]

# ============ S2: _build_ui ============
a = t.index("func _build_ui() -> void:")
b = t.index("func _layout_ui() -> void:")
build = '''func _build_ui() -> void:
\ttheme = Theme.new()
\tvar f := SystemFont.new()
\tf.font_names = PackedStringArray(["Microsoft YaHei", "Noto Color Emoji", "Noto Sans CJK SC", "SimHei"])
\ttheme.default_font = f
\ttheme.default_font_size = 15

\tui = Control.new()
\tui.size = get_viewport_rect().size
\tui.theme = theme
\tadd_child(ui)

\t# ---------- 顶栏 ----------
\tvar top := _wood_box(18, 6)
\ttop_panel = top.outer
\tui.add_child(top_panel)
\tvar top_row := HBoxContainer.new()
\ttop_row.add_theme_constant_override("separation", 8)
\ttop.body.add_child(top_row)
\tlbl_money = _chip(top_row, "🪙")
\tlbl_date = _chip(top_row, "📅")
\tlbl_weather = _chip(top_row, "☀")
\tlbl_stage = _chip(top_row, "🌱")
\tvar spacer := Control.new()
\tspacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
\ttop_row.add_child(spacer)
\tfor pair in [["⏸", 0.0], ["▶", 1.0], ["⏩", 2.0], ["4×", 4.0], ["8×", 8.0]]:
\t\tvar b := Button.new()
\t\tb.text = pair[0]
\t\tvar sp: float = pair[1]
\t\tb.custom_minimum_size = Vector2(44, 34)
\t\tb.pressed.connect(func(): _set_speed(sp))
\t\t_style_button(b, true)
\t\ttop_row.add_child(b)
\tbtn_night = Button.new()
\tbtn_night.text = "🌙 跳夜"
\tbtn_night.visible = false
\tbtn_night.custom_minimum_size = Vector2(90, 34)
\tbtn_night.pressed.connect(func(): _skip_night(false))
\t_style_button(btn_night, true)
\ttop_row.add_child(btn_night)

\t# ---------- 提示条 ----------
\tvar hint := _wood_box(14, 4)
\thint_panel = hint.outer
\thint_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
\tui.add_child(hint_panel)
\tlbl_hint = Label.new()
\tlbl_hint.add_theme_color_override("font_color", Color("#5a4326"))
\tlbl_hint.add_theme_font_size_override("font_size", 13)
\thint.body.add_child(lbl_hint)

\t# ---------- 底栏 ----------
\tvar bottom := _wood_box(18, 6)
\tbottom_panel = bottom.outer
\tui.add_child(bottom_panel)
\tvar brow := HBoxContainer.new()
\tbrow.add_theme_constant_override("separation", 8)
\tbottom.body.add_child(brow)
\tcmd_edit = LineEdit.new()
\tcmd_edit.placeholder_text = "说句话：小伟把3号地浇一下 / 都去浇水 / 挤奶 / 跳过夜晚"
\tcmd_edit.size_flags_horizontal = Control.SIZE_EXPAND_FILL
\tcmd_edit.custom_minimum_size = Vector2(280, 34)
\tcmd_edit.text_submitted.connect(func(t2): _run_command(t2); cmd_edit.text = "")
\t_style_line_edit(cmd_edit)
\tbrow.add_child(cmd_edit)
\tvar send := Button.new()
\tsend.text = "➤ 传令"
\tsend.custom_minimum_size = Vector2(92, 34)
\tsend.pressed.connect(func(): _run_command(cmd_edit.text); cmd_edit.text = "")
\t_style_button(send, true)
\tbrow.add_child(send)
\tvar divider := VSeparator.new()
\tbrow.add_child(divider)
\tfor pair in [["🏪", "seed", "集市"], ["📦", "goods", "仓库"], ["👕", "clothes", "服装"],
\t\t["📜", "quests", "委托"], ["🏆", "stats", "档案"], ["⚙", "settings", "设置"]]:
\t\tvar b2 := Button.new()
\t\tb2.text = pair[0]
\t\tb2.tooltip_text = pair[2]
\t\tb2.custom_minimum_size = Vector2(40, 34)
\t\tvar tab: String = pair[1]
\t\tb2.pressed.connect(func(): _open_sheet(tab))
\t\t_style_button(b2)
\t\tbrow.add_child(b2)

\t# ---------- 村民卡片栏 ----------
\troster = VBoxContainer.new()
\troster.add_theme_constant_override("separation", 10)
\tui.add_child(roster)

\t# ---------- 遮罩 ----------
\tdim = ColorRect.new()
\tdim.color = Color(0, 0, 0, 0.42)
\tdim.mouse_filter = Control.MOUSE_FILTER_STOP
\tdim.visible = false
\tdim.gui_input.connect(func(e):
\t\tif e is InputEventMouseButton and e.pressed:
\t\t\t_close_sheet())
\tui.add_child(dim)

\t# ---------- 大面板 ----------
\tvar sheetbox := _wood_box(20, 8)
\tsheet = sheetbox.outer
\tsheet.visible = false
\tui.add_child(sheet)
\tvar head := HBoxContainer.new()
\thead.add_theme_constant_override("separation", 8)
\tsheetbox.body.add_child(head)
\tsheet_title = Label.new()
\tsheet_title.add_theme_font_size_override("font_size", 19)
\tsheet_title.add_theme_color_override("font_color", Color("#fdf5e2"))
\tsheet_title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
\thead.add_child(sheet_title)
\tvar close := Button.new()
\tclose.text = "✕"
\tclose.custom_minimum_size = Vector2(44, 32)
\tclose.pressed.connect(func(): _close_sheet())
\t_style_button(close)
\thead.add_child(close)
\tsheet_tabs = HBoxContainer.new()
\tsheet_tabs.add_theme_constant_override("separation", 6)
\tsheetbox.body.add_child(sheet_tabs)
\tfor pair in [["🌱 种子", "seed"], ["📦 仓库", "goods"], ["👕 服装", "clothes"],
\t\t["📜 委托", "quests"], ["🏆 档案", "stats"], ["⚙ 设置", "settings"]]:
\t\tvar tb := Button.new()
\t\ttb.text = pair[0]
\t\ttb.custom_minimum_size = Vector2(112, 32)
\t\tvar tab2: String = pair[1]
\t\ttb.pressed.connect(func(): _open_sheet(tab2))
\t\tsheet_tabs.add_child(tb)
\t\ttab_buttons[tab2] = tb
\tvar scroll := ScrollContainer.new()
\tscroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
\tsheetbox.body.add_child(scroll)
\tsheet_body = VBoxContainer.new()
\tsheet_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
\tsheet_body.add_theme_constant_override("separation", 6)
\tscroll.add_child(sheet_body)

\t# ---------- 浮动提示 ----------
\tvar toastbox := _wood_box(999, 5)
\ttoast_panel = toastbox.outer
\ttoast_panel.visible = false
\ttoast_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
\tui.add_child(toast_panel)
\ttoast_label = Label.new()
\ttoast_label.add_theme_color_override("font_color", Color("#4a3524"))
\ttoast_label.add_theme_font_size_override("font_size", 15)
\ttoastbox.body.add_child(toast_label)

\t# ---------- 阶段 / 新一天卡片 ----------
\tvar cardbox := _wood_box(18, 8)
\tcard_panel = cardbox.outer
\tcard_panel.visible = false
\tcard_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
\tui.add_child(card_panel)
\tcard_label = Label.new()
\tcard_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
\tcard_label.add_theme_font_size_override("font_size", 22)
\tcard_label.add_theme_color_override("font_color", Color("#4a3524"))
\tcardbox.body.add_child(card_label)

\tget_viewport().size_changed.connect(_layout_ui)
\t_layout_ui()


'''
t = t[:a] + build + t[b:]

# ============ S3: _layout_ui ============
a = t.index("func _layout_ui() -> void:")
b = t.index("func _style_line_edit(e: LineEdit) -> void:")
layout = '''func _layout_ui() -> void:
\tvar vs := get_viewport_rect().size
\tui.size = vs
\tif top_panel:
\t\ttop_panel.position = Vector2(10, 8)
\t\ttop_panel.custom_minimum_size = Vector2(vs.x - 20, 0)
\tif hint_panel:
\t\thint_panel.position = Vector2(vs.x / 2.0 - 300.0, vs.y - 112)
\t\thint_panel.custom_minimum_size = Vector2(600, 0)
\tif bottom_panel:
\t\tbottom_panel.position = Vector2(10, vs.y - 66)
\t\tbottom_panel.custom_minimum_size = Vector2(vs.x - 20, 0)
\tif roster:
\t\troster.position = Vector2(14, 66)
\t\troster.custom_minimum_size = Vector2(250, 0)
\tif dim:
\t\tdim.position = Vector2.ZERO
\t\tdim.size = vs
\tif sheet:
\t\tvar w: float = min(vs.x - 80.0, 860.0)
\t\tvar h: float = min(vs.y - 60.0, 580.0)
\t\tsheet.position = Vector2((vs.x - w) / 2.0, (vs.y - h) / 2.0)
\t\tsheet.size = Vector2(w, h)
\tif toast_panel:
\t\ttoast_panel.position = Vector2(vs.x / 2.0 - 170.0, vs.y - 156.0)
\t\ttoast_panel.custom_minimum_size = Vector2(340, 0)
\tif card_panel:
\t\tcard_panel.position = Vector2(vs.x / 2.0 - 200.0, vs.y / 2.0 - 80.0)
\t\tcard_panel.custom_minimum_size = Vector2(400, 0)


'''
t = t[:a] + layout + t[b:]

# ============ S4: 村民卡片 ============
a = t.index('\tvar sig := ""')
b = t.index("func _open_sheet(tab: String) -> void:")
cards = '''\tvar sig := ""
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
\t\t\tvar box := _wood_box(14, 5, true)
\t\t\tvar pc: PanelContainer = box.outer
\t\t\tpc.custom_minimum_size = Vector2(250, 0)
\t\t\tif is_sel:
\t\t\t\tpc.add_theme_stylebox_override("panel", _panel_style(Color("#6fae4f"), Color("#3f6b2f"), 14, 10))
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
\t\t\tbox.body.add_child(row)
\t\t\tvar frame := PanelContainer.new()
\t\t\tframe.add_theme_stylebox_override("panel", _panel_style(Color("#e9f2dd"), Color("#5f8f4a"), 10))
\t\t\trow.add_child(frame)
\t\t\tvar av := TextureRect.new()
\t\t\tav.texture = _avatar_texture(v)
\t\t\tav.custom_minimum_size = Vector2(52, 52)
\t\t\tav.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
\t\t\tframe.add_child(av)
\t\t\tvar col := VBoxContainer.new()
\t\t\tcol.size_flags_horizontal = Control.SIZE_EXPAND_FILL
\t\t\tcol.add_theme_constant_override("separation", 3)
\t\t\trow.add_child(col)
\t\t\tvar plate := PanelContainer.new()
\t\t\tplate.add_theme_stylebox_override("panel", _panel_style(Color("#f3e6c8"), Color("#cbb894"), 8))
\t\t\tcol.add_child(plate)
\t\t\tvar name_row := HBoxContainer.new()
\t\t\tname_row.add_theme_constant_override("separation", 6)
\t\t\tplate.add_child(name_row)
\t\t\tvar l1 := Label.new()
\t\t\tl1.text = "%s %s" % [_dominant(v), v.name]
\t\t\tl1.add_theme_color_override("font_color", Color("#4a3524"))
\t\t\tname_row.add_child(l1)
\t\t\tvar l2 := Label.new()
\t\t\tl2.text = _verb(v.task.type) if v.task != null else "空闲"
\t\t\tl2.add_theme_font_size_override("font_size", 12)
\t\t\tl2.add_theme_color_override("font_color", Color("#7c5230"))
\t\t\tname_row.add_child(l2)
\t\t\tvar bar_row := HBoxContainer.new()
\t\t\tbar_row.add_theme_constant_override("separation", 4)
\t\t\tcol.add_child(bar_row)
\t\t\tvar ic1 := Label.new()
\t\t\tic1.text = "🍎"
\t\t\tic1.add_theme_font_size_override("font_size", 12)
\t\t\tbar_row.add_child(ic1)
\t\t\t_bar(bar_row, float(v.needs.hunger), Color("#e0a13c"))
\t\t\tvar bar_row2 := HBoxContainer.new()
\t\t\tbar_row2.add_theme_constant_override("separation", 4)
\t\t\tcol.add_child(bar_row2)
\t\t\tvar ic2 := Label.new()
\t\t\tic2.text = "⚡"
\t\t\tic2.add_theme_font_size_override("font_size", 12)
\t\t\tbar_row2.add_child(ic2)
\t\t\t_bar(bar_row2, float(v.needs.energy), Color("#5aa8d8"))
\t\t\tvar l3 := Label.new()
\t\t\tl3.text = v.thought
\t\t\tl3.add_theme_font_size_override("font_size", 12)
\t\t\tl3.add_theme_color_override("font_color", Color("#836b4e"))
\t\t\tl3.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
\t\t\tl3.custom_minimum_size = Vector2(180, 0)
\t\t\tcol.add_child(l3)


'''
t = t[:a] + cards + t[b:]

# ============ S5: _open_sheet 标签页样式 ============
a = t.index("func _open_sheet(tab: String) -> void:")
b = t.index("func _sheet_seed() -> void:")
openblock = '''func _open_sheet(tab: String) -> void:
\tsheet_tab = tab
\tsheet.visible = true
\tdim.visible = true
\tfor k in tab_buttons.keys():
\t\tvar b: Button = tab_buttons[k]
\t\tb.add_theme_stylebox_override("normal", _tab_style(k == tab))
\t\tb.add_theme_stylebox_override("hover", _tab_style(k == tab))
\t\tb.add_theme_stylebox_override("pressed", _tab_style(k == tab))
\t\tb.add_theme_color_override("font_color", Color("#4a3524") if k == tab else Color("#f3e6c8"))
\t\tb.add_theme_color_override("font_hover_color", Color("#4a3524") if k == tab else Color("#ffffff"))
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
t = t[:a] + openblock + t[b:]

# ============ S6: 面板内容（行卡片） ============
a = t.index("func _sheet_seed() -> void:")
b = t.index("func _row_text(k: String, val: String) -> Label:")
sheets = '''func _sheet_seed() -> void:
\tsheet_title.text = "集市 · 种子"
\tvar icons := {"radish": "🥕", "turnip": "🥬", "carrot": "🥕", "strawberry": "🍓", "pumpkin": "🎃"}
\tfor k in D.CROPS.keys():
\t\tvar crop: Dictionary = D.CROPS[k]
\t\tvar key: String = k
\t\tvar season_ok: bool = crop.seasons.has(_season())
\t\t_row(String(icons.get(k, "🌱")), Color("#e9f2dd"),
\t\t\t"%s种子" % crop.name,
\t\t\t"%dG · 持有 %d · %s" % [int(crop.seed), int(seeds.get(k, 0)), "当季" if season_ok else "非当季"],
\t\t\t"购买", func():
\t\t\t\tif money >= int(D.CROPS[key].seed):
\t\t\t\t\tmoney -= int(D.CROPS[key].seed)
\t\t\t\t\tseeds[key] = int(seeds.get(key, 0)) + 1
\t\t\t\t\t_show_toast("买了%s种子" % D.CROPS[key].name)
\t\t\t\telse:
\t\t\t\t\t_show_toast("钱不够")
\t\t\t\t_render_sheet(),
\t\t\tmoney < int(crop.seed), not season_ok)
\t_row("🍞", Color("#f3e6c8"), "面包", "8G · 持有 %d" % int(inventory.bread), "买一个", func():
\t\tif money >= 8:
\t\t\tmoney -= 8
\t\t\tinventory.bread += 1
\t\t\t_show_toast("买了一个面包")
\t\t_render_sheet(), money < 8)


func _sheet_goods() -> void:
\tsheet_title.text = "仓库 · 卖货"
\tvar icons := {"wood": "🪵", "fish": "🐟", "stone": "🪨", "ore": "⛏", "egg": "🥚", "milk": "🥛", "wool": "🧶"}
\tfor k in ["wood", "fish", "stone", "ore", "egg", "milk", "wool"]:
\t\tvar n: int = int(inventory.get(k, 0))
\t\tvar key: String = k
\t\t_row(String(icons.get(k, "📦")), Color("#f0e4cc"),
\t\t\t"%s ×%d" % [D.ITEM_NAME[k], n], "单价 %dG" % _price(k),
\t\t\t"卖 1", func():
\t\t\t\tif int(inventory.get(key, 0)) > 0:
\t\t\t\t\tinventory[key] = int(inventory[key]) - 1
\t\t\t\t\tmoney += _price(key)
\t\t\t\t\tstats.earned += _price(key)
\t\t\t\t\t_show_toast("卖了 1 个%s" % D.ITEM_NAME[key])
\t\t\t\t_render_sheet(),
\t\t\tn <= 0, false,
\t\t\t"全卖", func():
\t\t\t\tvar have: int = int(inventory.get(key, 0))
\t\t\t\tif have > 0:
\t\t\t\t\tmoney += _price(key) * have
\t\t\t\t\tstats.earned += _price(key) * have
\t\t\t\t\tinventory[key] = 0
\t\t\t\t\t_show_toast("卖了 %d 个%s" % [have, D.ITEM_NAME[key]])
\t\t\t\t_render_sheet())


func _sheet_clothes() -> void:
\tsheet_title.text = "服装店 · 每到新阶段上新"
\tfor v in villagers:
\t\tvar tag := Label.new()
\t\ttag.text = "— %s（关系 %.0f）—" % [v.name, bond]
\t\ttag.add_theme_color_override("font_color", Color("#5a4326"))
\t\tsheet_body.add_child(tag)
\t\tfor o in D.OUTFITS.get(v.id, []):
\t\t\tvar owned: bool = owned_outfits[v.id].has(o.id)
\t\t\tvar worn: bool = equipped_outfit[v.id] == o.id
\t\t\tvar locked: bool = stage_index < int(o.stage)
\t\t\tvar over: Dictionary = o.c
\t\t\tvar vid: String = v.id
\t\t\tvar oid: String = o.id
\t\t\tvar status := "已穿" if worn else ("已拥有 · 可换" if owned else ("第 %d 阶段 · %dG" % [int(o.stage), int(o.price)]))
\t\t\t_row("👕", Color(over.get("shirt", "#2a2a30")), o.name, "%s · %s" % [o.desc, status],
\t\t\t\t"已穿" if worn else ("穿上" if owned else "购买"),
\t\t\t\tfunc(): _buy_or_wear(vid, oid),
\t\t\t\tworn or locked or (not owned and money < int(o.price)), worn)


func _sheet_quests() -> void:
\tsheet_title.text = "每日委托 · 已完成 %d 份" % quests_done
\tif not stage_flags.quests:
\t\t_row("🔒", Color("#e6ddc8"), "委托板还没开张", "收获 1 次后解锁", "", Callable(), true)
\t\treturn
\tfor q in quests:
\t\tvar qq: Dictionary = q
\t\tvar ready: bool = int(q.done) >= int(q.goal) and not q.claimed
\t\t_row("📜", Color("#f3e6c8"), q.text, "进度 %d/%d · 奖励 %dG" % [mini(int(q.done), int(q.goal)), int(q.goal), int(q.reward)],
\t\t\t"已领" if q.claimed else "领取",
\t\t\tfunc():
\t\t\t\tif not qq.claimed and int(qq.done) >= int(qq.goal):
\t\t\t\t\tqq.claimed = true
\t\t\t\t\tmoney += int(qq.reward)
\t\t\t\t\tstats.earned += int(qq.reward)
\t\t\t\t\tquests_done += 1
\t\t\t\t\t_show_toast("委托奖励 +%dG" % int(qq.reward))
\t\t\t\t\t_log("完成委托：%s +%dG" % [qq.text, int(qq.reward)])
\t\t\t\t_render_sheet(),
\t\t\tq.claimed or not ready, ready)


func _sheet_stats() -> void:
\tsheet_title.text = "小镇档案"
\t_row("🌱", Color("#e9f2dd"), "阶段 %d/8 · %s" % [stage_index, D.STAGES[mini(stage_index, 7)].name],
\t\t"下一个：%s → %s" % [D.STAGES[mini(stage_index, 7)].cond, D.STAGES[mini(stage_index, 7)].unlock], "", Callable())
\t_row("🪙", Color("#f7e3b0"), "%dG" % money, "累计收入 %dG" % stats.earned, "", Callable())
\t_row("🌾", Color("#f0e4cc"), "收获 %d · 播种 %d" % [stats.harvested, stats.planted],
\t\t"钓鱼 %d · 挖矿 %d · 木头 %d · 牧产 %d" % [stats.fish, stats.mined, stats.wood, stats.collected], "", Callable())
\t_row("💗", Color("#f7d9e0"), "小伟 ↔ 小杨 %.0f" % bond, "关系值随相处与 AI 对话变化", "", Callable())
\t_row("🗺", Color("#dce9f2"), "青禾村%s 清溪河岸%s 后山林地%s" % [
\t\t"✔" if unlocked.village else "✘", "✔" if unlocked.river else "✘", "✔" if unlocked.forest else "✘"],
\t\t"区域随天数与阶段解锁", "", Callable())
\tvar t := Label.new()
\tt.text = "成就 %d/%d" % [achievements.size(), D.ACHIEVEMENTS.size()]
\tt.add_theme_color_override("font_color", Color("#5a4326"))
\tsheet_body.add_child(t)
\tfor a in D.ACHIEVEMENTS:
\t\tvar got: bool = achievements.has(a.id)
\t\t_row("🏆" if got else "🔒", Color("#f7e3b0") if got else Color("#e6ddc8"), a.name, a.desc,
\t\t\t("+%dG" % int(a.reward)) if (got and int(a.reward) > 0) else "", Callable(), true)
\tvar lt := Label.new()
\tlt.text = "近期事件"
\tlt.add_theme_color_override("font_color", Color("#5a4326"))
\tsheet_body.add_child(lt)
\tfor line in logs.slice(max(0, logs.size() - 12)):
\t\t_row("", Color.WHITE, line, "", "", Callable())


func _sheet_settings() -> void:
\tsheet_title.text = "设置"
\t_row("🌙", Color("#dce0f2"), "夜晚自动跳过", "第 2 阶段解锁" if not stage_flags.autoskip else "到 23:00 自动跳到次日 6:00",
\t\t"开" if auto_skip_night else "关",
\t\tfunc():
\t\t\tif not stage_flags.autoskip:
\t\t\t\t_show_toast("夜晚自动跳过还没解锁：先播种 3 次")
\t\t\t\treturn
\t\t\tauto_skip_night = not auto_skip_night
\t\t\t_render_sheet(),
\t\tnot stage_flags.autoskip, auto_skip_night)
\t_row("💰", Color("#f7e3b0"), "自动出售收获", "开启后收获直接换钱", "开" if auto_sell else "关",
\t\tfunc():
\t\t\tauto_sell = not auto_sell
\t\t\t_render_sheet(), false, auto_sell)
\t_row("💾", Color("#dce9f2"), "存档", "user://tianyuan_save.json", "保存", func():
\t\t_save_game()
\t\t_show_toast("已存档"), false, false, "读取", func():
\t\t_load_game()
\t\t_show_toast("已读档"))


'''
t = t[:a] + sheets + t[b:]

# ============ S7: 追加 Decor 内部类 ============
t += '''

# ============================================================ 装饰
class Decor extends Control:
\tvar kind := "rivets"

\tfunc _draw() -> void:
\t\tif kind == "rivets":
\t\t\tvar s := size
\t\t\tfor p in [Vector2(9, 9), Vector2(s.x - 9, 9), Vector2(9, s.y - 9), Vector2(s.x - 9, s.y - 9)]:
\t\t\t\tdraw_circle(p, 3.0, Color("#d8b06a"))
\t\t\t\tdraw_circle(p, 1.4, Color("#8a5c35"))
\t\telif kind == "corner":
\t\t\t_leaf(Vector2(12, 12), -0.7)
\t\t\t_leaf(Vector2(24, 8), -0.2)
\t\t\t_leaf(Vector2(8, 24), -1.1)
\t\t\tdraw_circle(Vector2(20, 18), 3.5, Color("#f2f0ea"))
\t\t\tdraw_circle(Vector2(20, 18), 1.6, Color("#f2c14e"))

\tfunc _leaf(pos: Vector2, rot: float) -> void:
\t\tvar pts := PackedVector2Array()
\t\tfor i in 12:
\t\t\tvar a: float = TAU * float(i) / 12.0
\t\t\tpts.append(pos + Vector2(cos(a) * 4.0, sin(a) * 8.0).rotated(rot))
\t\tdraw_colored_polygon(pts, Color("#5f9a48"))
\t\tdraw_line(pos, pos + Vector2(0, 7).rotated(rot), Color("#3f7a3a"), 1.0)
'''

p.write_text(t, encoding='utf-8')
print('ui v4 applied, lines =', len(t.splitlines()))
