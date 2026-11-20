import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,700));
const storm = await page.evaluate(()=>{
  const s=window.__game.sim;
  s.weather='storm';
  const tree=s.world.trees.find(t=>t.regrowAt<=s.absHours);
  const fish=s.validateOrder('fish',34,13);
  const chop=s.validateOrder('chop',tree.x,tree.y);
  return { fish, chop, weather:s.weather };
});
// 实际钓鱼进度
const fishing = await page.evaluate(()=>{
  const s=window.__game.sim;
  s.weather='sunny';
  const v=s.villagers.find(x=>x.id==='ahai');
  v.x=28.5; v.y=38.5; v.path=null; v.task=null; v.state='auto';
  const r=v.issueOrder('fish',0,0);
  for(let i=0;i<900 && !(s.dayStats.fish>0);i++) s.tick(1/60);
  return { ok:r.ok, fish:s.dayStats.fish, pos:[+v.x.toFixed(1),+v.y.toFixed(1)], stage:v.task?.stage };
});
// 新的一天：任务刷新、天气、雨天浇水
const newDay = await page.evaluate(()=>{
  const s=window.__game.sim;
  const oldQuests=s.quests.map(q=>q.title);
  s.absHours = (s.day)*24 + 7; // 跨到第二天 7 点，tick 触发
  s.tick(1/60);
  return { day:s.day, weather:s.weather, quests:s.quests.map(q=>q.title), changed: JSON.stringify(oldQuests)!==JSON.stringify(s.quests.map(q=>q.title)), wet:s.world.plots.filter(p=>s.isWet(p)).length, fishStat:s.dayStats.fish };
});
// 存读档
const saved = await page.evaluate(()=>{
  const s=window.__game.sim;
  s.weather='rain'; s.dayStats.fish=3;
  window.__game.save();
  return { weather:s.weather, quests:s.quests.length, fish:s.dayStats.fish };
});
await page.reload({ waitUntil: 'networkidle0' });
await new Promise(r=>setTimeout(r,700));
const loaded = await page.evaluate(()=>{
  const s=window.__game.sim;
  return { weather:s.weather, quests:s.quests.length, fish:s.dayStats.fish, questsDone:s.questsDone, villagers:s.villagers.length };
});
console.log(JSON.stringify({storm, fishing, newDay, saved, loaded, errs}, null, 1));
await browser.close();
