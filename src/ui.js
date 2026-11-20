// HUD / 面板 / 指令簿 / 聊天：DOM 覆盖层
import { CROPS, ORDERS, SEASON_EN, STAGES } from './config.js';
import { loadAIConfig, saveAIConfig, testAI } from './llm.js';
import { TIPS } from './words.js';
import { buildTalk, buildGreeting, CHAT_TOPICS, matchIntent } from './dialogue.js';
import { emotionView } from './emotions.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export class UI {
  constructor(game) {
    this.game = game;
    this.sim = game.sim;
    this.el = {
      money: $('#hud-money'), date: $('#hud-date'), time: null, season: $('#hud-season'),
      seasonIcon: $('#hud-season-icon'), weather: $('#hud-weather'), speed: $('#speed-group'),
      btnShop: $('#btn-shop'), btnVillagers: $('#btn-villagers'), btnStats: $('#btn-stats'),
      btnQuests: $('#btn-quests'), btnMap: $('#btn-map'), btnSkipNight: $('#btn-skip-night'), hudRegion: $('#hud-region'),
      mapOverlay: $('#map-overlay'), mapCanvas: $('#map-canvas'), mapClose: $('#map-close'), mapRegions: $('#map-regions'), mapCurrent: $('#map-current'),
      btnHelp: $('#btn-help'), btnSound: $('#btn-sound'), btnOrient: $('#btn-orient'),
      roster: $('#roster'), cardWrap: $('#roster-inner'),
      banner: $('#task-banner'), bannerAv: $('#tb-avatar'), bannerTitle: $('#tb-title'),
      bannerSub: $('#tb-sub'), bannerBar: $('#tb-bar'), bannerCancel: $('#tb-cancel'),
      sheet: $('#sheet'), sheetTitle: $('#sheet-title'), sheetBody: $('#sheet-body'), sheetClose: $('#sheet-close'),
      toast: $('#toast'), hint: $('#world-hint'), tutorial: $('#tutorial'),
      dayCard: $('#day-card'),
      followChip: $('#follow-chip'), followName: $('#follow-name'), followOff: $('#follow-off'),
      cmdForm: $('#commandbar'), cmdInput: $('#cmd-input'), cmdChips: $('#cmd-chips'), cmdFeed: $('#cmd-feed'),
      chat: $('#chat'), chatAv: $('#chat-av'), chatName: $('#chat-name'), chatRole: $('#chat-role'),
      chatClose: $('#chat-close'), chatEmo: $('#chat-emo'), chatLog: $('#chat-log'),
      chatTopics: $('#chat-topics'), chatForm: $('#chat-form'), chatText: $('#chat-text'),
      chatSend: $('#chat-send'),
    };
    this.cache = {};
    this._buildSheets();
    this._bindTop();
    this._bindChat();
    this._bindCommand();
    this.needRosterRebuild = true;
    this._rosterIds = '';
    this._lastBannerKey = '';
    this._lastClock = '';
    this._lastMoney = null;
    this._tickAcc = 0;
    this.chatV = null;
    this.chatBusy = false;

    // 指令按钮事件委托
    this.el.sheetBody.addEventListener('click', (e) => this._onSheetClick(e));
    this.el.sheetClose.addEventListener('click', () => this.closeSheet());
    this.el.sheet.addEventListener('click', (e) => { if (e.target === this.el.sheet) this.closeSheet(); });
  }

  _bindChat() {
    this.el.chatClose.addEventListener('click', () => this.closeChat());
    this.el.chat.addEventListener('click', (e) => { if (e.target === this.el.chat) this.closeChat(); });
    this.el.chatTopics.addEventListener('click', (e) => {
      const b = e.target.closest('[data-topic]');
      if (b) this._chatSendTopic(b.dataset.topic);
    });
    this.el.chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this._chatSendFree();
    });
  }

  _bindTop() {
    this.el.btnShop.addEventListener('click', () => { this.game.audio.click(); this.openShop(); });
    this.el.btnVillagers.addEventListener('click', () => this.openVillagerList());
    this.el.btnStats.addEventListener('click', () => this.openStats());
    this.el.btnQuests.addEventListener('click', () => this.openQuests());
    this.el.btnMap.addEventListener('click', () => this.openMap());
    this.el.btnSkipNight.addEventListener('click', () => this.game.skipNight());
    this.el.followOff.addEventListener('click', () => { this.game.follow = null; this.setFollowChip(null); this.toast('已取消跟随'); });
    this.el.mapClose.addEventListener('click', () => this.closeMap());
    this.el.mapOverlay.addEventListener('click', (e) => { if (e.target === this.el.mapOverlay) this.closeMap(); });
    this.el.btnHelp.addEventListener('click', () => this.openHelp());
    this.el.btnOrient.addEventListener('click', () => this.game.toggleLandscape());
    this.el.btnSound.addEventListener('click', () => {
      const on = this.game.audio.toggle();
      this.el.btnSound.textContent = on ? '🔊' : '🔇';
      this.toast(on ? '声音已开' : '静音');
    });
    this.el.speed.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-speed]');
      if (!b) return;
      const sp = Number(b.dataset.speed);
      this.game.setSpeed(sp);
    });
    this.el.bannerCancel.addEventListener('click', () => {
      const v = this.sim.selected;
      if (v && v.task) { v.cancelTask(); this.toast('已取消'); this.refreshNow(); }
    });
  }

  setFollowChip(v) {
    const name = v ? v.name : '';
    if (this._followName === name) return;
    this._followName = name;
    if (this.el.followChip) {
      this.el.followChip.classList.toggle('hidden', !v);
      if (v) this.el.followName.textContent = v.name;
    }
  }

  setSpeedUI(sp) {
    $$('#speed-group button').forEach((b) => b.classList.toggle('on', Number(b.dataset.speed) === sp));
  }

  _buildSheets() {
    // 占位，按需渲染
  }

  // ---------- 每帧/节流刷新 ----------
  update(dt) {
    this._tickAcc += dt;
    if (this._tickAcc < 0.12) return;
    this._tickAcc = 0;
    this.sim = this.game.sim;
    this._updateTop();
    this._updateGoal();
    this._updateBanner();
    this._updateRoster();
  }

  refreshNow() {
    this.sim = this.game.sim;
    this._updateTop();
    this._updateGoal();
    this._updateBanner();
    this._updateRoster(true);
  }

  // 新手目标链
  _goalList() {
    const st = this.sim.stats;
    return [
      { id: 'harvest1', text: '第一次收获', cur: Math.min(st.harvested, 1), max: 1, done: st.harvested >= 1 },
      { id: 'plant3', text: '播下 3 颗种子', cur: Math.min(st.planted, 3), max: 3, done: st.planted >= 3 },
      { id: 'money200', text: '攒到 200 金币', cur: Math.min(this.sim.money, 200), max: 200, done: this.sim.money >= 200 },
      { id: 'harvest10', text: '累计收获 10 次', cur: Math.min(st.harvested, 10), max: 10, done: st.harvested >= 10 },
    ];
  }

  _updateGoal() {
    const chip = this.el.goalChip || (this.el.goalChip = document.getElementById('goal-chip'));
    const txt = this.el.goalText || (this.el.goalText = document.getElementById('goal-text'));
    if (!chip || !txt) return;
    const list = this._goalList();
    const g = list.find((x) => !x.done);
    if (!g) {
      chip.classList.add('hide');
      return;
    }
    const key = `${g.id}_${g.cur}`;
    if (this._goalKey !== key) {
      this._goalKey = key;
      txt.textContent = `${g.text} ${g.cur}/${g.max}`;
      if (g.cur > 0 && g.id === 'harvest1') chip.classList.add('done');
    }
    chip.classList.remove('hide');
  }

  _updateTop() {
    const sim = this.sim;
    if (this._lastMoney !== sim.money) {
      this.el.money.textContent = sim.money;
      this.el.money.parentElement.classList.remove('pulse');
      void this.el.money.parentElement.offsetWidth;
      this.el.money.parentElement.classList.add('pulse');
      this._lastMoney = sim.money;
    }
    const clock = `${sim.seasonName} 第${sim.seasonDay}天 ${sim.clockText}`;
    if (this._lastClock !== clock) {
      this.el.date.textContent = clock;
      this.el.season.textContent = `${sim.seasonName}季`;
      this.el.seasonIcon.textContent = ['🌱', '🌻', '🍂', '❄️'][sim.season];
      this._lastClock = clock;
    }
    const weatherText = sim.weather === 'rain' ? '🌧 雨' : sim.weather === 'storm' ? '⛈ 暴雨'
      : sim.isNight ? '🌙 夜' : sim.hour < 8 ? '🌤 晨' : sim.hour > 17 ? '🌇 傍晚' : '☀️ 晴';
    if (this._lastWeather !== weatherText) {
      this.el.weather.textContent = weatherText;
      this._lastWeather = weatherText;
    }
    const rname = sim.regionById(sim.currentRegion)?.name || '';
    if (this._lastRegionName !== rname) {
      this.el.hudRegion.textContent = rname;
      this._lastRegionName = rname;
    }
    const nightNow = sim.hour >= 19 || sim.hour < 6;
    this.el.btnSkipNight.classList.toggle('hidden', !nightNow);
    // 阶段解锁的界面开关
    const f = sim.stageFlags || {};
    this.el.btnQuests.classList.toggle('hidden', !f.quests);
    const chipC = this.el.cmdChips.querySelector('[data-cmd="收牧产"]');
    if (chipC) chipC.classList.toggle('hidden', !f.collect);
    const b8 = document.querySelector('#speed-group [data-speed="8"]');
    if (b8) b8.classList.toggle('hidden', !f.speed8);
    // 委托红点
    const ready = sim.claimableQuests || 0;
    this.el.btnQuests.classList.toggle('has-badge', ready > 0);
    this.el.btnQuests.dataset.badge = String(ready);
    this.el.btnQuests.title = ready > 0 ? `有 ${ready} 份委托可领取` : '每日委托';
  }

  _updateBanner() {
    const v = this.sim.selected;
    const banner = this.el.banner;
    if (!v) { banner.classList.add('hidden'); return; }
    const task = v.task;
    if (!task) {
      // 任务刚结束：记录一次“完成”，并短暂停留展示
      if (this._liveTask && this._liveTask.v === v) {
        this._doneTask = { v, label: this._liveTask.label, t: performance.now() };
        this._liveTask = null;
      }
      if (this._doneTask && this._doneTask.v === v && performance.now() - this._doneTask.t < 2400) {
        banner.classList.remove('hidden');
        banner.classList.add('done');
        this.el.bannerTitle.textContent = `${v.name} · ${this._doneTask.label}`;
        this.el.bannerSub.textContent = '完成 ✓';
        this.el.bannerBar.style.width = '100%';
        this.el.bannerCancel.classList.add('hidden');
        return;
      }
      this._doneTask = null;
      banner.classList.add('hidden');
      banner.classList.remove('done');
      return;
    }
    this._liveTask = { v, label: `${ORDERS[task.type].verb}` };
    this._doneTask = null;
    banner.classList.remove('hidden');
    banner.classList.remove('done');
    const o = ORDERS[task.type];
    const key = `${v.id}_${task.type}_${task.stage}_${task.tx}_${task.ty}`;
    if (key !== this._lastBannerKey) {
      this._lastBannerKey = key;
      this.el.bannerTitle.textContent = `${v.name} · ${o.verb}`;
      this.el.bannerSub.textContent = task.stage === 'toWork' ? '正在赶过去…' : task.stage === 'working' ? '干活中' : '搬运中…';
      this.el.bannerCancel.classList.toggle('hidden', !task.byPlayer);
      this._setBannerAvatar(v);
    }
    const p = task.stage === 'working' ? task.progress : 0;
    this.el.bannerBar.style.width = `${Math.round(p * 100)}%`;
    if (task.stage === 'working') {
      this.el.bannerSub.textContent = { plow: '翻土中', plant: '播种中', water: '浇水', harvest: '收割', chop: '砍树', fish: '等鱼上钩', forage: '采集', eat: '吃东西', rest: '休息', chat: '聊天' }[task.type] || '干活中';
    } else if (task.stage === 'toWork') {
      this.el.bannerSub.textContent = '正在赶过去…';
    } else if (task.stage === 'deliver') {
      this.el.bannerSub.textContent = '搬回农舍…';
    }
    this.el.banner.classList.toggle('carry', task.stage === 'deliver');
  }

  _setBannerAvatar(v) {
    const av = this.el.bannerAv;
    av.innerHTML = '';
    const c = this.game.renderer.avatar(v, 30);
    av.appendChild(c);
  }

  // ---------- 村民卡片 ----------
  _rosterKey() {
    return this.sim.villagers.map((v) => v.uid).join(',');
  }

  _updateRoster(force = false) {
    const key = this._rosterKey();
    if (force || key !== this._rosterIds) {
      this._rosterIds = key;
      this._buildRoster();
    }
    for (const v of this.sim.villagers) {
      const card = this.el.cardWrap.querySelector(`[data-vid="${v.uid}"]`);
      if (!card) continue;
      const status = card.querySelector('.vc-status');
      const thought = card.querySelector('.vc-thought');
      const mood = card.querySelector('.vc-mood');
      const st = this._statusOf(v);
      if (status.textContent !== st) status.textContent = st;
      const th = v.speech ? `${v.speech.emoji} ${v.speech.text}` : `${v.thoughtEmoji} ${v.thought}`;
      if (thought.textContent !== th) thought.textContent = th;
      mood.textContent = v.moodEmoji;
      const dot = card.querySelector('.vc-dot');
      if (dot) dot.style.background = v.emotion.color;
      card.classList.toggle('selected', this.sim.selected === v);
      card.classList.toggle('busy', !!v.task);
      card.classList.toggle('sleeping', v.state === 'sleeping');
      const sat = card.querySelector('.vc-sat');
      if (sat) sat.style.width = `${Math.round(v.satisfaction)}%`;
    }
  }

  _statusOf(v) {
    if (v.state === 'sleeping') return '睡觉中';
    if (v.state === 'goingSleep') return '回家睡觉';
    if (v.task) {
      const o = ORDERS[v.task.type];
      if (v.task.stage === 'toWork') return `前往${o.verb}`;
      if (v.task.stage === 'working') return `${o.verb}中`;
      if (v.task.stage === 'deliver') return '搬运中';
    }
    if (v.state === 'wander') return '散步';
    if (v.needs.hunger > 70) return '饿了';
    if (v.needs.energy < 22) return '累了';
    return '空闲';
  }

  _buildRoster() {
    const wrap = this.el.cardWrap;
    wrap.innerHTML = '';
    for (const v of this.sim.villagers) {
      const card = document.createElement('button');
      card.className = 'vcard';
      card.dataset.vid = v.uid;
      card.type = 'button';
      card.innerHTML = `
        <div class="vc-top">
          <span class="vc-av"></span>
          ${v.lead ? '<span class="vc-lead">★</span>' : ''}
          <span class="vc-name">${v.name}</span>
          <i class="vc-dot"></i>
          <span class="vc-mood"></span>
        </div>
        <div class="vc-status"></div>
        <div class="vc-thought"></div>
        <div class="vc-bars">
          <span class="vc-sat"></span>
        </div>`;
      card.querySelector('.vc-av').appendChild(this.game.renderer.avatar(v, 30));
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        this.game.selectVillager(v);
      });
      wrap.appendChild(card);
    }
    this._rosterIds = this._rosterKey();
  }

  // ---------- 底部指令簿 ----------
  openSheetFor(v) {
    this.sim = this.game.sim;
    // 打开指令簿时先松开镜头，方便查看全村再选目标；选中目标后会自动跟拍
    this.game.follow = null;
    const body = this.el.sheetBody;
    this.el.sheetTitle.innerHTML = `<span class="sh-av"></span><span>${v.lead ? '<b class="lead-star">★</b> ' : ''}${v.name} <small>${v.role}</small></span>`;
    this.el.sheetTitle.querySelector('.sh-av').appendChild(this.game.renderer.avatar(v, 26));
    const seeds = Object.entries(this.sim.seeds).filter(([k]) => this.sim.seasonAllows(k))
      .map(([k, n]) => `${CROPS[k].name}×${n}`).join(' ') || '没有种子';
    const likes = v.likes.map((k) => ORDERS[k]?.name).filter(Boolean).join('、') || '无';
    const dislikes = v.dislikes.map((k) => ORDERS[k]?.name).filter(Boolean).join('、') || '无';
    const ev = emotionView(v.emo);
    const dom = ev.dominant;
    body.innerHTML = `
      <div class="sh-info">
        <div class="sh-needs">
          <div class="need"><span>🍞 饱食</span><b>${Math.round(100 - v.needs.hunger)}</b></div>
          <div class="nb"><i style="width:${Math.round(100 - v.needs.hunger)}%;background:#e8a04a"></i></div>
          <div class="need"><span>⚡ 精力</span><b>${Math.round(v.needs.energy)}</b></div>
          <div class="nb"><i style="width:${Math.round(v.needs.energy)}%;background:#5ab8e0"></i></div>
          <div class="need"><span>💬 社交</span><b>${Math.round(v.needs.social)}</b></div>
          <div class="nb"><i style="width:${Math.round(v.needs.social)}%;background:#d98aa8"></i></div>
          <div class="need"><span>🤝 满意度</span><b>${Math.round(v.satisfaction)}</b></div>
          <div class="nb"><i style="width:${Math.round(v.satisfaction)}%;background:#8ec46a"></i></div>
        </div>
        <div class="sh-emo">
          <div class="sh-emo-head"><span>此刻的情绪</span><b>${dom.emoji} ${dom.label} ${Math.round(dom.value)}</b></div>
          <div class="sh-emo-bars">
            ${ev.items.map((it) => `
              <div class="sh-emo-bar">
                <span><em>${it.emoji}${it.label}</em><b>${it.value}</b></span>
                <i><em style="width:${it.value}%;background:${it.color}"></em></i>
              </div>`).join('')}
          </div>
          <div class="sh-trust"><span>🤝 对你的信任</span><i><em style="width:${ev.trust}%"></em></i><b>${ev.trust}</b></div>
        </div>
        <button class="chat-cta" data-cmd="talk">
          <span class="cta-ic">💬</span>找他聊聊<small>现在心情：${dom.label}</small>
        </button>
        <div class="sh-meta">
          <p>${v.bio}</p>
          <p class="v-traits">性格：<em>${(v.traits || []).join(' · ') || '—'}</em></p>
          <p class="v-aspire">心愿：${v.aspiration || '—'}　·　此刻：${v.desire?.label || (v.task ? '正在干活' : '没特别想做的')}</p>
          <p class="likes">喜欢：<em>${likes}</em>　不喜欢：<em>${dislikes}</em></p>
          <p class="seeds">种子：<em>${seeds}</em>　·　完成${v.completed}件活</p>
          <p class="hintline">先点下方指令，再点地图上的地块 → 他会自己走过去干活</p>
        </div>
      </div>
      <div class="cmd-grid">
        <button class="cmd" data-cmd="plow"><span class="ic">⛏</span>开垦<small>把荒地翻成田</small></button>
        <button class="cmd" data-cmd="plant"><span class="ic">🌱</span>播种<small>自动选种子</small></button>
        <button class="cmd" data-cmd="water"><span class="ic">💧</span>浇水<small>让作物继续长</small></button>
        <button class="cmd" data-cmd="harvest"><span class="ic">🧺</span>收获<small>成熟后卖出</small></button>
      </div>
      <div class="cmd-row">
        <button class="cmd sm" data-cmd="chop"><span class="ic">🪓</span>砍树</button>
        <button class="cmd sm" data-cmd="fish"><span class="ic">🎣</span>钓鱼</button>
        <button class="cmd sm" data-cmd="forage"><span class="ic">🍄</span>采集</button>
        <button class="cmd sm" data-cmd="rest"><span class="ic">💤</span>歇会儿</button>
        <button class="cmd sm" data-cmd="chat"><span class="ic">💬</span>聊天</button>
        <button class="cmd sm ghost" data-cmd="cancel"><span class="ic">✕</span>停止</button>
      </div>
      <div class="order-tip" id="order-tip">选择一项指令开始</div>
    `;
    if (v.task && v.task.byPlayer) this.highlightMode(v.task.type);
    this.openSheet();
  }

  highlightMode(type) {
    const tip = $('#order-tip');
    $$('.cmd', this.el.sheetBody).forEach((b) => b.classList.toggle('active', b.dataset.cmd === type));
    if (tip) {
      tip.classList.remove('pick');
      tip.textContent = `已选「${ORDERS[type].name}」—— 点地图上的目标`;
      tip.classList.add('pick');
    }
  }

  openSheet() {
    this.el.sheet.classList.add('open');
    this.el.sheet.setAttribute('aria-hidden', 'false');
    document.body.classList.add('sheet-open');
  }

  closeSheet() {
    this.el.sheet.classList.remove('open');
    this.el.sheet.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('sheet-open');
    this.game.setMode(null);
  }

  _onSheetClick(e) {
    const b = e.target.closest('button[data-cmd]');
    if (!b) return;
    const cmd = b.dataset.cmd;
    const v = this.sim.selected;
    if (!v) return;
    this.game.audio.click();
    if (cmd === 'cancel') {
      v.cancelTask();
      this.toast('已停止');
      this.closeSheet();
      this.refreshNow();
      return;
    }
    // 不需要点地图的指令
    if (cmd === 'talk') {
      this.closeSheet();
      this.openChat(v);
      return;
    }
    if (cmd === 'rest') {
      const res = v.issueOrder('rest', v.x, v.y);
      this.game.afterOrder(res);
      if (res.ok) this.closeSheet();
      this.refreshNow();
      return;
    }
    if (cmd === 'chat') {
      const res = v.issueOrder('chat', 0, 0);
      this.game.afterOrder(res);
      if (res.ok) this.closeSheet();
      this.refreshNow();
      return;
    }
    if (cmd === 'fish') {
      const res = v.issueOrder('fish', 34, 13);
      this.game.afterOrder(res);
      if (res.ok) this.closeSheet();
      this.refreshNow();
      return;
    }
    // 需要选地块的指令
    this.game.setMode(cmd);
    this.highlightMode(cmd);
    this.toast(cmd === 'chop' ? '点一棵树' : '点一块地', 1400);
    this.closeSheetKeepMode();
  }

  closeSheetKeepMode() {
    this.el.sheet.classList.remove('open');
    this.el.sheet.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('sheet-open');
    // 进入“点选目标”阶段：镜头移动到相关区域，保证目标在屏幕内
    const mode = this.game.mode;
    const sim = this.sim;
    if (mode === 'chop') {
      const v = sim.selected;
      const trees = sim.world.trees.filter((t) => t.regrowAt <= sim.absHours);
      let best = null, bd = 1e9;
      for (const t of trees) {
        const d = v ? Math.hypot(t.x - v.x, t.y - v.y) : 0;
        if (d < bd) { bd = d; best = t; }
      }
      if (best) this.game.renderer.snapTo(best.x, best.y);
    } else if (mode) {
      this.game.renderer.snapTo(14, 13);
    }
  }

  // ---------- 聊天 ----------
  // ---------- 传令输入条 ----------
  _bindCommand() {
    this.el.cmdForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.el.cmdInput.value.trim();
      if (!text) return;
      this.el.cmdInput.value = '';
      this.game.runCommand(text);
    });
    this.el.cmdChips.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cmd]');
      if (!b) return;
      this.game.runCommand(b.dataset.cmd);
    });
  }

  commandFeedback(raw, res) {
    this._cmdMsg(`你：${raw}`, 'me');
    for (const m of (res.messages || [])) this._cmdMsg(m, 'sys');
    if (res.clarify) this._cmdMsg(`↳ ${res.clarify}`, 'sys');
    if (res.candidates?.length) this._cmdMsg(`可选：${res.candidates.join('、')}`, 'sys');
    this.el.cmdFeed.classList.add('show');
    this.el.cmdFeed.scrollTop = this.el.cmdFeed.scrollHeight;
  }

  commandReport(text) {
    this._cmdMsg(text, 'v');
    this.el.cmdFeed.classList.add('show');
    this.el.cmdFeed.scrollTop = this.el.cmdFeed.scrollHeight;
  }

  _cmdMsg(text, cls) {
    const d = document.createElement('div');
    d.className = cls;
    d.textContent = text;
    this.el.cmdFeed.appendChild(d);
    while (this.el.cmdFeed.children.length > 40) this.el.cmdFeed.removeChild(this.el.cmdFeed.firstChild);
  }

  openChat(v) {
    this.sim = this.game.sim;
    this.chatV = v;
    this.chatBusy = false;
    this.el.chat.classList.add('open');
    this.el.chat.setAttribute('aria-hidden', 'false');
    document.body.classList.add('chat-open');

    const dom = v.emotion;
    this.el.chatName.textContent = v.name;
    this.el.chatRole.textContent = `${v.role} · 现在${dom.label}`;
    this.el.chatAv.innerHTML = '';
    this.el.chatAv.appendChild(this.game.renderer.avatar(v, 38));
    this._renderChatEmotions();
    this._renderChatTopics();

    this.el.chatLog.innerHTML = '';
    const conv = v.memory.conversation || [];
    if (!conv.length) {
      const hi = buildGreeting(v);
      this._chatAppend('v', hi);
      v.memory.conversation = [{ who: 'v', text: hi, emoji: v.emotion.emoji, at: Date.now() }];
    } else {
      for (const m of conv.slice(-14)) this._chatAppend(m.who, m.text);
    }
    this._chatScroll();
    this.el.chatText.value = '';
    // 让镜头跟住他，关闭聊天时正好能看到他
    this.game.follow = v;
    this.game.renderer.focusOn(v.x, v.y);
  }

  closeChat() {
    this.el.chat.classList.remove('open');
    this.el.chat.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('chat-open');
    this.chatV = null;
    this.chatBusy = false;
    this.refreshNow();
  }

  _renderChatEmotions() {
    const v = this.chatV;
    if (!v) return;
    const ev = emotionView(v.emo);
    this.el.chatEmo.innerHTML = ev.items.map((it) => `
      <div class="emo-pill ${it.active ? 'on' : ''}">
        <div class="ep-top"><span>${it.emoji}${it.label}</span><b>${it.value}</b></div>
        <div class="ep-bar"><i style="width:${it.value}%;background:${it.color}"></i></div>
      </div>`).join('') + `
      <div class="emo-pill trust ${v.emo.trust > 65 ? 'on' : ''}">
        <div class="ep-top"><span>🤝信任</span><b>${ev.trust}</b></div>
        <div class="ep-bar"><i style="width:${ev.trust}%;background:#8ec46a"></i></div>
      </div>`;
    this.el.chatRole.textContent = `${v.role} · 现在${ev.dominant.label}`;
  }

  _renderChatTopics() {
    this.el.chatTopics.innerHTML = CHAT_TOPICS.map((t) =>
      `<button type="button" class="topic-chip" data-topic="${t.id}">${t.icon}${t.label}</button>`
    ).join('');
  }

  _chatScroll() {
    const l = this.el.chatLog;
    l.scrollTop = l.scrollHeight;
  }

  _chatAppend(who, text) {
    const v = this.chatV;
    if (!v) return null;
    const row = document.createElement('div');
    row.className = `msg ${who === 'me' ? 'me' : 'v'}`;
    if (who !== 'me') {
      const av = document.createElement('span');
      av.className = 'm-av';
      av.appendChild(this.game.renderer.avatar(v, 22));
      row.appendChild(av);
    }
    const b = document.createElement('div');
    b.className = 'm-bubble';
    b.textContent = text;
    row.appendChild(b);
    this.el.chatLog.appendChild(row);
    this._chatScroll();
    return row;
  }

  _chatTyping() {
    const row = document.createElement('div');
    row.className = 'msg v typing';
    const av = document.createElement('span');
    av.className = 'm-av';
    av.appendChild(this.game.renderer.avatar(this.chatV, 22));
    row.appendChild(av);
    const b = document.createElement('div');
    b.className = 'm-bubble';
    b.textContent = '· · ·';
    row.appendChild(b);
    this.el.chatLog.appendChild(row);
    this._chatScroll();
    return row;
  }

  _chatSendTopic(topicId) {
    const v = this.chatV;
    if (!v || this.chatBusy) return;
    this.game.audio.click();
    const res = buildTalk(v, topicId);
    this._chatAppend('me', res.said);
    this._afterTalk(v, res);
  }

  _chatSendFree() {
    const v = this.chatV;
    const text = this.el.chatText.value.trim();
    if (!v || !text || this.chatBusy) return;
    this.el.chatText.value = '';
    const topic = matchIntent(text) || 'chat';
    const res = buildTalk(v, topic, text);
    this._chatAppend('me', res.said);
    this._afterTalk(v, res);
  }

  _afterTalk(v, res) {
    this.chatBusy = true;
    const typing = this._chatTyping();
    setTimeout(() => {
      if (typing && typing.parentElement) typing.remove();
      if (!this.chatV) return;
      this._chatAppend('v', res.reply);
      v.feel(res.feel, res.mult || 1);
      v.say(res.reply.split('\n')[0].slice(0, 34), res.emoji, 6);
      this._renderChatEmotions();
      this._renderChatTopics();
      this.refreshNow();
      this.chatBusy = false;
      this._chatScroll();
    }, 380 + Math.random() * 320);
  }

  // ---------- 集市 ----------
  openShop(tab = 'seed') {
    this.sim = this.game.sim;
    const body = this.el.sheetBody;
    this.el.sheetTitle.innerHTML = '🏪 集市 <small>买种子 / 卖收成</small>';
    body.innerHTML = `
      <div class="tabs">
        <button class="tab ${tab === 'seed' ? 'on' : ''}" data-tab="seed">种子</button>
        <button class="tab ${tab === 'goods' ? 'on' : ''}" data-tab="goods">仓库</button>
        <button class="tab ${tab === 'clothes' ? 'on' : ''}" data-tab="clothes">服装</button>
        <button class="tab ${tab === 'settings' ? 'on' : ''}" data-tab="settings">设置</button>
      </div>
      <div class="tab-body" id="tab-body"></div>`;
    body.querySelector('.tabs').addEventListener('click', (e) => {
      const t = e.target.closest('[data-tab]');
      if (!t) return;
      body.querySelectorAll('.tab').forEach((x) => x.classList.toggle('on', x === t));
      this._renderShopTab(t.dataset.tab);
    });
    this._renderShopTab(tab);
    this.openSheet();
  }

  _renderShopTab(tab) {
    const sim = this.sim;
    const box = $('#tab-body', this.el.sheetBody);
    if (!box) return;
    if (tab === 'seed') {
      const cards = Object.entries(CROPS).map(([k, c]) => {
        const allowed = sim.seasonAllows(k);
        return `<div class="shop-item ${allowed ? '' : 'off'}">
          <span class="si-ic">${cropIcon(k)}</span>
          <div class="si-main"><b>${c.name}种子</b><small>${c.grow}小时成熟 · 卖 ${c.sell}G</small></div>
          <button class="buy" data-buy="${k}" ${allowed && sim.money >= c.seedCost ? '' : 'disabled'}>${c.seedCost}G</button>
        </div>`;
      }).join('');
      box.innerHTML = `<div class="shop-grid">${cards}</div>
        <div class="shop-foot">你有 <b>${sim.money}G</b> · 当前持有：${Object.entries(sim.seeds).map(([k, n]) => `${CROPS[k]?.name || k}×${n}`).join(' ') || '无'}</div>
        <div class="shop-foot muted">冬季无法播种，注意季节更替。</div>`;
      box.querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', () => {
        const res = sim.buySeed(b.dataset.buy, 1);
        this.toast(res.msg || '买好了');
        if (res.ok) this.game.audio.coin();
        this.refreshNow();
        this._renderShopTab('seed');
      }));
    } else if (tab === 'goods') {
      const items = Object.entries(sim.inventory).filter(([k, n]) => n > 0 && k !== 'bread');
      const itemsHtml = items.length
        ? `<div class="shop-grid">${items.map(([k, n]) => `
            <div class="shop-item"><span class="si-ic">${itemIcon(k)}</span>
              <div class="si-main"><b>${sim.itemName(k)} ×${n}</b><small>单价 ${sim.itemPrice(k)}G</small></div>
              <button class="buy" data-sell="${k}">卖 ${sim.itemPrice(k) * n}G</button>
            </div>`).join('')}</div>
            <div class="shop-actions"><button class="btn-primary" id="sell-all">全部卖出</button></div>`
        : `<div class="empty">仓库空空的。让村民去收获、砍树、钓鱼，东西会自动进仓。</div>`;

      // 一次性把完整结构写好，再统一挂事件，避免 innerHTML 重排把监听冲掉
      box.innerHTML = `${itemsHtml}
        <div class="shop-foot">自动出售：<button class="toggle ${sim.autoSell ? 'on' : ''}" id="toggle-autosell">${sim.autoSell ? '开' : '关'}</button>　开启后收获会直接换钱。</div>
        <div class="shop-grid" style="margin-top:10px"><div class="shop-item">
          <span class="si-ic">🍞</span><div class="si-main"><b>面包 ×${sim.inventory.bread || 0}</b><small>村民饿了会自己吃</small></div>
          <button class="buy" data-bread="1">买 8G</button>
        </div></div>`;

      box.querySelectorAll('[data-sell]').forEach((b) => b.addEventListener('click', () => {
        const k = b.dataset.sell;
        const n = sim.inventory[k] || 0;
        if (sim.sellItem(k, n).ok) { this.game.audio.coin(); this.toast(`卖出 +${sim.itemPrice(k) * n}G`); }
        this.refreshNow(); this._renderShopTab('goods');
      }));
      const all = $('#sell-all', box);
      if (all) all.addEventListener('click', () => {
        const r = sim.sellAll();
        this.toast(r.msg || '卖完了');
        if (r.ok) this.game.audio.coin();
        this.refreshNow(); this._renderShopTab('goods');
      });
      const tg = $('#toggle-autosell', box);
      if (tg) tg.addEventListener('click', () => {
        sim.autoSell = !sim.autoSell;
        this.toast(sim.autoSell ? '收获自动出售：开' : '收获自动出售：关');
        this._renderShopTab('goods');
      });
      const bb = box.querySelector('[data-bread]');
      if (bb) bb.addEventListener('click', () => {
        const r = sim.buyBread(1);
        this.toast(r.ok ? '买了个面包' : r.msg);
        if (r.ok) this.game.audio.coin();
        this._renderShopTab('goods'); this.refreshNow();
      });
    } else if (tab === 'hire') {
      const avail = sim.hirePool.filter((d) => !sim.villagers.some((v) => v.id === d.id));
      if (!avail.length) {
        box.innerHTML = `<div class="empty">暂时没有新的人了。把小镇经营好，也许还有人愿意来。</div>`;
      } else {
        box.innerHTML = `<div class="shop-grid">${avail.map((d) => `
          <div class="shop-item hire">
            <span class="si-ic">${d.name[0]}</span>
            <div class="si-main"><b>${d.name} <small>${d.role}</small></b><small>${d.bio}</small></div>
            <button class="buy" data-hire="${d.id}" ${sim.money >= d.cost ? '' : 'disabled'}>${d.cost}G</button>
          </div>`).join('')}</div>`;
        box.querySelectorAll('[data-hire]').forEach((b) => b.addEventListener('click', () => {
          const def = sim.hirePool.find((d) => d.id === b.dataset.hire);
          if (!def) return;
          const r = sim.hire(def);
          if (r.ok) {
            this.game.audio.chime();
            this.toast(`${def.name} 加入了小镇！`);
            this._buildRoster();
            this.refreshNow();
            this._renderShopTab('hire');
          } else this.toast(r.msg);
        }));
      }
    } else if (tab === 'clothes') {
      box.innerHTML = `<div class="cloth-tip">每到新阶段解锁新时装；买下后立即换上，头像和地图上的小人都会变。</div>`
        + sim.villagers.map((v) => `
          <h4 class="cloth-name">${v.name}</h4>
          <div class="cloth-grid">
            ${sim.outfitList(v.id).map((o) => {
              const owned = sim.hasOutfit(v.id, o.id);
              const worn = sim.equippedOutfit[v.id] === o.id;
              const locked = sim.stageIndex < o.stage;
              const canBuy = !locked && sim.money >= o.price;
              return `<div class="cloth-card ${worn ? 'on' : ''} ${locked ? 'locked' : ''}">
                <canvas class="cloth-prev" data-v="${v.id}" data-o="${o.id}" width="72" height="78"></canvas>
                <b>${o.name}</b>
                <small>${o.desc}</small>
                <div class="cloth-foot">
                  ${worn ? '<span class="worn">已穿</span>'
                    : owned ? `<button class="buy" data-wear="${v.id}:${o.id}">穿上</button>`
                    : `<button class="buy" data-buyfit="${v.id}:${o.id}" ${canBuy ? '' : 'disabled'}>${locked ? `第 ${o.stage} 阶段` : `${o.price}G`}</button>`}
                </div>
              </div>`;
            }).join('')}
          </div>`).join('');
      // 小预览：用当前服装部件画 22×22 精灵
      box.querySelectorAll('.cloth-prev').forEach((cv) => {
        const v = sim.villagers.find((x) => x.id === cv.dataset.v);
        const def = sim.outfitDef(cv.dataset.v, cv.dataset.o);
        if (!v || !def) return;
        const colors = { ...v.baseColors, ...(def.c || {}), id: `${v.id}:${def.id}`, appearanceKey: def.id };
        const spr = this.game.renderer.sprites.get(colors, 'down', 'idle', 0);
        const g = cv.getContext('2d');
        g.imageSmoothingEnabled = false;
        g.drawImage(spr, 0, 0, 22, 22, 3, 3, 66, 66);
      });
      box.querySelectorAll('[data-buyfit]').forEach((b) => b.addEventListener('click', () => {
        const [id, oid] = b.dataset.buyfit.split(':');
        const r = sim.buyOutfit(id, oid);
        this.toast(r.msg);
        if (r.ok) this.game.audio.coin();
        this.refreshNow();
        this._renderShopTab('clothes');
      }));
      box.querySelectorAll('[data-wear]').forEach((b) => b.addEventListener('click', () => {
        const [id, oid] = b.dataset.wear.split(':');
        const r = sim.equipOutfit(id, oid);
        this.toast(r.msg);
        this.refreshNow();
        this._renderShopTab('clothes');
      }));
    } else if (tab === 'settings') {
      const cfg = loadAIConfig();
      box.innerHTML = `
        <div class="settings">
          <div class="set-row"><span>自动出售收获</span><button class="toggle ${sim.autoSell ? 'on' : ''}" data-set="autosell">${sim.autoSell ? '开' : '关'}</button></div>
          <div class="set-row"><span>夜晚自动跳过${sim.stageFlags?.autoskip ? '' : '（未解锁）'}</span><button class="toggle ${sim.autoSkipNight && sim.stageFlags?.autoskip ? 'on' : ''}" data-set="skipnight">${sim.autoSkipNight && sim.stageFlags?.autoskip ? '开' : '关'}</button></div>
          <div class="set-row"><span>音效</span><button class="toggle ${this.game.audio.enabled ? 'on' : ''}" data-set="sound">${this.game.audio.enabled ? '开' : '关'}</button></div>
          <div class="set-row"><span>重新开始（清空存档）</span><button class="danger" data-set="reset">重置</button></div>
          <div class="set-row"><span>新手引导</span><button class="ghost" data-set="tutorial">再看一遍</button></div>
        </div>
        <div class="ai-box">
          <b>AI · 小伟 & 小杨自主对话</b>
          <div class="ai-field"><label>服务</label><select id="ai-provider">
            <option value="ark">火山方舟（Ark）</option>
            <option value="deepseek">DeepSeek</option>
          </select></div>
          <div class="ai-field"><label>API Key</label><input id="ai-key" type="password" placeholder="sk-..." autocomplete="off"></div>
          <div class="ai-field"><label>模型</label><input id="ai-model" value="${cfg.model}" autocomplete="off"></div>
          <div class="ai-actions">
            <button class="btn-primary" data-set="ai-save">保存</button>
            <button class="ghost" data-set="ai-clear">清除本机 Key</button>
            <button class="ghost" data-set="ai-test">测试连接</button>
            <button class="ghost" data-set="ai-talk">让他们聊聊</button>
            <button class="toggle ${cfg.auto ? 'on' : ''}" data-set="ai-auto">自动：${cfg.auto ? '开' : '关'}</button>
          </div>
          <div class="ai-status" id="ai-status">关系 小伟 ♥ 小杨 <b>${Math.round(sim.bond ?? 50)}</b> · ${cfg.key
            ? (cfg.provider === 'ark' && !cfg.key.startsWith('ark-') ? '⚠ Key 格式不对（Ark 应为 ark- 开头）' : 'Key 已保存在本机')
            : '未填 Key（服务端可配 ARK_API_KEY / DEEPSEEK_API_KEY）'}</div>
          <div class="ai-story" id="ai-story"></div>
        </div>
        <div class="stats-grid">
          <div><b>${sim.stats.harvested}</b><span>累计收获</span></div>
          <div><b>${sim.stats.earned}</b><span>累计收入(G)</span></div>
          <div><b>${sim.stats.planted}</b><span>播种次数</span></div>
          <div><b>${sim.stats.wood}</b><span>木头</span></div>
        </div>`;
      box.querySelector('#ai-key').value = cfg.key;
      box.querySelector('#ai-provider').value = cfg.provider;
      box.querySelector('#ai-provider').addEventListener('change', (e) => {
        const p = e.target.value;
        const keyInput = box.querySelector('#ai-key');
        const modelInput = box.querySelector('#ai-model');
        if (p === 'ark' && keyInput.value && !keyInput.value.startsWith('ark-')) keyInput.value = '';
        if (p === 'deepseek' && keyInput.value && !keyInput.value.startsWith('sk-')) keyInput.value = '';
        if (p === 'ark' && (!modelInput.value || modelInput.value === 'deepseek-chat')) {
          modelInput.value = 'deepseek-v4-1-flash-261017';
        }
        if (p === 'deepseek' && modelInput.value === 'deepseek-v4-1-flash-261017') {
          modelInput.value = 'deepseek-chat';
        }
      });
      const storyBox = box.querySelector('#ai-story');
      for (const s of (sim.story || []).slice(-3)) {
        const d = document.createElement('div');
        d.textContent = `${s.speaker}：${s.line} ／ 小杨：${s.reply}`;
        storyBox.appendChild(d);
      }
      box.querySelectorAll('[data-set]').forEach((b) => b.addEventListener('click', async () => {
        const k = b.dataset.set;
        if (k === 'autosell') { sim.autoSell = !sim.autoSell; this._renderShopTab('settings'); }
        if (k === 'skipnight') {
          if (!sim.stageFlags?.autoskip) { this.toast('夜晚自动跳过还没解锁：先播种 3 次'); return; }
          sim.autoSkipNight = !sim.autoSkipNight;
          this._renderShopTab('settings');
        }
        if (k === 'sound') { this.game.audio.toggle(); b.classList.toggle('on', this.game.audio.enabled); b.textContent = this.game.audio.enabled ? '开' : '关'; }
        if (k === 'tutorial') { this.closeSheet(); this.game.ui.showTutorial(true); }
        if (k === 'reset') {
          if (confirm('确定要清空存档重新开始吗？')) {
            this.game.reset();
            this.closeSheet();
          }
        }
        if (k === 'ai-save') {
          const provider = box.querySelector('#ai-provider').value;
          saveAIConfig({
            provider,
            base: provider === 'ark'
              ? 'https://ark.cn-beijing.volces.com/api/v3'
              : 'https://api.deepseek.com',
            key: box.querySelector('#ai-key').value.trim(),
            model: box.querySelector('#ai-model').value.trim()
              || (provider === 'ark' ? 'deepseek-v4-1-flash-261017' : 'deepseek-chat'),
          });
          this.toast('已保存 AI 设置');
          this._renderShopTab('settings');
        }
        if (k === 'ai-clear') {
          saveAIConfig({ key: '' });
          box.querySelector('#ai-key').value = '';
          this.toast('已清除本机 Key，将使用服务端 Key');
        }
        if (k === 'ai-auto') {
          saveAIConfig({ auto: !cfg.auto });
          this._renderShopTab('settings');
        }
        if (k === 'ai-test') {
          b.disabled = true; b.textContent = '测试中…';
          try {
            const txt = await testAI();
            this.toast(`连接成功：${txt}`);
          } catch (e) {
            this.toast(`连接失败：${e.message}`);
          }
          b.disabled = false; b.textContent = '测试连接';
        }
        if (k === 'ai-talk') {
          this.toast('正在让小伟和小杨聊天…');
          await this.game.triggerAITalk();
        }
      }));
    }
  }

  // ---------- 其他面板 ----------
  openVillagerList() {
    this.closeSheet();
    const v = this.sim.selected || this.sim.villagers[0];
    if (v) this.game.selectVillager(v, true);
  }

  openStats() {
    this.sim = this.game.sim;
    const sim = this.sim;
    this.el.sheetTitle.innerHTML = '📋 小镇档案';
    this.el.sheetBody.innerHTML = `
      <div class="stats-hero">
        <div><b>${sim.stats.harvested}</b><span>收获</span></div>
        <div><b>${sim.money}</b><span>金币</span></div>
        <div><b>${sim.stats.daysPlayed}</b><span>天数</span></div>
        <div><b>${sim.villagers.length}</b><span>村民</span></div>
      </div>
      <div class="stage-row">
        <b>当前阶段：${sim.currentStage.name}</b>
        <small>${sim.stageIndex}/${STAGES.length} · ${sim.nextStage ? `下一阶段：${sim.nextStage.cond} → ${sim.nextStage.unlock}` : '已全部解锁'}</small>
      </div>
      <h4>村民状态</h4>
      ${sim.villagers.map((v) => `
        <div class="stat-v">
          <span class="sv-av"></span>
          <div class="sv-main"><b>${v.name} <small>${v.role}</small></b><small>${v.thought}</small></div>
          <div class="sv-mood">${v.moodEmoji}</div>
        </div>`).join('')}
      <h4>成就 ${sim.unlockedCount}/${sim.achievementList().length}</h4>
      <div class="ach-grid">
        ${sim.achievementList().map((a) => `
          <div class="ach ${sim.achievements[a.id] ? 'on' : ''}">
            <b>${sim.achievements[a.id] ? '🏆' : '🔒'} ${a.name}</b>
            <small>${a.desc}</small>
          </div>`).join('')}
      </div>
      <h4>近期事件</h4>
      <div class="log-list">${sim.logs.slice(-14).reverse().map((l) => `<div class="log-line t-${l.type}">${l.text}</div>`).join('') || '<div class="empty">还没有事件</div>'}</div>
      <div class="panel-actions"><button class="btn-primary" id="close-stats">知道了</button></div>`;
    this.el.sheetBody.querySelectorAll('.sv-av').forEach((s, i) => s.appendChild(this.game.renderer.avatar(sim.villagers[i], 28)));
    this.el.sheetBody.querySelector('#close-stats').addEventListener('click', () => this.closeSheet());
    this.openSheet();
  }

  // ---------- 世界地图 ----------
  openMap() {
    this.sim = this.game.sim;
    this._renderMapRegions();
    this._drawMap();
    this.el.mapOverlay.classList.remove('hidden');
    this.game.audio.click();
  }

  closeMap() {
    this.el.mapOverlay.classList.add('hidden');
  }

  _renderMapRegions() {
    const sim = this.sim;
    this.el.mapCurrent.textContent = `当前：${sim.regionById(sim.currentRegion)?.name || ''}`;
    this.el.mapRegions.innerHTML = sim.regions.map((r) => {
      const unlocked = sim.isRegionUnlocked(r.id);
      const current = sim.currentRegion === r.id;
      const need = r.unlock?.harvest ? `累计收获 ${r.unlock.harvest} 次` : r.unlock?.day ? `第 ${r.unlock.day} 天解锁` : '';
      return `<button class="map-region ${unlocked ? '' : 'locked'} ${current ? 'current' : ''}" data-region="${r.id}" ${unlocked ? '' : 'disabled'}>
        <b>${unlocked ? '' : '🔒 '}${r.name}</b>
        <small>${unlocked ? r.desc : `解锁：${need}`}</small>
      </button>`;
    }).join('');
    this.el.mapRegions.querySelectorAll('[data-region]').forEach((b) => {
      b.addEventListener('click', () => {
        const r = sim.regionById(b.dataset.region);
        if (r) this.game.fastTravel(r);
      });
    });
  }

  _drawMap() {
    const sim = this.sim;
    const w = sim.world;
    const c = this.el.mapCanvas;
    const g = c.getContext('2d');
    const S = c.width / w.w; // 8
    g.imageSmoothingEnabled = false;
    const COL = ['#6fa84e', '#8a6a45', '#c8a878', '#3f7fa8', '#d8c48a', '#8a5a3a', '#9a948a'];
    for (let y = 0; y < w.h; y++) {
      for (let x = 0; x < w.w; x++) {
        const t = w.tiles[w.idx(x, y)];
        g.fillStyle = COL[t] || COL[0];
        g.fillRect(Math.floor(x * S), Math.floor(y * S), Math.ceil(S), Math.ceil(S));
      }
    }
    // 区域色与边界
    for (const r of sim.regions) {
      const unlocked = sim.isRegionUnlocked(r.id);
      g.globalAlpha = unlocked ? 0.16 : 0.30;
      g.fillStyle = unlocked ? r.color : '#1a1a1a';
      g.fillRect(r.x0 * S, r.y0 * S, (r.x1 - r.x0 + 1) * S, (r.y1 - r.y0 + 1) * S);
      g.globalAlpha = 1;
      g.strokeStyle = unlocked ? 'rgba(255,240,200,0.35)' : 'rgba(0,0,0,0.5)';
      g.lineWidth = 1;
      g.strokeRect(r.x0 * S + 0.5, r.y0 * S + 0.5, (r.x1 - r.x0 + 1) * S - 1, (r.y1 - r.y0 + 1) * S - 1);
      g.font = 'bold 11px sans-serif';
      g.textAlign = 'left';
      const label = `${unlocked ? '' : '🔒 '}${r.name}`;
      const tw = g.measureText(label).width;
      g.fillStyle = 'rgba(18,26,16,0.62)';
      g.fillRect(r.x0 * S + 3, r.y0 * S + 2, tw + 8, 16);
      g.fillStyle = unlocked ? 'rgba(255,248,225,0.95)' : 'rgba(200,200,200,0.6)';
      g.fillText(label, r.x0 * S + 7, r.y0 * S + 14);
    }
    // 建筑
    g.fillStyle = '#3a2a20';
    for (const s of w.structures) {
      if (s.type === 'mine') {
        g.fillStyle = '#c8a020';
        g.fillRect(s.x * S, s.y * S, s.w * S, s.h * S);
        g.fillStyle = '#3a2a20';
        continue;
      }
      g.fillRect(s.x * S, s.y * S, Math.max(1, s.w * S), Math.max(1, s.h * S));
    }
    // 树、石头、采集点
    g.fillStyle = '#2f5f38';
    for (const t of w.trees) g.fillRect(t.x * S + 1, t.y * S + 1, S - 2, S - 2);
    g.fillStyle = '#a8a8a8';
    for (const r of w.rocks) if (!r.mined) g.fillRect(r.x * S + 1, r.y * S + 1, S - 2, S - 2);
    g.fillStyle = '#e0c060';
    for (const f of w.forages) if (!f.taken) g.fillRect(f.x * S + 3, f.y * S + 3, 2, 2);
    // 钓鱼点
    g.fillStyle = '#8fd8f0';
    for (const f of w.fishSpots) g.fillRect(f.x * S - 1, f.y * S - 1, 3, 3);
    // 村民
    for (const v of sim.villagers) {
      g.fillStyle = v.id === 'xiaowei' || v.id === 'xiaoyang' ? '#ffe08a' : '#f2e2c8';
      g.fillRect(v.x * S - 1, v.y * S - 1, 3, 3);
    }
    // 镜头
    const cam = this.game.renderer.cam;
    g.strokeStyle = '#ffffff';
    g.lineWidth = 1.5;
    g.strokeRect(cam.x * S - 6, cam.y * S - 6, 12, 12);
    g.fillStyle = '#ffffff';
    g.fillRect(cam.x * S - 1, cam.y * S - 1, 2, 2);
  }

  // ---------- 每日委托 ----------
  openQuests() {
    this.sim = this.game.sim;
    const sim = this.sim;
    this.el.sheetTitle.innerHTML = '📜 每日委托 <small>每天清晨刷新</small>';
    const body = this.el.sheetBody;
    const render = () => {
      const cards = sim.quests.map((q) => {
        const p = Math.min(sim.questProgress(q), q.need);
        const ready = sim.questReady(q);
        return `<div class="quest-card ${q.claimed ? 'done' : ready ? 'ready' : ''}">
          <div class="q-icon">${q.icon}</div>
          <div class="q-main">
            <b>${q.title}</b>
            <div class="q-bar"><i style="width:${Math.round((p / q.need) * 100)}%"></i></div>
            <small>${q.claimed ? '已领取' : `${p} / ${q.need}`} · 奖励 ${q.reward}G · 信任 +${q.trust}</small>
          </div>
          <button class="buy" data-claim="${q.id}" ${ready ? '' : 'disabled'}>${q.claimed ? '已完成' : ready ? '领取' : '进行中'}</button>
        </div>`;
      }).join('');
      const done = sim.quests.filter((q) => q.claimed).length;
      body.innerHTML = `<div class="quest-list">${cards}</div>
        <div class="shop-foot">今日已完成 ${done}/${sim.quests.length} · 每天清晨刷新新的委托</div>
        <div class="shop-foot muted">委托看的是“今天做了什么”：收获、钓鱼、砍树、浇水、采集、聊天都会计入，不需要把东西留在仓库。</div>`;
      body.querySelectorAll('[data-claim]').forEach((b) => b.addEventListener('click', () => {
        const q = sim.quests.find((x) => x.id === b.dataset.claim);
        const r = sim.claimQuest(q);
        this.toast(r.msg);
        if (r.ok) this.game.audio.coin();
        this.refreshNow();
        render();
      }));
    };
    render();
    this.openSheet();
  }

  openHelp() {
    this.el.sheetTitle.innerHTML = '❓ 怎么玩';
    this.el.sheetBody.innerHTML = `
      <div class="help">
        <div class="help-step"><b>1</b><p>点下方村民卡片，选中他。地图上会出现金色光圈。</p></div>
        <div class="help-step"><b>2</b><p>在指令簿里选「开垦 / 播种 / 浇水 / 收获」，再点田里的一块地。</p></div>
        <div class="help-step"><b>3</b><p>他会自己走田埂过去，你全程能看见他的动作、进度和想法。</p></div>
        <div class="help-step"><b>4</b><p>作物只在土湿的时候长，水干了要再浇。成熟后闪着光就能收。</p></div>
        <div class="help-step"><b>5</b><p>赚到的钱去集市买种子、接委托。小伟和小杨性格不同，干活快慢和心情都不一样。</p></div>
        <div class="help-step"><b>6</b><p>点「找他聊聊」能和每个村民说话。夸他、关心他、送吃的、道歉，都会改变他的情绪；五种情绪各自独立，脾气也各不相同。</p></div>
        <div class="help-step"><b>7</b><p>每天清晨刷新 3 份委托，点底部「委托」或集市旁的木板领取。雨天自动浇水，暴雨天不能钓鱼砍树。</p></div>
        <div class="help-step"><b>8</b><p>底部输入框可以直接说人话：“让小伟把3号地浇一下”“把干的地都浇了”“都停下”。只说“浇一下”会被反问，补一句“全部”或“西边”就行；干完村民会在输入框上方汇报。</p></div>
        <div class="help-step"><b>9</b><p>顶栏 🗺 打开世界地图：青禾村、河边渔村、后山林地、清溪河岸。后山累计收获 10 次解锁，清溪第 2 天解锁；点已解锁区域可以快速前往。说“去后山挖两块矿”会自动找矿点。</p></div>
        <div class="help-step"><b>10</b><p>牧场有鸡、鸭、鹅、牛、羊，会自己在圈里和水边溜达并积累鸡蛋、牛奶、羊毛。说“收蛋 / 挤奶 / 剪羊毛”，村民会去收回来。</p></div>
        <div class="hint-card">
          <b>小提示</b>
          <ul>
            ${TIPS.map((t) => `<li>${t}</li>`).join('')}
            <li>拖动地图可以平移，双指/滚轮缩放。</li>
            <li>1 倍速下，游戏里 1 小时 = 现实中 5 秒，一整天约 2 分钟。</li>
          </ul>
        </div>
        <div class="panel-actions"><button class="btn-primary" id="help-close">开始种田</button></div>
      </div>`;
    this.el.sheetBody.querySelector('#help-close').addEventListener('click', () => this.closeSheet());
    this.openSheet();
  }

  // ---------- 反馈 ----------
  toast(text, dur = 2000) {
    const t = this.el.toast;
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), dur);
  }

  showBubble(text, x, y) {
    // 保留接口
  }

  hint(text) {
    const h = this.el.hint;
    if (!text) { h.classList.remove('show'); return; }
    h.textContent = text;
    h.classList.add('show');
  }

  showDayCard(day, seasonName, onDone, summary) {
    const d = this.el.dayCard;
    const sum = summary
      ? `<div class="dc-sum">昨日收入 +${summary.earned}G · 收获 ${summary.harvested} · 完成委托 ${summary.quests}</div>`
      : '';
    d.innerHTML = `<div class="dc-inner"><div class="dc-season">${seasonName}季</div><div class="dc-day">第 ${day} 天</div><div class="dc-line"></div>${sum}</div>`;
    d.classList.add('show');
    setTimeout(() => {
      d.classList.remove('show');
      if (onDone) onDone();
    }, 2200);
  }

  showStageCard(stage, index) {
    const d = this.el.dayCard;
    d.innerHTML = `<div class="dc-inner"><div class="dc-season">阶段 ${index}</div><div class="dc-day">${stage.name}</div><div class="dc-line"></div><div class="dc-sum">解锁：${stage.unlock}</div></div>`;
    d.classList.add('show');
    setTimeout(() => d.classList.remove('show'), 2600);
  }

  // ---------- 新手引导 ----------
  showTutorial(force = false) {
    if (!force && localStorage.getItem('farm_tutorial_done')) return;
    const tut = this.el.tutorial;
    const steps = [
      { t: '欢迎来到田园小镇', d: '你是这片新村庄的东家。村民们各有各的脑子和脾气——你发号施令，他们自己动手，而你全程看得见。', b: '开始' },
      { t: '第一步：选人', d: '点屏幕下方的村民卡片。选中的村民头顶会有金色光圈，脚下出现他的想法。', b: '继续' },
      { t: '第二步：派活', d: '在指令簿里点「开垦」，然后点田里一块草地。他会沿着田埂走过去，一锄一锄把土翻开——你可以看到锄头起落和进度环。', b: '继续' },
      { t: '第三步：种下去', d: '开垦完再点「播种」。种子埋下后要浇水，土湿的时候作物才会长。成熟的地块会闪光。', b: '继续' },
      { t: '第四步：聊聊他', d: '点「找他聊聊」，可以夸他、关心他、送吃的，也可以直接打字。每个人都有自己的情绪——高兴、恼火、低落、不安、疲惫，会随着发生的事真的改变，也会改变他说话的语气和干活的状态。', b: '知道了' },
    ];
    let i = 0;
    const render = () => {
      const s = steps[i];
      tut.innerHTML = `<div class="tut-card">
        <div class="tut-dots">${steps.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
        <h3>${s.t}</h3><p>${s.d}</p>
        <div class="tut-actions"><button class="btn-primary" id="tut-next">${s.b}</button>${i > 0 ? '<button class="ghost sm" id="tut-skip">跳过</button>' : ''}</div>
      </div>`;
      tut.classList.add('show');
      tut.querySelector('#tut-next').addEventListener('click', () => {
        i++;
        if (i >= steps.length) { tut.classList.remove('show'); localStorage.setItem('farm_tutorial_done', '1'); return; }
        render();
      });
      const sk = tut.querySelector('#tut-skip');
      if (sk) sk.addEventListener('click', () => { tut.classList.remove('show'); localStorage.setItem('farm_tutorial_done', '1'); });
    };
    render();
  }
}

function cropIcon(k) {
  return { radish: '🌱', turnip: '🌿', carrot: '🥕', strawberry: '🍓', pumpkin: '🎃' }[k] || '🌱';
}
function itemIcon(k) {
  if (CROPS[k]) return cropIcon(k);
  return { wood: '🪵', fish: '🐟', mushroom: '🍄', berry: '🫐', bread: '🍞', stone: '🪨', ore: '💎', flour: '🌾', egg: '🥚', milk: '🥛', wool: '🧶' }[k] || '📦';
}































