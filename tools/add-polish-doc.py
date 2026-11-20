from pathlib import Path
p = Path(r'D:\桌面\田园小镇\README.md')
t = p.read_text(encoding='utf-8')

anchor = '| UI 概念图（图像模型生成） | 新版界面 |'
add = '| 修复后的地面（无泥地） | 新版雨天 |\n|---|---|\n| ![无泥地](shots/270-no-dirt.png) | ![雨天](shots/271-rain.png) |\n\n| 每日小结 | |\n|---|---|\n| ![小结](shots/273-day-summary.png) | |\n\n'
t = t.replace(anchor, add + anchor, 1)

t = t.replace(
    '- 雨天自动浇湿所有地块，户外工作慢 12%；暴雨户外慢 35%，不能钓鱼和砍树，村民情绪也会受影响',
    '- 雨天自动浇湿所有地块，户外工作慢 12%；暴雨户外慢 35%，不能钓鱼和砍树，村民情绪也会受影响\n- 雨做了三层雨丝（远/中/近）+ 风斜 + 落地涟漪；暴雨更密更快，还会偶尔闪电照亮画面'
)
t = t.replace(
    '- 每棵树有独立的 seed',
    '- 树冠、岩石和房屋都加了深色描边，物体不再自带一块泥地；每棵树有独立的 seed'
)
t = t.replace(
    '夜晚可以手动跳过（顶栏 🌙）或设置自动跳过。',
    '夜晚可以手动跳过（顶栏 🌙）或设置自动跳过；每日清晨会弹出「昨日收入 / 收获 / 委托」小结。'
)
p.write_text(t, encoding='utf-8')

q = Path(r'D:\桌面\田园小镇\需求文档.md')
s = q.read_text(encoding='utf-8')
s = s.replace('界面视觉主题（奶油纸质+木框）、', '界面视觉主题（奶油纸质+木框）、物体描边与无泥地修复、分层雨效、8× 速度与每日小结、')
q.write_text(s, encoding='utf-8')
print('ok')
