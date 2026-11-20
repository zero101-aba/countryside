import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
const out = await page.evaluate(async ()=>{
  const cfg=JSON.parse(localStorage.getItem('fanmian_ai_v1')||'{}');
  const res = await fetch('/api/deepseek',{method:'POST',headers:{'content-type':'application/json','x-deepseek-key':'sk-test-invalid'},body:JSON.stringify({model:'deepseek-chat',messages:[{role:'user',content:'hi'}],max_tokens:8})});
  const text=await res.text();
  return { cfgKey: !!cfg.key, status:res.status, text:text.slice(0,200) };
});
console.log(JSON.stringify(out,null,1));
await browser.close();
