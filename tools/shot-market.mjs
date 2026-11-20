import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:5180/', { waitUntil:'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await page.reload({waitUntil:'networkidle0'});
await new Promise(r=>setTimeout(r,700));
const out = await page.evaluate(()=>{
  const g=window.__game, s=g.sim; g.setSpeed(0); s.absHours=10; s.seeds={}; s.money=200;
  const yang=s.villagers.find(v=>v.id==='xiaoyang');
  s.villagers.forEach(v=>{ v.task=null; v.path=null; v.state='auto'; v.queue=[]; v.desire=null; });
  yang.x=28.5; yang.y=11.5;
  yang.desire={id:'buyseed',label:'去集市买种子',kind:'market',x:29.5,y:10.6,act:'buy',goods:'radish',hold:2.5,line:'种子不多了，去集市看看。'};
  for(let i=0;i<900 && !(s.getSeedCount()>0);i++) s.tick(1/60);
  for(let i=0;i<120;i++) s.tick(1/60); // 让气泡停一会
  g.follow=null; g.renderer.snapTo(29.5,10.6);
  return { seeds:s.getSeedCount(), money:s.money, bubble:yang.thought, log:s.logs.slice(-2).map(l=>l.text) };
});
await new Promise(r=>setTimeout(r,400));
await page.screenshot({ path:'shots/296-market-trade.png' });
console.log(JSON.stringify({out,errs},null,1));
await browser.close();
