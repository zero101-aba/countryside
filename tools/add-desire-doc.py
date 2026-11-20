from pathlib import Path
p = Path(r'D:\桌面\田园小镇\README.md')
t = p.read_text(encoding='utf-8')

anchor = '| 修复后的地面（无泥地） | 新版雨天 |'
add = '| 性格 / 心愿 / 此刻 | 自主意愿 |\n|---|---|\n| ![性格](shots/280-desires.png) | ![意愿](shots/281-desire-river.png) |\n\n'
t = t.replace(anchor, add + anchor, 1)

sec_anchor = '## 代码结构'
sec = '''### 7.7 性格与自主意愿

小伟和小杨不只是执行指令，他们有自己的**性格、心愿和此刻想做的事**：

| | 小伟 | 小杨 |
|---|---|---|
| 性格 | 嘴甜、心宽、爱清闲、有点懒 | 心细、爱干净、认真、嘴硬心软 |
| 心愿 | 在河边待着，顺便钓两条鱼 | 把地种好，把家里收拾干净 |
| 常想做的事 | 去河边坐坐、钓鱼、找人聊天、打个盹、找点吃的 | 去照看庄稼、看看花、收拾一下、找人聊天、找点吃的 |

- 没被派活时，他们会按当前状态（精力/饥饿/社交/情绪/天气/时间）自己挑一件事去做
- 到了河边/花坛会停下来待一会儿，想法气泡里说一句自己的话，然后心情变好一点
- 你一发指令，他们会立刻放下自己的念头先干你的活
- 村民面板里能看到「性格 / 心愿 / 此刻在想什么」

![性格与心愿](shots/280-desires.png)

'''
t = t.replace(sec_anchor, sec + sec_anchor, 1)
p.write_text(t, encoding='utf-8')

q = Path(r'D:\桌面\田园小镇\需求文档.md')
s = q.read_text(encoding='utf-8')
s = s.replace('8× 速度与每日小结、', '8× 速度与每日小结、村民性格与自主意愿、')
q.write_text(s, encoding='utf-8')
print('ok')
