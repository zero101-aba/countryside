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
  const g=window.__game, s=g.sim; g.setSpeed(0);
  const snap = () => ({
    stage:s.stageIndex, flags:{...s.stageFlags},
    questHidden:document.getElementById('btn-quests').classList.contains('hidden'),
    speed8Hidden:document.querySelector('#speed-group [data-speed="8"]').classList.contains('hidden'),
    chipHidden:document.querySelector('#cmd-chips [data-cmd="收牧产"]').classList.contains('hidden'),
  });
  const steps=[];
  steps.push({at:'start', ...snap()});
  s.stats.harvested=1; s.checkAchievements(); s._stageCheck(); steps.push({at:'收获1', ...snap()});
  s.stats.planted=3; s._stageCheck(); steps.push({at:'播种3', ...snap()});
  s.stats.earned=150; s._stageCheck(); steps.push({at:'收入150', ...snap()});
  // 8× 现在应该能用
  g.setSpeed(8); steps.push({at:'8x', speed:g.speed});
  g.setSpeed(0);
  s.stats.harvested=10; s._stageCheck(); g.runCommand('去后山挖一块矿'); steps.push({at:'收获10挖矿', feed:[...document.querySelectorAll('#cmd-feed div')].slice(-2).map(d=>d.textContent)});
  s.stats.fish=5; s._stageCheck(); const fishPrice=s.itemPrice('fish');
  s.stats.mined=10; s._stageCheck(); const orePrice=s.itemPrice('ore');
  s.bond=60; s._stageCheck(); const aiAuto=s.stageFlags.aiAuto;
  s.unlockedRegions=new Set(['village','market','fishing','river','forest']); s._stageCheck();
  steps.push({at:'end', stage:s.stageIndex, fishPrice, orePrice, aiAuto, flags:{...s.stageFlags}});
  return { steps, card:document.getElementById('day-card').textContent };
});
await new Promise(r=>setTimeout(r,400));
await page.screenshot({ path:'shots/300-stage.png' });
console.log(JSON.stringify({out,errs},null,1));
await browser.close();
