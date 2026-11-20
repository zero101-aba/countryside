import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.setContent('<body style="margin:0"><canvas id="c" style="width:390px;height:642px;display:block"></canvas></body>');
const d = await page.evaluate(() => {
  const c = document.getElementById('c');
  c.width = 780; c.height = 1284;
  const x = c.getContext('2d');
  x.fillStyle = '#0000ff';
  x.fillRect(0, 0, 780, 1284);
  const img = x.getImageData(0, 0, 780, 1284).data;
  let mx = 0, my = 0;
  for (let py = 0; py < 1284; py += 4) for (let px = 0; px < 780; px += 4) {
    const i = (py * 780 + px) * 4;
    if (img[i + 2] > 200) { if (px > mx) mx = px; if (py > my) my = py; }
  }
  return { mx, my, w: c.width, h: c.height };
});
console.log(JSON.stringify(d));
const el = await page.$('#c'); await el.screenshot({ path: 'tools/shots/blue.png' });
await browser.close();

