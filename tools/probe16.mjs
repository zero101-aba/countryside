import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.setContent('<canvas id="c" style="width:390px;height:642px;display:block"></canvas>');
const d = await page.evaluate(() => {
  const c = document.getElementById('c'); c.width = 780; c.height = 1284;
  const x = c.getContext('2d');
  const b = document.createElement('canvas'); b.width = 137; b.height = 226;
  const bx = b.getContext('2d'); bx.fillStyle='#f00'; bx.fillRect(0,0,137,226);
  x.drawImage(b, 0,0,137,226, 0,0,390.58, 644.31);
  const img = x.getImageData(0, 0, 780, 1284).data;
  const rows = {};
  for (const py of [0, 100, 300, 600, 641, 642, 643, 700, 1280]) {
    let mx = -1;
    for (let px = 779; px >= 0; px--) { const i = (py*780+px)*4; if (img[i] > 100) { mx = px; break; } }
    rows['y'+py] = mx;
  }
  // 也检查像素总数
  let cnt = 0; for (let i=0;i<img.length;i+=4) if (img[i]>100) cnt++;
  return { rows, count: cnt, expect: 390*642 };
});
console.log(JSON.stringify(d,null,2));
await browser.close();

