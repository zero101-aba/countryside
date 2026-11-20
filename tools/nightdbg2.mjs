import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,500));
const d = await page.evaluate(()=>{
  const g=window.__game; const r=g.renderer;
  g.sim.absHours = 22.0;
  const orig = r._drawNight.bind(r);
  let info = null;
  r._drawNight = function(b){ const t = b.getTransform(); const a0 = b.globalAlpha; orig(b); info = { t: [t.a,t.d,t.e,t.f], a0, buf: [r.bufW, r.bufH], px: (()=>{ const p=b.getImageData(10,10,1,1).data; return [p[0],p[1],p[2]]; })() }; };
  r.render(0.016);
  const px = r.buf.getContext('2d').getImageData(10,10,1,1).data;
  return { info, px: [px[0],px[1],px[2]] };
});
console.log(JSON.stringify(d,null,1));
await browser.close();

