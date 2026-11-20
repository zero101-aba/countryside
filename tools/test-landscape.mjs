import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,900));
const layout = await page.evaluate(()=>{
  const q=s=>document.querySelector(s).getBoundingClientRect();
  const stage=q('#stage'), bottom=q('#bottom'), top=q('#topbar'), canvas=document.getElementById('game');
  return { stage:[Math.round(stage.width),Math.round(stage.height)], bottom:[Math.round(bottom.width),Math.round(bottom.height)], top:[Math.round(top.width),Math.round(top.height)], canvas:[canvas.width,canvas.height], scale:+window.__game.renderer.scale.toFixed(2), cards:document.querySelectorAll('.vcard').length };
});
await page.screenshot({ path: 'shots/110-landscape.png' });
// 侧边指令簿
await page.evaluate(()=>window.__game.selectVillager(window.__game.sim.villagers[0]));
await new Promise(r=>setTimeout(r,700));
await page.screenshot({ path: 'shots/111-landscape-sheet.png' });
const sheet = await page.evaluate(()=>{ const r=document.querySelector('.sheet-panel').getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}; });
await page.evaluate(()=>window.__game.ui.closeSheet());
// 聊天
await page.evaluate(()=>window.__game.ui.openChat(window.__game.sim.villagers[0]));
await new Promise(r=>setTimeout(r,700));
await page.screenshot({ path: 'shots/112-landscape-chat.png' });
const chat = await page.evaluate(()=>{ const r=document.querySelector('.chat-panel').getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}; });
await page.evaluate(()=>window.__game.ui.closeChat());
// 转回竖屏
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await new Promise(r=>setTimeout(r,700));
const portrait = await page.evaluate(()=>{ const s=document.getElementById('stage').getBoundingClientRect(); return {stage:[Math.round(s.width),Math.round(s.height)], cards:document.querySelectorAll('.vcard').length}; });
await page.screenshot({ path: 'shots/113-portrait-again.png' });
console.log(JSON.stringify({layout, sheet, chat, portrait, errs}, null, 1));
await browser.close();
