import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show');});
await new Promise(r=>setTimeout(r,800));
const el = await page.$('#game');
await el.screenshot({ path: 'tools/shots/canvas.png' });
const px = await page.evaluate(() => {
  const c = document.getElementById('game');
  const x = c.getContext('2d');
  const pts = [];
  for (const [px, py] of [[100,100],[400,100],[700,100],[100,600],[400,600],[700,600],[780-10,1284-10]]) {
    const d = x.getImageData(px, py, 1, 1).data;
    pts.push({px, py, rgba: [d[0],d[1],d[2],d[3]]});
  }
  return { pts, bw: c.width, bh: c.height };
});
console.log(JSON.stringify(px,null,2));
await browser.close();

