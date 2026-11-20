import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT='tools/shots'; fs.mkdirSync(OUT,{recursive:true});
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push('pageerror: '+e.message)); page.on('console', m=>{ if(m.type()==='error') errs.push('console: '+m.text()); });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,600));

// 选中 -> 指令模式
await page.evaluate(()=>window.__game.selectVillager(window.__game.sim.villagers[0]));
await new Promise(r=>setTimeout(r,500));
await page.evaluate(()=>{ document.querySelector('[data-cmd="plow"]').click(); });
await new Promise(r=>setTimeout(r,700));
await page.screenshot({ path: `${OUT}/60-mode.png` });
const mode = await page.evaluate(()=>window.__game.mode);

// 点地图（模拟真实指针事件）
const pt = await page.evaluate(()=>{ const g=window.__game; const p=g.sim.world.plots.find(x=>x.state==='grass'); return g.renderer.worldToScreen(p.x*24+12, p.y*24+12); });
const canvasBox = await page.evaluate(()=>{ const r=document.getElementById('game').getBoundingClientRect(); return {x:r.x,y:r.y}; });
await page.mouse.click(canvasBox.x+pt.x, canvasBox.y+pt.y);
await new Promise(r=>setTimeout(r,1500));
await page.screenshot({ path: `${OUT}/61-working.png` });
const afterClick = await page.evaluate(()=>{ const g=window.__game; const v=g.sim.villagers[0]; return {mode:g.mode, task:v.task?.type, stage:v.task?.stage, progress:+(v.task?.progress||0).toFixed(2), plowed:g.sim.world.plots.filter(p=>p.state==='plowed').length }; });

// 集市买种子
await page.evaluate(()=>window.__game.ui.openShop('seed'));
await new Promise(r=>setTimeout(r,500));
const shopSeen = await page.evaluate(()=>document.querySelectorAll('#tab-body .shop-item').length);
await page.screenshot({ path: `${OUT}/62-shop.png` });
await page.evaluate(()=>{ const b=document.querySelector('#tab-body [data-buy]'); if(b) b.click(); });

// 目标提示
const goal = await page.evaluate(()=>document.getElementById('goal-text')?.textContent);
await page.evaluate(()=>window.__game.ui.closeSheet());
await new Promise(r=>setTimeout(r,400));
await page.screenshot({ path: `${OUT}/63-final.png` });
await browser.close();
console.log(JSON.stringify({errs, mode, afterClick, shopSeen, goal}, null, 1));

