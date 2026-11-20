import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message));
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,600));
const badge = await page.evaluate(()=>{
  const s=window.__game.sim;
  s.dayStats.harvest[s.quests[0].key]=99; s.dayStats.fish=99; s.dayStats.water=99; s.dayStats.wood=99; s.dayStats.forage=99; s.dayStats.chat=99;
  window.__game.ui.refreshNow();
  const b=document.getElementById('btn-quests');
  return { ready:s.claimableQuests, cls:b.className, badge:b.dataset.badge, after:getComputedStyle(b,'::after').content };
});
await new Promise(r=>setTimeout(r,400));
const badge2 = await page.evaluate(()=>{ const b=document.getElementById('btn-quests'); return { cls:b.className, badge:b.dataset.badge }; });
// 板子点击
const board = await page.evaluate(()=>{
  const g=window.__game, s=g.sim;
  g.renderer.snapTo(33,11); g.follow=null;
  const p=s.world.props.find(x=>x.type==='questboard');
  return { prop:p, screen:g.renderer.worldToScreen(p.x+0.5,p.y+0.5) };
});
await new Promise(r=>setTimeout(r,600));
await page.screenshot({ path: 'shots/152-questboard.png' });
const opened = await page.evaluate(()=>{
  const g=window.__game;
  g._tap(g.renderer.worldToScreen(33.5,11.5).x, g.renderer.worldToScreen(33.5,11.5).y);
  return document.getElementById('sheet').classList.contains('open') && document.getElementById('sheet-title').textContent.includes('委托');
});
console.log(JSON.stringify({badge, badge2, board, opened, errs}, null, 1));
await browser.close();
