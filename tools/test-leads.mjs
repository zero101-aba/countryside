// 主角像素化检查：把小伟/小杨/阿福的精灵放大对比，并验证世界与对话
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

// 1. 角色数据 + 房间
const data = await page.evaluate(() => {
  const s = window.__game.sim;
  const lead = s.villagers.filter((v) => v.lead);
  return {
    count: s.villagers.length,
    leads: lead.map((v) => ({ name: v.name, role: v.role, home: v.home?.name, pos: [v.x, v.y], likes: v.likes })),
    house: !!s.world.buildingById('home_xiaowei'),
  };
});

// 2. 三个角色精灵（正面）放大 10 倍拼成一张图
const spritePng = await page.evaluate(() => {
  const g = window.__game;
  const names = ['小伟', '小杨', '阿福'];
  const c = document.createElement('canvas');
  c.width = 22 * 10 * 3 + 40; c.height = 22 * 10;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.fillStyle = '#79b45a'; x.fillRect(0, 0, c.width, c.height);
  names.forEach((n, i) => {
    const v = g.sim.villagers.find((z) => z.name === n);
    const spr = g.renderer.sprites.get(v.colors, 'down', 'idle', 0);
    x.drawImage(spr, 0, 0, 22, 22, i * 240 + 10, 0, 220, 220);
  });
  return c.toDataURL('image/png');
});
fs.writeFileSync(`${OUT}/90-sprites.png`, Buffer.from(spritePng.split(',')[1], 'base64'));

// 3. 放到村里看一眼（镜头对准新房子）
await page.evaluate(() => {
  const g = window.__game;
  g.sim.absHours = 9.5;
  g.sim.selected = null;
  g.follow = null;
  const xw = g.sim.villagers.find((v) => v.name === '小伟');
  const xy = g.sim.villagers.find((v) => v.name === '小杨');
  xw.x = 24.5; xw.y = 10.2; xw.dir = 'down'; xw.path = null; xw.task = null; xw.state = 'auto';
  xy.x = 25.7; xy.y = 10.2; xy.dir = 'down'; xy.path = null; xy.task = null; xy.state = 'auto';
  g.renderer.snapTo(25.5, 8.5);
  g.ui.refreshNow();
});
await new Promise((r) => setTimeout(r, 700));
await page.screenshot({ path: `${OUT}/91-leads-house.png` });

// 4. 和小伟、小杨聊天
const chat = await page.evaluate(() => {
  const g = window.__game;
  const xw = g.sim.villagers.find((v) => v.name === '小伟');
  g.selectVillager(xw);
  document.getElementById('sheet').classList.remove('open');
  g.ui.openChat(xw);
  return { role: document.getElementById('chat-role').textContent, greet: document.querySelector('#chat-log .m-bubble')?.textContent };
});
await new Promise((r) => setTimeout(r, 400));
await page.click('#chat-topics [data-topic="praise"]');
await new Promise((r) => setTimeout(r, 900));
const xwReply = await page.evaluate(() => [...document.querySelectorAll('#chat-log .m-bubble')].slice(-1)[0]?.textContent);
await page.screenshot({ path: `${OUT}/92-chat-xiaowei.png` });

await page.evaluate(() => {
  const g = window.__game;
  g.ui.closeChat();
  const xy = g.sim.villagers.find((v) => v.name === '小杨');
  g.ui.openChat(xy);
});
await new Promise((r) => setTimeout(r, 400));
await page.click('#chat-topics [data-topic="greet"]');
await new Promise((r) => setTimeout(r, 900));
const xyReply = await page.evaluate(() => [...document.querySelectorAll('#chat-log .m-bubble')].slice(-1)[0]?.textContent);
await page.screenshot({ path: `${OUT}/93-chat-xiaoyang.png` });

// 5. 精灵是否各自独立（防止缓存串角色）
const distinct = await page.evaluate(() => {
  const g = window.__game;
  const sig = (n) => {
    const v = g.sim.villagers.find((z) => z.name === n);
    const c = g.renderer.sprites.get(v.colors, 'down', 'idle', 0);
    return c.toDataURL();
  };
  return { xw_xy_differ: sig('小伟') !== sig('小杨'), xw_afu_differ: sig('小伟') !== sig('阿福') };
});

await browser.close();
console.log(JSON.stringify({ data, chat, xwReply, xyReply, distinct, errs }, null, 1));
