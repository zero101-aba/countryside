import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,500));
await page.evaluate(()=>window.__game.selectVillager(window.__game.sim.villagers[0]));
await new Promise(r=>setTimeout(r,300));
await page.evaluate(()=>document.querySelector('[data-cmd="plow"]').click());
await new Promise(r=>setTimeout(r,1400));
const pt = await page.evaluate(()=>{ const g=window.__game; const r=document.getElementById('game').getBoundingClientRect(); const s=g.renderer.worldToScreen(10.5,13.5); return {x:r.x+s.x,y:r.y+s.y}; });
await page.mouse.click(pt.x, pt.y);
for (const wait of [500, 1200, 2000]) {
  await new Promise(r=>setTimeout(r,wait));
  const d = await page.evaluate(()=>{
    const g=window.__game; const v=g.sim.villagers[0]; const bar=document.getElementById('tb-bar');
    return { task:v.task && {type:v.task.type, stage:v.task.stage, progress:+(v.task.progress||0).toFixed(2)}, mode:g.sim.pickMode, bar: bar.style.width, sub: document.getElementById('tb-sub').textContent };
  });
  console.log(wait, JSON.stringify(d));
}
await browser.close();

