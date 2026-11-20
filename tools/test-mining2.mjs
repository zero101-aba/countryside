import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message));
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,600));
const out = await page.evaluate(()=>{
  const g=window.__game, s=g.sim; g.setSpeed(0);
  s.stats.harvested=10; s.checkRegionUnlocks();
  const v=s.villagers.find(x=>x.id==='afu');
  const rock=s.world.rocks.find(r=>r.ore && !r.mined);
  v.x=rock.x-1.5; v.y=rock.y+0.5; v.path=null; v.task=null; v.state='auto'; v.queue=[];
  g.runCommand('让阿福挖一块矿');
  const snapshots=[];
  for(let i=0;i<8;i++){
    for(let j=0;j<60;j++) s.tick(1/60);
    snapshots.push({i, stage:v.task?.stage, type:v.task?.type, tx:v.task?.tx, ty:v.task?.ty, goal:v.task?.goal, pos:[+v.x.toFixed(1),+v.y.toFixed(1)], path:v.path?.length, action:v.action, mined:rock.mined, inv:JSON.stringify(s.inventory)});
  }
  return { rock:{x:rock.x,y:rock.y}, snapshots };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();



