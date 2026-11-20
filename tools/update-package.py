import json
from pathlib import Path

p = Path(r'D:\桌面\田园小镇\package.json')
data = json.loads(p.read_text(encoding='utf-8'))
data['description'] = '田园小镇 —— 你发指令、村民自己干活的像素种田游戏原型（村民 AI / 自主意愿 / AI 对话 / 阶段解锁 / 服装店）'
data['license'] = 'MIT'
data['keywords'] = [
    'pixel-art', 'canvas', 'game', 'farming', 'simulation', 'javascript',
    'es-modules', 'mobile-game', 'pwa', 'ai-agents', 'llm', 'deepseek',
    'stardew-like', 'no-dependencies',
]
data['homepage'] = 'https://github.com/<your-name>/tianyuan-town#readme'
data['repository'] = {'type': 'git', 'url': 'https://github.com/<your-name>/tianyuan-town.git'}
data['engines'] = {'node': '>=18'}
p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('package.json updated')
