// 游戏模拟核心：时间、指令、经济、作物生长、存档
import {
  CROPS, ORDERS, HOURS_PER_DAY, DAYS_PER_SEASON, SEASONS, WATER_HOLD_HOURS,
  START_MONEY, START_SEEDS, VILLAGERS, HIRE_POOL, WOOD_PRICE, FISH_PRICE, SLEEP_HOUR,
  HOUR_SECONDS, REGIONS, STAGES, OUTFITS,
} from './config.js';
import { World } from './world.js';
import { Villager } from './villagers.js';
import { pathToNear } from './path.js';
import { villageChatLines } from './dialogue.js';

export class Sim {
  constructor() {
    this.world = new World();
    this.world.sim = this;
    this.villagers = [];
    this.absHours = 7;
    this.money = START_MONEY;
    this.seeds = { ...START_SEEDS };
    this.inventory = { bread: 4, wood: 3, fish: 0, forage: 0 };
    this.autoSell = true;
    this.stats = { harvested: 0, planted: 0, wood: 0, fish: 0, earned: 0, daysPlayed: 1, ordersIssued: 0, mined: 0, collected: 0 };
    this.daySummary = null;
    this._statMark = { earned: 0, harvested: 0, quests: 0 };
    this.selected = null;
    this.logs = [];
    this.prevDay = 1;
    this.speed = 1;
    this.uiDirty = true;
    this.hirePool = [];
    this.pendingOrders = 0;
    this.seasonTint = 0;

    // 天气 / 每日委托
    this.weather = 'sunny';
    this.dayStats = this._emptyDayStats();
    this.quests = [];
    this.questsDone = 0;
    this.bond = 50;
    this.story = [];
    this.autoSkipNight = false;   // 夜晚是否自动跳过
    this.achievements = {};       // 成就 id -> 解锁天数
    this.bondMilestones = {};
    this.batches = new Map();
    this._batchSeq = 0;
    this._adviceT = 25 + Math.random() * 25;
    this._achT = 2;
    this.aiTalks = 0;
    this.stageIndex = 0;
    this.stageFlags = { quests: false, collect: false, autoskip: false, speed8: false, mine: false, fishBonus: false, oreBonus: false, aiAuto: false, title: false };
    this.ownedOutfits = { xiaowei: ['default'], xiaoyang: ['default'] };
    this.equippedOutfit = { xiaowei: 'default', xiaoyang: 'default' };
    this._skipping = false;
    this._lastAutoSkipDay = 0;

    // 区域
    this.regions = REGIONS.map((r) => ({ ...r }));
    this.unlockedRegions = new Set(['village', 'fishing']);
    this.discoveredRegions = new Set(['village']);
    this.currentRegion = 'village';
    this.world.bridgeOpen = false;

    for (const def of VILLAGERS.slice(0, 2)) this.villagers.push(new Villager(def, this));
    // 应用已保存的时装
    for (const v of this.villagers) {
      const oid = this.equippedOutfit[v.id] || 'default';
      const od = this.outfitDef(v.id, oid);
      if (od) v.applyOutfit(od);
    }
    this.startVillagerCount = this.villagers.length;
    this.generateQuests();
  }

  // ---------- 成就 / 批次 / 主动建议 / 关系里程碑 ----------
  achievementList() {
    return [
      { id: 'harvest10', name: '初次丰收', desc: '累计收获 10 次', reward: 40, check: (s) => s.stats.harvested >= 10 },
      { id: 'harvest50', name: '种田好手', desc: '累计收获 50 次', reward: 120, check: (s) => s.stats.harvested >= 50 },
      { id: 'plant30', name: '播种能手', desc: '累计播种 30 次', reward: 80, check: (s) => s.stats.planted >= 30 },
      { id: 'wood50', name: '伐木工', desc: '累计砍 50 根木头', reward: 80, check: (s) => s.stats.wood >= 50 },
      { id: 'fish20', name: '钓叟', desc: '累计钓 20 条鱼', reward: 100, check: (s) => s.stats.fish >= 20 },
      { id: 'mine20', name: '矿工', desc: '累计挖矿 20 次', reward: 100, check: (s) => s.stats.mined >= 20 },
      { id: 'animal20', name: '牧场主', desc: '累计收牧产 20 次', reward: 100, check: (s) => s.stats.collected >= 20 },
      { id: 'quest10', name: '可靠的东家', desc: '完成 10 份委托', reward: 120, check: (s) => s.questsDone >= 10 },
      { id: 'money1000', name: '小有积蓄', desc: '持有 1000 金币', reward: 0, check: (s) => s.money >= 1000 },
      { id: 'regions5', name: '走遍小镇', desc: '解锁全部 5 个区域', reward: 150, check: (s) => s.unlockedRegions.size >= 5 },
      { id: 'bond70', name: '两情相悦', desc: '小伟与小杨关系达到 70', reward: 0, check: (s) => s.bond >= 70 },
      { id: 'talk5', name: '有来有往', desc: '小伟和小杨聊过 5 次', reward: 60, check: (s) => (s.aiTalks || 0) >= 5 },
    ];
  }

  get unlockedCount() { return Object.keys(this.achievements).length; }

  _stageDone(st) {
    switch (st.id) {
      case 's1': return this.stats.harvested >= 1;
      case 's2': return this.stats.planted >= 3;
      case 's3': return this.stats.earned >= 150;
      case 's4': return this.stats.harvested >= 10;
      case 's5': return this.stats.fish >= 5;
      case 's6': return this.stats.mined >= 10;
      case 's7': return this.bond >= 60;
      case 's8': return this.unlockedRegions.size >= 5;
      default: return false;
    }
  }

  _stageCheck() {
    while (this.stageIndex < STAGES.length) {
      const st = STAGES[this.stageIndex];
      if (!this._stageDone(st)) break;
      this.stageIndex++;
      this.stageFlags[st.feature] = true;
      if (st.feature === 'collect') this.stageFlags.autoskip = true;
      this.addLog(`阶段解锁：${st.name} — ${st.unlock}`, 'quest');
      this.emit('stageUp', { stage: st, index: this.stageIndex });
      this.uiDirty = true;
    }
  }

