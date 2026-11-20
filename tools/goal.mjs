import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,400));
const before = await page.evaluate(()=>({goal:document.getElementById('goal-text').textContent, harvested: window.__game.sim.stats.harvested}));
await page.evaluate(()=>{
  const g=window.__game, s=g.sim, v=s.villagers[0];
  const p = s.world.plots[14];
  p.state='plowed'; p.crop='turnip'; p.growth=14; p.wetUntil=s.absHours+6;
  v.x=p.x+0.5; v.y=p.y+1.5; v.path=null; v.task=null; v.state='auto';
  g.selectVillager(v); document.getElementById('sheet').classList.remove('open');
  v.issueOrder('harvest', p.x, p.y);
  g.audio.enabled=false;
  s.absHours=9;
});
await new Promise(r=>setTimeout(r,5000));
const after = await page.evaluate(()=>({goal:document.getElementById('goal-text').textContent, harvested: window.__game.sim.stats.harvested, money: window.__game.sim.money, logs: window.__game.sim.logs.slice(-3).map(l=>l.text)}));
console.log(JSON.stringify({before, after}, null, 1));
await browser.close();

