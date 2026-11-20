import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,500));
await page.evaluate(()=>{
  const g = window.__game;
  window.__taps = [];
  const orig = g._tap.bind(g);
  g._tap = (x,y) => { window.__taps.push({x,y, mode:g.mode}); orig(x,y); };
  const o2 = g._useMode.bind(g);
  g._useMode = (w) => { window.__taps.push({useMode:w, mode:g.mode}); o2(w); };
  g.selectVillager(g.sim.villagers[0]);
});
await new Promise(r=>setTimeout(r,400));
await page.evaluate(()=>{ document.querySelector('[data-cmd="plow"]').click(); });
await new Promise(r=>setTimeout(r,300));
const info = await page.evaluate(()=>{
  const g = window.__game;
  const p = g.sim.world.plots.find(x=>x.state==='grass');
  const s = g.renderer.worldToScreen(p.x*24+12, p.y*24+12);
  const r = document.getElementById('game').getBoundingClientRect();
  return { page:{x:r.x+s.x,y:r.y+s.y}, screen:s, plot:[p.x,p.y], canvas:[r.x,r.y,r.width,r.height], scale:g.renderer.scale };
});
console.log('info', JSON.stringify(info));
await page.mouse.click(info.page.x, info.page.y);
await new Promise(r=>setTimeout(r,600));
const taps = await page.evaluate(()=>({taps: window.__taps, mode: window.__game.mode, task: window.__game.sim.villagers[0].task?.type||null}));
console.log('taps', JSON.stringify(taps));
await browser.close();

