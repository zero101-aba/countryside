import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const shoot = async (w,h,name,fn) => {
  const page = await browser.newPage();
  await page.setViewport({ width:w, height:h, deviceScaleFactor:2, isMobile:true, hasTouch:true });
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto('http://localhost:5180/', { waitUntil:'networkidle0' });
  await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
  await page.reload({waitUntil:'networkidle0'});
  await new Promise(r=>setTimeout(r,800));
  if (fn) { await page.evaluate(fn); await new Promise(r=>setTimeout(r,600)); }
  await page.screenshot({ path:`shots/${name}.png` });
  console.log(name, JSON.stringify(errs));
  await page.close();
};
await shoot(390,844,'260-ui-portrait', ()=>{ const g=window.__game; g.setSpeed(1); g.sim.absHours=10; g.follow=null; g.renderer.snapTo(18,10); });
await shoot(390,844,'261-ui-sheet', ()=>{ const g=window.__game; g.setSpeed(0); g.ui.openShop('seed'); });
await shoot(844,390,'262-ui-landscape', ()=>{ const g=window.__game; g.setSpeed(1); g.sim.absHours=10; g.follow=null; g.renderer.snapTo(18,10); });
await browser.close();
