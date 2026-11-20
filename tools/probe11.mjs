import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show');});
await new Promise(r=>setTimeout(r,600));
const d = await page.evaluate(() => {
  const g = window.__game; const r = g.renderer; const f = document.getElementById('game'); const x = f.getContext('2d');
  const before = { dpr: window.devicePixelRatio, cw: f.width, ch: f.height, cssW: r.cssW, cssH: r.cssH, scale: r.scale, bufW: r.bufW, bufH: r.bufH };
  const orig = CanvasRenderingContext2D.prototype.drawImage;
  let cap=null;
  CanvasRenderingContext2D.prototype.drawImage = function(...a){ if(this===x&&!cap){ const t=this.getTransform(); cap={args:a.slice(1), t:[t.a,t.b,t.c,t.d,t.e,t.f], cw:f.width, ch:f.height}; } return orig.apply(this,a); };
  r.render(0.016);
  CanvasRenderingContext2D.prototype.drawImage = orig;
  const img = x.getImageData(0,0,f.width,f.height).data;
  let mx=0,my=0; for(let py=0;py<f.height;py+=4)for(let px=0;px<f.width;px+=4){if(img[(py*f.width+px)*4+3]>10){if(px>mx)mx=px;if(py>my)my=py;}}
  return { before, cap, bounds:{mx,my} };
});
console.log(JSON.stringify(d,null,2));
const el = await page.$('#game'); await el.screenshot({ path: 'tools/shots/dpr1.png' });
await browser.close();

