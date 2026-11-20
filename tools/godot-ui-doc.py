from pathlib import Path
# 1) 移植说明：补 UI v3 描述与截图
p = Path(r'D:\桌面\田园小镇\docs\godot移植说明.md')
t = p.read_text(encoding='utf-8')
t = t.replace(
 '| UI | 默认控件 | 奶油纸质 StyleBoxFlat（圆角/描边/胶囊 chip）、村民卡片、速度与暂停、事件日志、档案面板 |',
 '| UI | 默认控件 | **v3 布局**：顶栏状态胶囊 + 速度组、村民卡片（像素头像 + 饱食/精力进度条 + 想法）、底部输入 + 六个功能键、居中提示条、面板内标签页 + 半透明遮罩、阶段/新一天大卡片淡出 |')
t = t.replace('![服装店](shots/godot-shop.png)',
 '''![服装店](shots/godot-shop.png)

![档案与成就](shots/godot-stats.png)

![每日委托](shots/godot-quests.png)''')
p.write_text(t, encoding='utf-8')

# 2) README：加入新截图
r = Path(r'D:\桌面\田园小镇\README.md')
s = r.read_text(encoding='utf-8')
s = s.replace('''| 白天 | 夜晚与雨 | 服装店 |
|---|---|---|
| ![白天](shots/godot-day.png) | ![夜雨](shots/godot-night-rain.png) | ![服装店](shots/godot-shop.png) |''',
'''| 白天 | 夜晚与雨 | 服装店 |
|---|---|---|
| ![白天](shots/godot-day.png) | ![夜雨](shots/godot-night-rain.png) | ![服装店](shots/godot-shop.png) |

| 档案与成就 | 每日委托 |
|---|---|
| ![档案](shots/godot-stats.png) | ![委托](shots/godot-quests.png) |''')
r.write_text(s, encoding='utf-8')
print('docs updated')
