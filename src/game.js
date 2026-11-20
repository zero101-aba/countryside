// 游戏主控：循环、输入、相机、音频、存档
import { Sim } from './sim.js';
import { Renderer } from './renderer.js';
import { UI } from './ui.js';
import { TILE } from './config.js';
import { parseCommand, resolveClarify } from './commander.js';
import { executeCommand } from './scheduler.js';
import { tickAITalk, triggerAITalk } from './ai-talk.js';

const SAVE_KEY = 'fanmian_town_save_v1';

class Audio {
  constructor() {
    this.enabled = localStorage.getItem('farm_sound') !== '0';
    this.ctx = null;
  }
  _ensure() {
    if (!this.enabled) return null;
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }
  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('farm_sound', this.enabled ? '1' : '0');
    if (this.enabled) this.click();
    return this.enabled;
  }
  _tone(freq, dur = 0.08, type = 'square', vol = 0.05, slide = 0) {
    const ctx = this._ensure();
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), ctx.currentTime + dur);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
  }
  click() { this._tone(660, 0.04, 'square', 0.03); }
  coin() { this._tone(880, 0.06, 'triangle', 0.05); setTimeout(() => this._tone(1320, 0.09, 'triangle', 0.05), 60); }
  harvest() { this._tone(520, 0.07, 'triangle', 0.05); setTimeout(() => this._tone(780, 0.09, 'triangle', 0.04), 60); }
  hoe() { this._tone(140, 0.07, 'sawtooth', 0.035, -40); }
  water() { this._tone(900, 0.05, 'sine', 0.03, 300); }
  chop() { this._tone(110, 0.09, 'square', 0.05, -30); }
  error() { this._tone(200, 0.12, 'sawtooth', 0.04, -80); }
  chime() { this._tone(660, 0.1, 'triangle', 0.05); setTimeout(() => this._tone(990, 0.14, 'triangle', 0.05), 90); }
}