  // ---------- 服装店 ----------
  outfitList(id) { return OUTFITS[id] || []; }
  outfitDef(id, oid) { return this.outfitList(id).find((o) => o.id === oid) || null; }
  hasOutfit(id, oid) { return (this.ownedOutfits[id] || []).includes(oid); }

  buyOutfit(id, oid) {
    const v = this.villagers.find((x) => x.id === id);
    const def = this.outfitDef(id, oid);
    if (!v || !def) return { ok: false, msg: '没有这套衣服' };
    if (this.hasOutfit(id, oid)) return this.equipOutfit(id, oid);
    if (this.stageIndex < def.stage) return { ok: false, msg: `第 ${def.stage} 阶段才解锁` };
    if (this.money < def.price) return { ok: false, msg: '钱不够' };
    this.money -= def.price;
    this.ownedOutfits[id].push(oid);
    this.equipOutfit(id, oid);
    this.addLog(`${v.name} 在服装店换上「${def.name}」 (-${def.price}G)`, 'buy');
    return { ok: true, msg: `买下并换上了${def.name}` };
  }

  equipOutfit(id, oid) {
    const v = this.villagers.find((x) => x.id === id);
    const def = this.outfitDef(id, oid);
    if (!v || !def) return { ok: false, msg: '没有这套衣服' };
    if (!this.hasOutfit(id, oid)) return { ok: false, msg: '还没买这套' };
    this.equippedOutfit[id] = oid;
    v.applyOutfit(def);
    this.uiDirty = true;
    this.emit('outfit', { villager: v, def });
    return { ok: true, msg: `换上了${def.name}` };
  }

  get currentStage() { return STAGES[Math.min(this.stageIndex, STAGES.length - 1)]; }
  get nextStage() { return STAGES[this.stageIndex] || null; }

  checkAchievements() {
    for (const a of this.achievementList()) {
      if (this.achievements[a.id]) continue;
      if (!a.check(this)) continue;
      this.achievements[a.id] = this.day;
      if (a.reward) { this.money += a.reward; this.stats.earned += a.reward; }
      this.addLog(`成就达成：${a.name}${a.reward ? ` +${a.reward}G` : ''}`, 'quest');
      this.emit('achievement', { achievement: a });
      this.uiDirty = true;
    }
  }

  noteBatchStart(total) {
    const id = `b${++this._batchSeq}`;
    this.batches.set(id, { total, done: 0 });
    return id;
  }

  noteBatchDone(id) {
    const b = this.batches.get(id);
    if (!b) return null;
    b.done++;
    if (b.done >= b.total) {
      this.batches.delete(id);
      return b;
    }
    return null;
  }

  _adviceTick(dt) {
    this._adviceT -= dt;
    if (this._adviceT > 0) return;
    this._adviceT = 25 + Math.random() * 25;
    const awake = this.villagers.filter((v) => v.state !== 'sleeping' && !v.task);
    if (!awake.length) return;
    const v = awake[Math.floor(Math.random() * awake.length)];
    const dry = this.world.plots.filter((p) => p.crop && !this.isWet(p) && !this.cropReady(p)).length;
    const ready = this.world.plots.filter((p) => this.cropReady(p)).length;
    const claim = this.claimableQuests;
    let line = null;
    if (ready > 0) line = `东家，${ready} 块地熟了，收了能换钱。`;
    else if (dry > 0) line = `东家，有 ${dry} 块地干了，该浇水了。`;
    else if (claim > 0) line = `委托板上有 ${claim} 份能领了。`;
    else if ((this.inventory.bread || 0) <= 1) line = '家里面包快没了，东家。';
    if (!line) return;
    v.say(line, '💡', 4.5);
    v.think(line, '💡');
    this.addLog(`${v.name}：${line}`, 'info');
    this.emit('advice', { villager: v, line });
  }

  _bondTick() {
    const marks = [[60, '开始默契'], [75, '彼此牵挂'], [90, '心意相通']];
    for (const [lv, label] of marks) {
      if (this.bond < lv || this.bondMilestones[lv]) continue;
      this.bondMilestones[lv] = this.day;
      const a = this.villagers.find((v) => v.id === 'xiaowei');
      const b = this.villagers.find((v) => v.id === 'xiaoyang');
      if (!a || !b) return;
      const lines = lv === 60
        ? ['跟你一起干活，好像没那么累了。', '……你少贫嘴。']
        : lv === 75
          ? ['今天的晚霞很好看。', '嗯，我也在看。']
          : ['小杨，以后这片地，我们一起种下去吧。', '好。'];
      a.say(lines[0], '💗', 5);
      b.say(lines[1], '💗', 5);
      a.emo.trust = Math.min(100, a.emo.trust + 4);
      b.emo.trust = Math.min(100, b.emo.trust + 4);
      this.addLog(`关系里程碑：${label}`, 'chat');
      this.emit('bondEvent', { level: lv, label, lines });
    }
  }
  // ---------- 天气 ----------
  get isRainy() { return this.weather === 'rain' || this.weather === 'storm'; }
  get weatherName() { return { sunny: '晴', rain: '雨', storm: '暴雨' }[this.weather] || '晴'; }

  rollWeather() {
    if (this.season === 3) return Math.random() < 0.15 ? 'rain' : 'sunny';
    const r = Math.random();
    if (r < 0.6) return 'sunny';
    if (r < 0.9) return 'rain';
    return 'storm';
  }

