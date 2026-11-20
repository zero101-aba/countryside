import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,800));
const kinds = await page.evaluate(()=>{ const s=window.__game.sim; const k={}; for(const a of s.world.animals) k[a.kind]=(k[a.kind]||0)+1; return {k, total:s.world.animals.length}; });
// 让动物都产好
await page.evaluate(()=>{ const s=window.__game.sim; window.__game.setSpeed(0); for(const a of s.world.animals) if(a.product) a.ready=true; });
const shots = async (cam,name)=>{ await page.evaluate((c)=>{ const g=window.__game; g.follow=null; g.sim.absHours=10; g.renderer.snapTo(c[0],c[1]); }, cam); await new Promise(r=>setTimeout(r,600)); await page.screenshot({path:`shots/${name}.png`}); };
await shots([29,27],'240-pasture');
await shots([28,37],'241-waterbirds');
await shots([20,12],'242-pets');
// 收牧产
const collect = await page.evaluate(()=>{
  const g=window.__game, s=g.sim; g.setSpeed(0);
  s.villagers.forEach(v=>{ if(v.task){v.task=null;v.path=null;v.state='auto';} v.queue=[]; });
  const a=s.world.animals.find(x=>x.kind==='cow'&&x.ready);
  const v=s.villagers[0];
  v.x=a.x-1.2; v.y=a.y+0.5; v.path=null; v.task=null; v.state='auto';
  g.runCommand('挤奶');
  const started=s.villagers.filter(v=>v.task).map(v=>`${v.name}:${v.task.type}@${v.task.tx},${v.task.ty}`);
  for(let i=0;i<4200 && !(s.inventory.milk||s.inventory.egg||s.inventory.wool);i++) s.tick(1/60);
  return { started, inv:{...s.inventory}, feed:[...document.querySelectorAll('#cmd-feed div')].slice(-4).map(d=>d.textContent) };
});
console.log(JSON.stringify({kinds,collect,errs},null,1));
await browser.close();