export class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.sim = Sim.load(this._readSave());
    this.renderer = new Renderer(this.canvas, this.sim.world, this.sim);
    this.ui = new UI(this);
    this.audio = new Audio();
    this.mode = null;            // 当前待拾取目标的指令
    this.speed = this.sim.speed || 1;
    this.running = true;
    this.lastT = performance.now();
    this.acc = 0;
    this.follow = null;          // 跟随对象
    this.pendingCommand = null;  // 等待澄清的指令
    this.pointer = null;
    this.touch = null;
    this.pinch = null;
    this.lastAutoSave = 0;
    this.workSeen = new Map();
    this.bubbleEls = new Map();

    this.sim.onEvent = (type, data) => this._onSimEvent(type, data);
    this.sim.onLog = (text, type) => this._onLog(text, type);

    this._bindInput();
    this.ui.setSpeedUI(this.speed);
    this._focusStart();
    this.ui.showTutorial();
    window.addEventListener('resize', () => this.renderer.resize());
    if (window.ResizeObserver) {
      new ResizeObserver(() => this.renderer.resize()).observe(this.canvas.parentElement);
    }
    requestAnimationFrame((t) => this._loop(t));
  }

  _focusStart() {
    const sel = this.sim.selected;
    if (sel) { this.follow = sel; this.renderer.focusOn(sel.x, sel.y, true); }
    else this.renderer.focusOn(17, 11);
  }

  // ---------- 存档 ----------
  _readSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (obj && obj.v === 1) return obj;
    } catch (e) { console.warn(e); }
    return null;
  }
  save() {
    try {
      const obj = this.sim.serialize();
      obj.v = 1;
      localStorage.setItem(SAVE_KEY, JSON.stringify(obj));
    } catch (e) { console.warn('保存失败', e); }
  }
  reset() {
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  }

  // ---------- 速度 ----------
  setSpeed(sp) {
    if (sp === 8 && !this.sim.stageFlags?.speed8) {
      this.ui.toast('8× 还没解锁：累计收入 150G');
      return;
    }
    this.speed = sp;
    this.sim.speed = sp;
    this.ui.setSpeedUI(sp);
    this.ui.toast(sp === 0 ? '已暂停' : `${sp} 倍速`);
    if (sp === 0) this.save();
  }

  // 横屏：全屏 + 锁定方向（不支持时提示手动旋转）
  async toggleLandscape() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        this.ui.toast('已退出全屏');
        return;
      }
      const el = document.documentElement;
      if (!el.requestFullscreen) {
        this.ui.toast('请把设备横过来');
        return;
      }
      await el.requestFullscreen();
      try {
        if (screen.orientation && screen.orientation.lock) {
          await screen.orientation.lock('landscape');
          this.ui.toast('横屏模式');
        } else {
          this.ui.toast('已全屏，请把设备横过来');
        }
      } catch (e) {
        this.ui.toast('已全屏，请把设备横过来');
      }
    } catch (e) {
      this.ui.toast('当前浏览器不支持自动横屏，请手动旋转设备');
    } finally {
      setTimeout(() => {
        this.renderer.resize();
        this.save();
      }, 150);
    }
  }

  setMode(mode) {
    this.mode = mode;
    this.sim.pickMode = mode;
    if (this.mode) {
      document.body.classList.add('picking');
      const names = { plow: '草地', plant: '已开垦的地', water: '干旱的地', harvest: '成熟的地', chop: '树' };
      this.ui.hint(`请点选${names[this.mode] || '目标'} · 再点一次取消`);
    } else {
      document.body.classList.remove('picking');
      this.ui.hint(null);
    }
  }

  // ---------- 输入 ----------
  _bindInput() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => this._down(e));
    c.addEventListener('pointermove', (e) => this._move(e));
    c.addEventListener('pointerup', (e) => this._up(e));
    c.addEventListener('pointercancel', (e) => this._cancel(e));
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.renderer.setZoom(e.deltaY > 0 ? -0.15 : 0.15);
    }, { passive: false });
    c.addEventListener('contextmenu', (e) => e.preventDefault());

    // 键盘
    window.addEventListener('keydown', (e) => {
      if (document.body.classList.contains('chat-open')) {
        if (e.key === 'Escape') { e.preventDefault(); this.ui.closeChat(); }
        return;
      }
      if (e.key === ' ') { e.preventDefault(); this.setSpeed(this.speed === 0 ? 1 : 0); }
      if (e.key === '1') this.setSpeed(1);
      if (e.key === '2') this.setSpeed(2);
      if (e.key === '3') this.setSpeed(4);
      if (e.key === 'Escape') { this.setMode(null); this.ui.closeSheet(); }
      if (e.key === 'Tab') {
        e.preventDefault();
        const vs = this.sim.villagers;
        const idx = vs.indexOf(this.sim.selected);
        this.selectVillager(vs[(idx + 1) % vs.length]);
      }
    });

    // 页面隐藏时保存
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.save();
    });
    window.addEventListener('beforeunload', () => this.save());
  }

  _canvasPoint(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  _down(e) {
    const p = this._canvasPoint(e);
    if (this.pointer && this.pointer.id !== e.pointerId) {
      // 第二根手指 → 捏合
      this.pinch = { d: Math.hypot(p.x - this.pointer.x, p.y - this.pointer.y), scale: this.renderer.scale };
      return;
    }
    this.pointer = { id: e.pointerId, x: p.x, y: p.y, sx: p.x, sy: p.y, t: performance.now(), moved: false, dx: 0, dy: 0 };
    this.canvas.setPointerCapture?.(e.pointerId);
  }

  _move(e) {
    const p = this._canvasPoint(e);
    if (this.pinch && this.pointer) {
      const d = Math.hypot(p.x - this.pointer.x, p.y - this.pointer.y);
      const ratio = d / Math.max(1, this.pinch.d);
      const target = Math.max(1.6, Math.min(4, this.pinch.scale * ratio));
      if (Math.abs(target - this.renderer.scale) > 0.02) this.renderer.setZoom(target - this.renderer.scale);
      return;
    }
    if (!this.pointer || e.pointerId !== this.pointer.id) return;
    const dx = p.x - this.pointer.x, dy = p.y - this.pointer.y;
    if (Math.hypot(p.x - this.pointer.sx, p.y - this.pointer.sy) > 6) this.pointer.moved = true;
    if (this.pointer.moved) {
      this.renderer.cam.x -= dx / (TILE * this.renderer.scale);
      this.renderer.cam.y -= dy / (TILE * this.renderer.scale);
      this.renderer.camTarget.x = this.renderer.cam.x;
      this.renderer.camTarget.y = this.renderer.cam.y;
      this.follow = null;
      this.renderer._clampCam();
    }
    this.pointer.x = p.x; this.pointer.y = p.y;
  }

  _up(e) {
    if (this.pinch) {
      if (!this.pointer) this.pinch = null;
      return;
    }
    if (!this.pointer || e.pointerId !== this.pointer.id) return;
    const wasTap = !this.pointer.moved && performance.now() - this.pointer.t < 600;
    this.pointer = null;
    this.pinch = null;
    if (!wasTap) return;
    const p = this._canvasPoint(e);
    this._tap(p.x, p.y);
  }

  _cancel(e) {
    this.pointer = null;
    this.pinch = null;
  }

  _tap(sx, sy) {
    const w = this.renderer.screenToWorld(sx, sy);
    const sim = this.sim;

    // 1) 点村民
    const v = this._villagerAt(w.x, w.y);
    if (v) {
      // 点地图上的角色：只选中并跟随，不弹面板挡视线
      this.selectVillager(v, false);
      return;
    }
    // 2) 点服装店
    const cloth = sim.world.props.find((p) => p.type === 'clothshop'
      && Math.abs(p.x + 0.5 - w.x) < 1.2 && Math.abs(p.y + 0.5 - w.y) < 1.2);
    if (cloth) {
      this.audio.click();
      this.ui.openShop('clothes');
      return;
    }
    // 3) 点委托板
    const board = sim.world.props.find((p) => p.type === 'questboard'
      && Math.abs(p.x + 0.5 - w.x) < 1 && Math.abs(p.y + 0.5 - w.y) < 1);
    if (board) {
      this.audio.click();
      if (!sim.stageFlags?.quests) { this.ui.toast('委托板还没开张：先收获 1 次'); return; }
      this.ui.openQuests();
      return;
    }
    // 4) 有模式：点地块/树
    if (this.mode) {
      this._useMode(w);
      return;
    }
    // 5) 点农田
    const plot = sim.world.plotAt(Math.floor(w.x), Math.floor(w.y));
    if (plot) {
      this._tapPlot(plot);
      return;
    }
    // 4) 点建筑
    const st = sim.world.structures.find((s) => w.x >= s.x && w.x <= s.x + s.w && w.y >= s.y && w.y <= s.y + s.h);
    if (st) {
      if (st.id === 'market') { this.ui.openShop('seed'); return; }
      this.ui.toast(st.name);
      return;
    }
    // 5) 空地：取消选择
    this.setMode(null);
    sim.selected = null;
    this.follow = null;
    this.ui.refreshNow();
  }

  _villagerAt(wx, wy) {
    let best = null, bd = 1.1;
    for (const v of this.sim.villagers) {
      const d = Math.hypot(v.x - wx, v.y - (wy - 0.2));
      if (d < bd) { bd = d; best = v; }
    }
    return best;
  }

  _useMode(w) {
    const sim = this.sim;
    const v = sim.selected;
    if (!v) { this.setMode(null); return; }
    const tx = Math.floor(w.x), ty = Math.floor(w.y);
    if (this.mode === 'chop') {
      const tree = sim.world.treeAt(tx, ty);
      if (!tree) { this.ui.toast('要点一棵树'); this.audio.error(); return; }
      const res = v.issueOrder('chop', tx, ty);
      this.afterOrder(res);
      return;
    }
    const plot = sim.world.plotAt(tx, ty);
    if (!plot) {
      // 点到非农田：给提示，但不取消模式
      this.ui.toast('要点农田里的地块');
      return;
    }
    const res = v.issueOrder(this.mode, tx, ty);
    this.afterOrder(res);
    if (res.ok) {
      this.setMode(null);
      this.follow = v;
      this.renderer.focusOn(v.x, v.y);
      this.ui.refreshNow();
    }
  }

  afterOrder(res) {
    if (!res) return;
    if (res.ok) {
      this.audio.click();
      // 有活干了：镜头重新跟着他，让玩家看着整个过程
      const v = this.sim.selected;
      if (v && v.task) {
        this.follow = v;
        this.renderer.focusOn(v.x, v.y);
      }
    } else this.audio.error();
    this.ui.toast(res.msg || '');
    this.ui.refreshNow();
  }

  // ---------- 自然语言指令 ----------
  runCommand(raw) {
    const text = String(raw || '').trim();
    if (!text) return;
    try {
      const cmd = this.pendingCommand
        ? resolveClarify(this.pendingCommand, text, this.sim)
        : parseCommand(text, this.sim);
      const res = executeCommand(this.sim, cmd);

      if (res.needClarify) this.pendingCommand = res.pending || cmd;
      else this.pendingCommand = null;
      this.ui.el.cmdInput.placeholder = this.pendingCommand
        ? '说范围：全部 / 西边 / 3号地' : '说句话：让小伟把3号地浇一下';

      this.ui.commandFeedback(text, res);
      this.ui.refreshNow();
      this.sim.uiDirty = true;

      if (res.ok) {
        this.audio.click();
        if (res.focus) {
          this.selectVillager(res.focus, false);
          this.follow = res.focus;
          this.renderer.focusOn(res.focus.x, res.focus.y);
        }
      } else {
        this.audio.error();
      }
    } catch (e) {
      console.error('命令失败', e);
      this.ui.commandFeedback(text, { messages: [`指令出错了：${e.message}`] });
    }
  }

  skipNight() {
    if (!this.sim.skipNight()) this.ui.toast('现在不是夜晚');
  }

  async triggerAITalk() {
    const r = await triggerAITalk(this.sim);
    if (!r.ok) this.ui.toast(r.msg);
    this.ui.refreshNow();
    return r;
  }

  fastTravel(region) {
    if (!region) return;
    if (!this.sim.isRegionUnlocked(region.id)) {
      this.ui.toast(`${region.name}还没解锁`);
      return;
    }
    this.renderer.snapTo(region.travel.x, region.travel.y);
    this.follow = null;
    this.sim.currentRegion = region.id;
    this.sim.setCurrentRegion(region.travel.x, region.travel.y);
    this.ui.closeMap();
    this.ui.toast(`来到${region.name}`);
    this.audio.click();
  }

  _tapPlot(plot) {
    const sim = this.sim;
    const sel = sim.selected;
    const info = [];
    if (plot.crop) {
      const def = sim.cropProgress(plot);
      info.push(`${sim.itemName(plot.crop)} · 生长 ${Math.round(def * 100)}%`);
      if (sim.cropReady(plot)) info.push('可以收获了！');
    } else if (plot.state === 'plowed') info.push('已开垦的空地');
    else info.push('未开垦的草地');
    if (plot.crop && !sim.isWet(plot)) info.push('缺水');
    this.ui.toast(info.join(' · '), 2200);

    if (!sel) {
      this.ui.hint('先选一个村民，再选指令');
      return;
    }
    // 直接给一个“顺手”的默认指令
    if (sim.cropReady(plot)) this.afterOrder(sel.issueOrder('harvest', plot.x, plot.y));
    else if (plot.crop && !sim.isWet(plot)) this.afterOrder(sel.issueOrder('water', plot.x, plot.y));
    else if (plot.state === 'plowed' && !plot.crop) this.afterOrder(sel.issueOrder('plant', plot.x, plot.y));
    else if (plot.state === 'grass') this.afterOrder(sel.issueOrder('plow', plot.x, plot.y));
    else {
      this.audio.error();
      this.ui.toast('这块地现在不用管');
    }
    if (sel.task) { this.follow = sel; this.renderer.focusOn(sel.x, sel.y); }
    this.ui.refreshNow();
  }

  // ---------- 选择 ----------
  selectVillager(v, open = true) {
    this.sim.selected = v;
    this.follow = v;
    this.renderer.focusOn(v.x, v.y);
    this.audio.click();
    this.ui.refreshNow();
    this.ui.setFollowChip(v);
    if (open) this.ui.openSheetFor(v);
    this.setMode(null);
  }

  // ---------- 画布点击（来自 DOM 卡片/世界） ----------
  _onSimEvent(type, data) {
    if (type === 'mature') {
      this.renderer.addText(data.plot.x, data.plot.y, '成熟!', '#ffe08a');
      this.audio.chime();
      return;
    }
    if (type === 'taskDone' && data.task && data.task.byPlayer && data.villager) {
      const v = data.villager;
      const t = data.task;
      const r = data.res || {};
      let line;
      if (r.fail) line = `${v.name}：这活没干成——${r.msg || ''}`;
      else if (t.type === 'harvest') line = `${v.name}：${r.sold ? `收了，卖了 ${r.sold}G` : '收好了，送仓库了'}`;
      else if (t.type === 'water') line = `${v.name}：浇好了，能湿大半天。`;
      else if (t.type === 'plant') line = `${v.name}：种下了。`;
      else if (t.type === 'plow') line = `${v.name}：地翻好了。`;
      else if (t.type === 'chop') line = `${v.name}：树砍倒了，木头送回去了。`;
      else if (t.type === 'fish') line = `${v.name}：钓上来一条。`;
      else if (t.type === 'mine') line = `${v.name}：挖到了${r.carry?.kind === 'ore' ? '矿石' : '石头'}，正在送回仓库。`;
      else if (t.type === 'collect') line = `${v.name}：收了${r.carry?.kind === 'milk' ? '牛奶' : r.carry?.kind === 'wool' ? '羊毛' : '鸡蛋'}，送回仓库。`;
      else if (t.type === 'forage') line = `${v.name}：采到了，送仓库了。`;
      else if (t.type === 'chat') return;
      else line = `${v.name}：干完了。`;
      this.ui.commandReport(line);
      const batch = this.sim.noteBatchDone(t.batchId);
      if (batch) this.ui.commandReport(`都干完了：${batch.total} 项。`);
      return;
    }
    if (type === 'achievement' && data.achievement) {
      this.ui.toast(`🏆 成就达成：${data.achievement.name}`);
      this.ui.commandReport(`🏆 ${data.achievement.name} — ${data.achievement.desc}`);
      this.audio.chime();
      return;
    }
    if (type === 'stageUp' && data.stage) {
      this.ui.showStageCard(data.stage, data.index);
      this.ui.toast(`🎉 阶段解锁：${data.stage.name} — ${data.stage.unlock}`);
      this.audio.chime();
      return;
    }
    if (type === 'market' && data.villager) {
      this.ui.commandReport(`${data.villager.name}：${data.text}`);
      return;
    }
    if (type === 'advice' && data.line) {
      this.ui.commandReport(`${data.villager?.name || '村民'}：${data.line}`);
      return;
    }
    if (type === 'bondEvent' && data.lines) {
      this.ui.commandReport(`💗 ${data.label}`);
      this.ui.toast(`💗 ${data.label}`);
      this.audio.chime();
      return;
    }
    if ((type === 'regionEntered' || type === 'regionUnlocked') && data.region) {
      this.ui.toast(`${type === 'regionUnlocked' ? '解锁' : '发现'}：${data.region.name}`);
      this.audio.chime();
      return;
    }
    if (type === 'dayStart') {
      this.ui.showDayCard(data.day, data.seasonName, null, data.summary);
      return;
    }
    if (type === 'nightSkipped') {
      this.ui.toast(`跳过了夜晚 · 第 ${data.day} 天 ${data.clock}`);
      this.audio.chime();
      return;
    }
    if (type === 'aiTalk' && data.line) {
      this.ui.commandReport(`小伟：${data.line}`);
      this.ui.commandReport(`小杨：${data.reply}`);
      this.ui.toast(`关系 ${Math.round(this.sim.bond)} · ${data.mood}`);
      this.audio.chime();
      return;
    }
    if (type === 'orderRefused' && data.villager) {
      this.ui.commandReport(`${data.villager.name}：${data.msg || '这活我不干。'}`);
    }
  }

  _onLog(text, type) {
    if (type === 'money' || type === 'buy') { /* 静音 */ }
  }

  // ---------- 主循环 ----------
  _loop(t) {
    const raw = Math.min(0.1, (t - this.lastT) / 1000);
    this.lastT = t;

    const velocity = this.speed;
    if (velocity > 0) {
      let scaled = raw * velocity;
      // 分步模拟，避免大 dt
      const step = 1 / 60;
      let guard = 0;
      while (scaled > 1e-6 && guard++ < 12) {
        const d = Math.min(step, scaled);
        this.sim.tick(d);
        scaled -= d;
      }
    }

    if (this.speed > 0) this.sim.autoSkipNightIfNeeded();
    // 相机跟随
    this.ui.setFollowChip(this.follow);
    if (this.follow) {
      const v = this.follow;
      this.renderer.camTarget.x = v.x;
      this.renderer.camTarget.y = v.y + 1.6;
    }
    this.sim.setCurrentRegion(this.renderer.cam.x, this.renderer.cam.y);
    tickAITalk(this.sim, raw);
    this.renderer.render(raw);
    this._syncWorldFx();
    this._syncBubbles();
    this.ui.update(raw);

    // 自动存档
    if (this.sim.absHours - this.lastAutoSave > 2) {
      this.lastAutoSave = this.sim.absHours;
      this.save();
    }
    requestAnimationFrame((tt) => this._loop(tt));
  }

  // 每个村民头顶都有对话框：优先显示正在说的话，否则显示当前想法
  _syncBubbles() {
    const box = this.bubblesEl || (this.bubblesEl = document.getElementById('bubbles'));
    if (!box) return;
    const W = this.renderer.cssW, H = this.renderer.cssH;
    const alive = new Set();
    const pending = [];
    for (const v of this.sim.villagers) {
      alive.add(v.uid);
      let el = this.bubbleEls.get(v.uid);
      if (!el) {
        el = document.createElement('div');
        el.className = 'w-bubble hidden';
        el.innerHTML = '<span class="tb-emoji"></span><span class="tb-text"></span>';
        box.appendChild(el);
        this.bubbleEls.set(v.uid, el);
      }
      if (v.state === 'sleeping') { el.classList.add('hidden'); continue; }
      const speaking = !!v.speech;
      const text = speaking ? v.speech.text : v.thought;
      if (!text) { el.classList.add('hidden'); continue; }
      const emoji = speaking ? v.speech.emoji : v.thoughtEmoji;
      const key = `${text}|${emoji}|${this.sim.selected === v ? 1 : 0}`;
      if (el.dataset.key !== key) {
        el.dataset.key = key;
        el.querySelector('.tb-emoji').textContent = emoji;
        el.querySelector('.tb-text').textContent = text;
        el.classList.toggle('selected', this.sim.selected === v);
      }
      const p = this.renderer.worldToScreen(v.x, v.y - 0.95);
      if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) { el.classList.add('hidden'); continue; }
      const w = el.offsetWidth || 140;
      const h = el.offsetHeight || 26;
      const x = Math.max(w / 2 + 4, Math.min(W - w / 2 - 4, p.x));
      const y = Math.max(h + 6, Math.min(H - 4, p.y));
      el.style.left = `${Math.round(x)}px`;
      el.style.top = `${Math.round(y)}px`;
      el.classList.remove('hidden');
      pending.push({ el, x, y, w, h });
    }
    // 两个人挨得太近时，把气泡往上错开，避免叠在一起
    pending.sort((a, c) => a.x - c.x);
    const placed = [];
    for (const it of pending) {
      let y = it.y;
      for (let guard = 0; guard < 3; guard++) {
        const hit = placed.find((r) => Math.abs(r.x - it.x) < (r.w + it.w) / 2 + 4 && y > r.y - r.h - 4 && y - it.h < r.y + 2);
        if (!hit) break;
        y = hit.y - hit.h - 6;
      }
      y = Math.max(it.h + 6, y);
      it.el.style.top = `${Math.round(y)}px`;
      placed.push({ x: it.x, y, w: it.w, h: it.h });
    }
    for (const [uid, el] of this.bubbleEls) {
      if (!alive.has(uid)) { el.remove(); this.bubbleEls.delete(uid); }
    }
  }

  // 把“正在干活”的状态映射成可见反馈
  _syncWorldFx() {
    for (const v of this.sim.villagers) {
      const t = v.task;
      const key = t ? `${t.type}_${t.stage}` : 'idle';
      const prev = this.workSeen.get(v.uid);
      if (prev !== key) {
        this.workSeen.set(v.uid, key);
        if (t && t.stage === 'working') {
          const fx = { plow: 'dirt', water: 'water', harvest: 'harvest', chop: 'chop', plant: 'seed', fish: 'water', forage: 'harvest', eat: 'eat' }[t.type];
          if (fx && Number.isFinite(t.tx)) this.renderer.burst(fx, t.tx, t.ty);
        }
      }
      // 干活动作持续粒子
      if (t && t.stage === 'working') {
        v._fxAcc = (v._fxAcc || 0) + 0.016;
        if (v._fxAcc > (t.type === 'chop' ? 0.34 : 0.42)) {
          v._fxAcc = 0;
          const fx = { plow: 'dirt', water: 'water', harvest: 'harvest', chop: 'chop', plant: 'seed', fish: 'water', forage: 'harvest' }[t.type];
          if (fx && Number.isFinite(t.tx)) {
            this.renderer.burst(fx, t.tx, t.ty);
            if (t.type === 'chop') this.audio.chop();
            else if (t.type === 'plow') this.audio.hoe();
            else if (t.type === 'water') this.audio.water();
          }
        }
      }
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.__game = new Game();
  // PWA：支持添加到主屏幕 / 离线打开（局域网 HTTP 下浏览器会忽略，不影响游戏）
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
});


















