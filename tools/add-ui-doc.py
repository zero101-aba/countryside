from pathlib import Path
p = Path(r'D:\桌面\田园小镇\README.md')
t = p.read_text(encoding='utf-8')

anchor = '| DeepSeek 设置 | AI 自主对话 |'
add = '| UI 概念图（图像模型生成） | 新版界面 |\n|---|---|\n| ![UI概念](shots/ui-concept-1.png) | ![新版界面](shots/260-ui-portrait.png) |\n\n'
t = t.replace(anchor, add + anchor, 1)

sec_anchor = '## 横屏'
sec = '''## 界面主题

界面按图像模型生成的 UI 概念图重做了一版视觉：

- **配色**：奶油纸质面板 + 木框描边 + 草绿强调色，替换原来的深色底板
- **顶部 HUD**：金币、日期、区域都做成独立圆角胶囊；速度、地图、声音、跳过夜晚为木质圆角按钮
- **底部**：传令输入框 + 绿色发送键、快捷指令胶囊、村民卡片（木框圆角 + 状态条）、六宫格工具栏
- **面板**：集市、委托、村民、设置、聊天、世界地图统一成纸质抽屉，Tab 改成胶囊
- **移动端**：竖屏自动换行，横屏把顶部收成一行，工具栏文字保持横排

![新版界面](shots/261-ui-sheet.png)

'''
t = t.replace(sec_anchor, sec + sec_anchor, 1)
p.write_text(t, encoding='utf-8')

q = Path(r'D:\桌面\田园小镇\需求文档.md')
s = q.read_text(encoding='utf-8')
s = s.replace('夜晚手动/自动跳过、', '界面视觉主题（奶油纸质+木框）、夜晚手动/自动跳过、')
q.write_text(s, encoding='utf-8')
print('ok')
