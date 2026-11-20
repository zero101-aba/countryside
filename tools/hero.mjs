// 生成最终展示截图
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
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(URL, { waitUntil: 'networkidle0' });
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem('farm_tutorial_done', '1');
  document.getElementById('tutorial').classList.remove('show');
});

// --- 1. 新手引导 ---
await page.reload({ waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 900));
await page.screenshot({ path: `${OUT}/01-tutorial.png` });

// --- 2. 村庄总览（白天）---
await page.evaluate(() => {
  const g = window.__game;
  g.ui && document.getElementById('tutorial').classList.remove('show');
  g.sim.absHours = 9.5;
  g.renderer.snapTo(15, 11);
  g.follow = null;
});
await new Promise((r) => setTimeout(r, 600));
await page.screenshot({ path: `${OUT}/02-village.png` });

// --- 3. 选中村民 + 指令簿 ---
await page.evaluate(() => window.__game.selectVillager(window.__game.sim.villagers[0]));
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: `${OUT}/03-orders.png` });
await page.evaluate(() => window.__game.ui.closeSheet());

// --- 4. 作物生长各阶段 ---
await page.evaluate(() => {
  const g = window.__game, s = g.sim;
  const plots = s.world.plots;
  const stages = [0.1, 0.4, 0.75, 1];
  for (let i = 0; i < 4; i++) {
    const p = plots[i * 2];
    p.state = 'plowed'; p.crop = i === 3 ? 'pumpkin' : 'radish';
    p.growth = stages[i] * (i === 3 ? 46 : 8);
    p.wetUntil = s.absHours + 8;
  }
  const p5 = plots[10]; p5.state = 'plowed'; p5.crop = 'turnip'; p5.growth = 7; p5.wetUntil = s.absHours + 8;
  const p6 = plots[12]; p6.state = 'plowed'; p6.crop = 'strawberry'; p6.growth = 20; p6.wetUntil = 0;
  // 让阿福在这块成熟的地里收获，展示动作
  const v = s.villagers[0];
  v.x = p5.x + 0.5; v.y = p5.y + 1.4; v.path = null; v.task = null; v.state = 'auto';
  g.selectVillager(v);
  g.renderer.snapTo(12, 12);
  g.follow = null;
  v.issueOrder('water', p5.x, p5.y);
});
await new Promise((r) => setTimeout(r, 2200));
await page.screenshot({ path: `${OUT}/04-crops.png` });
await page.evaluate(() => window.__game.ui.closeSheet());

// --- 5. 集市 ---
await page.evaluate(() => window.__game.ui.openShop('seed'));
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: `${OUT}/05-shop.png` });
await page.evaluate(() => window.__game.ui.closeSheet());

// --- 6. 夜晚 ---
await page.evaluate(() => {
  const g = window.__game;
  g.sim.absHours = 21.5;
  g.ui.closeSheet();
  g.follow = null;
  g.renderer.snapTo(18, 12);
});
await new Promise((r) => setTimeout(r, 900));
await page.screenshot({ path: `${OUT}/06-night.png` });

await browser.close();
console.log(JSON.stringify({ errs }, null, 1));

