// 小伟与小杨的自主对话：DeepSeek 生成，本地状态驱动
import { llmChat, loadAIConfig } from './llm.js';

let busy = false;
let timer = 18;

function stateLine(v) {
  const emo = v.emo?.cur || {};
  const needs = v.needs || {};
  return `${v.name}：心情 喜悦${Math.round(emo.joy || 0)}/恼火${Math.round(emo.anger || 0)}/低落${Math.round(emo.sadness || 0)}，精力${Math.round(needs.energy || 0)}，饱食${Math.round(needs.hunger || 0)}，信任${Math.round(v.emo?.trust || 50)}；当前${v.task ? `在${v.task.type}` : '空闲'}；想法：${v.thought || '—'}`;
}

function buildMessages(sim) {
  const a = sim.villagers.find((v) => v.id === 'xiaowei');
  const b = sim.villagers.find((v) => v.id === 'xiaoyang');
  const last = (sim.story || []).slice(-2).map((s) => `${s.speaker}：${s.line}\n小杨：${s.reply}`).join('\n');
  const system = [
    '你是《田园小镇》的叙事引擎，只写小伟和小杨两个人的日常对话。',
    '小伟：从城里回来的后生，脑子活、嘴甜，爱在河边待着，懒散但心软。',
    '小杨：手巧心细的姑娘，爱干净，说话轻声细语，认真起来有点倔。',
    '要求：自然、生活化、有分寸，像真实的乡村青年，不要狗血、不要旁白、不要解释设定。',
    '每人一句，可以带一点动作或神态，但必须保持角色口吻。',
    '只输出 JSON，不要 markdown：',
    '{"speaker":"小伟","line":"小伟说的话","reply":"小杨的回答","mood":"平静/开心/别扭/疲惫/心动","bond":1}',
    'bond 是这次对话让两人关系变化的数值，范围 -2 到 2。',
  ].join('\n');
  const weather = { sunny: '晴', rain: '雨', storm: '暴雨' }[sim.weather] || '晴';
  const user = [
    `第 ${sim.day} 天，${sim.seasonName}季，${sim.clockText}，天气${weather}，地点：${sim.regionById(sim.currentRegion)?.name || '青禾村'}。`,
    stateLine(a),
    stateLine(b),
    `两人关系值：${Math.round(sim.bond || 50)}/100。`,
    last ? `最近聊过：\n${last}` : '这是他们今天第一次私下说话。',
    '写一段 2-3 句的对话，让关系自然推进一点点。',
  ].join('\n');
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

function extractJSON(text) {
  if (!text) return null;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

async function doTalk(sim) {
  if (busy) return { ok: false, msg: '他们正在说话' };
  const a = sim.villagers.find((v) => v.id === 'xiaowei');
  const b = sim.villagers.find((v) => v.id === 'xiaoyang');
  if (!a || !b) return { ok: false, msg: '缺少小伟或小杨' };
  if (a.state === 'sleeping' || b.state === 'sleeping') return { ok: false, msg: '他们已经睡了' };

  busy = true;
  try {
    const raw = await llmChat(buildMessages(sim), { json: true, maxTokens: 240, temperature: 0.95 });
    const j = extractJSON(raw);
    if (!j || !j.line || !j.reply) throw new Error('模型返回格式不对，再试一次');
    const line = String(j.line).slice(0, 120);
    const reply = String(j.reply).slice(0, 120);
    const delta = Math.max(-2, Math.min(2, Number(j.bond) || 0));
    sim.bond = Math.max(0, Math.min(100, (sim.bond ?? 50) + delta));
    a.emo.trust = Math.min(100, a.emo.trust + 1);
    b.emo.trust = Math.min(100, b.emo.trust + 1);
    a.feel('chat_friend');
    b.feel('chat_friend');
    a.say(line, '💬', 5);
    b.say(reply, '💬', 5);
    a.thought = line;
    b.thought = reply;
    const entry = {
      at: Date.now(), day: sim.day, clock: sim.clockText,
      speaker: '小伟', line, reply, mood: j.mood || '平静', bond: sim.bond,
    };
    sim.story = sim.story || [];
    sim.story.push(entry);
    sim.aiTalks = (sim.aiTalks || 0) + 1;
    if (sim.story.length > 30) sim.story.splice(0, sim.story.length - 30);
    sim.addLog(`小伟和小杨聊了会儿天（关系 ${Math.round(sim.bond)}）`, 'chat');
    sim.emit('aiTalk', entry);
    return { ok: true, entry };
  } catch (e) {
    return { ok: false, msg: e.message || String(e) };
  } finally {
    busy = false;
  }
}

export function triggerAITalk(sim) {
  return doTalk(sim);
}

export function tickAITalk(sim, dtReal) {
  if (!sim.stageFlags?.aiAuto) return;
  const cfg = loadAIConfig();
  if (!cfg.enabled || !cfg.auto) return;
  if (busy) return;
  if (sim.speed === 0) return;
  const a = sim.villagers.find((v) => v.id === 'xiaowei');
  const b = sim.villagers.find((v) => v.id === 'xiaoyang');
  if (!a || !b) return;
  if (a.state === 'sleeping' || b.state === 'sleeping') return;
  // 只在两个人都没在干重活时，或其中一人空闲时聊天
  if (a.task && b.task) return;
  timer -= dtReal;
  if (timer > 0) return;
  timer = 45 + Math.random() * 30;
  doTalk(sim);
}




