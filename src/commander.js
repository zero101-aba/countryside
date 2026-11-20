// 自然语言指令解析：把玩家的一句话变成结构化指令
// 只做“理解”，执行由 scheduler + Sim 完成。
import { CROPS, ORDERS } from './config.js';

const CN = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

function numFrom(s) {
  if (!s) return null;
  if (/^\d+$/.test(s)) return Number(s);
  if (s === '十') return 10;
  if (/^十[一二三四五六七八九]$/.test(s)) return 10 + CN[s[1]];
  if (/^[一二三四五六七八九]十$/.test(s)) return CN[s[0]] * 10;
  if (/^[一二三四五六七八九]十[一二三四五六七八九]$/.test(s)) return CN[s[0]] * 10 + CN[s[2]];
  return CN[s] ?? null;
}

const NAME_ORDER = ['laojing', 'chunxing', 'xiaowei', 'xiaoyang', 'xiaoman', 'tiezhu', 'ahai', 'afu', 'ajin'];

function findVillager(text, sim) {
  let best = null;
  for (const v of sim.villagers) {
    if (text.includes(v.name)) {
      if (!best || v.name.length > best.name.length) best = v;
    }
  }
  return best;
}

function findExecutor(text, sim) {
  if (/所有人|大家|全都去|都去|全员|全体|一起/.test(text)) return 'all';
  if (/谁闲|谁都行|随便|自动|安排|看着办|你们/.test(text)) return 'auto';
  const v = findVillager(text, sim);
  return v ? v.id : 'auto';
}

function findRegion(text, sim) {
  const aliases = [
    ['forest', ['后山', '林地', '林场', '山上', '矿洞', '伐木场']],
    ['river', ['清溪', '河岸', '磨坊', '河堤']],
    ['fishing', ['渔村', '码头', '湖湾']],
    ['village', ['村里', '村子', '村口', '农田', '集市']],
  ];
  for (const [id, words] of aliases) {
    if (words.some((w) => text.includes(w))) return sim.regionById(id);
  }
  return null;
}

function insideRegion(r, x, y) {
  return r && x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
}

function findIntent(text) {
  if (/收蛋|捡蛋|挤奶|剪羊毛|收牧产|收动物/.test(text)) return 'collect';
  if (/挖矿|采矿|挖石头|敲石头|挖.{0,3}矿/.test(text)) return 'mine';
  if (/砍树|伐木|砍(?!价)/.test(text)) return 'chop';
  if (/收获|收菜|收了|收一下|采摘|摘/.test(text)) return 'harvest';
  if (/浇水|浇一下|浇|洒水/.test(text)) return 'water';
  if (/播种|种上|种下|种植|种(?!树)/.test(text)) return 'plant';
  if (/开垦|翻地|耕地|锄地|开荒/.test(text)) return 'plow';
  if (/钓鱼|捕鱼|钓/.test(text)) return 'fish';
  if (/采集|采蘑菇|采野|捡/.test(text)) return 'forage';
  if (/吃饭|吃点|饿了|吃点东西/.test(text)) return 'eat';
  if (/休息|歇会儿|歇一下|睡会儿|歇歇/.test(text)) return 'rest';
  return null;
}

function findCrop(text) {
  for (const [k, c] of Object.entries(CROPS)) {
    if (text.includes(c.name)) return k;
  }
  return null;
}

function parseCount(text) {
  const m = text.match(/(\d+|[一二两三四五六七八九十]+)\s*(块|棵|条|个|次|颗)/);
  if (!m) return null;
  return { n: numFrom(m[1]), unit: m[2] };
}

function parseSpecificPlots(text, sim) {
  const out = [];
  const push = (m) => {
    const n = numFrom(m[1]);
    const p = sim.world.plots[n - 1];
    if (p && !out.includes(p)) out.push(p);
  };
  let m;
  const re1 = /(\d+|[一二两三四五六七八九十]+)\s*号地/g;
  while ((m = re1.exec(text))) push(m);
  const re2 = /第\s*(\d+|[一二两三四五六七八九十]+)\s*块/g;
  while ((m = re2.exec(text))) push(m);
  return out;
}

