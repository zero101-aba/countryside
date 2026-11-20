// 指令调度：选人、拆批、排队、汇报
import { ORDERS } from './config.js';
import { buildTalk, matchIntent } from './dialogue.js';

function verbOf(type) { return ORDERS[type]?.verb || type; }

function findVillager(sim, id) {
  return sim.villagers.find((v) => v.id === id) || null;
}

function targetName(sim, target) {
  if (!target) return '目标';
  if (target.kind === 'plot') {
    const p = sim.world.plotAt(target.x, target.y);
    return p ? `${sim.world.plots.indexOf(p) + 1}号地` : '一块地';
  }
  if (target.kind === 'tree') return '一棵树';
  if (target.kind === 'rock') return '一块矿石';
  if (target.kind === 'forage') return '一个采集点';
  if (target.kind === 'animal') return '一只动物';
  if (target.kind === 'fish') return '钓位';
  return '自己';
}


function scoreFor(sim, v, type, target) {
  if (v.state === 'sleeping' || v.state === 'goingSleep') return -1e9;
  let s = (v.task ? 0 : 35) + (v.queue.length ? -12 * v.queue.length : 0);
  if (v.likes.includes(type)) s += 22;
  if (v.dislikes.includes(type)) s -= 18;
  s += v.needs.energy * 0.18;
  s += (100 - v.needs.hunger) * 0.08;
  s += (v.emo.trust - 50) * 0.12;
  s -= Math.max(0, v.emo.cur.anger - 40) * 0.45;
  const t = target.kind === 'fish'
    ? sim.nearestFishSpot(v)
    : target;
  s -= Math.hypot(v.x - t.x, v.y - t.y) * 1.4;
  return s;
}

function typeFor(cmd, target) {
  if (target.kind === 'tree') return 'chop';
  if (target.kind === 'rock') return 'mine';
  if (target.kind === 'forage') return 'forage';
  if (target.kind === 'animal') return 'collect';
  if (target.kind === 'fish') return 'fish';
  return cmd.intent;
}

function assign(sim, v, type, target, batchId) {
  if (v.state === 'sleeping' || v.state === 'goingSleep') {
    return { ok: false, msg: `${v.name}已经睡了` };
  }
  if (v.queue.length >= 3) {
    return { ok: false, msg: `${v.name}手头的活排满了` };
  }
  if (v.task) {
    v.enqueueOrder(type, target.x || 0, target.y || 0, batchId);
    return { ok: true, queued: true, msg: `${v.name}忙完手头的就去${verbOf(type)}（${targetName(sim, target)}）` };
  }
  const res = v.issueOrder(type, target.x || 0, target.y || 0);
  if (res.ok) {
    if (v.task) v.task.batchId = batchId;
    return { ok: true, msg: `派了${v.name}去${verbOf(type)}（${targetName(sim, target)}）` };
  }
  return { ok: false, msg: `${v.name}没去：${res.msg}` };
}

function cancel(sim, cmd) {
  const mentioned = sim.villagers.filter((v) => cmd.raw.includes(v.name));
  const all = cmd.executor === 'all' || cmd.executor === 'auto' || !cmd.executor;
  const list = all ? sim.villagers : (mentioned.length > 1 ? mentioned : [findVillager(sim, cmd.executor)].filter(Boolean));
  let n = 0;
  for (const v of list) {
    v.queue = [];
    if (v.task) { v.cancelTask('好，停下了。'); n++; }
  }
  return {
    ok: true,
    messages: [all ? (n ? `都停下了，${n} 个人放下了手里的活。` : '大家本来就没在干活。') : (n ? `${list[0].name}停下了。` : `${list[0]?.name || '他'}本来就没在干活。`)],
    focus: all ? null : list[0],
  };
}

function status(sim) {
  const busy = sim.villagers.filter((v) => v.task && v.state !== 'sleeping');
  if (!busy.length) return { ok: true, messages: ['现在大家都闲着，你发话就行。'] };
  const lines = busy.map((v) => {
    const t = v.task;
    const stage = t.stage === 'toWork' ? '在路上' : t.stage === 'deliver' ? '搬东西回仓' : `${Math.round((t.progress || 0) * 100)}%`;
    return `${v.name}：${verbOf(t.type)}，${stage}`;
  });
  const idle = sim.villagers.filter((v) => !v.task && v.state !== 'sleeping').length;
  return { ok: true, messages: [...lines, `还有 ${idle} 个人闲着。`], focus: busy[0] };
}

function query(sim, cmd) {
  const text = cmd.raw;
  if (/熟|收/.test(text)) {
    const ready = sim.world.plots.filter((p) => sim.cropReady(p));
    return { ok: true, messages: [ready.length ? `有 ${ready.length} 块地熟了：${ready.map((p) => sim.world.plots.indexOf(p) + 1 + '号地').join('、')}。` : '现在还没有熟的作物。'] };
  }
  if (/饿|累|心情/.test(text)) {
    const lines = sim.villagers.slice(0, 5).map((v) => `${v.name}：${v.needs.hunger > 70 ? '饿了' : v.needs.energy < 30 ? '累了' : '还行'}`);
    return { ok: true, messages: lines };
  }
  if (/委托/.test(text)) {
    return { ok: true, messages: [`今天有 ${sim.claimableQuests} 份委托可领取，共 ${sim.quests.length} 份。`] };
  }
  if (/钱|仓库|多少/.test(text)) {
    const inv = Object.entries(sim.inventory).filter(([, n]) => n > 0).map(([k, n]) => `${sim.itemName(k)}×${n}`).join('、') || '空的';
    return { ok: true, messages: [`你有 ${sim.money}G。仓库：${inv}。`] };
  }
  const ready = sim.world.plots.filter((p) => sim.cropReady(p)).length;
  const dry = sim.world.plots.filter((p) => p.crop && !sim.isWet(p)).length;
  const busy = sim.villagers.filter((v) => v.task).length;
  return { ok: true, messages: [`${ready} 块熟、${dry} 块缺水、${busy} 个人在干活。`] };
}

