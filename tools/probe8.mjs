import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const logs=[]; page.on('console', m=>logs.push(m.text()));
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show');});
await new Promise(r=>setTimeout(r,500));
const d = await page.evaluate(() => {
  const g = window.__game; const r = g.renderer; const f = document.getElementById('game'); const x = f.getContext('2d');
  const out = [];
  const orig = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function(...a){
    if (this === x) {
      const t = this.getTransform();
      this.save(); this.setTransform(1,0,0,1,0,0); this.fillStyle='#00ffff';
      // 画一个探针像素在 (700,700)
      this.fillRect(700,700,10,10);
      const probe = this.getImageData(700,700,1,1).data[0];
      this.restore();
      out.push({ probe, args: a.slice(1), t:[t.a,t.d,t.e,t.f] });
    }
    return orig.apply(this,a);
  };
  r.render(0.016);
  CanvasRenderingContext2D.prototype.drawImage = orig;
  // 再单独检测一次
  x.save(); x.setTransform(1,0,0,1,0,0); x.fillStyle='#00ff00'; x.fillRect(0,0,4,4); x.restore();
  const corner = x.getImageData(0,0,1,1).data.join(',');
  const center = x.getImageData(700,700,1,1).data.join(',');
  return { out, corner, center, cw: f.width, ch: f.height };
});
console.log(JSON.stringify(d,null,2));
await browser.close();

