import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,500));
const d1 = await page.evaluate(()=>{
  const g=window.__game;
  g.selectVillager(g.sim.villagers[0]);
  return { cam:[g.renderer.cam.x,g.renderer.cam.y], target:[g.renderer.camTarget.x,g.renderer.camTarget.y], follow:!!g.follow };
});
console.log('after select', JSON.stringify(d1));
const d2 = await page.evaluate(()=>{
  const g=window.__game;
  g.setMode('plow');
  g.renderer.focusOn(14,13);
  return { cam:[g.renderer.cam.x,g.renderer.cam.y], target:[g.renderer.camTarget.x,g.renderer.camTarget.y], follow:!!g.follow, mode:g.mode };
});
console.log('after mode+focus', JSON.stringify(d2));
await new Promise(r=>setTimeout(r,1500));
const d3 = await page.evaluate(()=>{
  const g=window.__game; const r=g.renderer;
  const s=r.worldToScreen(10.5*24,13.5*24);
  return { cam:[r.cam.x,r.cam.y], target:[r.camTarget.x,r.camTarget.y], s, cssW:r.cssW, scale:r.scale };
});
console.log('after 1.5s', JSON.stringify(d3));
await browser.close();

