import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,300));
const out = await page.evaluate(() => {
  const g = window.__game, s = g.sim;
  const snap = () => s.villagers.map(v => ({n:v.name, st:v.state, task:v.task?.type||null, stage:v.task?.stage||null, x:+v.x.toFixed(1), y:+v.y.toFixed(1), path:v.path?.length||0}));
  s.absHours = 22.5;
  const frames = [];
  for (let i=0;i<600;i++) s.tick(1/60);
  frames.push({t:'22.5+10s', clock:s.clockText, vs:snap()});
  for (let i=0;i<600;i++) s.tick(1/60);
  frames.push({t:'+10s', clock:s.clockText, vs:snap()});
  for (let i=0;i<1200;i++) s.tick(1/60);
  frames.push({t:'+20s', clock:s.clockText, vs:snap()});
  return frames;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();

