import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.setContent('<canvas id="c" style="width:390px;height:642px;display:block;image-rendering:pixelated"></canvas>');
const d = await page.evaluate(() => {
  const c = document.getElementById('c');
  c.width = 780; c.height = 1284;
  const x = c.getContext('2d');
  const b = document.createElement('canvas'); b.width = 137; b.height = 226;
  const bx = b.getContext('2d'); bx.fillStyle='#f00'; bx.fillRect(0,0,137,226);
  const log = { cw: c.width, ch: c.height, t0: JSON.stringify(x.getTransform()) };
  x.drawImage(b, 0,0,137,226, 0,0,390.58, 644.31);
  log.t1 = JSON.stringify(x.getTransform());
  log.cw2 = c.width;
  // 直接填满
  x.fillStyle='#00f'; x.fillRect(0,0,780,1284);
  const img = x.getImageData(0,0,780,1284).data;
  let mx=0,my=0; for(let py=0;py<1284;py+=4)for(let px=0;px<780;px+=4){const i=(py*780+px)*4; if(img[i]>200){if(px>mx)mx=px;if(py>my)my=py;}}
  log.blueBounds = { mx, my };
  return log;
});
console.log(JSON.stringify(d, null, 2));
await browser.close();

