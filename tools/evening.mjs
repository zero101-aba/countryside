import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,500));
const d = await page.evaluate(()=>{
  const g=window.__game, s=g.sim;
  s.absHours = 22.5;
  for (let i=0;i<300;i++) s.tick(1/60);
  return s.villagers.map(v=>[v.name, v.state, v.task?.type||null, Math.round(v.x), Math.round(v.y)]);
});
console.log(JSON.stringify(d));
await browser.close();

