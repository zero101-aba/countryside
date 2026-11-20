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
await page.evaluate(()=>{
  const g=window.__game, s=g.sim;
  s.world.plots.slice(0,3).forEach(p=>{ p.state='plowed'; p.crop='radish'; p.growth=0.2; p.wetUntil=0; });
  g.runCommand('都去浇水');
  g.setSpeed(8);
});
await new Promise(r=>setTimeout(r,9000));
const out = await page.evaluate(()=>{
  const s=window.__game.sim;
  return { batches:s.batches.size, feed:[...document.querySelectorAll('#cmd-feed div')].map(d=>d.textContent).slice(-5) };
});
await page.evaluate(()=>{ const s=window.__game.sim; s.bond=60; });
await new Promise(r=>setTimeout(r,1500));
const bond = await page.evaluate(()=>({ milestone:window.__game.sim.bondMilestones[60]||0, toast:document.getElementById('toast').textContent }));
console.log(JSON.stringify({out,bond,errs},null,1));
await browser.close();