function directionFilter(text, plots) {
  const cx = 14, cy = 13;
  if (/西边|西侧|左边|西面/.test(text)) return plots.filter((p) => p.x < cx - 1);
  if (/东边|东侧|右边|东面/.test(text)) return plots.filter((p) => p.x > cx + 1);
  if (/北边|北侧|上边|北面/.test(text)) return plots.filter((p) => p.y < cy - 1);
  if (/南边|南侧|下边|南面/.test(text)) return plots.filter((p) => p.y > cy + 1);
  return null;
}

function validPlots(sim, intent) {
  const ps = sim.world.plots;
  if (intent === 'water') return ps.filter((p) => p.crop && !sim.isWet(p));
  if (intent === 'harvest') return ps.filter((p) => sim.cropReady(p));
  if (intent === 'plow') return ps.filter((p) => p.state === 'grass');
  if (intent === 'plant') return ps.filter((p) => p.state === 'plowed' && !p.crop);
  return [];
}

function plotLabel(p, sim) {
  const idx = sim.world.plots.indexOf(p) + 1;
  return `${idx}号地`;
}

const VERB = { water: '浇水', harvest: '收获', plow: '开垦', plant: '播种', chop: '砍树', fish: '钓鱼', forage: '采集', eat: '吃点东西', rest: '休息', chat: '聊天' };

