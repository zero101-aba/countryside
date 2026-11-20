import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu','--lang=zh-CN'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs=[]; page.on('pageerror', e=>errs.push(e.message));
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('farm_tutorial_done','1'); document.getElementById('tutorial').classList.remove('show'); });
await new Promise(r=>setTimeout(r,600));
const out = await page.evaluate(() => {
  const g = window.__game, s = g.sim;
  const tz = s.villagers.find(v=>v.name==='铁柱');
  // 1) 强制愤怒
  tz.emo.cur.anger = 88; tz.emo.cur.joy = 20; tz._updateMood();
  const emoAfter = { dom: tz.emotion.key, emoji: tz.moodEmoji };
  // 2) 愤怒时派不喜欢的活，多次尝试看拒绝率
  let refusals = 0;
  const p = s.world.plots.find(x=>x.state==='grass');
  for (let i=0;i<8;i++) {
    tz.emo.cur.anger = 88;
    const r = tz.issueOrder('water', p.x, p.y);
    if (!r.ok) refusals++;
    tz.task = null; tz.path = null; tz.state='auto';
  }
  // 3) 愤怒时的对话
  const d = window.__game;
  tz.memory.talkCount = 0;
  tz.emo.cur.anger = 88;
  const say = window.__chatProbe ? null : null;
  return { emoAfter, refusals, dom: tz.emotion.key, joy: Math.round(tz.emo.cur.joy) };
});
// 对话：愤怒状态下的回复
const angryReplies = await page.evaluate(() => {
  const g = window.__game, s = g.sim;
  const tz = s.villagers.find(v=>v.name==='铁柱');
  tz.emo.cur.anger = 88; tz.emo.cur.joy = 15; tz._updateMood();
  g.selectVillager(tz);
  document.getElementById('sheet').classList.remove('open');
  return { dom: tz.emotion.key, emoji: tz.moodEmoji, role: `${tz.role} · 现在${tz.emotion.label}` };
});
await page.evaluate(() => window.__game.ui.openChat(window.__game.sim.villagers.find(v=>v.name==='铁柱')));
await new Promise(r=>setTimeout(r,500));
const greetAngry = await page.evaluate(()=>document.querySelector('#chat-log .m-bubble')?.textContent);
await page.click('#chat-topics [data-topic="praise"]');
await new Promise(r=>setTimeout(r,800));
const praiseAngry = await page.evaluate(()=>[...document.querySelectorAll('#chat-log .m-bubble')].slice(-1)[0]?.textContent);
// 刷屏
for (let i=0;i<2;i++) { await page.click('#chat-topics [data-topic="praise"]'); await new Promise(r=>setTimeout(r,700)); }
const spamReply = await page.evaluate(()=>[...document.querySelectorAll('#chat-log .m-bubble')].slice(-1)[0]?.textContent);
await page.screenshot({ path: 'shots/85-angry-chat.png' });
console.log(JSON.stringify({ out, angryReplies, greetAngry, praiseAngry, spamReply, errs }, null, 1));
await browser.close();

