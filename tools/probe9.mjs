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
  // 手动调用一次 render，前后打印
  const before = { cw: f.width, ch: f.height, bufW: r.bufW, bufH: r.bufH, scale: r.scale, buf: [r.buf.width, r.buf.height] };
  const orig = CanvasRenderingContext2D.prototype.drawImage;
  let captured = null;
  CanvasRenderingContext2D.prototype.drawImage = function(...a){ if (this===x && !captured) captured = { cw: f.width, ch: f.height, args: a.slice(1).map(v=>typeof v==='number'?+v.toFixed(1):v) }; return orig.apply(this,a); };
  r.render(0.016);
  CanvasRenderingContext2D.prototype.drawImage = orig;
  const bounds = (()=>{ const img = x.getImageData(0,0,f.width,f.height).data; let mx=0,my=0; for(let py=0;py<f.height;py+=8)for(let px=0;px<f.width;px+=8){ if(img[(py*f.width+px)*4+3]>10){if(px>mx)mx=px;if(py>my)my=py;} } return {mx,my}; })();
  return { before, captured, after: { cw: f.width, ch: f.height }, bounds };
});
console.log(JSON.stringify(d,null,2));
await browser.close();

