// 调用图像模型生成 UI 概念图；token 从本机 DSH 凭据读取，不打印、不落盘
import fs from 'node:fs';
import path from 'node:path';

const home = process.env.DSH_HOME || path.join(process.env.USERPROFILE || '', '.dsh');
const credFile = path.join(home, '.credentials.yaml');
const raw = fs.readFileSync(credFile, 'utf8');
const grab = (name) => {
  const m = raw.match(new RegExp(`^\\s*${name}\\s*:\\s*(.+)$`, 'm'));
  if (!m) return '';
  return m[1].trim().replace(/^["']|["']$/g, '');
};
const token = grab('TOKEN_API_KEY') || grab('TOKENDISCOUNT_API_KEY');
if (!token) { console.error('no token'); process.exit(1); }

const base = 'https://token.poryf.com/v1';
const model = process.argv[2] || 'gpt-image-2.5-sunburst';
const out = process.argv[3] || 'shots/ui-concept-1.png';
const prompt = process.argv[4] || 'pixel art UI concept sheet for a cozy farming game on mobile, warm cream and wood palette, top HUD with coins and clock, bottom command bar with input, villager portrait cards, marketplace panel, rounded corners, 16-bit, clean readable Chinese-friendly layout, high quality';

const t0 = Date.now();
const res = await fetch(`${base}/images/generations`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
  body: JSON.stringify({ model, prompt, size: '1024x1024', n: 1 }),
});
const text = await res.text();
let data;
try { data = JSON.parse(text); } catch { data = { raw: text }; }
if (!res.ok) {
  console.log(JSON.stringify({ status: res.status, ms: Date.now() - t0, error: data?.error?.message || data?.message || text.slice(0, 300) }, null, 1));
  process.exit(2);
}
const item = data?.data?.[0] || {};
let buf = null;
if (item.b64_json) {
  buf = Buffer.from(item.b64_json, 'base64');
} else if (item.url) {
  const r2 = await fetch(item.url);
  buf = Buffer.from(await r2.arrayBuffer());
} else if (data?.images?.[0]?.url) {
  const r2 = await fetch(data.images[0].url);
  buf = Buffer.from(await r2.arrayBuffer());
}
if (!buf) {
  console.log(JSON.stringify({ status: res.status, ms: Date.now() - t0, keys: Object.keys(data), sample: text.slice(0, 300) }, null, 1));
  process.exit(3);
}
fs.writeFileSync(out, buf);
console.log(JSON.stringify({ ok: true, ms: Date.now() - t0, bytes: buf.length, out }, null, 1));
