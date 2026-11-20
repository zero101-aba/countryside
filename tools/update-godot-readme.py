from pathlib import Path
p=Path(r'D:\桌面\田园小镇\README.md')
t=p.read_text(encoding='utf-8')
old_start=t.find('## Godot 版')
old_end=t.find('## 存档')
if old_start>=0 and old_end>old_start:
    sec='''## Godot 版

除了网页版，仓库里还有一个 **Godot 4.7.2 原生工程**（`godot/`），核心玩法已经跑通并做过一轮优化：

- **三区域大地图**（56×40，青禾村 / 清溪河岸 / 后山林地）、A* 寻路（引擎 AStarGrid2D）
- **5 种作物 + 四季阶段 + 四段造型**、16 只动物与牧产、砍树/钓鱼/挖矿
- **村民 v2**：情绪五维、信任、需求、**自主意愿**（河边发呆/钓鱼/打盹/看花/收拾/聊天/自己买卖）
- **每日委托、9 个成就、8 阶段解锁、服装店 10 套时装**、全量存档
- 昼夜灯光、雷雨涟漪、四季粒子、奶油纸质 UI

```powershell
& "D:\\文档\\Godot_v4.7.2-stable_win64.exe\\Godot_v4.7.2-stable_win64.exe" --path godot

# 无头自检
& "D:\\文档\\Godot_v4.7.2-stable_win64.exe\\Godot_v4.7.2-stable_win64_console.exe" --headless --path godot --quit-after 300 -- smoke
```

| 白天 | 夜晚与雨 | 服装店 |
|---|---|---|
| ![白天](shots/godot-day.png) | ![夜雨](shots/godot-night-rain.png) | ![服装店](shots/godot-shop.png) |

移植进度、架构映射与后续计划见 **[docs/godot移植说明.md](docs/godot移植说明.md)**。

'''
    t=t[:old_start]+sec+t[old_end:]
    p.write_text(t,encoding='utf-8')
    print('readme updated')
else:
    print('anchor missing', old_start, old_end)
