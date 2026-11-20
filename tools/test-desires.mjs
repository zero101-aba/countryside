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
const out = await page.evaluate(()=>{
  const g=window.__game, s=g.sim; g.setSpeed(0); s.absHours=8;
  const seen={};
  for(let i=0;i<9000;i++){
    s.tick(1/60);
    for(const v of s.villagers){
      const label=v.desire?.label || (v.task?('干活:'+v.task.type):(v.state==='wander'?'走动':null));
      if(label){ (seen[v.name]=seen[v.name]||[]); const arr=seen[v.name]; if(arr[arr.length-1]!==label) arr.push(label); }
    }
  }
  return {
    seen,
    traits:s.villagers.map(v=>({name:v.name,traits:v.traits,aspiration:v.aspiration,desire:v.desire?.label||null,task:v.task?.type||null,pos:[+v.x.toFixed(1),+v.y.toFixed(1)]})),
    day:s.day, hour:+s.hour.toFixed(1),
  };
});
await page.evaluate(()=>{ const g=window.__game; g.sim.absHours=10; g.renderer.snapTo(17,10); g.selectVillager(g.sim.villagers[0], true); });
await new Promise(r=>setTimeout(r,500));
await page.screenshot({ path:'shots/280-desires.png' });
console.log(JSON.stringify({seen: out.seen, errs}, null, 1));
await browser.close();

