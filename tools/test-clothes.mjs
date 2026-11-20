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
  const g=window.__game, s=g.sim; g.setSpeed(0);
  // 阶段 0：应买不了
  s.money=2000;
  const locked=s.buyOutfit('xiaowei','farm');
  // 推到阶段 5
  s.stageIndex=5; s.stageFlags.mine=true;
  const buy1=s.buyOutfit('xiaowei','farm');
  const wei=s.villagers.find(v=>v.id==='xiaowei');
  const colorAfterFarm=wei.colors.shirt;
  const buy2=s.buyOutfit('xiaowen','x'); // 无效
  const buy3=s.buyOutfit('xiaoyang','festival');
  const yang=s.villagers.find(v=>v.id==='xiaoyang');
  const colorYang=yang.colors.shirt;
  const equipBack=s.equipOutfit('xiaowei','default');
  const colorBack=wei.colors.shirt;
  return { locked, buy1, colorAfterFarm, buy2, buy3, colorYang, equipBack, colorBack, owned:s.ownedOutfits, equipped:s.equippedOutfit, money:s.money };
});
await page.evaluate(()=>window.__game.ui.openShop('clothes'));
await new Promise(r=>setTimeout(r,600));
const dom = await page.evaluate(()=>({ cards:document.querySelectorAll('.cloth-card').length, canvas:document.querySelectorAll('.cloth-prev').length, worn:document.querySelectorAll('.worn').length }));
await page.screenshot({ path:'shots/310-clothes.png' });
console.log(JSON.stringify({out,dom,errs},null,1));
await browser.close();
