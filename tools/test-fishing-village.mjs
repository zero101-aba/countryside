import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,800));
const data = await page.evaluate(()=>{
  const g=window.__game, s=g.sim;
  return {
    villagers: s.villagers.map(v=>v.name),
    map:[s.world.w,s.world.h],
    ahai: (()=>{ const v=s.villagers.find(x=>x.id==='ahai'); return v?{home:v.home?.name,pos:[+v.x.toFixed(1),+v.y.toFixed(1)]}:null; })(),
    spots: s.world.fishSpots,
    house: !!s.world.buildingById('home_ahai'),
    start: s.startVillagerCount,
  };
});
// 镜头到渔村
await page.evaluate(()=>{ const g=window.__game; g.sim.absHours=10; g.sim.selected=null; g.follow=null; g.renderer.snapTo(21,37); });
await new Promise(r=>setTimeout(r,700));
await page.screenshot({ path: 'shots/160-fishing-village.png' });
// 阿海钓鱼
const fish = await page.evaluate(()=>{
  const g=window.__game, s=g.sim;
  const v=s.villagers.find(x=>x.id==='ahai');
  v.x=20.5; v.y=39.2; v.path=null; v.task=null; v.state='auto';
  g.selectVillager(v); g.ui.closeSheet();
  const r=v.issueOrder('fish', 0, 0);
  return { ok:r.ok, msg:r.msg, goal:v.task?.goal, spot:s.nearestFishSpot(v) };
});
await new Promise(r=>setTimeout(r,2500));
const fishState = await page.evaluate(()=>{ const s=window.__game.sim; const v=s.villagers.find(x=>x.id==='ahai'); return { state:v.state, stage:v.task?.stage, pos:[+v.x.toFixed(1),+v.y.toFixed(1)] }; });
await page.screenshot({ path: 'shots/161-ahai-fishing.png' });
console.log(JSON.stringify({data, fish, fishState, errs}, null, 1));
await browser.close();
