from pathlib import Path
p=Path(r'D:\桌面\田园小镇\需求文档.md')
t=p.read_text(encoding='utf-8')
t=t.replace('剧情、独立 world 场景切换、LLM 兜底未做（当前是 64×52 无缝大世界 + 区域快速前往）。','当前角色裁剪为小伟/小杨两人；DeepSeek 自主对话已接入（集市→设置填 Key 或服务端 DEEPSEEK_API_KEY，含自动对话/关系值/故事记录）；剧情、独立 world 场景切换、LLM 指令兜底未做（当前是 64×52 无缝大世界 + 区域快速前往）。')
p.write_text(t,encoding='utf-8')
print('ok')
