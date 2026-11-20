import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,600));
await page.evaluate(()=>{ const g=window.__game; g.sim.absHours = 22.0; g.renderer.snapTo(17,11); g.follow=null; });
await new Promise(r=>setTimeout(r,800));
const px = await page.evaluate(()=>{
  const g=window.__game; const c=document.getElementById('game'); const x=c.getContext('2d');
  const pts=[]; for (const [a,b] of [[100,300],[300,500],[200,650]]) { const d=x.getImageData(a,b,1,1).data; pts.push([d[0],d[1],d[2]]); }
  return { pts, hour: g.sim.hour, night: g.sim.isNight, globalAlpha: g.renderer.bctx.globalAlpha };
});
console.log(JSON.stringify(px));
await page.screenshot({ path: 'shots/06-night.png' });
await browser.close();

