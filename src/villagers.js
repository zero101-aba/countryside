// 村民：需求、性格、情绪、想法、自主行动、任务执行
import { WORDS } from './words.js';
import { ORDERS, VILLAGERS, HIRE_POOL, NEED_RATES, WALK_SPEED, WAKE_HOUR, SLEEP_HOUR } from './config.js';
import { pathToNear } from './path.js';
import { tickDesire } from './desires.js';
import {
  createEmotions, applyFeel, tickEmotions, dominantEmotion, emotionView, EMO_META,
} from './emotions.js';

let UID = 1;

export class Villager {
  constructor(def, sim) {
    this.uid = UID++;
    this.def = def;
    this.id = def.id;
    this.name = def.name;
    this.role = def.role;
    this.sim = sim;
    this.colors = {
      id: def.id,
      skin: def.skin, hair: def.hair, shirt: def.shirt, pants: def.pants,
      hat: def.hat, hatColor: def.hatColor, apron: def.apron,
      // 外观细节（参考真人照片做的像素特征）
      bun: def.bun, bangs: def.bangs, longHair: def.longHair,
      hood: def.hood, hoodColor: def.hoodColor, logo: def.logo,
      drawstrings: def.drawstrings, necklace: def.necklace, lips: def.lips,
      eyebrows: def.eyebrows, spikes: def.spikes,
      // 可组合的外观部件
      hairStyle: def.hairStyle, tie: def.tie, hairpin: def.hairpin,
      beard: def.beard, beardColor: def.beardColor,
      accessory: def.accessory, accessoryColor: def.accessoryColor,
      vest: def.vest, vestColor: def.vestColor,
      satchel: def.satchel, satchelColor: def.satchelColor,
      boots: def.boots, belt: def.belt,
    };
    this.baseColors = { ...this.colors };
    this.appearanceKey = 'default';
    this.personality = { ...def.personality };
    this.likes = (def.likes || []).slice();
    this.dislikes = (def.dislikes || []).slice();
    this.speed = def.speed || 1;
    this.workSpeed = def.workSpeed || 1;
    this.bio = def.bio || '';
    this.lead = !!def.lead;
    this.traits = (def.traits || []).slice();
    this.aspiration = def.aspiration || '';
    this.desire = null;
    this.desireCd = 2 + Math.random() * 5;

    const home = sim.world.buildingById(def.house) || sim.world.buildings[0];
    this.home = home;
    // 同一屋檐下的人错开一点站位，避免叠在一起
    const mates = sim.villagers.filter((o) => o.home === home).length;
    this.homePos = { x: home.door + 0.5 + mates * 0.6, y: home.y + home.h + 0.45 };

    this.x = this.homePos.x;
    this.y = this.homePos.y;
    this.dir = 'down';
    this.animT = 0;
    this.frame = 0;
    this.action = 'idle';
    this.alpha = 1;

    // 状态
    this.needs = { hunger: 12 + Math.random() * 25, energy: 78 + Math.random() * 18, social: 50 + Math.random() * 20 };
    this.satisfaction = 60;
    this.mood = 60;
    this.moodEmoji = '🙂';
    this.emotionKey = 'calm';

    // 独立的情绪系统
    this.emo = createEmotions(this.id);
    this.memory = {
      compliments: 0,
      talkCount: 0,
      recentTopics: [],
      conversation: [],
      lastOrderAt: -999,
    };
    this.lastOrderType = null;

    this.state = 'auto';      // auto | task | goingSleep | sleeping | wander
    this.task = null;
    this.queue = [];
    this.path = null;
    this.pathIndex = 0;
    this.walkT = 0;
    this.thinkT = Math.random() * 3;
    this.idleT = Math.random() * 1.5;
    this.speech = null;
    this.thought = '今天也是个好天气。';
    this.thoughtEmoji = '💭';
    this.carry = null;
    this.completed = 0;
    this.history = {};
    this.lastFailAt = -999;

    this.say(this._pick(WORDS.morning, '天亮了。'), '🌤', 3);
  }

  get hunger() { return this.needs.hunger; }
  get energy() { return this.needs.energy; }

