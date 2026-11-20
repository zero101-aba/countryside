import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,800));
const base = await page.evaluate(()=>{
  const g=window.__game,s=g.sim;
  return { villagers:s.villagers.map(v=>v.name), roster:document.querySelectorAll('#roster-inner .vcard').length, hire:s.hirePool.length, goal:document.getElementById('goal-text').textContent, bond:s.bond };
});
// 打开集市-设置
await page.evaluate(()=>{ window.__game.ui.openShop('settings'); });
await new Promise(r=>setTimeout(r,500));
const settings = await page.evaluate(()=>({ ai:!!document.querySelector('.ai-box'), key:!!document.querySelector('#ai-key'), talk:!!document.querySelector('[data-set="ai-talk"]') }));
await page.screenshot({ path: 'shots/230-ai-settings.png' });
// 无 key 点击聊聊 → 应提示
await page.evaluate(()=>window.__game.triggerAITalk());
await new Promise(r=>setTimeout(r,500));
const noKey = await page.evaluate(()=>({ toast:document.getElementById('toast').textContent, aiFeed:[...document.querySelectorAll('#cmd-feed div')].slice(-3).map(d=>d.textContent) }));
console.log(JSON.stringify({base,settings,noKey,errs}, null, 1));
await browser.close();
