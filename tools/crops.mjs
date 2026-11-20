// 作物阶段 + 干活动作 展示图
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
await page.goto(URL, { waitUntil: 'networkidle0' });
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('farm_tutorial_done', '1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise((r) => setTimeout(r, 500));

const setup = await page.evaluate(() => {
  const g = window.__game, s = g.sim, v = s.villagers[0];
  const P = (i) => s.world.plots[i];
  const defs = [
    [P(0), 'radish', 0.15], [P(2), 'radish', 0.5], [P(4), 'turnip', 0.85], [P(6), 'pumpkin', 1],
    [P(8), 'strawberry', 1], [P(10), 'carrot', 0.65], [P(12), 'radish', 0.3], [P(14), 'turnip', 1],
  ];
  for (const [p, crop, frac] of defs) {
    if (!p) continue;
    p.state = 'plowed'; p.crop = crop;
    p.growth = frac * (crop === 'pumpkin' ? 46 : crop === 'strawberry' ? 30 : crop === 'carrot' ? 20 : crop === 'turnip' ? 14 : 8);
    p.wetUntil = s.absHours + 10;
  }
  const p3 = P(14); // 已成熟
  v.x = p3.x + 0.5; v.y = p3.y + 1.5; v.path = null; v.task = null; v.state = 'auto';
  g.selectVillager(v);
  document.getElementById('sheet').classList.remove('open');
  document.body.classList.remove('sheet-open');
  g.renderer.snapTo(12.5, 12.5);
  g.follow = null;
  const res = v.issueOrder('harvest', p3.x, p3.y);
  return { res, plots: defs.filter(([p]) => p).map(([p, c, f]) => [p.x, p.y, c, f]) };
});
await new Promise((r) => setTimeout(r, 1400));
await page.screenshot({ path: `${OUT}/04-crops.png` });
await new Promise((r) => setTimeout(r, 1600));
await page.screenshot({ path: `${OUT}/04b-harvest.png` });
const st = await page.evaluate(() => { const v = window.__game.sim.villagers[0]; return { stage: v.task?.stage, p: +(v.task?.progress || 0).toFixed(2), logs: window.__game.sim.logs.slice(-3).map(l => l.text) }; });
await browser.close();
console.log(JSON.stringify({ setup, st, errs }, null, 1));


