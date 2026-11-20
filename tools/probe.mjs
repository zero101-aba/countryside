import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const logs=[]; page.on('pageerror', e=>logs.push(e.message));
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await new Promise(r=>setTimeout(r,1200));
const d = await page.evaluate(() => {
  const g = window.__game; const c = document.getElementById('game');
  const stage = document.getElementById('stage');
  const cs = getComputedStyle(c);
  return {
    dpr: window.devicePixelRatio,
    canvasAttr: [c.width, c.height],
    canvasRect: [c.getBoundingClientRect().width, c.getBoundingClientRect().height],
    canvasComputed: [cs.width, cs.height],
    stageRect: [stage.getBoundingClientRect().width, stage.getBoundingClientRect().height],
    renderer: { scale: g.renderer.scale, bufW: g.renderer.bufW, bufH: g.renderer.bufH, cssW: g.renderer.cssW, cssH: g.renderer.cssH, dpr: g.renderer.dpr },
    appRect: (()=>{const r=document.getElementById('app').getBoundingClientRect();return [r.width,r.height];})(),
    inner: [innerWidth, innerHeight],
  };
});
console.log(JSON.stringify({d, logs}, null, 2));
await browser.close();