export function parseCommand(rawText, sim, context = null) {
  const raw = String(rawText || '').trim();
  const text = raw.replace(/[，。！？、,.!?\s]/g, '');
  if (!text) return { intent: 'unknown', raw, messages: ['说点什么吧，东家。'] };

  // 取消 / 停止
  if (/停下|都停|停了|取消|算了|别干|不要干|回来吧|收工/.test(text)) {
    return { intent: 'cancel', raw, executor: findExecutor(text, sim), quiet: false };
  }
  // 状态查询
  if (/谁在干|谁忙|在干嘛|在干什么|进度|谁闲|谁有空|都在忙什么/.test(text)) {
    return { intent: 'status', raw, executor: null };
  }
  // 简单查询
  if (/有熟|几块熟|熟了吗|地怎么|情况怎么|谁饿|谁累|仓库|多少钱|几个委托/.test(text)) {
    return { intent: 'query', raw };
  }
  // 聊天（没有生产动词时才走聊天）
  if (/聊聊|聊天|说说话|打个招呼|你好|早啊|心情|夸|道歉|送.*吃|喜欢/.test(text)
    && !/浇水|收获|播种|种|砍|钓|开垦|采集/.test(text)) {
    return { intent: 'chat', raw, villager: findVillager(text, sim) };
  }

  const executor = findExecutor(text, sim);
  let intent = findIntent(text);
  // 改令：「别钓了去浇水」→ 以“去”后面的动作为准
  if (intent && /(别|不要|先别)/.test(text)) {
    const parts = text.split(/去|改成|改去/);
    if (parts.length > 1) {
      const next = findIntent(parts[parts.length - 1]);
      if (next) intent = next;
    }
  }
  if (!intent) {
    return {
      intent: 'unknown', raw, executor,
      messages: ['没太听懂。可以说：“让小伟把3号地浇一下”“把干的地都浇了”“谁在干活”“都停下”。'],
      confidence: 0.2,
    };
  }

  const countInfo = parseCount(text);
  const count = countInfo ? countInfo.n : null;
  const specifics = parseSpecificPlots(text, sim);
  const region = findRegion(text, sim);
  if (region && !sim.isRegionUnlocked(region.id)) {
    const need = region.unlock?.harvest ? `累计收获 ${region.unlock.harvest} 次` : region.unlock?.day ? `第 ${region.unlock.day} 天` : '继续推进';
    return { intent, raw, executor, targets: [], region: region.id, messages: [`${region.name}还没解锁（${need}）。`], confidence: 0.7 };
  }

  // 钓鱼/吃饭/休息：不需要选地块
  if (intent === 'fish') {
    return { intent, raw, executor, region: region?.id, targets: [{ kind: 'fish' }], count: 1, confidence: 0.95 };
  }
  if (intent === 'eat' || intent === 'rest') {
    return { intent, raw, executor, targets: [{ kind: 'self' }], confidence: 0.9 };
  }

  // 收牧产
  if (intent === 'collect') {
    if (!sim.stageFlags?.collect) {
      return { intent, raw, executor, targets: [], messages: ['牧场还没开张：先播种 3 次。'], confidence: 0.6 };
    }
    const product = /挤奶|牛奶/.test(text) ? 'milk'
      : /剪羊毛|羊毛/.test(text) ? 'wool'
      : /蛋/.test(text) ? 'egg' : null;
    const list = sim.world.animals.filter((a) => a.ready
      && (!product || a.product === product)
      && (!region || insideRegion(region, a.x, a.y)));
    if (!list.length) {
      const what = product === 'milk' ? '牛奶' : product === 'wool' ? '羊毛' : product === 'egg' ? '蛋' : '牧产';
      return { intent, raw, executor, region: region?.id, targets: [], messages: [`现在没有可以收的${what}（会随时间积累）。`], confidence: 0.8 };
    }
    const n = Math.max(1, count || list.length);
    const picked = list.slice(0, n);
    // 收之前先让动物停在原地，避免走位
    picked.forEach((a) => { a.hold = 14; });
    const seen = new Set();
    const targets = [];
    for (const a of picked) {
      const key = `${Math.floor(a.x)},${Math.floor(a.y)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      targets.push({ kind: 'animal', x: Math.floor(a.x), y: Math.floor(a.y) });
    }
    return {
      intent, raw, executor, region: region?.id, count: targets.length,
      targets,
      confidence: 0.9,
    };
  }
  // 挖矿
  if (intent === 'mine') {
    if (!sim.stageFlags?.mine) {
      return { intent, raw, executor, targets: [], messages: ['后山矿洞还没开：先累计收获 10 次。'], confidence: 0.6 };
    }
    const rocks = sim.world.rocks.filter((r) => !r.mined && (!region || insideRegion(region, r.x, r.y)));
    if (!rocks.length) return { intent, raw, executor, region: region?.id, targets: [], messages: [`${region ? region.name + '里' : '附近'}没有可挖的矿石了。`], confidence: 0.8 };
    const n = Math.max(1, count || 1);
    return {
      intent, raw, executor, region: region?.id, count: n,
      targets: rocks.slice(0, n).map((r) => ({ kind: 'rock', x: r.x, y: r.y })),
      confidence: 0.92,
    };
  }

  // 采集
  if (intent === 'forage') {
    const items = sim.world.forages.filter((f) => !f.taken && (!region || insideRegion(region, f.x, f.y)));
    if (!items.length) return { intent, raw, executor, region: region?.id, targets: [], messages: [`${region ? region.name + '里' : '附近'}没有可采集的东西了。`], confidence: 0.8 };
    const n = Math.max(1, count || 1);
    return {
      intent, raw, executor, region: region?.id, count: n,
      targets: items.slice(0, n).map((f) => ({ kind: 'forage', x: f.x, y: f.y })),
      confidence: 0.92,
    };
  }

  // 砍树
  if (intent === 'chop') {
    const trees = sim.world.trees.filter((t) => t.regrowAt <= sim.absHours && (!region || insideRegion(region, t.x, t.y)));
    if (!trees.length) return { intent, raw, executor, region: region?.id, targets: [], messages: [`${region ? region.name + '里' : '附近'}没有能砍的树了。`], confidence: 0.8 };
    const n = count || (/两棵树|一棵树|棵树/.test(text) ? count || 1 : 1);
    const targets = trees.slice(0, Math.max(1, n)).map((t) => ({ kind: 'tree', x: t.x, y: t.y }));
    return { intent, raw, executor, region: region?.id, targets, count: targets.length, confidence: 0.9 };
  }

  // 地块类
  let rawWarn = '';
  let valid = validPlots(sim, intent);
  if (region) valid = valid.filter((p) => insideRegion(region, p.x, p.y));
  if (specifics.length) {
    const ok = specifics.filter((p) => valid.includes(p));
    const bad = specifics.filter((p) => !valid.includes(p));
    if (!ok.length) {
      const p = bad[0];
      const reason = intent === 'water' ? '那块不用浇水（没作物或还湿着）'
        : intent === 'harvest' ? '那块还没熟'
        : intent === 'plow' ? '那块已经开垦过了'
        : '那块现在种不了';
      return {
        intent, raw, executor, targets: [], confidence: 0.4, needClarify: true,
        messages: [`${plotLabel(p, sim)}：${reason}`],
        clarify: `换个目标？可以说“全部”“西边那片”，或者点一块地。`,
        candidates: valid.slice(0, 4).map((q) => plotLabel(q, sim)),
      };
    }
    valid = ok;
    if (bad.length) rawWarn = `有 ${bad.length} 块不合条件，先跳过。`;
  } else {
    const dir = directionFilter(text, valid);
    if (dir) valid = dir;
  }

  const global = /所有|全部|全都|都|每一块|整片/.test(text);
  const readyWord = /熟|成熟的/.test(text);
  const dryWord = /干|缺水/.test(text);
  const emptyWord = /荒|空地|没开垦/.test(text);
  if (readyWord) valid = valid.filter((p) => sim.cropReady(p));
  if (dryWord) valid = valid.filter((p) => p.crop && !sim.isWet(p));
  if (emptyWord) valid = valid.filter((p) => p.state === 'grass');

  let targets = valid;
  if (!specifics.length && !global && !count && !readyWord && !dryWord && !emptyWord && !directionFilter(text, valid)) {
    // 没给范围：需要澄清
    if (valid.length) {
      return {
        intent, raw, executor, targets: [], confidence: 0.45, needClarify: true,
        messages: [`要${VERB[intent]}哪几块地？`],
        clarify: `说“全部”“西边那片”，或者直接点一块地。`,
        candidates: valid.slice(0, 4).map((p) => plotLabel(p, sim)),
        _valid: valid,
      };
    }
    return { intent, raw, executor, targets: [], messages: [`现在没有可以${VERB[intent]}的地。`], confidence: 0.7 };
  }

  if (global || specifics.length) targets = valid;
  if (count && intent !== 'harvest') targets = targets.slice(0, Math.max(1, count));
  if (!targets.length) {
    return { intent, raw, executor, targets: [], messages: [`没有符合条件的${intent === 'water' ? '干地' : '地块'}。`], confidence: 0.6 };
  }

  const crop = intent === 'plant' ? findCrop(text) : null;
  return {
    intent, raw, executor, count: count || targets.length,
    targets: targets.map((p) => ({ kind: 'plot', x: p.x, y: p.y })),
    crop,
    confidence: specifics.length ? 0.96 : 0.9,
    warning: rawWarn || undefined,
  };
}

// 澄清后补全目标：把新一句话拼回原句重新解析
export function resolveClarify(cmd, text, sim) {
  const merged = `${cmd.raw} ${text}`;
  return parseCommand(merged, sim, cmd);
}

// 给 UI 的一句话说明
export function describeCommand(sim, cmd) {
  const verb = VERB[cmd.intent] || cmd.intent;
  const who = cmd.executor === 'all' ? '所有人' : cmd.executor === 'auto' || !cmd.executor
    ? '自动安排' : (sim.villagers.find((v) => v.id === cmd.executor)?.name || cmd.executor);
  const targets = cmd.targets || [];
  const what = targets.length
    ? targets.map((t) => (t.kind === 'plot' ? plotLabel(sim.world.plotAt(t.x, t.y), sim) : t.kind === 'tree' ? '一棵树' : t.kind === 'fish' ? '钓鱼' : '')).filter(Boolean).join('、')
    : '—';
  return { verb, who, what, count: targets.length };
}








