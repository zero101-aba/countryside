import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const sizes = [[360,640,'small'],[390,844,'phone'],[430,932,'big'],[820,1180,'tablet']];
for (const [w,h,name] of sizes) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errs=[]; page.on('pageerror', e=>errs.push(e.message));
  await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
  await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
  await page.evaluate(()=>{ const g=window.__game; g.selectVillager(g.sim.villagers[0]); });
  await new Promise(r=>setTimeout(r,900));
  await page.screenshot({ path: `tools/shots/50-${name}.png`, fullPage: false });
  const info = await page.evaluate(()=>{ const g=window.__game; const stage=document.getElementById('stage').getBoundingClientRect(); return { stage:[Math.round(stage.width),Math.round(stage.height)], scale:+g.renderer.scale.toFixed(2), overflow: document.documentElement.scrollHeight > window.innerHeight }; });
  console.log(name, JSON.stringify(info), errs.length?errs:'ok');
  await page.close();
}
await browser.close();

