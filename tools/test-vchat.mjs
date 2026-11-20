import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message));
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,500));
const out = await page.evaluate(async () => {
  const g = window.__game, s = g.sim;
  const a = s.villagers[0], b = s.villagers[1];
  a.x = b.x + 0.6; a.y = b.y; a.path=null; a.task=null; a.state='auto';
  const r = a.issueOrder('chat', 0, 0);
  // 直接结算聊天任务
  const task = { type:'chat', other:b, tx:b.x, ty:b.y, byPlayer:true };
  const res = s.applyWork(a, task);
  return { ok: r.ok, res, aSay: a.speech?.text, bSay: b.speech?.text };
});
console.log(JSON.stringify({out, errs}, null, 1));
await page.screenshot({ path: 'shots/86-village-chat.png' });
await browser.close();