  // ---------- 区域 ----------
  regionAt(x, y) {
    return this.regions.find((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1)
      || this.regionById('village') || this.regions[0];
  }

  regionById(id) { return this.regions.find((r) => r.id === id) || null; }

  isRegionUnlocked(id) {
    if (this.unlockedRegions.has(id)) return true;
    const r = this.regionById(id);
    if (!r || !r.unlock) return true;
    if (r.unlock.day && this.day >= r.unlock.day) return true;
    if (r.unlock.harvest && this.stats.harvested >= r.unlock.harvest) return true;
    return false;
  }

  unlockRegion(id) {
    if (this.unlockedRegions.has(id)) return false;
    const r = this.regionById(id);
    if (!r) return false;
    this.unlockedRegions.add(id);
    if (id === 'forest') {
      this.world.bridgeOpen = true;
      this.world.block[this.world.idx(39, 13)] = 0;
      this.world.props = this.world.props.filter((p) => p.type !== 'gate');
    }
    this.addLog(`解锁新区域：${r.name}`, 'region');
    this.emit('regionUnlocked', { region: r });
    this.uiDirty = true;
    return true;
  }

  checkRegionUnlocks() {
    for (const r of this.regions) {
      if (this.unlockedRegions.has(r.id)) continue;
      if (this.isRegionUnlocked(r.id)) this.unlockRegion(r.id);
    }
  }

  setCurrentRegion(x, y) {
    const r = this.regionAt(x, y);
    if (r.id === this.currentRegion) return;
    this.currentRegion = r.id;
    if (!this.discoveredRegions.has(r.id)) {
      this.discoveredRegions.add(r.id);
      this.addLog(`发现新区域：${r.name}`, 'region');
      this.emit('regionEntered', { region: r });
    }
    this.uiDirty = true;
  }

  // 跳过夜晚：快进到第二天（或当天）早上 6 点
  skipNight() {
    if (this._skipping) return false;
    const h = this.hour;
    if (!(h >= 19 || h < 6)) return false;
    const dayStart = Math.floor(this.absHours / 24) * 24;
    const target = h < 6 ? dayStart + 6 : dayStart + 30;
    const needHours = target - this.absHours;
    if (needHours <= 0) return false;
    this._skipping = true;
    const step = 1 / 60;
    const total = needHours * HOUR_SECONDS;
    let elapsed = 0;
    let guard = 0;
    while (elapsed < total && guard++ < 30000) {
      this.tick(step);
      elapsed += step;
    }
    this._skipping = false;
    this.addLog(`跳过了夜晚，现在是第 ${this.day} 天 ${this.clockText}`, 'day');
    this.uiDirty = true;
    this.emit('nightSkipped', { day: this.day, clock: this.clockText });
    return true;
  }

  autoSkipNightIfNeeded() {
    if (!this.autoSkipNight || this._skipping) return false;
    if (this.hour < 23) return false;
    if (this._lastAutoSkipDay === this.day) return false;
    this._lastAutoSkipDay = this.day;
    return this.skipNight();
  }

  // ---------- 每日委托 ----------
  _emptyDayStats() {
    return { harvest: {}, fish: 0, wood: 0, forage: 0, water: 0, chat: 0 };
  }

  _quest(id, type, title, need, reward, trust, icon, key) {
    return { id, type, key: key || null, title, need, reward, trust, icon, claimed: false };
  }

  generateQuests() {
    const day = this.day;
    const quests = [];
    const seasonCrops = Object.keys(CROPS).filter((k) => this.seasonAllows(k));
    if (seasonCrops.length) {
      const crop = seasonCrops[Math.floor(Math.random() * seasonCrops.length)];
      const cdef = CROPS[crop];
      const cn = 3 + Math.floor(Math.random() * 3);
      quests.push(this._quest(`q${day}-1`, 'harvest', `收获 ${cn} 个${cdef.name}`, cn,
        Math.round(cdef.sell * cn * 1.25) + 20, 2, '🧺', crop));
    } else {
      // 冬天没有可种作物，用采集代替收获委托
      const n = 3 + Math.floor(Math.random() * 3);
      quests.push(this._quest(`q${day}-1`, 'forage', `采集 ${n} 次`, n, 45 + n * 12, 2, '🍄'));
    }

    const fn = 2 + Math.floor(Math.random() * 2);
    quests.push(this._quest(`q${day}-2`, 'fish', `钓 ${fn} 条鱼`, fn,
      fn * FISH_PRICE + 30, 2, '🐟'));

    const third = ['wood', 'water', 'forage', 'chat'][Math.floor(Math.random() * 4)];
    if (third === 'wood') {
      const n = 6 + Math.floor(Math.random() * 5);
      quests.push(this._quest(`q${day}-3`, 'wood', `砍 ${n} 根木头`, n, 55 + n * 4, 2, '🪵'));
    } else if (third === 'water') {
      const n = 5 + Math.floor(Math.random() * 4);
      quests.push(this._quest(`q${day}-3`, 'water', `给 ${n} 块地浇水`, n, 45 + n * 5, 2, '💧'));
    } else if (third === 'forage') {
      const n = 2 + Math.floor(Math.random() * 3);
      quests.push(this._quest(`q${day}-3`, 'forage', `采集 ${n} 次`, n, 40 + n * 12, 3, '🍄'));
    } else {
      const n = 1 + Math.floor(Math.random() * 2);
      quests.push(this._quest(`q${day}-3`, 'chat', `和村民聊天 ${n} 次`, n, 30 + n * 15, 3, '💬'));
    }
    this.quests = quests;
    this.uiDirty = true;
  }

  questProgress(q) {
    const s = this.dayStats;
    switch (q.type) {
      case 'harvest': return s.harvest[q.key] || 0;
      case 'fish': return s.fish;
      case 'wood': return s.wood;
      case 'water': return s.water;
      case 'forage': return s.forage;
      case 'chat': return s.chat;
      default: return 0;
    }
  }

  questReady(q) { return !q.claimed && this.questProgress(q) >= q.need; }
  get claimableQuests() { return this.quests.filter((q) => this.questReady(q)).length; }

  claimQuest(q) {
    if (!q || q.claimed) return { ok: false, msg: '这份委托已经领过了' };
    if (!this.questReady(q)) return { ok: false, msg: '还没完成呢' };
    q.claimed = true;
    this.money += q.reward;
    this.questsDone++;
    this.stats.earned += q.reward;
    const v = this.villagers[Math.floor(Math.random() * this.villagers.length)];
    if (v) {
      v.emo.trust = Math.min(100, v.emo.trust + q.trust);
      v.feel('praise', 0.5);
      v.say(`委托完成了，东家真靠谱。`, '😊', 4);
    }
    this.addLog(`完成委托「${q.title}」 +${q.reward}G`, 'quest');
    this.uiDirty = true;
    return { ok: true, msg: `委托完成 +${q.reward}G` };
  }

  resetDayStats() { this.dayStats = this._emptyDayStats(); }

  // ---------- 时间 ----------
  get day() { return 1 + Math.floor(this.absHours / HOURS_PER_DAY); }
  get hour() { return this.absHours % HOURS_PER_DAY; }
  get hourInt() { return Math.floor(this.hour); }
  get minute() { return Math.floor((this.hour % 1) * 60); }
  get season() { return Math.floor(((this.day - 1) / DAYS_PER_SEASON)) % 4; }
  get seasonDay() { return ((this.day - 1) % DAYS_PER_SEASON) + 1; }
  get isNight() { return this.hour >= 19 || this.hour < 6; }
  // 需求/情绪按游戏小时结算：时间拉长后，每小时消耗保持不变
  get needScale() { return 2 / HOUR_SECONDS; }
  get clockText() { return `${String(this.hourInt).padStart(2, '0')}:${String(this.minute).padStart(2, '0')}`; }
  get seasonName() { return SEASONS[this.season]; }
  get weekday() { return ['一', '二', '三', '四', '五', '六', '日'][(this.day - 1) % 7]; }

  emit(type, data) {
    if (this.onEvent) this.onEvent(type, data);
  }

  tick(dt) {
    this.absHours += dt / HOUR_SECONDS; // 1 游戏小时 = HOUR_SECONDS 秒

    this._worldTick(dt);
    for (const v of this.villagers) v.update(dt);
    // 聊天双方互相看着对方
    for (const v of this.villagers) {
      if (v.task && v.task.type === 'chat' && v.task.stage === 'working' && v.task.other) {
        const o = v.task.other;
        const dx = o.x - v.x, dy = o.y - v.y;
        if (Math.abs(dx) > Math.abs(dy)) v.dir = dx > 0 ? 'right' : 'left';
        else v.dir = dy > 0 ? 'down' : 'up';
      }
    }
    this._adviceTick(dt);
    this._bondTick();
    this._achT -= dt;
    if (this._achT <= 0) { this._achT = 1; this.checkAchievements(); this._stageCheck(); }
    this._checkDayChange();
    this._autoSelectFollow();
  }

  _worldTick(dt) {
    // 作物生长：只在湿润时累计（冬天不长）
    const gdt = dt / HOUR_SECONDS; // 游戏小时
    for (const p of this.world.plots) {
      // 下雨时土地持续湿润
      if (this.isRainy && !this.isWet(p)) p.wetUntil = this.absHours + 0.2;
      if (p.crop && this.isWet(p) && this.season !== 3) {
        const before = this.cropProgress(p);
        p.growth = (p.growth || 0) + gdt;
        const after = this.cropProgress(p);
        if (before < 1 && after >= 1) {
          this.addLog(`${CROPS[p.crop].name} 成熟了，可以收了！`, 'ready');
          this.emit('mature', { plot: p });
        }
      }
      // 干燥
      if (p.wetUntil && p.wetUntil <= this.absHours) p.wetUntil = 0;
    }
    // 动物在各自的区域里活动 + 积累牧产
    for (const a of this.world.animals) {
      const home = a.home || this.world.pen;
      if (a.hold > 0) {
        a.hold -= dt;
      } else if (home) {
        a.t -= dt;
        if (a.t <= 0) {
          a.t = 2 + Math.random() * 5;
          a.tx = home.x0 + Math.random() * (home.x1 - home.x0);
          a.ty = home.y0 + Math.random() * (home.y1 - home.y0);
        }
        const dx = a.tx - a.x, dy = a.ty - a.y;
        const d = Math.hypot(dx, dy);
        if (d > 0.04) {
          const sp = (a.speed || 0.45) * dt;
          a.x += dx / d * Math.min(d, sp);
          a.y += dy / d * Math.min(d, sp);
          a.dir = dx >= 0 ? 'right' : 'left';
        }
      }
      const bobRate = (a.kind === 'cow' || a.kind === 'sheep' || a.kind === 'goose') ? 3 : 7;
      a.peck = Math.sin(this.absHours * bobRate + a.y * 9) > 0.6 ? 1 : 0;
      if (a.product && !a.ready) {
        a.produceT = (a.produceT || 0) + gdt;
        if (a.produceT >= (a.produceEvery || 12)) { a.ready = true; a.produceT = 0; }
      }
    }
    // 矿点再生
    for (const r of this.world.rocks) {
      if (r.mined && r.regrowAt <= this.absHours) { r.mined = false; r.regrowAt = 0; }
    }
    // 树木再生
    for (const t of this.world.trees) {
      if (t.chopped && t.regrowAt <= this.absHours) { t.chopped = false; t.regrowAt = 0; }
    }
    // 需求恢复（睡觉由 Villager 处理）
    this._decayWorld(dt);
  }

  _decayWorld(dt) {
    for (const f of this.world.forages) {
      if (f.taken && this.absHours >= f.regrowAt) f.taken = false;
    }
  }

  _autoSelectFollow() {
    // 摄像机跟随由 Game 处理
  }

  _checkDayChange() {
    const d = this.day;
    if (d !== (this._lastDay ?? d)) {
      const prev = this._lastDay;
      this._lastDay = d;
      if (prev !== undefined) this.onNewDay(d);
    } else {
      this._lastDay = d;
    }
  }

  onNewDay(day) {
    this.stats.daysPlayed = day;
    // 春天/换季提示
    if ((day - 1) % DAYS_PER_SEASON === 0 && day > 1) {
      this.addLog(`—— ${this.seasonName}天到了 ——`, 'season');
    }
    // 天气
    this.weather = this.rollWeather();
    for (const p of this.world.plots) p.wetUntil = 0;
    if (this.isRainy) {
      for (const p of this.world.plots) p.wetUntil = this.absHours + 14;
    }
    const thirsty = this.world.plots.filter((p) => p.crop && !p.wetUntil).length;
    this.addLog(`第 ${day} 天 · ${this.seasonName}季`, 'day');
    if (this.weather === 'rain') {
      this.addLog('下雨了，地里的作物自己喝饱了水。', 'weather');
      for (const v of this.villagers) v.feel('rain');
    } else if (this.weather === 'storm') {
      this.addLog('暴雨来了，户外干活变得困难。', 'warn');
      for (const v of this.villagers) v.feel('storm');
    } else if (thirsty > 0) {
      this.addLog(`有 ${thirsty} 块地在等水。`, 'warn');
    }
    // 每日委托
    this.resetDayStats();
    this.generateQuests();
    this.addLog('新的委托已经贴在集市旁边了。', 'quest');
    // 昨日小结
    this.daySummary = {
      earned: Math.max(0, this.stats.earned - (this._statMark.earned || 0)),
      harvested: Math.max(0, this.stats.harvested - (this._statMark.harvested || 0)),
      quests: Math.max(0, this.questsDone - (this._statMark.quests || 0)),
      money: this.money,
    };
    this._statMark = { earned: this.stats.earned, harvested: this.stats.harvested, quests: this.questsDone };
    this.checkRegionUnlocks();
    this.uiDirty = true;
    this.emit('dayStart', { day, seasonName: this.seasonName, summary: this.daySummary });
  }

  // ---------- 查询 ----------
  isWet(p) { return p.wetUntil > this.absHours; }
  cropProgress(p) {
    if (!p.crop) return 0;
    const def = CROPS[p.crop];
    return Math.max(0, Math.min(1, (p.growth || 0) / def.grow));
  }
  cropReady(p) { return p.crop && this.cropProgress(p) >= 0.998; }
  seasonAllows(cropKey) { return CROPS[cropKey].seasons.includes(this.season); }

  nearestFishSpot(v) {
    let best = this.world.fishSpots[0];
    let bd = Infinity;
    for (const s of this.world.fishSpots) {
      const d = Math.hypot(s.x - v.x, s.y - v.y);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  getSeedCount() {
    return Object.entries(this.seeds).reduce((a, [k, v]) => a + v, 0);
  }

  bestSeed() {
    const avail = Object.entries(this.seeds).filter(([k, n]) => n > 0 && this.seasonAllows(k));
    if (!avail.length) return null;
    avail.sort((a, b) => CROPS[a[0]].seedCost - CROPS[b[0]].seedCost);
    return avail[0][0];
  }

  // ---------- 指令校验 ----------
  validateOrder(type, tx, ty) {
    const w = this.world;
    if (type === 'eat') return { ok: true };
    if (type === 'rest') return { ok: true };
    if (type === 'chat') {
      const other = this.villagers.find((v) => v !== this._issuer && v.state !== 'sleeping');
      if (!other) return { ok: false, msg: '没人可以聊天' };
      return { ok: true };
    }
    if (type === 'fish') {
      if (this.villagers.filter((v) => v.task && v.task.type === 'fish' && v !== this._issuer).length >= this.world.fishSpots.length) {
        return { ok: false, msg: '钓鱼位都有人了' };
      }
      if (this.hour < 6 || this.hour >= 20) return { ok: false, msg: '天太黑了，看不清浮漂' };
      if (this.weather === 'storm') return { ok: false, msg: '暴雨天没法钓鱼' };
      return { ok: true };
    }
    if (type === 'collect') {
      const a = this.world.animals.find((x) => x.ready && Math.hypot(x.x - tx, x.y - ty) < 2.4);
      if (!a) return { ok: false, msg: '附近没有可以收的牧产' };
      return { ok: true };
    }
    if (type === 'forage') {
      const f = this.world.forages.find((x) => x.x === tx && x.y === ty && !x.taken);
      if (!f) return { ok: false, msg: '这里没有可采集的东西' };
      return { ok: true };
    }
    if (type === 'mine') {
      const r = this.world.rockAt(tx, ty);
      if (!r || r.mined) return { ok: false, msg: '这块石头已经挖过了' };
      if (r.x >= 40 && !this.isRegionUnlocked('forest')) return { ok: false, msg: '后山林地还没解锁' };
      return { ok: true };
    }
    if (type === 'chop') {
      const tree = this.world.treeAt(tx, ty);
      if (!tree) return { ok: false, msg: '这里没有可以砍的树' };
      if (this.weather === 'storm') return { ok: false, msg: '风雨太大，砍树太危险' };
      return { ok: true };
    }
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) {
      return { ok: false, msg: '先点一块地' };
    }
    const plot = w.plotAt(tx, ty);
    if (!plot) return { ok: false, msg: '那里不是农田' };
    if (type === 'plow') {
      if (plot.state === 'plowed') return { ok: false, msg: '这块已经开垦过了' };
      return { ok: true };
    }
    if (type === 'plant') {
      if (plot.state !== 'plowed') return { ok: false, msg: '得先开垦' };
      if (plot.crop) return { ok: false, msg: '这块已经种上了' };
      if (this.season === 3) return { ok: false, msg: '冬天种不了东西' };
      if (!this.bestSeed() && this.money < 6) return { ok: false, msg: '没有种子了，去集市买' };
      return { ok: true };
    }
    if (type === 'water') {
      if (!plot.crop && plot.state !== 'plowed') return { ok: false, msg: '这块地还没开垦' };
      if (this.isWet(plot)) return { ok: false, msg: '刚浇过，土还湿着' };
      return { ok: true };
    }
    if (type === 'harvest') {
      if (!plot.crop) return { ok: false, msg: '这块地没种东西' };
      if (!this.cropReady(plot)) return { ok: false, msg: '还没成熟' };
      return { ok: true };
    }
    return { ok: true };
  }

  // 用于校验时临时设置“发起者”（聊天/钓鱼检查）
  setIssuer(v) { this._issuer = v; }

  // ---------- 执行工作 ----------
  applyWork(v, task) {
    const w = this.world;
    const t = task.type;
    if (t === 'plow') {
      const p = w.plotAt(task.tx, task.ty);
      if (!p || p.state !== 'grass') return { fail: true, msg: '这块地不用开垦了' };
      p.state = 'plowed';
      return { ok: true };
    }
    if (t === 'plant') {
      const p = w.plotAt(task.tx, task.ty);
      if (!p || p.state !== 'plowed' || p.crop) return { fail: true, msg: '种不下了' };
      let seed = this.bestSeed();
      if (seed) {
        this.seeds[seed] = (this.seeds[seed] || 0) - 1;
        if (this.seeds[seed] <= 0) delete this.seeds[seed];
      } else {
        const cheap = Object.entries(CROPS)
          .filter(([k, c]) => this.seasonAllows(k) && c.seedCost <= this.money)
          .sort((a, b) => a[1].seedCost - b[1].seedCost)[0];
        if (!cheap) return { fail: true, msg: '没有种子，也没钱买' };
        seed = cheap[0];
        this.money -= CROPS[seed].seedCost;
        this.addLog(`买了 ${CROPS[seed].name}种子 (-${CROPS[seed].seedCost}G)`, 'buy');
      }
      p.crop = seed;
      p.growth = 0;
      p.plantedAt = this.absHours;
      p.wetUntil = this.absHours + WATER_HOLD_HOURS * 0.5;
      this.stats.planted++;
      this.addLog(`${v.name} 种下了${CROPS[seed].name}`, 'plant');
      this.uiDirty = true;
      return { ok: true, planted: seed };
    }
    if (t === 'water') {
      const p = w.plotAt(task.tx, task.ty);
      if (!p) return { fail: true, msg: '找不到这块地' };
      p.wetUntil = this.absHours + WATER_HOLD_HOURS;
      this.dayStats.water++;
      return { ok: true };
    }
    if (t === 'harvest') {
      const p = w.plotAt(task.tx, task.ty);
      if (!p || !p.crop) return { fail: true, msg: '没东西可收' };
      if (!this.cropReady(p)) return { fail: true, msg: '还没成熟' };
      const crop = p.crop;
      const def = CROPS[crop];
      p.crop = null;
      p.growth = 0;
      p.state = 'plowed';
      p.wetUntil = 0;
      this.stats.harvested++;
      this.dayStats.harvest[crop] = (this.dayStats.harvest[crop] || 0) + 1;
      this.checkRegionUnlocks();
      if (this.autoSell) {
        this.money += def.sell;
        this.stats.earned += def.sell;
        this.addLog(`${v.name} 收获了${def.name} +${def.sell}G`, 'money');
        return { ok: true, sold: def.sell };
      }
      this.depositCarry(v, { kind: crop, n: 1 });
      return { ok: true };
    }
    if (t === 'collect') {
      const a = w.animals.find((x) => x.ready && Math.hypot(x.x - task.tx, x.y - task.ty) < 2.4);
      if (!a) return { fail: true, msg: '牧产已经收走了' };
      a.ready = false;
      a.produceT = 0;
      this.stats.collected = (this.stats.collected || 0) + 1;
      const kind = a.product;
      const n = a.kind === 'cow' ? 2 : 1;
      this.dayStats.collect = (this.dayStats.collect || 0) + 1;
      this.addLog(`${v.name} 收了${this.itemName(kind)} ×${n}`, 'animal');
      return { ok: true, carry: { kind, n } };
    }
    if (t === 'mine') {
      const rock = w.rockAt ? w.rockAt(task.tx, task.ty) : w.rocks.find((r) => r.x === task.tx && r.y === task.ty);
      if (!rock || rock.mined) return { fail: true, msg: '这块矿石已经挖过了' };
      rock.mined = true;
      rock.regrowAt = this.absHours + 12;
      this.stats.mined = (this.stats.mined || 0) + 1;
      const kind = rock.ore ? 'ore' : 'stone';
      const n = rock.ore ? 1 : 2;
      this.dayStats.stone = (this.dayStats.stone || 0) + n;
      this.addLog(`${v.name} 挖到了${this.itemName(kind)} ×${n}`, 'mine');
      return { ok: true, carry: { kind, n } };
    }
    if (t === 'chop') {
      const tree = w.trees.find((tr) => tr.x === task.tx && tr.y === task.ty && tr.regrowAt <= this.absHours);
      if (!tree) return { fail: true, msg: '树已经砍倒了' };
      tree.chopped = true;
      tree.regrowAt = this.absHours + 6 + Math.random() * 4;
      this.stats.wood += 2;
      this.dayStats.wood += 2;
      this.addLog(`${v.name} 砍了两根木头`, 'wood');
      return { ok: true, carry: { kind: 'wood', n: 2 } };
    }
    if (t === 'fish') {
      if (this.villagers.filter((x) => x !== v && x.task && x.task.type === 'fish' && x.task.stage === 'working').length >= this.world.fishSpots.length) {
        return { fail: true, msg: '钓鱼位都有人了' };
      }
      this.stats.fish++;
      this.dayStats.fish++;
      this.addLog(`${v.name} 钓上一条鱼`, 'fish');
      return { ok: true, carry: { kind: 'fish', n: 1 } };
    }
    if (t === 'forage') {
      const f = w.forages.find((x) => x.x === task.tx && x.y === task.ty && !x.taken);
      if (!f) return { fail: true, msg: '已经被人采走了' };
      f.taken = true;
      f.regrowAt = this.absHours + 10;
      this.dayStats.forage++;
      return { ok: true, carry: { kind: f.kind === 'mushroom' ? 'mushroom' : 'berry', n: 1 } };
    }
    if (t === 'eat') {
      v.needs.hunger = Math.max(0, v.needs.hunger - 68);
      v.needs.social = Math.min(100, v.needs.social + 5);
      v.feel('eat');
      if (this.inventory.bread > 0) {
        this.inventory.bread--;
        this.addLog(`${v.name} 吃了块面包`, 'eat');
      } else if (this.money >= 4) {
        this.money -= 4;
        this.addLog(`${v.name} 在集市买了吃的 (-4G)`, 'eat');
      } else {
        this.addLog(`${v.name} 饿着肚子`, 'warn');
      }
      return { ok: true };
    }
    if (t === 'rest') {
      v.needs.energy = Math.min(100, v.needs.energy + 35);
      v.feel('rest');
      return { ok: true };
    }
    if (t === 'chat') {
      v.needs.social = Math.min(100, v.needs.social + 40);
      v.satisfaction = Math.min(100, v.satisfaction + 2);
      v.feel('chat_friend');
      if (task.other) {
        task.other.needs.social = Math.min(100, task.other.needs.social + 30);
        task.other.feel('chat_friend');
        const [lineA, lineB] = villageChatLines(v, task.other);
        v.say(lineA, '💬', 3.2);
        task.other.say(lineB, '💬', 3.2);
        this.addLog(`${v.name} 和 ${task.other.name} 聊了会儿天`, 'chat');
      }
      this.dayStats.chat++;
      return { ok: true };
    }
    return { ok: true };
  }

  depositCarry(v, carry) {
    const { kind, n } = carry;
    if (kind === 'wood') {
      this.inventory.wood += n;
      this.addLog(`${v.name} 把木头放进农舍仓库 (+${n} 木头)`, 'wood');
    } else if (kind === 'fish') {
      this.inventory.fish += n;
      this.addLog(`${v.name} 把鱼放进了仓库 (+${n} 鱼)`, 'fish');
    } else if (kind === 'mushroom') {
      this.inventory.mushroom = (this.inventory.mushroom || 0) + n;
      this.addLog(`${v.name} 采到了蘑菇 (+${n})`, 'forage');
    } else if (kind === 'berry') {
      this.inventory.berry = (this.inventory.berry || 0) + n;
      this.addLog(`${v.name} 采到了野莓 (+${n})`, 'forage');
    } else if (kind === 'stone' || kind === 'ore' || kind === 'flour' || kind === 'egg' || kind === 'milk' || kind === 'wool') {
      this.inventory[kind] = (this.inventory[kind] || 0) + n;
      this.addLog(`${v.name} 把${this.itemName(kind)}放进仓库 (+${n})`, 'mine');
    } else if (CROPS[kind]) {
      // 关闭自动出售时：进仓
      this.inventory[kind] = (this.inventory[kind] || 0) + n;
      this.addLog(`${v.name} 把${CROPS[kind].name}放进仓库 (+${n})`, 'harvest');
    }
    this.uiDirty = true;
  }

  // ---------- 商店 ----------
  buySeed(key, n = 1) {
    const def = CROPS[key];
    if (!def) return { ok: false, msg: '没有这种种子' };
    if (this.season === 3) return { ok: false, msg: '冬天不能播种' };
    const cost = def.seedCost * n;
    if (this.money < cost) return { ok: false, msg: '钱不够' };
    this.money -= cost;
    this.seeds[key] = (this.seeds[key] || 0) + n;
    this.addLog(`买了 ${n} 包${def.name}种子 (-${cost}G)`, 'buy');
    this.uiDirty = true;
    return { ok: true, msg: `买下 ${n} 包${def.name}种子` };
  }

  sellItem(kind, n = 1) {
    const price = this.itemPrice(kind);
    if (!price) return { ok: false };
    if ((this.inventory[kind] || 0) < n) return { ok: false, msg: '数量不够' };
    this.inventory[kind] -= n;
    if (this.inventory[kind] <= 0) delete this.inventory[kind];
    this.money += price * n;
    this.stats.earned += price * n;
    this.addLog(`卖出 ${n} 个${this.itemName(kind)} (+${price * n}G)`, 'money');
    this.uiDirty = true;
    return { ok: true };
  }

  sellAll() {
    let total = 0;
    for (const [k, n] of Object.entries(this.inventory)) {
      if (k === 'bread') continue;
      const p = this.itemPrice(k);
      if (!p || !n) continue;
      total += p * n;
      delete this.inventory[k];
    }
    if (!total) return { ok: false, msg: '仓库里没什么可卖的' };
    this.money += total;
    this.stats.earned += total;
    this.addLog(`清空仓库，卖出 +${total}G`, 'money');
    this.uiDirty = true;
    return { ok: true, msg: `卖出 +${total}G` };
  }

  itemPrice(kind) {
    if (CROPS[kind]) return CROPS[kind].sell;
    if (kind === 'wood') return WOOD_PRICE;
    if (kind === 'fish') return Math.round(FISH_PRICE * (this.stageFlags?.fishBonus ? 1.2 : 1));
    if (kind === 'mushroom') return 18;
    if (kind === 'stone') return 24;
    if (kind === 'ore') return Math.round(55 * (this.stageFlags?.oreBonus ? 1.3 : 1));
    if (kind === 'flour') return 60;
    if (kind === 'egg') return 14;
    if (kind === 'milk') return 38;
    if (kind === 'wool') return 52;
    if (kind === 'berry') return 12;
    return 0;
  }
  itemName(kind) {
    if (CROPS[kind]) return CROPS[kind].name;
    return { wood: '木头', fish: '鱼', mushroom: '蘑菇', berry: '野莓', bread: '面包', stone: '石头', ore: '矿石', flour: '面粉', egg: '鸡蛋', milk: '牛奶', wool: '羊毛' }[kind] || kind;
  }

  buyBread(n = 1) {
    const cost = 8 * n;
    if (this.money < cost) return { ok: false, msg: '钱不够' };
    this.money -= cost;
    this.inventory.bread = (this.inventory.bread || 0) + n;
    this.uiDirty = true;
    return { ok: true };
  }

  hire(def) {
    if (this.money < def.cost) return { ok: false, msg: '钱不够' };
    if (this.villagers.some((v) => v.id === def.id)) return { ok: false, msg: '已经雇过了' };
    this.money -= def.cost;
    const v = new Villager(def, this);
    this.villagers.push(v);
    this.addLog(`${def.name} 加入了小镇！`, 'hire');
    this.uiDirty = true;
    return { ok: true, villager: v };
  }

  // ---------- 日志 ----------
  addLog(text, type = 'info') {
    this.logs.push({ text, type, t: this.absHours });
    if (this.logs.length > 60) this.logs.shift();
    this.uiDirty = true;
    if (this.onLog) this.onLog(text, type);
  }

  // ---------- 存档 ----------
  serialize() {
    return {
      v: 1,
      absHours: this.absHours,
      money: this.money,
      seeds: this.seeds,
      inventory: this.inventory,
      autoSell: this.autoSell,
      stats: this.stats,
      speed: this.speed,
      weather: this.weather,
      regionsUnlocked: [...this.unlockedRegions],
      regionsDiscovered: [...this.discoveredRegions],
      bridgeOpen: this.world.bridgeOpen,
      currentRegion: this.currentRegion,
      quests: this.quests,
      dayStats: this.dayStats,
      questsDone: this.questsDone,
      achievements: this.achievements,
      bondMilestones: this.bondMilestones,
      aiTalks: this.aiTalks,
      stageIndex: this.stageIndex,
      stageFlags: this.stageFlags,
      ownedOutfits: this.ownedOutfits,
      equippedOutfit: this.equippedOutfit,
      bond: this.bond,
      autoSkipNight: this.autoSkipNight,
      story: (this.story || []).slice(-20),
      hired: this.villagers.filter((v) => v.def.cost).map((v) => v.id),
      villagers: this.villagers.map((v) => ({
        id: v.id, x: v.x, y: v.y,
        queue: (v.queue || []).slice(0, 4),
        needs: v.needs, satisfaction: v.satisfaction, completed: v.completed, likes: v.likes,
        emo: { cur: { ...v.emo.cur }, trust: v.emo.trust },
        memory: {
          talkCount: v.memory.talkCount || 0,
          compliments: v.memory.compliments || 0,
          recentTopics: (v.memory.recentTopics || []).slice(-6),
          conversation: (v.memory.conversation || []).slice(-12),
        },
      })),
      plots: this.world.plots.map((p) => ({
        x: p.x, y: p.y, state: p.state, crop: p.crop, growth: p.growth, wetUntil: p.wetUntil,
      })),
      rocks: this.world.rocks.map((r) => ({ x: r.x, y: r.y, mined: r.mined, regrowAt: r.regrowAt })),
      trees: Object.fromEntries(this.world.trees.map((t) => [t.id, { regrowAt: t.regrowAt, chopped: t.chopped }])),
      forages: Object.fromEntries(this.world.forages.map((f) => [`${f.x},${f.y}`, { taken: f.taken, regrowAt: f.regrowAt }])),
    };
  }

  static load(snap) {
    const sim = new Sim();
    if (!snap) return sim;
    try {
      sim.absHours = snap.absHours ?? 6;
      sim.money = snap.money ?? START_MONEY;
      sim.seeds = snap.seeds || {};
      sim.inventory = snap.inventory || {};
      sim.autoSell = snap.autoSell ?? true;
      sim.stats = snap.stats || sim.stats;
      sim.speed = snap.speed ?? 1;
      sim.weather = snap.weather || 'sunny';
      if (Array.isArray(snap.regionsUnlocked)) sim.unlockedRegions = new Set(snap.regionsUnlocked);
      if (Array.isArray(snap.regionsDiscovered)) sim.discoveredRegions = new Set(snap.regionsDiscovered);
      sim.currentRegion = snap.currentRegion || 'village';
      if (snap.bridgeOpen || sim.unlockedRegions.has('forest')) {
        sim.world.bridgeOpen = true;
        sim.world.block[sim.world.idx(39, 13)] = 0;
        sim.world.props = sim.world.props.filter((p) => p.type !== 'gate');
      }
      sim.quests = Array.isArray(snap.quests) ? snap.quests : sim.quests;
      sim.dayStats = snap.dayStats || sim.dayStats;
      sim.questsDone = snap.questsDone || 0;
      sim.achievements = snap.achievements || {};
      sim.bondMilestones = snap.bondMilestones || {};
      sim.aiTalks = snap.aiTalks || 0;
      sim.stageIndex = snap.stageIndex || 0;
      if (snap.stageFlags) sim.stageFlags = { ...sim.stageFlags, ...snap.stageFlags };
      if (snap.ownedOutfits) sim.ownedOutfits = { ...sim.ownedOutfits, ...snap.ownedOutfits };
      if (snap.equippedOutfit) sim.equippedOutfit = { ...sim.equippedOutfit, ...snap.equippedOutfit };
      sim.bond = snap.bond ?? 50;
      sim.autoSkipNight = !!snap.autoSkipNight;
      sim.story = Array.isArray(snap.story) ? snap.story : [];
      if (!sim.quests.length) sim.generateQuests();
      (snap.hired || []).forEach((id) => {
        const def = HIRE_POOL.find((d) => d.id === id);
        if (def && !sim.villagers.some((v) => v.id === id)) sim.villagers.push(new Villager(def, sim));
      });
      for (const s of snap.villagers || []) {
        const v = sim.villagers.find((x) => x.id === s.id);
        if (!v) continue;
        v.x = s.x; v.y = s.y;
        if (Array.isArray(s.queue)) v.queue = s.queue.slice(0, 4);
        if (s.needs) v.needs = s.needs;
        v.satisfaction = s.satisfaction ?? v.satisfaction;
        v.completed = s.completed || 0;
        if (s.likes) v.likes = s.likes;
        if (s.emo) {
          if (s.emo.cur) for (const k of Object.keys(v.emo.cur)) if (s.emo.cur[k] !== undefined) v.emo.cur[k] = s.emo.cur[k];
          if (s.emo.trust !== undefined) v.emo.trust = s.emo.trust;
        }
        if (s.memory) v.memory = { ...v.memory, ...s.memory };
        v._updateMood();
      }
      // 读档后应用已穿时装
      for (const v of sim.villagers) {
        const od = sim.outfitDef(v.id, sim.equippedOutfit[v.id] || 'default');
        if (od) v.applyOutfit(od);
      }
      for (const sr of snap.rocks || []) {
        const rock = sim.world.rockAt(sr.x, sr.y);
        if (rock) { rock.mined = !!sr.mined; rock.regrowAt = sr.regrowAt || 0; }
      }
      for (const p of snap.plots || []) {
        const plot = sim.world.plotAt(p.x, p.y);
        if (!plot) continue;
        plot.state = p.state;
        plot.crop = p.crop;
        plot.growth = p.growth || 0;
        plot.wetUntil = p.wetUntil || 0;
      }
      for (const t of sim.world.trees) {
        const s = snap.trees?.[t.id];
        if (s) { t.regrowAt = s.regrowAt || 0; t.chopped = !!s.chopped; }
      }
      for (const f of sim.world.forages) {
        const s = snap.forages?.[`${f.x},${f.y}`];
        if (s) { f.taken = !!s.taken; f.regrowAt = s.regrowAt || 0; }
      }
    } catch (e) {
      console.warn('存档读取失败', e);
    }
    return sim;
  }
}







































