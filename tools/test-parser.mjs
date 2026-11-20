import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
const out = await page.evaluate(async ()=>{
  const s=window.__game.sim; s.stats.harvested=10; s.checkRegionUnlocks();
  const m = await import('/src/commander.js');
  const cmd = m.parseCommand('去后山挖两块矿', s);
  return { region: cmd.region, intent: cmd.intent, targets: cmd.targets, msg: cmd.messages };
});
console.log(JSON.stringify(out,null,1));
await browser.close();

