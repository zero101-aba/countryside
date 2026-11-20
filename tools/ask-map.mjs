// 向可用文本模型询问地图扩展方案（token 只从环境变量读取）
import fs from 'node:fs';

const base = process.env.ANTHROPIC_BASE_URL;
const token = process.env.ANTHROPIC_AUTH_TOKEN;
const out = process.argv[2] || 'docs/map-plan.md';

const prompt = `你是像素农场游戏的地图设计师。当前游戏是一张 40×42 的无缝地图：西边是村庄和农田，东边 x36-39 是南北向河流，南边 y30-41 是河边渔村和湖湾（x30-35 y34-41 是水），集市在 x24-32 y8-11，农田在 x7-21 y8-16。

我准备把地图扩到 64×52：
- 东侧 x40-63 是「后山林地」，通过 y13 的一座桥跨过 x36-39 的河；
- 南侧 y42-51 是「清溪河岸」，有磨坊和小麦地，接渔村；
- 村庄/农田仍是中心枢纽；
- 需要矿区（石头/矿石）、采集点、磨坊、小地图、区域快速前往、区域解锁。

请输出一份可直接照着做的地图设计，要求：
1. 用坐标列出每个区域的边界和主题色；
2. 给出桥、主路、支路的具体坐标（用 x,y 表示）；
3. 给出后山：树、石头/矿点、蘑菇、伐木营地的坐标分布（数量各 6-12 个，避开道路）；
4. 给出河岸：磨坊、麦田、码头、芦苇的坐标；
5. 小地图上每个区域的显示位置和快速前往点；
6. 区域解锁条件建议；
7. 新指令（挖矿/磨面）的产出和用途；
8. 只输出设计和坐标，不要写代码，控制在 1200 字以内。`;

const res = await fetch(`${base}/v1/messages`, {
  method: 'POST',
  headers: { 'x-api-key': token, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
  body: JSON.stringify({ model: 'qwen3.8-flash', max_tokens: 2200, messages: [{ role: 'user', content: prompt }] }),
});
const data = await res.json();
const text = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
fs.writeFileSync(out, text || JSON.stringify(data, null, 2), 'utf8');
console.log(JSON.stringify({ status: res.status, model: data.model, stop: data.stop_reason, chars: text.length, usage: data.usage }, null, 1));
