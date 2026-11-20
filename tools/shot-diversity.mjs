import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,800));
const kinds = await page.evaluate(()=>{
  const s=window.__game.sim; window.__game.setSpeed(0);
  const k={}; for(const t of s.world.trees) k[t.kind]=(k[t.kind]||0)+1;
  return { kinds:k, trees:s.world.trees.length, props:s.world.props.length };
});
const shot = async (cam, name) => {
  await page.evaluate((c)=>{ const g=window.__game; g.sim.absHours=10; g.follow=null; g.renderer.snapTo(c[0],c[1]); }, cam);
  await new Promise(r=>setTimeout(r,600));
  await page.screenshot({ path: `shots/${name}.png` });
};
await shot([10,5], '200-village');
await shot([46,14], '201-forest');
await shot([27,45], '202-river');
await shot([25,36], '203-fishing');
await shot([29,9], '204-market');
console.log(JSON.stringify({kinds, errs}, null, 1));
await browser.close();



