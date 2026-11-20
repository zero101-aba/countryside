// 端到端流程截图：新手引导 → 选人 → 指令 → 干活 → 集市 → 天黑
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT = 'tools/shots';
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });

// 干净存档
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(() => { localStorage.clear(); });
await page.reload({ waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 900));
await page.screenshot({ path: `${OUT}/30-tutorial.png` });

// 教程走完
await page.evaluate(() => {
  const t = document.getElementById('tutorial');
  for (let i = 0; i < 6; i++) {
    const btn = t.querySelector('#tut-next') || t.querySelector('#tut-skip');
    if (btn) btn.click();
  }
  t.classList.remove('show');
  localStorage.setItem('farm_tutorial_done', '1');
});
await new Promise((r) => setTimeout(r, 400));

// 选中阿福
await page.evaluate(() => window.__game.selectVillager(window.__game.sim.villagers[0]));
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: `${OUT}/31-villager-sheet.png` });

// 选“开垦” → 关抽屉 → 点地图上的地块
await page.evaluate(() => {
  const g = window.__game;
  document.querySelector('[data-cmd="plow"]').click();
  const p = g.sim.world.plots.find((x) => x.state === 'grass');
  g._useMode({ x: p.x + 0.5, y: p.y + 0.5 });
});
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot({ path: `${OUT}/32-walking.png` });
await new Promise((r) => setTimeout(r, 2600));
await page.screenshot({ path: `${OUT}/33-plowing.png` });
await new Promise((r) => setTimeout(r, 3000));
await page.screenshot({ path: `${OUT}/34-done.png` });

// 直接点地块（默认动作）测试：播种
await page.evaluate(() => {
  const g = window.__game;
  const v = g.sim.villagers[0];
  const p = g.sim.world.plots.find((x) => x.state === 'plowed' && !x.crop);
  if (p) { v.x = p.x + 0.5; v.y = p.y + 1.4; v.path = null; g.selectVillager(v); g._tapPlot(p); }
});
await new Promise((r) => setTimeout(r, 3800));
await page.screenshot({ path: `${OUT}/35-planted.png` });

// 集市
await page.evaluate(() => window.__game.ui.openShop('seed'));
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: `${OUT}/36-shop.png` });
await page.evaluate(() => window.__game.ui.openShop('goods'));
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: `${OUT}/37-goods.png` });
await page.evaluate(() => window.__game.ui.closeSheet());

// 夜里
await page.evaluate(() => { const g = window.__game; g.sim.absHours = 20.5; g.selectVillager(g.sim.villagers[1]); });
await new Promise((r) => setTimeout(r, 900));
await page.screenshot({ path: `${OUT}/38-night.png` });

// 4 倍速跑一段，确认时间推进与村民作息
await page.evaluate(() => window.__game.setSpeed(4));
await new Promise((r) => setTimeout(r, 6000));
const state = await page.evaluate(() => {
  const s = window.__game.sim;
  return { clock: s.clockText, day: s.day, states: s.villagers.map((v) => [v.name, v.state, v.task?.type || v.action]), money: s.money, logs: s.logs.length };
});
await page.screenshot({ path: `${OUT}/39-later.png` });

await browser.close();
console.log(JSON.stringify({ errs, state }, null, 2));

