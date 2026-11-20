import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:5180/', { waitUntil:'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await page.reload({waitUntil:'networkidle0'});
await new Promise(r=>setTimeout(r,900));
// 村民面板：性格 / 心愿 / 此刻
await page.evaluate(()=>{ const g=window.__game; g.setSpeed(0); g.sim.villagers[0].desire={id:'riverside',label:'去河边坐坐',kind:'spot',x:34.5,y:14.7,hold:6,line:'河边风不错，坐会儿。'}; g.selectVillager(g.sim.villagers[0], true); g.ui.refreshNow(); });
await new Promise(r=>setTimeout(r,600));
await page.screenshot({ path:'shots/280-desires.png' });
// 河边发呆实机
await page.evaluate(()=>{ const g=window.__game; g.ui.closeSheet(); g.setSpeed(1); g.sim.absHours=10; g.follow=g.sim.villagers[0]; });
await new Promise(r=>setTimeout(r,4500));
await page.evaluate(()=>{ const g=window.__game; g.renderer.snapTo(g.sim.villagers[0].x, g.sim.villagers[0].y+1); g.follow=null; });
await new Promise(r=>setTimeout(r,400));
await page.screenshot({ path:'shots/281-desire-river.png' });
console.log(JSON.stringify({errs}));
await browser.close();
