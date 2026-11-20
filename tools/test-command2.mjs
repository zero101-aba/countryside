import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message));
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,600));
const step = async (text) => page.evaluate((t)=>{
  const g=window.__game, s=g.sim;
  g.runCommand(t);
  return { text:t, pending:!!g.pendingCommand, feed:[...document.querySelectorAll('#cmd-feed div')].slice(-5).map(d=>d.textContent),
    tasks:s.villagers.filter(v=>v.task).map(v=>`${v.name}:${v.task.type}@${v.task.tx},${v.task.ty} q${v.queue.length}`) };
}, text);
await page.evaluate(()=>{ const s=window.__game.sim; window.__game.setSpeed(0); for(let i=0;i<4;i++){const p=s.world.plots[i];p.state='plowed';p.crop='radish';p.growth=0.2;p.wetUntil=0;} });
const a = await step('让阿福把三号地浇一下');
await page.evaluate(()=>window.__game.runCommand('都停下'));
const b = await step('把干的地都浇了');
await page.evaluate(()=>window.__game.runCommand('都停下'));
const c = await step('浇一下');
const d = await step('西边');
console.log(JSON.stringify({a,b,c,d,errs}, null, 1));
await browser.close();
