import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message));
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,700));
await page.evaluate(()=>{
  const g=window.__game, s=g.sim; g.setSpeed(0);
  for(let i=0;i<3;i++){const p=s.world.plots[i];p.state='plowed';p.crop='radish';p.growth=9;p.wetUntil=s.absHours+5;}
  g.runCommand('把熟的都收了');
});
await new Promise(r=>setTimeout(r,500));
const layout = await page.evaluate(()=>{
  const r=(sel)=>{const e=document.querySelector(sel);const b=e.getBoundingClientRect();return [Math.round(b.x),Math.round(b.y),Math.round(b.width),Math.round(b.height)];};
  return { bar:r('#commandbar'), feed:r('#cmd-feed'), roster:r('#roster'), stage:r('#stage'), input:r('#cmd-input') };
});
await page.screenshot({ path: 'shots/181-landscape-command.png' });
console.log(JSON.stringify({layout, errs}, null, 1));
await browser.close();
