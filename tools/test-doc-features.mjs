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
const out = await page.evaluate(()=>{
  const g=window.__game, s=g.sim; g.setSpeed(0);
  // 成就
  s.stats.harvested=12; s.stats.mined=21; s.stats.collected=21; s.stats.fish=20; s.stats.earned=1200; s.money=1200;
  s.stats.planted=30; s.stats.wood=50; s.questsDone=10;
  s.checkAchievements();
  const ach=Object.keys(s.achievements);
  // 批量：多块干地
  s.villagers.forEach(v=>{ if(v.task){v.task=null;v.path=null;v.state='auto';} v.queue=[]; });
  s.world.plots.slice(0,3).forEach(p=>{ p.state='plowed'; p.crop='radish'; p.growth=0.2; p.wetUntil=0; });
  g.runCommand('都去浇水');
  const batchSize=s.batches.size;
  for(let i=0;i<3600 && s.batches.size>0;i++) s.tick(1/60);
  const feed=[...document.querySelectorAll('#cmd-feed div')].map(d=>d.textContent).slice(-6);
  // 关系里程碑
  s.bond=60; s._bondTick();
  const bonded=!!s.bondMilestones[60];
  // 主动建议
  s._adviceT=0; s.world.plots.slice(0,2).forEach(p=>{p.crop='radish';p.wetUntil=0;});
  s._adviceTick(1/60);
  const advice=[...document.querySelectorAll('#cmd-feed div')].map(d=>d.textContent).slice(-3);
  return { ach, batchSize, feed, bonded, advice, batchesLeft:s.batches.size };
});
await new Promise(r=>setTimeout(r,400));
await page.screenshot({ path:'shots/290-achievements.png' });
console.log(JSON.stringify({out,errs},null,1));
await browser.close();
