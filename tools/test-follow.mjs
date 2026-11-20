import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
await page.goto('http://localhost:5180/', { waitUntil:'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await page.reload({waitUntil:'networkidle0'});
await new Promise(r=>setTimeout(r,800));
const out = await page.evaluate(async ()=>{
  const g=window.__game, s=g.sim; g.setSpeed(1); s.absHours=10;
  const v=s.villagers[0];
  v.x=12; v.y=12; v.task=null; v.path=null; v.state='auto';
  g.selectVillager(v, false);
  await new Promise(r=>setTimeout(r,900));
  const chip=!document.getElementById('follow-chip').classList.contains('hidden');
  // 让人往东走
  v.x=20; v.y=12; v.task=null; v.path=null;
  await new Promise(r=>setTimeout(r,900));
  const cam={x:+g.renderer.cam.x.toFixed(1),y:+g.renderer.cam.y.toFixed(1)};
  // 点地图上的角色：不应打开面板
  const p=g.renderer.worldToScreen(v.x,v.y-0.5);
  g._tap(p.x,p.y);
  const sheetOpen=document.getElementById('sheet').classList.contains('open');
  return { chip, cam, vpos:[v.x,v.y], sheetOpen, followName:g.follow&&g.follow.name };
});
const assets = await page.evaluate(async ()=>{
  const a = await fetch('/sw.js'); const b = await fetch('/icons/icon-192.png'); const c = await fetch('/manifest.webmanifest');
  return { sw:a.status, icon:b.status, manifest:c.status, iconType:b.headers.get('content-type') };
});
await new Promise(r=>setTimeout(r,300));
await page.screenshot({ path:'shots/295-follow.png' });
console.log(JSON.stringify({out,assets,errs},null,1));
await browser.close();
