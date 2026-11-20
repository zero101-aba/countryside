import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
await page.goto('http://localhost:5180/', { waitUntil:'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await page.reload({waitUntil:'networkidle0'});
await new Promise(r=>setTimeout(r,800));
const out = await page.evaluate(()=>{
  const g=window.__game, s=g.sim; g.setSpeed(0); s.absHours=10;
  const yang=s.villagers.find(v=>v.id==='xiaoyang');
  const wei=s.villagers.find(v=>v.id==='xiaowei');
  s.villagers.forEach(v=>{ v.task=null; v.path=null; v.state='auto'; v.queue=[]; v.desire=null; });
  // 买种子
  s.seeds={}; s.money=200;
  yang.x=27.5; yang.y=11.5;
  yang.desire={id:'buyseed',label:'去集市买种子',kind:'market',x:29.5,y:10.6,act:'buy',goods:'radish',hold:2.5,line:'种子不多了。'};
  for(let i=0;i<2400 && !s.getSeedCount();i++) s.tick(1/60);
  const buy={ seeds:s.getSeedCount(), money:s.money, desire:yang.desire&&yang.desire.id };
  // 卖东西
  s.inventory={ wood:6, egg:4, bread:2 };
  const moneyBefore=s.money;
  wei.x=27.5; wei.y=11.5;
  wei.desire={id:'sellgoods',label:'去集市卖点东西',kind:'market',x:29.5,y:10.6,act:'sell',goods:'wood',hold:2.5,line:'换点钱。'};
  for(let i=0;i<2400 && (s.inventory.wood||0)>=6;i++) s.tick(1/60);
  const sell={ wood:s.inventory.wood, money:s.money, gain:s.money-moneyBefore, desire:wei.desire&&wei.desire.id };
  return { buy, sell };
});
// 自然触发：种子少 + 上午，观察是否会自己去买
const auto = await page.evaluate(()=>{
  const g=window.__game, s=g.sim; g.setSpeed(0); s.absHours=9; s.seeds={}; s.money=300;
  s.villagers.forEach(v=>{ v.task=null; v.path=null; v.state='auto'; v.queue=[]; v.desire=null; v.desireCd=0; });
  const seen=new Set();
  for(let i=0;i<6000;i++){ s.tick(1/60); for(const v of s.villagers) if(v.desire) seen.add(v.name+':'+v.desire.id); }
  return { seen:[...seen], seeds:s.getSeedCount(), money:s.money };
});
console.log(JSON.stringify({out,auto,errs},null,1));
await browser.close();
