from pathlib import Path
p = Path(r'D:\桌面\田园小镇\README.md')
t = p.read_text(encoding='utf-8')

# 1) 截图区加入动物
anchor = '| DeepSeek 设置 | AI 自主对话 |'
add = '| 牧场：牛、羊 | 水边：鸭、鹅 |\n|---|---|\n| ![牧场](shots/240-pasture.png) | ![水鸟](shots/241-waterbirds.png) |\n\n'
t = t.replace(anchor, add + anchor, 1)

# 2) 指令表加入收牧产
cmd_anchor = '| `去后山砍两棵树` | 只找后山范围内的树，不跑回村里砍 |'
cmd_add = cmd_anchor + '\n| `挤奶` / `剪羊毛` / `收蛋` | 找对应的牛/羊/鸡鸭鹅，收牛奶、羊毛、鸡蛋 |\n| `收牧产` | 把所有已就绪的牧产都收一遍 |'
t = t.replace(cmd_anchor, cmd_add, 1)

# 3) 新增动物章节
vegan = '## 代码结构'
section = '''### 7.6 牧场动物

- **11 种动物**：鸡 / 小鸡、鸭 / 小鸭、鹅、牛 / 小牛、羊 / 小羊、猫、狗
- 按区域活动：鸡在鸡圈，牛和羊在谷仓南侧牧场，鸭和鹅在渔村水边，猫和狗在村里溜达
- **牧产**：鸡和鸭下蛋、牛产奶、羊产毛，随时间积累；攒好后动物头顶会出现蛋/奶桶/羊毛图标
- 指令：`收蛋`、`挤奶`、`剪羊毛`、`收牧产`，村民会自己走过去收回来
- 价格：鸡蛋 14G、牛奶 38G、羊毛 52G；猫狗是陪伴动物，不产东西
- 牧场动物会慢慢走动、低头啄食/吃草，村民收牧产时它们会停下来

![牧场动物](shots/240-pasture.png)

'''
t = t.replace(vegan, section + vegan, 1)

p.write_text(t, encoding='utf-8')
print('ok')
