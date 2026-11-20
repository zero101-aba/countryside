import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,500));
const out = await page.evaluate(() => {
  const s = window.__game.sim;
  const tz = s.villagers.find(v=>v.name==='铁柱');
  const p = s.world.plots[2];
  p.state = 'plowed'; p.crop = 'radish'; p.growth = 1; p.wetUntil = 0;
  const results = { angryRefuse: 0, angryTotal: 0, calmRefuse: 0, calmTotal: 0 };
  for (let i=0;i<30;i++) {
    tz.emo.cur.anger = 90; tz.emo.cur.joy = 15; tz.emo.cur.fatigue = 10;
    const r = tz.issueOrder('water', p.x, p.y);
    results.angryTotal++;
    if (!r.ok && r.msg.includes('气头上')) results.angryRefuse++;
    tz.task = null; tz.path = null; tz.state='auto';
  }
  for (let i=0;i<30;i++) {
    tz.emo.cur.anger = 5; tz.emo.cur.joy = 45; tz.emo.cur.fatigue = 10;
    const r = tz.issueOrder('water', p.x, p.y);
    results.calmTotal++;
    if (!r.ok && r.msg.includes('气头上')) results.calmRefuse++;
    tz.task = null; tz.path = null; tz.state='auto';
  }
  return results;
});
console.log(JSON.stringify(out));
await browser.close();

