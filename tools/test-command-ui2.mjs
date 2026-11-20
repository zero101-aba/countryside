import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message));
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,600));
const state = await page.evaluate(()=>{
  const g=window.__game, s=g.sim; g.setSpeed(0);
  s.villagers.forEach(v=>{ if(v.task){v.task=null;v.path=null;v.state='auto';} v.queue=[]; });
  for(let i=0;i<4;i++){const p=s.world.plots[i];p.state='plowed';p.crop='radish';p.growth=0.2;p.wetUntil=0;}
  g.runCommand('让阿福和小满把西边的地都浇了');
  return { sheet:document.getElementById('sheet').classList.contains('open'), feed:[...document.querySelectorAll('#cmd-feed div')].map(d=>d.textContent),
    tasks:s.villagers.filter(v=>v.task).map(v=>`${v.name}:${v.task.type} q${v.queue.length}`) };
});
await new Promise(r=>setTimeout(r,500));
await page.screenshot({ path: 'shots/180-command.png' });
console.log(JSON.stringify({state, errs}, null, 1));
await browser.close();
