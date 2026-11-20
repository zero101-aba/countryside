from pathlib import Path
p = Path(r'D:\桌面\田园小镇\docs\游戏简介-350字.md')
t = p.read_text(encoding='utf-8')
t = t.replace('两位主角各有性格、情绪与心愿：', '两位主角各有性格与心愿：')
t = t.replace('接入大模型后，两人还会自己聊天、发展关系。', '接入大模型后，两人会自己聊天、发展关系。')
t = t.replace('纯前端 Canvas 编写、零运行时依赖，另有 Godot 4.7 原生版。', '纯前端 Canvas 编写、零依赖，另有 Godot 4.7 原生版。')
p.write_text(t, encoding='utf-8')
