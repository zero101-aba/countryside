import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message));
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,500));
await page.evaluate(()=>window.__game.selectVillager(window.__game.sim.villagers[0]));
await new Promise(r=>setTimeout(r,300));
await page.evaluate(()=>document.querySelector('[data-cmd="plow"]').click());
await new Promise(r=>setTimeout(r,1200));
// 找一个屏幕内的草地
const target = await page.evaluate(()=>{
  const g=window.__game;
  const r=document.getElementById('game').getBoundingClientRect();
  for (const p of g.sim.world.plots) {
    if (p.state!=='grass') continue;
    const s=g.renderer.worldToScreen(p.x*24+12,p.y*24+12);
    if (s.x>20 && s.x<370 && s.y>20 && s.y<r.height-20) return {x:r.x+s.x, y:r.y+s.y, plot:[p.x,p.y]};
  }
  return null;
});
console.log('target', JSON.stringify(target));
await page.mouse.click(target.x, target.y);
await new Promise(r=>setTimeout(r,1800));
const state = await page.evaluate(()=>{ const g=window.__game; const v=g.sim.villagers[0]; return {mode:g.mode, task:v.task?.type, stage:v.task?.stage, follow:!!g.follow, plowed:g.sim.world.plots.filter(p=>p.state==='plowed').length, pos:[+v.x.toFixed(1),+v.y.toFixed(1)]}; });
console.log('state', JSON.stringify(state), 'errs', errs);
await page.screenshot({ path: 'tools/shots/70-click-work.png' });
await browser.close();

