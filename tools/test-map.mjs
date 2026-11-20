import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,800));
const base = await page.evaluate(()=>{
  const g=window.__game, s=g.sim;
  return { map:[s.world.w,s.world.h], regions:s.regions.map(r=>({id:r.id,name:r.name,unlocked:s.isRegionUnlocked(r.id),day:s.day,harvest:s.stats.harvested})), spots:s.world.fishSpots.length, rocks:s.world.rocks.length, gateBlock:s.world.block[s.world.idx(39,13)] };
});
await page.evaluate(()=>window.__game.ui.openMap());
await new Promise(r=>setTimeout(r,500));
await page.screenshot({ path: 'shots/190-map.png' });
const mapOpen = await page.evaluate(()=>({ open:!document.getElementById('map-overlay').classList.contains('hidden'), buttons:document.querySelectorAll('.map-region').length, locked:document.querySelectorAll('.map-region.locked').length }));
// 解锁后山
const unlock = await page.evaluate(()=>{
  const g=window.__game, s=g.sim; g.setSpeed(0);
  s.stats.harvested=10; s.checkRegionUnlocks();
  return { unlocked:s.isRegionUnlocked('forest'), gate:s.world.block[s.world.idx(39,13)], bridge:s.world.bridgeOpen, gateProp:s.world.props.filter(p=>p.type==='gate').length };
});
// 去后山
const region = await page.evaluate(()=>{
  const g=window.__game, s=g.sim;
  const r=s.regionById('forest'); g.fastTravel(r);
  return { current:s.currentRegion, cam:[+g.renderer.cam.x.toFixed(1),+g.renderer.cam.y.toFixed(1)] };
});
await new Promise(r=>setTimeout(r,600));
await page.screenshot({ path: 'shots/191-forest.png' });
// 挖矿命令
const mine = await page.evaluate(()=>{
  const g=window.__game, s=g.sim;
  g.setSpeed(0);
  s.villagers.forEach(v=>{ if(v.task){v.task=null;v.path=null;v.state='auto';} v.queue=[]; });
  g.runCommand('去后山挖两块矿');
  return { feed:[...document.querySelectorAll('#cmd-feed div')].slice(-5).map(d=>d.textContent), tasks:s.villagers.filter(v=>v.task).map(v=>`${v.name}:${v.task.type}@${v.task.tx},${v.task.ty}`) };
});
console.log(JSON.stringify({base,mapOpen,unlock,region,mine,errs}, null, 1));
await browser.close();
