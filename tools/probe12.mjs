import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show');});
await new Promise(r=>setTimeout(r,600));
const d = await page.evaluate(() => {
  const f = document.getElementById('game');
  const log = [];
  const desc = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width');
  Object.defineProperty(f, 'width', { get(){ return desc.get.call(this); }, set(v){ log.push({set:'width', v, stack: new Error().stack.split('\n').slice(1,4).join(' | ')}); desc.set.call(this, v); }, configurable: true });
  const descH = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'height');
  Object.defineProperty(f, 'height', { get(){ return descH.get.call(this); }, set(v){ log.push({set:'height', v, stack: new Error().stack.split('\n').slice(1,4).join(' | ')}); descH.set.call(this, v); }, configurable: true });
  window.__game.renderer.resize();
  return { log, after: {w: f.width, h: f.height} };
});
console.log(JSON.stringify(d,null,2));
await browser.close();