  // ---------- 情绪 ----------
  feel(event, mult = 1) {
    applyFeel(this.emo, event, mult);
    this._updateMood();
    return this;
  }

  get emotion() { return dominantEmotion(this.emo); }
  get emotionInfo() { return emotionView(this.emo); }

  // 情绪对干活效率的影响：高兴/信任加成，恼火/疲惫拖后腿
  emotionWorkMul() {
    const c = this.emo.cur, b = this.emo.baseline;
    let m = 1;
    m += (c.joy - b.joy) * 0.0022;
    m -= (c.anger - b.anger) * 0.0030;
    m -= (c.fatigue - b.fatigue) * 0.0022;
    m -= (c.sadness - b.sadness) * 0.0015;
    m += (this.emo.trust - 50) * 0.0012;
    return Math.max(0.68, Math.min(1.32, m));
  }

  say(text, emoji = '💬', dur = 3.2) {
    this.speech = { text, emoji, t: dur };
  }
  think(text, emoji = '💭') {
    this.thought = text;
    this.thoughtEmoji = emoji;
  }
  jobPref(type) {
    if (this.likes.includes(type)) return 1;
    if (this.dislikes.includes(type)) return -1;
    return 0;
  }
  _pick(arr, fallback) {
    if (!arr || !arr.length) return fallback;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ---------- 主更新 ----------
  update(dt) {
    const sim = this.sim;
    const working = this.state === 'task' && this.task && this.task.stage === 'working';

    const ns = sim.needScale || 1;
    this.needs.hunger += NEED_RATES.hunger * this.personality.appetite * ns * dt;
    this.needs.energy -= NEED_RATES.energy * (working ? 2.2 : this.state === 'sleeping' ? -1.6 : 0.7) * ns * dt;
    this.needs.social += (this._chatCool > 0 ? 14 : NEED_RATES.social) * ns * dt;
    if (this._chatCool > 0) this._chatCool -= dt;
    this.needs.hunger = Math.max(0, Math.min(100, this.needs.hunger));
    this.needs.energy = Math.max(0, Math.min(100, this.needs.energy));
    this.needs.social = Math.max(0, Math.min(100, this.needs.social));

    // 情绪随时间回落，同时被饥饱/精力/社交/工作性质影响
    const likedWork = working && this.jobPref(this.task.type) > 0;
    const dislikedWork = working && this.jobPref(this.task.type) < 0;
    tickEmotions(this.emo, dt * ns, {
      hunger: this.needs.hunger,
      energy: this.needs.energy,
      social: this.needs.social,
      night: this.state !== 'sleeping' && (sim.hour >= 21 || sim.hour < 6),
      likedWork,
      dislikedWork,
    });

    if (this.speech) { this.speech.t -= dt; if (this.speech.t <= 0) this.speech = null; }
    this.thinkT -= dt;
    if (this.thinkT <= 0) { this.thinkT = 2.4 + Math.random() * 2.2; this._updateThought(); }

    this._updateMood();
    this.animT += dt;

    switch (this.state) {
      case 'goingSleep': this._updateGoingSleep(dt); break;
      case 'sleeping': this._updateSleeping(dt); break;
      case 'wander': this._updateWander(dt); break;
      case 'task': this._updateTask(dt); break;
      default: this._updateAuto(dt); break;
    }
  }

  applyOutfit(def) {
    this.colors = { ...this.baseColors };
    if (def && def.c) {
      for (const [k, val] of Object.entries(def.c)) {
        if (val !== undefined) this.colors[k] = val;
      }
    }
    this.appearanceKey = def ? def.id : 'default';
  }

  _updateMood() {
    const e = this.emo.cur;
    const dom = dominantEmotion(this.emo);
    this.emotionKey = dom.key;
    const m = 50
      + (e.joy - 40) * 0.40
      + (40 - e.anger) * 0.30
      + (40 - e.sadness) * 0.25
      + (40 - e.fatigue) * 0.20
      + (this.satisfaction - 50) * 0.15;
    this.mood = Math.max(0, Math.min(100, m));
    // 表情优先反映当前最强烈的情绪
    if (this.state === 'sleeping') this.moodEmoji = '😴';
    else this.moodEmoji = dom.emoji;
  }

  _updateThought() {
    if (this.state === 'sleeping') { this.think('困了……明天再说。', '😴'); return; }
    if (this.state === 'goingSleep') { this.think('天黑了，回家睡觉。', '🌙'); return; }
    if (this.state === 'wander') { this.think(this._pick(WORDS.idle, '随便走走。'), '💭'); return; }
    if (this.task) {
      const o = ORDERS[this.task.type];
      if (this.task.stage === 'toWork') {
        this.think(this.task.byPlayer
          ? this._pick(WORDS.walking, '东家让我去' + o.verb + '。')
          : '该去' + o.verb + '了。', '💭');
      } else if (this.task.stage === 'working') {
        this.think(this._pick(this._workThoughts(this.task.type), '手里的活儿得干完。'), this._workEmoji(this.task.type));
      } else if (this.task.stage === 'deliver') {
        this.think('先把东西送回' + (this.task.deliverTo?.name || '农舍') + '。', '🧺');
      }
      return;
    }
    // 情绪主导时，想法也会变得情绪化
    const dom = dominantEmotion(this.emo);
    const emoThoughts = {
      anger: ['这活儿干得人一肚子火。', '哼，凭什么都是我。', '越想越气。'],
      sadness: ['……心里空落落的。', '是不是我做得不够好。', '有点想家了。'],
      anxiety: ['地里的水够不够啊。', '总觉得要出事。', '这季的收成，心里没底。'],
      fatigue: ['腰快断了。', '眼皮打架。', '真想倒头睡一觉。'],
      joy: ['今天什么都顺。', '哼两句小曲儿。', '这日子有奔头。'],
    };
    if (dom.key !== 'calm' && Math.random() < 0.7) {
      this.think(this._pick(emoThoughts[dom.key] || [], '……'), dom.emoji);
      return;
    }
    if (this.needs.hunger > 70) this.think('肚子在叫了，得弄点吃的。', '🍞');
    else if (this.needs.energy < 25) this.think('腰酸背痛，想靠着歇会儿。', '😪');
    else if (this.needs.social < 25) this.think('一个人在田里待久了，有点闷。', '💬');
    else if (this.sim.hour < 9) this.think('早起先看看地里的情况。', '🌤');
    else if (this.sim.hour > 20) this.think('天快黑了，该收工回家了。', '🌇');
    else this.think(this._pick(WORDS.idle, '今天干点什么好呢。'), '💭');
  }

  _workThoughts(type) {
    return {
      plow: ['这土得翻松一点，苗才扎得下根。', '一锄一锄来，急不得。', '荒地变良田，就差这一锄。'],
      plant: ['种子埋下去，就等它发芽了。', '播得匀一点，将来好收拾。'],
      water: ['水得浇透，土喝饱了才长。', '这地干得都裂了。'],
      harvest: ['熟得正好，再不收就老了。', '沉甸甸的，这一季没白忙。'],
      chop: ['这棵树够粗，能出好木头。', '嘿——再来一下。'],
      fish: ['水底下有动静，别急。', '钓鱼靠的是耐心。'],
      forage: ['这丛底下藏了好东西。', '野菜也是一顿饭。'],
      eat: ['先吃饱，才有力气。', '这口热乎的最舒服。'],
      rest: ['就歇一小会儿。', '腰快直不起来了。'],
      chat: ['跟人说说话，心里松快。', '东家长西家短，最爱听这个。'],
    }[type] || ['干活呢。'];
  }
  _workEmoji(t) {
    return { plow: '⛏', plant: '🌱', water: '💧', harvest: '🧺', chop: '🪓', fish: '🎣', forage: '🍄', eat: '🍞', rest: '💤', chat: '💬', mine: '⛏', collect: '🥚' }[t] || '💪';
  }

  // ---------- 自主行为 ----------
  _updateAuto(dt) {
    const sim = this.sim;
    const hr = sim.hour;

    const night = hr >= SLEEP_HOUR || hr < WAKE_HOUR;
    if (night) { this.goSleep(); return; }

    if (this.queue.length) { this._startNextQueued(); if (this.task) return; }
    if (this.needs.hunger > 82) { this.startSelfTask('eat'); return; }
    if (this.needs.energy < 10) { this.startSelfTask('rest'); return; }

    // 自己的念头：没活的时候按性格去做想做的事
    if (tickDesire(sim, this, dt)) return;

    // 傍晚回家
    if (hr >= 19.5) {
      this.idleT -= dt;
      if (Math.hypot(this.homePos.x - this.x, this.homePos.y - this.y) > 2.5 && this.idleT <= 0) {
        this.idleT = 2.6;
        this._walkTo(this.homePos.x, this.homePos.y, 'home');
        return;
      }
      this.action = 'idle';
      return;
    }

    // 发呆/走动
    if (this.idleT > 0) {
      this.idleT -= dt;
      this.action = 'idle';
      this.state = 'auto';
      return;
    }
    this.idleT = 0.5 + Math.random() * 0.9;

    // 找活
    const work = this._pickOwnWork();
    if (work) { this.startAutoTask(work); return; }

    // 找人聊天
    if (this.personality.sociability > 0.55 && this.needs.social < 65 && Math.random() < 0.55) {
      const other = sim.villagers.find((v) => v !== this && v.state === 'auto' && v.state !== 'sleeping' && !v.task);
      if (other && Math.hypot(other.x - this.x, other.y - this.y) < 8) {
        this.startSelfTask('chat', { other });
        return;
      }
    }
    // 闲逛
    if (Math.random() < 0.65) {
      const tx = this.x + (Math.random() - 0.5) * 7;
      const ty = this.y + (Math.random() - 0.5) * 5;
      if (!sim.world.isBlocked(Math.floor(tx), Math.floor(ty))) this._walkTo(tx, ty, 'wander');
      else this.idleT = 1;
    }
  }

  _pickOwnWork() {
    const sim = this.sim;
    const w = sim.world;
    const plots = w.plots;
    const localFisher = this.id === 'ahai';
    if (localFisher) {
      const fish = this.jobPref('fish') > 0 && Math.random() < 0.8;
      if (fish) return { type: 'fish', tx: 34, ty: 13 };
      const f = sim.world.forages.find((x) => !x.taken || x.regrowAt <= sim.absHours);
      if (f && Math.random() < 0.4) return { type: 'forage', tx: f.x, ty: f.y };
      return null;
    }
    const ready = plots.find((p) => p.crop && sim.cropReady(p));
    if (ready && this.jobPref('harvest') >= 0 && Math.random() < 0.8) return { type: 'harvest', tx: ready.x, ty: ready.y };
    const dry = plots.find((p) => p.state === 'plowed' && p.crop && !sim.isWet(p));
    if (dry && this.jobPref('water') >= 0 && Math.random() < 0.62) return { type: 'water', tx: dry.x, ty: dry.y };
    const empty = plots.find((p) => p.state === 'grass');
    if (empty && this.jobPref('plow') >= 0 && Math.random() < 0.4) return { type: 'plow', tx: empty.x, ty: empty.y };
    const tree = w.trees.find((t) => t.regrowAt <= sim.absHours);
    if (tree && this.jobPref('chop') >= 0 && Math.random() < 0.5) return { type: 'chop', tx: tree.x, ty: tree.y };
    const forage = w.forages.find((f) => !f.taken || f.regrowAt <= sim.absHours);
    if (forage && this.jobPref('forage') >= 0 && Math.random() < 0.4) return { type: 'forage', tx: forage.x, ty: forage.y };
    if (this.jobPref('fish') > 0 && Math.random() < (this.id === 'ahai' ? 0.8 : 0.25)) return { type: 'fish', tx: 34, ty: 13 };
    return null;
  }

  startSelfTask(type, extra = {}) {
    this.startTask(type, extra.tx, extra.ty, { byPlayer: false, ...extra });
  }
  startAutoTask(work) {
    this.startTask(work.type, work.tx, work.ty, { byPlayer: false });
  }

  // ---------- 玩家指令 ----------
  issueOrder(type, tx, ty) {
    if (this.state === 'sleeping') {
      this.say('……（睡得正香）', '😴');
      return { ok: false, msg: `${this.name}睡着了` };
    }
    // 正在气头上：可能直接顶回来
    const dom = dominantEmotion(this.emo);
    if (dom.key === 'anger' && this.emo.cur.anger > 72 && this.jobPref(type) <= 0 && Math.random() < 0.5) {
      this.memory.lastOrderAt = this.sim.absHours;
      this.say(this._pick(['我不干。', '这会儿谁爱干谁干。', '……让我缓缓。']), '😠');
      this.feel('refused');
      return { ok: false, msg: `${this.name}正在气头上，不肯听` };
    }
    if (this.needs.energy < 8) {
      this.say('不行了，得先歇口气……', '😪');
      this.satisfaction = Math.max(0, this.satisfaction - 4);
      this.feel('tired');
      return { ok: false, msg: `${this.name}太累了，先让他休息吧` };
    }
    this.sim.setIssuer(this);
    const check = this.sim.validateOrder(type, tx, ty);
    if (!check.ok) {
      this.say(check.msg, '💢');
      return check;
    }
    if (type === 'chat') {
      const other = this.sim.villagers.find((v) => v !== this && v.state !== 'sleeping');
      if (other) { tx = other.x; ty = other.y; }
      this._chatOther = other;
    }
    const pref = this.jobPref(type);
    const o = ORDERS[type];
    this.desire = null;   // 东家的指令优先
    this.task = null;
    this.path = null;
    this.startTask(type, tx, ty, { byPlayer: true, other: this._chatOther });
    this.lastOrderType = type;
    this.memory.lastOrderAt = this.sim.absHours;

    if (pref < 0 && this.satisfaction < 55) {
      this.say(this._pick(WORDS.refuse, '唉，好吧。'), '😔');
      this.satisfaction = Math.max(0, this.satisfaction - 3);
      this.feel('forced');
    } else if (pref > 0) {
      this.say(this._pick(WORDS.acceptHappy, '好嘞！'), '😊');
      this.satisfaction = Math.min(100, this.satisfaction + 2);
      this.feel('work_liked', 0.6);
    } else {
      this.say(this._pick(WORDS.accept, '知道了。'), '💬');
    }
    if (this.needs.hunger > 70 && pref <= 0) {
      setTimeout(() => { if (this.task) this.say('肚子有点空，干完活得吃点东西。', '🍞'); }, 1600);
    }
    return { ok: true, msg: `已吩咐${this.name}去${o.verb}` };
  }

  enqueueOrder(type, tx, ty, batchId) {
    this.queue.push({ type, tx, ty, batchId });
    if (!this.task && this.state !== 'sleeping' && this.state !== 'goingSleep') this._startNextQueued();
    return true;
  }

  _startNextQueued() {
    let guard = 0;
    while (!this.task && this.queue.length && guard++ < 8) {
      const n = this.queue.shift();
      const res = this.issueOrder(n.type, n.tx, n.ty);
      if (res.ok) { if (this.task) this.task.batchId = n.batchId; return; }
      this.sim.emit('orderRefused', { villager: this, type: n.type, msg: res.msg });
    }
  }

  cancelTask(reason = '这活先放着吧。') {
    if (this.task) {
      this.say(reason, '💭');
      this.task = null;
      this.path = null;
      this.state = 'auto';
      this.idleT = 0.6;
    }
  }

  // ---------- 任务 ----------
  startTask(type, tx, ty, opts = {}) {
    const o = ORDERS[type];
    const task = {
      type, tx, ty, byPlayer: !!opts.byPlayer,
      stage: 'toWork', progress: 0, dur: o.secs, workT: 0,
      deliverTo: null, items: null, other: opts.other || null,
    };
    if (type === 'harvest') {
      const p = this.sim.world.plotAt(tx, ty);
      if (p && p.crop) task.items = { kind: p.crop, n: 1 };
    }
    if (type === 'fish') task.items = { kind: 'fish', n: 1 };
    if (type === 'forage') task.items = { kind: 'forage', n: 1 };
    if (type === 'chop') task.items = { kind: 'wood', n: 2 };

    this.task = task;
    this.state = 'task';
    this.goToWork();
  }

  goToWork() {
    const t = this.task;
    if (!t) return;
    const sim = this.sim;
    let goal;
    if (t.type === 'eat') {
      const spots = [sim.world.buildingById('market'), sim.world.buildingById('shed'), this.home].filter(Boolean);
      let best = spots[0], bd = 1e9;
      for (const s of spots) {
        const d = Math.hypot(s.door + 0.5 - this.x, s.y + s.h + 0.4 - this.y);
        if (d < bd) { bd = d; best = s; }
      }
      goal = { x: best.door + 0.5, y: best.y + best.h + 0.45, name: best.name };
    } else if (t.type === 'rest') {
      goal = { x: this.x, y: this.y, name: '' };
    } else if (t.type === 'chat') {
      goal = t.other ? { x: t.other.x, y: t.other.y, name: '' } : { x: this.x, y: this.y, name: '' };
    } else if (t.type === 'fish') {
      const spot = sim.nearestFishSpot(this);
      goal = { x: spot.x, y: spot.y, name: spot.name };
    } else {
      goal = { x: t.tx, y: t.ty, name: '' };
    }
    t.goal = goal;

    const sameSpot = Math.hypot(goal.x - this.x, goal.y - this.y) < 0.7;
    if (sameSpot || t.type === 'rest' || (t.type === 'chat' && !t.other)) {
      this.path = null;
      this._beginWork();
      return;
    }
    const p = pathToNear(sim.world, Math.floor(this.x), Math.floor(this.y), Math.floor(goal.x), Math.floor(goal.y), { range: 1 });
    if (!p) {
      this.say('过不去啊，路被挡住了。', '😖');
      this.task = null;
      this.state = 'auto';
      this.idleT = 1.5;
      this._startNextQueued();
      return;
    }
    this.path = p.path.map((n) => ({ x: n.x + 0.5, y: n.y + 0.5 }));
    this.pathIndex = 0;
    this.state = 'task';
    t.stage = 'toWork';
    if (!this.path.length) this._beginWork();
  }

  _beginWork() {
    const t = this.task;
    if (!t) return;
    t.stage = 'working';
    t.workT = 0;
    const o = ORDERS[t.type];
    let dur = o.secs;
    const pref = this.jobPref(t.type);
    dur *= (pref > 0 ? 0.86 : pref < 0 ? 1.22 : 1);
    dur *= 1 / this.workSpeed;
    dur *= 1 + (50 - this.satisfaction) * 0.004;
    dur *= 1 / this.emotionWorkMul();
    if (this.sim.weather === 'storm') dur *= 1.35;
    else if (this.sim.weather === 'rain') dur *= 1.12;
    if (this.needs.energy < 25) dur *= 1.25;
    t.dur = Math.max(0.5, dur);
    this.state = 'task';
    this.action = this._actionFor(t.type);
    this.think(this._pick(this._workThoughts(t.type), '干活。'), this._workEmoji(t.type));
    if (t.byPlayer) this.sim.addLog(`${this.name} 开始${o.verb}`, 'info');
    if (t.type === 'chat' && t.other) t.other._chatCool = 2;
  }

  _actionFor(type) {
    return {
      plow: 'hoe', plant: 'seed', water: 'water', harvest: 'pick', chop: 'axe',
      fish: 'fish', forage: 'pick', eat: 'eat', rest: 'rest', chat: 'chat', mine: 'axe', collect: 'pick',
    }[type] || 'idle';
  }

  // 沿路径走，返回 true 表示走完
  _advanceWalk(dt) {
    if (!this.path || this.pathIndex >= this.path.length) { this.path = null; return true; }
    const tgt = this.path[this.pathIndex];
    const dx = tgt.x - this.x, dy = tgt.y - this.y;
    const d = Math.hypot(dx, dy);
    const sp = WALK_SPEED * this.speed * (this.needs.energy < 20 ? 0.72 : 1);
    const step = sp * dt;
    if (d <= step) {
      this.x = tgt.x; this.y = tgt.y;
      this.pathIndex++;
      if (this.pathIndex >= this.path.length) { this.path = null; return true; }
    } else {
      this.x += dx / d * step;
      this.y += dy / d * step;
    }
    if (Math.abs(dx) > Math.abs(dy) + 0.05) this.dir = dx > 0 ? 'right' : 'left';
    else if (Math.abs(dy) > 0.05) this.dir = dy > 0 ? 'down' : 'up';
    this.action = this.carry ? 'carry' : 'walk';
    this.walkT += dt;
    this.frame = Math.floor(this.walkT * 7) % 2;
    return false;
  }

  _updateTask(dt) {
    const t = this.task;
    if (!t) { this.state = 'auto'; return; }
    // 到了睡觉时间：活儿留着，先回家（夜里不再自动接活）
    if ((this.sim.hour >= SLEEP_HOUR || this.sim.hour < WAKE_HOUR) && this.state !== 'goingSleep' && this.state !== 'sleeping') {
      this.say('太晚了，这活明天再干吧。', '😴');
      this.sim.addLog(`${this.name} 收工了，剩下的活明天继续`, 'info');
      this.cancelTask();
      this.goSleep();
      return;
    }
    if (t.stage === 'toWork') {
      if (this.path) {
        if (this._advanceWalk(dt)) this._beginWork();
      } else this._beginWork();
      return;
    }
    if (t.stage === 'working') {
      t.workT += dt;
      const p = Math.min(1, t.workT / t.dur);
      t.progress = p;
      if (t.type === 'chop') this.frame = Math.floor(t.workT * 6) % 4;
      else if (t.type === 'plow' || t.type === 'fish') this.frame = Math.floor(t.workT * 5) % 4;
      else this.frame = Math.floor(t.workT * 4) % 4;
      this.action = this._actionFor(t.type);
      if (p >= 1) this._finishWork();
      return;
    }
    if (t.stage === 'deliver') {
      if (this.path) {
        if (this._advanceWalk(dt)) this._completeDeliver();
      } else this._completeDeliver();
    }
  }

  _finishWork() {
    const t = this.task;
    if (!t) return;
    const sim = this.sim;
    const res = sim.applyWork(this, t);
    sim.emit('taskDone', { villager: this, task: t, res: res || {} });
    const pref = this.jobPref(t.type);
    this.completed++;
    this.history[t.type] = (this.history[t.type] || 0) + 1;
    if (pref === 0 && this.history[t.type] >= 4 && this.likes.length < 4) this.likes.push(t.type);

    let dSat = pref > 0 ? 4 : pref < 0 ? -5 : 1.5;
    if (t.byPlayer) dSat += 1.5;
    if (this.needs.hunger > 75) dSat -= 3;
    if (this.needs.energy < 25) dSat -= 3;
    this.satisfaction = Math.max(0, Math.min(100, this.satisfaction + dSat));

    // 情绪反馈：干喜欢的活会开心，被逼着干会恼
    if (res && res.ok && t.type === 'harvest') this.feel('harvest');
    else if (pref > 0) this.feel('work_liked');
    else if (pref < 0) this.feel('work_disliked');
    else this.feel('work_normal');
    if (this.needs.energy < 14) this.feel('overwork');

    if (res && res.fail) {
      this.say(res.msg || '这活儿干不成。', '😖');
      this.task = null;
      this.path = null;
      this.state = 'auto';
      this.idleT = 1.2;
      this._startNextQueued();
      return;
    }

    // 聊天任务：对白已由 applyWork 设置，不再用“干完了”覆盖
    if (t.type !== 'chat') {
      const happy = this.satisfaction > 62;
      if (pref < 0) this.say(this._pick(WORDS.doneDislike, '干完了。'), '😐');
      else if (happy && pref > 0) this.say(this._pick(WORDS.doneHappy, '成了！'), '😊');
      else this.say(this._pick(WORDS.done, '好了。'), '💬');
    }

    if (res && res.carry) {
      this.carry = res.carry;
      const dest = sim.world.buildingById('shed');
      t.stage = 'deliver';
      t.deliverTo = dest;
      this.goDeliver(dest);
      return;
    }
    this.task = null;
    this.state = 'auto';
    this.idleT = 0.4 + Math.random() * 0.5;
    this._startNextQueued();
  }

  goDeliver(dest) {
    const t = this.task;
    t.stage = 'deliver';
    const p = pathToNear(this.sim.world, Math.floor(this.x), Math.floor(this.y), dest.door, Math.floor(dest.y + dest.h), { range: 1 });
    this.path = p ? p.path.map((n) => ({ x: n.x + 0.5, y: n.y + 0.5 })) : [];
    this.pathIndex = 0;
    this.action = 'carry';
    this.state = 'task';
    this.think('把东西送回去。', '🧺');
    if (!this.path.length) this._completeDeliver();
  }

  _completeDeliver() {
    if (!this.task) return;
    if (this.carry) {
      this.sim.depositCarry(this, this.carry);
      this.carry = null;
    }
    this.task = null;
    this.state = 'auto';
    this.idleT = 0.5;
    this.say(this._pick(['放好了。', '东西都归仓了。', '送到了。'], '放好了。'), '✅', 2.4);
    this._startNextQueued();
  }

  // ---------- 睡眠 ----------
  goSleep() {
    if (this.state === 'sleeping' || this.state === 'goingSleep') return;
    this.cancelTask('该睡了。');
    const home = this.home;
    this.sleepTarget = { x: home.door + 0.5, y: home.y + home.h + 0.45 };
    const p = pathToNear(this.sim.world, Math.floor(this.x), Math.floor(this.y), Math.floor(this.sleepTarget.x), Math.floor(this.sleepTarget.y), { range: 1 });
    this.path = p ? p.path.map((n) => ({ x: n.x + 0.5, y: n.y + 0.5 })) : [];
    this.pathIndex = 0;
    this.state = 'goingSleep';
    this.action = 'walk';
    this.think('天黑了，回家睡觉。', '🌙');
    this.say(this._pick(WORDS.tiredNight, '回去睡了。'), '😴', 2.8);
    this.feel('night', 0.6);
    if (!this.path.length) { this.state = 'sleeping'; this.action = 'sleep'; }
  }

  _updateGoingSleep(dt) {
    this._sleepT = (this._sleepT || 0) + dt;
    if (this.path && this._sleepT < 25) {
      if (this._advanceWalk(dt)) { this.state = 'sleeping'; this.action = 'sleep'; this.path = null; }
    } else {
      // 路被挡住 / 超时：直接进屋睡
      this.state = 'sleeping';
      this.action = 'sleep';
      this.path = null;
    }
  }

  _updateSleeping(dt) {
    this.action = 'sleep';
    this.needs.energy = Math.min(100, this.needs.energy + 8 * dt);
    this.think('睡得正香。', '😴');
    const sim = this.sim;
    if (sim.hour >= WAKE_HOUR && sim.hour < 12) {
      this.state = 'auto';
      this.needs.energy = Math.max(this.needs.energy, 88);
      this.feel('morning');
      this.say(this._pick(WORDS.morning, '天亮了。'), '🌤', 3);
      this.think('睡饱了，今天接着干。', '🌤');
      this.satisfaction = Math.min(100, this.satisfaction + 3);
      this.idleT = 0.5;
    }
  }

  _updateWander(dt) {
    if (this.path) {
      if (this._advanceWalk(dt)) {
        this.state = 'auto';
        this.action = 'idle';
        this.idleT = 1 + Math.random();
      }
    } else {
      this.state = 'auto';
      this.idleT = 0.5;
    }
  }

  _walkTo(tx, ty, why) {
    const p = pathToNear(this.sim.world, Math.floor(this.x), Math.floor(this.y), Math.floor(tx), Math.floor(ty), { range: 0 });
    if (p && p.path.length) {
      this.path = p.path.map((n) => ({ x: n.x + 0.5, y: n.y + 0.5 }));
      this.pathIndex = 0;
      this.state = 'wander';
      this.wander = why;
    } else {
      this.idleT = 1.5;
    }
  }
}

export function makeVillagerById(id, sim) {
  const def = [...VILLAGERS, ...HIRE_POOL].find((v) => v.id === id);
  return def ? new Villager(def, sim) : null;
}















