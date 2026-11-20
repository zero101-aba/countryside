// AI 对话接入：火山方舟 Ark / DeepSeek，优先走本地代理
const STORE = 'fanmian_ai_v1';

export function loadAIConfig() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) || '{}');
    const legacy = !raw.provider;
    const provider = raw.provider || 'ark';
    let model = raw.model || '';
    let base = raw.base || '';
    let key = raw.key || '';
    if (provider === 'ark') {
      // 旧配置可能留着 deepseek-chat / api.deepseek.com，迁移到 Ark
      if (!model || model === 'deepseek-chat') model = 'deepseek-v4-1-flash-261017';
      if (!base || /api\.deepseek\.com/.test(base)) base = 'https://ark.cn-beijing.volces.com/api/v3';
      // 旧的 sk- Key 对 Ark 无效，不迁移，避免覆盖服务端 Key
      if (legacy && key.startsWith('sk-')) key = '';
    } else {
      if (!model) model = 'deepseek-chat';
      if (!base) base = 'https://api.deepseek.com';
    }
    return {
      key, provider, model, base,
      auto: raw.auto !== false,
      enabled: raw.enabled !== false,
    };
  } catch {
    return {
      key: '', provider: 'ark', model: 'deepseek-v4-1-flash-261017',
      base: 'https://ark.cn-beijing.volces.com/api/v3', auto: true, enabled: true,
    };
  }
}

export function saveAIConfig(patch = {}) {
  const next = { ...loadAIConfig(), ...patch };
  localStorage.setItem(STORE, JSON.stringify(next));
  return next;
}

export function isAIReady() {
  const c = loadAIConfig();
  return !!c.key;
}

function parseArk(raw) {
  const data = JSON.parse(raw);
  if (data.error) {
    const e = data.error;
    const msg = typeof e === 'string' ? e : (e.message || e.code || 'Ark 返回错误');
    throw new Error(msg === 'missing_key' ? '还没有配置 Ark API Key' : msg);
  }
  const out = data.output || [];
  const text = out
    .filter((o) => o.type === 'message')
    .flatMap((o) => o.content || [])
    .filter((c) => c.type === 'output_text')
    .map((c) => c.text)
    .join('\n')
    .trim();
  if (!text) throw new Error('Ark 没有返回正文（可能被安全策略拦截，或 token 不足）');
  return text;
}

function parseReply(raw) {
  const data = JSON.parse(raw);
  if (data.error) {
    const e = data.error;
    const msg = typeof e === 'string' ? e : (e.message || e.code || 'DeepSeek 返回错误');
    const err = new Error(msg === 'missing_key' ? '还没有配置 DeepSeek API Key' : msg);
    err.code = data.error;
    throw err;
  }
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('模型没有返回内容');
  return text;
}

export async function llmChat(messages, opts = {}) {
  const cfg = loadAIConfig();
  if (!cfg.enabled) throw new Error('AI 对话已关闭');
  const payload = {
    model: cfg.model || 'deepseek-chat',
    messages,
    temperature: opts.temperature ?? 0.9,
    max_tokens: opts.maxTokens ?? 260,
    json: !!opts.json,
  };

  // 火山方舟 Ark（Responses API，关闭思考）
  if (cfg.provider === 'ark') {
    let res = null;
    let raw = '';
    try {
      res = await fetch('/api/ark', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(cfg.key && cfg.key.startsWith('ark-') ? { 'x-ark-key': cfg.key } : {}) },
        body: JSON.stringify({
          model: cfg.model,
          messages,
          temperature: opts.temperature ?? 0.85,
          maxTokens: opts.maxTokens ?? 420,
        }),
      });
      raw = await res.text();
    } catch (e) {
      throw new Error('连接本地 Ark 代理失败，请确认 npm run dev 正在运行');
    }
    if (!res.ok && !raw.trim().startsWith('{')) {
      throw new Error(`Ark 代理返回 ${res.status}`);
    }
    return parseArk(raw);
  }

  // 1) 本地代理：服务端可以配置 DEEPSEEK_API_KEY，也可以转发浏览器里的 key
  let proxyRes = null;
  let proxyRaw = '';
  try {
    proxyRes = await fetch('/api/deepseek', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(cfg.key && cfg.key.startsWith('sk-') ? { 'x-deepseek-key': cfg.key } : {}) },
      body: JSON.stringify(payload),
    });
    proxyRaw = await proxyRes.text();
  } catch (e) {
    // 静态部署没有 /api/deepseek 时走直连
    proxyRes = null;
  }
  if (proxyRes) {
    if (proxyRes.status !== 503) return parseReply(proxyRaw);
    if (!cfg.key) return parseReply(proxyRaw);
    // 代理没配 key，但浏览器里有 key：继续走直连
  }

  // 2) 浏览器直连（需要 key；DeepSeek 若不允许跨域会报网络错误）
  if (!cfg.key || !cfg.key.startsWith('sk-')) throw new Error('DeepSeek 需要 sk- 开头的 API Key');
  const base = (cfg.base || 'https://api.deepseek.com').replace(/\/$/, '');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.key}` },
    body: JSON.stringify({
      model: payload.model,
      messages: payload.messages,
      temperature: payload.temperature,
      max_tokens: payload.max_tokens,
    }),
  });
  const raw = await res.text();
  if (!res.ok) {
    let msg = raw;
    try { msg = JSON.parse(raw)?.error?.message || raw; } catch { /* keep raw */ }
    throw new Error(`DeepSeek: ${msg}`);
  }
  return parseReply(raw);
}

export async function testAI() {
  const text = await llmChat([
    { role: 'system', content: '你是连接测试助手，只回复一句简短中文。' },
    { role: 'user', content: '回复：连接成功' },
  ], { maxTokens: 20, temperature: 0.2 });
  return text.trim();
}





