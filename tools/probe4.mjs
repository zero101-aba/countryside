import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show');});
await new Promise(r=>setTimeout(r,600));
const d = await page.evaluate(() => {
  const g = window.__game; const r = g.renderer;
  const out = [];
  const orig = CanvasRenderingContext2D.prototype.drawImage;
  let calls = [];
  CanvasRenderingContext2D.prototype.drawImage = function(...a){ calls.push({this: this.canvas.id || this.canvas.className || this.canvas.width+'x'+this.canvas.height, args: a.map(v=>typeof v==='number'?Math.round(v*100)/100:v)}); return orig.apply(this,a); };
  r.render(0.016);
  CanvasRenderingContext2D.prototype.drawImage = orig;
  const mine = calls[calls.length-1];
  // 手动填充测试
  const f = document.getElementById('game'); const x = f.getContext('2d');
  const bufImg = r.buf;
  x.setTransform(1,0,0,1,0,0); x.imageSmoothingEnabled=false;
  x.drawImage(bufImg, 0,0, bufImg.width,bufImg.height, 0,0, f.width, f.height);
  const img = x.getImageData(0,0,f.width,f.height).data;
  let maxX=0,maxY=0;
  for (let py=0; py<f.height; py+=4) for (let px=0; px<f.width; px+=4) { if (img[(py*f.width+px)*4+3]>10) { if(px>maxX)maxX=px; if(py>maxY)maxY=py; } }
  return { buf: [bufImg.width,bufImg.height], calls: calls.slice(-4), manualBounds: {maxX,maxY}, cssW: r.cssW, cssH: r.cssH, scale: r.scale };
});
console.log(JSON.stringify(d,null,2));
await browser.close();

