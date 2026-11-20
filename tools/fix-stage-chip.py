from pathlib import Path
p = Path(r'D:\桌面\田园小镇\godot\scripts\main.gd')
t = p.read_text(encoding='utf-8')
old = '\tlbl_stage.text = "阶段 %d/8 · %s｜下一个：%s" % [stage_index, D.STAGES[mini(stage_index, 7)].name, next]'
new = ('\tlbl_stage.text = "阶段 %d/8 · %s" % [stage_index, D.STAGES[mini(stage_index, 7)].name]\n'
       '\tlbl_stage.tooltip_text = "下一个：" + next')
assert old in t
t = t.replace(old, new, 1)
p.write_text(t, encoding='utf-8')
print('patched stage chip')
