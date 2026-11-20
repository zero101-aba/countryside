from pathlib import Path
p = Path(r'D:\桌面\田园小镇\docs\godot移植说明.md')
t = p.read_text(encoding='utf-8')
old = '| UI | 默认控件 | **v3 布局**：顶栏状态胶囊 + 速度组、村民卡片（像素头像 + 饱食/精力进度条 + 想法）、底部输入 + 六个功能键、居中提示条、面板内标签页 + 半透明遮罩、阶段/新一天大卡片淡出 |'
new = '| UI | 默认控件 | **v4 按图像模型概念图重做**：木框 + 内嵌奶油纸、铜钉装饰、emoji 圆形图标键、村民卡片（绿框头像 + 名牌 + 🍎/⚡ 状态条）、行卡片 + 绿色操作按钮 + 琥珀高亮、标签页分段落、半透明遮罩、阴影层次 |'
if old in t:
    t = t.replace(old, new, 1)
t = t.replace('![白天](shots/godot-day.png)', '![概念图 1（图像模型生成）](shots/ui-godot-1.png)\n\n![概念图 2（图像模型生成）](shots/ui-godot-2.png)\n\n![白天](shots/godot-day.png)')
p.write_text(t, encoding='utf-8')

r = Path(r'D:\桌面\田园小镇\README.md')
s = r.read_text(encoding='utf-8')
old2 = '| 白天 | 夜晚与雨 | 服装店 |\n|---|---|---|\n| ![白天](shots/godot-day.png) | ![夜雨](shots/godot-night-rain.png) | ![服装店](shots/godot-shop.png) |'
new2 = '| UI 概念图（图像模型生成） | |\n|---|---|\n| ![概念1](shots/ui-godot-1.png) | ![概念2](shots/ui-godot-2.png) |\n\n| 白天 | 夜晚与雨 | 服装店 |\n|---|---|---|\n| ![白天](shots/godot-day.png) | ![夜雨](shots/godot-night-rain.png) | ![服装店](shots/godot-shop.png) |'
if old2 in s:
    s = s.replace(old2, new2, 1)
r.write_text(s, encoding='utf-8')
print('docs updated')
