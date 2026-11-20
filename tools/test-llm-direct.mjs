import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const logs=[]; page.on('console', m=>logs.push(m.type()+':'+m.text()));
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
const out = await page.evaluate(async ()=>{
  localStorage.setItem('fanmian_ai_v1', JSON.stringify({key:'sk-test-invalid',model:'deepseek-chat',auto:false,enabled:true}));
  const m = await import('/src/llm.js');
  const cfg=m.loadAIConfig();
  try {
    const t = await m.llmChat([{role:'user',content:'hi'}], {maxTokens:8});
    return { cfg, t };
  } catch(e) {
    return { cfg, err:e.message, stack:String(e.stack).slice(0,300) };
  }
});
console.log(JSON.stringify({out,logs},null,1));
await browser.close();
