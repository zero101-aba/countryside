import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await new Promise(r=>setTimeout(r,1200));
const s1 = await page.evaluate(()=>({
  tutorial: document.getElementById('tutorial').classList.contains('show'),
  cards: document.querySelectorAll('.vcard').length,
  money: document.getElementById('hud-money').textContent,
  date: document.getElementById('hud-date').textContent,
  goal: document.getElementById('goal-text').textContent,
  canvas: [document.getElementById('game').width, document.getElementById('game').height],
}));
// 教程过完并选人、下指令、点地
const ok = await page.evaluate(async () => {
  const g = window.__game, s = g.sim;
  document.getElementById('tutorial').classList.remove('show');
  localStorage.setItem('farm_tutorial_done','1');
  g.selectVillager(s.villagers[0]);
  await new Promise(r=>setTimeout(r,100));
  const p = s.world.plots.find(x=>x.state==='grass');
  s.villagers[0].x = p.x + 0.5; s.villagers[0].y = p.y + 0.5;
  const r1 = s.villagers[0].issueOrder('plow', p.x, p.y);
  const r2 = s.villagers[0].issueOrder('plant', p.x, p.y);
  const r3 = s.villagers[0].issueOrder('water', p.x, p.y);
  const r4 = s.villagers[0].issueOrder('harvest', p.x, p.y);
  return { plow: r1.ok, plant: r2.ok, water: r3.ok, harvestBlocked: !r4.ok, msg: r4.msg };
});
await new Promise(r=>setTimeout(r,2500));
const after = await page.evaluate(()=>{
  const g=window.__game, s=g.sim;
  return { task: s.villagers[0].task && {t:s.villagers[0].task.type, st:s.villagers[0].task.stage}, plowed: s.world.plots.filter(p=>p.state==='plowed').length, crop: s.world.plots.filter(p=>p.crop).length, logs: s.logs.slice(-4).map(l=>l.text) };
});
console.log(JSON.stringify({s1, ok, after, errs}, null, 1));
await browser.close();

