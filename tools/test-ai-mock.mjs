import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message));
await page.setRequestInterception(true);
page.on('request', req => {
  if (req.url().includes('/api/deepseek')) {
    req.respond({status:200, contentType:'application/json', body: JSON.stringify({choices:[{message:{content:'{"speaker":"小伟","line":"今天河边风不错，等会儿去走走？","reply":"好呀，我把这点活收个尾。","mood":"开心","bond":2}'}}]})});
  } else req.continue();
});
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); localStorage.setItem('fanmian_ai_v1', JSON.stringify({key:'sk-test',model:'deepseek-chat',auto:true,enabled:true})); });
await page.reload({waitUntil:'networkidle0'});
await new Promise(r=>setTimeout(r,700));
const out = await page.evaluate(async ()=>{
  const g=window.__game,s=g.sim;
  const r=await g.triggerAITalk();
  return { r: r.ok, story:s.story, bond:s.bond, feed:[...document.querySelectorAll('#cmd-feed div')].slice(-4).map(d=>d.textContent), a:s.villagers.find(v=>v.id==='xiaowei').thought, b:s.villagers.find(v=>v.id==='xiaoyang').thought };
});
await new Promise(r=>setTimeout(r,300));
await page.screenshot({ path: 'shots/231-ai-talk.png' });
console.log(JSON.stringify({out, errs}, null, 1));
await browser.close();
