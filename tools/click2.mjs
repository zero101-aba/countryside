import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,500));
await page.evaluate(()=>{ const g=window.__game; g.selectVillager(g.sim.villagers[0]); g.setMode('plow'); g.renderer.focusOn(14,13); });
await new Promise(r=>setTimeout(r,1600));
const info = await page.evaluate(()=>{
  const g=window.__game; const r=document.getElementById('game').getBoundingClientRect();
  const cam = g.renderer.cam, s=g.renderer.scale;
  const list = g.sim.world.plots.slice(0,6).map(p=>({p:[p.x,p.y], st:p.state, s:g.renderer.worldToScreen(p.x*24+12,p.y*24+12)}));
  return {cam:[+cam.x.toFixed(1),+cam.y.toFixed(1)], scale:+s.toFixed(2), rect:[r.x,r.y,r.width,r.height], list};
});
console.log(JSON.stringify(info,null,1));
await page.screenshot({ path: 'tools/shots/71-mode.png' });
await browser.close();

