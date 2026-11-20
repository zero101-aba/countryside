import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await new Promise(r=>setTimeout(r,700));
const png = await page.evaluate(()=>{
  const g=window.__game, s=g.sim;
  const S=7, dirs=[['down','正面'],['up','背面'],['left','左'],['right','右']];
  const cw=2*22*S+3*16, ch=4*22*S+60;
  const c=document.createElement('canvas'); c.width=cw; c.height=ch;
  const x=c.getContext('2d'); x.fillStyle='#79b45a'; x.fillRect(0,0,cw,ch);
  x.textAlign='center';
  s.villagers.slice(0,2).forEach((v,ci)=>{
    const ox=16+ci*(22*S+16);
    dirs.forEach(([dir,label],di)=>{
      const spr=g.renderer.sprites.get(v.colors,dir,'idle',0);
      const oy=16+di*(22*S+8);
      x.imageSmoothingEnabled=false;
      x.drawImage(spr,0,0,22,22,ox,oy,22*S,22*S);
      x.fillStyle='rgba(20,30,15,.55)'; x.fillRect(ox,oy+22*S,22*S,14);
      x.fillStyle='#fff6dc'; x.font='11px sans-serif'; x.fillText(label,ox+11*S,oy+22*S+11);
    });
    x.fillStyle='#1e1a16'; x.font='bold 14px sans-serif';
    x.fillText(v.name, ox+11*S, ch-10);
  });
  return c.toDataURL('image/png');
});
fs.writeFileSync('shots/140-character-models.png', Buffer.from(png.split(',')[1],'base64'));
console.log('done');
await browser.close();
