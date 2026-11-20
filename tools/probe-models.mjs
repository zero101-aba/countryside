// 探测哪些文本模型会直接返回正文（避免推理吃满 token）
const base = process.env.ANTHROPIC_BASE_URL;
const token = process.env.ANTHROPIC_AUTH_TOKEN;
const models = process.argv.slice(2);
const prompt = '用一句话说明“农场经营游戏”的核心循环，不要解释。';

for (const model of models) {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 70000);
  try {
    const res = await fetch(`${base}/v1/messages`, {
      method: 'POST',
      headers: { 'x-api-key': token, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: 500, messages: [{ role: 'user', content: prompt }] }),
      signal: ctrl.signal,
    });
    const data = await res.json();
    const text = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
    console.log(JSON.stringify({ model, status: res.status, ms: Date.now() - t0, stop: data.stop_reason, text: text.slice(0, 120), out: data.usage?.output_tokens }));
  } catch (e) {
    console.log(JSON.stringify({ model, error: String(e), ms: Date.now() - t0 }));
  } finally {
    clearTimeout(timer);
  }
}
