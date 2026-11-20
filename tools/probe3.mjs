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
  const f = document.getElementById('game');
  const x = f.getContext('2d');
  const t = x.getTransform();
  // 找不透明像素边界
  const img = x.getImageData(0,0,f.width,f.height).data;
  let maxX=0, maxY=0, minX=1e9, minY=1e9;
  for (let py=0; py<f.height; py+=4) for (let px=0; px<f.width; px+=4) {
    const a = img[(py*f.width+px)*4+3];
    if (a>10) { if(px>maxX)maxX=px; if(py>maxY)maxY=py; if(px<minX)minX=px; if(py<minY)minY=py; }
  }
  return { bw: f.width, bh: f.height, bufW: r.bufW, bufH: r.bufH, scale: r.scale, transform: [t.a,t.b,t.c,t.d,t.e,t.f], bounds: {minX,minY,maxX,maxY}, cam: {x:r.cam.x,y:r.cam.y} };
});
console.log(JSON.stringify(d,null,2));
await browser.close();

