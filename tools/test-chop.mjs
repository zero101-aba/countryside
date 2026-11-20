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
  const s=window.__game.sim;
  // 清掉自动钓鱼
  s.villagers.forEach(v=>{ if(v.task?.type==='fish'){ v.task=null; v.path=null; v.state='auto'; } });
  const tree=s.world.trees.find(t=>t.regrowAt<=s.absHours);
  s.weather='storm';
  const fishStorm=s.validateOrder('fish',34,13);
  const chopStorm=s.validateOrder('chop',tree.x,tree.y);
  s.weather='sunny';
  const chopSun=s.validateOrder('chop',tree.x,tree.y);
  const v=s.villagers.find(v=>v.id==='afu');
  v.x=tree.x-1.2; v.y=tree.y+0.5; v.path=null; v.task=null; v.state='auto';
  const order=v.issueOrder('chop',tree.x,tree.y);
  return { fishStorm, chopStorm, chopSun, order, task:v.task?.type, stage:v.task?.stage };
});
console.log(JSON.stringify({out, errs}, null, 1));
await browser.close();
