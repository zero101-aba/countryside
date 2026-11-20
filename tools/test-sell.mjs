import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,600));
await page.evaluate(()=>{
  const s=window.__game.sim;
  s.inventory = { wood: 5, fish: 2, mushroom: 1, radish: 2, bread: 1 };
  s.money = 100;
  window.__game.ui.openShop('goods');
});
await new Promise(r=>setTimeout(r,500));
const before = await page.evaluate(()=>({ money: window.__game.sim.money, inv: {...window.__game.sim.inventory}, buttons: document.querySelectorAll('[data-sell]').length }));
// 点木头“卖出”
await page.click('[data-sell="wood"]');
await new Promise(r=>setTimeout(r,400));
const afterWood = await page.evaluate(()=>({ money: window.__game.sim.money, wood: window.__game.sim.inventory.wood, toast: document.getElementById('toast').textContent, buttons: document.querySelectorAll('[data-sell]').length }));
// 全部卖出
await page.click('#sell-all');
await new Promise(r=>setTimeout(r,400));
const afterAll = await page.evaluate(()=>({ money: window.__game.sim.money, inv: {...window.__game.sim.inventory}, empty: !!document.querySelector('#tab-body .empty'), toast: document.getElementById('toast').textContent }));
// 自动出售开关
const toggleBefore = await page.evaluate(()=>window.__game.sim.autoSell);
await page.click('#toggle-autosell');
await new Promise(r=>setTimeout(r,300));
const toggleAfter = await page.evaluate(()=>window.__game.sim.autoSell);
await page.screenshot({ path: 'shots/130-goods-fixed.png' });
console.log(JSON.stringify({before, afterWood, afterAll, toggleBefore, toggleAfter, errs}, null, 1));
await browser.close();
