import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show');});
await new Promise(r=>setTimeout(r,600));
const d = await page.evaluate(() => {
  const g = window.__game; const r = g.renderer; const f = document.getElementById('game'); const x = f.getContext('2d');
  r.render(0.016);
  const bx = r.buf.getContext('2d');
  const bimg = bx.getImageData(0,0,r.buf.width,r.buf.height).data;
  let bmaxX=0,bmaxY=0,bminX=1e9,bminY=1e9;
  for(let py=0;py<r.buf.height;py++)for(let px=0;px<r.buf.width;px++){const a=bimg[(py*r.buf.width+px)*4+3]; if(a>5){if(px>bmaxX)bmaxX=px;if(py>bmaxY)bmaxY=py;if(px<bminX)bminX=px;if(py<bminY)bminY=py;}}
  // 用 createImageBitmap 或直接画到测试 canvas
  const t = document.createElement('canvas'); t.width=780;t.height=1284;
  const tx = t.getContext('2d'); tx.imageSmoothingEnabled=false;
  tx.drawImage(r.buf,0,0,r.bufW,r.bufH,0,0,780,1284);
  const timg = tx.getImageData(0,0,780,1284).data;
  let tmaxX=0,tmaxY=0;
  for(let py=0;py<1284;py+=4)for(let px=0;px<780;px+=4){if(timg[(py*780+px)*4+3]>10){if(px>tmaxX)tmaxX=px;if(py>tmaxY)tmaxY=py;}}
  return { buf: [r.buf.width, r.buf.height], bufBounds: {bminX,bminY,bmaxX,bmaxY}, testBounds: {tmaxX,tmaxY}, fw: f.width, fh: f.height };
});
console.log(JSON.stringify(d,null,2));
await browser.close();

