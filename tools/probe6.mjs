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
  const info = [];
  const origDraw = x.drawImage.bind(x);
  x.drawImage = function(...a){
    const t = x.getTransform();
    info.push({ canvas: f.width+'x'+f.height, args: a.slice(1).map(v=>typeof v==='number'?+v.toFixed(2):v), transform:[t.a,t.d,t.e,t.f] });
    return origDraw(...a);
  };
  r.render(0.016);
  x.drawImage = origDraw;
  const last = info[info.length-1];
  // 检查 canvas bitmap 尺寸之后是否有别的绘制
  return { last, count: info.length, visible: f.getBoundingClientRect().width };
});
console.log(JSON.stringify(d,null,2));
await browser.close();

