import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,700));
await page.click('#btn-map');
await new Promise(r=>setTimeout(r,500));
const opened = await page.evaluate(()=>({ open:!document.getElementById('map-overlay').classList.contains('hidden'), current:document.getElementById('map-current').textContent }));
// 点击渔村快速前往
await page.click('.map-region[data-region="fishing"]');
await new Promise(r=>setTimeout(r,600));
const travel = await page.evaluate(()=>{ const g=window.__game,s=g.sim; return { closed:document.getElementById('map-overlay').classList.contains('hidden'), current:s.currentRegion, cam:[+g.renderer.cam.x.toFixed(1),+g.renderer.cam.y.toFixed(1)], hud:document.getElementById('hud-region').textContent }; });
await page.screenshot({ path: 'shots/192-fasttravel.png' });
console.log(JSON.stringify({opened, travel, errs}, null, 1));
await browser.close();
