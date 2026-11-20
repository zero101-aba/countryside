// 通过本机 magpie 网关调用图像模型；key 只从凭据读取，不打印
import fs from 'node:fs';
import path from 'node:path';

const home = process.env.DSH_HOME || path.join(process.env.USERPROFILE || '', '.dsh');
const raw = fs.readFileSync(path.join(home, '.credentials.yaml'), 'utf8');
const grab = (name) => {
  const m = raw.match(new RegExp(`^\\s*${name}\\s*:\\s*(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
};
const key = grab('MAGPIE_GATEWAY_KEY');
if (!key) { console.error('no magpie key'); process.exit(1); }

const base = (process.env.IMAGE_BASE_URL || 'http://127.0.0.1:3425/v1').replace(/\/$/, '');
const out = process.argv[2] || 'shots/fashion.png';
const prompt = process.argv[3] || 'pixel art costume sheet';
const candidates = (process.argv[4] || 'token/gpt-image-2.5-sunburst,gpt-image-2.5-sunburst').split(',');

for (const model of candidates) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${base}/images/generations`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, prompt, size: '1024x1024', n: 1 }),
    });
    const text = await res.text();
    if (!res.ok) {
      let msg = text.slice(0, 220);
      try { msg = JSON.parse(text)?.error?.message || msg; } catch { /* keep */ }
      console.log(JSON.stringify({ model, status: res.status, ms: Date.now() - t0, error: msg }));
      continue;
    }
    const data = JSON.parse(text);
    const item = data?.data?.[0] || {};
    let buf = null;
    if (item.b64_json) buf = Buffer.from(item.b64_json, 'base64');
    else if (item.url) buf = Buffer.from(await (await fetch(item.url)).arrayBuffer());
    if (!buf) {
      console.log(JSON.stringify({ model, status: res.status, keys: Object.keys(data), sample: text.slice(0, 200) }));
      continue;
    }
    fs.writeFileSync(out, buf);
    console.log(JSON.stringify({ ok: true, model, ms: Date.now() - t0, bytes: buf.length, out }));
    process.exit(0);
  } catch (e) {
    console.log(JSON.stringify({ model, error: String(e.message || e) }));
  }
}
process.exit(2);
