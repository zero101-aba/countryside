import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,700));
await page.evaluate(()=>{
  const g=window.__game,s=g.sim; g.setSpeed(0); g.sim.absHours=10;
  const crops=['radish','turnip','carrot','strawberry','pumpkin'];
  const ps=s.world.plots;
  for(let i=0;i<ps.length;i++){
    const p=ps[i]; p.state='plowed'; p.wetUntil=s.absHours+6;
    if(i<10){ p.crop=crops[i%5]; p.growth=999; }
  }
  g.follow=null; g.renderer.snapTo(14,13);
});
await new Promise(r=>setTimeout(r,700));
await page.screenshot({ path: 'shots/212-crops.png' });
console.log(JSON.stringify({errs}));
await browser.close();

