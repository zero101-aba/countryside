import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 800, height: 900, deviceScaleFactor: 1 });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); });
await new Promise(r=>setTimeout(r,600));
const png = await page.evaluate(() => {
  const g = window.__game;
  const names = ['小伟','小杨'];
  const S = 26;
  const c = document.createElement('canvas');
  c.width = 22*S*2 + 30; c.height = 22*S;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.fillStyle = '#79b45a'; x.fillRect(0,0,c.width,c.height);
  names.forEach((n,i)=>{
    const v = g.sim.villagers.find(z=>z.name===n);
    const spr = g.renderer.sprites.get(v.colors,'down','idle',0);
    x.drawImage(spr,0,0,22,22, i*(22*S+30), 0, 22*S, 22*S);
  });
  return c.toDataURL('image/png');
});
fs.writeFileSync('shots/94-zoom.png', Buffer.from(png.split(',')[1],'base64'));
await browser.close();
console.log('ok');
