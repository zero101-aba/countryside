// 功能测试：核心闭环（开垦→播种→浇水→生长→收获）+ 截图
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = process.env.URL || 'http://localhost:5180/';
const OUT = 'tools/shots';
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: EDGE, headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--lang=zh-CN'],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error') logs.push(`[console] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 20000 });
await page.evaluate(() => { localStorage.setItem('farm_tutorial_done', '1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise((r) => setTimeout(r, 700));

const result = {};

// 0. 画布铺满检查
result.canvasFill = await page.evaluate(() => {
  const c = document.getElementById('game'); const x = c.getContext('2d');
  const img = x.getImageData(0, 0, c.width, c.height).data;
  let mx = 0, my = 0;
  for (let py = 0; py < c.height; py += 8) for (let px = 0; px < c.width; px += 8) {
    if (img[(py * c.width + px) * 4 + 3] > 10) { if (px > mx) mx = px; if (py > my) my = py; }
  }
  return { mx, my, w: c.width, h: c.height, ok: mx > c.width - 6 && my > c.height - 6 };
});

// 1. 选中阿福，传送到田边并开垦
result.step1 = await page.evaluate(async () => {
  const g = window.__game; const sim = g.sim;
  const v = sim.villagers[0];
  const plot = sim.world.plots.find((p) => p.state === 'grass');
  // 传送到地块上方一格（应当是田埂/草地）
  v.x = plot.x + 0.5; v.y = plot.y - 0.4;
  v.path = null; v.task = null; v.state = 'auto';
  g.selectVillager(v);
  const res = v.issueOrder('plow', plot.x, plot.y);
  return { ok: res.ok, msg: res.msg, plot: [plot.x, plot.y], state: v.state };
});
await new Promise((r) => setTimeout(r, 2500));
result.afterPlow = await page.evaluate(() => {
  const sim = window.__game.sim;
  const v = sim.villagers[0];
  return {
    plowed: sim.world.plots.filter((p) => p.state === 'plowed').length,
    task: v.task ? { type: v.task.type, stage: v.task.stage, progress: +(v.task.progress || 0).toFixed(2) } : null,
    logs: sim.logs.slice(-3).map((l) => l.text),
  };
});
await page.screenshot({ path: `${OUT}/10-plowed.png` });

// 2. 播种 + 浇水
result.step2 = await page.evaluate(async () => {
  const g = window.__game; const sim = g.sim;
  const v = sim.villagers[0];
  const plot = sim.world.plots.find((p) => p.state === 'plowed');
  v.x = plot.x + 0.5; v.y = plot.y - 0.4; v.path = null;
  const r1 = v.issueOrder('plant', plot.x, plot.y);
  return { plot: [plot.x, plot.y], r1 };
});
await new Promise((r) => setTimeout(r, 3000));
result.step3 = await page.evaluate(async () => {
  const g = window.__game; const sim = g.sim;
  const v = sim.villagers[0];
  const plot = sim.world.plots.find((p) => p.crop);
  if (!plot) return { none: true };
  v.x = plot.x + 0.5; v.y = plot.y - 0.4; v.path = null;
  const r = v.issueOrder('water', plot.x, plot.y);
  return { crop: plot.crop, r };
});
await new Promise((r) => setTimeout(r, 2500));
result.afterWater = await page.evaluate(() => {
  const sim = window.__game.sim;
  const p = sim.world.plots.find((x) => x.crop);
  return p ? { crop: p.crop, wet: sim.isWet(p), progress: +sim.cropProgress(p).toFixed(2) } : null;
});
await page.screenshot({ path: `${OUT}/11-planted.png` });

// 3. 加速让作物成熟，再收获
await page.evaluate(() => window.__game.setSpeed(4));
await new Promise((r) => setTimeout(r, 9000));
result.growth = await page.evaluate(() => {
  const sim = window.__game.sim;
  const p = sim.world.plots.find((x) => x.crop);
  return p ? { crop: p.crop, progress: +sim.cropProgress(p).toFixed(2), ready: sim.cropReady(p), wet: sim.isWet(p) } : null;
});
result.step4 = await page.evaluate(async () => {
  const g = window.__game; const sim = g.sim;
  const v = sim.villagers[0];
  const plot = sim.world.plots.find((p) => sim.cropReady(p));
  if (!plot) return { none: true, progress: sim.world.plots.filter(p=>p.crop).map(p=>+sim.cropProgress(p).toFixed(2)) };
  v.x = plot.x + 0.5; v.y = plot.y - 0.4; v.path = null;
  const before = sim.money;
  const r = v.issueOrder('harvest', plot.x, plot.y);
  return { ok: r.ok, before, plot: [plot.x, plot.y] };
});
await new Promise((r) => setTimeout(r, 3500));
result.afterHarvest = await page.evaluate(() => {
  const sim = window.__game.sim;
  return { money: sim.money, harvested: sim.stats.harvested, latest: sim.logs.slice(-4).map((l) => l.text) };
});
await page.screenshot({ path: `${OUT}/12-harvest.png` });

// 4. 打开集市
await page.evaluate(() => { window.__game.setSpeed(1); window.__game.ui.openShop('seed'); });
await new Promise((r) => setTimeout(r, 600));
await page.screenshot({ path: `${OUT}/13-shop.png` });
await page.evaluate(() => window.__game.ui.closeSheet());

// 5. 村民卡片与指令簿
await page.evaluate(() => window.__game.selectVillager(window.__game.sim.villagers[1]));
await new Promise((r) => setTimeout(r, 700));
await page.screenshot({ path: `${OUT}/14-villager.png` });

await browser.close();
console.log(JSON.stringify({ result, logs }, null, 2));

