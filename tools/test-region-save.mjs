import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message));
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,600));
const before = await page.evaluate(()=>{
  const g=window.__game,s=g.sim; g.setSpeed(0);
  s.stats.harvested=10; s.checkRegionUnlocks();
  const rock=s.world.rocks.find(r=>r.x>=40);
  rock.mined=true; rock.regrowAt=s.absHours+10;
  s.dayStats.stone=3;
  g.save();
  const snap=JSON.parse(localStorage.getItem('fanmian_town_save_v1'));
  return { unlocked:[...s.unlockedRegions], bridge:s.world.bridgeOpen, savedRocks:snap.rocks?.length, minedSaved:snap.rocks?.find(r=>r.x===rock.x&&r.y===rock.y)?.mined, stone:snap.dayStats.stone };
});
await page.reload({ waitUntil: 'networkidle0' });
await new Promise(r=>setTimeout(r,700));
const after = await page.evaluate(()=>{
  const s=window.__game.sim;
  const rock=s.world.rocks.find(r=>r.x>=40);
  return { unlocked:[...s.unlockedRegions], bridge:s.world.bridgeOpen, gate:s.world.block[s.world.idx(39,13)], portal:s.world.props.filter(p=>p.type==='gate').length, rockMined:rock.mined, stone:s.dayStats.stone };
});
console.log(JSON.stringify({before, after, errs}, null, 1));
await browser.close();
