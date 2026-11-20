import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,300));
const out = await page.evaluate(() => {
  const s = window.__game.sim;
  const tz = s.villagers.find(v=>v.name==='铁柱');
  s.absHours = 23.2;
  const snap = (tag) => ({tag, clock:s.clockText, st:tz.state, half: tz._sleepT, path: tz.path?.length, x:+tz.x.toFixed(1), y:+tz.y.toFixed(1), task: tz.task?.type||null, speech: tz.speech?.text||null});
  const rows=[snap('init')];
  for (let i=0;i<600;i++) { s.tick(1/60); if(i%100===0) rows.push(snap('tick'+i)); }
  rows.push(snap('end'));
  return rows;
});
console.log(JSON.stringify(out,null,1));
await browser.close();

