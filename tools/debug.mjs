// 调试：只加载页面并输出错误
import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${(e.stack || '').split('\n').slice(0, 5).join('\n')}`));
page.on('requestfailed', (r) => logs.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0', timeout: 20000 });
await new Promise((r) => setTimeout(r, 1200));
const info = await page.evaluate(() => ({
  game: !!window.__game,
  money: !!document.querySelector('#hud-money'),
  hud: document.querySelector('#topbar')?.childElementCount,
  body: document.body.innerText.slice(0, 200),
}));
console.log(JSON.stringify({ info, logs }, null, 2));
await browser.close();

