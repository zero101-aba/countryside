// 测试：情绪系统 + 对话面板
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = process.env.URL || 'http://localhost:5180/';
const OUT = 'shots';
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

await page.goto(URL, { waitUntil: 'networkidle0' });
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('farm_tutorial_done', '1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise((r) => setTimeout(r, 700));

// 1) 各村民初始情绪（应各自独立）
const initial = await page.evaluate(() => window.__game.sim.villagers.map((v) => ({
  name: v.name,
  dom: v.emotion.key,
  emo: Object.fromEntries(Object.entries(v.emo.cur).map(([k, x]) => [k, Math.round(x)])),
  trust: Math.round(v.emo.trust),
})));

// 2) 选中阿福 → 打开指令簿 → 找他聊聊
await page.evaluate(() => window.__game.selectVillager(window.__game.sim.villagers[0]));
await new Promise((r) => setTimeout(r, 600));
const sheetHasChat = await page.evaluate(() => !!document.querySelector('[data-cmd="talk"]'));
const sheetHasEmo = await page.evaluate(() => document.querySelectorAll('.sh-emo-bar').length);
await page.screenshot({ path: `${OUT}/80-sheet-emo.png` });
await page.click('[data-cmd="talk"]');
await new Promise((r) => setTimeout(r, 700));
const opened = await page.evaluate(() => ({
  open: document.getElementById('chat').classList.contains('open'),
  name: document.getElementById('chat-name').textContent,
  role: document.getElementById('chat-role').textContent,
  pills: document.querySelectorAll('#chat-emo .emo-pill').length,
  topics: document.querySelectorAll('#chat-topics .topic-chip').length,
  msgs: document.querySelectorAll('#chat-log .msg').length,
  greeting: document.querySelector('#chat-log .m-bubble')?.textContent,
}));
await page.screenshot({ path: `${OUT}/81-chat-open.png` });

// 3) 点话题：关心 → 夸奖 → 送吃的 → 讲笑话 → 道歉
const before = await page.evaluate(() => {
  const v = window.__game.sim.villagers[0];
  return { joy: v.emo.cur.joy, trust: v.emo.trust, anger: v.emo.cur.anger, bread: window.__game.sim.inventory.bread };
});
for (const t of ['care', 'praise', 'food', 'joke', 'apologize']) {
  await page.click(`#chat-topics [data-topic="${t}"]`);
  await new Promise((r) => setTimeout(r, 900));
}
const afterTopics = await page.evaluate(() => {
  const v = window.__game.sim.villagers[0];
  return {
    joy: +v.emo.cur.joy.toFixed(1), trust: +v.emo.trust.toFixed(1), anger: +v.emo.cur.anger.toFixed(1),
    bread: window.__game.sim.inventory.bread,
    msgs: document.querySelectorAll('#chat-log .msg').length,
    lastReplies: [...document.querySelectorAll('#chat-log .msg .m-bubble')].slice(-8).map((b) => b.textContent),
  };
});
await page.screenshot({ path: `${OUT}/82-chat-topics.png` });

// 4) 自由输入（意图识别）
await page.type('#chat-text', '你最近累不累？要不要歇两天');
await page.evaluate(() => document.getElementById('chat-form').dispatchEvent(new Event('submit', { cancelable: true })));
await new Promise((r) => setTimeout(r, 900));
await page.type('#chat-text', '村里最近有什么新鲜事');
await page.evaluate(() => document.getElementById('chat-form').dispatchEvent(new Event('submit', { cancelable: true })));
await new Promise((r) => setTimeout(r, 900));
const freeTalk = await page.evaluate(() => {
  const bubbles = [...document.querySelectorAll('#chat-log .msg .m-bubble')].map((b) => b.textContent);
  return { last: bubbles.slice(-4), total: bubbles.length };
});
await page.screenshot({ path: `${OUT}/83-chat-free.png` });

// 5) 关掉聊天，看情绪是否反映到卡片/世界
await page.evaluate(() => window.__game.ui.closeChat());
await new Promise((r) => setTimeout(r, 500));
const cards = await page.evaluate(() => [...document.querySelectorAll('.vcard')].map((c) => ({
  name: c.querySelector('.vc-name').textContent,
  mood: c.querySelector('.vc-mood').textContent,
})));

// 6) 打开另一个村民，确认情绪独立且不同
await page.evaluate(() => window.__game.selectVillager(window.__game.sim.villagers[2]));
await new Promise((r) => setTimeout(r, 500));
await page.click('[data-cmd="talk"]');
await new Promise((r) => setTimeout(r, 700));
const other = await page.evaluate(() => {
  const v = window.__game.sim.villagers[2];
  return { name: v.name, dom: v.emotion.key, role: document.getElementById('chat-role').textContent };
});
await page.screenshot({ path: `${OUT}/84-chat-other.png` });

// 7) 存读档后情绪保留
await page.evaluate(() => window.__game.save());
await page.reload({ waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 800));
const reloaded = await page.evaluate(() => window.__game.sim.villagers.map((v) => ({
  name: v.name, joy: Math.round(v.emo.cur.joy), trust: Math.round(v.emo.trust), talks: v.memory.talkCount,
})));

await browser.close();
console.log(JSON.stringify({ initial, sheetHasChat, sheetHasEmo, opened, before, afterTopics, freeTalk, cards, other, reloaded, errs }, null, 1));

