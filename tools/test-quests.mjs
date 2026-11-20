import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,700));
const base = await page.evaluate(()=>{
  const s=window.__game.sim;
  return { quests: s.quests.map(q=>({title:q.title, need:q.need, reward:q.reward, type:q.type})), weather: s.weather, buttons: document.querySelectorAll('#toolbar button').length };
});
// 打开委托面板
await page.evaluate(()=>window.__game.ui.openQuests());
await new Promise(r=>setTimeout(r,500));
await page.screenshot({ path: 'shots/150-quests.png' });
// 伪造进度并领取
const claim = await page.evaluate(()=>{
  const s=window.__game.sim;
  s.dayStats.harvest[s.quests[0].key] = s.quests[0].need;
  s.dayStats.fish = s.quests[1].need;
  s.dayStats.water = 50; s.dayStats.wood = 50; s.dayStats.forage = 50; s.dayStats.chat = 50;
  window.__game.ui.openQuests();
  return { moneyBefore: s.money, ready: s.claimableQuests };
});
await new Promise(r=>setTimeout(r,400));
await page.click('[data-claim]');
await new Promise(r=>setTimeout(r,400));
const afterClaim = await page.evaluate(()=>{
  const s=window.__game.sim;
  return { money: s.money, questsDone: s.questsDone, claimed: s.quests.filter(q=>q.claimed).length, logs: s.logs.slice(-3).map(l=>l.text) };
});
await page.evaluate(()=>window.__game.ui.closeSheet());
// 雨天测试
await page.evaluate(()=>{
  const g=window.__game, s=g.sim;
  s.weather='rain';
  for (const p of s.world.plots) p.wetUntil=0;
  s.onNewDay(s.day + 1); // 会重新 roll，改为直接设回 rain 并测试浇湿
  s.weather='rain';
  for (let i=0;i<10;i++) s.tick(1/60);
  g.renderer.snapTo(15,12); g.follow=null;
});
await new Promise(r=>setTimeout(r,700));
const rain = await page.evaluate(()=>{
  const s=window.__game.sim;
  return { weather: s.weather, wet: s.world.plots.filter(p=>s.isWet(p)).length, plots: s.world.plots.length, hud: document.getElementById('hud-weather').textContent };
});
await page.screenshot({ path: 'shots/151-rain.png' });
console.log(JSON.stringify({base, claim, afterClaim, rain, errs}, null, 1));
await browser.close();
