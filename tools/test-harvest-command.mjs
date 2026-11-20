import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message));
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,600));
const out = await page.evaluate(()=>{
  const g=window.__game, s=g.sim; g.setSpeed(0);
  s.villagers.forEach(v=>{ if(v.task){v.task=null;v.path=null;v.state='auto';} v.queue=[]; });
  for(let i=0;i<3;i++){const p=s.world.plots[i];p.state='plowed';p.crop='radish';p.growth=9;p.wetUntil=s.absHours+5;}
  g.runCommand('有熟的吗');
  const q1=[...document.querySelectorAll('#cmd-feed div')].slice(-2).map(d=>d.textContent);
  g.runCommand('把熟的都收了');
  return { q1, tasks:s.villagers.filter(v=>v.task).map(v=>`${v.name}:${v.task.type}@${v.task.tx},${v.task.ty}`), feed:[...document.querySelectorAll('#cmd-feed div')].slice(-6).map(d=>d.textContent) };
});
console.log(JSON.stringify({out, errs}, null, 1));
await browser.close();

