import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message));
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,600));
const before = await page.evaluate(()=>{
  const g=window.__game, s=g.sim; g.setSpeed(0);
  s.villagers.forEach(v=>{ if(v.task){v.task=null;v.path=null;v.state='auto';} v.queue=[]; });
  for(let i=0;i<2;i++){const p=s.world.plots[i];p.state='plowed';p.crop='radish';p.growth=0.2;p.wetUntil=0;}
  g.runCommand('让阿福把1号地和2号地都浇了');
  g.save();
  const v=s.villagers.find(x=>x.id==='afu');
  return { queue:v.queue.length, task:v.task?.tx, saved: JSON.parse(localStorage.getItem('fanmian_town_save_v1')).villagers.find(x=>x.id==='afu').queue?.length };
});
await page.reload({ waitUntil: 'networkidle0' });
await new Promise(r=>setTimeout(r,700));
const after = await page.evaluate(()=>{
  const s=window.__game.sim, v=s.villagers.find(x=>x.id==='afu');
  return { queue:v.queue.length, task:v.task?.tx, wet:s.world.plots.slice(0,2).map(p=>s.isWet(p)) };
});
await page.evaluate(()=>{ const g=window.__game; g.setSpeed(1); for(let i=0;i<900;i++) g.sim.tick(1/60); });
const ran = await page.evaluate(()=>{
  const s=window.__game.sim, v=s.villagers.find(x=>x.id==='afu');
  return { queue:v.queue.length, task:!!v.task, wet:s.world.plots.slice(0,2).map(p=>s.isWet(p)) };
});
console.log(JSON.stringify({before, after, ran, errs}, null, 1));
await browser.close();
