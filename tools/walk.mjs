import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,400));
const frames = await page.evaluate(async () => {
  const g=window.__game, s=g.sim, v=s.villagers[0];
  g.selectVillager(v);
  v.x = 10.5; v.y = 13.5; v.path=null; v.task=null; v.state='auto';
  const r = v.issueOrder('plow', 10, 12);
  const out=[];
  for (let i=0;i<240;i++) { s.tick(1/60); if(i%20===0) out.push({i, st:v.state, stage:v.task?.stage, path:v.path?.length||0, idx:v.pathIndex, x:+v.x.toFixed(2), y:+v.y.toFixed(2), progress:+(v.task?.progress||0).toFixed(2)}); }
  return {r, out, plowed: s.world.plots.filter(p=>p.state==='plowed').length};
});
console.log(JSON.stringify(frames,null,1));
await browser.close();

