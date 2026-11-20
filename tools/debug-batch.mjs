import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5180/', { waitUntil:'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await page.reload({waitUntil:'networkidle0'});
await new Promise(r=>setTimeout(r,700));
const start = await page.evaluate(()=>{
  const g=window.__game, s=g.sim;
  s.world.plots.slice(0,3).forEach(p=>{ p.state='plowed'; p.crop='radish'; p.growth=0.2; p.wetUntil=0; });
  g.runCommand('都去浇水');
  return { batches:[...s.batches.entries()], tasks:s.villagers.map(v=>({n:v.name,task:v.task&&{type:v.task.type,batch:v.task.batchId},queue:v.queue.map(q=>({type:q.type,batch:q.batchId}))})) };
});
console.log(JSON.stringify(start,null,1));
await browser.close();
