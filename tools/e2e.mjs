// 真实交互端到端：点卡片 → 点指令 → 点地块 → 看执行 → 打开集市买种子
import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = process.env.URL || 'http://localhost:5180/';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(URL, { waitUntil: 'networkidle0' });
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('farm_tutorial_done', '1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise((r) => setTimeout(r, 500));

// 1) 点第一张村民卡片
const card = await page.$('.vcard');
await card.click();
await new Promise((r) => setTimeout(r, 500));
const s1 = await page.evaluate(() => ({ sheet: document.getElementById('sheet').classList.contains('open'), selected: !!window.__game.sim.selected }));

// 2) 点“开垦”
await page.click('[data-cmd="plow"]');
await new Promise((r) => setTimeout(r, 700));
const s2 = await page.evaluate(() => ({ mode: window.__game.mode, sheet: document.getElementById('sheet').classList.contains('open') }));

// 3) 点地图上一块可见的草地
const pt = await page.evaluate(() => {
  const g = window.__game; const r = document.getElementById('game').getBoundingClientRect();
  for (const p of g.sim.world.plots) {
    if (p.state !== 'grass') continue;
    const s = g.renderer.worldToScreen(p.x + 0.5, p.y + 0.5);
    if (s.x > 30 && s.x < 360 && s.y > 30 && s.y < r.height - 30) return { x: r.x + s.x, y: r.y + s.y, tile: [p.x, p.y] };
  }
  return null;
});
if (!pt) { console.log('no visible grass plot'); await browser.close(); process.exit(0); }
await page.mouse.click(pt.x, pt.y);
await new Promise((r) => setTimeout(r, 1200));
const s3 = await page.evaluate(() => {
  const g = window.__game, v = g.sim.villagers[0];
  return { task: v.task?.type, stage: v.task?.stage, follow: !!g.follow, banner: !document.getElementById('task-banner').classList.contains('hidden') };
});
// 4) 等它走到并开始干活
let prog = null;
for (let i = 0; i < 12; i++) {
  await new Promise((r) => setTimeout(r, 700));
  prog = await page.evaluate(() => { const v = window.__game.sim.villagers[0]; return { stage: v.task?.stage, p: +(v.task?.progress || 0).toFixed(2) }; });
  if (prog.p > 0.2) break;
}
// 5) 集市买种子
await page.evaluate(() => window.__game.ui.openShop('seed'));
await new Promise((r) => setTimeout(r, 500));
const before = await page.evaluate(() => ({ money: window.__game.sim.money, seeds: { ...window.__game.sim.seeds } }));
await page.evaluate(() => document.querySelector('#tab-body [data-buy="radish"]').click());
await new Promise((r) => setTimeout(r, 300));
const after = await page.evaluate(() => ({ money: window.__game.sim.money, seeds: { ...window.__game.sim.seeds } }));

await page.screenshot({ path: 'shots/07-e2e.png' });
await browser.close();
console.log(JSON.stringify({ s1, s2, pt: pt.tile, s3, prog, before, after, errs }, null, 1));

