from pathlib import Path
p = Path(r'D:\桌面\田园小镇\godot\scripts\main.gd')
t = p.read_text(encoding='utf-8')
anchor = "func _sheet_quests() -> void:"
fn = '''func _buy_or_wear(vid: String, oid: String) -> void:
\tvar def := _outfit_def(vid, oid)
\tif def.is_empty():
\t\treturn
\tif not owned_outfits[vid].has(oid):
\t\tif stage_index < int(def.stage):
\t\t\t_show_toast("第 %d 阶段才解锁" % int(def.stage))
\t\t\treturn
\t\tif money < int(def.price):
\t\t\t_show_toast("钱不够")
\t\t\treturn
\t\tmoney -= int(def.price)
\t\towned_outfits[vid].append(oid)
\tequipped_outfit[vid] = oid
\tavatar_cache.clear()
\tfor v in villagers:
\t\tif v.id == vid:
\t\t\t_log("%s 换上了「%s」" % [v.name, def.name])
\t_show_toast("换上了 %s" % def.name)
\tif sheet.visible and sheet_tab == "clothes":
\t\t_render_sheet()


'''
if "func _buy_or_wear(" not in t:
    t = t.replace(anchor, fn + anchor, 1)
    p.write_text(t, encoding='utf-8')
    print('readded _buy_or_wear')
else:
    print('already present')
