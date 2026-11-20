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
  const g=window.__game, s=g.sim; g.setSpeed(0); s.absHours=9; s.money=20; s.inventory={ wood:10, egg:4 };
  s.villagers.forEach(v=>{ v.task=null; v.path=null; v.state='auto'; v.queue=[]; v.desire=null; v.desireCd=0; });
  const seen=[]; const m0=s.money;
  for(let i=0;i<8000;i++){ s.tick(1/60); for(const v of s.villagers) if(v.desire && seen[seen.length-1]!==v.name+':'+v.desire.id) seen.push(v.name+':'+v.desire.id); }
  return { seen, money:s.money, gain:s.money-m0, inv:{wood:s.inventory.wood,egg:s.inventory.egg} };
});
console.log(JSON.stringify({out,errs},null,1));
await browser.close();
