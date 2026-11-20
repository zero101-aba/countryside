import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,600));
const png = await page.evaluate(() => {
  const g=window.__game, s=g.sim;
  s.money = 9999;
  for (const def of s.hirePool) if (!s.villagers.some(v=>v.id===def.id)) s.hire(def);
  const list = s.villagers;
  const S=8, cols=4, rows=Math.ceil(list.length/cols);
  const c=document.createElement('canvas');
  c.width = cols*22*S + (cols+1)*12;
  c.height = rows*22*S + (rows+1)*12;
  const x=c.getContext('2d'); x.imageSmoothingEnabled=false;
  x.fillStyle='#79b45a'; x.fillRect(0,0,c.width,c.height);
  list.forEach((v,i)=>{
    const col=i%cols, row=Math.floor(i/cols);
    const spr=g.renderer.sprites.get(v.colors,'down','idle',0);
    x.drawImage(spr,0,0,22,22, 12+col*(22*S+12), 12+row*(22*S+12), 22*S, 22*S);
    x.fillStyle='#1e1a16'; x.font='bold 14px monospace'; x.textAlign='center';
    x.fillText(v.name, 12+col*(22*S+12)+11*S, 12+row*(22*S+12)+22*S+8);
  });
  return { url: c.toDataURL('image/png'), names: list.map(v=>v.name) };
});
fs.writeFileSync('shots/140-character-models.png', Buffer.from(png.url.split(',')[1],'base64'));
// 村里看一眼
await page.evaluate(()=>{
  const g=window.__game, s=g.sim;
  g.setSpeed(0);
  const vs=s.villagers.slice(0,6);
  vs.forEach((v,i)=>{ v.x=10.5+i*2.4; v.y=13.2; v.path=null; v.task=null; v.state='auto'; v.dir='down'; });
  g.selectVillager(vs[0]); g.ui.closeSheet();
  g.renderer.snapTo(17,12.5); g.follow=null;
});
await new Promise(r=>setTimeout(r,800));
await page.screenshot({ path: 'shots/141-village-models.png' });
console.log(JSON.stringify({names: png.names, errs}));
await browser.close();
