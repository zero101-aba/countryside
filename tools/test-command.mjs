import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,700));
// 准备三块干地
const prep = await page.evaluate(()=>{
  const s=window.__game.sim; window.__game.setSpeed(0);
  const ps=s.world.plots;
  for (let i=0;i<3;i++){ const p=ps[i]; p.state='plowed'; p.crop='radish'; p.growth=0.1; p.wetUntil=0; }
  return ps.slice(0,3).map(p=>({x:p.x,y:p.y}));
});
const run = async (text) => page.evaluate((t)=>{ window.__game.runCommand(t); const s=window.__game.sim; return { tasks:s.villagers.filter(v=>v.task).map(v=>({name:v.name,type:v.task.type,tx:v.task.tx,ty:v.task.ty,stage:v.task.stage,queue:v.queue.length})), feed:[...document.querySelectorAll('#cmd-feed div')].slice(-6).map(d=>d.textContent), pending: !!window.__game.pendingCommand }; }, text);
const r1 = await run('让阿福把三号地浇一下');
await page.evaluate(()=>window.__game.runCommand('都停下'));
const r2 = await run('把干的地都浇了');
await page.evaluate(()=>window.__game.runCommand('都停下'));
const r3 = await run('浇一下');
const r4 = await run('全部');
await page.evaluate(()=>window.__game.runCommand('都停下'));
const r5 = await run('现在谁在干活');
const r6 = await run('让阿福去钓鱼');
await page.evaluate(()=>window.__game.runCommand('都停下'));
const r7 = await run('跟阿福聊聊');
console.log(JSON.stringify({prep,r1,r2,r3,r4,r5,r6,r7,errs}, null, 1));
await browser.close();
