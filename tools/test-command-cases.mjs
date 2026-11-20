import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message));
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,600));
const run = (text) => page.evaluate((t)=>{
  const g=window.__game, s=g.sim;
  s.villagers.forEach(v=>{ if(v.task){v.task=null;v.path=null;v.state='auto';} v.queue=[]; });
  g.pendingCommand=null;
  g.runCommand(t);
  const last=[...document.querySelectorAll('#cmd-feed div')].slice(-4).map(d=>d.textContent);
  return { t, pending:!!g.pendingCommand, tasks:s.villagers.filter(v=>v.task).map(v=>`${v.name}:${v.task.type}@${v.task.tx},${v.task.ty}`), feed:last };
}, text);
await page.evaluate(()=>{
  const s=window.__game.sim;
  for(let i=0;i<6;i++){const p=s.world.plots[i];p.state='plowed';p.crop='radish';p.growth=0.9;p.wetUntil=0;}
  s.seeds={radish:20};
});
const a = await run('把西边那片干的地都浇了');
const b = await run('开垦五块地');
const c = await run('种十颗萝卜');
const d = await run('砍两棵树');
const e = await run('有熟的吗');
const f = await run('谁饿了');
console.log(JSON.stringify({a,b,c,d,e,f,errs}, null, 1));
await browser.close();
