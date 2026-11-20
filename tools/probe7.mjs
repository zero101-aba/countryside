import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show');});
await new Promise(r=>setTimeout(r,500));
const res = await page.evaluate(() => {
  const f = document.getElementById('game'); const x = f.getContext('2d');
  x.setTransform(1,0,0,1,0,0); x.fillStyle='#ff00ff'; x.fillRect(0,0,f.width,f.height);
  const img = x.getImageData(0,0,f.width,f.height).data;
  let maxX=0,maxY=0;
  for (let py=0;py<f.height;py+=4) for (let px=0;px<f.width;px+=4) if (img[(py*f.width+px)*4]>200) { maxX=Math.max(maxX,px); maxY=Math.max(maxY,py); }
  return { maxX, maxY, w: f.width, h: f.height, isWebgl: !!f.getContext('webgl') };
});
console.log(JSON.stringify(res));
const el = await page.$('#game'); await el.screenshot({ path: 'tools/shots/canvas-fill.png' });
await browser.close();

