import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show');});
await new Promise(r=>setTimeout(r,600));
// 持续把 buffer 拉伸铺满
await page.evaluate(() => {
  const g = window.__game; const f = document.getElementById('game'); const x = f.getContext('2d');
  const orig = g.renderer.render.bind(g.renderer);
  g.renderer.render = (dt) => { orig(dt); const b=g.renderer.buf; x.setTransform(1,0,0,1,0,0); x.imageSmoothingEnabled=false; x.drawImage(b,0,0,b.width,b.height,0,0,f.width,f.height); };
});
await new Promise(r=>setTimeout(r,500));
const el = await page.$('#game');
await el.screenshot({ path: 'tools/shots/canvas-stretch.png' });
console.log('ok');
await browser.close();

