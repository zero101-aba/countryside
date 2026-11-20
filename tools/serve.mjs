// 极简静态服务器（无依赖）
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let PORT = Number(process.env.PORT) || 5180;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

async function handleLLM(req, res) {
  const chunks = [];
  for await (const c of req) {
    chunks.push(c);
    if (Buffer.concat(chunks).length > 2_000_000) {
      res.writeHead(413); res.end('too large'); return;
    }
  }
  let payload;
  try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { res.writeHead(400); res.end('bad json'); return; }
  const key = req.headers['x-deepseek-key'] || process.env.DEEPSEEK_API_KEY;
  if (!key) {
    res.writeHead(503, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'missing_key', message: '没有配置 DeepSeek API Key' }));
    return;
  }
  const base = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
  const model = payload.model || process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  try {
    const r = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: payload.messages || [],
        temperature: payload.temperature ?? 0.9,
        max_tokens: payload.max_tokens ?? 240,
        response_format: payload.json ? { type: 'json_object' } : undefined,
      }),
      signal: AbortSignal.timeout(60000),
    });
    const text = await r.text();
    res.writeHead(r.status, { 'content-type': 'application/json; charset=utf-8' });
    res.end(text);
  } catch (e) {
    res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'proxy_failed', message: String(e.message || e) }));
  }
}

async function handleArk(req, res) {
  const chunks = [];
  for await (const c of req) {
    chunks.push(c);
    if (Buffer.concat(chunks).length > 2_000_000) { res.writeHead(413); res.end('too large'); return; }
  }
  let payload;
  try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { res.writeHead(400); res.end('bad json'); return; }
  const key = req.headers['x-ark-key'] || process.env.ARK_API_KEY;
  if (!key) {
    res.writeHead(503, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'missing_key', message: '没有配置 Ark API Key' }));
    return;
  }
  const base = (process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, '');
  const msgs = payload.messages || [];
  const system = msgs.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
  const input = msgs.filter((m) => m.role !== 'system').map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: [{ type: 'input_text', text: String(m.content || '') }],
  }));
  try {
    const r = await fetch(`${base}/responses`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: payload.model || 'deepseek-v4-1-flash-261017',
        stream: false,
        thinking: { type: 'disabled' },
        instructions: system || undefined,
        input,
        max_output_tokens: payload.maxTokens ?? 420,
        temperature: payload.temperature ?? 0.85,
      }),
      signal: AbortSignal.timeout(90000),
    });
    const text = await r.text();
    res.writeHead(r.status, { 'content-type': 'application/json; charset=utf-8' });
    res.end(text);
  } catch (e) {
    res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'proxy_failed', message: String(e.message || e) }));
  }
}

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let p = decodeURIComponent(url.pathname);
    if (req.method === 'POST' && p === '/api/deepseek') { handleLLM(req, res); return; }
    if (req.method === 'POST' && p === '/api/ark') { handleArk(req, res); return; }
    if (p === '/') p = '/index.html';
    const file = path.join(root, p);
    if (!file.startsWith(root)) { res.writeHead(403); res.end('forbidden'); return; }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('404 not found: ' + p);
      return;
    }
    res.writeHead(200, {
      'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    res.writeHead(500); res.end(String(e));
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && !process.env.PORT) {
    console.log(`端口 ${PORT} 被占用，尝试 ${PORT + 1}…`);
    PORT += 1;
    setTimeout(() => server.listen(PORT), 50);
  } else {
    console.error(err.message);
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log(`田园小镇 running at http://localhost:${PORT}/`);
});





