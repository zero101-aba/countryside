from pathlib import Path
p = Path(r'D:\桌面\田园小镇\README.md')
t = p.read_text(encoding='utf-8')
old = '| 6 种树木 | 5 种作物 |\n|---|---|\n| ![树木](shots/211-tree-species.png) | ![作物](shots/212-crops.png) |'
new = old + '\n\n| DeepSeek 设置 | AI 自主对话 |\n|---|---|\n| ![AI设置](shots/230-ai-settings.png) | ![AI对话](shots/231-ai-talk.png) |'
t = t.replace(old, new)
p.write_text(t, encoding='utf-8')
print('ok')
