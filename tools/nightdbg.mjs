import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,500));
const d = await page.evaluate(()=>{
  const g=window.__game; const r=g.renderer;
  const orig = r._drawNight.bind(r);
  let calls = [];
  r._drawNight = function(b){ calls.push({hour:g.sim.hour, alphaBefore:b.globalAlpha}); orig(b); calls[calls.length-1].alphaAfter=b.globalAlpha; };
  g.sim.absHours = 22.0;
  r.render(0.016);
  const bx = r.buf.getContext('2d');
  const px = bx.getImageData(50, 150, 1, 1).data;
  return { calls, bufPx: [px[0],px[1],px[2]], size:[r.bufW,r.bufH], hour:g.sim.hour };
});
console.log(JSON.stringify(d,null,1));
await browser.close();

