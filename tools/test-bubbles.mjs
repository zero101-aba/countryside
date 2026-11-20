import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,600));
const info = await page.evaluate(()=>{
  const g=window.__game, s=g.sim;
  const vs=s.villagers;
  vs.forEach((v,i)=>{ v.x=11+i*1.6; v.y=13.2; v.path=null; v.task=null; v.state='auto'; v.dir='down'; });
  vs[0].say('今天的苗长得真好！', '😊', 20);
  vs[1].say('东家，我有点饿了。', '🍞', 20);
  vs[2].think('这活儿干得人一肚子火。', '😠');
  vs[3].think('是不是我做得不够好……', '😔');
  vs[4].say('河边的鱼今天特别多。', '🎣', 20);
  vs[5].think('这村子越来越像样了。', '💭');
  g.selectVillager(vs[0]);
  g.renderer.snapTo(14.5, 13);
  return { count: vs.length, selected: vs[0].name };
});
await new Promise(r=>setTimeout(r,900));
const state = await page.evaluate(()=>({
  bubbles: [...document.querySelectorAll('.w-bubble')].map(el=>({text:el.textContent, selected:el.classList.contains('selected'), hidden:el.classList.contains('hidden'), left:el.style.left, top:el.style.top})),
}));
await page.screenshot({ path: 'shots/120-bubbles.png' });
console.log(JSON.stringify({info, state, errs}, null, 1));
await browser.close();
