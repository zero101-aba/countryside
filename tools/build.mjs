// 打包：把静态资源复制到 dist/（可直接部署或塞进 Cordova/Capacitor）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const items = ['index.html', 'styles.css', 'styles-chat.css', 'styles-theme.css', 'favicon.svg', 'manifest.webmanifest', 'sw.js', 'icons', 'src'];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
for (const it of items) {
  const from = path.join(root, it);
  const to = path.join(dist, it);
  const st = fs.statSync(from);
  if (st.isDirectory()) fs.cpSync(from, to, { recursive: true });
  else fs.copyFileSync(from, to);
}
console.log('built ->', dist);



