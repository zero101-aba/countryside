import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await new Promise(r=>setTimeout(r,600));
const png = await page.evaluate(()=>{
  const g=window.__game, r=g.renderer;
  g.sim.absHours=10;
  const kinds=[['oak','橡树'],['pine','松树'],['birch','白桦'],['willow','垂柳'],['apple','苹果树'],['dead','枯树']];
  const S=3, c=document.createElement('canvas'); c.width=780; c.height=250;
  const x=c.getContext('2d'); x.fillStyle='#79b45a'; x.fillRect(0,0,c.width,c.height);
  x.save(); x.scale(S,S);
  kinds.forEach(([kind,label],i)=>{
    r._drawTree(x,{x:0.25+i*1.32,y:0.35,size:2,kind,seed:0.2+i*0.15,regrowAt:0,fruit:kind==='apple'?'apple':null});
  });
  x.restore();
  x.font='bold 16px sans-serif'; x.textAlign='center';
  const palette=['#f4e8cc'];
  kinds.forEach(([kind,label],i)=>{
    x.fillStyle='rgba(20,26,16,.55)'; x.fillRect(i*130+8, 205, 116, 28);
    x.fillStyle='#fff6dc'; x.fillText(label, i*130+66, 225);
  });
  return c.toDataURL('image/png');
});
fs.writeFileSync('shots/211-tree-species.png', Buffer.from(png.split(',')[1],'base64'));
console.log('done');
await browser.close();
