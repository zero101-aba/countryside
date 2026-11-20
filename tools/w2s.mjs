import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await new Promise(r=>setTimeout(r,500));
const d = await page.evaluate(()=>{
  const g=window.__game, r=g.renderer, c=document.getElementById('game');
  return { cssW:r.cssW, cssH:r.cssH, scale:r.scale, bufW:r.bufW, bufH:r.bufH, cam:[r.cam.x,r.cam.y], cw:c.width, ch:c.height, rect:[c.getBoundingClientRect().width, c.getBoundingClientRect().height], w2s: r.worldToScreen(10.5,13.5), wx: r.cam.x + (10.5 - r.cam.x)*r.scale, manual: { x: (10.5-r.cam.x)*r.scale + r.cssW/2, y:(13.5-r.cam.y)*r.scale + r.cssH/2 } };
});
console.log(JSON.stringify(d,null,1));
await browser.close();

