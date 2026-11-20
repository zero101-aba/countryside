import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{
  localStorage.clear();
  localStorage.setItem('farm_tutorial_done','1');
  document.getElementById('tutorial').classList.remove('show');
  // 模拟截图里的旧配置：没有 provider，带一个失效的 sk- Key，模型 deepseek-chat
  localStorage.setItem('fanmian_ai_v1', JSON.stringify({key:'sk-old-invalid-9f2a',model:'deepseek-chat',auto:false,enabled:true}));
});
await page.reload({waitUntil:'networkidle0'});
await new Promise(r=>setTimeout(r,800));
const before = await page.evaluate(async ()=>{ const m=await import('/src/llm.js'); return m.loadAIConfig(); });
const out = await page.evaluate(async ()=>{ const g=window.__game; const r=await g.triggerAITalk(); return {ok:r.ok,msg:r.msg,line:g.sim.story.slice(-1)[0]?.line,bond:g.sim.bond}; });
console.log(JSON.stringify({before,out,errs},null,1));
await browser.close();
