// 调用外部文本模型做设计评审（token 只从环境变量读取，不落盘）
import fs from 'node:fs';

const base = process.env.ANTHROPIC_BASE_URL;
const token = process.env.ANTHROPIC_AUTH_TOKEN;
const model = process.argv[2] || 'glm-5.3';
const out = process.argv[3] || 'docs/ai-plan.md';
if (!base || !token) {
  console.error('missing env');
  process.exit(1);
}

const brief = fs.readFileSync('docs/gpt-brief.md', 'utf8');
const system = [
  '你是一位资深独立游戏制作人兼系统策划，做过农场经营/生活模拟类手游。',
  '你会直接给可执行的设计，不写空话，不写代码。',
  '你很清楚小团队原型的取舍：优先做能放大“村民自主 AI + 可见执行”这个核心差异的内容。',
].join('');
const user = `${brief}

---

请严格按上面的「我希望你输出什么」顺序，给出完整方案。中文，Markdown，先给一页纸路线图。
每个功能标注 S/M/L 和 P0/P1/P2。地图请给出可落地的 ASCII 布局。不要写代码。
如果篇幅有限，优先把「新地图」和「新功能」写具体，优化方向可以精简。`;

const body = {
  model,
  max_tokens: 6000,
  system,
  messages: [{ role: 'user', content: user }],
};

const t0 = Date.now();
const res = await fetch(`${base}/v1/messages`, {
  method: 'POST',
  headers: {
    'x-api-key': token,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify(body),
});
const raw = await res.text();
let data;
try { data = JSON.parse(raw); } catch { data = { raw }; }
const text = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
fs.writeFileSync(out, text || JSON.stringify(data, null, 2), 'utf8');
console.log(JSON.stringify({
  status: res.status,
  model: data.model,
  stop: data.stop_reason,
  outChars: text.length,
  ms: Date.now() - t0,
  usage: data.usage,
}, null, 2));
if (!res.ok || !text) process.exitCode = 2;
