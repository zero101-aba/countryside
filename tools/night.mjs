import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,300));
// 让几块地被种上，观察夜间与第二天
await page.evaluate(() => {
  const g = window.__game, s = g.sim;
  for (const p of s.world.plots.slice(0, 4)) { p.state='plowed'; p.crop='radish'; p.growth=2; p.wetUntil = s.absHours + 8; }
  s.absHours = 22.4;
  g.setSpeed(4);
});
await new Promise(r=>setTimeout(r, 3500));
const a = await page.evaluate(()=>{ const s=window.__game.sim; return {clock:s.clockText, day:s.day, vs:s.villagers.map(v=>({n:v.name, st:v.state, task:v.task?.type||null}))}; });
await page.screenshot({ path: 'tools/shots/40-night2.png' });
await new Promise(r=>setTimeout(r, 5000));
const b = await page.evaluate(()=>{ const s=window.__game.sim; return {clock:s.clockText, day:s.day, vs:s.villagers.map(v=>({n:v.name, st:v.state, task:v.task?.type||null})), logs:s.logs.slice(-8).map(l=>l.text)}; });
await page.screenshot({ path: 'tools/shots/41-morning.png' });
console.log(JSON.stringify({a,b},null,1));
await browser.close();

