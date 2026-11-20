import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message));
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,600));
const info = await page.evaluate(()=>{
  const g=window.__game, s=g.sim;
  g.setSpeed(0);
  const vs=s.villagers.slice(0,5);
  vs.forEach((v,i)=>{ v.x=12+i*1.7; v.y=13.2; v.path=null; v.task=null; v.state='auto'; v.dir='down'; });
  const lines=[['今天的苗长得真好！','😊'],['东家，我有点饿了。','🍞'],['这活儿干得人一肚子火。','😠'],['是不是我做得不够好……','😔'],['河边的鱼今天特别多。','🎣']];
  vs.forEach((v,i)=>v.say(lines[i][0], lines[i][1], 30));
  g.selectVillager(vs[0]);
  g.ui.closeSheet();
  g.renderer.snapTo(15.5, 12.6);
  g.follow=null;
  return vs.map(v=>[v.name,+v.x.toFixed(1)]);
});
await new Promise(r=>setTimeout(r,900));
const state = await page.evaluate(()=>({
  bubbles: [...document.querySelectorAll('.w-bubble')].map(el=>({text:el.textContent, sel:el.classList.contains('selected'), hidden:el.classList.contains('hidden'), l:el.style.left, t:el.style.top, w:el.offsetWidth, h:el.offsetHeight})),
}));
await page.screenshot({ path: 'shots/120-bubbles.png' });
console.log(JSON.stringify({info, state, errs},null,1));
await browser.close();