function chat(sim, cmd) {
  const v = cmd.villager || sim.selected || sim.villagers.find((x) => x.state !== 'sleeping');
  if (!v) return { ok: false, messages: ['现在没人能聊天。'] };
  if (v.state === 'sleeping') return { ok: false, messages: [`${v.name}已经睡了。`], focus: v };
  const topic = matchIntent(cmd.raw) || 'chat';
  const r = buildTalk(v, topic, cmd.raw);
  v.feel(r.feel);
  v.say(String(r.reply).split('\n')[0], r.emoji || '💬', 3.2);
  return { ok: true, messages: [`${v.name}：${r.reply}`], focus: v };
}

function work(sim, cmd) {
  if (cmd.needClarify) {
    return {
      ok: false, needClarify: true, pending: cmd,
      messages: cmd.messages || ['要选个目标。'],
      clarify: cmd.clarify,
      candidates: cmd.candidates || [],
    };
  }
  const targets = (cmd.targets || []).filter(Boolean);
  if (!targets.length) {
    return { ok: false, messages: cmd.messages || ['没有可以执行的目标。'], clarify: cmd.clarify };
  }

  const available = sim.villagers.filter((v) => v.state !== 'sleeping' && v.state !== 'goingSleep');
  if (!available.length) return { ok: false, messages: ['大家都睡了，明天再说吧。'] };

  const mentioned = sim.villagers.filter((v) => cmd.raw.includes(v.name));
  const named = cmd.executor && cmd.executor !== 'auto' && cmd.executor !== 'all'
    ? findVillager(sim, cmd.executor) : null;
  const namedList = mentioned.length > 1 ? mentioned : (named ? [named] : null);
  if (cmd.executor && cmd.executor !== 'auto' && cmd.executor !== 'all' && !named) {
    return { ok: false, messages: [`村里没有叫“${cmd.executor}”的人。`] };
  }

  const batchId = sim.noteBatchStart ? sim.noteBatchStart(targets.length) : null;
  // 改令：先把被点名的人手里的活停下，再派新活
  if (/(别|不要|先别)/.test(cmd.raw)) {
    const stopList = namedList || (cmd.executor === 'all' ? available : []);
    for (const v of stopList) {
      v.queue = [];
      if (v.task) v.cancelTask('好，听东家的。');
    }
  }
  const messages = [];
  const focus = [];
  let assigned = 0;
  let queued = 0;
  let failed = 0;

  if (namedList) {
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      const named = namedList[i % namedList.length];
      const type = typeFor(cmd, t);
      const r = assign(sim, named, type, t, batchId);
      if (r.ok) { assigned++; if (r.queued) queued++; focus.push(named); messages.push(r.msg); }
      else { failed++; if (batchId) sim.noteBatchDone(batchId); messages.push(r.msg); }
    }
  } else {
    const pool = cmd.executor === 'all' ? available : [...available];
    for (const t of targets) {
      const type = typeFor(cmd, t);
      const candidates = pool
        .filter((v) => v.queue.length < 3)
        .sort((a, b) => scoreFor(sim, b, type, t) - scoreFor(sim, a, type, t));
      let done = false;
      for (const v of candidates) {
        const r = assign(sim, v, type, t, batchId);
        if (r.ok) {
          assigned++; if (r.queued) queued++; focus.push(v);
          messages.push(r.msg); done = true; break;
        }
      }
      if (!done) { failed++; if (batchId) sim.noteBatchDone(batchId); messages.push(`没人能去${verbOf(type)}（${targetName(sim, t)}）`); }
    }
  }

  if (batchId && assigned === 0) sim.batches.delete(batchId);
  const whoCount = new Set(focus.map((v) => v.id)).size;
  const head = assigned
    ? `安排好了：${targets.length} 项，${whoCount} 个人${queued ? `（${queued} 项排队）` : ''}。`
    : '这单没派出去。';
  return {
    ok: assigned > 0,
    messages: [head, ...(cmd.warning ? [cmd.warning] : []), ...messages],
    focus: focus[0] || null,
    assigned, queued, failed,
  };
}

export function executeCommand(sim, cmd) {
  if (!cmd) return { ok: false, messages: ['没听懂。'] };
  if (cmd.intent === 'unknown') return { ok: false, messages: cmd.messages || ['没听懂。'] };
  if (cmd.intent === 'cancel') return cancel(sim, cmd);
  if (cmd.intent === 'status') return status(sim);
  if (cmd.intent === 'query') return query(sim, cmd);
  if (cmd.intent === 'chat') return chat(sim, cmd);
  return work(sim, cmd);
}








