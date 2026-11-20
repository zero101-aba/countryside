import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show');});
await page.evaluate(()=>{ const g=window.__game; g.selectVillager(g.sim.villagers[0]); });
await new Promise(r=>setTimeout(r,700));
// 关掉抽屉看世界
await page.evaluate(()=>{ document.getElementById('sheet').classList.remove('open'); document.body.classList.remove('sheet-open'); });
await new Promise(r=>setTimeout(r,700));
await page.screenshot({ path: 'tools/shots/20-view.png' });
const info = await page.evaluate(()=>{ const g=window.__game; return { scale: +g.renderer.scale.toFixed(2), buf:[g.renderer.bufW,g.renderer.bufH], cam:[+g.renderer.cam.x.toFixed(1),+g.renderer.cam.y.toFixed(1)] }; });
console.log(JSON.stringify({info, errs}));
await browser.close();

