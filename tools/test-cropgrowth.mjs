import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,500));
const out = await page.evaluate(() => {
  const s=window.__game.sim;
  const p=s.world.plots[0];
  p.state='plowed'; p.crop='radish'; p.growth=0; p.wetUntil=s.absHours+16;
  const rows=[];
  for (let i=0;i<3000;i++) {
    s.tick(1/60);
    if(i%500===0) rows.push({i, h:+s.hour.toFixed(2), growth:+(p.growth||0).toFixed(2), wet:s.isWet(p), crop:p.crop, state:p.state, ready:s.cropReady(p)});
  }
  rows.push({end:true, growth:+(p.growth||0).toFixed(2), crop:p.crop, state:p.state});
  return {rows, abs:+s.absHours.toFixed(1), season:s.season};
});
console.log(JSON.stringify(out,null,1));
await browser.close();
