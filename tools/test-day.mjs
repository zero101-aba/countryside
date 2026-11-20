import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,500));
const res = await page.evaluate(() => {
  const g=window.__game, s=g.sim;
  const snap=()=>s.villagers.map(v=>({n:v.name, st:v.state, task:v.task?.type||null}));
  const out={};
  s.absHours=22.8;
  for (let i=0;i<600;i++) s.tick(1/60);
  out.at23 = {clock:s.clockText, vs:snap()};
  for (let i=0;i<3000;i++) s.tick(1/60);
  out.nextMorning = {clock:s.clockText, day:s.day, vs:snap(), money:s.money, bread:s.inventory.bread};
  // 作物生长：种一块，浇水，跑 10 游戏小时
  const p=s.world.plots[0]; p.state='plowed'; p.crop='radish'; p.growth=0; p.wetUntil=s.absHours+16;
  const before=s.cropProgress(p);
  for (let i=0;i<3000;i++) s.tick(1/60);
  out.crop = {before:+before.toFixed(2), after:+s.cropProgress(p).toFixed(2), hour:+s.hour.toFixed(1)};
  return out;
});
console.log(JSON.stringify({res, errs}, null, 1));
await browser.close();
