from pathlib import Path
p=Path(r'D:\桌面\田园小镇\README.md')
t=p.read_text(encoding='utf-8')
anchor='## 存档'
sec='''## Godot 版

除了网页版，仓库里还有一个 **Godot 4.7.2 原生工程**（`godot/`），把核心玩法做成了可跑的切片：程序化地图、小伟与小杨、A* 寻路、自然语言指令、作物、天气与昼夜、牧场、服装店、阶段解锁、存档。

```powershell
& "D:\\文档\\Godot_v4.7.2-stable_win64.exe\\Godot_v4.7.2-stable_win64.exe" --path godot
```

无头自检：

```powershell
& "D:\\文档\\Godot_v4.7.2-stable_win64.exe\\Godot_v4.7.2-stable_win64_console.exe" --headless --path godot --quit-after 320 -- smoke
```

![Godot 版](shots/godot-01.png)

移植进度与后续计划见 **[docs/godot移植说明.md](docs/godot移植说明.md)**（网页版仍是内容最全的主版本）。

'''
t=t.replace(anchor, sec+anchor, 1)
p.write_text(t,encoding='utf-8')

g=Path(r'D:\桌面\田园小镇\.gitignore')
s=g.read_text(encoding='utf-8')
s += '''
# Godot
godot/.godot/
godot/android/
godot/export_presets.cfg
godot/*.import
godot/export/
'''
g.write_text(s,encoding='utf-8')
print('ok')
